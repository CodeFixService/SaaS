// G33 · 🌐 Dominio de CodeFix: Josué pega dominio + token en CM → Control → 🌐 Dominio → ve los 2 servidores DNS (⏳) →
// cuando nic.cl apunta a Cloudflare: Custom Domains de cada Worker, tiendas.<dominio>, Custom Hostname de cada tienda (✅) y cada app guarda su dirección.
// Cloudflare simulado (API v4 en memoria). La función "servidor" corre la lógica real (supabase/functions/servidor/dominio.ts).
// Uso: node g33_dominio.js [bd]  (antes ./base.sh /home/user/saas <bd>)
const { abrir } = require('./h');
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) process.exitCode = 1; };
const TOKEN = 'cf_' + 'x'.repeat(40);

// ---------- Cloudflare de mentira ----------
function cloudflare() {
  const E = { zonas: [], dominios: [], dns: [], rutas: [], fallback: null, hostnames: [], saasHabilitado: true, llamadas: [] };
  const r = (result, success = true, status = 200, msg) => ({ status, json: async () => ({ success, result, errors: success ? [] : [{ message: msg }] }) });
  const f = async (url, o) => {
    const u = new URL(url), p = u.pathname.replace('/client/v4', ''), m = o.method, b = o.body ? JSON.parse(o.body) : null;
    E.llamadas.push(m + ' ' + p);
    if (o.headers.Authorization !== 'Bearer ' + TOKEN) return r(null, false, 401, 'Invalid API Token');
    if (p === '/user/tokens/verify') return r({ status: 'active' });
    if (p === '/accounts') return r([{ id: 'acc1' }]);
    if (p === '/zones' && m === 'GET') return r(E.zonas.filter((z) => z.name === u.searchParams.get('name')));
    if (p === '/zones' && m === 'POST') { const z = { id: 'z1', name: b.name, status: 'pending', name_servers: ['ana.ns.cloudflare.com', 'bob.ns.cloudflare.com'] }; E.zonas.push(z); return r(z); }
    if (p === '/accounts/acc1/workers/domains' && m === 'GET') return r(E.dominios);
    if (p === '/accounts/acc1/workers/domains' && m === 'PUT') { if (E.zonas[0].status !== 'active') return r(null, false, 400, 'zone not active'); E.dominios = E.dominios.filter((d) => d.hostname !== b.hostname).concat([{ hostname: b.hostname, service: b.service }]); return r(b); }
    if (p === '/zones/z1/dns_records' && m === 'GET') return r(E.dns.filter((d) => d.name === u.searchParams.get('name')));
    if (p === '/zones/z1/dns_records' && m === 'POST') { E.dns.push(b); return r(b); }
    if (p === '/zones/z1/workers/routes' && m === 'GET') return r(E.rutas);
    if (p === '/zones/z1/workers/routes' && m === 'POST') { E.rutas.push(b); return r(b); }
    if (p === '/zones/z1/custom_hostnames/fallback_origin' && m === 'GET') return E.fallback ? r({ origin: E.fallback }) : r(null, false, 404, 'not found');
    if (p === '/zones/z1/custom_hostnames/fallback_origin' && m === 'PUT') { if (!E.saasHabilitado) return r(null, false, 403, 'Cloudflare for SaaS no está habilitado'); E.fallback = b.origin; return r(b); }
    if (p === '/zones/z1/custom_hostnames' && m === 'GET') return r(E.hostnames.filter((h) => h.hostname === u.searchParams.get('hostname')));
    if (p === '/zones/z1/custom_hostnames' && m === 'POST') { const h = { hostname: b.hostname, status: 'pending', ssl: { status: 'pending_validation' } }; E.hostnames.push(h); return r(h); }
    return r(null, false, 404, 'no simulado ' + m + ' ' + p);
  };
  return { E, f };
}

