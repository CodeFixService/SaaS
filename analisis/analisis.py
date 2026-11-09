#!/usr/bin/env python3
"""CodeFix · Análisis nocturno (E24). Lo corre GitHub Actions (SaaS/.github/workflows/analisis.yml) en cada una de las 7 bases.

Uso:  python3 analisis/analisis.py "<cadena de la base>"   (o la variable BD)
1) Lee public.cfx_analisis_datos() (núcleo analisis.sql) con psql.
2) Calcula: tendencias de la app (CM → 📊 Analítica) y, por negocio (E27), clientes que dejaron de comprar y productos quietos.
3) Guarda con public.cfx_analisis_guardar(). Solo librería estándar de Python + psql (ya viene en el runner de GitHub).
Prueba local: python3 analisis/analisis.py "host=/var/tmp/pgb port=54329 user=postgres dbname=p_aplicaciones"
"""
import json
import os
import statistics
import subprocess
import sys
from datetime import date, timedelta

QUIETO = 30        # días sin venderse ni moverse el stock para ser "producto quieto"
MAX_RIESGO = 10    # clientes en riesgo que se muestran por negocio
MAX_QUIETOS = 15
PERDIDO = 180      # más de esto ya no es "en riesgo": se fue
ALCANZA = 14       # E28: productos cuyo stock alcanza para 14 días o menos
MAX_ACABA = 10
MAX_SEG = 30       # E29: clientes que se muestran por segmento
DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']


def psql(bd, sql, entrada=None):
    r = subprocess.run(['psql', bd, '-X', '-q', '-At', '-v', 'ON_ERROR_STOP=1'] + ([] if entrada else ['-c', sql]),
                       input=entrada, capture_output=True, text=True, timeout=600)
    if r.returncode:
        raise RuntimeError(r.stderr.strip() or 'psql falló')
    return r.stdout.strip()


def dia(s):
    return date.fromisoformat(str(s)[:10])


def pct(a, b):
    return None if not b else round((a - b) * 100 / b)


def serie(por_dia, hoy, n=30, desde=0):
    """Valores de los últimos n días (el último es hoy - desde)."""
    return [por_dia.get((hoy - timedelta(days=desde + i)).isoformat(), 0) for i in range(n - 1, -1, -1)]


def flecha(p):
    return '' if p is None else (' (+' if p >= 0 else ' (') + str(p) + '% vs los 30 días anteriores)'


