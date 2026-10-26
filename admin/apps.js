/* Centro de Mando · Mis aplicaciones: una tarjeta por app con su versión, base de datos, rendimiento
   y botones para abrirla, copiar el SQL de actualización y liberar la versión nueva, todo desde aquí.
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
    { id: 'billetera', nombre: 'Billetera · Libreta de Cobros', ico: 'billetera', repo: 'Emprendedor', cfg: 'js/config.js', worker: 'emprendedor', sub: 'billetera', admin: 'admin/',
      bd: { rpc: 'config_publica', campo: 'version_bd' }, leer: { rpc: 'config_publica', campo: 'version_liberada' },
      liberar: (c, v) => c.rpc('admin_guardar_ajustes', { p: { version_liberada: v } }) },
    { id: 'aplicaciones', nombre: 'CodeFix Apps · FichaPro y Caja', ico: 'bolsa', repo: 'Aplicaciones', cfg: 'shared/config.js', worker: 'aplicaciones', sub: 'apps', admin: 'apps/admin/',
      bd: { rpc: 'db_version' }, leer: { rpc: 'public_settings', campo: 'version_liberada' },
      liberar: (c, v) => c.rpc('admin_set_setting', { p_key: 'version_liberada', p_value: v }) },
    { id: 'barberia', nombre: 'Barbería', ico: 'tijeras', repo: 'Barberia', cfg: 'shared/config.js', worker: 'barberia', sub: 'barberia', admin: 'admin/',
      bd: { rpc: 'db_version' }, leer: { rpc: 'ajustes_publicos', campo: 'version_liberada' },
      liberar: (c, v) => c.rpc('admin_ajuste', { p_key: 'version_liberada', p_value: v }) },
    { id: 'bicitaller', nombre: 'BiciTaller', ico: 'bici', repo: 'Taller', cfg: 'shared/config.js', worker: 'taller', sub: 'bicitaller', admin: 'admin/',
      bd: { rpc: 'db_version' }, leer: null, liberar: null }, // se actualiza sola apenas se publica
    { id: 'estaciona', nombre: 'Estaciona · Estacionamientos', ico: 'auto', repo: 'Estacionamiento', cfg: 'js/config.js', worker: 'estacionamiento', sub: 'estaciona', admin: '#/admin',
      bd: { rpc: 'ajustes_publicos', campo: 'version_bd' }, leer: { rpc: 'ajustes_publicos', campo: 'textos.version_liberada' },
      liberar: (c, v) => c.rpc('admin_guardar_textos', { p: { version_liberada: v } }) }
  ];
  // Links que se arman solos según dónde se abre el Centro de Mando:
  //  · en Cloudflare Workers (saas.<cuenta>.workers.dev) → <worker>.<cuenta>.workers.dev
  //  · en tu dominio (mando.codefix.app)                → <sub>.codefix.app   (billetera, apps, barberia, bicitaller, estaciona)
  //  · en pruebas o GitHub Pages                         → los Workers de tu cuenta de Cloudflare
  const CUENTA_WORKERS = 'juanjosuecastilloloyola.workers.dev';
  function webDe(a) {
    const h = location.hostname, partes = h.split('.');
    if (/\.workers\.dev$/.test(h) && partes.length >= 4) return 'https://' + a.worker + '.' + partes.slice(1).join('.') + '/';
    if (/^(localhost|127\.|\d+\.\d+\.\d+\.\d+$)|github\.io$|pages\.dev$/.test(h) || partes.length < 2) return 'https://' + a.worker + '.' + CUENTA_WORKERS + '/';
    const base = partes.length >= 3 ? partes.slice(1).join('.') : h; // mando.codefix.app → codefix.app; codefix.app → codefix.app
    return 'https://' + a.sub + '.' + base + '/';
  }
  APPS.forEach((a) => { a.web = webDe(a); });
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
  function kpis(r) {
    if (!r || typeof r !== 'object') return '';
    const l = Object.keys(r).filter((k) => typeof r[k] === 'number' && !/bytes|_mb$|limite|max|cola/.test(k)).sort((x, y) => peso(x) - peso(y)).slice(0, 8);
    return l.length ? '<div class="app-kpis">' + l.map((k) => '<div><b>' + esc(valor(k, r[k])) + '</b><span>' + esc(nombre(k)) + '</span></div>').join('') + '</div>' : '';
  }

  function pintarTarjeta(a) {
    const n = raiz && raiz.querySelector('[data-app="' + a.id + '"]'); if (!n) return;
    const e = E[a.id] || {}, s = estadoDe(a);
    const ref = e.url ? new URL(e.url).hostname.split('.')[0] : '';
    const pill = (t, cls) => '<span class="pill ' + (cls || '') + '">' + t + '</span>';
    const est = e.cargando ? pill('Revisando…') : e.error && !e.pub ? pill('⚠️ Sin datos', 'bad')
      : !a.liberar ? pill('🔁 Se actualiza sola al publicar', 'info') : s.faltaBd ? pill('🗄️ Falta actualizar la base de datos', 'bad')
      : s.alDia ? pill('✅ Al día', 'ok') : s.lista ? pill('🚀 Lista para liberar v' + esc(e.pub), 'warn') : !e.conectado ? pill('🔌 Conéctate para liberar', 'warn') : pill('Revisa la versión', 'warn');
    n.innerHTML = '<div class="fila"><span class="app-ico">' + A.ico(a.ico, 24) + '</span><div class="grow"><h3 style="margin:0">' + esc(a.nombre) + '</h3>' +
      '<p class="sub" style="margin:2px 0 0">Publicada ' + (e.pub ? 'v' + esc(e.pub) : '—') + (a.liberar ? ' · Liberada ' + (e.lib ? 'v' + esc(e.lib) : '—') : '') +
      ' · Base de datos ' + (e.bd ? 'v' + esc(e.bd) : '—') + (e.bdPide && e.bd && s.faltaBd ? ' (pide v' + esc(e.bdPide) + ')' : '') +
      ' · Núcleo ' + (e.nucleo ? 'v' + esc(e.nucleo) : '—') + (e.nucleo && NUCLEO && e.nucleo !== NUCLEO ? ' <span class="pill warn">falta sincronizar</span>' : '') + '</p></div></div>' +
      '<div style="margin:8px 0">' + est + '</div>' +
      (e.conectado ? kpis(e.resumen) : '') + (e.error ? '<p class="sub warn">' + esc(e.error) + '</p>' : '') +
      '<div class="btns-s">' +
        '<a class="btn small ghost" href="' + esc(a.web) + '" target="_blank" rel="noopener">' + A.ico('abrir', 15) + ' Abrir app</a>' +
        '<a class="btn small ghost" href="' + esc(a.web + a.admin) + '" target="_blank" rel="noopener">' + A.ico('abrir', 15) + ' Admin</a>' +
        '<button type="button" class="small' + (s.faltaBd ? '' : ' ghost') + '" data-a="sql">' + A.ico('copiar', 15) + ' Copiar SQL</button>' +
        (ref ? '<a class="btn small ghost" href="https://supabase.com/dashboard/project/' + ref + '/sql/new" target="_blank" rel="noopener">' + A.ico('abrir', 15) + ' SQL Editor</a>' : '') +
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
  function conectar(a) {
    const d = modal('<h2>Conectar ' + esc(a.nombre) + '</h2><p class="muted">Entra con tu cuenta de administrador de esta app (queda guardada solo en este teléfono).</p>' +
      '<label>Correo<input id="ce" type="email" autocomplete="username" value="' + esc((A.cuenta && A.cuenta.email) || '') + '"></label><label>Contraseña<input id="cp" type="password" autocomplete="current-password"></label>' +
      '<p class="err" id="cx"></p><div class="btns"><button class="ghost" data-cerrar type="button">Cancelar</button><button id="cok" type="button">Conectar</button></div>');
    d.querySelector('#cok').onclick = async () => {
      const { error } = await cliente(a).auth.signInWithPassword({ email: d.querySelector('#ce').value.trim().toLowerCase(), password: d.querySelector('#cp').value });
      if (error) { d.querySelector('#cx').textContent = /invalid/i.test(error.message) ? 'Correo o contraseña incorrectos' : error.message; return; }
      d.close(); toast('Conectado a ' + a.nombre); cargar(a);
    };
  }
  async function copiarSql(a) {
    try {
      const t = await (await fetch(RAW(a.repo, 'supabase/instalar-corto.sql'), { cache: 'no-store' })).text();
      if (!/http_get/.test(t)) throw new Error('no se encontró supabase/instalar-corto.sql');
      const limpio = t.split('\n').filter((x) => !x.startsWith('--')).join('\n').trim();
      try { await navigator.clipboard.writeText(limpio); } catch (x) { const ta = document.createElement('textarea'); ta.value = limpio; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
      toast('SQL de ' + a.nombre + ' copiado. Pégalo en su SQL Editor → Run');
    } catch (x) { toast('No se pudo copiar: ' + x.message); }
  }

  function render(el) {
    raiz = el;
    el.innerHTML = '<div class="titulo-v"><h2>Mis aplicaciones</h2><button type="button" class="small ghost" id="appsTodo">' + A.ico('refrescar', 15) + ' Revisar todas</button></div>' +
      '<p class="sub">Para actualizar una app: 1) 📋 Copiar SQL y pégalo en su SQL Editor (no borra datos), 2) 🚀 Liberar. Sus usuarios ven el botón Actualizar.</p>' +
      '<div id="appsCab"></div>' + APPS.map((a) => '<div class="card app-card" data-app="' + a.id + '"></div>').join('');
    el.querySelector('#appsTodo').onclick = () => APPS.forEach(cargar);
    el.onclick = (ev) => {
      const b = ev.target.closest('[data-a]'), c = ev.target.closest('[data-app]'); if (!b || !c) return;
      const a = APPS.find((x) => x.id === c.dataset.app), act = b.dataset.a;
      if (act === 'sql') copiarSql(a);
      else if (act === 'lib') liberar(a);
      else if (act === 'con') conectar(a);
      else if (act === 'salir') cliente(a).auth.signOut().then(() => cargar(a));
      else if (act === 'rec') cargar(a);
    };
    pintarCabecera();
    APPS.forEach(cargar);
  }
  global.MisApps = { render, APPS };
})(window);
