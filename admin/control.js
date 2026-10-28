/* Centro de Mando · Control de las 6 apps desde un solo lugar (funciones comunes cfx_* del núcleo).
   Eliges la app arriba y manejas: aviso a todos, planes (interruptores sí/no y límites), textos, keys de Premium,
   cupones, verificaciones de identidad y el registro de lo que se hizo. Usa las conexiones de Apps (MisApps). */
(function (global) {
  'use strict';
  const A = global.App, { esc, toast, modal, confirmar } = A;
  const M = () => global.MisApps;
  let raiz = null, actual = 'cm', seccion = 'avisar';
  const SECC = [['avisar', '📣 Avisar'], ['planes', '🧩 Planes'], ['textos', '✏️ Textos'], ['keys', '🔑 Keys'], ['cupones', '🏷️ Cupones'], ['verif', '🪪 Verificaciones'], ['humano', '🤖 Humano'], ['registro', '📜 Registro']];
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
      '<label class="fila" style="gap:8px"><input type="checkbox" id="avTodas" style="width:auto" checked> Enviar en las 6 apps (a todas las cuentas)</label><button type="button" class="block" id="avG">Enviar</button><div id="avR"></div></div>';
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
    caja().innerHTML = L.length ? L.map((t) => '<div class="card"><label>' + esc(nom(t.clave)) + '<textarea data-t="' + esc(t.clave) + '" rows="' + Math.min(6, Math.max(2, Math.ceil(String(t.valor).length / 40))) + '">' + esc(t.valor) + '</textarea></label>' +
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
      '<label class="fila" style="gap:8px"><input type="checkbox" id="cTodas" style="width:auto" checked> Guardar en las 6 apps</label><button type="button" class="block" id="cG">Guardar cupón</button><div id="cR"></div></div>' +
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
      '<li>Pega la site key aquí y guárdala en las 6 apps.</li><li>En cada Supabase: Authentication → Attack Protection → CAPTCHA → Turnstile, pega la secret key y guarda.</li></ol>' +
      '<p class="sub">Primero el paso 2 y después el 3 (si no, nadie puede entrar). Para apagarlo: deja vacío y guarda, y apágalo en Supabase.</p>' +
      '<label>Site key<input id="huK" value="' + esc(h.site_key || '') + '" placeholder="0x4AAAAAAA…"></label>' +
      '<label class="fila" style="gap:8px"><input type="checkbox" id="huTodas" style="width:auto" checked> Guardar en las 6 apps</label><button type="button" class="block" id="huG">Guardar</button><div id="huR"></div></div>';
    raiz.querySelector('#huG').onclick = async () => {
      const apps = raiz.querySelector('#huTodas').checked ? M().APPS.filter(conectada) : [app()], res = [];
      for (const a of apps) { try { await M().rpcDe(M().cliente(a), 'cfx_humano_guardar', { p_site_key: raiz.querySelector('#huK').value.trim() }); res.push(a.nombre + ': ✓'); } catch (x) { res.push(a.nombre + ': ' + nf(x)); } }
      raiz.querySelector('#huR').innerHTML = res.map((t) => '<p class="sub">' + esc(t) + '</p>').join('');
    };
  }

  async function registro() {
    let L = [];
    try { L = await rpc('cfx_registro_lista', { p_limite: 200 }); } catch (x) { caja().innerHTML = '<p class="sub warn">' + esc(nf(x)) + '</p>'; return; }
    caja().innerHTML = '<div class="card"><h2>Lo que se hizo en ' + esc(app().nombre) + '</h2>' + (L.map((r) => '<div style="padding:4px 0;border-top:1px solid var(--line)"><b>' + esc(r.accion) + '</b> <span class="sub">' + esc(r.quien) + ' · ' + A.hace(r.creado) + '</span><div class="sub">' + esc(r.detalle) + '</div></div>').join('') || '<p class="empty">Sin registros</p>') + '</div>';
  }

  const F = { avisar, planes, textos, keys, cupones, verif, humano, registro };
  async function render(el) {
    raiz = el;
    el.innerHTML = '<div class="titulo-v"><h2>Control</h2><span class="sub">Las 6 apps</span></div><p class="sub">Cargando…</p>';
    await M().preparar();
    const a = app();
    el.innerHTML = '<div class="titulo-v"><h2>Control</h2><span class="sub">Las 6 apps</span></div>' +
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