def analizar_app(d, hoy):
    u = d.get('usuarios') or {}
    dias_u = u.get('dias') or {}
    nuevos, nuevos_prev = sum(serie(dias_u, hoy)), sum(serie(dias_u, hoy, 30, 30))
    ing = {k: float(v) for k, v in (d.get('ingresos') or {}).items()}
    m30, mprev = sum(serie(ing, hoy)), sum(serie(ing, hoy, 30, 30))
    out = {'usuarios': {'total': u.get('total', 0), 'activos7': u.get('activos7', 0), 'activos30': u.get('activos30', 0),
                        'nuevos30': nuevos, 'nuevos_prev': nuevos_prev, 'cambio': pct(nuevos, nuevos_prev), 'serie': serie(dias_u, hoy)},
           'ingresos': {'d30': m30, 'prev': mprev, 'cambio': pct(m30, mprev), 'serie': serie(ing, hoy)},
           'premium': d.get('premium', 0), 'ventas': None, 'consejos': []}
    c = out['consejos']
    if nuevos or nuevos_prev:
        c.append('👥 ' + str(nuevos) + (' cuenta nueva' if nuevos == 1 else ' cuentas nuevas') + ' en 30 días' + flecha(out['usuarios']['cambio']))
    if u.get('total'):
        a = round(u.get('activos7', 0) * 100 / u['total'])
        c.append(('✅ ' if a >= 40 else '⚠️ ') + str(a) + '% de las cuentas entró esta semana' + ('' if a >= 40 else ': manda un aviso con una novedad'))
    if m30 or mprev:
        c.append('💳 Premium: $' + format(round(m30), ',').replace(',', '.') + ' en 30 días' + flecha(out['ingresos']['cambio']))

    app = d.get('app') or {}
    ventas = app.get('ventas') or []
    if 'ventas' in app:
        por_dia, v30, vprev, neg30 = {}, [], [], {}
        for v in ventas:
            f = dia(v['f'])
            if f > hoy - timedelta(days=30):
                v30.append(v)
                por_dia[f.isoformat()] = por_dia.get(f.isoformat(), 0) + float(v['m'])
                neg30[v['n']] = neg30.get(v['n'], 0) + float(v['m'])
            elif f > hoy - timedelta(days=60):
                vprev.append(v)
        negocios = app.get('negocios') or []
        nombre = {x['id']: x.get('nombre') or 'Negocio' for x in negocios}
        monto, monto_prev = sum(float(v['m']) for v in v30), sum(float(v['m']) for v in vprev)
        dormidos = [x for x in negocios if dia(x.get('creado') or hoy) <= hoy - timedelta(days=14)
                    and (not x.get('ingreso') or dia(x['ingreso']) <= hoy - timedelta(days=14))]
        out['ventas'] = {'pedidos30': len(v30), 'pedidos_prev': len(vprev), 'monto30': monto, 'monto_prev': monto_prev, 'cambio': pct(monto, monto_prev),
                         'ticket': round(monto / len(v30)) if v30 else 0, 'serie': serie(por_dia, hoy),
                         'negocios': len(negocios), 'activos': len(neg30), 'dormidos': len(dormidos),
                         'top': [{'nombre': nombre.get(k, 'Negocio'), 'monto': m} for k, m in sorted(neg30.items(), key=lambda x: -x[1])[:5]]}
        if v30 or vprev:
            c.insert(0, ('📈 ' if (out['ventas']['cambio'] or 0) >= 0 else '📉 ') + 'Ventas: ' + str(len(v30)) + ' pedidos por $' +
                     format(round(monto), ',').replace(',', '.') + flecha(out['ventas']['cambio']))
        if negocios:
            c.append('🏪 ' + str(len(neg30)) + ' de ' + str(len(negocios)) + ' negocios vendieron en 30 días')
        if dormidos:
            c.append('😴 ' + str(len(dormidos)) + (' negocio no entra' if len(dormidos) == 1 else ' negocios no entran') + ' hace más de 14 días: escríbeles')
    return out


