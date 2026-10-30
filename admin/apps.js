/* Centro de Mando · Mis aplicaciones: solo para liberar. Una tarjeta por app con su versión, base de datos y núcleo,
   conectar y liberar. Abrir la app, su panel, respaldo y números están en Resumen → Empresas.
   La versión y la configuración pública (URL y clave anon de Supabase) se leen del repositorio en GitHub;
   para ver el rendimiento y liberar te conectas una vez con tu cuenta de administrador de cada app. */
(function (global) {
  'use strict';
  const A = global.App, { esc, toast, modal, confirmar } = A;
  const RAW = (repo, ruta) => 'https://raw.githubusercontent.com/CodeFixService/' + repo + '/main/' + ruta + '?t=' + Date.now();
  const campo = (o, ruta) => !ruta ? o : ruta.split('.').reduce((x, k) => (x == null ? x : x[k]), o);

  // Cómo se lee y se libera la versión en cada app (cada una lo guarda a su manera).
  const APPS = [
    { id: 'cm', nombre: 'Centro de Mando', ico: 'diana', repo: 'SaaS', propia: true, worker: 'saas', sub: 'mando', admin: 'admin/',
      bd: { rpc: 'db_version' }, leer: { propia: true },
      liberar: (c, v) => c.rpc('admin_config_guardar', { p_clave: 'version_liberada', p_valor: v, p_motivo: 'Liberar desde Mis aplicaciones' }) },
    { id: 'billetera', nombre: 'Billetera · Libreta de Cobros', ico: 'billetera', clave: 'lc-auth', repo: 'Emprendedor', cfg: 'js/config.js', worker: 'emprendedor', sub: 'billetera', admin: 'admin/',
      bd: { rpc: 'config_publica', campo: 'version_bd' }, leer: { rpc: 'config_publica', campo: 'version_liberada' },
      liberar: (c, v) => c.rpc('admin_guardar_ajustes', { p: { version_liberada: v } }) },
    { id: 'aplicaciones', nombre: 'Órbita · Tienda, caja y pedidos', ico: 'bolsa', clave: 'cfx-auth', repo: 'Aplicaciones', cfg: 'shared/config.js', worker: 'aplicaciones', sub: 'apps', admin: 'apps/admin/',
      bd: { rpc: 'db_version' }, leer: { rpc: 'public_settings', campo: 'version_liberada' },
      liberar: (c, v) => c.rpc('admin_set_setting', { p_key: 'version_liberada', p_value: v }) },
    { id: 'barberia', nombre: 'Barbería', ico: 'tijeras', clave: 'barb-auth', repo: 'Barberia', cfg: 'shared/config.js', worker: 'barberia', sub: 'barberia', admin: 'admin/',
      bd: { rpc: 'db_version' }, leer: { rpc: 'ajustes_publicos', campo: 'version_liberada' },
      liberar: async (c, v) => { const r = await c.rpc('admin_liberar', { p_version: v }); return r.error ? c.rpc('admin_ajuste', { p_key: 'version_liberada', p_value: v }) : r; } },
    { id: 'bicitaller', nombre: 'BiciTaller', ico: 'bici', clave: 'bt-auth', repo: 'Taller', cfg: 'shared/config.js', worker: 'taller', sub: 'bicitaller', admin: 'admin/',
      bd: { rpc: 'db_version' }, leer: { rpc: 'config_publica', campo: 'config.version_liberada' },
      liberar: (c, v) => c.rpc('admin_config_guardar', { p_clave: 'version_liberada', p_valor: v, p_motivo: 'Liberar desde Centro de Mando' }) },
    { id: 'estaciona', nombre: 'Estaciona · Estacionamientos', ico: 'auto', clave: 'est-auth', repo: 'Estacionamiento', cfg: 'js/config.js', worker: 'estacionamiento', sub: 'estaciona', admin: '#/admin',
      bd: { rpc: 'ajustes_publicos', campo: 'version_bd' }, leer: { rpc: 'ajustes_publicos', campo: 'textos.version_liberada' },
      liberar: (c, v) => c.rpc('admin_guardar_textos', { p: { version_liberada: v } }) },
    { id: 'contenido', nombre: 'Cerebro · Contenido para redes', ico: 'cerebro', clave: 'cc-auth', repo: 'Contenido', cfg: 'shared/config.js', worker: 'contenido', sub: 'cerebro', admin: 'app/#empresa',
      bd: { rpc: 'db_version' }, leer: { rpc: 'config_publica', campo: 'config.version_liberada' },
      liberar: (c, v) => c.rpc('admin_config_guardar', { p_clave: 'version_liberada', p_valor: v, p_motivo: 'Liberar desde Centro de Mando' }) }
  ];
  // Link de cada app: lo arma el núcleo (CFX_AYUDA.web) según dónde se abre el Centro de Mando.
  APPS.forEach((a) => { Object.defineProperty(a, 'web', { get: () => global.CFX_AYUDA.web(a.worker, a.sub) }); });
  let NUCLEO = ''; // versión del núcleo del Centro de Mando (la que se reparte a todas)
  fetch(A.ROOT + 'nucleo.json', { cache: 'no-store' }).then((r) => r.json()).then((j) => { NUCLEO = String(j.nucleo || ''); }).catch(() => {});
  const E = {}; // estado de cada app
  let raiz = null;

  async function rpcDe(c, fn, args) { const { data, error } = await c.rpc(fn, args || {}); if (error) throw new Error(error.message); return data; }
  function cliente(a) {
    if (a.propia) return A.sb;
    const e = E[a.id];
    if (!e.sb && e.url && e.key) e.sb = global.supabase.createClient(e.url, e.key, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'cm-app-' + a.id } });
    return e.sb;
  }
  const menor = (a, b) => A.versionMenor(String(a), String(b));
  // Vincula la app con el Centro de Mando: sus avisos (pagos por revisar, mensajes de soporte) llegan aquí al tiro.
  async function vincular(a) {
    const c = cliente(a), e = E[a.id], est = await rpcDe(c, 'cfx_cm_estado');
    if (!est.vinculado || est.url !== global.BT_CONFIG.SUPABASE_URL || est.app !== a.id) {
      const sec = await A.rpc('cm_puente_secreto', { p_app: a.id });
      await rpcDe(c, 'cfx_cm_vincular', { p_url: global.BT_CONFIG.SUPABASE_URL, p_key: global.BT_CONFIG.SUPABASE_ANON_KEY, p_secreto: sec, p_app: a.id });
    }
    e.vinculada = true;
  }
  // Sesión vinculada: al conectar se guarda una segunda sesión (solo en este teléfono) para abrir el panel de la app ya iniciado.
  const ENTREGA = (a) => 'cm-entrega-' + a.id;
  async function guardarEntrega(a, email, clave) {
    try {
      const c2 = global.supabase.createClient(E[a.id].url, E[a.id].key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'cm-tmp-' + a.id } });
      const { data } = await c2.auth.signInWithPassword({ email, password: clave });
      if (data && data.session) localStorage.setItem(ENTREGA(a), JSON.stringify({ rt: data.session.refresh_token, at: data.session.access_token }));
    } catch (x) { /* sin entrega: el panel pide entrar una vez */ }
  }
  function abrirAdmin(a) {
    let url = a.web + a.admin, d = null;
    try { d = JSON.parse(localStorage.getItem(ENTREGA(a)) || 'null'); } catch (x) { d = null; }
    if (d && a.clave) {
      localStorage.removeItem(ENTREGA(a));  // de un solo uso: la app guarda su propia sesión
      const v = btoa(unescape(encodeURIComponent(JSON.stringify({ k: a.clave, rt: d.rt, at: d.at })))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const [base, hash] = url.split('#');
      url = base + (base.includes('?') ? '&' : '?') + 'cfx-entrar=' + v + (hash ? '#' + hash : '');
    }
    global.open(url, '_blank', 'noopener');
  }

  async function cargar(a) {
    const e = E[a.id] = Object.assign(E[a.id] || {}, { cargando: true, error: '' });
    pintarTarjeta(a);
    try {
      const [vj, conf] = await Promise.all([
        fetch(RAW(a.repo, 'version.json'), { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
        a.propia ? Promise.resolve('') : fetch(RAW(a.repo, a.cfg), { cache: 'no-store' }).then((r) => r.text()).catch(() => '')]);
      e.pub = String(vj.version || '');
      e.nucleo = await fetch(RAW(a.repo, 'nucleo.json'), { cache: 'no-store' }).then((r) => r.json()).then((j) => String(j.nucleo || '')).catch(() => '');
      e.bdPide = vj.bd != null ? String(vj.bd) : a.propia ? String(global.BT_CONFIG.DB_VERSION || '') : ((conf.match(/DB_VERSION\s*:\s*'([^']+)'/) || [])[1] || '');
      if (a.propia) e.url = global.BT_CONFIG.SUPABASE_URL;
      else {
        e.url = (conf.match(/SUPABASE_URL\s*:\s*'([^']+)'/) || [])[1]; e.key = (conf.match(/SUPABASE_ANON_KEY\s*:\s*'([^']+)'/) || [])[1];
        if (!e.url || !e.key) throw new Error('No se pudo leer la configuración de ' + a.repo + ' en GitHub.');
      }
      const c = cliente(a);
      e.conectado = a.propia || !!(await c.auth.getSession()).data.session;
      e.bd = ''; e.lib = ''; e.resumen = null;
      if (a.bd) try { const d = await rpcDe(c, a.bd.rpc); e.bd = String(campo(d, a.bd.campo) ?? ''); } catch (x) { /* no publicada para esta cuenta */ }
      if (a.leer) try { e.lib = String((a.leer.propia ? ((await A.cargarPublica()).config || {}).version_liberada : campo(await rpcDe(c, a.leer.rpc), a.leer.campo)) || ''); } catch (x) { /* nada */ }
      if (e.conectado) try { e.resumen = await rpcDe(c, 'admin_resumen'); } catch (x) { e.error = 'Sin permiso de administrador en esta app (' + x.message + ').'; }
      if (e.conectado && !a.propia && !e.vinculada) vincular(a).catch(() => { /* base aún sin el núcleo nuevo */ });
    } catch (x) { e.error = x.message; }
    e.cargando = false;
    pintarTarjeta(a); pintarCabecera();
  }

  function estadoDe(a) {
    const e = E[a.id] || {};
    const faltaBd = !!(e.bdPide && e.bd && menor(e.bd, e.bdPide));
    const alDia = !!(e.pub && e.lib && !menor(e.lib, e.pub));
    const lista = !!(a.liberar && e.conectado && e.pub && !alDia && !faltaBd);
    return { faltaBd, alDia, lista };
  }
  const NOMBRES = { mrr: 'Ingreso mensual', ingresos_mes: 'Cobrado este mes', premium: 'Pro', pro: 'Pro', en_prueba: 'En prueba', prueba: 'En prueba',
    nuevos7: 'Nuevos 7 días', activos7: 'Activos 7 días', pagos_pendientes: 'Pagos por revisar', convertidos: 'Han pagado' };
  const nombre = (k) => { if (NOMBRES[k]) return NOMBRES[k]; const t = k.replace(/_/g, ' ').replace(/\b7d\b/, '7 días').replace(/\b30d\b/, '30 días'); return t.charAt(0).toUpperCase() + t.slice(1); };
  // Primero lo que más importa: plata, cuentas, Pro, nuevos y activos.
  const PRIORIDAD = [/ingreso|mrr/, /^(usuarios|negocios|talleres|barberias|estacionamientos|empresas|cuentas)$/, /premium|^pro$/, /nuevo/, /activo/, /prueba/, /pago/];
  const peso = (k) => { const i = PRIORIDAD.findIndex((r) => r.test(k)); return i < 0 ? 99 : i; };
  const valor = (k, v) => (/ingreso|mrr|monto|plata/.test(k) ? '$' : '') + Number(v).toLocaleString('es-CL');
  function kpis(r, max) {
    if (!r || typeof r !== 'object') return '';
    const l = Object.keys(r).filter((k) => typeof r[k] === 'number' && !/bytes|_mb$|limite|max|cola/.test(k)).sort((x, y) => peso(x) - peso(y)).slice(0, max || 8);
    return l.length ? '<div class="app-kpis">' + l.map((k) => '<div><b>' + esc(valor(k, r[k])) + '</b><span>' + esc(nombre(k)) + '</span></div>').join('') + '</div>' : '';
  }

  function pintarTarjeta(a) {
    const n = raiz && raiz.querySelector('[data-app="' + a.id + '"]'); if (!n) return;
    const e = E[a.id] || {}, s = estadoDe(a);
    const pill = (t, cls) => '<span class="pill ' + (cls || '') + '">' + t + '</span>';
    const est = e.cargando ? pill('Revisando…') : e.error && !e.pub ? pill('⚠️ Sin datos', 'bad')
      : !a.liberar ? pill('🔁 Se actualiza sola al publicar', 'info') : s.faltaBd ? pill('🗄️ La base se está actualizando sola (máx. 10 min)', 'warn')
      : s.alDia ? pill('✅ Al día', 'ok') : s.lista ? pill('🚀 Lista para liberar v' + esc(e.pub), 'warn') : !e.conectado ? pill('🔌 Conéctate para liberar', 'warn') : pill('Revisa la versión', 'warn');
    n.innerHTML = '<div class="fila"><span class="app-ico">' + A.ico(a.ico, 24) + '</span><div class="grow"><h3 style="margin:0">' + esc(a.nombre) + '</h3>' +
      '<p class="sub" style="margin:2px 0 0">Publicada ' + (e.pub ? 'v' + esc(e.pub) : '—') + (a.liberar ? ' · Liberada ' + (e.lib ? 'v' + esc(e.lib) : '—') : '') +
      ' · Base de datos ' + (e.bd ? 'v' + esc(e.bd) : '—') + (e.bdPide && e.bd && s.faltaBd ? ' (pide v' + esc(e.bdPide) + ')' : '') +
      ' · Núcleo ' + (e.nucleo ? 'v' + esc(e.nucleo) : '—') + (e.nucleo && NUCLEO && e.nucleo !== NUCLEO ? ' <span class="pill warn">falta sincronizar</span>' : '') + '</p></div></div>' +
      '<div style="margin:8px 0">' + est + '</div>' +
      (e.error ? '<p class="sub warn">' + esc(e.error) + '</p>' : '') +
      '<div class="btns-s">' +
        (a.liberar && e.conectado ? '<button type="button" class="small" data-a="lib"' + (s.lista ? '' : ' disabled') + '>' + (s.alDia ? A.ico('check', 15) + ' Liberada' : A.ico('cohete', 15) + ' Liberar v' + esc(e.pub || '?')) + '</button>' : '') +
        (!a.propia && e.url ? (e.conectado ? '<button type="button" class="small ghost" data-a="salir">Desconectar</button>' : '<button type="button" class="small" data-a="con">' + A.ico('enchufe', 15) + ' Conectar</button>') : '') +
        '<button type="button" class="small ghost" data-a="rec" aria-label="Revisar">' + A.ico('refrescar', 15) + '</button>' +
      '</div>';
  }
  function pintarCabecera() {
    const h = raiz && raiz.querySelector('#appsCab'); if (!h) return;
    const listas = APPS.filter((a) => estadoDe(a).lista), bd = APPS.filter((a) => estadoDe(a).faltaBd), ok = APPS.filter((a) => estadoDe(a).alDia || (!a.liberar && E[a.id] && E[a.id].pub));
    h.innerHTML = '<div class="stats"><div class="card"><b>' + APPS.length + '</b><span>Aplicaciones</span></div><div class="card"><b class="ok">' + ok.length + '</b><span>Al día</span></div>' +
      '<div class="card"><b class="warn">' + listas.length + '</b><span>Listas para liberar</span></div><div class="card"><b class="bad">' + bd.length + '</b><span>Falta base de datos</span></div></div>' +
      (listas.length ? '<button type="button" class="block" id="libTodo">' + A.ico('cohete', 18) + ' Liberar todo lo que está listo (' + listas.length + ')</button>' : '');
    const b = h.querySelector('#libTodo');
    if (b) b.onclick = async () => {
      if (!(await confirmar('Se liberan ' + listas.map((a) => a.nombre + ' v' + E[a.id].pub).join(', ') + '. A sus usuarios les aparece el botón Actualizar.', 'Liberar todo'))) return;
      for (const a of listas) await liberar(a, true);
      toast('Listo: ' + listas.length + ' app(s) liberadas');
    };
  }

  async function liberar(a, sinPreguntar) {
    const e = E[a.id];
    if (!sinPreguntar && !(await confirmar('¿Liberar ' + a.nombre + ' v' + e.pub + '? A sus usuarios les aparece el botón Actualizar.', 'Liberar'))) return;
    try { const { error } = await a.liberar(cliente(a), e.pub); if (error) throw new Error(error.message); if (!sinPreguntar) toast(a.nombre + ' v' + e.pub + ' liberada'); }
    catch (x) { toast(a.nombre + ': ' + x.message); }
    await cargar(a);
  }
  // Respaldo y limpieza (funciones cfx_*, iguales en las 6 apps): Excel del admin, lo que se puede borrar y tablas sobrantes.
  const nf = (x) => /Could not find|does not exist|PGRST202/i.test(x.message) ? 'La base de esta app aún no tiene esta función: se actualiza sola en máx. 10 minutos.' : x.message;
  async function respaldar(a) {
    try { CFX_RESPALDO.excel(a.repo.toLowerCase() + '-admin', await rpcDe(cliente(a), 'cfx_respaldo')); E[a.id].respaldado = true; toast('Respaldo de ' + a.nombre + ' descargado'); return true; }
    catch (x) { toast(a.nombre + ': ' + nf(x)); return false; }
  }
  async function limpieza(a) {
    const c = cliente(a), e = E[a.id], bajadas = new Set();
    const d = modal('<div class="fila"><h2 class="grow" style="margin:0">' + A.ico('escoba', 20) + ' ' + esc(a.nombre) + '</h2><button class="small ghost" data-cerrar type="button">Cerrar</button></div>' +
      '<div class="card"><h3>1. Respaldo</h3><p class="sub">Excel con cuentas, pagos, ajustes y registro de esta app. Descárgalo antes de borrar.</p><button type="button" data-r>' + A.ico('bajar', 15) + ' Descargar respaldo (Excel)</button></div>' +
      '<div class="card"><h3>2. Limpieza</h3><div data-l><p class="sub">Revisando…</p></div></div>' +
      '<div class="card"><h3>3. Tablas sobrantes</h3><p class="sub">Restos de versiones antiguas que la app ya no usa. Las vacías se borran con un toque; las que tienen datos piden respaldo y escribir "sí".</p><div data-i><p class="sub">Revisando…</p></div></div>');
    d.querySelector('[data-r]').onclick = () => respaldar(a);
    async function pintar() {
      const L = d.querySelector('[data-l]'), I = d.querySelector('[data-i]');
      try {
        const l = await rpcDe(c, 'cfx_limpieza');
        L.innerHTML = l.map((x) => '<div class="fila" style="padding:6px 0;border-top:1px solid var(--line)"><div class="grow"><b>' + esc(x.titulo) + '</b><div class="sub">' + esc(x.detalle) + ' · ' + Number(x.filas).toLocaleString('es-CL') + ' por borrar</div></div>' +
          '<button type="button" class="small ghost" data-c="' + esc(x.clave) + '" data-t="' + esc(x.titulo) + '"' + (+x.filas ? '' : ' disabled') + '>Borrar</button></div>').join('');
      } catch (x) { L.innerHTML = '<p class="sub warn">' + esc(nf(x)) + '</p>'; }
      try {
        const t = await rpcDe(c, 'cfx_inventario');
        I.innerHTML = t.length ? t.map((x) => '<div class="fila" style="padding:6px 0;border-top:1px solid var(--line)"><div class="grow"><b>' + esc(x.tabla) + '</b><div class="sub">' + (+x.filas ? Number(x.filas).toLocaleString('es-CL') + ' filas' : 'vacía') + '</div></div>' +
          (+x.filas ? '<button type="button" class="small ghost" data-td="' + esc(x.tabla) + '">Respaldo</button>' : '') + '<button type="button" class="small ghost" data-tb="' + esc(x.tabla) + '" data-f="' + x.filas + '">Borrar</button></div>').join('')
          : '<p class="pill ok">✅ Sin tablas sobrantes</p>';
      } catch (x) { I.innerHTML = '<p class="sub warn">' + esc(nf(x)) + '</p>'; }
    }
    d.onclick = async (ev) => {
      const b = ev.target.closest('[data-c],[data-td],[data-tb]'); if (!b) return;
      try {
        if (b.dataset.c) {
          if (!e.respaldado && !(await confirmar('Aún no descargas el respaldo de ' + a.nombre + ' en esta sesión. ¿Borrar igual?', 'Borrar igual'))) return;
          if (!(await confirmar(b.dataset.t + ': se borra lo indicado. No se puede deshacer.', 'Borrar'))) return;
          toast(await rpcDe(c, 'cfx_limpiar', { p_clave: b.dataset.c }) + ' borrados');
        } else if (b.dataset.td) {
          CFX_RESPALDO.json(a.repo.toLowerCase() + '-' + b.dataset.td, await rpcDe(c, 'cfx_inventario_datos', { p_tabla: b.dataset.td })); bajadas.add(b.dataset.td); toast('Respaldo descargado');
        } else {
          let conf = '';
          if (+b.dataset.f) {
            if (!bajadas.has(b.dataset.tb)) return toast('Primero descarga su respaldo');
            const m = modal('<h2>Borrar ' + esc(b.dataset.tb) + '</h2><p class="muted">Tiene ' + b.dataset.f + ' filas. Ya descargaste su respaldo. Escribe <b>sí</b> para borrarla.</p><input id="si" autocomplete="off"><div class="btns"><button class="ghost" data-cerrar type="button">Cancelar</button><button id="sk" type="button">Borrar</button></div>');
            conf = await new Promise((ok) => { let v = null; m.querySelector('#sk').onclick = () => { v = m.querySelector('#si').value; m.close(); }; m.addEventListener('close', () => ok(v)); });
            if (conf === null) return;
          } else if (!(await confirmar('Borrar la tabla vacía ' + b.dataset.tb + '.', 'Borrar'))) return;
          toast(await rpcDe(c, 'cfx_inventario_borrar', { p_tabla: b.dataset.tb, p_confirmacion: conf }));
        }
      } catch (x) { toast(nf(x)); }
      pintar();
    };
    pintar();
  }
  function conectar(a, listo) {
    const d = modal('<h2>Conectar ' + esc(a.nombre) + '</h2><p class="muted">Entra una vez con tu cuenta de administrador de esta app (queda guardada solo en este teléfono). Después manejas todo desde aquí y su panel se abre ya iniciado.</p>' +
      '<label>Correo<input id="ce" type="email" autocomplete="username" value="' + esc((A.cuenta && A.cuenta.email) || '') + '"></label><label>Contraseña<input id="cp" type="password" autocomplete="current-password"></label>' +
      '<p class="err" id="cx"></p><div class="btns"><button class="ghost" data-cerrar type="button">Cancelar</button><button id="cok" type="button">Conectar</button></div>');
    d.querySelector('#cok').onclick = async () => {
      const em = d.querySelector('#ce').value.trim().toLowerCase(), pw = d.querySelector('#cp').value;
      const { error } = await cliente(a).auth.signInWithPassword({ email: em, password: pw });
      if (error) { d.querySelector('#cx').textContent = /invalid/i.test(error.message) ? 'Correo o contraseña incorrectos' : error.message; return; }
      await guardarEntrega(a, em, pw);
      d.close(); toast('Conectado a ' + a.nombre); await cargar(a); if (listo) listo();
    };
  }
  function render(el) {
    raiz = el;
    el.innerHTML = '<div class="titulo-v"><h2>Mis aplicaciones</h2><button type="button" class="small ghost" id="appsTodo">' + A.ico('refrescar', 15) + ' Revisar todas</button></div>' +
      '<p class="sub">La base de cada app se actualiza sola. Cuando una versión nueva esté lista, pruébala y toca 🚀 Liberar (o Liberar todo): a sus usuarios se les actualiza sola.</p>' +
      '<div id="appsCab"></div>' + APPS.map((a) => '<div class="card app-card" data-app="' + a.id + '"></div>').join('');
    el.querySelector('#appsTodo').onclick = () => APPS.forEach(cargar);
    el.onclick = (ev) => {
      const b = ev.target.closest('[data-a]'), c = ev.target.closest('[data-app]'); if (!b || !c) return;
      const a = APPS.find((x) => x.id === c.dataset.app), act = b.dataset.a;
      if (act === 'lib') liberar(a);
      else if (act === 'con') conectar(a);
      else if (act === 'salir') cliente(a).auth.signOut().then(() => cargar(a));
      else if (act === 'rec') cargar(a);
      else if (act === 'limp') limpieza(a);
      else if (act === 'adm') abrirAdmin(a);
    };
    pintarCabecera();
    APPS.forEach(cargar);
  }
  // Para el panel de Pagos: deja listas (y conectadas, si ya entraste) las 6 apps sin pintar las tarjetas.
  const preparar = () => Promise.all(APPS.filter((a) => !E[a.id] || !E[a.id].url).map(cargar));
  global.MisApps = { render, APPS, cliente, estado: E, preparar, conectar, rpcDe, abrirAdmin, vincular, kpis, nombre, valor, peso, respaldar, limpieza };
})(window);
