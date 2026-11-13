// CodeFix · G33 🌐 Dominio de CodeFix en Cloudflare (lo usa index.ts; sin imports para probarlo con node: pruebas/g33_dominio.js).
// Con UN token de Cloudflare arma todo solo y se puede repetir (no duplica):
//  1) crea el dominio en Cloudflare (plan gratis) → entrega los 2 servidores DNS para pegar en nic.cl;
//  2) cuando Cloudflare lo ve activo: Custom Domain de cada Worker (despega., cm., barberia., …; raíz y www = Despega Pyme);
//  3) dominios de los negocios (Cloudflare for SaaS): tiendas.<dominio> + ruta */* → aplicaciones + Custom Hostname por tienda.

export const APPS_DOMINIO: { sub: string; worker: string; app: string }[] = [
  { sub: 'despega', worker: 'aplicaciones', app: 'aplicaciones' },
  { sub: 'cm', worker: 'saas', app: 'cm' },
  { sub: 'barberia', worker: 'barberia', app: 'barberia' },
  { sub: 'billetera', worker: 'emprendedor', app: 'billetera' },
  { sub: 'bicitaller', worker: 'taller', app: 'bicitaller' },
  { sub: 'estaciona', worker: 'estacionamiento', app: 'estaciona' },
];
const TIENDAS = 'tiendas';
const API = 'https://api.cloudflare.com/client/v4';

type Paso = { k: string; t: string; ok: boolean | null; ayuda?: string };
type Res = { ok: boolean; error?: string; dominio?: string; ns?: string[]; activo?: boolean; pasos: Paso[]; apps?: Record<string, { url: string; ok: boolean }>; cname?: string; tiendas?: { host: string; ok: boolean; estado: string }[] };

export function limpiar(d: string): string {
  const x = String(d || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/\.$/, '').replace(/^www\./, '');
  return /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/.test(x) && x.length <= 80 ? x : '';
}