def semana(vs, hoy):
    """🔮 E28: venta estimada de los próximos 7 días = promedio de las 4 últimas semanas, pesando más las recientes."""
    sem = [[0.0, 0] for _ in range(4)]
    por_dia = [0.0] * 7
    for v in vs:
        h = (hoy - dia(v['f'])).days
        if 0 <= h < 28:
            sem[h // 7][0] += float(v['m']); sem[h // 7][1] += 1
        if 0 <= h < 56:
            por_dia[dia(v['f']).weekday()] += float(v['m'])
    if not any(x[1] for x in sem):
        return None
    pesos = [0.4, 0.3, 0.2, 0.1]
    return {'monto': round(sum(p * x[0] for p, x in zip(pesos, sem))), 'pedidos': round(sum(p * x[1] for p, x in zip(pesos, sem))),
            'pasada': round(sem[0][0]), 'pedidos_pasada': sem[0][1], 'mejor_dia': DIAS[por_dia.index(max(por_dia))]}


def segmentar(por_cli, clientes, hoy):
    """👥 E29: cada cliente en un solo segmento (en orden): en riesgo, perdidos, VIP, nuevos, frecuentes. El resto queda como ocasional."""
    totales = sorted((x['total'] for x in por_cli.values() if len(x['dias']) >= 2), reverse=True)
    corte = totales[max(0, len(totales) // 5 - 1)] if len(totales) >= 5 else (totales[0] if totales else 0)
    seg = {k: [] for k in ('riesgo', 'perdidos', 'vip', 'nuevos', 'frecuentes')}
    ocasionales = 0
    for k, x in por_cli.items():
        ds = sorted(x['dias'])
        hace, n = (hoy - ds[-1]).days, len(ds)
        cada = max(7, round(statistics.median([(b - a).days for a, b in zip(ds, ds[1:])]))) if n >= 2 else None
        if cada and max(2 * cada, cada + 14) <= hace <= PERDIDO:
            s = 'riesgo'
        elif hace > PERDIDO or (n == 1 and hace > 90):
            s = 'perdidos'
        elif n >= 2 and x['total'] >= corte and hace <= 90:
            s = 'vip'
        elif (hoy - ds[0]).days <= 30:
            s = 'nuevos'
        elif n >= 3:
            s = 'frecuentes'
        else:
            ocasionales += 1
            continue
        q = clientes.get(k) or {}
        seg[s].append({'nombre': q.get('nombre') or 'Cliente', 'tel': q.get('tel') or '', 'dias': hace, 'compras': n, 'total': round(x['total'])})
    out = {}
    for s, l in seg.items():
        l.sort(key=lambda r: (-r['total'], r['dias']))
        out[s] = {'total': len(l), 'lista': l[:MAX_SEG]}
    out['ocasionales'] = {'total': ocasionales, 'lista': []}
    return out


def analizar_negocios(d, hoy):
    app = d.get('app') or {}
    if 'ventas' not in app or not d.get('modulo', True):
        return {}
    previo = d.get('previo') or {}
    clientes = app.get('clientes') or {}
    por_neg = {}
    for v in app.get('ventas') or []:
        por_neg.setdefault(v['n'], []).append(v)
    prods = {}
    for p in app.get('productos') or []:
        prods.setdefault(p['n'], []).append(p)
    out = {}
    for n in set(por_neg) | set(prods):
        vs = por_neg.get(n, [])
        # 👥 Clientes en riesgo: compraron 2 o más veces y ya pasó harto más que su ritmo normal.
        por_cli = {}
        for v in vs:
            if v.get('c'):
                x = por_cli.setdefault(v['c'], {'dias': set(), 'total': 0.0})
                x['dias'].add(dia(v['f'])); x['total'] += float(v['m'])
        riesgo = []
        for k, x in por_cli.items():
            ds = sorted(x['dias'])
            if len(ds) < 2:
                continue
            cada = max(7, round(statistics.median([(b - a).days for a, b in zip(ds, ds[1:])])))
            hace = (hoy - ds[-1]).days
            if max(2 * cada, cada + 14) <= hace <= PERDIDO:
                q = clientes.get(k) or {}
                riesgo.append({'nombre': q.get('nombre') or 'Cliente', 'tel': q.get('tel') or '', 'dias': hace, 'cada': cada,
                               'compras': len(ds), 'total': round(x['total'])})
        riesgo.sort(key=lambda r: (-r['total'], -r['dias']))
        segmentos = segmentar(por_cli, clientes, hoy)
        # 📦 Productos quietos: sin ventas ni cambio de stock en 30 días (el stock de anoche queda en "mov": así cuentan las ventas de Caja).
        ultima = {}
        for v in vs:
            for k, _ in v.get('l') or []:
                ultima[k] = max(ultima.get(k, date.min), dia(v['f']))
        prev = previo.get(n) or {}
        mov, quietos, acaba = {}, [], []
        # 🔮 E28: unidades vendidas online en 28 días por producto (Caja no queda en pedidos: eso lo suma el ritmo del stock).
        u28 = {}
        for v in vs:
            if dia(v['f']) > hoy - timedelta(days=28):
                for k, c in v.get('l') or []:
                    u28[k] = u28.get(k, 0) + (c or 0)
        for p in prods.get(n, []):
            k, st = p['k'], p.get('stock')
            antes = prev.get(k)
            f_mov = dia(antes[1]) if antes and antes[0] == st else (hoy if antes else None)
            # Ritmo del stock: promedio de lo que baja por día (las subidas son reposición y no cuentan), hasta 28 días de memoria.
            tasa, f_calc = (float(antes[2]), dia(antes[3])) if antes and len(antes) >= 4 else (0.0, None)
            if f_calc and f_calc < hoy and st is not None and antes[0] is not None:
                d = min((hoy - f_calc).days, 28)
                baja = max(0, antes[0] - st)
                obs = min(28, antes[4] if len(antes) >= 5 else 0)
                tasa = (tasa * obs + baja) / (obs + d)
                obs = min(28, obs + d)
            else:
                obs = antes[4] if antes and len(antes) >= 5 else 0
            mov[k] = [st, (f_mov or dia(p.get('creado') or hoy)).isoformat(), round(tasa, 3), hoy.isoformat(), obs]
            ritmo = max(u28.get(k, 0) / 28, tasa)
            if st is not None and st > 0 and ritmo > 0 and st / ritmo <= ALCANZA:
                acaba.append({'nombre': p.get('nombre') or 'Producto', 'stock': st, 'dias': int(st / ritmo), 'semana': round(ritmo * 7, 1)})
            ult = max([x for x in (ultima.get(k), f_mov, dia(p.get('creado') or hoy)) if x])
            hace = (hoy - ult).days
            if hace >= QUIETO and (st is None or st > 0):
                quietos.append({'nombre': p.get('nombre') or 'Producto', 'stock': st, 'dias': hace})
        quietos.sort(key=lambda q: -q['dias'])
        acaba.sort(key=lambda a: (a['dias'], -a['semana']))
        v30 = [v for v in vs if dia(v['f']) > hoy - timedelta(days=30)]
        vprev = [v for v in vs if hoy - timedelta(days=60) < dia(v['f']) <= hoy - timedelta(days=30)]
        out[n] = {'riesgo': riesgo[:MAX_RIESGO], 'riesgo_total': len(riesgo), 'quietos': quietos[:MAX_QUIETOS], 'quietos_total': len(quietos),
                  'acaba': acaba[:MAX_ACABA], 'acaba_total': len(acaba), 'semana': semana(vs, hoy), 'segmentos': segmentos,
                  'resumen': {'clientes': len(por_cli), 'recurrentes': sum(1 for x in por_cli.values() if len(x['dias']) > 1),
                              'pedidos30': len(v30), 'ventas30': round(sum(float(v['m']) for v in v30)),
                              'ventas_prev': round(sum(float(v['m']) for v in vprev))},
                  'mov': mov}
    return out


def main():
    bd = (sys.argv[1] if len(sys.argv) > 1 else os.environ.get('BD', '')).strip()
    if not bd:
        sys.exit('Falta la cadena de la base (argumento o variable BD)')
    try:
        d = json.loads(psql(bd, 'select public.cfx_analisis_datos()::text'))
    except RuntimeError as e:
        if 'cfx_analisis_datos' in str(e):
            print('::warning::La base aún no tiene el núcleo 2.54 (cfx_analisis_datos): se salta hasta que se actualice')
            return
        raise
    hoy = dia(d['hoy'])
    res = {'app': analizar_app(d, hoy), 'negocios': analizar_negocios(d, hoy), 'run': os.environ.get('GITHUB_RUN_ID', 'local')}
    texto = json.dumps(res, ensure_ascii=False, default=str).replace('$', '\\u0024')  # sin "$" el texto no corta el $cfx$ de abajo
    n = psql(bd, None, 'select public.cfx_analisis_guardar($cfx$' + texto + '$cfx$::jsonb);\n')
    print('Negocios analizados:', n)
    for c in res['app']['consejos']:
        print('-', c)


if __name__ == '__main__':
    main()
