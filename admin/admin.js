/* Centro de Mando · Panel de administración (admin = todo; socio = todo, pero cada cambio pide motivo y queda en el registro). */
(async function () {
  'use strict';
  const { $, esc, rpc, toast, modal, confirmar } = App;
  App.registrarSW();
  const yo = await App.requerir(['admin', 'socio']);
  const SUPER = yo.rol === 'admin';
  let pub = await App.cargarPublica();
  const MB = (b) => b < 1048576 ? Math.round(b / 1024) + ' KB' : (b / 1048576).toFixed(1).replace('.', ',') + ' MB';
  const el = (v) => $('v-' + v);
  const err = (e) => toast(e.message || String(e));

  // El socio siempre explica por qué; el administrador puede omitirlo.
  function motivo(titulo) {
    return new Promise((ok) => {
      const d = modal('<h2>' + esc(titulo) + '</h2><label>' + (SUPER ? 'Motivo (opcional)' : 'Motivo (obligatorio)') + '<input id="mo" maxlength="200" placeholder="¿Por qué?"></label><div class="btns"><button class="ghost" data-cerrar type="button">Cancelar</button><button id="mok" type="button">Confirmar</button></div>');
      let res = null;
      d.querySelector('#mok').onclick = () => { const v = d.querySelector('#mo').value.trim(); if (!SUPER && v.length < 4) return toast('Escribe el motivo'); res = v; d.close(); };
      d.addEventListener('close', () => ok(res));
      d.querySelector('#mo').focus();
    });
  }
  const show = App.pestanas((v) => ({ resumen, usuarios, pagos, planes, ajustes, registro, versiones, apps: () => window.MisApps.render(el('apps')) }[v] || (() => {}))());
  App.ponerIconos(); App.campana($('bCampana'));

  async function resumen() {
    el('resumen').innerHTML = '<p class="sub">Cargando…</p>';
    try {
      const [r, u] = await Promise.all([rpc('admin_resumen'), rpc('admin_uso')]);
      const pc = Math.min(100, Math.round(u.db_bytes / u.limite_bytes * 100));
      el('resumen').innerHTML = '<div class="titulo-v"><h2>Resumen</h2><span class="sub">' + (SUPER ? 'Administrador' : 'Socio') + '</span></div><div class="stats">' +
        [['Usuarios', r.usuarios], ['Activos 7 d', r.activos7], ['Nuevos 7 d', r.nuevos7], ['Pro', r.pro], ['En prueba', r.prueba], ['Pagos por revisar', r.pagos_pendientes], ['Ingresos del mes', '$' + Number(r.ingresos_mes).toLocaleString('es-CL')], ['Socios', r.socios]].map((x) => '<div class="card"><b>' + x[1] + '</b><span>' + x[0] + '</span></div>').join('') + '</div>' +
        '<div class="card"><h2>Servidor</h2><div class="barra"><i style="width:' + pc + '%;background:' + (pc > 80 ? 'var(--bad)' : 'var(--brand)') + '"></i></div><p class="sub">' + MB(u.db_bytes) + ' de ' + MB(u.limite_bytes) + ' (' + pc + '%) · ' + u.usuarios + ' cuentas · registro: ' + u.auditoria_filas + '/' + u.auditoria_max + ' filas</p>' +
        '<div class="hb-t">' + u.tablas.slice(0, 6).map((t) => '<div class="fila"><span class="tit">' + esc(t.tabla) + '</span><span class="sub">' + MB(t.bytes) + ' · ' + t.filas + ' filas</span></div>').join('') + '</div></div>';
    } catch (e) { el('resumen').innerHTML = '<p class="err">' + esc(e.message) + '</p>'; }
    // Aviso cuando hay una versión nueva publicada que falta instalar o liberar.
    try {
      const e = await estadoVersion();
      if (e.pendiente) el('resumen').insertAdjacentHTML('afterbegin', '<button type="button" class="aviso-ver" id="bVer">🚀 Hay una versión nueva lista (v' + esc(e.pub.version) + ').<br><span class="sub">Actualízala en 4 pasos: base de datos, función, probar y liberar.</span></button>');
      if ($('bVer')) $('bVer').onclick = () => show('versiones');
    } catch (x) { /* sin internet */ }
  }

  /* ---------- Versiones: asistente de actualización en 4 pasos ----------
     1) base de datos, 2) función "servidor", 3) probar en tu teléfono, 4) liberar para todos.
     Nadie recibe cambios hasta el paso 4, y no se puede liberar si la base de datos o la función quedaron atrás. */
  const PROYECTO = new URL(BT_CONFIG.SUPABASE_URL).hostname.split('.')[0];
  async function estadoVersion() {
    const j = await (await fetch(App.ROOT + 'version.json?t=' + Date.now(), { cache: 'no-store' })).json();
    const pub = { version: String(j.version || ''), bd: String(j.bd || ''), funcion: String(j.funcion || '') };
    pub_ = pub;
    const [bd, fn] = await Promise.all([rpc('db_version').catch(() => ''),
      App.sb.functions.invoke('servidor', { body: { accion: 'ping' } }).then((r) => (r.data && r.data.version ? String(r.data.version) : '')).catch(() => '')]);
    pub2 = await App.cargarPublica();
    const lib = (pub2.config || {}).version_liberada || '';
    const okBd = !!bd && !App.versionMenor(bd, pub.bd), okFn = !pub.funcion || (!!fn && !App.versionMenor(fn, pub.funcion));
    const okCel = !App.versionMenor(BT_CONFIG.VERSION, pub.version), liberada = !!lib && !App.versionMenor(lib, pub.version);
    return { pub, bd, fn, lib, okBd, okFn, okCel, liberada, pendiente: !liberada || !okBd };
  }
  let pub_ = null, pub2 = null;
  async function versiones() {
    const v = el('versiones');
    v.innerHTML = '<div class="titulo-v"><h2>Actualizar la app</h2></div><p class="sub">Revisando…</p>';
    let e;
    try { e = await estadoVersion(); } catch (x) { v.innerHTML = '<p class="err">No se pudo leer la versión publicada. Revisa tu internet.</p>'; return; }
    const paso = (n, ok, tit, cuerpo) => '<div class="paso-act ' + (ok === true ? 'ok' : ok === false ? 'pend' : '') + '"><b>' + (ok === true ? '✓' : n) + '</b><div class="grow"><h3>' + tit + '</h3>' + (cuerpo || '') + '</div></div>';
    const k = (t, val, cls) => '<div class="card"><b class="' + (cls || '') + '">' + esc(val) + '</b><span>' + t + '</span></div>';
    const bloqueo = !e.okBd || !e.okFn;
    v.innerHTML = '<div class="titulo-v"><h2>Actualizar la app</h2></div>' +
      '<div class="stats">' + k('Publicada en GitHub', 'v' + e.pub.version) + k('Liberada para todos', e.lib ? 'v' + e.lib : '—', e.liberada ? 'ok' : 'warn') + k('Tu teléfono', 'v' + BT_CONFIG.VERSION, e.okCel ? 'ok' : 'warn') + k('Base de datos', e.bd ? 'v' + e.bd : '—', e.okBd ? 'ok' : 'bad') + '</div>' +
      '<div class="card">' +
      (e.liberada && !bloqueo ? '<p class="pill ok">✅ Todo al día. Cuando se publique una versión nueva, aquí verás los pasos.</p>' : '') +
      paso(1, e.okBd, 'Base de datos' + (e.okBd ? ' al día (v' + esc(e.bd) + ')' : ': falta actualizar a v' + esc(e.pub.bd)),
        (e.okBd ? '' : '<p class="sub">Copia la consulta y pégala en Supabase → SQL Editor → New query → Run. Debe responder "Centro de Mando instalado v' + esc(e.pub.bd) + '". No borra tus datos.</p>') +
        '<div class="btns-s"><button type="button" class="small' + (e.okBd ? ' ghost' : '') + '" data-a="sql">📋 Copiar consulta</button><a class="btn small ghost" target="_blank" rel="noopener" href="https://supabase.com/dashboard/project/' + PROYECTO + '/sql/new">↗ Abrir SQL Editor</a>' + (e.okBd ? '' : '<button type="button" class="small ghost" data-a="otra">🔄 Ya la corrí</button>') + '</div>') +
      paso(2, e.pub.funcion ? e.okFn : null, 'Función "servidor"' + (e.okFn ? ' al día' + (e.fn ? ' (v' + esc(e.fn) + ')' : '') : e.fn ? ': tienes v' + esc(e.fn) + ', falta v' + esc(e.pub.funcion) : ': no responde'),
        (e.okFn ? '' : '<p class="sub">Copia el código y en Supabase → Edge Functions → servidor → Code: borra todo, pega y toca Deploy. Si no existe, créala con el nombre "servidor".</p>') +
        '<div class="btns-s"><button type="button" class="small' + (e.okFn ? ' ghost' : '') + '" data-a="fn">📋 Copiar código</button><a class="btn small ghost" target="_blank" rel="noopener" href="https://supabase.com/dashboard/project/' + PROYECTO + '/functions">↗ Abrir Edge Functions</a><button type="button" class="small ghost" data-a="otra">🩺 Probar de nuevo</button></div>') +
      paso(3, e.okCel, e.okCel ? 'Tu teléfono ya tiene la v' + esc(BT_CONFIG.VERSION) : 'Pruébala en tu teléfono',
        '<p class="sub">Solo tu teléfono cambia. Revisa que todo funcione antes de liberarla.</p>' + (e.okCel ? '' : '<button type="button" class="small" data-a="cel">⬇️ Actualizar mi teléfono a la v' + esc(e.pub.version) + '</button>')) +
      paso(4, e.liberada, 'Liberar para todos',
        '<p class="sub">' + (bloqueo ? '🔒 Primero termina los pasos 1 y 2: si liberas antes, la app de tus usuarios fallaría.' : 'A cada usuario le aparece "Hay una versión nueva" con el botón Actualizar. Nadie recibe cambios hasta que tú lo apruebas.') + '</p>' +
        (SUPER ? '<button type="button" class="block" data-a="lib"' + (e.liberada || bloqueo ? ' disabled' : '') + '>' + (e.liberada ? '✓ La v' + esc(e.pub.version) + ' ya está liberada' : '🚀 Liberar v' + esc(e.pub.version) + ' para todos') + '</button>' : '<p class="sub">Solo el súper administrador puede liberar.</p>')) +
      '</div><div class="card"><button type="button" class="ghost" data-a="rep">🛠️ Reparar la app en este teléfono</button><p class="sub">Vuelve a descargar la app. No borra datos.</p></div>';
    v.onclick = async (ev) => {
      const b = ev.target.closest('[data-a]'); if (!b) return;
      const a = b.dataset.a;
      if (a === 'sql') copiarArchivo('supabase/instalar-corto.sql', /http_get/, 'Consulta copiada. Pégala en Supabase → SQL Editor → Run');
      else if (a === 'fn') copiarArchivo('supabase/functions/servidor/corto.ts', /^import /m, 'Código copiado. Pégalo en Edge Functions → servidor → Deploy');
      else if (a === 'otra') versiones();
      else if (a === 'cel') { b.disabled = true; b.textContent = 'Actualizando…'; App.actualizar(); }
      else if (a === 'rep') { if (await confirmar('Se vuelve a descargar la app en este teléfono. No se borra ningún dato.', 'Reparar')) App.repararApp(); }
      else if (a === 'lib') {
        if (!(await confirmar('¿Liberar la v' + e.pub.version + '? A todos les aparecerá "Hay una versión nueva" con el botón Actualizar.', 'Liberar'))) return;
        try { await rpc('admin_config_guardar', { p_clave: 'version_liberada', p_valor: e.pub.version, p_motivo: 'Liberar v' + e.pub.version }); toast('v' + e.pub.version + ' liberada para todos'); if (!e.okCel) App.actualizar(); else versiones(); } catch (x) { err(x); }
      }
    };
  }
  async function copiarArchivo(ruta, prueba, aviso) {
    try {
      const t = await (await fetch(App.ROOT + ruta + '?t=' + Date.now(), { cache: 'no-store' })).text();
      if (!prueba.test(t)) throw new Error('No se pudo leer ' + ruta.split('/').pop());
      const limpio = t.split('\n').filter((x) => !x.startsWith('--') && !x.startsWith('//')).join('\n').trim();
      try { await navigator.clipboard.writeText(limpio); } catch (x) { const ta = document.createElement('textarea'); ta.value = limpio; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
      toast(aviso);
    } catch (x) { toast('No se pudo copiar: ' + x.message); }
  }

  async function usuarios(q) {
    const cont = el('usuarios');
    if (!cont.dataset.ok) { cont.dataset.ok = 1; cont.innerHTML = '<div class="titulo-v"><h2>Usuarios</h2><button class="small" id="uN" type="button">+ Cuenta</button></div><input id="uQ" type="search" placeholder="Buscar por nombre o correo"><div id="uL"></div>'; $('uQ').oninput = () => { clearTimeout(cont.t); cont.t = setTimeout(() => usuarios($('uQ').value), 300); }; $('uN').onclick = nueva; }
    try {
      const L = await rpc('admin_usuarios', { p_buscar: q || '' });
      $('uL').innerHTML = L.map((u) => '<div class="card"><div class="fila"><span class="tit">' + esc(u.nombre || u.email) + '</span><span class="pill ' + (u.rol === 'admin' ? 'dark' : u.rol === 'socio' ? 'info' : '') + '">' + u.rol + '</span>' + (u.suspendido ? '<span class="pill bad">suspendido</span>' : '') + '</div>' +
        '<p class="sub">' + esc(u.email) + ' · ' + u.registros + ' registros · ' + (u.premium_hasta && new Date(u.premium_hasta) > new Date() ? 'Pro hasta ' + App.fCorta(u.premium_hasta.slice(0, 10)) : 'gratis') + ' · visto ' + (u.visto_at ? App.hace(u.visto_at) : 'nunca') + '</p>' +
        (u.rol === 'admin' ? '' : '<div class="btns-s"><button class="small ghost" data-a="pro" data-id="' + u.id + '">Días Pro</button><button class="small ghost" data-a="susp" data-id="' + u.id + '" data-s="' + (u.suspendido ? 0 : 1) + '">' + (u.suspendido ? 'Reactivar' : 'Suspender') + '</button><button class="small ghost" data-a="del" data-id="' + u.id + '" data-n="' + esc(u.email) + '">Eliminar</button></div>') + '</div>').join('') || '<p class="empty">Sin resultados</p>';
    } catch (e) { $('uL').innerHTML = '<p class="err">' + esc(e.message) + '</p>'; }
  }
  el('usuarios').onclick = async (e) => {
    const b = e.target.closest('[data-a]'); if (!b) return; const id = b.dataset.id;
    try {
      if (b.dataset.a === 'pro') {
        const d = modal('<h2>Días de Pro</h2><p class="sub">Positivo suma, negativo quita, 0 cancela.</p><input id="dp" type="number" value="30"><div class="btns"><button class="ghost" data-cerrar type="button">Cancelar</button><button id="dk" type="button">Siguiente</button></div>');
        d.querySelector('#dk').onclick = async () => { const n = +d.querySelector('#dp').value; d.close(); const m = await motivo('Días de Pro'); if (m === null) return; try { await rpc('admin_premium', { p_id: id, p_dias: n, p_motivo: m }); toast('Listo'); usuarios($('uQ').value); } catch (x) { err(x); } };
      } else if (b.dataset.a === 'susp') { const m = await motivo(b.dataset.s === '1' ? 'Suspender cuenta' : 'Reactivar cuenta'); if (m === null) return; await rpc('admin_suspender', { p_id: id, p_suspender: b.dataset.s === '1', p_motivo: m }); usuarios($('uQ').value); }
      else if (b.dataset.a === 'del') { if (!(await confirmar('Eliminar a ' + b.dataset.n + ' y todos sus datos. No se puede deshacer.', 'Eliminar'))) return; const m = await motivo('Eliminar cuenta'); if (m === null) return; await App.borrarCuenta(id, m); toast('Eliminada'); usuarios($('uQ').value); }
    } catch (x) { err(x); }
  };
  function nueva() {
    const d = modal('<h2>Nueva cuenta</h2><label>Nombre<input id="nn"></label><label>Correo<input id="ne" type="email"></label><label>Rol<select id="nr"><option value="usuario">Usuario</option><option value="socio">Socio</option></select></label><p class="sub">Le llega un correo para crear su contraseña.</p><div class="btns"><button class="ghost" data-cerrar type="button">Cancelar</button><button id="nk" type="button">Crear</button></div>');
    d.querySelector('#nk').onclick = async () => { try { await App.crearCuenta({ email: d.querySelector('#ne').value.trim(), nombre: d.querySelector('#nn').value.trim(), rol: d.querySelector('#nr').value }); d.close(); toast('Cuenta creada'); usuarios(); } catch (x) { err(x); } };
  }

  async function pagos() {
    try {
      const L = await rpc('admin_pagos', { p_estado: 'todos' });
      el('pagos').innerHTML = '<div class="titulo-v"><h2>Pagos</h2></div>' + (L.map((g) => '<div class="card"><div class="fila"><span class="tit">' + esc(g.nombre || g.email) + '</span><span class="pill ' + (g.estado === 'aprobado' ? 'ok' : g.estado === 'rechazado' ? 'bad' : 'warn') + '">' + g.estado + '</span></div><p class="sub">' + g.plan + ' · $' + Number(g.monto).toLocaleString('es-CL') + ' · ' + App.hace(g.created_at) + '</p>' +
        '<div class="btns-s"><button class="small ghost" data-a="ver" data-id="' + g.id + '">Ver comprobante</button>' + (g.estado === 'pendiente' ? '<button class="small" data-a="ok" data-id="' + g.id + '">Aprobar</button><button class="small ghost" data-a="no" data-id="' + g.id + '">Rechazar</button>' : '') + '</div></div>').join('') || '<p class="empty">Sin pagos</p>');
    } catch (e) { el('pagos').innerHTML = '<p class="err">' + esc(e.message) + '</p>'; }
  }
  el('pagos').onclick = async (e) => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    try {
      if (b.dataset.a === 'ver') App.verImagen(await rpc('admin_pago_comprobante', { p_id: b.dataset.id }), 'Comprobante', 'comprobante.jpg');
      else { const m = await motivo(b.dataset.a === 'ok' ? 'Aprobar pago' : 'Rechazar pago'); if (m === null) return; await rpc('admin_pago_resolver', { p_id: b.dataset.id, p_aprobar: b.dataset.a === 'ok', p_motivo: m }); toast('Listo'); pagos(); }
    } catch (x) { err(x); }
  };

  function planes() {
    const P = pub.planes || {};
    el('planes').innerHTML = '<div class="titulo-v"><h2>Planes</h2></div>' + Object.keys(P).map((k) => { const p = P[k], l = p.limites || {}; return '<div class="card" data-k="' + k + '"><h3>' + esc(p.nombre) + ' <span class="sub">' + k + '</span></h3>' + ['espacios', 'items', 'recordatorios', 'insights', 'descanso'].map((c) => '<label>' + c + '<input data-l="' + c + '" type="number" value="' + (l[c] === undefined ? '' : l[c]) + '"></label>').join('') + '<label>Descripción<input data-d value="' + esc(p.descripcion || '') + '"></label><button type="button" data-g="' + k + '">Guardar</button></div>'; }).join('');
  }
  el('planes').onclick = async (e) => {
    const b = e.target.closest('[data-g]'); if (!b) return; const c = b.closest('.card'), k = b.dataset.g, p = pub.planes[k], lim = {};
    c.querySelectorAll('[data-l]').forEach((i) => { if (i.value !== '') lim[i.dataset.l] = +i.value; });
    const m = await motivo('Cambiar plan ' + p.nombre); if (m === null) return;
    try { await rpc('admin_plan_guardar', { p_codigo: k, p_nombre: p.nombre, p_descripcion: c.querySelector('[data-d]').value, p_limites: lim, p_beneficios: p.beneficios || [], p_duracion: p.duracion_dias || 30, p_motivo: m }); pub = await App.cargarPublica(); toast('Guardado'); } catch (x) { err(x); }
  };

  const CFG = [['dias_prueba', 'Días de prueba Pro'], ['pro_precio_mensual', 'Precio mensual'], ['pro_precio_anual', 'Precio anual'], ['pro_link', 'Link de pago mensual', 1], ['pro_link_anual', 'Link de pago anual', 1], ['soporte_whatsapp', 'WhatsApp de soporte', 1], ['dias_comprobantes', 'Guardar comprobantes (días)'], ['limite_db_mb', 'Límite de base de datos (MB)'], ['auditoria_max', 'Máximo de filas del registro']];
  function ajustes() {
    const c = pub.config || {}, k = c.vapid_publica;
    el('ajustes').innerHTML = '<div class="titulo-v"><h2>Ajustes</h2></div><button type="button" class="aviso-ver" id="bVer2">🔄 Actualizar la app<br><span class="sub">Base de datos, función del servidor, probar y liberar versiones</span></button><div class="card">' + CFG.map((f) => '<label>' + f[1] + '<input data-c="' + f[0] + '" data-t="' + (f[2] ? 's' : 'n') + '" value="' + esc(c[f[0]] === undefined ? '' : c[f[0]]) + '"></label>').join('') + '<button type="button" id="cg">Guardar ajustes</button></div>' +
      '<div class="card"><h2>Enviar aviso</h2><label>A<select id="avD"><option value="todos">Todos</option><option value="pro">Pro</option><option value="gratis">Gratis</option></select></label><label>Título<input id="avT" maxlength="90"></label><label>Mensaje<input id="avC" maxlength="240"></label><button type="button" id="avG">Enviar</button></div>' +
      '<div class="card"><h2>Notificaciones push</h2><p class="muted">' + (k ? 'Claves creadas.' : 'Falta crear las claves.') + '</p>' + (SUPER ? '<button id="kG" type="button" class="' + (k ? 'ghost' : '') + '">' + (k ? 'Crear claves nuevas' : 'Crear claves') + '</button> ' : '') + '<button class="alt" id="kP" type="button">Probar servidor</button><p class="sub" id="kR"></p></div>';
    $('bVer2').onclick = () => show('versiones');
    $('cg').onclick = async () => {
      const m = await motivo('Cambiar ajustes'); if (m === null) return;
      try { for (const i of el('ajustes').querySelectorAll('[data-c]')) { const nv = i.dataset.t === 'n' ? Number(i.value) : i.value; if (JSON.stringify(nv) !== JSON.stringify(c[i.dataset.c]) && !(i.value === '' && c[i.dataset.c] === undefined)) await rpc('admin_config_guardar', { p_clave: i.dataset.c, p_valor: nv, p_motivo: m }); } pub = await App.cargarPublica(); toast('Guardado'); } catch (x) { err(x); }
    };
    $('avG').onclick = async () => { const m = await motivo('Enviar aviso'); if (m === null) return; try { const n = await rpc('admin_aviso', { p_destino: $('avD').value, p_titulo: $('avT').value, p_cuerpo: $('avC').value, p_motivo: m }); toast('Enviado a ' + n); } catch (x) { err(x); } };
    if ($('kG')) $('kG').onclick = async () => {
      if (k && !(await confirmar('Con claves nuevas todos deberán activar las notificaciones otra vez.', 'Continuar'))) return;
      try {
        const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
        const raw = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey)), jwk = await crypto.subtle.exportKey('jwk', kp.privateKey);
        const b64u = (u) => btoa(String.fromCharCode.apply(null, u)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        await rpc('admin_push_claves', { p_publica: b64u(raw), p_privada: jwk.d }); pub = await App.cargarPublica(); toast('Claves creadas'); ajustes();
      } catch (x) { err(x); }
    };
    $('kP').onclick = async () => { const { data, error } = await App.sb.functions.invoke('servidor', { body: { accion: 'ping' } }); $('kR').textContent = error ? 'No responde: despliega la función "servidor".' : data && data.servicio ? 'Funciona (v' + data.version + ').' : 'Responde, pero sin clave de servicio.'; };
  }

  let filas = [];
  async function registro() {
    el('registro').innerHTML = '<p class="sub">Cargando…</p>';
    try {
      filas = await rpc('admin_auditoria', { p_limite: 5000 });
      el('registro').innerHTML = '<div class="titulo-v"><h2>Registro de cambios</h2><span class="sub">' + filas.length + ' filas</span></div><div class="card"><p class="sub">Quién cambió o borró algo y por qué. Descárgalo y, si eres administrador, vacíalo para liberar espacio.</p><div class="btns-s"><button type="button" id="rD">Descargar CSV</button>' + (SUPER ? '<button type="button" class="ghost" id="rV">Vaciar lo descargado</button>' : '') + '</div></div>' +
        filas.slice(0, 100).map((f) => '<div class="card"><div class="fila"><span class="tit">' + esc(f.accion) + '</span><span class="sub">' + App.hace(f.created_at) + '</span></div><p class="sub">' + esc(f.quien_email || '') + ' (' + esc(f.rol || '') + ') · ' + esc(f.detalle || '') + (f.motivo ? '<br><b>Motivo:</b> ' + esc(f.motivo) : '') + '</p></div>').join('');
      $('rD').onclick = () => { const c = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"'; const csv = 'id,fecha,quien,rol,accion,detalle,motivo\n' + filas.map((f) => [f.id, f.created_at, f.quien_email, f.rol, f.accion, f.detalle, f.motivo].map(c).join(',')).join('\n'); const u = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })); App.descargar(u, 'registro-' + App.hoy() + '.csv'); setTimeout(() => URL.revokeObjectURL(u), 4000); App.pendienteVaciar = true; toast('Descargado'); };
      if ($('rV')) $('rV').onclick = async () => { if (!filas.length) return; if (!App.pendienteVaciar) return toast('Primero descarga el CSV'); if (!(await confirmar('Se borran ' + filas.length + ' filas del registro (ya descargadas).', 'Vaciar'))) return; try { await rpc('auditoria_vaciar', { p_hasta_id: filas[0].id }); App.pendienteVaciar = false; toast('Registro vaciado'); registro(); } catch (x) { err(x); } };
    } catch (e) { el('registro').innerHTML = '<p class="err">' + esc(e.message) + '</p>'; }
  }
  show(location.hash.slice(1) || 'resumen');
})();
