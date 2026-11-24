/* Centro de Mando · Mensajes de soporte de las 7 apps en una sola bandeja.
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
    return L.reduce((n, x) => n + (+x.sin_leer || 0), 0) + (await fallas()).filter((x) => x.estado === 'nuevo' || x.estado === 'listo').length;
  }

  // ---------- G55 🐞 Fallas reportadas (Más → Cuenta y ayuda → 🐞 Reportar una falla, en cada app) ----------
  // G155 🔧 listo = Claude la arregló (nota en arreglo); solo Josué la cierra (✅ Revisada) o la devuelve (↩️ Sigue fallando).
  const EST = { nuevo: ['Nuevo', 'bad'], revisando: ['Revisando', 'warn'], listo: ['🔧 Lista para revisar', 'info'], real: ['✅ Revisada', 'ok'], no: ['❌ No es falla', ''] };
  let verTodas = false;
  async function fallas() {
    const L = [];
    await Promise.all(M().APPS.filter((a) => (M().estado[a.id] || {}).conectado).map(async (a) => {
      try { (await M().rpcDe(M().cliente(a), 'cfx_fallas_lista', { p_estado: verTodas ? 'todos' : 'abiertos' })).forEach((x) => L.push(Object.assign(x, { app: a }))); }
      catch (x) { /* base sin G55: se actualiza sola en máx. 10 min */ }
    }));
    const peso = (e) => e === 'nuevo' ? 2 : e === 'listo' ? 1 : 0;
    L.sort((x, y) => peso(y.estado) - peso(x.estado) || String(y.creado).localeCompare(String(x.creado)));
    return L;
  }
  function falla(x) {
    const c = M().cliente(x.app), dt = x.datos || {}, neg = x.rol === 'negocio', abierta = x.estado === 'nuevo' || x.estado === 'revisando' || x.estado === 'listo', lista = x.estado === 'listo';
    const fila = (k, v) => v ? '<tr><td class="sub" style="padding:2px 8px 2px 0;vertical-align:top;white-space:nowrap">' + k + '</td><td style="word-break:break-word">' + esc(v) + '</td></tr>' : '';
    const errs = Array.isArray(dt.errores) ? dt.errores : [];
    const d = modal('<div class="fila"><h2 class="grow" style="margin:0">🐞 Falla #' + esc(x.id) + '</h2><button class="small ghost" data-cerrar type="button">Cerrar</button></div>' +
      '<p class="sub">' + esc(corto(x.app)) + ' · ' + esc(ROL[x.rol] || x.rol || '') + ' · ' + esc(x.nombre || '') + ' ' + esc(x.email) + ' · ' + esc(A.hace(x.creado)) + '</p>' +
      '<p style="white-space:pre-wrap;word-break:break-word;background:var(--card2,rgba(127,127,127,.12));padding:10px 12px;border-radius:12px">' + esc(x.texto) + '</p>' +
      (x.con_foto ? '<div data-foto><p class="sub">Cargando foto…</p></div>' : '') +
      '<table style="font-size:13px;border-collapse:collapse;margin:6px 0">' + fila('Versión', dt.version) + fila('Pantalla', dt.pantalla) + fila('Recorrido', (dt.recorrido || []).join(' → ')) +
        fila('Celular', dt.celular) + fila('Tamaño', dt.tamano ? dt.tamano + (dt.oscuro ? ' · oscuro' : '') + (dt.instalada ? ' · instalada' : '') : '') + '</table>' +
      (errs.length ? '<details><summary>⚠️ ' + errs.length + ' error(es) de esa sesión</summary>' + errs.map((e) => '<p class="sub" style="margin:4px 0;word-break:break-word">' + esc(e.m) + ' · ' + esc(e.d || '') + ' · ' + esc(e.p || '') + '</p>').join('') + '</details>' : '<p class="sub">Sin errores registrados en esa sesión.</p>') +
      (x.arreglo ? '<div style="background:var(--card2,rgba(127,127,127,.12));padding:8px 12px;border-radius:12px;margin:6px 0"><p class="sub" style="margin:0 0 4px">' + (lista ? '🔧 Claude la dejó lista. Pruébala y márcala ✅ Revisada o ↩️ Sigue fallando.' : '🔧 Arreglos') + '</p>' +
        '<p style="margin:0;white-space:pre-wrap;word-break:break-word;font-size:14px">' + esc(x.arreglo) + '</p></div>' : '') +
      (+x.premiados ? '<p class="sub warn">Esta cuenta ya recibió ' + x.premiados + ' premio(s) por reportes.</p>' : '') +
      (abierta ? '<label>' + (lista ? 'Mensaje (para la persona; o para Claude si sigue fallando)' : 'Mensaje para la persona (opcional)') + '<textarea data-t maxlength="500" rows="2" placeholder="Si lo dejas vacío va un mensaje amable"></textarea></label>' +
        '<div class="btns"><button type="button" class="ghost" data-no>❌ No es falla</button>' + (lista ? '<button type="button" class="ghost" data-re>↩️ Sigue fallando</button>' : '') +
        '<button type="button" data-si>' + (lista ? '✅ Revisada' + (neg ? ': regalar 15 días' : '') : neg ? '🎁 Es real: regalar 15 días' : '🙌 Es real: dar las gracias') + '</button></div>' +
        (neg ? '' : '<p class="sub">Clientes y equipo no pagan: les llega solo el agradecimiento.</p>')
        : '<p class="sub">Respondido: ' + esc((EST[x.estado] || [x.estado])[0]) + (x.dias ? ' · 🎁 +' + x.dias + ' días Premium' : '') + (x.respuesta ? ' · “' + esc(x.respuesta) + '”' : '') + '</p>') +
      '<p class="err" data-e></p>');
    if (x.con_foto) M().rpcDe(c, 'cfx_falla_ver', { p_id: x.id }).then((r) => { const z = d.querySelector('[data-foto]'); if (z) z.innerHTML = r && r.foto ? '<img src="' + esc(r.foto) + '" alt="Foto del reporte" style="max-width:100%;max-height:50vh;border-radius:12px">' : ''; }).catch(() => {});
    else if (x.estado === 'nuevo') M().rpcDe(c, 'cfx_falla_ver', { p_id: x.id }).catch(() => {});
    const responder = async (real, b) => {
      if (!real && window.CFX_DIALOGO && !(await CFX_DIALOGO.confirmar('¿Responder que no es falla?', { si: 'Responder' }))) return;
      if (real && neg && window.CFX_DIALOGO && !(await CFX_DIALOGO.confirmar('¿Regalar 15 días de Premium a ' + (x.nombre || x.email) + ' en ' + corto(x.app) + '?', { si: 'Regalar' }))) return;
      b.disabled = true; d.querySelector('[data-e]').textContent = '';
      try {
        const r = await M().rpcDe(c, 'cfx_falla_resolver', { p_id: x.id, p_real: real, p_mensaje: d.querySelector('[data-t]').value.trim(), p_dias: 15 });
        toast(real ? (r && r.dias ? '🎁 +' + r.dias + ' días Premium regalados' : '🙌 Gracias enviadas') : 'Respuesta enviada'); d.close();
      } catch (e) { d.querySelector('[data-e]').textContent = nf(e); b.disabled = false; }
    };
    const reabrir = async (b) => {
      b.disabled = true; d.querySelector('[data-e]').textContent = '';
      try { await M().rpcDe(c, 'cfx_falla_reabrir', { p_id: x.id, p_nota: d.querySelector('[data-t]').value.trim() }); toast('↩️ Devuelta a Claude'); d.close(); }
      catch (e) { d.querySelector('[data-e]').textContent = nf(e); b.disabled = false; }
    };
    if (lista) d.querySelector('[data-re]').onclick = (ev) => reabrir(ev.target);
    if (abierta) { d.querySelector('[data-si]').onclick = (ev) => responder(true, ev.target); d.querySelector('[data-no]').onclick = (ev) => responder(false, ev.target); }
    d.addEventListener('close', () => { if (raiz && raiz.isConnected) render(raiz); });
  }

  // ---------- G155 🔧 Túnel para Claude: una llave para ver las fallas y marcarlas 🔧 Lista (nada más) ----------
  async function tunel() {
    const apps = M().APPS.filter((a) => (M().estado[a.id] || {}).conectado);
    const d = modal('<div class="fila"><h2 class="grow" style="margin:0">🔧 Túnel para Claude</h2><button class="small ghost" data-cerrar type="button">Cerrar</button></div>' +
      '<p class="sub">Con esta llave Claude ve las fallas (sin correo ni nombre) y las marca 🔧 Lista para revisar. No puede responder, premiar ni cerrar: eso lo haces tú.</p>' +
      '<div data-est><p class="sub">Cargando…</p></div><div data-llave></div>' +
      '<div class="btns"><button type="button" class="ghost" data-x>🚫 Cerrar túnel</button><button type="button" data-n>🔑 Crear llave nueva</button></div><p class="err" data-e></p>');
    const est = async () => {
      const filas = await Promise.all(apps.map(async (a) => {
        try { const t = await M().rpcDe(M().cliente(a), 'cfx_tunel_estado'); return '<p class="sub" style="margin:2px 0">' + esc(corto(a)) + ': ' + (t && t.activo ? '🟢 abierto' + (t.usado ? ' · usado ' + esc(A.hace(t.usado)) : ' · sin usar') : '⚪ cerrado') + '</p>'; }
        catch (e) { return '<p class="sub" style="margin:2px 0">' + esc(corto(a)) + ': ⏳ falta ⬆️ Actualizar base</p>'; }
      }));
      d.querySelector('[data-est]').innerHTML = filas.join('') || '<p class="sub">Conecta las apps primero (Apps).</p>';
    };
    const fijar = async (hash) => {
      const mal = [];
      await Promise.all(apps.map(async (a) => { try { await M().rpcDe(M().cliente(a), 'cfx_tunel_fijar', { p_hash: hash }); } catch (e) { mal.push(corto(a)); } }));
      return mal;
    };
    d.querySelector('[data-n]').onclick = async (ev) => {
      if (window.CFX_DIALOGO && !(await CFX_DIALOGO.confirmar('¿Crear una llave nueva? La anterior deja de servir.', { si: 'Crear' }))) return;
      ev.target.disabled = true; d.querySelector('[data-e]').textContent = '';
      const b = crypto.getRandomValues(new Uint8Array(32)), k = 'cfx_' + Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
      const h = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(k))), (x) => x.toString(16).padStart(2, '0')).join('');
      const mal = await fijar(h);
      d.querySelector('[data-llave]').innerHTML = '<div class="card"><p class="sub" style="margin:0 0 6px">Se muestra solo esta vez. Cópiala y pégala en el formulario que te abre Claude (uno por app), nunca en el chat.</p>' +
        '<p style="word-break:break-all;font-family:monospace;font-size:13px;margin:0 0 8px" data-k>' + esc(k) + '</p><button type="button" class="small" data-cop>📋 Copiar llave</button></div>' +
        (mal.length ? '<p class="sub warn">No se pudo en: ' + esc(mal.join(', ')) + ' (⬆️ Actualizar base y vuelve a crear).</p>' : '');
      d.querySelector('[data-cop]').onclick = async () => { try { await navigator.clipboard.writeText(k); toast('📋 Llave copiada'); } catch (x) { toast('Mantén apretada la llave para copiarla'); } };
      ev.target.disabled = false; est();
    };
    d.querySelector('[data-x]').onclick = async (ev) => {
      if (window.CFX_DIALOGO && !(await CFX_DIALOGO.confirmar('¿Cerrar el túnel? Claude deja de ver las fallas.', { si: 'Cerrar túnel' }))) return;
      ev.target.disabled = true; const mal = await fijar(null); d.querySelector('[data-llave]').innerHTML = '';
      toast(mal.length ? 'No se pudo en: ' + mal.join(', ') : '🚫 Túnel cerrado'); ev.target.disabled = false; est();
    };
    est();
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
    el.innerHTML = '<div class="titulo-v"><h2>Mensajes</h2><span class="sub">Soporte de las 7 apps</span></div><p class="sub">Cargando…</p>';
    await M().preparar();
    const sin = M().APPS.filter((a) => !(M().estado[a.id] || {}).conectado);
    const [{ L, avisos }, F] = await Promise.all([bandeja(), fallas()]);
    const fn = F.filter((x) => x.estado === 'nuevo').length, fl = F.filter((x) => x.estado === 'listo').length;
    const n = L.reduce((s, x) => s + (+x.sin_leer || 0), 0);
    el.innerHTML = '<div class="titulo-v"><h2>Mensajes</h2><span class="sub">' + (n ? n + ' sin leer' : 'Todo leído') + '</span></div>' +
      '<p class="sub">Lo que te escriben desde el botón 🛟 de cada app. Te llega un aviso apenas escriben.</p>' +
      (sin.length ? '<div class="card"><p class="sub" style="margin:0 0 10px">Para ver sus mensajes, conecta:</p><div class="apps-con" style="display:flex;flex-wrap:wrap;gap:8px">' + sin.map((a) => '<button type="button" class="small ghost" data-con="' + a.id + '">' + esc(corto(a)) + '</button>').join('') + '</div></div>' : '') +
      avisos.map((t) => '<p class="sub warn">' + esc(t) + '</p>').join('') +
      '<div class="card"><div class="fila"><h3 class="grow" style="margin:0">🐞 Fallas reportadas</h3>' + (fn ? '<span class="pill bad">' + fn + ' nuevas</span>' : '') + (fl ? ' <span class="pill info">' + fl + ' 🔧 por revisar</span>' : '') + '</div>' +
        '<p class="sub" style="margin:4px 0 8px">Las envían desde Más → Cuenta y ayuda → 🐞 Reportar una falla. Si es real, regálale 15 días Premium.</p>' +
        (F.map((x, i) => '<button type="button" class="card" data-f="' + i + '" style="display:block;width:100%;text-align:left;margin:6px 0">' +
          '<div class="fila"><span class="pill info">' + esc(corto(x.app)) + '</span><span class="tit grow">' + esc(x.nombre || x.email) + '</span><span class="pill ' + ((EST[x.estado] || [])[1] || '') + '">' + esc((EST[x.estado] || [x.estado])[0]) + '</span></div>' +
          '<p class="sub" style="margin:4px 0 0">' + (x.con_foto ? '📷 ' : '') + esc(String(x.texto || '').slice(0, 90)) + ' · ' + esc(A.hace(x.creado)) + '</p></button>').join('') ||
          '<p class="empty" style="margin:4px 0">' + (verTodas ? 'Sin reportes todavía' : 'Ninguna falla por revisar 🎉') + '</p>') +
        '<button type="button" class="small ghost" data-todas>' + (verTodas ? 'Ver solo las por revisar' : 'Ver también las respondidas') + '</button> <button type="button" class="small ghost" data-tunel>🔧 Túnel para Claude</button></div>' +
      '<h3 style="margin:14px 0 6px">💬 Conversaciones</h3>' +
      (L.map((x, i) => '<button type="button" class="card" data-i="' + i + '" style="display:block;width:100%;text-align:left">' +
        '<div class="fila"><span class="pill info">' + esc(corto(x.app)) + '</span><span class="tit grow">' + esc(x.nombre || x.email) + '</span>' +
        (+x.sin_leer ? '<span class="pill bad">' + x.sin_leer + '</span>' : '') + '</div>' +
        '<p class="sub" style="margin:4px 0 0">' + (x.de === 'soporte' ? 'Tú: ' : '') + esc(String(x.texto || '').slice(0, 90)) + ' · ' + esc(A.hace(x.ultimo)) + '</p></button>').join('') ||
        '<p class="empty">Sin mensajes todavía 🎉</p>');
    el.onclick = (ev) => {
      const b = ev.target.closest('[data-i],[data-con],[data-f],[data-todas],[data-tunel]'); if (!b) return;
      if (b.hasAttribute('data-tunel')) return tunel();
      if (b.dataset.f) return falla(F[+b.dataset.f]);
      if (b.hasAttribute('data-todas')) { verTodas = !verTodas; return render(el); }
      if (b.dataset.con) return M().conectar(M().APPS.find((a) => a.id === b.dataset.con), () => render(el));
      hilo(L[+b.dataset.i]);
    };
  }
  global.MensajesCentral = { render, sinLeer };
})(window);