export async function dominio(o: { token: string; dominio: string; tiendas?: string[]; f?: typeof fetch }): Promise<Res> {
  const f = o.f || fetch, pasos: Paso[] = [];
  const dom = limpiar(o.dominio);
  if (!dom) return { ok: false, error: 'Escribe solo el dominio, ej: codefix.cl', pasos };
  if (!o.token) return { ok: true, dominio: dom, pasos: [{ k: 'token', t: 'Token de Cloudflare', ok: false, ayuda: 'token' }] };
  const cf = async (metodo: string, ruta: string, cuerpo?: unknown) => {
    const r = await f(API + ruta, { method: metodo, headers: { Authorization: 'Bearer ' + o.token, 'Content-Type': 'application/json' }, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
    const j = await r.json().catch(() => ({}));
    if (!j.success) throw new Error(((j.errors || [])[0] || {}).message || 'Cloudflare respondió ' + r.status);
    return j.result;
  };
  // 1) Token y cuenta
  let cuenta = '';
  try { await cf('GET', '/user/tokens/verify'); const acc = await cf('GET', '/accounts?per_page=5'); cuenta = (acc[0] || {}).id || ''; }
  catch (e) { return { ok: true, dominio: dom, pasos: [{ k: 'token', t: 'Token de Cloudflare: ' + (e as Error).message, ok: false, ayuda: 'token' }] }; }
  if (!cuenta) return { ok: true, dominio: dom, pasos: [{ k: 'token', t: 'El token no tiene acceso a tu cuenta (Account Settings: Read)', ok: false, ayuda: 'token' }] };
  pasos.push({ k: 'token', t: 'Token de Cloudflare', ok: true });
  // 2) El dominio en Cloudflare (lo crea si falta) → servidores DNS para nic.cl
  let zona = (await cf('GET', '/zones?name=' + encodeURIComponent(dom)))[0];
  try { if (!zona) zona = await cf('POST', '/zones', { name: dom, account: { id: cuenta }, type: 'full' }); }
  catch (e) { pasos.push({ k: 'zona', t: 'Agregar ' + dom + ' a Cloudflare: ' + (e as Error).message, ok: false, ayuda: 'token' }); return { ok: true, dominio: dom, pasos }; }
  const ns: string[] = zona.name_servers || [];
  pasos.push({ k: 'zona', t: dom + ' agregado a Cloudflare', ok: true });
  const activo = zona.status === 'active';
  pasos.push({ k: 'ns', t: activo ? 'nic.cl apunta a Cloudflare' : 'Falta: en nic.cl pegar los 2 servidores DNS (tarda de minutos a 24 h)', ok: activo, ayuda: activo ? undefined : 'ns' });
  const apps: Record<string, { url: string; ok: boolean }> = {};
  APPS_DOMINIO.forEach((a) => { apps[a.app] = { url: 'https://' + a.sub + '.' + dom + '/', ok: false }; });
  if (!activo) return { ok: true, dominio: dom, ns, activo, pasos, apps, cname: TIENDAS + '.' + dom };
  // 3) Custom Domain de cada Worker (+ raíz y www → Despega Pyme)
  const hay = new Map<string, string>(((await cf('GET', '/accounts/' + cuenta + '/workers/domains?zone_id=' + zona.id)) || []).map((x: { hostname: string; service: string }) => [x.hostname, x.service]));
  const quiero = APPS_DOMINIO.map((a) => ({ host: a.sub + '.' + dom, worker: a.worker, app: a.app }))
    .concat([{ host: dom, worker: 'aplicaciones', app: '' }, { host: 'www.' + dom, worker: 'aplicaciones', app: '' }]);
  const malos: string[] = [];
  for (const q of quiero) {
    let ok = hay.get(q.host) === q.worker;
    if (!ok) {
      try { await cf('PUT', '/accounts/' + cuenta + '/workers/domains', { hostname: q.host, service: q.worker, environment: 'production', zone_id: zona.id }); ok = true; }
      catch (e) { malos.push(q.host + ': ' + (e as Error).message); }
    }
    if (q.app) apps[q.app].ok = ok;
  }
  pasos.push({ k: 'apps', t: malos.length ? 'Direcciones de las apps: ' + malos.join(' · ') : 'Direcciones de las apps (despega., cm., barberia., …)', ok: !malos.length });
  // 4) Dominio propio de los negocios: tiendas.<dom> (AAAA 100:: con nube naranja) como origen + ruta */* → aplicaciones
  const tiendas = TIENDAS + '.' + dom;
  let saas = true, nota = '';
  try {
    const dns = await cf('GET', '/zones/' + zona.id + '/dns_records?name=' + encodeURIComponent(tiendas));
    if (!dns.length) await cf('POST', '/zones/' + zona.id + '/dns_records', { type: 'AAAA', name: tiendas, content: '100::', proxied: true, comment: 'CodeFix: dominios de tiendas' });
    const rutas = await cf('GET', '/zones/' + zona.id + '/workers/routes');
    if (!rutas.some((r: { pattern: string }) => r.pattern === '*/*')) await cf('POST', '/zones/' + zona.id + '/workers/routes', { pattern: '*/*', script: 'aplicaciones' });
  } catch (e) { saas = false; nota = (e as Error).message; }
  if (saas) {
    try {
      const fo = await cf('GET', '/zones/' + zona.id + '/custom_hostnames/fallback_origin').catch(() => ({}));
      if ((fo || {}).origin !== tiendas) await cf('PUT', '/zones/' + zona.id + '/custom_hostnames/fallback_origin', { origin: tiendas });
    } catch (e) { saas = false; nota = (e as Error).message; }
  }
  pasos.push({ k: 'saas', t: saas ? 'Dominios de negocios listos (CNAME www → ' + tiendas + ')' : 'Dominios de negocios: activa Cloudflare for SaaS (' + nota + ')', ok: saas, ayuda: saas ? undefined : 'saas' });
  // 5) Custom Hostname de cada tienda que ya puso su dominio (www.sutienda.cl)
  const lista: { host: string; ok: boolean; estado: string }[] = [];
  if (saas) {
    for (const h0 of (o.tiendas || []).slice(0, 100)) {
      const d = limpiar(h0); if (!d) continue;
      const host = 'www.' + d;
      try {
        let ch = (await cf('GET', '/zones/' + zona.id + '/custom_hostnames?hostname=' + encodeURIComponent(host)))[0];
        if (!ch) ch = await cf('POST', '/zones/' + zona.id + '/custom_hostnames', { hostname: host, ssl: { method: 'http', type: 'dv', settings: { min_tls_version: '1.2' } } });
        const ok = ch.status === 'active' && (!ch.ssl || ch.ssl.status === 'active');
        lista.push({ host, ok, estado: ok ? 'activo' : 'esperando el CNAME del negocio' });
      } catch (e) { lista.push({ host, ok: false, estado: (e as Error).message }); }
    }
  }
  return { ok: true, dominio: dom, ns, activo, pasos, apps, cname: tiendas, tiendas: lista };
}
