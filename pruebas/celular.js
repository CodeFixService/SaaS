// Revisión en celular de TODAS las pantallas de una app (complementa auditoria.js, que solo ve la barra principal y Ajustes).
// Por cada ancho (320 y 360), claro y oscuro, por cada cuenta: abre cada página de PAGINAS, cada pestaña de su barra y cada
// sección por hash, y revisa: se sale del ancho, cosas cortadas por el borde, texto de botón cortado, botones encimados, tapado por la barra.
// Uso: node celular.js [Aplicaciones]  → capturas/celular/<app>/ e informe capturas/celular-<app>.txt
// Para replicar en otra app: agregar su entrada en APPS (cuentas, datos de ejemplo y PAGINAS).
const { abrir } = require('./h');
const { revisar } = require('./auditoria');
const fs = require('fs');
const ADM = 'juanjosuecastilloloyola@gmail.com';

// Cosas cortadas: elementos visibles que salen por el borde (fuera de zonas con scroll horizontal) y texto de botón que no cabe.
const cortes = (p, donde) => p.evaluate((donde) => {
  const out = [], W = innerWidth;
  const nom = (e) => (e.getAttribute('aria-label') || e.textContent || e.value || e.tagName).trim().replace(/\s+/g, ' ').slice(0, 30);
  const enScroll = (e) => { for (let x = e.parentElement; x && x !== document.body; x = x.parentElement) { const s = getComputedStyle(x); if (/auto|scroll|hidden|clip/.test(s.overflowX) && x.getBoundingClientRect().right <= W + 1) return true; } return false; };
  const vis = (e) => { if (e.closest('details:not([open]) > :not(summary), [hidden], .cfx-oc, [aria-hidden=true]')) return false; const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 2 && r.height > 2 && s.visibility !== 'hidden' && +s.opacity > 0.05 && r.bottom > 0 && r.top < innerHeight * 3; };
  document.querySelectorAll('button, a, input, select, textarea, label, img, h1, h2, h3, p, .chip, .pill, .card, table').forEach((e) => {
    if (!vis(e) || enScroll(e) || getComputedStyle(e).position === 'fixed' && e.getBoundingClientRect().left < -50) return;
    const r = e.getBoundingClientRect();
    if (r.right > W + 1 || r.left < -1) out.push(['grave', 'cortado por el borde (' + Math.round(r.left) + '→' + Math.round(r.right) + '): "' + nom(e) + '"']);
  });
  document.querySelectorAll('button, .btn, .chip, .pill, .tab, nav.cfx-barra a, nav.cfx-barra button').forEach((e) => {
    if (!vis(e) || !e.textContent.trim()) return;
    const s = getComputedStyle(e);
    if (e.scrollWidth > e.clientWidth + 2 && /hidden|clip/.test(s.overflowX + s.overflow)) out.push(['medio', 'texto cortado en botón: "' + nom(e) + '"']);
  });
  return out.map((x) => [x[0], donde + ': ' + x[1]]);
}, donde);

const APPS = {
  Aplicaciones: {
    repo: 'Aplicaciones', db: 'p_aplicaciones',
    async cuentas(t) {
      await t.sim.crearUsuario(ADM, 'admin123');
      const u = await t.sim.crearUsuario('tienda@x.cl', 'clave123', { tipo: 'negocio', empresa: 'Tienda Ana de Ropa Hecha a Mano' });
      await t.sim.su("update public.profiles set slug = 'ana', telefono = '56912345678', rubro = 'Ropa', horario = 'Lun a Vie 9 a 18', perfil = $2 where id = $1",
        [u.id, JSON.stringify({ descripcion: 'Ropa hecha a mano con lana natural del sur de Chile', comuna: 'Ñuñoa', instagram: '@ana' })]).catch(() => {});
      const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const prods = [['p1', 'Polerón de lana merino con capucha y bolsillo canguro extra largo', 1189990, 'Polerones'], ['p2', 'Gorro', 9990, 'Accesorios'], ['p3', 'Calcetines térmicos pack x3', 12990, 'Accesorios'], ['p4', 'Chaleco', 0, 'Chalecos']];
      for (const [k, n, pr, c] of prods) await t.sim.su("insert into public.catalog_items (owner_id, client_key, nombre, precio, categoria, descripcion, foto, foto_at) values ($1, $2, $3, $4, $5, 'Tejido a mano, lavar en frío. Tallas S a XL.', $6, now()) on conflict do nothing", [u.id, k, n, pr, c, png]).catch((e) => console.log('producto', e.message));
      await t.sim.su("insert into public.user_invites (email, nombre, role, negocio_id) values ('cli@x.cl','Pepe Cliente con Nombre Largo','client',$1)", [u.id]);
      const c = await t.sim.crearUsuario('cli@x.cl', 'clave123');
      await t.sim.su('update public.profiles set terms_at = now()');
      await t.sim.su("insert into public.pedidos (negocio_id, cliente_id, lineas, subtotal, total, entrega, estado) values ($1, $2, '[{\"nombre\":\"Polerón de lana merino con capucha\",\"cant\":2,\"precio\":1189990,\"subtotal\":2379980}]', 2379980, 2379980, 'despacho', 'recibido')", [u.id, c.id]).catch((e) => console.log('pedido', e.message));
      return [
        { rol: 'publico', url: null },
        { rol: 'negocio', url: '/', email: 'tienda@x.cl', pass: 'clave123' },
        { rol: 'cliente', url: '/', email: 'cli@x.cl', pass: 'clave123' },
        { rol: 'admin', url: '/', email: ADM, pass: 'admin123' },
      ];
    },
    PAGINAS: {
      publico: ['/t/?s=ana', '/t/?s=ana&p=p1', '/t/?s=ana#carrito', '/t/?s=noexiste', '/apps/legal/', '/n/', '/r/'],
      negocio: ['/', '/#links', '/#equipo', '/#despacho', '/#boleta', '/#redes', '/#modulos', '/apps/caja/', '/apps/caja/#productos', '/apps/pedidos/', '/apps/pedidos/?v=stats', '/apps/pedidos/?v=cupones', '/apps/fichas/', '/apps/fichas/#clientes', '/apps/mensajes/', '/apps/contactos/', '/apps/catalogo/', '/apps/suscribirse/'],
      cliente: ['/', '/apps/pedidos/', '/apps/mensajes/', '/apps/catalogo/', '/apps/suscribirse/'],
      admin: ['/apps/admin/'],
    },
    antes: (ctx) => ctx.addInitScript(() => { try { localStorage.setItem('cfx:tour:orbita-inicio', '1'); } catch (e) { /* */ } }),
  },
};

