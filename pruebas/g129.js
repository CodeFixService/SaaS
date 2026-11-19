// G129 · 🧩 Módulos encimado (Estaciona): la tarjeta destacada usaba la clase "top", que en Estaciona es su encabezado fijo (.top{position:fixed;display:flex}).
// Monta la tienda de módulos del núcleo dentro de cada app (sus CSS reales) a 320/360 px claro/oscuro y mide que nada quede encimado.
// FALLA con el código viejo (Estaciona: tarjeta "Más elegido" fixed, etiqueta vertical, chips sobre el texto).
// Uso: node g129.js   (crea sus bases con base.sh)
const { abrir } = require('./h');
const { execSync } = require('child_process');
const APPS = [
  ['Estacionamiento', 'p_g129e', '/'], ['Aplicaciones', 'p_g129a', '/'], ['barberia', 'p_g129b', '/equipo/'],
  ['emprendedor', 'p_g129m', '/app/'], ['taller', 'p_g129t', '/taller/'],
];
const DATOS = {
  activo: true, dueno: true, premium: true, descuento: 20, anual_meses: 10, prueba_dias: 7,
  modulos: [
    { clave: 'espera', nombre: 'Lista de espera', detalle: 'Avisa cuando se libera un cupo', precio: 1192, lista: 1490, vende: true },
    { clave: 'frecuentes', nombre: 'Clientes frecuentes', detalle: 'Premia a los que vuelven', precio: 1192, lista: 1490, vende: true },
    { clave: 'tarifa', nombre: 'Tarifa fin de semana y noche', detalle: 'Cobra distinto por horario', precio: 792, lista: 990, vende: true },
    { clave: 'estudio', nombre: 'Estudio de contenido', detalle: 'Ideas y plantillas para tus redes', precio: 1192, lista: 1490, vende: true },
  ],
  packs: [
    { clave: 'p_full', nombre: 'Para el que se la juega', detalle: 'Todos los módulos', precio: 2392, lista: 2990, suelto: 5460, destacado: true, modulos: ['espera', 'frecuentes', 'tarifa', 'estudio'] },
    { clave: 'p_bas', nombre: 'Básico', detalle: 'Destacado en el mapa y descuento por estadía larga', precio: 1192, lista: 1490, suelto: 1980, modulos: ['espera', 'tarifa'] },
  ],
};
(async () => {
  let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
  for (const [repo, db, url] of APPS) {
    execSync(__dirname + '/base.sh /home/user/' + repo + ' ' + db, { stdio: 'ignore' });
    const t = await abrir('/home/user/' + repo, db);
    try {
      for (const ancho of [320, 360]) for (const tema of ['light', 'dark']) {
        const p = t.page;
        await p.setViewportSize({ width: ancho, height: 740 }); await p.emulateMedia({ colorScheme: tema });
        await p.goto(t.base + url); await p.waitForTimeout(1500);
        // Sin sesión la app manda al ingreso: se cargan los CSS y el modulos.js de la pantalla real del negocio.
        await p.evaluate(async (u) => {
          if (window.CFX_MODULOS_TIENDA) return;
          const html = await (await fetch(u)).text(), d = new DOMParser().parseFromString(html, 'text/html'), abs = (h) => new URL(h, location.origin + u).href;
          d.querySelectorAll('link[rel=stylesheet],style').forEach((x) => { const c = x.cloneNode(true); if (c.href) c.href = abs(x.getAttribute('href')); document.head.appendChild(c); });
          const s = [...d.querySelectorAll('script[src]')].find((x) => /modulos\.js/.test(x.getAttribute('src')));
          await new Promise((ok) => { const e = document.createElement('script'); e.src = abs(s.getAttribute('src')); e.onload = e.onerror = ok; document.head.appendChild(e); });
        }, url);
        const r = await p.evaluate(async (D) => {
          if (!window.CFX_MODULOS_TIENDA) return { error: 'sin CFX_MODULOS_TIENDA' };
          const z = document.createElement('div'); z.id = 'g129'; z.style.cssText = 'padding:12px;position:relative;z-index:1';
          document.body.prepend(z);
          await CFX_MODULOS_TIENDA.montar(z, { rpc: async () => JSON.parse(JSON.stringify(D)) }).cargar();
          const top = z.querySelectorAll('.cfxm-pack')[0], tag = top.querySelector('.cfxm-tag'), cs = getComputedStyle(top);
          const caja = (e) => e.getBoundingClientRect();
          // Hijos directos de cada tarjeta: ninguno se monta sobre el siguiente.
          const enc = [];
          z.querySelectorAll('.cfxm-pack,.cfxm-mod').forEach((c) => { const h = [...c.children].filter((x) => x.getClientRects().length);
            for (let i = 1; i < h.length; i++) if (caja(h[i]).top < caja(h[i - 1]).bottom - 2) enc.push(h[i - 1].className + ' / ' + h[i].className); });
          const btns = [...z.querySelectorAll('.cfxm-btns button')].map((b) => caja(b).height);
          const precio = [...z.querySelectorAll('.cfxm-precio')].map((e) => caja(e).height);
          const fuera = [...z.querySelectorAll('.cfxm *')].filter((e) => caja(e).right > innerWidth + 1 && e.getClientRects().length).length;
          const out = { pos: cs.position, disp: cs.display, tagW: caja(tag).width, tagH: caja(tag).height, enc, btnMax: Math.max(...btns), precioMax: Math.max(...precio), fuera, scroll: document.documentElement.scrollWidth - innerWidth };
          z.remove(); return out;
        }, DATOS);
        const n = repo + ' ' + ancho + ' ' + tema;
        if (r.error) { ok(false, n + ': ' + r.error); continue; }
        ok(r.pos === 'static' && r.disp === 'block', n + ': tarjeta destacada en su lugar (' + r.pos + '/' + r.disp + ')');
        ok(r.tagW > 60 && r.tagH < 30, n + ': "⭐ Más elegido" horizontal (' + Math.round(r.tagW) + '×' + Math.round(r.tagH) + ')');
        ok(!r.enc.length, n + ': nada encimado' + (r.enc.length ? ' → ' + r.enc.slice(0, 3).join(' · ') : ''));
        ok(r.btnMax < 60 && r.precioMax < 70, n + ': botones y precio en una línea (' + Math.round(r.btnMax) + '/' + Math.round(r.precioMax) + ')');
        ok(!r.fuera, n + ': nada se sale del ancho (' + r.fuera + ')');
      }
    } catch (e) { ok(false, repo + ': ' + e.message); }
    await t.cerrar();
  }
  console.log(f ? '✗ ' + f + ' fallas' : '✓ G129 OK'); process.exit(f ? 1 : 0);
})();
