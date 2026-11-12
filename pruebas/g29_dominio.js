// G29 · M3 🌐 Dominio (Cloudflare for SaaS): el admin guarda el destino del CNAME; el negocio ve CNAME www → destino con 📋, "redirige la raíz" y estado ⏳/✅.
// Uso: node g29_dominio.js [bd]  (antes ./base.sh /home/user/Aplicaciones <bd>)
const { abrir } = require('./h');
(async () => {
  const t = await abrir('/home/user/Aplicaciones', process.argv[2] || 'p_g29');
  const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) process.exitCode = 1; };
  try {
    await t.sim.crearUsuario('tienda@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Codex' }); await t.sim.su('update public.profiles set terms_at = now()');
    await t.sim.su("update public.profiles set slug = 'codex', telefono = '56912345678' where email = 'tienda@x.cl'");
    // Como Josué en el CM (Control → Órbita → 🌐 Dominio): el admin guarda el destino. Se simula con la función de admin.
    const [{ em }] = await t.sim.su('select public.admin_email() em');
    await t.sim.crearUsuario(em, 'clave123', { tipo: 'negocio', empresa: 'Adm' }); await t.sim.su("update public.profiles set role = 'admin', terms_at = now() where email = $1", [em]);
    await t.sim.su('update auth.users set email_confirmed_at = now() where email = $1', [em]);
    const [{ id: adm }] = await t.sim.su('select id from public.profiles where email = $1', [em]);
    await t.sim.su("select set_config('request.jwt.claim.sub', $1, false)", [adm]);
    await t.sim.su("select public.cfx_dominio_guardar('https://Tiendas.CodeFix.cl/')");
    const [{ n0 }] = await t.sim.su("select jsonb_array_length(public.cfx_dominio()->'tiendas') n0");
    ok(n0 === 0, 'CM: lista de dominios vacía al inicio');
    await t.sim.su("select set_config('request.jwt.claim.sub', '', false)");
    const [{ v }] = await t.sim.su("select valor->>'cname' v from public.cfx_config where clave = 'dominio'");
    ok(v === 'tiendas.codefix.cl', 'CM guarda el destino limpio: ' + v);

    let conectado = false;
    const q = t.page;
    await q.route('https://www.mitienda.cl/cfx-dominio', (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ slug: conectado ? 'codex' : null }) }));
    await q.goto(t.base + '/'); await q.waitForTimeout(1200);
    await q.evaluate(() => localStorage.setItem('cfx:tour:orbita-inicio', '1'));
    await q.fill('input[type=email]:visible', 'tienda@x.cl'); await q.fill('input[type=password]:visible', 'clave123'); await q.press('input[type=password]:visible', 'Enter'); await q.waitForTimeout(3000);
    await q.goto(t.base + '/#dominio'); await q.waitForTimeout(3000); await t.sinModales(q);
    const txt = () => q.evaluate(() => document.getElementById('dominioBody').innerText);
    // Negocio: escribe "www.MiTienda.cl" → Guardar (debe quedar sin www, si no, el Worker no lo encuentra).
    await q.fill('#mdDom', 'www.MiTienda.cl'); await q.click('[data-rd="dominio"]'); await q.waitForTimeout(2500);
    const [{ dominio }] = await t.sim.su("select dominio from public.profiles where email = 'tienda@x.cl'");
    ok(dominio === 'mitienda.cl', 'se guarda sin www: ' + dominio);
    await q.goto(t.base + '/'); await q.waitForTimeout(2500); await t.sinModales(q);  // recargar → Más → Mi dominio
    await q.goto(t.base + '/#dominio'); await q.waitForTimeout(3500); await t.sinModales(q);
    await q.evaluate(() => document.getElementById('cDominio').scrollIntoView());
    let s = await txt();
    const vals = await q.evaluate(() => [...document.querySelectorAll('#dominioBody [data-rd-copiar]')].map((b) => b.dataset.rdCopiar));
    ok(vals.includes('CNAME') && vals.includes('www') && vals.includes('tiendas.codefix.cl'), 'CNAME www → tiendas.codefix.cl con 📋 ' + JSON.stringify(vals));
    ok(/Redirige/.test(s) && /mitienda\.cl/.test(s), 'pide redirigir la raíz a www');
    ok(/Pendiente/.test(s), 'estado ⏳ Pendiente');
    await t.foto('g29-dominio-pendiente', q);
    // Ya conectado → 🔄 Revisar → ✅ Activo.
    conectado = true; await q.click('[data-rd="revisar-dom"]'); await q.waitForTimeout(1500);
    s = await txt();
    ok(/Activo/.test(s) && /https:\/\/www\.mitienda\.cl/.test(s) && !/CNAME/.test(s), 'estado ✅ Activo y la tienda en www.mitienda.cl');
    await t.foto('g29-dominio-activo', q);
    await t.sim.su("select set_config('request.jwt.claim.sub', $1, false)", [adm]);
    const [{ l }] = await t.sim.su("select public.cfx_dominio()->'tiendas' l");
    ok(l.length === 1 && l[0].dominio === 'mitienda.cl' && l[0].slug === 'codex', 'CM: ve www.mitienda.cl para agregar en Custom Hostnames ' + JSON.stringify(l));
  } catch (e) { console.log('✗ ' + e.message); process.exitCode = 1; } finally { await t.cerrar(); }
})();
