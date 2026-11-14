/* Centro de Mando · G34 🧭 Panel de Barbería (antes Barberia/admin). Mismas funciones, ahora en CM → Apps → Barbería → 🧭 Panel.
   Los socios de Barbería siguen usando su panel en la app (admin/); el administrador va directo al CM. */
(function (global) {
  'use strict';
  const PLANES_BASE = { clientes: [40, 500], barberos: [3, 10] };
  const REGLAS_BASE = { minutos_pago: 10, minutos_devolucion: 10, horas_cancelacion: 24, dias_saldo: 90, dias_regalo: 30, dias_aviso: 3, dias_comprobantes: 30, dias_anuladas: 30,
    estrellas_lista_negra: 2, minutos_recordar_revision: 15, activas_invitado: 1, apartadas_max: 10, dias_prioridad: 3, dias_sin_volver: 45, descuento_3meses: 15, dias_referido: 30, registro_barberias: 1 };
  const REGLAS = [
    ['minutos_pago', '⏱️ Minutos para pagar y subir el comprobante', 'Si no lo sube en este tiempo, la hora se libera sola.'],
    ['minutos_devolucion', '💸 Minutos para cancelar con devolución del abono', ''],
    ['horas_cancelacion', '🕐 Horas de anticipación para cancelar o reagendar con saldo a favor', 'Con menos de estas horas, pierde el abono.'],
    ['dias_saldo', '💰 Días que dura el saldo a favor (clientes sin cuenta)', ''],
    ['dias_regalo', '🎁 Días de Premium de regalo al crear una barbería', '0 = parte en Free.'],
    ['dias_aviso', '⏳ Días antes del vencimiento para avisar', ''],
    ['dias_comprobantes', '🧾 Días que se guardan los comprobantes', 'Nunca se borran los que están en revisión.'],
    ['dias_anuladas', '❌ Días que se guardan las horas anuladas', ''],
    ['estrellas_lista_negra', '🚫 Estrellas para entrar a la lista negra (o menos)', '0 = nadie entra.'],
    ['minutos_recordar_revision', '🔔 Minutos para recordarle al barbero un abono sin revisar', 'Al doble se le avisa también al dueño.'],
    ['activas_invitado', '👤 Horas activas a la vez para un cliente sin cuenta', ''],
    ['apartadas_max', '🛑 Máximo de horas apartadas sin pagar por barbería (sin cuenta)', ''],
    ['dias_prioridad', '🔥 Días de anticipación para viernes y sábados sin Premium', '0 = sin prioridad.'],
    ['dias_sin_volver', '👋 Días sin venir para "clientes que no vuelven"', ''],
    ['descuento_3meses', '📦 Descuento (%) por pagar 3 meses por adelantado', '0 = no se ofrece.'],
    ['dias_referido', '🤝 Días de Premium por cada barbería que trae', 'Cuando la invitada paga su primer mes. 0 = sin premio.'],
    ['registro_barberias', '💈 Registro abierto de barberías (1 = abierto, 0 = cerrado)', 'Con el link o QR cualquiera crea su barbería.']];
  const PERMISOS = [['pagos', '💰 Aprobar y rechazar pagos Premium'], ['premium', '⭐ Activar Premium y regalar días'], ['cuentas', '🔑 Restablecer claves y suspender'],
    ['ajustes', '⚙️ Precios, planes, reglas y textos'], ['avisos', '📣 Avisos masivos'], ['crear', '➕ Crear barberías'],
    ['eliminar', '🗑️ Eliminar cuentas y barberías, borrar calificaciones, limpiar y quitar Premium']];
  const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const ROL = { owner: 'Dueño', barber: 'Barbero', client: 'Cliente', socio: 'Socio' };

  global.PanelApps.registrar('barberia', (X) => {
    const { esc, toast, confirmar, rpc, fecha, fechaHora, dias, hace, plata, item, vacio, fallo, pedir } = X;
    const web = X.a.web;
    let aj = {};
    const cargarAj = async () => { try { aj = (await rpc('ajustes_publicos')) || {}; } catch (e) { aj = aj || {}; } return aj; };
    const regla = (k) => { const r = aj.reglas || {}; return r[k] !== undefined ? +r[k] : REGLAS_BASE[k]; };
    const limite = (k, pre) => { const v = ((aj.planes || {}).barberia || {})[k]; return v && v[pre ? 'premium' : 'free'] !== undefined ? +v[pre ? 'premium' : 'free'] : (PLANES_BASE[k] || [0, 0])[pre ? 1 : 0]; };
    const linkRegistro = (ref) => web + 'registro/' + (ref ? '?ref=' + encodeURIComponent(ref) : '');
    const clave = () => 'Corte' + String(1000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 9000));
    const mensajeAcceso = (d) => 'Hola ' + d.nombre + ' 👋\n' + (d.nuevo === false ? 'Te restablecimos la clave de ' : 'Te creamos tu cuenta en ') + (d.barberia || 'la app') + ' 💈\n\n' +
      '📲 Entra aquí e instálala: ' + web + (d.codigo ? '?b=' + d.codigo + '&entrar=1' : '') + '\n' + (d.email ? '👤 Correo: ' + d.email + '\n' : '') + '🔑 Clave: ' + d.clave + '\n\nAl entrar, cámbiala en 👤 Mi perfil por una que recuerdes.' +
      (d.nuevo === false || d.tipo === 'socio' ? '' : '\n\n💈 Primeros pasos: en Más agrega tus servicios, tu horario y tu link de pago del abono. Después comparte tu link o QR con tus clientes.');
    const flecha = (a, b) => { if (!b && !a) return ''; if (!b) return ' <span class="pill ok">↑</span>'; const p = Math.round((a - b) / b * 100); return ' <span class="pill ' + (p >= 0 ? 'ok' : 'bad') + '">' + (p >= 0 ? '↑' : '↓') + Math.abs(p) + '%</span>'; };
    const nota = (n) => n && n.total ? ' <span class="pill">★ ' + esc(n.promedio) + '</span>' : '';
    const hora = (t) => new Date(t).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    const hoy = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
    const sumar = (f, n) => { const d = new Date(f + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

    // 💡 Recomendaciones automáticas para cada barbería (se envían por su chat de soporte).
    function recomendaciones(b) {
      const r = [], sinUso = dias(b.ultima_actividad);
      if (sinUso === null || sinUso >= 7) r.push(['😴', 'Lleva ' + (sinUso === null ? 'mucho tiempo' : sinUso + ' días') + ' sin entrar a la app.', 'Hola 👋 ¿Cómo va todo con la app? Si necesitas ayuda para configurar tu agenda o tu link de reservas, aquí estoy.']);
      if (!b.cobra_abono) r.push(['💳', 'No tiene link de pago ni datos de transferencia.', 'Tip 💡: en Más → Links de pago pon tu link de Mercado Pago o tus datos de transferencia. Así tus clientes reservan solos desde tu link o QR.']);
      if (b.servicios < 3) r.push(['✂️', 'Tiene solo ' + b.servicios + ' servicio(s) en su catálogo.', 'Tip 💡: agrega más servicios a tu catálogo (barba, cejas, combos). Los clientes reservan más cuando ven todas las opciones con precio.']);
      if (b.reservas === 0) r.push(['📵', 'Nadie reservó por la app este mes.', 'Tip 💡: comparte tu link o QR (Más → Enlace y QR) en tu local, Instagram y WhatsApp. Tus clientes reservan sin crear cuenta.']);
      const tasa = b.atendidas + b.no_vino ? b.no_vino / (b.atendidas + b.no_vino) : 0;
      if (b.no_vino >= 2 && tasa > 0.12) r.push(['🚫', Math.round(tasa * 100) + '% de "No vino" este mes.', 'Tip 💡: muchos clientes no están llegando. Califícalos después de cada visita: los de pocas estrellas quedan en tu lista negra.' + (b.premium ? '' : ' Con Premium además reciben recordatorios 24 h y 2 h antes.')]);
      if (b.fin_de_semana >= 3) r.push(['📅', 'Le piden harto el fin de semana (' + b.fin_de_semana + ' horas).', 'Tip 💡: tus clientes están pidiendo horas el fin de semana. Si puedes, amplía tu horario del sábado en Más → Horario.']);
      if (!b.ofertas) r.push(['🏷️', 'No tiene ofertas activas.', 'Tip 💡: publica una oferta (ej. "Martes de barba a $X"). A tus clientes les llega un aviso al tiro y suben las reservas en días flojos.']);
      if (b.ventas_ant && b.ventas < b.ventas_ant * 0.8) r.push(['📉', 'Ventas ' + Math.round((1 - b.ventas / b.ventas_ant) * 100) + '% bajo el mes pasado.', 'Hola 👋 Vi que este mes vas un poco más lento. ¿Te ayudo a armar una oferta para tus clientes?']);
      const cf = limite('clientes', false), cp = limite('clientes', true), bf = limite('barberos', false), bp = limite('barberos', true);
      if (!b.premium && b.clientes >= Math.ceil(cf * 0.8)) r.push(['💎', 'Cerca del límite Free (' + b.clientes + '/' + cf + ' clientes con cuenta).', 'Hola 👋 Estás cerca del máximo de ' + cf + ' clientes con cuenta del plan Free. Con Premium puedes tener hasta ' + cp + '. ¿Te cuento?']);
      if (!b.premium && b.barberos >= bf) r.push(['💈', 'Tiene el máximo de barberos Free (' + bf + ').', 'Hola 👋 Ya tienes ' + bf + ' barberos, el máximo Free. Con Premium puedes sumar hasta ' + bp + ' y ver la caja y estadísticas de cada uno.']);
      if (b.premium && b.premium_until && new Date(b.premium_until) - Date.now() < 5 * 864e5) r.push(['⏳', 'Su Premium vence el ' + fecha(b.premium_until) + '.', 'Hola 👋 Tu Premium vence el ' + fecha(b.premium_until) + '. Para renovar, paga en Más → Mi plan y sube tu comprobante. ¡Gracias por confiar en nosotros!']);
      return r;
    }
    const tip = (b, t) => X.soporte(b.owner_id, (b.dueno ? b.dueno + ' · ' : '') + b.nombre, t);

    /* ---------- Resumen ---------- */
    async function resumen(z) {
      z.innerHTML = '<p class="sub">Cargando…</p>';
      let s, rep, lista, uso, vence = [];
      try { [s, rep, lista, uso] = await Promise.all([rpc('admin_resumen'), rpc('admin_reportes'), rpc('admin_barberias'), rpc('admin_uso'), cargarAj()]); } catch (x) { return fallo(z, x); }
      try { vence = await rpc('admin_por_vencer'); } catch (e) { /* base sin la función */ }
      let bdApp = ''; try { const v = await (await fetch('https://raw.githubusercontent.com/CodeFixService/Barberia/main/version.json', { cache: 'no-store' })).json(); bdApp = String(v.bd || ''); } catch (e) { /* sin red */ }
      const top = lista.slice().sort((a, b) => b.ventas - a.ventas), recos = lista.flatMap((b) => recomendaciones(b).slice(0, 2).map((r) => [b, r])).slice(0, 12);
      const tri = regla('descuento_3meses') > 0;
      const cobro = (u) => 'Hola ' + (u.nombre || '').split(' ')[0] + ' 👋 Tu Premium' + (u.rol === 'owner' && u.barberia ? ' de ' + u.barberia : '') + ' vence el ' + fecha(u.premium_until) +
        '. Para renovar (' + plata(u.monto) + '), paga en la app → Mi plan y sube tu comprobante' + (tri ? ', o paga 3 meses con descuento' : '') + '. ¡Gracias! 💈';
      z.innerHTML = (bdApp && s.db_version && s.db_version !== bdApp ? '<p class="sub warn">🗄️ La base es la ' + esc(s.db_version) + ' y la app pide la ' + esc(bdApp) + ': se actualiza sola en máximo 10 minutos.</p>' : '') +
        '<div class="stats">' + item('💈 Barberías', s.barberias + ' <small>⭐ ' + s.barberias_premium + '</small>') + item('👥 Clientes con cuenta', s.clientes + ' <small>⭐ ' + s.clientes_premium + '</small>') +
        item('💰 Ingresos del mes', plata(s.ingresos_mes)) + item('💰 Ingresos total', plata(s.ingresos_total)) + item('📅 Reservas del mes', s.reservas_mes + ' <small>' + s.invitados_mes + ' sin cuenta</small>') +
        item('🧾 Abonos en revisión', s.en_revision) + item('⏳ Por vencer (7 días)', s.por_vencer) +
        item('🔁 Renovación (30 días)', s.renovacion && s.renovacion.vencieron ? Math.round(s.renovacion.renovaron / s.renovacion.vencieron * 100) + '%' : '—') + item('✨ Se registraron solas (mes)', s.registradas_mes || 0) +
        item('🗄️ Base de datos', esc(s.db_version || '—')) + '</div>' +
        (vence.length ? '<div class="card"><h2>⏳ Vencen este mes (' + vence.length + ')</h2><p class="sub">Cóbrales antes de que vuelvan a Free.</p><ul class="list">' + vence.map((u) =>
          '<li><div class="grow"><b>' + esc(u.rol === 'owner' ? (u.barberia || u.nombre) : u.nombre) + '</b> <span class="pill">' + (u.rol === 'owner' ? '💈' : '👤') + '</span><div class="sub">vence ' + fecha(u.premium_until) + ' · ' + plata(u.monto) + (u.pago_en_revision ? ' · 🧾 pago en revisión' : '') + '</div></div>' +
          (u.telefono && !u.pago_en_revision ? '<a class="btn small" target="_blank" rel="noopener" href="' + esc(X.wa(u.telefono, cobro(u))) + '">💬 Cobrar</a>' : '') + '</li>').join('') + '</ul></div>' : '') +
        (rep.length ? '<div class="card"><h2>🚩 Reportes (' + rep.length + ')</h2><ul class="list">' + rep.map((r) => '<li><div class="grow"><b>' + esc(r.de) + ' reportó a ' + esc(r.contra) + '</b><div class="sub">' + esc(r.reason) + ' · "' + esc(r.excerpt || '') + '"</div></div>' +
          '<button type="button" class="small ghost" data-rok="' + esc(r.id) + '">Ignorar</button><button type="button" class="small danger" data-rsus="' + esc(r.id) + '">Suspender</button></li>').join('') + '</ul></div>' : '') +
        '<div class="card"><h2>🏆 Ranking del mes</h2>' + (top.length ? '<ul class="list">' + top.slice(0, 10).map((b, i) => '<li><span>' + (i + 1) + '</span><div class="grow"><b>' + esc(b.nombre) + '</b>' + (b.premium ? ' ⭐' : '') + nota(b.calificacion) +
          '<div class="sub">' + plata(b.ventas) + flecha(b.ventas, b.ventas_ant) + ' · ' + b.reservas + ' reservas' + flecha(b.reservas, b.reservas_ant) + '</div></div></li>').join('') + '</ul>' : vacio('Aún no hay barberías.')) + '</div>' +
        (recos.length ? '<div class="card"><h2>💡 Recomendaciones</h2><ul class="list">' + recos.map(([b, r], i) => '<li><span>' + r[0] + '</span><div class="grow"><b>' + esc(b.nombre) + '</b><div class="sub">' + esc(r[1]) + '</div></div><button type="button" class="small" data-reco="' + i + '">Enviar tip</button></li>').join('') + '</ul></div>' : '') +
        '<p class="sub">🧹 Limpieza, 🔳 link de registro y ⚖️ reglas están en sus propios botones de este panel. Uso: ' + (uso ? uso.comprobantes + ' comprobante(s) y ' + uso.fotos_chat + ' foto(s) del chat guardadas.' : '—') + '</p>';
      z.onclick = async (ev) => {
        const b = ev.target.closest('button'); if (!b) return;
        try {
          if (b.dataset.reco) { const [bb, r] = recos[+b.dataset.reco]; await tip(bb, r[2]); }
          if (b.dataset.rok) { await rpc('admin_resolver_reporte', { p_id: b.dataset.rok, p_suspender: false }); resumen(z); }
          if (b.dataset.rsus && await confirmar('¿Suspender la cuenta reportada?', 'Suspender')) { await rpc('admin_resolver_reporte', { p_id: b.dataset.rsus, p_suspender: true }); resumen(z); }
        } catch (x) { toast('⚠️ ' + x.message); }
      };
    }

    /* ---------- Barberías ---------- */
    const FILTROS = { '': () => true, premium: (b) => b.premium, free: (b) => !b.premium, vence: (b) => b.premium && b.premium_until && new Date(b.premium_until) - Date.now() < 7 * 864e5,
      inactivas: (b) => !b.ultima_actividad || dias(b.ultima_actividad) >= 14, susp: (b) => b.suspended, solas: (b) => b.registro_solo };
    async function barberias(z) {
      z.innerHTML = '<div class="btns" style="margin-top:0"><button type="button" class="small" id="bbMas">➕ Crear barbería</button></div><div class="card" id="bbForm" hidden><h2>💈 Nueva barbería</h2>' +
        '<label>Nombre de la barbería<input id="bbB" maxlength="80" placeholder="Ej: Barbería El Bigote"></label><label>Nombre del dueño<input id="bbN" maxlength="80"></label>' +
        '<label>Correo del dueño (con este entra)<input id="bbE" type="email" autocomplete="off"></label><label>WhatsApp<input id="bbT" inputmode="tel" placeholder="+56 9…"></label>' +
        '<p class="sub" id="bbReg"></p><div class="btns"><button type="button" id="bbOk">Crear barbería</button></div><p class="err" id="bbErr"></p></div>' +
        '<input style="margin-top:10px" id="bbQ" type="search" placeholder="Buscar barbería…" aria-label="Buscar barbería">' +
        '<div class="seg" id="bbF" style="margin-top:8px"><button type="button" class="on" data-f="">Todas</button><button type="button" data-f="premium">⭐ Premium</button><button type="button" data-f="free">Free</button><button type="button" data-f="vence">⏳ Por vencer</button>' +
        '<button type="button" data-f="inactivas">😴 Inactivas</button><button type="button" data-f="susp">⛔ Suspendidas</button><button type="button" data-f="solas">✨ Se registraron solas</button></div><p class="sub" id="bbCt"></p><div id="bbL"><p class="sub">Cargando…</p></div>';
      let L = [], f = '';
      const pintar = () => {
        const t = z.querySelector('#bbQ').value.trim().toLowerCase(), l = L.filter((b) => (!t || (b.nombre + ' ' + b.dueno + ' ' + b.email).toLowerCase().includes(t)) && FILTROS[f](b));
        z.querySelector('#bbCt').textContent = l.length + ' barbería(s)';
        z.querySelector('#bbL').innerHTML = l.map((b) => { const rec = recomendaciones(b).length;
          return '<div class="card"><b>' + esc(b.nombre) + '</b> ' + (b.premium ? '<span class="pill pro">⭐ PREMIUM</span>' : '<span class="pill">FREE</span>') + (b.suspended ? ' <span class="pill bad">Suspendida</span>' : '') + nota(b.calificacion) + (rec ? ' <span class="pill warn">💡 ' + rec + '</span>' : '') +
            '<div class="sub" style="overflow-wrap:break-word">' + esc(b.dueno) + ' · ' + App.correo(b.email) + '</div><div class="sub">' + (b.ultima_actividad ? '🟢 entró ' + hace(b.ultima_actividad) : 'nunca entró') + (b.premium && b.premium_until ? ' · vence ' + fecha(b.premium_until) : '') +
            (b.registro_solo ? ' · ✨ se registró sola' : '') + (b.referida ? ' · 🤝 por ' + esc(b.referida) : '') + (b.socio ? ' · socio ' + esc(b.socio) : '') + '</div>' +
            '<div class="sub">💰 ' + plata(b.ventas) + flecha(b.ventas, b.ventas_ant) + ' · 📅 ' + b.reservas + ' reservas · ' + b.invitados + ' sin cuenta · 🚫 ' + b.no_vino + ' no vino · 👥 ' + b.clientes + ' (⭐' + b.clientes_premium + ') · 💈 ' + b.barberos + ' barberos</div>' +
            '<div class="btns"><button type="button" class="small" data-ver="' + esc(b.id) + '">👁️ Ver ficha</button><button type="button" class="small ghost" data-msg="' + esc(b.id) + '">💬</button>' +
            '<a class="btn small ghost" target="_blank" rel="noopener" href="' + esc(web + 'b/?b=' + encodeURIComponent(b.codigo)) + '">🔗 Su link</a></div></div>'; }).join('') || vacio(L.length ? 'Ninguna barbería con este filtro.' : 'Crea tu primera barbería con ➕.');
      };
      const cargar = async () => { try { L = await rpc('admin_barberias'); pintar(); } catch (x) { fallo(z.querySelector('#bbL'), x); } };
      z.querySelector('#bbQ').oninput = pintar; X.seg(z, '#bbF', (v) => { f = v; pintar(); });
      z.querySelector('#bbL').onclick = (ev) => { const b = ev.target.closest('button'); if (!b) return; const n = L.find((x) => x.id === (b.dataset.ver || b.dataset.msg)); if (!n) return;
        if (b.dataset.ver) ficha(n, cargar); else tip(n, ''); };
      z.querySelector('#bbMas').onclick = () => { const fm = z.querySelector('#bbForm'); fm.hidden = !fm.hidden; const g = regla('dias_regalo');
        z.querySelector('#bbReg').textContent = g ? 'Parte con ' + g + ' días de Premium de regalo (Reglas). Te dejamos el mensaje listo con su acceso.' : 'Parte en Free. Te dejamos el mensaje listo con su acceso.'; };
      z.querySelector('#bbOk').onclick = async (ev) => {
        const v = (id) => z.querySelector(id).value.trim(), er = z.querySelector('#bbErr');
        const d = { barberia: v('#bbB'), nombre: v('#bbN'), email: v('#bbE').toLowerCase(), telefono: v('#bbT'), clave: clave(), tipo: 'owner' };
        er.textContent = ''; if (!d.barberia || !d.nombre || !d.email) { er.textContent = 'Completa nombre de la barbería, dueño y correo'; return; }
        ev.target.disabled = true;
        try { const r = await X.fn('enviar', { accion: 'crear_usuario', email: d.email, password: d.clave, nombre: d.nombre, tipo: d.tipo, telefono: d.telefono, barberia: d.barberia });
          X.acceso('✅ Barbería creada', mensajeAcceso(Object.assign(d, { codigo: r.codigo })), d.telefono); ['#bbB', '#bbN', '#bbE', '#bbT'].forEach((k) => { z.querySelector(k).value = ''; }); cargar(); }
        catch (x) { er.textContent = x.message; }
        ev.target.disabled = false;
      };
      await cargarAj(); cargar();
    }

    // ⭐ Plan: activar 1 mes (pagado), regalar días o quitar Premium (dueños y clientes).
    async function plan(u, que, alTerminar) {
      try {
        if (que === 'act') { await rpc('admin_activar', { p_user: u.id, p_meses: 1, p_precio: null }); toast('⭐ Premium activado por 1 mes'); }
        if (que === 'dias') { const n = await pedir('🎁 Regalar días de Premium', { texto: 'Se suman desde su fecha de término (o desde hoy). No cuenta como ingreso.', valor: '7', si: 'Regalar' }); if (!n || !(+n > 0)) return; await rpc('admin_dias', { p_user: u.id, p_dias: +n }); toast('🎁 ' + n + ' días regalados'); }
        if (que === 'quitar') { if (!(await confirmar('¿Quitar el Premium? Queda en Free sin perder datos.', 'Quitar'))) return; await rpc('admin_quitar_premium', { p_user: u.id }); toast('Premium quitado'); }
        X.enviar(); alTerminar();
      } catch (x) { toast('⚠️ ' + x.message); }
    }
    async function restablecer(u, extra) {
      if (!(await confirmar('Se le pondrá una clave genérica nueva a ' + u.nombre + '.', 'Restablecer'))) return;
      try { const k = clave(); await X.fn('enviar', { accion: 'restablecer_clave', id: u.id, password: k }); X.acceso('✅ Clave restablecida', mensajeAcceso(Object.assign({ nombre: u.nombre, email: u.email, clave: k, nuevo: false }, extra)), u.telefono); }
      catch (x) { toast('⚠️ ' + x.message); }
    }
    // 🗑️ Eliminar una cuenta o una barbería completa (queda en el registro de cambios).
    async function eliminar(u, despues) {
      let conf = null;
      if (u.rol === 'owner') { conf = await pedir('🗑️ Eliminar ' + u.barberia, { texto: 'Se borra TODO: el dueño, sus barberos, sus clientes con cuenta, horas, caja y pagos. No se puede deshacer. Si solo quieres cortarla, usa Suspender. Escribe el nombre exacto de la barbería:', ph: u.barberia, si: 'Eliminar todo' }); if (!conf) return; }
      else if (!(await confirmar((u.rol === 'barber' ? 'Se borra la cuenta de ' + u.nombre + '. Sus horas pasadas y su caja quedan a nombre del dueño.' : 'Se borra la cuenta de ' + u.nombre + '. Sus horas por venir se anulan.') + '\nNo se puede deshacer.', 'Eliminar'))) return;
      try { await rpc('eliminar_cuenta', { p_user: u.id, p_confirmar: conf }); toast('🗑️ Eliminado. Quedó en el registro de cambios'); despues(); } catch (x) { toast('⚠️ ' + x.message); }
    }

    async function ficha(b, recargar) {
      const d = X.modal('<div class="titulo-v"><h2 class="grow">💈 ' + esc(b.nombre) + nota(b.calificacion) + '</h2><button type="button" class="small ghost" data-cerrar>✕</button></div>' +
        '<p class="sub" style="overflow-wrap:break-word">' + esc(b.dueno) + ' · ' + App.correo(b.email) + (b.whatsapp ? ' · ' + esc(b.whatsapp) : '') + '<br>Código: <b>' + esc(b.codigo) + '</b> · creada ' + fecha(b.created_at) + ' · ' + (b.ultima_actividad ? 'entró ' + hace(b.ultima_actividad) : 'nunca entró') + '</p>' +
        '<p><b>' + (b.premium ? '⭐ Premium hasta ' + fecha(b.premium_until) : 'Plan Free') + '</b></p>' +
        '<div class="btns"><button type="button" class="small" data-p="act">⭐ Activar 1 mes (pagado)</button><button type="button" class="small ghost" data-p="dias">🎁 Regalar días</button>' + (b.premium ? '<button type="button" class="small ghost" data-p="quitar">Quitar Premium</button>' : '') + '</div>' +
        '<div id="fbR"></div><div id="fbD"><p class="sub">Cargando detalle…</p></div>' +
        '<div class="btns"><button type="button" class="small ghost" data-x="chat">💬 Escribir</button>' + (b.whatsapp ? '<a class="btn small ghost" target="_blank" rel="noopener" href="' + esc(X.wa(b.whatsapp, 'Hola ' + (b.dueno || '').split(' ')[0] + ' 👋')) + '">WhatsApp</a>' : '') +
        '<button type="button" class="small ghost" data-x="agenda">📅 Ver agenda</button><button type="button" class="small ghost" data-x="clave">🔑 Restablecer clave</button>' +
        '<button type="button" class="small ' + (b.suspended ? '' : 'danger') + '" data-x="sus">' + (b.suspended ? '✅ Reactivar' : '⛔ Suspender') + '</button><button type="button" class="small danger" data-x="del">🗑️ Eliminar barbería</button></div>');
      const u = { id: b.owner_id, nombre: b.dueno, email: b.email, telefono: b.whatsapp, rol: 'owner', barberia: b.nombre }, listo = () => { d.close(); recargar(); };
      const rec = recomendaciones(b);
      d.querySelector('#fbR').innerHTML = rec.length ? '<h3>💡 Recomendaciones</h3><ul class="list">' + rec.map((r, i) => '<li><span>' + r[0] + '</span><div class="grow sub">' + esc(r[1]) + '</div><button type="button" class="small" data-r="' + i + '">Enviar</button></li>').join('') + '</ul>' : '';
      d.onclick = async (ev) => {
        const x = ev.target.closest('button'); if (!x) return;
        if (x.dataset.p) plan(u, x.dataset.p, listo);
        if (x.dataset.r) tip(b, rec[+x.dataset.r][2]);
        if (x.dataset.x === 'chat') tip(b, '');
        if (x.dataset.x === 'agenda') agenda(b);
        if (x.dataset.x === 'clave') restablecer(u, { codigo: b.codigo, barberia: b.nombre });
        if (x.dataset.x === 'del') eliminar(u, listo);
        if (x.dataset.x === 'sus') {
          if (!(await confirmar(b.suspended ? 'Reactivar la barbería y su equipo.' : 'Nadie de esta barbería (equipo y clientes) podrá usar la app ni su link hasta que la reactives.', b.suspended ? 'Reactivar' : 'Suspender'))) return;
          try { await rpc('admin_suspender', { p_user: b.owner_id, p_suspender: !b.suspended }); toast(b.suspended ? '✅ Reactivada' : '⛔ Suspendida'); listo(); } catch (er) { toast('⚠️ ' + er.message); }
        }
      };
      try {
        const r = await rpc('admin_barberia', { p_id: b.id }), mx = Math.max(1, ...r.meses.map((m) => m.ventas));
        const barras = (o, etq) => { const e = Object.entries(o || {}).sort((p, q) => +p[0] - +q[0]), m = Math.max(1, ...e.map((v) => v[1]));
          return e.length ? '<ul class="list">' + e.map(([k, v]) => '<li><span style="width:52px">' + etq(k) + '</span><div class="grow" style="background:var(--line);border-radius:6px;height:10px"><div style="background:var(--brand);height:10px;border-radius:6px;width:' + Math.round(v / m * 100) + '%"></div></div><span>' + v + '</span></li>').join('') + '</ul>' : vacio('Sin datos.'); };
        d.querySelector('#fbD').innerHTML = '<h3>📈 Ventas por mes</h3>' + (r.meses.length ? '<ul class="list">' + r.meses.map((m) => '<li><span>' + esc(m.mes) + '</span><div class="grow" style="background:var(--line);border-radius:6px;height:10px"><div style="background:var(--brand);height:10px;border-radius:6px;width:' + Math.round(m.ventas / mx * 100) + '%"></div></div><span>' + plata(m.ventas) + '</span></li>').join('') + '</ul>' : vacio('Aún no anota ventas.')) +
          '<h3>💈 Equipo (este mes)</h3><ul class="list">' + r.equipo.map((e) => '<li><div class="grow"><b>' + esc(e.nombre) + '</b>' + (e.rol === 'owner' ? ' (dueño)' : '') + '<div class="sub">' + (e.last_seen ? 'activo ' + hace(e.last_seen) : 'nunca entró') + '</div></div><span class="sub">' + e.atendidas + ' cortes · ' + plata(e.ventas) + '</span></li>').join('') + '</ul>' +
          '<h3>✂️ Catálogo</h3>' + (r.catalogo.length ? '<ul class="list">' + r.catalogo.map((s) => '<li><span class="grow">' + esc(s.nombre) + '</span><span class="sub">' + s.duracion + ' min · ' + plata(s.precio) + '</span></li>').join('') + '</ul>' : vacio('Sin servicios.')) +
          '<h3>🔥 Más pedidos (90 días)</h3><p class="sub">' + (r.servicios.length ? r.servicios.map((s) => esc(s.nombre) + ' (' + s.veces + ')').join(' · ') : 'Sin datos.') + '</p>' +
          '<h3>🕐 Horas pico</h3>' + barras(r.horas, (k) => String(k).padStart(2, '0') + ':00') + '<h3>📆 Días pico</h3>' + barras(r.dias, (k) => DIAS[k - 1] || k) +
          '<h3>⚙️ Configuración</h3><p class="sub">Abono: ' + plata(b.abono) + (b.cobra_abono ? '' : ' · ⚠️ sin link ni transferencia') + '<br>' + (b.horario || []).map((h, i) => DIAS[i] + ': ' + esc(!h || h.e === 'x' ? 'Cerrado' : h.i + '–' + h.f + (h.ci ? ' · colación ' + h.ci + '–' + h.cf : ''))).join('<br>') + '</p>';
      } catch (x) { fallo(d.querySelector('#fbD'), x); }
    }

    // 📅 Agenda de una barbería (solo lectura): horas del día por barbero.
    function agenda(b) {
      let f = hoy();
      const d = X.modal('<div class="titulo-v"><h2 class="grow">📅 ' + esc(b.nombre) + '</h2><button type="button" class="small ghost" data-cerrar>✕</button></div>' +
        '<div class="btns" style="margin-top:0;align-items:center"><button type="button" class="small ghost" id="agA">‹</button><b class="grow" id="agT" style="text-align:center"></b><button type="button" class="small ghost" id="agS">›</button></div><div id="agL"></div>');
      const EST = { agendada: '✅', en_revision: '🧾', pendiente: '⏳', atendida: '✂️', no_vino: '🚫', anulada: '❌', cancelada: '❌' };
      const pintar = async () => {
        d.querySelector('#agT').textContent = new Date(f + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
        const z = d.querySelector('#agL'); z.innerHTML = '<p class="sub">Cargando…</p>';
        try {
          const [o, eq] = await Promise.all([rpc('ocupacion', { p_desde: f, p_hasta: f, p_barberia: b.id }), rpc('admin_barberia', { p_id: b.id })]);
          const res = o.reservas || [];
          z.innerHTML = eq.equipo.map((e) => { const l = res.filter((r) => r.barbero_id === e.id);
            return '<h3>💈 ' + esc(e.nombre) + '</h3>' + (l.length ? '<ul class="list">' + l.map((r) => '<li><b>' + hora(r.inicio) + '–' + hora(r.fin) + '</b><div class="grow">' + esc(r.cliente || 'Ocupado') +
              '<div class="sub">' + esc((r.servicios || []).map((s) => s.nombre).join(', ')) + (r.total != null ? ' · ' + plata(r.total) : '') + '</div></div><span title="' + esc(r.estado) + '">' + (EST[r.estado] || '•') + '</span></li>').join('') + '</ul>' : '<p class="sub">Sin horas.</p>'); }).join('') || vacio('Sin equipo.');
        } catch (x) { fallo(z, x); }
      };
      d.querySelector('#agA').onclick = () => { f = sumar(f, -1); pintar(); };
      d.querySelector('#agS').onclick = () => { f = sumar(f, 1); pintar(); };
      pintar();
    }

    /* ---------- Usuarios (clientes y barberos) ---------- */
    async function usuarios(z) {
      z.innerHTML = '<div class="seg" id="usM"><button type="button" class="on" data-f="clientes">👥 Clientes</button><button type="button" data-f="equipo">✂️ Barberos y dueños</button></div>' +
        '<input id="usQ" type="search" placeholder="Buscar…" aria-label="Buscar usuario"><p class="sub" id="usCt"></p><div id="usL"><p class="sub">Cargando…</p></div>';
      let L = [], modo = 'clientes';
      const pintar = () => {
        const t = z.querySelector('#usQ').value.trim().toLowerCase(), l = L.filter((u) => !t || (u.nombre + ' ' + u.email + ' ' + (u.barberia || '')).toLowerCase().includes(t));
        z.querySelector('#usCt').textContent = l.length + ' usuario(s) · ' + l.filter((u) => u.premium).length + ' Premium';
        z.querySelector('#usL').innerHTML = l.length ? '<ul class="list">' + l.slice(0, 500).map((u) => '<li><div class="grow"><b>' + esc(u.nombre) + '</b> ' + (u.premium ? '<span class="pill pro">⭐</span>' : '') + (u.suspended ? ' <span class="pill bad">Suspendido</span>' : '') +
          '<div class="sub" style="overflow-wrap:break-word">' + App.correo(u.email) + ' · ' + esc(u.barberia || '') + ' · ' + (ROL[u.rol] || u.rol) + (u.premium && u.premium_until ? ' · hasta ' + fecha(u.premium_until) : '') + ' · visto ' + hace(u.last_seen) + '</div></div>' +
          '<button type="button" class="small ghost" data-u="' + esc(u.id) + '">›</button></li>').join('') + '</ul>' : vacio('Nadie aún.');
      };
      const cargar = async () => { try { L = await rpc('admin_usuarios', { p_rol: modo === 'clientes' ? 'client' : null, p_barberia: null }); if (modo === 'equipo') L = L.filter((u) => u.rol !== 'client'); pintar(); } catch (x) { fallo(z.querySelector('#usL'), x); } };
      z.querySelector('#usQ').oninput = pintar; X.seg(z, '#usM', (v) => { modo = v; cargar(); });
      z.querySelector('#usL').onclick = (ev) => { const b = ev.target.closest('[data-u]'); if (b) fichaUsuario(L.find((u) => u.id === b.dataset.u), cargar); };
      cargar();
    }
    function fichaUsuario(u, recargar) {
      const conPlan = u.rol === 'owner' || u.rol === 'client';
      const d = X.modal('<div class="titulo-v"><h2 class="grow">' + esc(u.nombre) + (u.premium ? ' <span class="pill pro">⭐ Premium</span>' : '') + '</h2><button type="button" class="small ghost" data-cerrar>✕</button></div>' +
        '<p class="sub" style="overflow-wrap:break-word">' + App.correo(u.email) + '<br>' + (ROL[u.rol] || u.rol) + ' · ' + esc(u.barberia || '') + (u.telefono ? ' · ' + esc(u.telefono) : '') + '<br>Creado ' + fecha(u.created_at) + ' · visto ' + hace(u.last_seen) +
        (u.premium && u.premium_until ? '<br>⭐ Premium hasta ' + fecha(u.premium_until) : '') + (u.trial_used && u.rol === 'client' ? '<br>🎁 Ya usó su prueba' : '') + '</p>' +
        '<div class="btns">' + (conPlan ? '<button type="button" class="small" data-p="act">⭐ Activar 1 mes</button><button type="button" class="small ghost" data-p="dias">🎁 Regalar días</button>' + (u.premium ? '<button type="button" class="small ghost" data-p="quitar">Quitar Premium</button>' : '') : '') +
        '<button type="button" class="small ghost" data-x="clave">🔑 Restablecer clave</button><button type="button" class="small ' + (u.suspended ? '' : 'danger') + '" data-x="sus">' + (u.suspended ? '✅ Reactivar' : '⛔ Suspender') + '</button>' +
        '<button type="button" class="small danger" data-x="del">🗑️ Eliminar cuenta</button></div>');
      const listo = () => { d.close(); recargar(); };
      d.onclick = async (ev) => {
        const x = ev.target.closest('button'); if (!x) return;
        if (x.dataset.p) plan(u, x.dataset.p, listo);
        if (x.dataset.x === 'clave') restablecer(u, { barberia: u.barberia });
        if (x.dataset.x === 'del') eliminar(u, listo);
        if (x.dataset.x === 'sus') { try { await rpc('admin_suspender', { p_user: u.id, p_suspender: !u.suspended }); toast(u.suspended ? '✅ Reactivado' : '⛔ Suspendido'); listo(); } catch (er) { toast('⚠️ ' + er.message); } }
      };
    }

    const L = [
      { k: 'resumen', ico: '📊', t: 'Resumen', d: 'Números, ranking, 💡 tips y cobros', abrir: resumen },
      { k: 'barberias', ico: '💈', t: 'Barberías', d: 'Ficha, Premium, agenda, suspender y crear', abrir: barberias },
      { k: 'usuarios', ico: '👥', t: 'Usuarios', d: 'Clientes y barberos', abrir: usuarios },
      { k: 'registro_abierto', ico: '🔳', t: 'Link y QR para barberías', d: 'Registro abierto con regalo', abrir: async (z) => {
        z.innerHTML = ''; await cargarAj();
        if (!regla('registro_barberias')) z.insertAdjacentHTML('beforeend', '<p class="sub warn">⚠️ El registro está cerrado: ábrelo en ⚖️ Reglas (registro_barberias = 1).</p>');
        X.tarjetaLink(z, { titulo: '🔳 Nuevas barberías', texto: 'Con este link o QR cualquier barbería crea su app sola' + (regla('dias_regalo') ? ', con ' + regla('dias_regalo') + ' días de Premium de regalo' : '') + '.', link: linkRegistro(''), archivo: 'qr-registro-barberias', mensaje: '💈 Crea gratis la app de reservas de tu barbería' });
      } },
      { k: 'limpieza', ico: '🧹', t: 'Limpieza', d: 'Comprobantes, fotos, avisos y horas', abrir: async (z) => {
        z.innerHTML = '<p class="sub">Cargando…</p>'; let u; try { [u] = await Promise.all([rpc('admin_uso'), cargarAj()]); } catch (x) { return fallo(z, x); }
        z.innerHTML = '<div class="card"><p class="sub">Fotos guardadas: ' + u.comprobantes + ' comprobante(s) y ' + u.fotos_chat + ' foto(s) del chat. Se borran solas a los ' + regla('dias_comprobantes') + ' días; nunca se borra un comprobante en revisión.</p>' +
          '<div class="btns"><button type="button" class="small ghost" data-l="comprobantes">🧾 Comprobantes de +7 días</button><button type="button" class="small ghost" data-l="fotos_chat">🖼️ Fotos del chat de +7 días</button>' +
          '<button type="button" class="small ghost" data-l="avisos">🔔 Avisos de +2 días</button><button type="button" class="small ghost" data-l="anuladas">❌ Horas anuladas de +7 días</button></div></div>';
        z.onclick = async (ev) => { const b = ev.target.closest('[data-l]'); if (!b) return;
          if (!(await confirmar('Se borrará: ' + b.textContent.trim() + '. Lo que está en revisión no se toca. No se puede deshacer.', 'Limpiar'))) return;
          try { const r = await rpc('admin_limpiar', { p_que: b.dataset.l }); toast('🧹 Listo: ' + ((r && r.borrados) || 0) + ' elemento(s)'); L.find((x) => x.k === 'limpieza').abrir(z); } catch (x) { toast('⚠️ ' + x.message); } };
      } },
      { k: 'reglas', ico: '⚖️', t: 'Reglas', d: 'Minutos, horas y días', abrir: async (z) => {
        await cargarAj();
        z.innerHTML = '<div class="card">' + REGLAS.map(([k, t, dd]) => '<label>' + esc(t) + '<input data-rg="' + k + '" type="number" inputmode="numeric" value="' + regla(k) + '"></label>' + (dd ? '<p class="sub">' + esc(dd) + '</p>' : '')).join('') +
          '<div class="btns"><button type="button" id="rgOk">💾 Guardar reglas</button></div></div>';
        z.querySelector('#rgOk').onclick = async (ev) => { const p = {}; z.querySelectorAll('[data-rg]').forEach((i) => { p[i.dataset.rg] = i.value; });
          ev.target.disabled = true; try { await rpc('admin_guardar_reglas', { p }); await cargarAj(); toast('✅ Reglas guardadas'); } catch (x) { toast('⚠️ ' + x.message); } ev.target.disabled = false; };
      } },
      { k: 'push', ico: '🔔', t: 'Notificaciones', d: 'Claves push y servidor', abrir: async (z) => {
        let s = {}; try { s = await rpc('admin_secretos_estado'); } catch (e) { /* nada */ }
        z.innerHTML = '<div class="card"><p>' + (s.vapid_public && s.vapid_private ? '✅ Claves push configuradas' : '⚠️ Falta generar las claves push (una sola vez)') + '</p>' +
          '<div class="btns"><button type="button" class="small ghost" id="puV">' + (s.vapid_public ? 'Regenerar claves' : 'Generar claves push') + '</button><button type="button" class="small ghost" id="puP">🩺 Probar servidor</button><button type="button" class="small ghost" id="puA">Enviarme un aviso de prueba</button></div><p class="sub" id="puR"></p></div>';
        z.querySelector('#puV').onclick = async () => {
          if (s.vapid_public && !(await confirmar('Si regeneras las claves, todos deberán volver a activar las notificaciones.', 'Regenerar'))) return;
          try { const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']), jwk = await crypto.subtle.exportKey('jwk', kp.privateKey), raw = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey));
            const b64u = (u8) => btoa(String.fromCharCode(...u8)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
            await rpc('admin_secreto', { p_name: 'vapid_private', p_value: jwk.d }); await rpc('admin_secreto', { p_name: 'vapid_public', p_value: b64u(raw) }); toast('🔔 Claves push listas'); L.find((x) => x.k === 'push').abrir(z); } catch (x) { toast('⚠️ ' + x.message); }
        };
        z.querySelector('#puP').onclick = async () => { const r = z.querySelector('#puR'); try { const x = await X.fn('enviar', { accion: 'ping' }); r.textContent = x.servicio ? '✅ Conectado: función "enviar" v' + x.version : '⚠️ La función responde, pero le falta la clave de servidor'; } catch (x) { r.textContent = '❌ ' + x.message; } };
        z.querySelector('#puA').onclick = async () => { try { await rpc('aviso_prueba'); X.enviar(); toast('🔔 Aviso de prueba enviado (llega a tu cuenta de Barbería)'); } catch (x) { toast('⚠️ ' + x.message); } };
      } },
      { k: 'calificaciones', ico: '⭐', t: 'Calificaciones', d: 'Revisar y borrar', abrir: async (z) => {
        let l; try { l = await rpc('admin_calificaciones'); } catch (x) { return fallo(z, x); }
        z.innerHTML = '<p class="sub">Borra las injustas u ofensivas. Las de clientes a barberías forman el promedio público; las de barberías a clientes, la lista negra.</p><ul class="list">' +
          (l.map((q) => '<li><div class="grow"><b>' + '★'.repeat(q.estrellas) + ' ' + (q.autor === 'cliente' ? esc(q.cliente || 'Cliente') + ' → ' + esc(q.barberia) : esc(q.barberia) + ' → ' + esc(q.cliente || 'Cliente')) + '</b>' +
            '<div class="sub">' + esc([q.motivo, q.comentario].filter(Boolean).join(' · ')) + ' · ' + hace(q.created_at) + '</div></div><button type="button" class="small danger" data-del="' + esc(q.id) + '">Borrar</button></li>').join('') || '<li class="empty">Aún no hay calificaciones.</li>') + '</ul>';
        z.onclick = async (ev) => { const b = ev.target.closest('[data-del]'); if (!b || !(await confirmar('¿Borrar esta calificación? Cambia el promedio.', 'Borrar'))) return;
          try { await rpc('admin_borrar_calificacion', { p_id: b.dataset.del }); L.find((x) => x.k === 'calificaciones').abrir(z); } catch (x) { toast('⚠️ ' + x.message); } };
      } },
      { k: 'socios', ico: '🤝', t: 'Socios', d: 'Quién te ayuda y qué puede hacer', abrir: async (z) => {
        let l; try { l = await rpc('admin_socios'); } catch (x) { return fallo(z, x); }
        z.innerHTML = '<p class="sub">Los socios entran al panel de Barbería en la app y hacen lo que les marques. Todo queda en el Registro de cambios.</p>' +
          '<div class="btns" style="margin-top:0"><button type="button" class="small" id="soMas">➕ Crear socio</button></div><div class="card" id="soForm" hidden><h2>🤝 Nuevo socio</h2><label>Nombre<input id="soN" maxlength="80"></label>' +
          '<label>Correo (con este entra)<input id="soE" type="email" autocomplete="off"></label><label>WhatsApp<input id="soT" inputmode="tel" placeholder="+56 9…"></label><p class="sub">Parte con todos los permisos.</p>' +
          '<div class="btns"><button type="button" id="soOk">Crear socio</button></div><p class="err" id="soErr"></p></div>' +
          (l.map((x) => '<div class="card" data-socio="' + esc(x.id) + '"><b>' + esc(x.nombre) + '</b> ' + (x.suspended ? '<span class="pill bad">Suspendido</span>' : '<span class="pill ok">Activo</span>') +
            '<div class="sub" style="overflow-wrap:break-word">' + App.correo(x.email) + ' · visto ' + hace(x.last_seen) + ' · trajo ' + x.barberias + ' barbería(s), ' + x.premium + ' Premium</div>' +
            PERMISOS.map(([k, t]) => '<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" style="width:auto" data-pm="' + k + '"' + ((x.permisos || {})[k] ? ' checked' : '') + '> ' + esc(t) + '</label>').join('') +
            '<div class="btns"><button type="button" class="small" data-g>💾 Guardar permisos</button><button type="button" class="small ghost" data-qr>🔳 Su link</button><button type="button" class="small ' + (x.suspended ? '' : 'danger') + '" data-s>' + (x.suspended ? 'Reactivar' : 'Suspender') + '</button></div><div data-lk></div></div>').join('') || vacio('Aún no tienes socios.'));
        z.querySelector('#soMas').onclick = () => { const f = z.querySelector('#soForm'); f.hidden = !f.hidden; };
        z.querySelector('#soOk').onclick = async (ev) => {
          const v = (id) => z.querySelector(id).value.trim(), d = { nombre: v('#soN'), email: v('#soE').toLowerCase(), telefono: v('#soT'), clave: clave(), tipo: 'socio' };
          if (!d.nombre || !d.email) { z.querySelector('#soErr').textContent = 'Falta el nombre o el correo'; return; }
          ev.target.disabled = true;
          try { await X.fn('enviar', { accion: 'crear_usuario', email: d.email, password: d.clave, nombre: d.nombre, tipo: 'socio', telefono: d.telefono }); X.acceso('✅ Socio creado', mensajeAcceso(Object.assign(d, { barberia: 'el panel de CodeFix' })), d.telefono); L.find((x) => x.k === 'socios').abrir(z); }
          catch (x) { z.querySelector('#soErr').textContent = x.message; ev.target.disabled = false; }
        };
        z.querySelectorAll('[data-socio]').forEach((c) => { const x = l.find((y) => y.id === c.dataset.socio);
          c.querySelector('[data-g]').onclick = async () => { const permisos = {}; c.querySelectorAll('[data-pm]').forEach((i) => { permisos[i.dataset.pm] = i.checked; });
            try { await rpc('admin_guardar_socio', { p_id: x.id, p: { permisos } }); toast('✅ Permisos guardados'); } catch (er) { toast('⚠️ ' + er.message); } };
          c.querySelector('[data-s]').onclick = async () => { try { await rpc('admin_guardar_socio', { p_id: x.id, p: { suspended: !x.suspended } }); L.find((y) => y.k === 'socios').abrir(z); } catch (er) { toast('⚠️ ' + er.message); } };
          c.querySelector('[data-qr]').onclick = () => { const k = c.querySelector('[data-lk]'); if (k.innerHTML) { k.innerHTML = ''; return; }
            X.tarjetaLink(k, { titulo: '🔳 Link de ' + x.nombre, texto: 'Las barberías que se registren con este link quedan a nombre de ' + x.nombre + '.', link: linkRegistro(x.ref_codigo), archivo: 'qr-' + x.ref_codigo, mensaje: '💈 Crea gratis la app de reservas de tu barbería' }); };
        });
      } },
      { k: 'auditoria', ico: '📜', t: 'Registro de cambios', d: 'Lo que se hizo en el panel', abrir: async (z) => {
        let l; try { l = await rpc('admin_auditoria'); } catch (x) { return fallo(z, x); }
        let fl = 'todo';
        const pintar = () => {
          const f = l.filter((a) => fl === 'todo' || (fl === 'socios' && a.rol === 'socio') || (fl === 'borrados' && /Eliminar|Limpieza|borrada|Quitar|Suspender/.test(a.accion)));
          z.innerHTML = '<p class="sub">Todo lo que hacen tú, tus socios y los dueños al eliminar cuentas, con quién y cuándo.</p><div class="seg" id="auF"><button type="button" data-f="todo">Todo</button><button type="button" data-f="socios">🤝 Socios</button><button type="button" data-f="borrados">🗑️ Borrados y cortes</button></div>' +
            '<ul class="list">' + (f.map((a) => '<li><div class="grow"><b>' + esc(a.accion) + '</b> <span class="sub">' + esc(a.detalle) + '</span><div class="sub">por ' + esc(a.quien) + (a.rol === 'socio' ? ' <span class="pill">socio</span>' : '') + '</div></div><span class="sub">' + fechaHora(a.created_at) + '</span></li>').join('') || '<li class="empty">Nada por aquí.</li>') + '</ul>';
          z.querySelectorAll('#auF [data-f]').forEach((b) => b.classList.toggle('on', b.dataset.f === fl));
          X.seg(z, '#auF', (v) => { fl = v; pintar(); });
          if (global.CFX_AJUSTES && global.CFX_AJUSTES.registro) global.CFX_AJUSTES.registro(z, (fn, a) => rpc(fn, a), { recargar: () => L.find((x) => x.k === 'auditoria').abrir(z) });
        };
        pintar();
      } }
    ];
    return L;
  });
})(window);
