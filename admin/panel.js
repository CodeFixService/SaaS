/* Centro de Mando · G34 🧭 Panel universal: el panel de administrador de cada app vive aquí (CM → Apps → 🧭 Panel).
   Cada app registra sus secciones con PanelApps.registrar(id, (ctx) => [...]) y se abren en la cuadrícula del núcleo (CFX_AJUSTES).
   ctx.rpc llama a la base de ESA app con la sesión de administrador que se conectó en Apps. Todas las apps traen "📲 Link y QR". */
(function (global) {
  'use strict';
  const A = global.App, { esc, toast, modal, confirmar } = A;
  const P = {};
  const fecha = (t) => t ? new Date(t).toLocaleDateString('es-CL') : '—';
  const fechaHora = (t) => t ? new Date(t).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' }) : '—';
  const dias = (t) => t ? Math.floor((Date.now() - new Date(t)) / 864e5) : null;
  const hace = (t) => { if (!t) return 'nunca'; const m = Math.max(0, Math.round((Date.now() - new Date(t)) / 6e4)); return m < 60 ? 'hace ' + m + ' min' : m < 1440 ? 'hace ' + Math.round(m / 60) + ' h' : 'hace ' + Math.floor(m / 1440) + ' d'; };
  const plata = (n) => '$' + Math.round(+n || 0).toLocaleString('es-CL');
  const item = (t, v) => '<div class="card"><b>' + v + '</b><span>' + esc(t) + '</span></div>';
  const vacio = (t) => '<p class="empty">' + esc(t) + '</p>';
  const fallo = (z, e) => { if (z) z.innerHTML = '<p class="sub warn">⚠️ ' + esc(e.message || e) + '</p>'; };

  // Texto libre en un diálogo (devuelve null si se cancela).
  function pedir(titulo, o) {
    o = o || {};
    return new Promise((ok) => {
      const campo = o.largo ? '<textarea id="pd" rows="6" maxlength="' + (o.max || 1000) + '">' + esc(o.valor || '') + '</textarea>' : '<input id="pd" maxlength="' + (o.max || 200) + '" value="' + esc(o.valor || '') + '"' + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + '>';
      const d = modal('<h2>' + esc(titulo) + '</h2>' + (o.texto ? '<p class="sub">' + esc(o.texto) + '</p>' : '') + '<label>' + esc(o.label || '') + campo + '</label>' +
        '<div class="btns"><button class="ghost" data-cerrar type="button">Cancelar</button><button id="pdOk" type="button">' + esc(o.si || 'Listo') + '</button></div>');
      let r = null;
      d.querySelector('#pdOk').onclick = () => { r = d.querySelector('#pd').value; d.close(); };
      d.addEventListener('close', () => ok(r));
      d.querySelector('#pd').focus();
    });
  }

  // QR (núcleo shared/vendor/qrcode.js, se carga al primer uso).
  let qrLib = null;
  const cargarQR = () => qrLib || (qrLib = global.qrcode ? Promise.resolve() : new Promise((ok, no) => { const s = document.createElement('script'); s.src = A.ROOT + 'shared/vendor/qrcode.js'; s.onload = ok; s.onerror = () => { qrLib = null; no(new Error('No se pudo cargar el QR')); }; document.head.appendChild(s); }));
  async function qrCanvas(texto, px) {
    await cargarQR();
    const q = global.qrcode(0, 'M'); q.addData(texto); q.make();
    const n = q.getModuleCount(), m = 4, c = document.createElement('canvas'), k = Math.max(1, Math.floor(px / (n + 2 * m)));
    c.width = c.height = k * (n + 2 * m);
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#000';
    for (let r = 0; r < n; r++) for (let j = 0; j < n; j++) if (q.isDark(r, j)) g.fillRect((j + m) * k, (r + m) * k, k, k);
    return c;
  }
  // Tarjeta "link + QR": compartir, copiar, ver y descargar el QR listo para imprimir.
  function tarjetaLink(z, o) {
    const id = 'lq' + Math.random().toString(36).slice(2, 7);
    z.insertAdjacentHTML('beforeend', '<div class="card"><h2>' + esc(o.titulo) + '</h2><p class="sub">' + esc(o.texto) + '</p>' +
      '<input readonly value="' + esc(o.link) + '" aria-label="Link" id="' + id + 'L">' +
      '<div class="btns"><button type="button" class="small" data-x="sh">📤 Compartir</button><button type="button" class="small ghost" data-x="cp">📋 Copiar</button>' +
      '<a class="btn small ghost" target="_blank" rel="noopener" href="' + esc(o.link) + '">👁️ Ver</a><button type="button" class="small ghost" data-x="dl">⬇️ Descargar QR</button></div>' +
      '<div style="text-align:center;margin-top:10px"><img id="' + id + 'Q" alt="QR de ' + esc(o.titulo) + '" style="width:200px;max-width:100%;background:#fff;border-radius:12px;padding:6px"></div></div>');
    const card = z.querySelector('#' + id + 'L').closest('.card');
    qrCanvas(o.link, 440).then((c) => { card.querySelector('#' + id + 'Q').src = c.toDataURL(); }).catch((e) => toast(e.message));
    card.onclick = async (ev) => {
      const b = ev.target.closest('[data-x]'); if (!b) return;
      if (b.dataset.x === 'cp') { try { await navigator.clipboard.writeText(o.link); toast('📋 Link copiado'); } catch (e) { toast(o.link); } }
      if (b.dataset.x === 'dl') (await qrCanvas(o.link, 1200)).toBlob((bl) => { const u = URL.createObjectURL(bl), x = document.createElement('a'); x.href = u; x.download = (o.archivo || 'qr') + '.png'; x.click(); setTimeout(() => URL.revokeObjectURL(u), 2000); });
      if (b.dataset.x === 'sh') { const t = (o.mensaje || o.titulo) + ': ' + o.link; if (navigator.share) { try { await navigator.share({ title: o.titulo, text: t }); } catch (e) { /* cancelado */ } } else global.open('https://wa.me/?text=' + encodeURIComponent(t), '_blank', 'noopener'); }
    };
  }
  const seccionLink = (ctx) => ({ k: 'link', ico: '📲', t: 'Link y QR de la app', d: 'Para compartir o imprimir', abrir: (z) => {
    z.innerHTML = '';
    tarjetaLink(z, { titulo: '📲 ' + ctx.a.nombre.split(' ·')[0], texto: 'Link para instalar la app. El QR abre la misma dirección (sirve para afiches y redes).', link: ctx.a.web, archivo: 'qr-' + ctx.a.id, mensaje: 'Instala ' + ctx.a.nombre.split(' ·')[0] });
  } });

  function registrar(id, f) { P[id] = f; }
  const tiene = (id) => !!P[id];
  // Abre el panel de la app dentro de la vista (el) con "← Apps" para volver.
  function abrir(a, c, el, volver) {
    const rpc = async (fn, args) => { const { data, error } = await c.rpc(fn, args || {}); if (error) throw new Error(error.message); return data; };
    const ctx = { a, c, rpc, enviar: () => { try { c.functions.invoke('enviar').catch(() => {}); } catch (e) { /* sin función */ } }, esc, toast, modal, confirmar, pedir, fecha, fechaHora, dias, hace, plata, item, vacio, fallo, tarjetaLink, qrCanvas };
    const L = (P[a.id] ? P[a.id](ctx) : []).concat([seccionLink(ctx)]);
    el.innerHTML = '<div class="titulo-v"><button type="button" class="small ghost" id="pnVolver">← Apps</button><h2 class="grow" style="margin:0 0 0 8px">🧭 ' + esc(a.nombre.split(' ·')[0]) + '</h2></div><div id="pnZ"></div>';
    el.querySelector('#pnVolver').onclick = volver;
    const nota = P[a.id] ? '<p class="sub">Panel de administrador de esta app. Los cambios se guardan en su base al tiro.</p>'
      : '<p class="sub">Esta app todavía tiene su panel propio (llega aquí en su turno). Ábrelo en Resumen → Empresas → Panel de la app.</p>';
    global.CFX_AJUSTES.montar(el.querySelector('#pnZ'), L, { arriba: nota });
  }
  global.PanelApps = { registrar, tiene, abrir, qrCanvas };
})(window);
