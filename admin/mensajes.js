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

  // ---------- G155 📥 Descargar fallas: un .html (tabla con foto, texto y descripción) para pasárselo a Claude. Sin correo ni nombre; no cambia estados ----------
  async function descargar(F, b) {
    if (!F.length) return toast('No hay fallas para descargar');
    b.disabled = true; const t0 = b.textContent; b.textContent = '⏳ Preparando…';
    try {
      const fotos = {};
      await Promise.all(M().APPS.map(async (a) => {
        const ids = F.filter((x) => x.app === a && x.con_foto).map((x) => x.id); if (!ids.length) return;
        try { Object.assign(fotos, Object.fromEntries(Object.entries(await M().rpcDe(M().cliente(a), 'cfx_fallas_fotos', { p_ids: ids }) || {}).map(([k, v]) => [a.id + ':' + k, v]))); } catch (e) { /* sin bd nueva: va sin foto */ }
      }));
      const fecha = (x) => x ? new Date(x).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' }) : '';
      const filas = F.map((x) => {
        const d = x.datos || {}, errs = Array.isArray(d.errores) ? d.errores : [], ft = fotos[x.app.id + ':' + x.id];
        const desc = [['Versión', d.version], ['Pantalla', d.pantalla], ['Recorrido', (d.recorrido || []).join(' → ')], ['Celular', d.celular],
          ['Tamaño', d.tamano ? d.tamano + (d.oscuro ? ' · oscuro' : '') + (d.instalada ? ' · instalada' : '') : '']].filter((y) => y[1]).map((y) => '<b>' + y[0] + ':</b> ' + esc(y[1])).join('<br>') +
          (errs.length ? '<br><b>Errores:</b><ul>' + errs.map((e) => '<li>' + esc([e.m, e.d, e.p].filter(Boolean).join(' · ')) + '</li>').join('') + '</ul>' : '');
        return '<tr><td data-l="Falla"><b>' + esc(corto(x.app)) + ' #' + esc(x.id) + '</b><br>' + esc((EST[x.estado] || [x.estado])[0]) + '<br>' + esc(fecha(x.creado)) + '<br>' + esc(ROL[x.rol] || x.rol || '') + '</td>' +
          '<td data-l="Texto" class="tx">' + esc(x.texto) + '</td><td data-l="Descripción">' + (desc || '—') + (x.arreglo ? '<p class="ar">' + esc(x.arreglo) + '</p>' : '') + '</td>' +
          '<td data-l="Foto">' + (ft && /^data:image\/(webp|jpeg|png);base64,/.test(ft) ? '<a href="' + ft + '" target="_blank"><img src="' + ft + '" alt="Foto falla ' + esc(x.id) + '"></a>' : x.con_foto ? '(no se pudo bajar)' : '—') + '</td></tr>';
      }).join('');
      const json = JSON.stringify(F.map((x) => ({ app: x.app.id, id: x.id, estado: x.estado, rol: x.rol, texto: x.texto, datos: x.datos, arreglo: x.arreglo || '', con_foto: !!x.con_foto, creado: x.creado }))).replace(/</g, '\\u003c');
      const hoy = new Date().toISOString().slice(0, 10);
      const html = '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Fallas ' + hoy + '</title><style>' +
        'body{font:15px/1.4 system-ui,sans-serif;margin:16px;color:#1b1f24;background:#fff}h1{font-size:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccd;padding:8px;vertical-align:top;text-align:left}' +
        'th{background:#eef1f6}.tx{white-space:pre-wrap;word-break:break-word}td{word-break:break-word}img{max-width:220px;max-height:360px;border-radius:8px}ul{margin:4px 0;padding-left:18px}.ar{white-space:pre-wrap;background:#eef6ff;padding:6px;border-radius:6px}' +
        '@media(max-width:700px){thead{display:none}tr{display:block;border:1px solid #ccd;border-radius:10px;margin:0 0 12px;padding:4px}td{display:block;border:0;border-bottom:1px solid #eee}td::before{content:attr(data-l);display:block;font-size:12px;color:#667}img{max-width:100%}}' +
        '@media(prefers-color-scheme:dark){body{background:#111418;color:#e6e9ee}th{background:#1d232b}th,td,tr{border-color:#333b46}.ar{background:#16263a}}</style></head><body>' +
        '<h1>🐞 Fallas · ' + esc(hoy) + ' · ' + F.length + '</h1><p>Para Claude: arreglar y avisar. Se marcan en CM → Mensajes → 🐞 Fallas.</p>' +
        '<table><thead><tr><th>Falla</th><th>Texto</th><th>Descripción</th><th>Foto</th></tr></thead><tbody>' + filas + '</tbody></table>' +
        '<script type="application/json" id="fallas">' + json + '</scr' + 'ipt></body></html>';
      const u = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' })), l = document.createElement('a');
      l.href = u; l.download = 'fallas-' + hoy + '.html'; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
      toast('📥 ' + F.length + ' falla(s) descargadas: pásale el archivo a Claude');
    } catch (e) { toast(nf(e)); }
    b.disabled = false; b.textContent = t0;
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
      '<h3 style="margin:6px 0 6px">💬 Conversaciones</h3>' +
      (L.length ? '<div data-fx-chats></div><div class="cfx-fa-lista" data-l-chats>' + L.map((x, i) => '<button type="button" class="cfx-fa" data-i="' + i + '" data-cfx-app="' + esc(x.app.id) + '" data-cfx-app-t="' + esc(corto(x.app)) + '"' +
        ' data-cfx-leido="' + (+x.sin_leer ? 'no' : 'si') + '" data-cfx-fecha="' + esc(x.ultimo) + '" data-cfx-nombre="' + esc(x.nombre || x.email || '') + '" data-cfx-buscar="' + esc(x.email || '') + '">' +
        '<span class="cfx-fa-top"><span class="pill info">' + esc(corto(x.app)) + '</span>' + (+x.sin_leer ? '<span class="pill bad">' + x.sin_leer + ' sin leer</span>' : '') + '<span class="cfx-fa-hace">' + esc(A.hace(x.ultimo)) + '</span></span>' +
        '<span class="cfx-fa-nom">' + esc(x.nombre || x.email || 'Sin nombre') + '</span>' +
        '<span class="cfx-fa-txt">' + (x.de === 'soporte' ? 'Tú: ' : '') + esc(String(x.texto || '').slice(0, 220)) + '</span></button>').join('') + '</div>' :
        '<p class="empty">Sin mensajes todavía 🎉</p>') +
      '<div class="card" style="margin-top:14px"><div class="cfx-fa-cab"><h3>🐞 Fallas reportadas</h3>' + (fn ? '<span class="pill bad">' + fn + (fn === 1 ? ' nueva' : ' nuevas') + '</span>' : '') + (fl ? ' <span class="pill info">' + fl + ' 🔧 por revisar</span>' : '') + '</div>' +
        '<p class="sub" style="margin:4px 0 8px">Las envían desde Más → Cuenta y ayuda → 🐞 Reportar una falla. Si es real, regálale 15 días Premium.</p>' +
        (F.length ? '<div data-fx-fallas></div><div class="cfx-fa-lista" data-l-fallas>' + F.map((x, i) => {
          const es = EST[x.estado] || [x.estado, ''];
          return '<button type="button" class="cfx-fa" data-f="' + i + '" data-cfx-app="' + esc(x.app.id) + '" data-cfx-app-t="' + esc(corto(x.app)) + '" data-cfx-estado="' + esc(x.estado) + '" data-cfx-estado-t="' + esc(es[0]) + '"' +
            ' data-cfx-fecha="' + esc(x.creado) + '" data-cfx-nombre="' + esc(x.nombre || x.email || '') + '" data-cfx-buscar="' + esc((x.email || '') + ' #' + x.id) + '">' +
            '<span class="cfx-fa-top"><span class="pill info">' + esc(corto(x.app)) + '</span><span class="pill ' + esc(es[1]) + '">' + esc(es[0]) + '</span><span class="cfx-fa-hace">' + esc(A.hace(x.creado)) + '</span></span>' +
            '<span class="cfx-fa-nom">' + esc(x.nombre || x.email || 'Sin nombre') + '</span>' +
            '<span class="cfx-fa-txt">' + (x.con_foto ? '📷 ' : '') + esc(String(x.texto || '').slice(0, 220)) + '</span></button>';
        }).join('') + '</div>' :
          '<p class="empty" style="margin:4px 0">' + (verTodas ? 'Sin reportes todavía' : 'Ninguna falla por revisar 🎉') + '</p>') +
        '<div class="btns">' +
        '<button type="button" class="small ghost" data-todas>' + (verTodas ? 'Ver solo las por revisar' : 'Ver también las respondidas') + '</button> <button type="button" class="small ghost" data-tunel>🔧 Túnel para Claude</button>' +
        (F.length ? ' <button type="button" class="small" data-bajar>📥 Descargar fallas (' + F.length + ')</button>' : '') + '</div></div>';
    if (window.CFX_FILTRO) {
      if (F.length) CFX_FILTRO.montar(el.querySelector('[data-fx-fallas]'), { en: el.querySelector('[data-l-fallas]'), buscar: 'Buscar falla…', clave: 'cm-fallas',
        grupos: [{ k: 'app', t: 'App' }, { k: 'estado', t: 'Estado' }], fecha: true, orden: true, vacio: 'Ninguna falla coincide' });
      if (L.length) CFX_FILTRO.montar(el.querySelector('[data-fx-chats]'), { en: el.querySelector('[data-l-chats]'), buscar: 'Buscar conversación', clave: 'cm-chats',
        grupos: [{ k: 'app', t: 'App' }, { k: 'leido', t: 'Estado', op: [['no', 'Sin leer'], ['si', 'Leídas']] }], fecha: true, orden: true, vacio: 'Ninguna conversación coincide' });
    }
    el.onclick = (ev) => {
      const b = ev.target.closest('[data-i],[data-con],[data-f],[data-todas],[data-tunel],[data-bajar]'); if (!b) return;
      if (b.hasAttribute('data-bajar')) return descargar(F, b);
      if (b.hasAttribute('data-tunel')) return tunel();
      if (b.dataset.f) return falla(F[+b.dataset.f]);
      if (b.hasAttribute('data-todas')) { verTodas = !verTodas; return render(el); }
      if (b.dataset.con) return M().conectar(M().APPS.find((a) => a.id === b.dataset.con), () => render(el));
      hilo(L[+b.dataset.i]);
    };
  }
  global.MensajesCentral = { render, sinLeer };
})(window);