(async () => {
  const { dominio, limpiar } = await import('../supabase/functions/servidor/dominio.ts');
  const cf = cloudflare();
  // ---------- 1) Lógica de la función (sin navegador) ----------
  ok(limpiar('https://WWW.CodeFix.cl/') === 'codefix.cl' && limpiar('no es dominio') === '', 'limpia el dominio');
  let d = await dominio({ token: '', dominio: 'codefix.cl', f: cf.f });
  ok(d.pasos[0].k === 'token' && d.pasos[0].ok === false && !cf.E.llamadas.length, 'sin token: pide el token y no llama a Cloudflare');

  // ---------- 2) Como Josué en el CM ----------
  const t = await abrir('/home/user/saas', process.argv[2] || 'p_g33', {
    funciones: {
      // Igual que index.ts → dominioAdmin: solo el admin, token desde cfx_secretos.
      servidor: async (b, user, h) => {
        if (b.accion !== 'dominio') return { ok: true };
        const [{ adm }] = await h.su('select public.admin_email() adm');
        const [{ em }] = await h.su('select email em from auth.users where id = $1', [user && user.sub]);
        if (String(em).toLowerCase() !== adm) return { ok: false, error: 'Solo el administrador' };
        const k = await h.su("select valor from public.cfx_secretos where clave = 'cloudflare'");
        return dominio({ token: (k[0] || {}).valor || '', dominio: b.dominio, tiendas: b.tiendas || [], f: cf.f });
      },
    },
  });
  const p = t.page, sitio = async () => (await t.sim.su("select valor from public.cfx_config where clave = 'sitio'"))[0].valor;
  try {
    await t.sim.crearUsuario('juanjosuecastilloloyola@gmail.com', 'admin123');
    await p.goto(t.base + '/'); await p.fill('input[type=email]', 'juanjosuecastilloloyola@gmail.com'); await p.fill('input[type=password]', 'admin123'); await p.press('input[type=password]', 'Enter');
    await p.waitForURL(/admin/); await p.waitForTimeout(800); await t.sinModales();
    await p.goto(t.base + '/admin/#control'); await p.waitForTimeout(3500); await t.sinModales();
    await p.click('[data-s=dominio]'); await p.waitForTimeout(1500);
    ok(await p.locator('#dbD').isVisible() && await p.locator('#dbT').isVisible(), 'Control → 🌐 Dominio: pide dominio y token');
    ok((await sitio()).activo === false, 'sin dominio: todo sigue en workers.dev');
    // Token malo → aviso claro
    await p.fill('#dbD', 'codefix.cl'); await p.fill('#dbT', 'malo'); await p.click('#dbG'); await p.waitForTimeout(1200);
    ok(/no parece un token/i.test(await p.locator('#dbR').innerText()), 'token mal copiado: lo dice');
    // Token bueno → Cloudflare crea el dominio → 2 servidores DNS con 📋
    await p.fill('#dbT', TOKEN); await p.click('#dbG'); await p.waitForTimeout(2500);
    const r1 = await p.locator('#dbR').innerText();
    ok(/ana\.ns\.cloudflare\.com/.test(r1) && /bob\.ns\.cloudflare\.com/.test(r1) && /nic\.cl/.test(r1), 'muestra los 2 servidores DNS para nic.cl');
    ok(await p.locator('#dbR [data-cop]').count() === 2, '📋 Copiar en cada servidor DNS');
    ok(cf.E.zonas.length === 1 && cf.E.zonas[0].name === 'codefix.cl', 'agregó codefix.cl a Cloudflare');
    const s1 = await sitio();
    ok(s1.dominio === 'codefix.cl' && s1.url === 'https://cm.codefix.cl/' && s1.activo === false, 'CM guarda su dirección, aún ⏳ (no activa)');
    await t.foto('g33-dominio-ns'); ok(await t.anchoOk(), 'ancho 360 (servidores DNS)');
    // Recargar: el token queda guardado (no se vuelve a pedir) y se revisa solo
    await p.reload(); await p.waitForTimeout(3000); await t.sinModales(); await p.click('[data-s=dominio]'); await p.waitForTimeout(2500);
    ok(await p.locator('#dbT').isHidden() && /Token de Cloudflare guardado/.test(await p.locator('#dbCaja').innerText()), 'al volver: token guardado, no lo pide');
    ok(cf.E.zonas.length === 1, 'no duplica el dominio en Cloudflare');
    // nic.cl ya apunta → 🔄 Revisar y armar
    cf.E.zonas[0].status = 'active'; cf.E.saasHabilitado = false;
    await p.click('#dbG'); await p.waitForTimeout(2500);
    const hosts = cf.E.dominios.map((x) => x.hostname + '>' + x.service).sort().join(' ');
    ok(['despega.codefix.cl>aplicaciones', 'cm.codefix.cl>saas', 'barberia.codefix.cl>barberia', 'billetera.codefix.cl>emprendedor', 'bicitaller.codefix.cl>taller', 'estaciona.codefix.cl>estacionamiento', 'codefix.cl>aplicaciones', 'www.codefix.cl>aplicaciones']
      .every((h) => hosts.includes(h)), 'Custom Domains: ' + hosts);
    ok(/Enable Cloudflare for SaaS/.test(await p.locator('#dbR').innerText()), 'SaaS apagado: dice dónde activarlo');
    const s2 = await sitio();
    ok(s2.activo === true && s2.url === 'https://cm.codefix.cl/', 'CM: dirección ✅ activa');
    ok(await p.evaluate(() => CFX_AYUDA.web('aplicaciones', 'despega')) === 'https://despega.codefix.cl/', 'links entre apps usan el dominio');
    // SaaS habilitado + una tienda con dominio (en Despega; aquí la misma base simula la conexión) → Custom Hostname
    cf.E.saasHabilitado = true;
    await p.click('#dbG'); await p.waitForTimeout(2500);
    ok(cf.E.dns.some((x) => x.name === 'tiendas.codefix.cl' && x.proxied) && cf.E.fallback === 'tiendas.codefix.cl' && cf.E.rutas.some((x) => x.pattern === '*/*' && x.script === 'aplicaciones'), 'tiendas.codefix.cl + ruta */* → Despega');
    const r3 = await p.locator('#dbR').innerText();
    ok(/Dominios de negocios listos/.test(r3) && /Listo/.test(r3) && /Redirect URLs/.test(r3), 'checklist todo ✅ + falta Redirect URLs');
    await t.foto('g33-dominio-listo'); ok(await t.anchoOk(), 'ancho 360 (listo)');
    const antes = cf.E.llamadas.filter((x) => /^(PUT|POST)/.test(x)).length;
    await p.click('#dbG'); await p.waitForTimeout(2500);
    ok(cf.E.llamadas.filter((x) => /^(PUT|POST)/.test(x)).length === antes, 'repetir no crea nada de nuevo');
    // Tiendas: la lógica crea el Custom Hostname www.<dominio>
    d = await dominio({ token: TOKEN, dominio: 'codefix.cl', tiendas: ['MiTienda.cl'], f: cf.f });
    ok(cf.E.hostnames.some((h) => h.hostname === 'www.mitienda.cl') && d.tiendas[0].ok === false && /CNAME/.test(d.tiendas[0].estado), 'tienda: Custom Hostname www.mitienda.cl ⏳ esperando su CNAME');
    cf.E.hostnames[0].status = 'active'; cf.E.hostnames[0].ssl.status = 'active';
    d = await dominio({ token: TOKEN, dominio: 'codefix.cl', tiendas: ['mitienda.cl'], f: cf.f });
    ok(d.tiendas[0].ok === true && cf.E.hostnames.length === 1, 'tienda ✅ activa, sin duplicar');
    // Público: cualquier app lee su dirección (para links/QR/correos)
    const [{ u }] = await t.sim.su('select public.cfx_sitio_url() u');
    ok(u === 'https://cm.codefix.cl/', 'cfx_sitio_url() para correos: ' + u);
    // Oscuro
    await p.emulateMedia({ colorScheme: 'dark' }); await t.foto('g33-dominio-oscuro');
  } catch (e) { console.log('✗ ' + e.stack); process.exitCode = 1; }
  const err = t.errores.filter((x) => !/favicon|cdn\.|fonts|status of 40[04]|no parece un token/.test(x)); if (err.length) console.log('errores:', err.slice(0, 5));
  await t.cerrar();
})();
