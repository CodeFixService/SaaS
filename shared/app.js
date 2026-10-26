/* CodeFix · núcleo compartido: conexión, sesión, campanita en vivo, push,
   imágenes, fechas y utilidades. */
(function (global) {
  'use strict';
  const cfg = global.BT_CONFIG;
  const sb = global.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'bt-auth', detectSessionInUrl: true }
  });
  const ROOT = (() => {
    const s = document.querySelector('script[src*="shared/app.js"]');
    return s ? s.src.replace(/shared\/app\.js.*$/, '') : location.origin + '/';
  })();

  /* ---------- Utilidades ---------- */
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const plata = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('es-CL');
  const numero = (v) => { const n = Number(String(v == null ? '' : v).replace(/[^\d-]/g, '')); return isFinite(n) ? n : 0; };
  const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const fechaDe = (s) => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
  const sumarDias = (s, n) => { const d = fechaDe(s); d.setDate(d.getDate() + n); return iso(d); };
  const hoy = () => iso(new Date());
  const fCorta = (s) => s ? fechaDe(s).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' }) : '';
  const fLarga = (s) => s ? fechaDe(s).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' }) : '';
  const fHora = (t) => t ? new Date(t).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' }) : '';
  const hace = (t) => {
    if (!t) return 'nunca';
    const m = Math.round((Date.now() - new Date(t)) / 60000);
    if (m < 2) return 'recién'; if (m < 60) return 'hace ' + m + ' min';
    const h = Math.round(m / 60); if (h < 24) return 'hace ' + h + ' h';
    const d = Math.round(h / 24); return d < 60 ? 'hace ' + d + ' días' : fHora(t);
  };
  const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const telNorm = (t) => { let d = String(t || '').replace(/\D/g, ''); if (d.length === 9 && d[0] === '9') d = '56' + d; if (d.length === 8) d = '569' + d; return d; };
  const wa = (tel, txt) => 'https://wa.me/' + telNorm(tel) + (txt ? '?text=' + encodeURIComponent(txt) : '');
  const estrellas = (n) => { n = Math.round(Number(n) || 0); return '★'.repeat(n) + '☆'.repeat(5 - n); };
  const nota = (o) => o && o.total ? '<span class="stars">★ ' + String(o.promedio).replace('.', ',') + '</span> <span class="sub">(' + o.total + ')</span>' : '<span class="sub">Sin calificaciones</span>';

  let toastT;
  function toast(msg) {
    let el = $('toast');
    if (!el) { el = document.createElement('div'); el.id = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.textContent = msg; el.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2800);
  }

  // Diálogo simple: contenido HTML; devuelve el <dialog> (se borra al cerrar).
  function modal(html, onReady) {
    const d = document.createElement('dialog');
    d.innerHTML = '<div class="card">' + html + '</div>';
    document.body.appendChild(d);
    d.addEventListener('close', () => setTimeout(() => d.remove(), 50));
    d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
    d.querySelectorAll('[data-cerrar]').forEach((b) => { b.onclick = () => d.close(); });
    d.showModal();
    if (onReady) onReady(d);
    return d;
  }
  function confirmar(msg, si) {
    return new Promise((ok) => {
      const d = modal('<p style="margin:0 0 6px;white-space:pre-line">' + esc(msg) + '</p><div class="btns"><button class="ghost" data-no>Cancelar</button><button data-si>' + esc(si || 'Sí, continuar') + '</button></div>');
      let r = false;
      d.querySelector('[data-si]').onclick = () => { r = true; d.close(); };
      d.querySelector('[data-no]').onclick = () => d.close();
      d.addEventListener('close', () => ok(r));
    });
  }

  function friendly(err) {
    const m = String((err && (err.message || err.error_description)) || err || '');
    if (/Invalid login credentials/i.test(m)) return 'Correo o contraseña incorrectos';
    if (/Email not confirmed/i.test(m)) return 'Confirma tu correo (revisa tu bandeja y spam)';
    if (/already registered|already been registered/i.test(m)) return 'Ese correo ya tiene cuenta. Inicia sesión.';
    if (/Password should be/i.test(m)) return 'La contraseña debe tener al menos 6 caracteres';
    if (/rate limit|too many/i.test(m)) return 'Demasiados intentos. Espera unos minutos.';
    if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return 'Sin conexión. Revisa tu internet.';
    if (/Could not find the function|schema cache|does not exist/i.test(m)) return 'Falta instalar la base de datos: corre supabase/instalar.sql en Supabase → SQL Editor (guía, paso 1).';
    if (/Database error saving new user/i.test(m)) return 'No se pudo crear la cuenta. Intenta de nuevo o escribe a soporte.';
    return m.replace(/^\w*Error:\s*/, '') || 'Error';
  }
  async function rpc(name, args) {
    const { data, error } = await sb.rpc(name, args || {});
    if (error) throw new Error(friendly(error));
    return data;
  }
  async function q(p) {
    const { data, error } = await p;
    if (error) throw new Error(friendly(error));
    return data;
  }

  /* ---------- Configuración pública y textos ---------- */
  let publica = null;
  try { publica = JSON.parse(localStorage.getItem('bt:publica')); } catch (e) { publica = null; }
  async function cargarPublica() {
    try { publica = await rpc('config_publica'); localStorage.setItem('bt:publica', JSON.stringify(publica)); } catch (e) { /* usa la copia */ }
    return publica || { config: {}, textos: {}, planes: {} };
  }
  function txt(clave, vars) {
    let s = (publica && publica.textos && publica.textos[clave]) || '';
    Object.keys(vars || {}).forEach((k) => { s = s.split('{' + k + '}').join(vars[k]); });
    return s;
  }

  /* ---------- Sesión ---------- */
  let cuenta = null;
  try { cuenta = JSON.parse(localStorage.getItem('bt:cuenta')); } catch (e) { cuenta = null; }
  async function refrescar() {
    const { data } = await sb.auth.getSession();
    if (!data.session) { cuenta = null; localStorage.removeItem('bt:cuenta'); return null; }
    try {
      cuenta = await rpc('mi_cuenta');
      if (cuenta) localStorage.setItem('bt:cuenta', JSON.stringify(cuenta));
    } catch (e) {
      if (!/Sin conexión/.test(e.message)) throw e;
    }
    if (cuenta) sb.rpc('registrar_visto').then(() => {}, () => {});
    return cuenta;
  }
  const destino = (c) => !c ? 'index.html' : (c.rol === 'admin' || c.rol === 'socio') ? 'admin/' : 'app/';
  // Úsalo al abrir cada panel: sin sesión o con otro rol, vuelve al inicio.
  async function requerir(roles) {
    let c = null;
    try { c = await refrescar(); } catch (e) { c = cuenta; }
    if (!c) { location.replace(ROOT + 'index.html?volver=' + encodeURIComponent(location.pathname + location.hash)); return new Promise(() => {}); }
    if (c.suspendido) { document.body.innerHTML = '<main><div class="card"><h2>Cuenta suspendida</h2><p class="muted">Contacta al administrador.</p><button onclick="App.salir()">Salir</button></div></main>'; return new Promise(() => {}); }
    if (roles && !roles.includes(c.rol)) { location.replace(ROOT + destino(c)); return new Promise(() => {}); }
    return c;
  }
  async function entrar(email, password) {
    const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw new Error(friendly(error));
    const c = await refrescar();
    if (!c) throw new Error('Tu cuenta no tiene perfil. Contacta al administrador.');
    sincronizarPush();
    return c;
  }
  async function salir() {
    try { const s = await subActual(); if (s) await sb.rpc('push_quitar', { p_endpoint: s.endpoint }); } catch (e) { /* sin red */ }
    try { await sb.auth.signOut(); } catch (e) { /* sin red */ }
    cuenta = null; localStorage.removeItem('bt:cuenta');
    location.replace(ROOT + 'index.html');
  }
  // Registro abierto: la persona crea su cuenta con correo y contraseña (7 días de Pro de prueba).
  async function registrar(email, password, nombre) {
    const { data, error } = await sb.auth.signUp({ email: email.trim(), password, options: { data: { nombre: String(nombre || '').trim() } } });
    if (error) throw new Error(friendly(error));
    if (!data.session) return { confirmar: true };
    await refrescar(); sincronizarPush();
    return { confirmar: false };
  }
  // Cuentas creadas desde el panel (socios y usuarios): las crea el servidor.
  async function crearCuenta(d) {
    // Si la función no responde en 40 s, avisa en vez de quedar cargando.
    const espera = new Promise((_, no) => setTimeout(() => no(new Error('La función "servidor" no respondió. Revisa en Supabase → Edge Functions que "servidor" esté desplegada (guía, paso 4).')), 40000));
    const { data, error } = await Promise.race([sb.functions.invoke('servidor', { body: Object.assign({ accion: 'crear_cuenta' }, d) }), espera]);
    if (error) {
      let det = '';
      try { det = await error.context.text(); } catch (e) { /* sin detalle */ }
      throw new Error('No se pudo conectar con la función "servidor". Revisa que esté creada en Supabase (guía, paso 4).' + (det ? ' ' + det.slice(0, 120) : ''));
    }
    if (!data || !data.ok) throw new Error((data && data.error) || 'No se pudo crear la cuenta');
    return data;
  }
  function clave() {
    const L = 'abcdefghjkmnpqrstuvwxyz', r = crypto.getRandomValues(new Uint32Array(9));
    const l = (i) => L[r[i] % L.length], n = (i) => String(r[i] % 10);
    return l(0).toUpperCase() + l(1) + l(2) + n(3) + n(4) + n(5) + n(6) + l(7) + l(8);
  }
  function mensajeAcceso(d) {
    return 'Hola ' + d.nombre + '\nTe creamos tu cuenta en ' + (d.lugar || 'Centro de Mando') + '.\n\nEntra aquí e instala la app: ' + ROOT +
      '\nCorreo: ' + d.email + '\nContraseña: ' + d.password + '\n\nCambia tu contraseña en "Mi cuenta" la primera vez que entres.';
  }

  /* ---------- Imágenes (comprobantes y logo) ---------- */
  function achicar(file, lado, maxLargo, tipo) {
    return new Promise((ok, ko) => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, lado / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
        const g = c.getContext('2d');
        g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
        g.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(img.src);
        let qa = 0.82, d = c.toDataURL(tipo || 'image/jpeg', qa);
        while (d.length > maxLargo && qa > 0.3) { qa -= 0.1; d = c.toDataURL('image/jpeg', qa); }
        if (d.length > maxLargo) { ko(new Error('La imagen es muy pesada')); return; }
        ok(d);
      };
      img.onerror = () => ko(new Error('No se pudo leer la imagen'));
      img.src = URL.createObjectURL(file);
    });
  }
  const comprimirComprobante = (file) => achicar(file, 1400, 580000);
  function descargar(dataUrl, nombre) {
    const a = document.createElement('a');
    a.href = dataUrl; a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
  }
  function verImagen(dataUrl, titulo, nombreArchivo) {
    const d = modal('<h2>' + esc(titulo || 'Comprobante') + '</h2><div class="comprobante"><img alt="Comprobante" src="' + dataUrl + '"></div>' +
      '<div class="btns"><button class="ghost" data-cerrar>Cerrar</button><button data-bajar>⬇️ Descargar</button></div>');
    d.querySelector('[data-bajar]').onclick = () => descargar(dataUrl, nombreArchivo || 'comprobante.jpg');
    return d;
  }

  /* ---------- Campanita (avisos dentro de la app, en vivo) ---------- */
  let avisos = [], canal = null;
  async function campana(btn) {
    if (!btn || !cuenta) return;
    btn.innerHTML = '🔔<span class="badge hidden"></span>';
    btn.setAttribute('aria-label', 'Avisos');
    const badge = btn.querySelector('.badge');
    async function cargar() {
      try { avisos = await q(sb.from('notificaciones').select('*').order('created_at', { ascending: false }).limit(60)); } catch (e) { return; }
      const n = avisos.filter((a) => !a.leida).length;
      badge.textContent = n > 99 ? '99+' : n; badge.classList.toggle('hidden', !n);
      document.dispatchEvent(new CustomEvent('bt:avisos', { detail: n }));
    }
    btn.onclick = () => {
      const d = modal('<div style="display:flex;align-items:center;gap:8px"><h2 style="flex:1;margin:0">🔔 Avisos</h2><button class="small ghost" data-cerrar>Cerrar</button></div>' +
        '<div id="btAvisos" style="max-height:65vh;overflow:auto;margin-top:6px">' + (avisos.length ? avisos.map((a) =>
          '<div class="notif' + (a.leida ? '' : ' nueva') + '" data-url="' + esc(a.url) + '"><b>' + esc(a.titulo) + '</b><div class="sub">' + esc(a.cuerpo) + '</div><div class="sub">' + hace(a.created_at) + '</div></div>').join('')
          : '<p class="empty">Sin avisos por ahora.</p>') + '</div>' +
        (avisos.length ? '<div class="btns"><button class="small ghost" data-borrar>Borrar los leídos</button></div>' : '') + '<div id="btPush"></div>');
      d.querySelector('#btAvisos').onclick = (e) => {
        const n = e.target.closest('[data-url]'); if (!n || !n.dataset.url) return;
        d.close(); irA(n.dataset.url);
      };
      const bb = d.querySelector('[data-borrar]');
      if (bb) bb.onclick = async () => { await sb.from('notificaciones').delete().eq('leida', true); d.close(); cargar(); };
      ofrecerPush(d.querySelector('#btPush'));
      const ids = avisos.filter((a) => !a.leida).map((a) => a.id);
      if (ids.length) sb.from('notificaciones').update({ leida: true }).in('id', ids).then(() => cargar());
    };
    await cargar();
    insistirPush();
    if (canal) sb.removeChannel(canal);
    canal = sb.channel('avisos-' + cuenta.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificaciones', filter: 'para=eq.' + cuenta.id }, (p) => {
        toast('🔔 ' + (p.new && p.new.titulo || 'Nuevo aviso'));
        cargar();
      })
      .subscribe();
    // Si la app estuvo en segundo plano, refresca al volver.
    document.addEventListener('visibilitychange', () => { if (!document.hidden) cargar(); });
  }
  function irA(url) {
    if (/^https?:/.test(url)) { location.href = url; return; }
    const destinoUrl = ROOT + url.replace(/^\//, '');
    const a = new URL(destinoUrl, location.href), b = new URL(location.href);
    if (a.pathname === b.pathname && a.search === b.search) { location.hash = a.hash; window.dispatchEvent(new HashChangeEvent('hashchange')); }
    else location.href = destinoUrl;
  }

  /* ---------- Push (notificaciones con la app cerrada) ---------- */
  const pushSoportado = () => 'serviceWorker' in navigator && 'PushManager' in global && 'Notification' in global;
  const b64 = (s) => { const p = '='.repeat((4 - (s.length % 4)) % 4); const r = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(r, (c) => c.charCodeAt(0)); };
  async function subActual() {
    if (!pushSoportado() || Notification.permission !== 'granted') return null;
    const reg = await navigator.serviceWorker.getRegistration();
    return reg && reg.pushManager ? reg.pushManager.getSubscription() : null;
  }
  async function activarPush() {
    if (!pushSoportado()) {
      throw new Error(/iPhone|iPad/.test(navigator.userAgent) ? 'En iPhone primero instala la app: Compartir → "Agregar a inicio" y ábrela desde ahí.'
        : 'Este navegador no permite notificaciones');
    }
    const p = await cargarPublica();
    const pub = p.config && p.config.vapid_publica;
    if (!pub) throw new Error('El administrador aún no activa las notificaciones');
    if (await Notification.requestPermission() !== 'granted') throw new Error('Permiso de notificaciones denegado');
    const reg = await navigator.serviceWorker.ready;
    const key = b64(pub);
    let s = await reg.pushManager.getSubscription();
    if (s) {
      const cur = s.options && s.options.applicationServerKey ? new Uint8Array(s.options.applicationServerKey) : null;
      if (!cur || cur.length !== key.length || cur.some((x, i) => x !== key[i])) { await s.unsubscribe(); s = null; }
    }
    if (!s) s = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
    const j = s.toJSON();
    await rpc('push_guardar', { p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth });
    return true;
  }
  async function sincronizarPush() {
    try { const s = await subActual(); if (!s) return; const j = s.toJSON(); await rpc('push_guardar', { p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth }); } catch (e) { /* nada */ }
  }
  async function ofrecerPush(el) {
    if (!el) return;
    if (await subActual()) { el.innerHTML = '<p class="sub" style="margin-top:10px">✅ Notificaciones activas en este celular.</p>'; return; }
    el.innerHTML = '<div class="aviso" style="margin-top:12px"><div class="grow">📲 Activa las notificaciones para enterarte aunque tengas la app cerrada.</div>' +
      '<button class="small" type="button">Activar</button></div>';
    el.querySelector('button').onclick = async () => {
      try { await activarPush(); toast('✅ Notificaciones activadas'); ofrecerPush(el); } catch (e) { toast(e.message); }
    };
  }

  /* ---------- Notificaciones: insistir hasta que se activen ---------- */
  async function insistirPush() {
    if (!cuenta || sessionStorage.getItem('bt:pushPedido')) return;
    if (await subActual()) return;
    sessionStorage.setItem('bt:pushPedido', '1');
    const ios = /iPhone|iPad/.test(navigator.userAgent), instalada = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    const negado = 'Notification' in global && Notification.permission === 'denied';
    const msg = ios && !instalada ? 'Para recibir avisos en iPhone: toca Compartir → "Agregar a inicio" y abre la app desde ese ícono.'
      : negado ? 'Las notificaciones están bloqueadas. Actívalas en los ajustes del navegador (candado junto a la dirección → Notificaciones → Permitir).'
      : 'Actívalas para recibir tus recordatorios y avisos de descanso.';
    const d = modal('<h2>🔔 Activa las notificaciones</h2><p class="muted" style="margin-top:0">' + esc(msg) + '</p><div class="btns"><button class="ghost" data-cerrar>Ahora no</button>' +
      (!negado && !(ios && !instalada) ? '<button id="btPushSi">Activar</button>' : '') + '</div>');
    const b = d.querySelector('#btPushSi');
    if (b) b.onclick = async () => { try { await activarPush(); toast('✅ Notificaciones activadas'); d.close(); } catch (e) { toast(e.message); } };
  }

  // Admin o socio (con motivo): borra una cuenta y todos sus datos (lo hace el servidor).
  async function borrarCuenta(id, motivo) {
    const { data, error } = await sb.functions.invoke('servidor', { body: { accion: 'borrar', id, motivo: motivo || '' } });
    if (error) throw new Error('No se pudo conectar con la función "servidor".');
    if (!data || !data.ok) throw new Error((data && data.error) || 'No se pudo borrar');
    return data;
  }
  // Cada persona borra su propia cuenta y todos sus datos.
  async function borrarMiCuenta() {
    const { data, error } = await sb.functions.invoke('servidor', { body: { accion: 'borrar_mia' } });
    if (error) throw new Error('No se pudo conectar con la función "servidor".');
    if (!data || !data.ok) throw new Error((data && data.error) || 'No se pudo borrar');
    try { await sb.auth.signOut(); } catch (e) { /* sin red */ }
    cuenta = null; localStorage.removeItem('bt:cuenta');
    return data;
  }

  /* ---------- App instalable ---------- */
  function registrarSW() {
    if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
    navigator.serviceWorker.register(ROOT + 'sw.js', { scope: ROOT }).then((r) => r.update()).catch(() => {});
  }
  let instalar = null;
  global.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); instalar = e; document.dispatchEvent(new Event('bt:instalable')); });
  async function pedirInstalar() { if (!instalar) return false; instalar.prompt(); await instalar.userChoice; instalar = null; return true; }

  /* ---------- Versión nueva: solo cuando el administrador la libera ---------- */
  // La app no cambia sola: cada celular usa su versión guardada hasta que la persona toca "Actualizar",
  // y la ventana aparece solo cuando hay una versión liberada (Administración → Versiones) más nueva que la suya.
  const mayor = (a, b) => {
    const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number);
    for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
    return false;
  };
  const versionMenor = (a, b) => mayor(b, a);
  let avisada = false;
  async function revisarVersion() {
    if (avisada || document.hidden) return;
    const c = ((await cargarPublica()) || {}).config || {};
    const lib = c.version_liberada, min = c.version_min;
    const forzada = !!(min && versionMenor(cfg.VERSION, min));
    if (!forzada && !(lib && versionMenor(cfg.VERSION, lib))) return;
    avisada = true;
    const d = modal('<h2>' + (forzada ? '⚠️ Actualiza la app' : '✨ Hay una versión nueva') + '</h2><p class="muted" style="margin-top:0">' +
      (forzada ? 'Tu versión (v' + esc(cfg.VERSION) + ') ya no funciona bien. Actualízala para seguir.' : 'Tienes la v' + esc(cfg.VERSION) + ' y ya está disponible la v' + esc(lib) + '. Actualiza para tener las últimas mejoras.') +
      '</p><div class="btns">' + (forzada ? '' : '<button class="ghost" data-cerrar>Después</button>') + '<button id="btActualizar">Actualizar ahora</button></div>');
    d.querySelector('#btActualizar').onclick = actualizar;
  }
  // Pide al service worker que descargue la versión publicada completa y recarga. Si algo falla, sigue en la versión actual.
  function actualizar() {
    const b = document.getElementById('btActualizar');
    if (b) { b.disabled = true; b.textContent = 'Actualizando…'; }
    const listo = () => location.reload();
    const fallo = (m) => { if (b) { b.disabled = false; b.textContent = 'Actualizar ahora'; } toast(m || 'No se pudo actualizar: revisa tu internet.'); };
    if (!('serviceWorker' in navigator)) return listo();
    navigator.serviceWorker.ready.then((reg) => {
      const sw = reg.active; if (!sw) return listo();
      const ch = new MessageChannel();
      ch.port1.onmessage = (e) => { if (e.data && e.data.ok) listo(); else fallo(e.data && e.data.error); };
      sw.postMessage({ tipo: 'actualizar' }, [ch.port2]);
      setTimeout(() => fallo('Tardó demasiado. Prueba de nuevo.'), 45000);
    }).catch(listo);
  }
  // Borra solo la copia guardada de esta app (no toca tus datos) y la vuelve a descargar.
  async function repararApp() {
    try {
      for (const k of await caches.keys()) if (k.startsWith('cm-')) await caches.delete(k);
      const regs = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistrations() : [];
      for (const r of regs) if (r.scope === ROOT) await r.unregister();
    } catch (e) { /* igual recarga */ }
    location.reload();
  }
  setTimeout(revisarVersion, 3000);
  setInterval(revisarVersion, 10 * 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) revisarVersion(); });

  function pie() {
    const f = document.createElement('footer');
    f.className = 'pie';
    f.innerHTML = '© ' + new Date().getFullYear() + ' ' + esc(txt('app_nombre') || 'Centro de Mando') + ' · CodeFix · v' + cfg.VERSION;
    (document.querySelector('main') || document.body).appendChild(f);
  }

  // Pestañas inferiores: <nav class="tabs"><button data-v="x">…; vistas: <section class="view" id="v-x">
  function pestanas(onShow) {
    const nav = document.querySelector('nav.tabs');
    function show(v, push) {
      if (!document.getElementById('v-' + v)) return;
      document.querySelectorAll('.view').forEach((x) => x.classList.toggle('on', x.id === 'v-' + v));
      if (nav) nav.querySelectorAll('button[data-v]').forEach((b) => b.classList.toggle('on', b.dataset.v === v || b.dataset.v === (document.getElementById('v-' + v).dataset.tab || '')));
      if (push !== false && location.hash !== '#' + v) history.replaceState(null, '', '#' + v);
      scrollTo(0, 0);
      if (onShow) onShow(v);
    }
    if (nav) nav.querySelectorAll('button[data-v]').forEach((b) => { b.onclick = () => show(b.dataset.v); });
    window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (h) show(h, false); });
    return show;
  }

  global.App = {
    sb, ROOT, $, esc, plata, numero, iso, fechaDe, sumarDias, hoy, fCorta, fLarga, fHora, hace, DIAS, telNorm, wa, estrellas, nota,
    toast, modal, confirmar, friendly, rpc, q, cargarPublica, txt, refrescar, requerir, entrar, salir, crearCuenta, registrar,
    clave, mensajeAcceso, comprimirComprobante, descargar, verImagen, campana, irA, activarPush, ofrecerPush,
    pushSoportado, registrarSW, pedirInstalar, pie, pestanas, destino, revisarVersion, actualizar, repararApp, versionMenor, borrarCuenta, borrarMiCuenta,
    get cuenta() { return cuenta; },
    get publica() { return publica; }
  };
})(window);
