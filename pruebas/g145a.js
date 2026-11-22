// G145 · 🏪 Lo de cada tienda lo configura cada tienda + 🧭 CM con un solo lugar por cosa.
// a) 🌐 Dominio: la tienda lo conecta sola desde Despega (función enviar → dominio_tienda.ts → Cloudflare con el token de CodeFix).
// b) 🛒 Mercado Libre: en el CM solo la app de desarrollador de CodeFix (1 vez); cada tienda conecta la suya en Despega.
// c) 🔔 Notificaciones y 📜 Registro del CM: solo en Control (antes también en Ajustes), sin perder funciones.
// FALLA con el código viejo (no existe dominio_tienda.ts, dominio_cf_datos ni el token 'cf_token'). Uso: node g145a.js
const { execSync } = require('child_process');
const fs = require('fs');
const R = '/home/user/';
let fallas = 0;
const ok = (c, m) => { if (!c) { fallas++; console.log('✗ ' + m); } else console.log('✓ ' + m); };
const leer = (p) => fs.readFileSync(R + p, 'utf8');

(async () => {
  // ---------- a) dominio_tienda.ts con Cloudflare simulado ----------
  const ts = R + 'Aplicaciones/supabase/functions/enviar/dominio_tienda.ts';
  ok(fs.existsSync(ts), 'a: existe enviar/dominio_tienda.ts');
  const tmp = '/tmp/g145a_dom.mts'; fs.copyFileSync(ts, tmp);
  const { dominioTienda } = await import(tmp + '?' + Date.now()).catch(() => ({}));
  if (dominioTienda) {
    const TOKEN = 'cf_' + 'x'.repeat(40);
    const E = { hostnames: [], llamadas: [] };
    const r = (result, success = true, msg) => ({ status: 200, json: async () => ({ success, result, errors: success ? [] : [{ message: msg }] }) });
    const f = async (url, o) => {
      const u = new URL(url), p = u.pathname.replace('/client/v4', ''), m = o.method, b = o.body ? JSON.parse(o.body) : null;
      E.llamadas.push(m + ' ' + p);
      if (o.headers.Authorization !== 'Bearer ' + TOKEN) return r(null, false, 'Invalid API Token');
      if (p === '/zones' && m === 'GET') return r(u.searchParams.get('name') === 'codefix.cl' ? [{ id: 'z1', name: 'codefix.cl' }] : []);
      if (p === '/zones/z1/custom_hostnames' && m === 'GET') return r(E.hostnames.filter((h) => h.hostname === u.searchParams.get('hostname')));
      if (p === '/zones/z1/custom_hostnames' && m === 'POST') { const h = { id: 'h' + (E.hostnames.length + 1), hostname: b.hostname, status: 'pending', ssl: { status: 'pending_validation' } }; E.hostnames.push(h); return r(h); }
      if (/^\/zones\/z1\/custom_hostnames\/h\d+$/.test(p) && m === 'DELETE') { E.hostnames = E.hostnames.filter((h) => '/zones/z1/custom_hostnames/' + h.id !== p); return r({}); }
      return r(null, false, 'ruta no simulada ' + m + ' ' + p);
    };
    const base = { token: TOKEN, cname: 'tiendas.codefix.cl', f };
    let x = await dominioTienda({ ...base, token: '', dominio: 'mitienda.cl', modulo: true });
    ok(x.estado === 'sin_codefix' && !E.llamadas.length, 'a: sin token de CodeFix → "sin_codefix" y no llama a Cloudflare');
    x = await dominioTienda({ ...base, cname: '', dominio: 'mitienda.cl', modulo: true });
    ok(x.estado === 'sin_codefix', 'a: sin dominio de CodeFix → "sin_codefix"');
    x = await dominioTienda({ ...base, dominio: 'mitienda.cl', modulo: false });
    ok(x.estado === 'sin_modulo' && !E.hostnames.length, 'a: 🔒 sin el módulo no se crea nada en Cloudflare');
    x = await dominioTienda({ ...base, dominio: 'MiTienda.cl', modulo: true });
    ok(x.estado === 'pendiente' && E.hostnames.length === 1 && E.hostnames[0].hostname === 'www.mitienda.cl', 'a: con módulo crea www.mitienda.cl (pendiente hasta que pegue el CNAME)');
    x = await dominioTienda({ ...base, dominio: 'mitienda.cl', modulo: true });
    ok(E.hostnames.length === 1, 'a: repetir no duplica');
    E.hostnames[0].status = 'active'; E.hostnames[0].ssl.status = 'active';
    x = await dominioTienda({ ...base, dominio: 'mitienda.cl', modulo: true });
    ok(x.estado === 'activo', 'a: con el CNAME puesto → activo');
    x = await dominioTienda({ ...base, dominio: 'otra.cl', modulo: true, antes: 'mitienda.cl', antesLibre: false });
    ok(E.hostnames.some((h) => h.hostname === 'www.mitienda.cl'), 'a: 🔒 el dominio anterior que usa OTRA tienda no se borra');
    x = await dominioTienda({ ...base, dominio: null, modulo: true, antes: 'otra.cl', antesLibre: true });
    ok(x.estado === 'sin_dominio' && x.quitado && !E.hostnames.some((h) => h.hostname === 'www.otra.cl'), 'a: al quitar su dominio se borra su Custom Hostname');
    x = await dominioTienda({ ...base, token: 'malo', dominio: 'mitienda.cl', modulo: true });
    ok(x.estado === 'error' && /Invalid/.test(x.error || ''), 'a: token malo → error claro (no se cae)');
  } else ok(false, 'a: dominioTienda se puede importar');
  // index.ts: acción 'dominio' con sesión, datos de la base
  const idx = leer('Aplicaciones/supabase/functions/enviar/index.ts');
  ok(/accion === 'dominio'/.test(idx) && /dominio_cf_datos/.test(idx) && /auth\.getUser\(jwt\)/.test(idx.split("accion === 'dominio'")[1] || ''), 'a: enviar → acción dominio pide la sesión y los datos a la base');
  try { execSync('node --experimental-strip-types --check ' + R + 'Aplicaciones/supabase/functions/enviar/dominio_tienda.ts', { stdio: 'pipe' }); ok(true, 'a: dominio_tienda.ts compila'); } catch (e) { ok(false, 'a: dominio_tienda.ts compila'); }

  // ---------- a) SQL Despega ----------
  const PSQL = 'psql -h /var/tmp/pgb -p 54329 -U postgres -tA -v ON_ERROR_STOP=1 -q -d g145a';
  execSync(__dirname + '/base.sh ' + R + 'Aplicaciones g145a', { stdio: 'ignore' });
  const q = (s) => { try { return execSync(PSQL, { input: s, stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim().split('\n').filter((l) => l && !/^(SET|BEGIN|ROLLBACK)$/.test(l)).pop() || ''; } catch (e) { return 'ERR ' + String(e.stderr || e.message).split('\n')[0]; } };
  const U = '11111111-1111-4111-8111-111111111111', V = '22222222-2222-4222-8222-222222222222', C = '33333333-3333-4333-8333-333333333333';
  q(`set session_replication_role = replica; insert into auth.users (id, email) values ('${U}', 'u@x.cl'), ('${V}', 'v@x.cl'), ('${C}', 'c@x.cl') on conflict do nothing;
     insert into public.profiles (id, email, role, slug, dominio) values ('${U}', 'u@x.cl', 'user', 'tu', 'mitienda.cl'), ('${V}', 'v@x.cl', 'user', 'tv', 'usada.cl'), ('${C}', 'c@x.cl', 'client', null, null) on conflict (id) do update set role = excluded.role, slug = excluded.slug, dominio = excluded.dominio;
     set session_replication_role = origin; update public.cfx_config set valor = '{"cname": "tiendas.codefix.cl"}' where clave = 'dominio';`);
  ok(parseFloat(q("select db_version()")) >= 5.98, 'a: Despega bd ≥ 5.98');
  const d1 = q(`select public.dominio_cf_datos('${U}', 'https://www.Vieja.cl/x')`);
  let j = {}; try { j = JSON.parse(d1); } catch (e) { /* nada */ }
  ok(j.ok && j.dominio === 'mitienda.cl' && j.cname === 'tiendas.codefix.cl' && j.antes === 'vieja.cl' && j.antes_libre === true, 'a: dominio_cf_datos trae el dominio de la base, el destino y el anterior libre (' + d1.slice(0, 120) + ')');
  j = JSON.parse(q(`select public.dominio_cf_datos('${U}', 'usada.cl')`) || '{}');
  ok(j.antes_libre === false, 'a: 🔒 el anterior que usa otra tienda NO queda libre');
  j = JSON.parse(q(`select public.dominio_cf_datos('${C}')`) || '{}');
  ok(j.ok === false, 'a: 🔒 un cliente no es dueño de tienda');
  ok(/ERR/.test(q(`begin; set local role authenticated; select public.dominio_cf_datos('${U}'); rollback;`)), 'a: 🔒 dominio_cf_datos no se puede llamar desde la app (solo el servidor)');
  ok(/ERR/.test(q(`begin; set local role anon; select public.dominio_cf_datos('${U}'); rollback;`)), 'a: 🔒 ni sin cuenta');
  ok(!/ERR/.test(q(`create or replace function public.is_admin() returns boolean language sql as $$ select true $$; select public.admin_set_secret('cf_token', 'cf_tok'); select (public.get_secrets() ->> 'cf_token') = 'cf_tok';`)), 'a: el CM puede copiar el token de Cloudflare a Despega (cf_token)');
  ok(/ERR.*no permitido/i.test(q(`select public.admin_set_secret('otra_cosa', 'x')`)), 'a: 🔒 solo nombres permitidos');
  ok(!/Agrégalo en Cloudflare/.test(leer('Aplicaciones/supabase/instalar.sql')), 'a: ya no se le pide a Josué agregar dominios a mano');

  // ---------- a) pantallas ----------
  const html = leer('Aplicaciones/index.html');
  ok(/conectarDominio\(domAntes\)/.test(html) && /await conectarDominio\(\); return revisarDominio/.test(html), 'a: Despega → 🌐 Mi dominio conecta solo al Guardar y al 🔄 Revisar');
  ok(!/CodeFix te manda por el chat/.test(html) && !/CodeFix activa el certificado y te avisa/.test(html), 'a: Despega ya no depende de Josué para el dominio');
  const ctl = leer('SaaS/admin/control.js');
  ok(!/elige Despega Pyme arriba/.test(ctl) && /Cada tienda conecta <b>su<\/b> dominio en su app/.test(ctl), 'a: CM → 🌐 Dominio: lo de las tiendas es solo informativo (lista contraíble)');
  ok(/'admin_set_secret', \{ p_name: 'cf_token'/.test(ctl), 'a: al pegar el token en el CM se copia a Despega');
  // ---------- b) Mercado Libre ----------
  ok(/Mercado Libre · app de CodeFix/.test(ctl) && /Aquí nunca se configura una tienda/.test(ctl), 'b: CM → 🛒 Mercado Libre = solo la app de CodeFix (1 vez)');
  ok(/#mercadolibre/.test(html), 'b: cada tienda conecta su Mercado Libre en Despega (#mercadolibre)');
  // ---------- c) un solo lugar ----------
  const adm = leer('SaaS/admin/admin.js');
  ok(!/k: 'push', ico/.test(adm) && !/k: 'registro', ico/.test(adm), 'c: Ajustes ya no repite 🔔 Notificaciones ni 📜 Registro');
  ok(/window\.CM_PUSH = push/.test(adm) && /window\.CM_REGISTRO = registro/.test(adm) && /window\.CM_PUSH\(/.test(ctl) && /window\.CM_REGISTRO\(/.test(ctl), 'c: Control monta las mismas funciones (claves nuevas, probar servidor, CSV, vaciar)');
  ok(/h === 'registro'.*cm-control-secc/.test(adm), 'c: el link viejo #registro abre Control → 📜 Registro');
  for (const f of ['SaaS/admin/control.js', 'SaaS/admin/admin.js']) { try { new Function(leer(f)); ok(true, f + ' sin errores de sintaxis'); } catch (e) { ok(false, f + ': ' + e.message); } }
  console.log(fallas ? '❌ ' + fallas + ' fallas' : '✅ G145 OK');
  process.exit(fallas ? 1 : 0);
})();
