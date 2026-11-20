/* Centro de Mando · Mis aplicaciones: solo para liberar. Una tarjeta por app con su versión, base de datos y núcleo,
   conectar y liberar. Abrir la app, su panel, respaldo y números están en Resumen → Empresas.
   La versión y la configuración pública (URL y clave anon de Supabase) se leen del repositorio en GitHub;
   para ver el rendimiento y liberar te conectas una vez con tu cuenta de administrador de cada app. */
(function (global) {
  'use strict';
  const A = global.App, { esc, toast, modal, confirmar } = A;
  const RAW = (repo, ruta, rama) => 'https://raw.githubusercontent.com/CodeFixService/' + repo + '/' + (rama || 'main') + '/' + ruta + '?t=' + Date.now();
  // 🧪 Probar: los cambios nuevos se suben primero a la rama fija "pruebas" de cada repo. Cloudflare Workers Builds la publica en
  // https://pruebas-<worker>.<cuenta>.workers.dev (vista previa, con la misma base real). Se prueba ahí y después pasa a main → Liberar.
  const RAMA_PRUEBAS = 'pruebas', CUENTA_WORKERS = 'juanjosuecastilloloyola.workers.dev';
  // G26 · 🧪 Ramas de prueba APAGADAS por ahora (Josué las prende al terminar todas las apps: cambiar a true). Con false no se lee la rama
  // "pruebas" ni aparecen 🧪 Probar / ✅ Confirmar / ↩️ Deshacer. (localStorage cm-ramas='1' las prende solo en ese navegador, para pruebas.)
  const RAMAS_PRUEBA = false;
  const ramas = () => { if (RAMAS_PRUEBA) return true; try { return localStorage.getItem('cm-ramas') === '1'; } catch (x) { return false; } };
  const urlPrueba = (a) => 'https://' + RAMA_PRUEBAS + '-' + a.worker + '.' + CUENTA_WORKERS + '/';
  // G24 · 🧹 Limpiar y abrir (G26: está en Resumen → Empresas, tarjeta de cada app): abre la app publicada (main) borrando caché, service worker, datos guardados y sesión (núcleo carga.js ?cfx-cero), como en incógnito.
  const urlLimpia = (a) => 'https://' + a.worker + '.' + CUENTA_WORKERS + '/?cfx-limpio=1&cfx-cero=1';
  // 🧪 Probar abre con ?cfx-limpio: la app borra su caché y service worker al entrar (como incógnito, sin versiones viejas; núcleo carga.js).
  // ✅ Confirmar se habilita después de abrir 🧪 Probar al menos una vez (por versión). ↩️ Deshacer siempre.
  const PROBO = (a) => 'cm-probo-' + a.id;
  const probo = (a) => { try { return localStorage.getItem(PROBO(a)) === String((E[a.id].prueba || {}).version); } catch (x) { return false; } };
  const campo = (o, ruta) => !ruta ? o : ruta.split('.').reduce((x, k) => (x == null ? x : x[k]), o);

  // Cómo se lee y se libera la versión en cada app (cada una lo guarda a su manera).
  const APPS = [
    { id: 'cm', nombre: 'Centro de Mando', ico: 'diana', repo: 'SaaS', propia: true, worker: 'saas', sub: 'cm', admin: 'admin/',
      bd: { rpc: 'db_version' }, leer: { propia: true },
      liberar: (c, v) => c.rpc('admin_config_guardar', { p_clave: 'version_liberada', p_valor: v, p_motivo: 'Liberar desde Mis aplicaciones' }) },
    { id: 'billetera', nombre: 'Billetera · Libreta de Cobros', ico: 'billetera', clave: 'lc-auth', repo: 'Emprendedor', cfg: 'js/config.js', worker: 'emprendedor', sub: 'billetera', admin: 'admin/',
      bd: { rpc: 'config_publica', campo: 'version_bd' }, leer: { rpc: 'config_publica', campo: 'version_liberada' },
      liberar: (c, v) => c.rpc('admin_guardar_ajustes', { p: { version_liberada: v } }) },
    { id: 'aplicaciones', nombre: 'Despega Pyme · Tienda, caja y pedidos', ico: 'bolsa', clave: 'cfx-auth', repo: 'Aplicaciones', cfg: 'shared/config.js', worker: 'aplicaciones', sub: 'despega', admin: 'apps/admin/',
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
      liberar: (c, v) => c.rpc('admin_guardar_textos', { p: { version_liberada: v } }) }
    // G112: Cerebro (contenido) retirado: su base se perdió y su motor vive en el CM (🎬 Estudio). Josué lo saca de Cloudflare.
  ];
  // Link de cada app: lo arma el núcleo (CFX_AYUDA.web) según dónde se abre el Centro de Mando.
  APPS.forEach((a) => { Object.defineProperty(a, 'web', { get: () => global.CFX_AYUDA.web(a.worker, a.sub) }); });
  let NUCLEO = ''; // versión del núcleo del Centro de Mando (la que se reparte a todas)
  // El núcleo más nuevo = el mayor entre el del CM y el que tiene cada app en GitHub (así nunca marca "en su turno" a una app que ya está igual o más nueva).
  const vcmp = (x, y) => { const p = String(x).split('.').map(Number), q = String(y).split('.').map(Number); for (let i = 0; i < Math.max(p.length, q.length); i++) { const d = (p[i] || 0) - (q[i] || 0); if (d) return d; } return 0; };
  const nucleoMax = () => Object.values(E).map((x) => x && x.nucleo).filter(Boolean).reduce((m, v) => (!m || vcmp(v, m) > 0 ? v : m), NUCLEO);
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
      e.pub = String(vj.version || ''); e.notas = String(vj.notas || '');
      e.prueba = !ramas() ? null : await fetch(RAW(a.repo, 'version.json', RAMA_PRUEBAS), { cache: 'no-store' }).then((r) => r.ok ? r.json() : null).catch(() => null);
      if (e.prueba && !(e.prueba.version && (!e.pub || menor(e.pub, String(e.prueba.version))))) e.prueba = null;  // rama igual o más vieja que main: nada que probar
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
      e.modulos = null;
      if (e.conectado) try { e.modulos = await rpcDe(c, 'cfx_modulos_admin'); } catch (x) { /* base sin módulos del núcleo */ }
      if (e.conectado && !a.propia && !e.vinculada) vincular(a).catch(() => { /* base aún sin el núcleo nuevo */ });
      if (e.conectado && !e.bdProg && e.bdPide && e.bd && menor(e.bd, e.bdPide)) rpcDe(c, 'cfx_actualizar_ahora', { p_programar: false }).then((r) => { const d = causaBd(r); e.bdMal = d.mal; e.bdMsg = d.t; pintarTarjeta(a); }).catch(() => {});
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
      ' · Núcleo ' + (e.nucleo ? 'v' + esc(e.nucleo) : '—') + (e.nucleo && nucleoMax() && vcmp(e.nucleo, nucleoMax()) < 0 ? ' <span class="pill info" title="Esta app tiene un núcleo más antiguo; el nuevo le llega en su turno (lo hace Claude). No tienes que hacer nada.">v' + esc(nucleoMax()) + ' en su turno</span>' : '') + '</p></div></div>' +
      '<div style="margin:8px 0">' + est + '</div>' +
      (e.prueba ? '<p class="sub" data-prueba style="margin:0 0 8px">🧪 En pruebas: v' + esc(e.prueba.version) + (e.prueba.notas ? ' · ' + esc(e.prueba.notas) : '') + '</p>' : '') +
      (e.error ? '<p class="sub warn">' + esc(e.error) + '</p>' : '') +
      (e.bdMsg && (s.faltaBd || e.bdManual) ? '<p class="sub' + (e.bdMal ? ' warn' : '') + '">' + esc(e.bdMsg) + '</p>' : '') +
      '<div class="btns-s">' +
        (e.prueba ? '<a class="btn small" data-a="probar" href="' + urlPrueba(a) + '?cfx-limpio=' + encodeURIComponent(e.prueba.version) + '&cfx-cero=1" target="_blank" rel="noopener">🧪 Probar v' + esc(e.prueba.version) + '</a>' +
          '<button type="button" class="small" data-a="pconf"' + (probo(a) && !e.pBusy ? '' : ' disabled') + ' title="Primero ábrela con 🧪 Probar">' + (e.pBusy === 'confirmar' ? 'Confirmando…' : '✅ Confirmar') + '</button>' +
          '<button type="button" class="small ghost" data-a="pdes"' + (e.pBusy ? ' disabled' : '') + '>' + (e.pBusy === 'deshacer' ? 'Deshaciendo…' : '↩️ Deshacer') + '</button>' : '') +
        (a.liberar && e.conectado && !global.CM_SOCIO ? '<button type="button" class="small" data-a="lib"' + (s.lista && !e.liberando ? '' : ' disabled') + '>' + (e.liberando ? 'Liberando…' : s.alDia ? A.ico('check', 15) + ' Liberada' : A.ico('cohete', 15) + ' Liberar v' + esc(e.pub || '?')) + '</button>' : '') +
        // G34 · 🧭 Panel universal: el panel de administrador de la app, aquí mismo (sin entrar a la app). Cerebro no.
        (e.conectado && !a.propia && a.id !== 'contenido' && global.PanelApps ? '<button type="button" class="small" data-a="panel">🧭 Panel</button>' : '') +
        (e.conectado ? '<button type="button" class="small' + (s.faltaBd ? '' : ' ghost') + '" data-a="bd" title="Corre auto_actualizar() en la base de esta app"' + (e.bdProg ? ' disabled' : '') + '>' + (e.bdProg ? 'Actualizando la base…' : '⚡ Actualizar base ahora') + '</button>' : '') +
        (!a.propia && e.url ? (e.conectado ? '<button type="button" class="small ghost" data-a="salir">Desconectar</button>' : '<button type="button" class="small" data-a="con">' + A.ico('enchufe', 15) + ' Conectar</button>') : '') +
        (e.conectado && e.modulos && e.modulos.length ? '<button type="button" class="small ghost" data-a="mod">🧩 Módulos</button>' : '') +
        // G42g: Ver app y Respaldo y limpieza pasaron de Resumen → Empresas a aquí.
        '<a class="btn small ghost" data-a="ver" href="' + esc(a.web) + '" target="_blank" rel="noopener">' + A.ico('abrir', 15) + ' Ver app</a>' +
        (e.conectado ? '<button type="button" class="small ghost" data-a="limp">' + A.ico('escoba', 15) + ' Respaldo y limpieza</button>' : '') +
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
      const pregunta = 'Se liberan ' + listas.length + ' app(s). A sus usuarios les aparece el botón Actualizar.', fil = listas.map((a) => ({ t: a.nombre, d: 'v' + E[a.id].pub }));  // G113 a: lista hacia abajo
      if (!(await (global.CFX_DIALOGO ? global.CFX_DIALOGO.confirmar(pregunta, { si: 'Liberar todo', lista: fil }) : confirmar(pregunta + '\n' + fil.map((f) => '• ' + f.t + ' ' + f.d).join('\n'), 'Liberar todo')))) return;
      for (const a of listas) await liberar(a, true);
      toast('Listo: ' + listas.length + ' app(s) liberadas');
    };
  }

  // Liberar: queda para todos y les llega "🚀 Nueva versión disponible" (push) con una línea de novedades
  // (la de version.json → "notas", que se puede cambiar antes de liberar). El aviso sale una sola vez por versión.
  const corto = (a) => a.nombre.split(' · ')[0];
  // G44b: el aviso a los usuarios dice SOLO categorías (casillas). El detalle queda en el CM (📜 Registro), nunca les llega.
  const CATS = [['seg', '🔒', 'Seguridad', /seguridad|🔒/i], ['func', '⚙️', 'Funcionamiento', /funcionamiento|⚙/i], ['sis', '🖥️', 'Sistema', /sistema|🖥/i],
    ['mej', '✏️', 'Mejoras', /mejora|✏/i], ['pre', '🎁', 'Premios/novedades', /premio|novedad|🎁/i]];
  function pedirNotas(a, e) {
    return new Promise((ok) => {
      let r = null;
      const d = modal('<h2 style="margin:0 0 6px">' + A.ico('cohete', 20) + ' Liberar ' + esc(corto(a)) + ' v' + esc(e.pub) + '</h2>' +
        '<p class="sub" style="margin:0 0 10px">A todos les llega "🔄 Nueva versión" con las categorías que marques (no ven qué se hizo).</p>' +
        '<div class="cats-lib" style="display:grid;gap:4px">' + CATS.map(([k, ico, t, re]) => '<label class="fila" style="gap:8px;align-items:center;padding:6px 0"><input type="checkbox" data-cat="' + k + '" style="width:auto"' + (re.test(e.notas || '') ? ' checked' : '') + '> <span>' + ico + ' ' + t + '</span></label>').join('') + '</div>' +
        '<label for="libDet" style="margin-top:8px">📝 Detalle <span class="sub">(solo lo ves tú, en 📜 Registro)</span></label>' +
        '<input id="libDet" maxlength="400" placeholder="Ej: arreglé el dominio">' +
        '<div class="btns" style="margin-top:12px"><button class="ghost" data-no type="button">Cancelar</button><button data-si type="button">Liberar</button></div>');
      d.querySelector('[data-no]').onclick = () => d.close();
      d.querySelector('[data-si]').onclick = () => {
        const marc = CATS.filter(([k]) => d.querySelector('[data-cat="' + k + '"]').checked);
        r = { notas: marc.map(([, ico, t]) => ico + ' ' + t).join(' · '), detalle: d.querySelector('#libDet').value.trim() };
        d.close();
      };
      d.addEventListener('close', () => ok(r));
    });
  }
  // Nunca queda "pegado": si la app no responde en 20 s se avisa y se vuelve a revisar.
  const aTiempo = (p, ms) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error('no respondió en ' + ms / 1000 + ' s (revisa la conexión o vuelve a conectarte)')), ms))]);
  async function liberar(a, sinPreguntar) {
    const e = E[a.id];
    const sel = sinPreguntar ? { notas: e.notas || '', detalle: '' } : await pedirNotas(a, e);
    if (sel === null) return;
    e.liberando = true; pintarTarjeta(a);
    try {
      const { error } = await aTiempo(a.liberar(cliente(a), e.pub), 20000); if (error) throw new Error(error.message);
      let n = 0;
      try { const r = await cliente(a).rpc('cfx_avisar_version', { p_version: e.pub, p_notas: sel.notas, p_app: corto(a), p_detalle: sel.detalle }); if (!r.error) n = r.data || 0; } catch (x) { /* base aún sin la función: se avisa la próxima */ }
      if (!sinPreguntar) toast(corto(a) + ' v' + e.pub + ' liberada' + (n ? ' · aviso a ' + n : ''));
    } catch (x) { toast(a.nombre + ': ' + x.message); }
    e.liberando = false;
    await cargar(a);
    if (!estadoDe(a).alDia && e.conectado && !e.error) toast(corto(a) + ': se guardó, pero sigue leyendo v' + (e.lib || '—') + '. Toca ↻ en un rato.');
  }
  // Base atrasada: programa la actualización en el servidor (máx. 1 minuto) y muestra el resultado real de auto_actualizar().
  function causaBd(r) {
    const u = (r.ultimos || [])[0], t = (r.tareas || []).find((x) => /auto/.test(x.nombre));
    if (u && /sin cambios|no disponible/i.test(u.detalle)) return { mal: true, t: 'Último intento: ' + u.detalle };
    if (!t) return { mal: true, t: 'Esta base no tiene la tarea de actualización automática (pg_cron). Pega una vez el instalar-corto.sql de la app en su Supabase.' };
    if (t.ok === false) return { mal: true, t: 'La tarea automática falló: ' + (t.error || 'sin detalle') };
    return { mal: false, t: u ? 'Último intento: ' + u.detalle : 'Se revisa sola cada 10 min.' };
  }
  async function actualizarBase(a) {
    const e = E[a.id], c = cliente(a);
    e.bdProg = true; e.bdManual = true; pintarTarjeta(a);
    try {
      const r = await aTiempo(rpcDe(c, 'cfx_actualizar_ahora', { p_programar: true }), 15000);
      if (r.programada !== 'ok') { e.bdMal = true; e.bdMsg = 'No se pudo programar (' + r.programada + '). En Supabase → Database → Extensions activa pg_cron y http, y pega el instalar-corto.sql de la app.'; }
      else { e.bdMal = false; e.bdMsg = 'Programada: la base se actualiza en máx. 1 minuto. Se revisa sola.'; toast(corto(a) + ': actualizando la base…'); }
      pintarTarjeta(a);
      if (r.programada === 'ok') {
        await new Promise((ok) => setTimeout(ok, 75000));
        await cargar(a);
        if (estadoDe(a).faltaBd) { const d = causaBd(await rpcDe(c, 'cfx_actualizar_ahora', { p_programar: false })); e.bdMal = d.mal; e.bdMsg = d.t; }
        else { e.bdMal = false; e.bdMsg = 'Base al día ✓ (auto_actualizar corrió).'; toast(corto(a) + ': base al día ✓'); }
      }
    } catch (x) { e.bdMal = true; e.bdMsg = /Could not find|does not exist|PGRST202/i.test(x.message) ? 'Esta base aún no tiene "Actualizar ahora": pega una vez el instalar-corto.sql de la app en su Supabase.' : x.message; }
    e.bdProg = false; pintarTarjeta(a);
  }
  // 🧪 Confirmar (pruebas → main) o Deshacer (pruebas vuelve a main). Lo hace la base del CM con el token de GitHub (cm_pruebas).
  async function accionPrueba(a, acc) {
    const e = E[a.id], v = (e.prueba || {}).version;
    const txt = acc === 'confirmar' ? 'La v' + v + ' de ' + corto(a) + ' pasa a la versión publicada (main). Cloudflare la publica en 1-2 minutos y después tocas 🚀 Liberar.'
      : 'Se descarta lo que está en pruebas (v' + v + ') de ' + corto(a) + '. La versión publicada no cambia.';
    if (!(await confirmar(txt, acc === 'confirmar' ? '✅ Confirmar' : '↩️ Deshacer'))) return;
    e.pBusy = acc; pintarTarjeta(a);
    try {
      await rpcDe(A.sb, 'cm_pruebas', { p_repo: a.repo, p_accion: acc });
      toast(corto(a) + (acc === 'confirmar' ? ': v' + v + ' pasó a main. En unos minutos aparece 🚀 Liberar (toca ↻).' : ': pruebas descartada.'));
      e.prueba = null;
    } catch (x) {
      if (/token de GitHub/i.test(x.message)) { toast('Primero guarda el token de GitHub'); tokenGitHub(); }
      else toast(corto(a) + ': ' + (/Could not find|PGRST202/i.test(x.message) ? 'actualiza la base del Centro de Mando (⚡ Actualizar base ahora).' : x.message));
    }
    e.pBusy = null; pintarTarjeta(a);
    setTimeout(() => cargar(a), 4000);
  }
  async function tokenGitHub() {
    let tiene = false; try { tiene = (await rpcDe(A.sb, 'cm_github')).token; } catch (x) { /* base sin la función aún */ }
    const d = modal('<h2 style="margin:0 0 6px">🔑 Token de GitHub</h2>' +
      '<p class="sub">Para ✅ Confirmar y ↩️ Deshacer. ' + (tiene ? 'Ya hay uno guardado; pega otro para cambiarlo o deja vacío para borrarlo.' : 'Aún no hay uno guardado.') + '</p>' +
      '<p class="sub">GitHub → foto → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token. ' +
      'Resource owner: CodeFixService · Repository access: All repositories · Permissions → Contents: Read and write. Copia el token (empieza con github_pat_).</p>' +
      '<input id="ghT" type="password" placeholder="github_pat_…" autocomplete="off" style="width:100%">' +
      '<div class="btns" style="margin-top:12px"><button class="ghost" data-no type="button">Cancelar</button><button data-si type="button">Guardar</button></div>');
    d.querySelector('[data-no]').onclick = () => d.close();
    d.querySelector('[data-si]').onclick = async () => {
      try { const r = await rpcDe(A.sb, 'cm_github_guardar', { p_token: d.querySelector('#ghT').value }); toast(r.token ? 'Token guardado 🔑' : 'Token borrado'); d.close(); }
      catch (x) { toast(x.message); }
    };
  }
  // Respaldo y limpieza (funciones cfx_*, iguales en las 7 apps): Excel del admin, lo que se puede borrar y tablas sobrantes.
  const nf = (x) => /Could not find|does not exist|PGRST202/i.test(x.message) ? 'La base de esta app aún no tiene esta función: se actualiza sola en máx. 10 minutos.' : x.message;
  async function respaldar(a) {
    try { CFX_RESPALDO.excel(a.repo.toLowerCase() + '-admin', await rpcDe(cliente(a), 'cfx_respaldo')); E[a.id].respaldado = true; toast('Respaldo de ' + a.nombre + ' descargado'); return true; }
    catch (x) { toast(a.nombre + ': ' + nf(x)); return false; }
  }
  async function limpieza(a) {
    const c = cliente(a), e = E[a.id], bajadas = new Set();
    const d = modal('<div class="fila"><h2 class="grow" style="margin:0">' + A.ico('escoba', 20) + ' ' + esc(a.nombre) + '</h2><button class="small ghost" data-cerrar type="button">Cerrar</button></div>' +
      '<div class="card"><h3>1. Respaldo</h3><p class="sub">Excel con cuentas, pagos, ajustes y registro de esta app. Descárgalo antes de borrar.</p><button type="button" data-r>' + A.ico('bajar', 15) + ' Descargar respaldo (Excel)</button></div>' +
      '<div class="card" data-cero><h3>↺ Ingresos de prueba</h3><p class="sub">Deja en $0 los ingresos de los resúmenes de esta app (los pagos NO se borran: quedan en el historial). Se puede deshacer.</p><p class="sub" data-cero-txt>Revisando…</p><div class="btns"><button type="button" class="small" data-cero-si disabled>↺ Volver a cero</button><button type="button" class="small ghost hidden" data-cero-no>Contar todo otra vez</button></div></div>' +
      '<div class="card"><h3>2. Limpieza</h3><label class="fila" style="gap:8px;align-items:center;padding:4px 0 8px"><input type="checkbox" data-auto style="width:auto" disabled> <span class="grow"><b>🌙 Limpieza automática cada noche</b><span class="sub" data-auto-txt style="display:block">Revisando…</span></span></label><div data-l><p class="sub">Revisando…</p></div></div>' +
      '<div class="card"><h3>3. Tablas sobrantes</h3><p class="sub">Restos de versiones antiguas que la app ya no usa. Las vacías se borran con un toque; las que tienen datos piden respaldo y escribir "sí".</p><div data-i><p class="sub">Revisando…</p></div></div>');
    d.querySelector('[data-r]').onclick = () => respaldar(a);
    // G87 E · ↺ ingresos a cero (núcleo cfx_ingresos_cero: solo admin, queda en el Registro; no borra pagos).
    const cero = d.querySelector('[data-cero]');
    function pintarCero(r) {
      const t = cero.querySelector('[data-cero-txt]'), si = cero.querySelector('[data-cero-si]'), no = cero.querySelector('[data-cero-no]');
      if (!r || r.error) { t.textContent = (r && r.error) || 'Sin respuesta.'; si.disabled = true; no.classList.add('hidden'); return; }
      t.textContent = r.desde ? '✅ Cuenta desde el ' + new Date(r.desde).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' }) + '.' : 'Hoy cuenta todo el historial.';
      si.disabled = false; no.classList.toggle('hidden', !r.desde);
    }
    rpcDe(c, 'cfx_ingresos_cero', { p_cero: null }).then(pintarCero, (x) => pintarCero({ error: nf(x) }));
    cero.querySelector('[data-cero-si]').onclick = async () => {
      if (!(await confirmar('↺ ' + a.nombre + ': los ingresos de los resúmenes quedan en $0 desde ahora. Los pagos no se borran.', 'Volver a cero'))) return;
      try { pintarCero(await rpcDe(c, 'cfx_ingresos_cero', { p_cero: true })); toast('↺ Ingresos de ' + a.nombre + ' en $0'); } catch (x) { toast(nf(x)); }
    };
    cero.querySelector('[data-cero-no]').onclick = async () => {
      try { pintarCero(await rpcDe(c, 'cfx_ingresos_cero', { p_cero: false })); toast('Vuelve a contar todo el historial'); } catch (x) { toast(nf(x)); }
    };
    async function pintar() {
      const L = d.querySelector('[data-l]'), I = d.querySelector('[data-i]');
      try {
        const l = await rpcDe(c, 'cfx_limpieza');
        L.innerHTML = l.map((x) => '<div class="fila" style="padding:6px 0;border-top:1px solid var(--line)"><div class="grow"><b>' + esc(x.titulo) + (x.auto ? ' <span class="pill ok" style="font-size:11px">🌙 auto</span>' : '') + '</b><div class="sub">' + esc(x.detalle) + ' · ' + Number(x.filas).toLocaleString('es-CL') + ' por borrar</div></div>' +
          '<button type="button" class="small ghost" data-c="' + esc(x.clave) + '" data-t="' + esc(x.titulo) + '"' + (+x.filas ? '' : ' disabled') + '>Borrar</button></div>').join('');
      } catch (x) { L.innerHTML = '<p class="sub warn">' + esc(nf(x)) + '</p>'; }
      pintarAuto(await rpcDe(c, 'cfx_limpieza_auto_ver').catch((x) => ({ error: nf(x) })));
      try {
        const t = await rpcDe(c, 'cfx_inventario');
        I.innerHTML = t.length ? t.map((x) => '<div class="fila" style="padding:6px 0;border-top:1px solid var(--line)"><div class="grow"><b>' + esc(x.tabla) + '</b><div class="sub">' + (+x.filas ? Number(x.filas).toLocaleString('es-CL') + ' filas' : 'vacía') + '</div></div>' +
          (+x.filas ? '<button type="button" class="small ghost" data-td="' + esc(x.tabla) + '">Respaldo</button>' : '') + '<button type="button" class="small ghost" data-tb="' + esc(x.tabla) + '" data-f="' + x.filas + '">Borrar</button></div>').join('')
          : '<p class="pill ok">✅ Sin tablas sobrantes</p>';
      } catch (x) { I.innerHTML = '<p class="sub warn">' + esc(nf(x)) + '</p>'; }
    }
    // 🌙 Núcleo (C18): lo marcado "auto" se borra solo cada noche (~4:40 de Chile) si está prendida.
    function pintarAuto(r) {
      const k = d.querySelector('[data-auto]'), t = d.querySelector('[data-auto-txt]');
      if (r.error) { k.disabled = true; t.textContent = r.error; return; }
      k.disabled = false; k.checked = !!r.activo;
      t.textContent = (r.activo ? 'Prendida: borra sola lo marcado 🌙 auto.' : 'Apagada: lo marcado 🌙 auto solo se borra a mano.') +
        (r.ultima ? ' Última: ' + new Date(r.ultima).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' }) + ' · ' + (r.filas || 0) + ' borradas.' : ' Aún no corre.');
    }
    d.querySelector('[data-auto]').onchange = async (ev) => {
      ev.target.disabled = true;
      try { pintarAuto(await rpcDe(c, 'cfx_limpieza_auto_guardar', { p_activo: ev.target.checked })); toast('🌙 Limpieza automática ' + (ev.target.checked ? 'prendida' : 'apagada')); }
      catch (x) { toast(nf(x)); ev.target.checked = !ev.target.checked; ev.target.disabled = false; }
    };
    d.onclick = async (ev) => {
      const b = ev.target.closest('[data-c],[data-td],[data-tb]'); if (!b) return;
      try {
        if (b.dataset.c) {
          if (!e.respaldado && !(await confirmar('Aún no descargas el respaldo de ' + a.nombre + ' en esta sesión. ¿Borrar igual?', 'Borrar igual'))) return;
          if (!(await confirmar(b.dataset.t + ': se borra lo indicado. No se puede deshacer.', 'Borrar'))) return;
          if (b.dataset.c === 'n_fotos_cuentas') {
            // G131 b: fotos de cuentas borradas → se borran por la API de Storage (el servidor ya sacó las que algo aún usa).
            const lista = (await rpcDe(c, 'cfx_fotos_sin_cuenta')) || []; let n = 0;
            for (let i = 0; i < lista.length; i += 100) {
              const { data, error } = await c.storage.from('vitrina').remove(lista.slice(i, i + 100));
              if (error) throw new Error(error.message);
              n += (data || []).length;
            }
            toast(n + ' fotos borradas' + (n < lista.length ? ' (' + (lista.length - n) + ' no se pudieron)' : ''));
          } else toast(await rpcDe(c, 'cfx_limpiar', { p_clave: b.dataset.c }) + ' borrados');
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
  // 🧩 Módulos (núcleo: cfx_modulos_admin / cfx_modulo_guardar): prender o apagar chat, calificaciones, cupones… en esta app.
  // G19 (modulos_venta.sql): venderlos por negocio (precio, packs, prueba gratis, links de monto fijo), ver quién los tiene y regalar.
  function modulos(a) {
    const e = E[a.id], c = cliente(a), $p = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('es-CL');
    const d = modal('<h2>🧩 Módulos de ' + esc(corto(a)) + '</h2><p class="muted">Apagado: sus botones desaparecen de la app y el servidor no lo deja usar. Los datos no se borran.</p>' +
      '<div id="venta"></div><div id="mods"></div><div id="ventaMas"></div>' +
      '<div class="btns"><button class="ghost" data-cerrar type="button">Cerrar</button></div>');
    let V = null;  // cfx_venta_admin (null = la base aún no tiene el G19)
    const num = (id) => { const x = d.querySelector('#' + id); return x && x.value.trim() !== '' ? Math.round(Number(x.value)) : null; };
    // G74 b · 🎁 Campaña de lanzamiento: módulos + meses de regalo + fecha de término (se apaga sola ese día).
    const hoy = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    const enDias = (n) => new Date(Date.now() - new Date().getTimezoneOffset() * 60000 + n * 864e5).toISOString().slice(0, 10);
    const dma = (f) => f ? f.split('-').reverse().join('/') : '';
    const campana = (cfg) => {
      const C = cfg.campana || null, sel = (C && C.modulos) || [], meses = (C && C.meses) || 3;
      const mods = (V.catalogo || []).filter((x) => (e.modulos.find((m) => m.clave === x.clave) || {}).activo);
      return '<div class="card" id="campCard"><h3>🎁 Campaña de lanzamiento</h3>' +
        '<p class="sub">' + (V.campana_on ? '🟢 Activa hasta el ' + esc(dma(C.hasta)) + ' · ' + (V.campana_usos || 0) + ' negocio(s) ya la activaron.'
          : C ? '⚪ Terminó el ' + esc(dma(C.hasta)) + ' · ' + (V.campana_usos || 0) + ' negocio(s) la activaron. Ellos siguen con su regalo hasta su fecha.'
          : 'Elige módulos y meses de regalo. El negocio toca 🎁 Activar gratis y lo tiene al tiro. El día de término se apaga sola.') + '</p>' +
        (mods.length > 1 ? '<label class="fila" style="gap:8px;align-items:center;margin:4px 0"><input type="checkbox" id="cTodos"' + (mods.every((x) => sel.includes(x.clave)) ? ' checked' : '') + '><b class="grow">✅ Todos los módulos</b></label>' : '') +
        (mods.length ? '<div style="display:grid;gap:2px;margin:6px 0">' + mods.map((x) => '<label class="fila" style="gap:8px;align-items:center;min-width:0;margin:4px 0"><input type="checkbox" data-camp="' + esc(x.clave) + '"' +
          (sel.includes(x.clave) ? ' checked' : '') + '><span class="grow" style="min-width:0;overflow-wrap:anywhere">' + esc(x.nombre) + '</span></label>').join('') + '</div>' : '<p class="sub">Prende algún módulo arriba.</p>') +
        // G81 a: meses y término con botones de un toque (sin listas de Android); la fecha exacta queda como opción.
        '<p class="sub" style="margin:10px 0 4px"><b>Meses de regalo</b> (3 = sugerido)</p><input type="hidden" id="cMeses" value="' + meses + '">' +
        '<div class="cfx-chips" data-grupo="cMeses">' + [1, 3, 6, 12].map((n) => '<button type="button" class="cfx-chip' + (n === meses ? ' on' : '') + '" data-v="' + n + '">' + n + (n === 1 ? ' mes' : ' meses') + '</button>').join('') + '</div>' +
        '<p class="sub" style="margin:10px 0 4px"><b>Dura</b> (se apaga sola)</p>' +
        '<div class="cfx-chips" data-grupo="cHasta">' + [15, 30, 60, 90].map((n) => '<button type="button" class="cfx-chip" data-v="' + enDias(n) + '">' + n + ' días</button>').join('') + '</div>' +
        '<label>Termina el<input id="cHasta" type="date" min="' + hoy() + '" value="' + esc(V.campana_on ? C.hasta : enDias(30)) + '"></label>' +
        '<p class="err" id="cErr"></p><div class="btns" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr))">' +
        (V.campana_on ? '<button type="button" class="ghost" id="cFin">⏹️ Terminar hoy</button>' : '') +
        '<button type="button" id="cOk"' + (V.campana_on ? '' : ' style="grid-column:1/-1"') + '>' + (V.campana_on ? '💾 Guardar' : '🎁 Lanzar campaña') + '</button></div></div>';
    };
    const pintar = () => {
      const cfg = (V && V.config) || {}, on = !!cfg.activo, pr = cfg.precios || {}, L = cfg.links || {};
      d.querySelector('#venta').innerHTML = !V ? '' :
        '<div class="card"><label class="fila" style="gap:10px;align-items:center"><input type="checkbox" id="vOn"' + (on ? ' checked' : '') + '>' +
        '<span class="grow"><b>💰 Vender módulos por negocio</b><br><span class="sub">Cada negocio (Free o Premium) compra o prueba los que quiere. Apagado: todos usan lo prendido, como antes.</span></span></label>' +
        (on ? '<p class="sub">Ahora: ' + V.activos + ' negocio(s) pagando · ' + V.pruebas + ' probando gratis.</p>' : '') + '</div>';
      d.querySelector('#mods').innerHTML = e.modulos.map((m) => '<label class="fila" style="gap:10px;margin:8px 0;align-items:flex-start"><input type="checkbox" data-m="' + esc(m.clave) + '"' + (m.activo ? ' checked' : '') + '>' +
        '<span class="grow" style="min-width:0"><b>' + esc(m.nombre) + '</b><br><span class="sub">' + esc(m.detalle) + '</span>' +
        (on ? '<br><span class="sub">' + (m.negocios || 0) + ' negocio(s) lo tienen</span>' : '') + '</span>' +
        (on ? '<input data-pr="' + esc(m.clave) + '" inputmode="numeric" style="width:92px" aria-label="Precio al mes de ' + esc(m.nombre) + '" placeholder="' + esc(String(cfg.precio || 0)) + '" value="' + (m.clave in pr ? esc(String(pr[m.clave])) : '') + '">' : '') +
        '</label>').join('') + (on ? '<p class="sub">Precio al mes de cada uno (vacío = precio base; 0 = incluido gratis para todos).</p>' : '');
      const items = V ? Object.entries(cfg.packs || {}).map(([k, p]) => [k, p.nombre]).concat((V.catalogo || []).map((x) => [x.clave, x.nombre])) : [];
      d.querySelector('#ventaMas').innerHTML = !V || !on ? '' :
        '<div class="card"><h3>Precios</h3><div class="stats" style="grid-template-columns:repeat(2,minmax(0,1fr))">' +
        '<label>Precio base al mes<input id="vPrecio" inputmode="numeric" value="' + esc(String(cfg.precio ?? 990)) + '"></label>' +
        '<label>Descuento Premium %<input id="vDesc" inputmode="numeric" value="' + esc(String(cfg.descuento_premium ?? 20)) + '"></label>' +
        '<label>Días de prueba gratis<input id="vPrueba" inputmode="numeric" value="' + esc(String(cfg.prueba_dias ?? 7)) + '"></label>' +
        '<label>Meses que paga el anual<input id="vAnual" inputmode="numeric" value="' + esc(String(cfg.anual_meses ?? 10)) + '"></label></div>' +
        '<h3>Packs</h3>' + Object.entries(cfg.packs || {}).map(([k, p]) => '<label class="fila" style="gap:8px;align-items:center;margin:6px 0"><span class="grow" style="min-width:0"><b>' + esc(p.nombre) + '</b><br><span class="sub">' +
          (p.modulos === '*' ? 'Todos los módulos' : (p.modulos || []).length + ' módulos') + '</span></span><input data-pack="' + esc(k) + '" inputmode="numeric" style="width:92px" aria-label="Precio de ' + esc(p.nombre) + '" value="' + esc(String(p.precio || 0)) + '"></label>').join('') +
        '<details style="margin-top:8px"' + (Object.values(L || {}).some((x) => x && (x.m || x.a)) ? '' : ' hidden') + '><summary>🔗 Links antiguos con monto fijo (bórralos: basta el link general de Pagos)</summary><p class="sub">No hacen falta: el link abierto de Pagos sirve para módulos y packs (la app muestra el monto con 📋 Copiar). Si ya tienes un link por precio, pégalo aquí y se usa ese. Premium paga con descuento, así que usa el link abierto o transferencia.</p>' +
          items.map(([k, n]) => '<p style="margin:10px 0 4px"><b>' + esc(n) + '</b></p><input data-lk="' + esc(k) + '" data-per="m" placeholder="Link 1 mes (https://…)" value="' + esc(((L[k] || {}).m) || '') + '">' +
            '<input data-lk="' + esc(k) + '" data-per="a" placeholder="Link 1 año (https://…)" style="margin-top:6px" value="' + esc(((L[k] || {}).a) || '') + '">').join('') + '</details>' +
        '<p class="err" id="vErr"></p><div class="btns"><button type="button" id="vGuardar">💾 Guardar precios</button></div></div>' +
        campana(cfg) +
        '<div class="card"><h3>🎁 Regalar o quitar</h3><label>Correo del negocio<input id="rEmail" type="email" placeholder="tienda@correo.cl"></label>' +
        '<label>Módulo o pack<select id="rItem">' + items.map(([k, n]) => '<option value="' + esc(k) + '">' + esc(n) + '</option>').join('') + '</select></label>' +
        '<label>Días (0 = quitar)<input id="rDias" inputmode="numeric" value="30"></label><p class="err" id="rErr"></p>' +
        '<div class="btns"><button type="button" id="rOk">🎁 Aplicar</button></div></div>' +
        '<div class="card"><h3>Negocios con módulos</h3>' + (V.negocios.length ? '<ul class="list">' + V.negocios.map((n) => '<li><div class="grow" style="min-width:0"><b class="una" title="' + esc(n.email || n.negocio) + '">' + esc(n.email || n.negocio) + '</b>' +
          n.modulos.map((m) => '<div class="sub una">' + esc(m.modulo) + (m.origen === 'prueba' ? ' 🎁' : m.origen === 'regalo' ? ' 🎁R' : '') + ' ' + (new Date(m.hasta) < new Date() ? 'venció' : 'hasta ' + new Date(m.hasta).toLocaleDateString('es-CL')) + '</div>').join('') + '</div></li>').join('') + '</ul>'
          : '<p class="sub">Aún nadie.</p>') + '</div>';
    };
    const cargarVenta = async () => { try { V = await rpcDe(c, 'cfx_venta_admin'); } catch (x) { V = null; } pintar(); };
    pintar(); cargarVenta();
    d.querySelector('#mods').onchange = async (ev) => {
      const k = ev.target.dataset.m; if (!k) return;
      ev.target.disabled = true;
      try { e.modulos = await rpcDe(c, 'cfx_modulo_guardar', { p_clave: k, p_activo: ev.target.checked }); toast((ev.target.checked ? 'Prendido: ' : 'Apagado: ') + k); }
      catch (x) { toast(x.message); }
      pintar();
    };
    d.querySelector('#venta').onchange = async (ev) => {
      if (ev.target.id !== 'vOn') return;
      ev.target.disabled = true;
      try { V = await rpcDe(c, 'cfx_venta_guardar', { p: { activo: ev.target.checked } }); e.modulos = await rpcDe(c, 'cfx_modulos_admin'); toast(ev.target.checked ? '💰 Venta de módulos prendida' : 'Venta de módulos apagada'); }
      catch (x) { toast(x.message); }
      pintar();
    };
    d.addEventListener('change', (ev) => {
      if (ev.target.id === 'cTodos') d.querySelectorAll('[data-camp]').forEach((x) => { x.checked = ev.target.checked; });
      else if (ev.target.dataset.camp) { const t = d.querySelector('#cTodos'); if (t) t.checked = [...d.querySelectorAll('[data-camp]')].every((x) => x.checked); }
    });
    d.addEventListener('click', async (ev) => {
      const ch = ev.target.closest('.cfx-chips[data-grupo] .cfx-chip');
      if (ch) {
        const g = ch.parentElement; d.querySelector('#' + g.dataset.grupo).value = ch.dataset.v;
        g.querySelectorAll('.cfx-chip').forEach((x) => x.classList.toggle('on', x === ch)); return;
      }
      if (ev.target.id === 'vGuardar') {
        const cfg = V.config || {}, precios = {}, links = {}, packs = JSON.parse(JSON.stringify(cfg.packs || {}));
        d.querySelectorAll('[data-pr]').forEach((x) => { if (x.value.trim() !== '') precios[x.dataset.pr] = Math.round(Number(x.value)); });
        d.querySelectorAll('[data-pack]').forEach((x) => { packs[x.dataset.pack].precio = Math.round(Number(x.value) || 0); });
        d.querySelectorAll('[data-lk]').forEach((x) => { (links[x.dataset.lk] = links[x.dataset.lk] || {})[x.dataset.per] = x.value.trim(); });
        const p = { precio: num('vPrecio'), descuento_premium: num('vDesc'), prueba_dias: num('vPrueba'), anual_meses: num('vAnual'), packs, links, precios };
        ev.target.disabled = true;
        try { V = await rpcDe(c, 'cfx_venta_guardar', { p }); e.modulos = await rpcDe(c, 'cfx_modulos_admin'); toast('💾 Precios guardados'); pintar(); }
        catch (x) { d.querySelector('#vErr').textContent = x.message; ev.target.disabled = false; }
      } else if (ev.target.id === 'cOk' || ev.target.id === 'cFin') {
        const fin = ev.target.id === 'cFin';
        if (fin && !(await window.CFX_DIALOGO.confirmar('¿Terminar la campaña hoy? Los que ya la activaron siguen con su regalo hasta su fecha.'))) return;
        const camp = fin ? null : { modulos: [...d.querySelectorAll('[data-camp]:checked')].map((x) => x.dataset.camp), meses: Number(d.querySelector('#cMeses').value), hasta: d.querySelector('#cHasta').value };
        ev.target.disabled = true;
        try {
          // Terminar hoy: el servidor deja la fecha de término en ayer (queda el historial de la campaña).
          const p = { campana: fin ? { fin: true } : camp };
          V = await rpcDe(c, 'cfx_venta_guardar', { p }); toast(fin ? '⏹️ Campaña terminada' : '🎁 Campaña guardada'); pintar();
        } catch (x) { d.querySelector('#cErr').textContent = x.message; ev.target.disabled = false; }
      } else if (ev.target.id === 'rOk') {
        ev.target.disabled = true;
        try { V = await rpcDe(c, 'cfx_modulo_regalar', { p_email: d.querySelector('#rEmail').value, p_item: d.querySelector('#rItem').value, p_dias: num('rDias') || 0 }); toast('🎁 Listo'); pintar(); }
        catch (x) { d.querySelector('#rErr').textContent = x.message; ev.target.disabled = false; }
      }
    });
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
    el.innerHTML = '<div class="titulo-v"><h2>Mis aplicaciones</h2><div class="btns-s"><button type="button" class="small ghost" id="appsGh">🔑 GitHub</button><button type="button" class="small ghost" id="appsTodo">' + A.ico('refrescar', 15) + ' Revisar todas</button><button type="button" class="small ghost" id="resTodo">' + A.ico('bajar', 15) + ' Respaldar todas</button></div></div>' +
      (ramas() ? '<p class="sub">La base de cada app se actualiza sola. Cuando aparezca 🧪 Probar, ábrela y revisa los cambios: si está bien, ✅ Confirmar y luego 🚀 Liberar; si no, ↩️ Deshacer (o Liberar todo): a sus usuarios se les actualiza sola.</p>'
        : '<p class="sub">La base de cada app se actualiza sola. Para probar: Resumen → Empresas → 🧹 Limpiar. Si está bien, aquí 🚀 Liberar.</p>') +
      '<div id="appsCab"></div>' + APPS.map((a) => '<div class="card app-card" data-app="' + a.id + '"></div>').join('');
    el.querySelector('#appsTodo').onclick = () => APPS.forEach(cargar);
    el.querySelector('#appsGh').onclick = tokenGitHub;
    el.querySelector('#resTodo').onclick = async () => {
      const con = APPS.filter((a) => (E[a.id] || {}).conectado);
      let n = 0; for (const a of con) { if (await respaldar(a)) n++; await new Promise((r) => setTimeout(r, 700)); }
      toast(n + ' de ' + con.length + ' respaldos descargados' + (con.length < APPS.length ? ' (conecta las demás aquí)' : ''));
    };
    el.onclick = (ev) => {
      const b = ev.target.closest('[data-a]'), c = ev.target.closest('[data-app]'); if (!b || !c) return;
      const a = APPS.find((x) => x.id === c.dataset.app), act = b.dataset.a;
      if (act === 'ver') return;
      if (act === 'probar') { try { localStorage.setItem(PROBO(a), String(E[a.id].prueba.version)); } catch (x) { /* sin guardar */ } setTimeout(() => pintarTarjeta(a), 300); return; }
      if (act === 'pconf' || act === 'pdes') return accionPrueba(a, act === 'pconf' ? 'confirmar' : 'deshacer');
      if (act === 'lib') liberar(a);
      else if (act === 'bd') actualizarBase(a);
      else if (act === 'con') conectar(a);
      else if (act === 'salir') cliente(a).auth.signOut().then(() => cargar(a));
      else if (act === 'rec') cargar(a);
      else if (act === 'mod') modulos(a);
      else if (act === 'limp') limpieza(a);
      else if (act === 'adm') abrirAdmin(a);
      else if (act === 'panel') abrirPanel(a);
    };
    pintarCabecera();
    APPS.forEach(cargar);
  }
  // G34 · 🧭 Abre el panel de la app dentro de Apps (← Apps vuelve a las tarjetas).
  function abrirPanel(a, o) {
    const el = raiz; if (!el || !global.PanelApps) return;
    if (!(E[a.id] || {}).conectado) return conectar(a, () => abrirPanel(a, o));
    global.PanelApps.abrir(a, cliente(a), el, () => render(el), o);
    try { global.scrollTo(0, 0); } catch (x) { /* nada */ }
  }
  // Para el panel de Pagos: deja listas (y conectadas, si ya entraste) las 7 apps sin pintar las tarjetas.
  const preparar = () => Promise.all(APPS.filter((a) => !E[a.id] || !E[a.id].url).map(cargar));
  // ---------- G85 · 🗂️ Caja de apps ----------
  // Un botón con la app elegida (su imagen + nombre). Al tocarlo se abre la caja con las 7 apps para elegir otra.
  // Imagen: la de cada app (icons/icon-192.png) o la que pongas tú (🖼️ Cambiar imágenes; se guarda en el CM para todos tus teléfonos).
  let IMG = null;
  const imgDefecto = (a) => (a.propia ? A.ROOT : a.web) + 'icons/icon-192.png';
  const imgDe = (a) => (IMG && IMG[a.id]) || imgDefecto(a);
  async function imagenes() {
    if (IMG) return IMG;
    try { const r = await A.rpc('config_publica'); IMG = Object.assign({}, ((r && r.config) || {}).apps_imagenes || {}); } catch (x) { IMG = {}; }
    return IMG;
  }
  function achicarImg(file) {
    return new Promise((ok, no) => {
      const img = new Image(), u = URL.createObjectURL(file);
      img.onload = () => {
        const L = 128, c = document.createElement('canvas'); c.width = c.height = L;
        const k = Math.max(L / img.width, L / img.height), w = img.width * k, h = img.height * k;
        c.getContext('2d').drawImage(img, (L - w) / 2, (L - h) / 2, w, h); URL.revokeObjectURL(u);
        let d = c.toDataURL('image/webp', 0.85); if (!/^data:image\/webp/.test(d)) d = c.toDataURL('image/png');
        ok(d);
      };
      img.onerror = () => { URL.revokeObjectURL(u); no(new Error('No se pudo leer la imagen (usa JPG o PNG)')); };
      img.src = u;
    });
  }
  async function cajaApps(cont, actualId, alElegir, o) {
    o = o || {};
    await imagenes();
    // G113 b: la caja ahora es del núcleo (CFX_CAJA, ui.js + tema.css); aquí solo se agregan las imágenes propias del CM.
    const corto = (a) => a.nombre.split(' ·')[0];
    const guardar = async () => {
      try { await A.rpc('admin_config_guardar', { p_clave: 'apps_imagenes', p_valor: IMG, p_motivo: 'Imagen de app' }); toast('Imagen guardada'); }
      catch (x) { toast(/Ajuste no válido/.test(x.message) ? 'Actualiza la base del Centro de Mando para guardar imágenes' : x.message); }
    };
    const c = global.CFX_CAJA.montar(cont, {
      opciones: () => APPS.map((x) => ({ id: x.id, t: corto(x), img: imgDe(x), sub: o.sub ? o.sub(x) : '' })),
      actual: actualId, alElegir, dato: 'ca-app', titulo: 'Elige la app', aviso: 'Toca para cambiar de app',
      extra: (x, ed) => (ed ? '<span class="ca-ed"><button type="button" class="small ghost" data-ca-img="' + x.id + '">Imagen</button>' + (IMG[x.id] ? '<button type="button" class="small ghost" data-ca-quitar="' + x.id + '">Original</button>' : '') + '</span>' : ''),
      pie: (ed) => (global.CM_SOCIO ? '' : '<button type="button" class="small ghost ca-cambiar" data-ca="editar">' + (ed ? 'Listo' : 'Cambiar imágenes') + '</button>'),
      alTocar: (ev, st, pintar) => {
        const b = ev.target.closest('[data-ca=editar],[data-ca-img],[data-ca-quitar]'); if (!b) return;
        if (b.dataset.ca === 'editar') { st.editando = !st.editando; return pintar(); }
        if (b.dataset.caQuitar) { delete IMG[b.dataset.caQuitar]; pintar(); return guardar(); }
        const f = document.createElement('input'); f.type = 'file'; f.accept = 'image/*';
        f.onchange = async () => { if (!f.files[0]) return; try { IMG[b.dataset.caImg] = await achicarImg(f.files[0]); pintar(); guardar(); } catch (x) { toast(x.message); } };
        f.click();
      }
    });
    return c;
  }
  global.MisApps = { cajaApps, render, APPS, urlLimpia, cliente, estado: E, preparar, conectar, rpcDe, abrirAdmin, abrirPanel, vincular, kpis, nombre, valor, peso, respaldar, limpieza };
})(window);
