#!/usr/bin/env python3
"""Inventario: tablas de instalar.sql y cuántas veces las usa el código (JS/HTML/función) fuera de su definición."""
import re, subprocess, sys, os
repo = sys.argv[1]
modo = sys.argv[2] if len(sys.argv) > 2 else ''

sql = open(os.path.join(repo, 'supabase/instalar.sql'), encoding='utf-8').read()
BLOQUE = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'inventario.sql'), encoding='utf-8').read()
tablas = sorted(set(re.findall(r'create table (?:if not exists )?((?:public|privado)\.[a-z_]+)', sql, re.I)))
codigo = subprocess.check_output(['git', '-C', repo, 'ls-files', '*.js', '*.html', '*.ts']).decode().split()
txt = ''
for f in codigo:
    if 'vendor' in f or 'pruebas' in f: continue
    txt += open(os.path.join(repo, f), encoding='utf-8', errors='ignore').read()
if modo == '--lista':  # arreglo SQL con las tablas que crea instalar.sql (para cfx_inventario)
    print("array['" + "', '".join(tablas) + "']")
    sys.exit(0)
if modo == '--sql':  # bloque SQL común (sys.argv[3] = cómo se exige ser administrador en esta app)
    chk = sys.argv[3]
    print(BLOQUE.replace('<CHK>', chk).replace('<LISTA>', "array['" + "', '".join(tablas) + "']"))
    sys.exit(0)
if modo == '--verificar':  # la lista dentro de cfx_inventario debe ser igual a las tablas que se crean
    m = re.search(r"cfx_tablas\(\) returns text\[\][^$]*\$\$\s*select (array\[[^\]]*\])", sql)
    if not m: sys.exit('falta cfx_tablas() en ' + repo)
    lista = sorted(re.findall(r"'([a-z_]+\.[a-z_]+)'", m.group(1)))
    if lista != tablas: sys.exit('cfx_tablas() no coincide en ' + repo + ': sobran ' + str(set(lista) - set(tablas)) + ' faltan ' + str(set(tablas) - set(lista)))
    print('✓ cfx_tablas() al día en', repo); sys.exit(0)
DEF = re.compile(r'^\s*(create table|alter table|create (unique )?index|drop policy|create policy|grant |revoke |comment on|alter publication|drop table|-- )', re.I)
lineas = [l for l in sql.split('\n') if not DEF.match(l)]
for t in tablas:
    n = t.split('.')[1]
    pat = re.compile(r'\b' + re.escape(n) + r'\b')
    usos_sql = sum(1 for l in lineas if re.search(r'\b(from|into|update|join|delete from|exists \(select 1 from|references)\s+(public\.|privado\.)?' + re.escape(n) + r'\b', l, re.I))
    usos_js = len(re.findall(r"""['"`]""" + re.escape(n) + r"""['"`]""", txt))
    print(f'{t:40} sql={usos_sql:3} js={usos_js:3}' + ('   <-- revisar' if usos_sql + usos_js <= 1 else ''))
