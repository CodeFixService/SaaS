/* Centro de Mando · Mensajes de soporte de las 6 apps en una sola bandeja.
   Cada persona escribe desde el 🛟 de su app (núcleo · ayuda.js); aquí ves todas las conversaciones juntas, con la app de
   cada una, y respondes (le llega un aviso). Usa las conexiones de Apps (MisApps). Los avisos de mensajes nuevos llegan
   al tiro por el puente (cfx_aviso_externo). */
(function (global) {
  'use strict';
  const A = global.App, { esc, toast, modal } = A;
  const M = () => global.MisApps;
  let raiz = null;
  const nf = (x) => /Could not find|does not exist|PGRST202/i.test(x.message) ? 'su base aún no tiene el chat (se actualiza sola en máx. 10 min)' : x.message;
  const ROL = { negocio: 'Negocio', cliente: 'Cliente', admin: 'Admin', otro: 'Equipo', usuario: 'Usuario' };
  const corto = (a) => a.nombre.split(' ·')[0];

  async function bandeja() {
    const L = [], avisos = [];
    await Promise.all(M().APPS.filter((a) => (M().estado[a.id] || {}).conectado).map(async (a) => {
      try { (await M().rpcDe(M().cliente(a), 'cfx_chat_bandeja')).forEach((x) => L.push(Object.assign(x, { app: a }))); }
      catch (x) { avisos.push(corto(a) + ': ' + nf(x)); }
    }));
    L.sort((x, y) => (y.sin_leer > 0) - (x.sin_leer > 0) || String(y.ultimo).localeCompare(String(x.ultimo)));
    return { L, avisos };
  }
  // Para el Resumen y la campana: cuántos mensajes sin leer hay en total.
  async function sinLeer() {
    await M().preparar();
    const { L } = await bandeja();
    return L.reduce((n, x) => n + (+x.sin_leer || 0), 0);
  }

  function hilo(x) {
    const c = M().cliente(x.app);
    const d = modal('<div class="fila"><h2 class="grow" style="margin:0">' + esc(x.nombre || x.email) + '</h2><button class="small ghost" data-cerrar type="button">Cerrar</button></div>' +
      '<p class="sub">' + esc(corto(x.app)) + ' · ' + esc(ROL[x.rol] || x.rol || '') + ' · ' + esc(x.email) + '</p>' +
      '<div data-m style="max-height:52vh;overflow:auto;display:flex;flex-direction:column;gap:6px;padding:6px 0"><p class="sub">Cargando…</p></div>' +
      '<label>Tu respuesta<textarea data-t maxlength="1000" rows="3" placeholder="Escribe la respuesta…"></textarea></label>' +
      '<div class="btns"><button type="button" data-r>Responder</button></div>');
    const caja = d.querySelector('[data-m]');
    async function cargar() {
      try {
        const m = await M().rpcDe(c, 'cfx_chat_hilo', { p_cuenta: x.cuenta });
        caja.innerHTML = m.map((y) => '<div style="max-width:85%;padding:8px 11px;border-radius:14px;white-space:pre-wrap;word-break:break-word;' +
          (y.de === 'soporte' ? 'align-self:flex-end;background:var(--brand);color:#fff' : 'align-self:flex-start;background:var(--card2,rgba(127,127,127,.15))') + '">' + esc(y.texto) +
          '<small style="display:block;opacity:.7;font-size:11px">' + esc(A.hace(y.creado)) + '</small></div>').join('') || '<p class="sub">Sin mensajes</p>';
        caja.scrollTop = caja.scrollHeight;
      } catch (e) { caja.innerHTML = '<p class="err">' + esc(nf(e)) + '</p>'; }
    }
    d.querySelector('[data-r]').onclick = async (ev) => {
      const t = d.querySelector('[data-t]').value.trim(); if (!t) return toast('Escribe la respuesta');
      ev.target.disabled = true;
      try { await M().rpcDe(c, 'cfx_chat_responder', { p_cuenta: x.cuenta, p_texto: t }); d.querySelector('[data-t]').value = ''; await cargar(); toast('Respuesta enviada'); }
      catch (e) { toast(nf(e)); }
      ev.target.disabled = false;
    };
    d.addEventListener('close', () => { if (raiz && raiz.isConnected) render(raiz); });
    cargar();
  }

  async function render(el) {
    raiz = el;
    el.innerHTML = '<div class="titulo-v"><h2>Mensajes</h2><span class="sub">Soporte de las 6 apps</span></div><p class="sub">Cargando…</p>';
    await M().preparar();
    const sin = M().APPS.filter((a) => !(M().estado[a.id] || {}).conectado);
    const { L, avisos } = await bandeja();
    const n = L.reduce((s, x) => s + (+x.sin_leer || 0), 0);
    el.innerHTML = '<div class="titulo-v"><h2>Mensajes</h2><span class="sub">' + (n ? n + ' sin leer' : 'Todo leído') + '</span></div>' +
      '<p class="sub">Lo que te escriben desde el botón 🛟 de cada app. Te llega un aviso apenas escriben.</p>' +
      (sin.length ? '<div class="card"><p class="sub">Para ver sus mensajes, conecta: ' + sin.map((a) => '<button type="button" class="small ghost" data-con="' + a.id + '">' + esc(corto(a)) + '</button>').join(' ') + '</p></div>' : '') +
      avisos.map((t) => '<p class="sub warn">' + esc(t) + '</p>').join('') +
      (L.map((x, i) => '<button type="button" class="card" data-i="' + i + '" style="display:block;width:100%;text-align:left">' +
        '<div class="fila"><span class="pill info">' + esc(corto(x.app)) + '</span><span class="tit grow">' + esc(x.nombre || x.email) + '</span>' +
        (+x.sin_leer ? '<span class="pill bad">' + x.sin_leer + '</span>' : '') + '</div>' +
        '<p class="sub" style="margin:4px 0 0">' + (x.de === 'soporte' ? 'Tú: ' : '') + esc(String(x.texto || '').slice(0, 90)) + ' · ' + esc(A.hace(x.ultimo)) + '</p></button>').join('') ||
        '<p class="empty">Sin mensajes todavía 🎉</p>');
    el.onclick = (ev) => {
      const b = ev.target.closest('[data-i],[data-con]'); if (!b) return;
      if (b.dataset.con) return M().conectar(M().APPS.find((a) => a.id === b.dataset.con), () => render(el));
      hilo(L[+b.dataset.i]);
    };
  }
  global.MensajesCentral = { render, sinLeer };
})(window);
