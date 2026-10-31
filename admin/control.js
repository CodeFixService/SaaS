/* Centro de Mando · Control de las 7 apps desde un solo lugar (funciones comunes cfx_* del núcleo).
   Eliges la app arriba y manejas: aviso a todos, planes (interruptores sí/no y límites), textos, keys de Premium,
   cupones, verificaciones de identidad y el registro de lo que se hizo. Usa las conexiones de Apps (MisApps). */
(function (global) {
  'use strict';
  const A = global.App, { esc, toast, modal, confirmar } = A;
  const M = () => global.MisApps;
  let raiz = null, actual = 'cm', seccion = 'avisar';
  const SECC = [['avisar', '📣 Avisar'], ['planes', '🧩 Planes'], ['textos', '✏️ Textos'], ['keys', '🔑 Keys'], ['cupones', '🏷️ Cupones'], ['verif', '🪪 Verificaciones'], ['humano', '🤖 Humano'], ['push', '🔔 Notificaciones'], ['referidos', '🎁 Referidos'], ['socios', '🤝 Socios'], ['registro', '📜 Registro']];
  // Nombres legibles de las claves de los planes (las demás se muestran tal cual).
  const NOMBRE = { productos: 'Productos', clientes: 'Clientes', fichas: 'Fichas publicadas', equipo: 'Equipo', pedidos_mes: 'Pedidos al mes', respuestas: 'Respuestas rápidas',
    contactos: 'Contactos', favoritos: 'Favoritos', mensajes_seguidos: 'Mensajes seguidos', barberos: 'Barberos', servicios: 'Servicios', ofertas: 'Ofertas',
    prueba_dias: 'Días de prueba', activas: 'Horas activas a la vez', dias: 'Días para reservar', mensajes: 'Mensajes seguidos', estadisticas: 'Estadísticas',
    recordatorios: 'Recordatorios', caja_reportes: 'Reportes de caja', colores: 'Colores', ofertas_vip: 'Ofertas VIP', sellos: 'Sellos', horario_barbero: 'Horario por barbero',
    vista_todos: 'Ver agenda de todos', reservas_mes: 'Reservas al mes', promos: 'Promociones', clientes_cuenta: 'Clientes con cuenta', fotos: 'Fotos', historial: 'Historial (visitas)',
    anticipacion_extra: 'Días extra para reservar', publicar: 'Estacionamientos publicados', arrendar: 'Arriendos a la vez', destacado: 'Pin destacado', alertas: 'Alertas de zona',
    color_libre: 'Color libre', qr_color: 'QR con color', espacios: 'Espacios', items: 'Registros', insights: 'Consejos', descanso: 'Avisos de descanso',
    movimientos: 'Fiados y abonos al mes', cuotas: 'Ventas en cuotas', comprobantes: 'Comprobantes al mes', historial_meses: 'Historial (meses)', ayudantes: 'Ayudantes', caja: 'Ingresos y gastos al mes', categorias: 'Categorías' };
  const nom = (k) => NOMBRE[k] || k.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
  const app = () => M().APPS.find((a) => a.id === actual);
  const c = () => M().cliente(app());
  const conectada = (a) => !!(M().estado[a.id] || {}).conectado;
  const rpc = (fn, args) => M().rpcDe(c(), fn, args);
  const nf = (x) => /Could not find|does not exist|PGRST202/i.test(x.message) ? 'La base de esta app aún no tiene esta función: se actualiza sola en máx. 10 minutos.' : x.message;
  const caja = () => raiz.querySelector('#ctlCuerpo');

  async function avisar() {
    caja().innerHTML = '<div class="card"><h2>Aviso a todos</h2><p class="sub">Les llega a la campanita y como notificación.</p>' +
      '<label>A quién<select id="avD"><option value="todos">Todos</option><option value="negocios">Negocios (cuentas principales)</option><option value="clientes">Clientes</option><option value="premium">Solo Premium</option><option value="gratis">Solo gratis</option></select></label>' +
      '<label>Título<input id="avT" maxlength="80"></label><label>Mensaje<textarea id="avC" maxlength="240" rows="3"></textarea></label>' +
      '<label class="fila" style="gap:8px"><input type="checkbox" id="avTodas" style="width:auto" checked> Enviar en las 7 apps (a todas las cuentas)</label><button type="button" class="block" id="avG">Enviar</button><div id="avR"></div></div>';
    raiz.querySelector('#avG').onclick = async () => {
      const apps = raiz.querySelector('#avTodas').checked ? M().APPS.filter(conectada) : [app()], res = [];
      if (!(await confirmar('Se envía a ' + raiz.querySelector('#avD').selectedOptions[0].text.toLowerCase() + ' en ' + apps.length + ' app(s).', 'Enviar'))) return;
      for (const a of apps) {
        try { res.push(a.nombre + ': ' + await M().rpcDe(M().cliente(a), 'cfx_aviso_masivo', { p_destino: raiz.querySelector('#avD').value, p_titulo: raiz.querySelector('#avT').value, p_cuerpo: raiz.querySelector('#avC').value }) + ' personas'); }
        catch (x) { res.push(a.nombre + ': ' + nf(x)); }
      }
      raiz.querySelector('#avR').innerHTML = res.map((t) => '<p class="sub">' + esc(t) + '</p>').join('');
    };
  }

  async function planes() {
    let L;
    try { L = await rpc('cfx_planes'); } catch (x) { caja().innerHTML = '<p class="sub warn">' + esc(nf(x)) + '</p>'; return; }
    const grupos = [...new Set(L.map((x) => x.grupo))];
    const celda = (x, k) => typeof x[k] === 'boolean' ? '<input type="checkbox" data-k="' + k + '"' + (x[k] ? ' checked' : '') + ' style="width:auto">'
      : '<input type="number" data-k="' + k + '" value="' + esc(x[k] == null ? '' : x[k]) + '" style="max-width:90px">';
    caja().innerHTML = '<p class="sub">Interruptores (sí/no) y límites de cada plan. Se guarda al cambiar. Las apps los aplican al instante.</p>' +
      grupos.map((g) => '<div class="card"><h2>' + (g === 'negocio' ? 'Negocio' : 'Cliente') + '</h2><div class="fila sub" style="font-weight:700"><span class="grow">Función</span><span style="width:90px;text-align:center">Gratis</span><span style="width:90px;text-align:center">Premium</span></div>' +
        L.filter((x) => x.grupo === g).map((x) => '<div class="fila" data-g="' + esc(x.grupo) + '" data-c="' + esc(x.clave) + '" style="padding:4px 0;border-top:1px solid var(--line)"><span class="grow">' + esc(nom(x.clave)) + '</span>' +
          '<span style="width:90px;text-align:center">' + celda(x, 'free') + '</span><span style="width:90px;text-align:center">' + celda(x, 'premium') + '</span></div>').join('') + '</div>').join('');
    caja().onchange = async (ev) => {
      const f = ev.target.closest('[data-c]'); if (!f) return;
      const v = (k) => { const i = f.querySelector('[data-k="' + k + '"]'); return i.type === 'checkbox' ? i.checked : Number(i.value || 0); };
      try { await rpc('cfx_plan_guardar', { p_grupo: f.dataset.g, p_clave: f.dataset.c, p_free: v('free'), p_premium: v('premium') }); toast('Guardado: ' + nom(f.dataset.c)); }
      catch (x) { toast(nf(x)); }
    };
  }

  async function textos() {
    let L;
    try { L = await rpc('cfx_textos'); } catch (x) { caja().innerHTML = '<p class="sub warn">' + esc(nf(x)) + '</p>'; return; }
    caja().innerHTML = L.length ? L.map((t) => '<div class="card"><label>' + esc(t.nombre || nom(t.clave)) + '<textarea data-t="' + esc(t.clave) + '" rows="' + Math.min(6, Math.max(2, Math.ceil(String(t.valor).length / 40))) + '">' + esc(t.valor) + '</textarea></label>' +
      '<button type="button" class="small" data-g="' + esc(t.clave) + '">Guardar</button></div>').join('') : '<p class="empty">Esta app no tiene textos editables.</p>';
    caja().onclick = async (ev) => {
      const b = ev.target.closest('[data-g]'); if (!b) return;
      try { await rpc('cfx_texto_guardar', { p_clave: b.dataset.g, p_valor: caja().querySelector('[data-t="' + b.dataset.g + '"]').value }); toast('Texto guardado'); } catch (x) { toast(nf(x)); }
    };
  }

  async function keys() {
    let L = [];
    try { L = await rpc('cfx_keys_lista'); } catch (x) { caja().innerHTML = '<p class="sub warn">' + esc(nf(x)) + '</p>'; return; }
    caja().innerHTML = '<div class="card"><h2>Crear keys</h2><p class="sub">Cada key activa Premium una vez (sirve para regalar o vender por fuera). Solo se ven completas al crearlas.</p>' +
      '<div class="grid2"><label>Cantidad<input id="kN" type="number" value="1" min="1" max="50"></label><label>Días<input id="kD" type="number" value="30"></label></div>' +
      '<label>Para<select id="kR"><option value="negocio">Negocio</option><option value="cliente">Cliente</option></select></label><label>Nota<input id="kT" maxlength="120" placeholder="Ej: regalo feria"></label>' +
      '<button type="button" class="block" id="kG">Crear</button><div id="kOut"></div></div>' +
      '<div class="card"><h2>Keys</h2>' + (L.map((k) => '<div class="fila" style="padding:4px 0;border-top:1px solid var(--line)"><span class="grow">…' + esc(k.ultimos) + ' · ' + esc(k.rol) + ' · ' + k.dias + ' días' + (k.nota ? ' · ' + esc(k.nota) : '') +
        '<br><span class="sub">' + (k.revocada ? 'revocada' : k.usada_por ? 'usada por ' + esc(k.usada_email || '') + ' ' + A.hace(k.usada_at) : 'sin usar') + '</span></span>' +
        (!k.usada_por && !k.revocada ? '<button type="button" class="small ghost" data-rev="' + k.id + '">Revocar</button>' : '') + '</div>').join('') || '<p class="empty">Sin keys</p>') + '</div>';
    raiz.querySelector('#kG').onclick = async () => {
      try {
        const l = await rpc('cfx_keys_crear', { p_n: +raiz.querySelector('#kN').value, p_rol: raiz.querySelector('#kR').value, p_dias: +raiz.querySelector('#kD').value, p_nota: raiz.querySelector('#kT').value });
        raiz.querySelector('#kOut').innerHTML = '<pre style="white-space:pre-wrap;user-select:all">' + esc(l.join('\n')) + '</pre><button type="button" class="small" id="kCop">📋 Copiar</button>';
        raiz.querySelector('#kCop').onclick = () => navigator.clipboard.writeText(l.join('\n')).then(() => toast('Copiadas'));
      } catch (x) { toast(nf(x)); }
    };
    caja().onclick = async (ev) => {
      const b = ev.target.closest('[data-rev]'); if (!b) return;
      if (!(await confirmar('La key deja de servir.', 'Revocar'))) return;
      try { await rpc('cfx_key_revocar', { p_id: b.dataset.rev }); keys(); } catch (x) { toast(nf(x)); }
    };
  }

  async function cupones() {
    let L = [];
    try { L = await rpc('cfx_cupones_lista'); } catch (x) { caja().innerHTML = '<p class="sub warn">' + esc(nf(x)) + '</p>'; return; }
    caja().innerHTML = '<div class="card"><h2>Cupón de descuento</h2><p class="sub">Descuenta el precio del plan al pagar Premium (no aplica a "otro monto").</p>' +
      '<div class="grid2"><label>Código<input id="cC" maxlength="20" placeholder="FERIA20" autocapitalize="characters"></label><label>% descuento<input id="cP" type="number" value="20" min="1" max="100"></label>' +
      '<label>Usos máximos<input id="cU" type="number" placeholder="sin límite"></label><label>Vence<input id="cV" type="date"></label></div>' +
      '<label class="fila" style="gap:8px"><input type="checkbox" id="cTodas" style="width:auto" checked> Guardar en las 7 apps</label><button type="button" class="block" id="cG">Guardar cupón</button><div id="cR"></div></div>' +
      '<div class="card"><h2>Cupones de ' + esc(app().nombre) + '</h2>' + (L.map((x) => '<div class="fila" style="padding:4px 0;border-top:1px solid var(--line)"><span class="grow"><b>' + esc(x.codigo) + '</b> · ' + x.pct + '%' +
        '<br><span class="sub">' + x.usos + (x.usos_max ? ' de ' + x.usos_max : '') + ' usos' + (x.vence ? ' · vence ' + A.fCorta(x.vence) : '') + (x.activo ? '' : ' · pausado') + '</span></span>' +
        '<button type="button" class="small ghost" data-b="' + esc(x.codigo) + '">Borrar</button></div>').join('') || '<p class="empty">Sin cupones</p>') + '</div>';
    raiz.querySelector('#cG').onclick = async () => {
      const apps = raiz.querySelector('#cTodas').checked ? M().APPS.filter(conectada) : [app()], res = [];
      const args = { p_codigo: raiz.querySelector('#cC').value.trim().toUpperCase(), p_pct: +raiz.querySelector('#cP').value, p_usos_max: raiz.querySelector('#cU').value ? +raiz.querySelector('#cU').value : null,
        p_vence: raiz.querySelector('#cV').value || null, p_activo: true };
      for (const a of apps) { try { await M().rpcDe(M().cliente(a), 'cfx_cupon_guardar', args); res.push(a.nombre + ': ✓'); } catch (x) { res.push(a.nombre + ': ' + nf(x)); } }
      toast('Cupón guardado'); cupones().then(() => { raiz.querySelector('#cR').innerHTML = res.map((t) => '<p class="sub">' + esc(t) + '</p>').join(''); });
    };
    caja().onclick = async (ev) => {
      const b = ev.target.closest('[data-b]'); if (!b) return;
      if (!(await confirmar('Borrar el cupón ' + b.dataset.b + ' en ' + app().nombre + '.', 'Borrar'))) return;
      try { await rpc('cfx_cupon_borrar', { p_codigo: b.dataset.b }); cupones(); } catch (x) { toast(nf(x)); }
    };
  }

  async function verif() {
    let L = [];
    try { L = await rpc('cfx_verif_lista', { p_estado: 'pendiente' }); } catch (x) { caja().innerHTML = '<p class="sub warn">' + esc(nf(x)) + '</p>'; return; }
    caja().innerHTML = '<p class="sub">Personas que enviaron su RUT, cédula y selfie. Las fotos se borran al aprobar o rechazar.' + (actual === 'estaciona' ? ' (Las verificaciones antiguas de Estaciona siguen en su propio panel.)' : '') + '</p>' +
      (L.map((v, i) => '<div class="card"><div class="fila"><span class="tit grow">' + esc(v.nombre || v.email) + '</span><span class="pill warn">pendiente</span></div><p class="sub">' + esc(v.email) + ' · RUT ' + esc(v.rut) + (v.documento ? ' · Doc ' + esc(v.documento) : '') + ' · ' + A.hace(v.creado) + '</p>' +
        '<div class="btns-s"><button type="button" class="small ghost" data-f="' + i + '">Ver fotos</button><a class="btn small ghost" target="_blank" rel="noopener" href="https://portal.sidiv.registrocivil.cl/usuarios-portal/pages/DocumentRequestStatus.xhtml">Vigencia (Registro Civil)</a>' +
        '<button type="button" class="small" data-ok="' + i + '">Aprobar</button><button type="button" class="small ghost" data-no="' + i + '">Rechazar</button></div></div>').join('') || '<p class="empty">No hay verificaciones por revisar 🎉</p>');
    caja().onclick = async (ev) => {
      const b = ev.target.closest('[data-f],[data-ok],[data-no]'); if (!b) return;
      const v = L[+(b.dataset.f || b.dataset.ok || b.dataset.no)];
      try {
        if (b.dataset.f) { const f = await rpc('cfx_verif_fotos', { p_cuenta: v.cuenta }); modal('<h2>' + esc(v.nombre || v.email) + '</h2>' + ['frente', 'reverso', 'selfie'].map((k) => f[k] ? '<p class="sub">' + k + '</p><img alt="' + k + '" src="' + f[k] + '" style="max-width:100%;border-radius:10px">' : '').join('') + '<div class="btns"><button class="ghost" data-cerrar>Cerrar</button></div>'); }
        else if (b.dataset.ok) { if (!(await confirmar('Aprobar la identidad de ' + (v.nombre || v.email) + '.', 'Aprobar'))) return; await rpc('cfx_verif_resolver', { p_cuenta: v.cuenta, p_aprobar: true }); toast('Aprobada'); verif(); }
        else {
          const d = modal('<h2>Rechazar</h2><label>Motivo<input id="vm" maxlength="200" value="Las fotos no se leen bien"></label><div class="btns"><button class="ghost" data-cerrar>Cancelar</button><button id="vk">Rechazar</button></div>');
          d.querySelector('#vk').onclick = async () => { try { await rpc('cfx_verif_resolver', { p_cuenta: v.cuenta, p_aprobar: false, p_motivo: d.querySelector('#vm').value }); d.close(); toast('Rechazada'); verif(); } catch (x) { toast(nf(x)); } };
        }
      } catch (x) { toast(nf(x)); }
    };
  }

  async function humano() {
    let h = {};
    try { h = await rpc('cfx_humano') || {}; } catch (x) { caja().innerHTML = '<p class="sub warn">' + esc(nf(x)) + '</p>'; return; }
    caja().innerHTML = '<div class="card"><h2>Verificación humana</h2><p class="sub">Con Cloudflare Turnstile, antes de entrar o crear una cuenta aparece "Confirma que no eres un robot". Evita cuentas falsas y ataques.</p>' +
      '<ol class="sub"><li>En Cloudflare → Turnstile crea un sitio con los dominios de tus apps y copia la <b>site key</b> y la <b>secret key</b>.</li>' +
      '<li>Pega la site key aquí y guárdala en las 7 apps.</li><li>En cada Supabase: Authentication → Attack Protection → CAPTCHA → Turnstile, pega la secret key y guarda.</li></ol>' +
      '<p class="sub">Primero el paso 2 y después el 3 (si no, nadie puede entrar). Para apagarlo: deja vacío y guarda, y apágalo en Supabase.</p>' +
      '<label>Site key<input id="huK" value="' + esc(h.site_key || '') + '" placeholder="0x4AAAAAAA…"></label>' +
      '<label class="fila" style="gap:8px"><input type="checkbox" id="huTodas" style="width:auto" checked> Guardar en las 7 apps</label><button type="button" class="block" id="huG">Guardar</button><div id="huR"></div></div>';
    raiz.querySelector('#huG').onclick = async () => {
      const apps = raiz.querySelector('#huTodas').checked ? M().APPS.filter(conectada) : [app()], res = [];
      for (const a of apps) { try { await M().rpcDe(M().cliente(a), 'cfx_humano_guardar', { p_site_key: raiz.querySelector('#huK').value.trim() }); res.push(a.nombre + ': ✓'); } catch (x) { res.push(a.nombre + ': ' + nf(x)); } }
      raiz.querySelector('#huR').innerHTML = res.map((t) => '<p class="sub">' + esc(t) + '</p>').join('');
    };
  }

  async function registro() {
    let L = [];
    try { L = await rpc('cfx_registro_lista', { p_limite: 200 }); } catch (x) { caja().innerHTML = '<p class="sub warn">' + esc(nf(x)) + '</p>'; return; }
    setTimeout(() => window.CFX_AJUSTES && window.CFX_AJUSTES.registro(caja(), rpc, { recargar: registro }), 0);
    caja().innerHTML = '<div class="card"><h2>Lo que se hizo en ' + esc(app().nombre) + '</h2>' + (L.map((r) => '<div style="padding:4px 0;border-top:1px solid var(--line)"><b>' + esc(r.accion) + '</b> <span class="sub">' + esc(r.quien) + ' · ' + A.hace(r.creado) + '</span><div class="sub">' + esc(r.detalle) + '</div></div>').join('') || '<p class="empty">Sin registros</p>') + '</div>';
  }

  // 🔔 Notificaciones: revisa en cada app si tiene las claves push y, si faltan, las crea desde aquí (una sola vez por app).
  const b64u = (u) => btoa(String.fromCharCode.apply(null, new Uint8Array(u))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const PUSH = {
    cm: { leer: (c) => M().rpcDe(c, 'config_publica').then((r) => (r.config || {}).vapid_publica), crear: (c, pu, pr) => M().rpcDe(c, 'admin_push_claves', { p_publica: pu, p_privada: pr }) },
    billetera: { leer: (c) => M().rpcDe(c, 'config_publica').then((r) => r.vapid_public),
      crear: async (c, pu, pr) => { await M().rpcDe(c, 'admin_set_secret', { p_nombre: 'vapid_private', p_valor: pr }); await M().rpcDe(c, 'admin_set_secret', { p_nombre: 'vapid_public', p_valor: pu }); } },
    aplicaciones: { leer: (c) => M().rpcDe(c, 'public_config').then((r) => r.vapid_public),
      crear: async (c, pu, pr) => { await M().rpcDe(c, 'admin_set_secret', { p_name: 'vapid_private', p_value: pr }); await M().rpcDe(c, 'admin_set_secret', { p_name: 'vapid_public', p_value: pu }); } },
    barberia: { leer: (c) => M().rpcDe(c, 'config_publica').then((r) => r.vapid_public),
      crear: async (c, pu, pr) => { await M().rpcDe(c, 'admin_secreto', { p_name: 'vapid_private', p_value: pr }); await M().rpcDe(c, 'admin_secreto', { p_name: 'vapid_public', p_value: pu }); } },
    bicitaller: { leer: (c) => M().rpcDe(c, 'config_publica').then((r) => (r.config || {}).vapid_publica), crear: (c, pu, pr) => M().rpcDe(c, 'admin_push_claves', { p_publica: pu, p_privada: pr }) },
    contenido: { leer: (c) => M().rpcDe(c, 'config_publica').then((r) => (r.config || {}).vapid_publica), crear: (c, pu, pr) => M().rpcDe(c, 'admin_push_claves', { p_publica: pu, p_privada: pr }) },
    estaciona: { leer: (c) => M().rpcDe(c, 'ajustes_publicos').then((r) => r.vapid_public), crear: (c, pu, pr) => M().rpcDe(c, 'admin_guardar_ajustes', { p: { vapid_public: pu, vapid_private: pr } }) }
  };
  async function push() {
    const L = M().APPS.filter((a) => PUSH[a.id]);
    caja().innerHTML = '<div class="card"><h2>🔔 Notificaciones de las apps</h2><p class="sub">Cada app necesita sus claves push una sola vez. Si a alguien le sale "el administrador aún no activa las notificaciones", es porque a esa app le faltan: créalas aquí.</p><div id="puL"><p class="sub">Revisando…</p></div></div>';
    const filas = await Promise.all(L.map(async (a) => {
      if (!conectada(a)) return [a, null, 'sin conectar'];
      try { return [a, !!(await PUSH[a.id].leer(M().cliente(a))), '']; } catch (x) { return [a, null, nf(x)]; }
    }));
    const el = raiz.querySelector('#puL'); if (!el) return;
    el.innerHTML = filas.map(([a, ok, err]) => '<div class="fila" style="padding:8px 0;border-top:1px solid var(--line);gap:8px"><span class="tit" style="flex:1">' + esc(a.nombre.split(' ·')[0]) + '</span>' +
      (ok === true ? '<span class="pill ok">✅ Listas</span>' : ok === false ? '<button type="button" class="small" data-pu="' + a.id + '">Crear claves</button>' : '<span class="sub">' + esc(err) + '</span>') + '</div>').join('');
    el.onclick = async (ev) => {
      const b = ev.target.closest('[data-pu]'); if (!b) return;
      const a = M().APPS.find((x) => x.id === b.dataset.pu);
      b.disabled = true; b.textContent = 'Creando…';
      try {
        const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
        const pu = b64u(await crypto.subtle.exportKey('raw', kp.publicKey)), pr = (await crypto.subtle.exportKey('jwk', kp.privateKey)).d;
        await PUSH[a.id].crear(M().cliente(a), pu, pr);
        toast('🔔 Claves creadas en ' + a.nombre.split(' ·')[0]); push();
      } catch (x) { b.disabled = false; b.textContent = 'Crear claves'; toast(nf(x)); }
    };
  }

  const F = { avisar, planes, textos, keys, cupones, verif, humano, push, referidos, socios, registro };
  // Referidos: quién invitó a quién (con qué cuenta), ranking, premio automático y premio a mano (días + sticker).
  const STICKERS = ['🏆 ¡Eres un crack invitando!', '🚀 ¡Vas volando! Gracias por recomendarnos', '💪 ¡Sigue así, vas muy bien!', '🌟 ¡Gracias por correr la voz!'];
  async function referidos() {
    let r;
    try { r = await rpc('cfx_ref_lista'); } catch (x) { caja().innerHTML = '<p class="sub warn">' + esc(nf(x)) + '</p>'; return; }
    const F2 = r.filas || [], rk = {};
    F2.forEach((f) => { const k = f.invito; rk[k] = rk[k] || { id: k, email: f.invito_email || '—', n: 0, pagaron: 0, dias: 0 }; rk[k].n++; if (f.pago) rk[k].pagaron++; rk[k].dias += f.dias_dados || 0; });
    const R = Object.values(rk).sort((a, b) => b.n - a.n || b.pagaron - a.pagaron);
    caja().innerHTML = '<div class="card"><h3 style="margin-top:0">Premio automático</h3><p class="sub">Cuando un invitado paga su primer Premium, quien lo invitó recibe estos días (0 = apagado).</p>' +
        '<div class="fila"><input id="rfDias" type="number" inputmode="numeric" min="0" max="365" style="max-width:110px" value="' + ((r.config || {}).dias_auto || 0) + '"><button type="button" class="small" id="rfGuardar">Guardar</button></div></div>' +
      '<h3>Ranking de embajadores</h3>' + (R.length ? R.map((x, i) => '<div class="card"><div class="fila"><span class="tit grow">' + (i < 3 ? ['🥇', '🥈', '🥉'][i] + ' ' : '') + esc(x.email) + '</span><span class="pill info">' + x.n + ' invitado' + (x.n > 1 ? 's' : '') + '</span></div>' +
          '<p class="sub">' + x.pagaron + ' ya pagaron · ' + x.dias + ' días regalados</p><div class="btns-s"><button type="button" class="small" data-premio="' + esc(x.id) + '" data-em="' + esc(x.email) + '">🎁 Dar días o sticker</button></div></div>').join('')
        : '<p class="empty">Aún nadie se registró con un código.</p>') +
      (F2.length ? '<h3>Registros con código</h3><div class="card">' + F2.map((f) => '<div class="fila"><span class="grow"><b>' + esc(f.nombre || f.email) + '</b> <span class="sub">' + esc(f.email) + '</span><br><span class="sub">invitado por ' + esc(f.invito_email || '—') + ' · código ' + esc(f.codigo) + ' · ' + A.hace(f.creado) + '</span></span>' +
        (f.pago ? '<span class="pill ok">pagó</span>' : '<span class="pill">gratis</span>') + '</div>').join('') + '</div>' : '');
    caja().querySelector('#rfGuardar').onclick = async () => { try { await rpc('cfx_ref_config_guardar', { p_dias_auto: +caja().querySelector('#rfDias').value || 0 }); toast('Guardado en ' + app().nombre.split(' ·')[0]); } catch (x) { toast(nf(x)); } };
    caja().onclick = (ev) => {
      const b = ev.target.closest('[data-premio]'); if (!b) return;
      const d = modal('<h2>🎁 Premiar a ' + esc(b.dataset.em) + '</h2><label>Días de Premium de regalo (0 = solo el sticker)<input id="rpD" type="number" inputmode="numeric" min="0" max="365" value="15"></label>' +
        '<label>Sticker o mensaje</label><div class="chips" id="rpS">' + STICKERS.map((t, i) => '<button type="button" class="chip' + (i ? '' : ' on') + '" data-t="' + esc(t) + '">' + esc(t) + '</button>').join('') + '</div>' +
        '<input id="rpM" maxlength="90" value="' + esc(STICKERS[0]) + '"><div class="btns"><button class="ghost" data-cerrar type="button">Cancelar</button><button id="rpOk" type="button">Enviar</button></div>');
      d.querySelector('#rpS').onclick = (e) => { const t = e.target.closest('[data-t]'); if (!t) return; d.querySelectorAll('#rpS .chip').forEach((x) => x.classList.toggle('on', x === t)); d.querySelector('#rpM').value = t.dataset.t; };
      d.querySelector('#rpOk').onclick = async () => {
        try { const x = await rpc('cfx_ref_premiar', { p_cuenta: b.dataset.premio, p_dias: +d.querySelector('#rpD').value || 0, p_mensaje: d.querySelector('#rpM').value }); d.close(); toast(x.dias ? 'Listo: ' + x.dias + ' días + sticker enviados' : 'Sticker enviado'); referidos(); }
        catch (er) { toast(nf(er)); }
      };
    };
  }

  // Socios comunes (Billetera, Órbita y Estaciona): administran igual que tú, pero solo tú agregas o quitas socios.
  const CON_SOCIOS = ['billetera', 'aplicaciones', 'estaciona'];
  async function socios() {
    if (!CON_SOCIOS.includes(actual)) { caja().innerHTML = '<p class="sub">' + esc(app().nombre.split(' ·')[0]) + ' maneja sus socios en su propio panel (Ajustes → Socios).</p>'; return; }
    let L;
    try { L = await rpc('cfx_socios_lista'); } catch (x) { caja().innerHTML = '<p class="sub warn">' + esc(nf(x)) + '</p>'; return; }
    caja().innerHTML = '<p class="sub">El socio entra a ' + esc(app().nombre.split(' ·')[0]) + ' con su correo y administra igual que tú (se le ve SOCIO). No puede agregar ni quitar socios. Lo que hace queda en el Registro.</p>' +
      '<div class="card"><label>Correo del socio<input id="soE" type="email" maxlength="120" placeholder="socio@correo.cl"></label><label>Nombre (opcional)<input id="soN" maxlength="60"></label><button type="button" id="soOk">Agregar socio</button></div>' +
      (L.length ? L.map((x) => '<div class="card"><div class="fila"><span class="tit grow">' + esc(x.nombre || x.email) + '</span>' + (x.tiene_cuenta ? '<span class="pill ok">con cuenta</span>' : '<span class="pill warn">aún sin cuenta</span>') + '</div>' +
        '<p class="sub">' + esc(x.email) + ' · desde ' + A.hace(x.creado) + '</p><div class="btns-s"><button type="button" class="small ghost" data-quitar="' + esc(x.email) + '">Quitar</button></div></div>').join('') : '<p class="empty">Sin socios todavía.</p>');
    caja().querySelector('#soOk').onclick = async () => {
      const e = caja().querySelector('#soE').value.trim(); if (!/^\S+@\S+\.\S+$/.test(e)) { toast('Escribe un correo válido'); return; }
      try { await rpc('cfx_socio_guardar', { p_email: e, p_nombre: caja().querySelector('#soN').value, p_si: true }); toast('Socio agregado: que cree su cuenta con ese correo (o entre si ya la tiene)'); socios(); } catch (x) { toast(nf(x)); }
    };
    caja().onclick = async (ev) => {
      const b = ev.target.closest('[data-quitar]'); if (!b) return;
      if (!(await confirmar('¿Quitar a ' + b.dataset.quitar + ' como socio?', 'Quitar'))) return;
      try { await rpc('cfx_socio_guardar', { p_email: b.dataset.quitar, p_si: false }); toast('Quitado'); socios(); } catch (x) { toast(nf(x)); }
    };
  }

  async function render(el) {
    raiz = el;
    el.innerHTML = '<div class="titulo-v"><h2>Control</h2><span class="sub">Las 7 apps</span></div><p class="sub">Cargando…</p>';
    await M().preparar();
    const a = app();
    el.innerHTML = '<div class="titulo-v"><h2>Control</h2><span class="sub">Las 7 apps</span></div>' +
      '<div class="seg">' + M().APPS.map((x) => '<button type="button" data-app="' + x.id + '" class="' + (x.id === actual ? 'on' : '') + '">' + esc(x.nombre.split(' ·')[0]) + (conectada(x) ? '' : ' 🔌') + '</button>').join('') + '</div>' +
      '<div class="chips">' + SECC.map((s) => '<button type="button" class="chip' + (s[0] === seccion ? ' on' : '') + '" data-s="' + s[0] + '">' + s[1] + '</button>').join('') + '</div><div id="ctlCuerpo"></div>';
    el.querySelectorAll('[data-app]').forEach((b) => { b.onclick = () => { actual = b.dataset.app; render(el); }; });
    el.querySelectorAll('[data-s]').forEach((b) => { b.onclick = () => { seccion = b.dataset.s; render(el); }; });
    if (!conectada(a)) {
      caja().innerHTML = '<div class="card"><p>Conéctate a ' + esc(a.nombre) + ' con tu cuenta de administrador de esa app (queda guardada en este teléfono).</p><button type="button" id="ctlCon">Conectar</button></div>';
      raiz.querySelector('#ctlCon').onclick = () => M().conectar(a, () => render(el));
      return;
    }
    caja().onclick = null; caja().onchange = null;
    F[seccion]();
  }
  global.ControlApps = { render };
})(window);