async function login(t, p, c) {
  await p.goto(t.base + c.url); await p.waitForTimeout(1000);
  await p.fill('input[type=email]:visible', c.email); await p.fill('input[type=password]:visible', c.pass); await p.press('input[type=password]:visible', 'Enter');
  await p.waitForTimeout(3000); await t.sinModales(p);
}

(async () => {
  const pedidas = process.argv.slice(2), informe = [];
  const ANCHOS = (process.env.ANCHOS || '320,360').split(',').map(Number), TEMAS = (process.env.TEMAS || 'light,dark').split(',');
  for (const [nombre, A] of Object.entries(APPS)) {
    if (pedidas.length && !pedidas.includes(nombre)) continue;
    require('child_process').execSync(__dirname + '/base.sh /home/user/' + A.repo, { stdio: 'ignore' });
    const t = await abrir('/home/user/' + A.repo, A.db);
    const dir = __dirname + '/capturas/celular/' + nombre; fs.mkdirSync(dir, { recursive: true });
    const vistos = new Set();
    try {
      const cuentas = await A.cuentas(t);
      for (const ancho of ANCHOS) for (const tema of TEMAS) for (const c of cuentas) {
        process.env.ANCHO = String(ancho);
        const { ctx, page: p } = await t.nuevo(); if (A.antes) await A.antes(ctx);
        await p.emulateMedia({ colorScheme: tema });
        const hall = [], foto = (n) => p.screenshot({ path: dir + '/' + ancho + '-' + tema + '-' + c.rol + '-' + n.replace(/[^\w-]+/g, '_').slice(0, 50) + '.png' });
        const mirar = async (donde) => {
          await t.sinModales(p); hall.push(...await revisar(p, donde), ...await cortes(p, donde));
          if (!(await t.anchoOk(p))) hall.push(['grave', donde + ': se sale del ancho (' + await p.evaluate(() => document.documentElement.scrollWidth) + 'px)']);
          await p.evaluate(() => scrollTo(0, 0)); await foto(donde);
        };
        try {
          if (c.url) await login(t, p, c);
          for (const pg of A.PAGINAS[c.rol] || []) {
            await p.goto(t.base + pg); await p.waitForTimeout(1800);
            await mirar(pg);
            // La barra de abajo es la misma en todas las páginas: sus pestañas se recorren solo en la primera.
            const n = pg !== A.PAGINAS[c.rol][0] ? 0 : await p.locator('nav.cfx-barra > :not(.cfx-menu):not(.cfx-mas)').count();
            for (let i = 0; i < n; i++) {
              const b = p.locator('nav.cfx-barra > :not(.cfx-menu):not(.cfx-mas)').nth(i);
              const tx = ((await b.textContent()) || '').trim().replace(/[^\p{L}]+/gu, '').slice(0, 12) || 'b' + i;
              if (/salir/i.test(tx)) continue;
              await b.evaluate((x) => x.click()); await p.waitForTimeout(1200);
              await mirar(pg + '›' + tx);
            }
            // Fichas/carrito de la vitrina: abrir la primera tarjeta.
            if (pg === '/t/?s=ana') { const tj = p.locator('#grid .t-card, #grid [data-p], #grid article').first(); if (await tj.count()) { await tj.click().catch(() => {}); await p.waitForTimeout(900); await mirar(pg + '›ficha'); } }
          }
        } catch (e) { hall.push(['grave', 'FALLA ' + e.message.split('\n')[0]]); await foto('error').catch(() => {}); }
        await ctx.close();
        const nuevos = [...new Set(hall.filter((h) => h[0] !== 'bajo' || process.env.BAJO).map((h) => h[0] + ' · ' + h[1]))].filter((x) => !vistos.has(c.rol + x.replace(/ · [^:]*:/, ':')));
        nuevos.forEach((x) => vistos.add(c.rol + x.replace(/ · [^:]*:/, ':')));
        informe.push(nombre + ' · ' + ancho + 'px ' + tema + ' · ' + c.rol + ' · ' + nuevos.length + ' hallazgos nuevos');
        nuevos.forEach((x) => informe.push('   ' + x));
      }
    } finally {
      const err = t.errores.filter((e) => !/TUNNEL|ERR_NAME|ERR_INTERNET|ERR_CONNECTION/.test(e));
      if (err.length) informe.push(nombre + ' · ERRORES: ' + [...new Set(err)].slice(0, 12).join(' || '));
      await t.cerrar();
    }
    fs.writeFileSync(__dirname + '/capturas/celular-' + nombre + '.txt', informe.join('\n') + '\n');
  }
  console.log(informe.join('\n'));
})();
