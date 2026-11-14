/* Centro de Mando · G34 🧭 Panel de BiciTaller (antes Taller/admin). Mismas funciones, ahora en CM → Apps → BiciTaller → 🧭 Panel.
   Los socios de BiciTaller siguen usando su panel en la app (admin/). */
(function (global) {
  'use strict';
  const CAMPOS = [['minutos_pago', 'Minutos para pagar el abono y subir el comprobante'], ['minutos_devolucion', 'Minutos para cancelar con devolución del abono'],
    ['horas_cancelacion', 'Horas mínimas para cancelar/reagendar con saldo a favor'], ['dias_saldo', 'Días que dura el saldo a favor'],
    ['dias_regalo_taller', 'Días de Premium de regalo al crear un taller (también si se registra solo)'], ['dias_aviso_vencimiento', 'Días antes del vencimiento para avisar'],
    ['dias_comprobantes', 'Días que se guardan los comprobantes'], ['dias_referido', 'Días de Premium para el taller que invita (0 = sin premio)'],
    ['horas_libera_premium', 'Horas antes de la cita en que una hora exclusiva Premium se abre a todos'], ['dias_fotos', 'Días que se guardan las fotos antes/después']];
  const clave = () => { const L = 'abcdefghjkmnpqrstuvwxyz', r = crypto.getRandomValues(new Uint32Array(9)), l = (i) => L[r[i] % L.length], n = (i) => String(r[i] % 10); return l(0).toUpperCase() + l(1) + l(2) + n(3) + n(4) + n(5) + n(6) + l(7) + l(8); };

  global.PanelApps.registrar('bicitaller', (X) => {
    const { esc, toast, confirmar, rpc, fecha, fechaHora, hace, plata, item, vacio, fallo, pedir } = X;
    const web = X.a.web;
    let pub = { config: {} };
    const cargarPub = async () => { try { pub = (await rpc('config_publica')) || { config: {} }; } catch (e) { /* usa la anterior */ } pub.config = pub.config || {}; return pub; };
    const servidor = (body) => X.fn('servidor', body);
    const empujar = () => { try { X.c.functions.invoke('servidor').catch(() => {}); } catch (e) { /* nada */ } };
    const nota = (o) => o && o.total ? ' <span class="pill">★ ' + String(o.promedio).replace('.', ',') + ' (' + o.total + ')</span>' : '';
    const mensajeAcceso = (d) => 'Hola ' + d.nombre + ' 👋\nTe creamos tu cuenta en ' + (d.lugar || 'BiciTaller') + '.\n\n📲 Entra aquí e instala la app: ' + web +
      '\n👤 Correo: ' + d.email + '\n🔑 Contraseña: ' + d.password + '\n\nCambia tu contraseña en "Mi cuenta" la primera vez que entres.';
    const crear = async (d) => { const r = await servidor(Object.assign({ accion: 'crear_cuenta' }, d)); if (!r.ok) throw new Error(r.error || 'No se pudo crear la cuenta'); return r; };
    const borrar = async (tipo, id) => { const r = await servidor({ accion: 'borrar', tipo, id, motivo: '' }); if (!r.ok) throw new Error(r.error || 'No se pudo borrar'); return r; };

    // 💬 Chat con el taller (el mismo chat que el taller ve en su app).
    function chat(tid, titulo) {
      const d = X.modal('<div class="titulo-v"><h2 class="grow">💬 ' + esc(titulo) + '</h2><button type="button" class="small ghost" data-cerrar>✕</button></div><div id="chM" style="max-height:50vh;overflow:auto"><p class="sub">Cargando…</p></div>' +
        '<label>Mensaje<textarea id="chT" rows="3" maxlength="1000"></textarea></label><div class="btns"><button type="button" class="small ghost" id="chL">🧹 Limpiar</button><button type="button" class="small ghost" id="chR">🔄</button><button type="button" id="chE">➤ Enviar</button></div>');
      const box = d.querySelector('#chM');
      const leer = async () => { try { const m = await rpc('chat_leer', { p_taller: tid, p_cliente: null });
        box.innerHTML = m.length ? '<ul class="list">' + m.map((x) => '<li style="' + (x.mio ? 'flex-direction:row-reverse;text-align:right' : '') + '"><div class="grow">' + (x.imagen ? '<img src="' + esc(x.imagen) + '" alt="Foto" style="max-width:160px;border-radius:8px;display:block">' : '') + esc(x.texto || '') + '<div class="sub">' + (x.mio ? 'Tú · ' : '') + hace(x.created_at) + '</div></div></li>').join('') + '</ul>' : vacio('Escribe el primer mensaje 👋');
        box.scrollTop = box.scrollHeight; } catch (x) { fallo(box, x); } };
      d.querySelector('#chE').onclick = async () => { const t = d.querySelector('#chT').value.trim(); if (!t) return;
        try { await rpc('chat_enviar', { p_taller: tid, p_cliente: null, p_texto: t, p_imagen: null }); d.querySelector('#chT').value = ''; empujar(); leer(); } catch (x) { toast('⚠️ ' + x.message); } };
      d.querySelector('#chR').onclick = leer;
      d.querySelector('#chL').onclick = async () => { if (!(await confirmar('¿Borrar todos los mensajes de esta conversación?', 'Sí, limpiar'))) return; try { await rpc('chat_limpiar', { p_taller: tid, p_cliente: null }); leer(); } catch (x) { toast('⚠️ ' + x.message); } };
      leer();
    }
    function agregarUsuario(tid, nombre, alTerminar) {
      const d = X.modal('<h2>👤 Agregar a ' + esc(nombre) + '</h2><label>Tipo<select id="uaR"><option value="cliente">Cliente</option><option value="equipo">Equipo (mecánico)</option></select></label>' +
        '<label>Nombre<input id="uaN" maxlength="80"></label><label>WhatsApp<input id="uaT" inputmode="tel"></label><label>Correo<input id="uaE" type="email" autocomplete="off"></label><label>Contraseña<input id="uaP" value="' + clave() + '"></label>' +
        '<div class="btns"><button type="button" class="ghost" data-cerrar>Cancelar</button><button type="button" id="uaOk">Crear</button></div><p class="err" id="uaErr"></p>');
      d.querySelector('#uaOk').onclick = async (ev) => {
        const v = (id) => d.querySelector(id).value.trim(), x = { rol: v('#uaR'), nombre: v('#uaN'), telefono: v('#uaT'), email: v('#uaE'), password: v('#uaP'), taller_id: tid };
        ev.target.disabled = true;
        try { await crear(x); d.close(); X.acceso('✅ Cuenta creada', mensajeAcceso({ nombre: x.nombre.split(' ')[0], email: x.email, password: x.password, lugar: nombre }), x.telefono); alTerminar(); }
        catch (er) { d.querySelector('#uaErr').textContent = er.message; ev.target.disabled = false; }
      };
    }

    const L = [
      { k: 'resumen', ico: '📊', t: 'Resumen', d: 'Talleres, clientes, reservas e ingresos', abrir: async (z) => {
        z.innerHTML = '<p class="sub">Cargando…</p>'; let r; try { [r] = await Promise.all([rpc('admin_resumen'), cargarPub()]); } catch (x) { return fallo(z, x); }
        z.innerHTML = '<div class="stats">' + [['🚲 Talleres', r.talleres], ['⭐ Talleres Premium', r.talleres_premium], ['🟢 Activos 7 días', r.talleres_activos_7d], ['⏳ Vencen en 7 días', r.por_vencer],
          ['👥 Clientes con cuenta', r.clientes], ['⭐ Clientes Premium', r.clientes_premium], ['🔧 Personas de equipo', r.equipo], ['📅 Reservas este mes', r.reservas_mes], ['📅 Reservas hoy', r.reservas_hoy],
          ['💰 Ingresos del mes', plata(r.ingresos_mes)], ['🆕 Talleres nuevos (7 días)', r.talleres_nuevos_7d == null ? '—' : r.talleres_nuevos_7d], ['🗄️ Base de datos', esc(r.version)]].map((x) => item(x[0], x[1])).join('') + '</div>';
      } },
      { k: 'talleres', ico: '🚲', t: 'Talleres', d: 'Premium, chat, suspender, eliminar y crear', abrir: async (z) => {
        await cargarPub(); const regalo = pub.config.dias_regalo_taller || 30;
        z.innerHTML = '<div class="btns" style="margin-top:0"><button type="button" class="small" id="taMas">➕ Crear taller</button></div><div class="card" id="taForm" hidden><h2>➕ Crear taller</h2><p class="sub">Parte con ' + regalo + ' días de Premium de regalo. Le mandas el acceso por WhatsApp.</p>' +
          '<label>Nombre del taller<input id="taT" maxlength="80" placeholder="Bici Sur"></label><label>Nombre del dueño<input id="taD" maxlength="80"></label><label>Correo del dueño<input id="taE" type="email" autocomplete="off"></label>' +
          '<label>WhatsApp<input id="taW" inputmode="tel"></label><label>Contraseña inicial<input id="taP" autocomplete="off" value="' + clave() + '"></label><div class="btns"><button type="button" id="taOk">Crear taller</button></div><p class="err" id="taErr"></p></div>' +
          '<input style="margin-top:10px" id="taQ" type="search" placeholder="Buscar taller…" aria-label="Buscar taller">' +
          '<div class="seg" id="taF" style="margin-top:8px"><button type="button" class="on" data-f="">Todos</button><button type="button" data-f="premium">⭐ Premium</button><button type="button" data-f="free">Gratis</button><button type="button" data-f="vence">⏳ Por vencer</button>' +
          '<button type="button" data-f="solos">🆕 Se registraron solos</button><button type="button" data-f="inactivos">💤 Sin actividad 7 días</button><button type="button" data-f="suspendidos">⛔ Suspendidos</button></div><p class="sub" id="taCt"></p><div id="taL"><p class="sub">Cargando…</p></div>';
        let T = [], f = '';
        const pintar = () => {
          const q = z.querySelector('#taQ').value.trim().toLowerCase(), semana = Date.now() - 7 * 864e5, siete = Date.now() + 7 * 864e5;
          const l = T.filter((t) => (!q || (t.nombre + ' ' + t.email + ' ' + t.comuna + ' ' + t.dueno).toLowerCase().includes(q)) && (!f || (f === 'premium' && t.premium) || (f === 'free' && !t.premium) || (f === 'suspendidos' && t.suspendido) ||
            (f === 'solos' && t.autoregistro) || (f === 'vence' && t.premium && new Date(t.premium_hasta) < siete) || (f === 'inactivos' && (!t.visto_at || new Date(t.visto_at) < semana))));
          z.querySelector('#taCt').textContent = l.length + ' taller(es)';
          z.querySelector('#taL').innerHTML = l.map((t) => '<div class="card"><b>' + esc(t.icono || '🚲') + ' ' + esc(t.nombre) + '</b> ' + (t.premium ? '<span class="pill pro">PREMIUM</span>' : '<span class="pill">GRATIS</span>') + (t.suspendido ? ' <span class="pill bad">Suspendido</span>' : '') +
            (t.cobra_abono ? '' : ' <span class="pill warn">Sin link de abono</span>') + (t.autoregistro ? ' <span class="pill info">🆕 Se registró solo</span>' : '') + (t.referido_por ? ' <span class="pill">🤝 Invitado por ' + esc(t.referido_por) + '</span>' : '') + (t.invitados ? ' <span class="pill ok">🤝 Invitó a ' + t.invitados + '</span>' : '') + nota(t.nota) +
            '<div class="sub" style="overflow-wrap:anywhere">' + esc(t.dueno || '') + ' · ' + esc(t.email || '') + (t.comuna ? ' · ' + esc(t.comuna) : '') + '</div>' +
            '<div class="sub">' + (t.premium ? '⭐ Premium hasta ' + fecha(t.premium_hasta) : t.premium_hasta ? 'Premium venció el ' + fecha(t.premium_hasta) : 'Nunca fue Premium') + ' · 🟢 visto ' + hace(t.visto_at) + '</div>' +
            '<div class="sub">👥 ' + t.clientes + ' clientes (' + t.clientes_cuenta + ' con cuenta) · 🔧 ' + t.equipo + ' equipo · 📅 ' + t.reservas_mes + ' reservas este mes (' + t.reservas_total + ' total) · 🛠️ ' + t.servicios + ' servicios · 🏷️ ' + t.promos + ' promos</div>' +
            '<div class="btns"><select data-prem="' + esc(t.id) + '" aria-label="Premium"><option value="">⭐ Premium…</option><option value="7">+7 días</option><option value="30">+30 días</option><option value="90">+90 días</option><option value="365">+1 año</option><option value="otro">Otro número de días…</option><option value="0">Quitar Premium</option></select>' +
            '<a class="btn small ghost" target="_blank" rel="noopener" href="' + esc(web + 't/?s=' + encodeURIComponent(t.slug)) + '">🔗 Página</a>' + (t.telefono ? '<a class="btn small ghost" target="_blank" rel="noopener" href="' + esc(X.wa(t.telefono, 'Hola ' + (t.dueno || '') + ' 👋')) + '">📲</a>' : '') +
            '<button type="button" class="small ghost" data-chat="' + esc(t.id) + '">💬</button><button type="button" class="small ghost" data-add="' + esc(t.id) + '">👤＋</button>' +
            '<button type="button" class="small ' + (t.suspendido ? '' : 'danger') + '" data-susp="' + esc(t.id) + '">' + (t.suspendido ? '✅ Reactivar' : '⛔ Suspender') + '</button><button type="button" class="small danger" data-del="' + esc(t.id) + '">🗑️</button></div></div>').join('') || vacio('No hay talleres aquí.');
        };
        const cargar = async () => { try { T = await rpc('admin_talleres'); pintar(); } catch (x) { fallo(z.querySelector('#taL'), x); } };
        z.querySelector('#taQ').oninput = pintar; X.seg(z, '#taF', (v) => { f = v; pintar(); });
        z.querySelector('#taL').onchange = async (ev) => {
          const s = ev.target.closest('[data-prem]'); if (!s || !s.value) return;
          let n = s.value === 'otro' ? parseInt(await pedir('⭐ Días de Premium', { valor: '15', si: 'Dar' }), 10) : +s.value; s.value = '';
          if (isNaN(n)) return; if (n === 0 && !(await confirmar('¿Quitar el Premium a este taller? Vuelve a la versión gratis.', 'Quitar'))) return;
          try { await rpc('admin_premium', { p_tipo: 'taller', p_id: s.dataset.prem, p_dias: n, p_motivo: null }); empujar(); toast(n ? '⭐ +' + n + ' días' : 'Premium quitado'); cargar(); } catch (x) { toast('⚠️ ' + x.message); }
        };
        z.querySelector('#taL').onclick = async (ev) => {
          const b = ev.target.closest('button'); if (!b) return; const t = T.find((x) => x.id === (b.dataset.chat || b.dataset.add || b.dataset.susp || b.dataset.del)); if (!t) return;
          try {
            if (b.dataset.chat) chat(t.id, t.nombre);
            if (b.dataset.add) agregarUsuario(t.id, t.nombre, cargar);
            if (b.dataset.del) { if (!(await confirmar('¿ELIMINAR "' + t.nombre + '" con todo: equipo, clientes con cuenta, reservas y comprobantes?\nNo se puede deshacer.', 'Sí, eliminar todo'))) return; const r = await borrar('taller', t.id); toast('🗑️ Taller eliminado (' + r.borrados + ' cuentas)'); cargar(); }
            if (b.dataset.susp) { if (!t.suspendido && !(await confirmar('¿Suspender el taller? Ni el taller ni su equipo podrán entrar y su página se cierra.', 'Suspender'))) return;
              await rpc('admin_suspender', { p_tipo: 'taller', p_id: t.id, p_suspender: !t.suspendido, p_motivo: null }); toast(t.suspendido ? '✅ Reactivado' : '⛔ Suspendido'); cargar(); }
          } catch (x) { toast('⚠️ ' + x.message); }
        };
        z.querySelector('#taMas').onclick = () => { const fm = z.querySelector('#taForm'); fm.hidden = !fm.hidden; };
        z.querySelector('#taOk').onclick = async (ev) => {
          const v = (id) => z.querySelector(id).value.trim(), er = z.querySelector('#taErr'), d = { taller_nombre: v('#taT'), nombre: v('#taD'), email: v('#taE'), telefono: v('#taW'), password: v('#taP'), rol: 'taller' };
          er.textContent = ''; if (!d.taller_nombre || !d.nombre || !d.email) { er.textContent = 'Completa el nombre del taller, del dueño y el correo'; return; }
          ev.target.disabled = true;
          try { await crear(d); X.acceso('✅ Taller creado', mensajeAcceso({ nombre: d.nombre.split(' ')[0], email: d.email, password: d.password, lugar: 'BiciTaller (' + d.taller_nombre + ')' }) + '\n\nTienes ' + regalo + ' días de Premium de regalo 🎁', d.telefono);
            ['#taT', '#taD', '#taE', '#taW'].forEach((k) => { z.querySelector(k).value = ''; }); z.querySelector('#taP').value = clave(); cargar(); }
          catch (x) { er.textContent = x.message; }
          ev.target.disabled = false;
        };
        cargar();
      } },
      { k: 'clientes', ico: '👥', t: 'Usuarios', d: 'Clientes y equipo de los talleres', abrir: async (z) => {
        z.innerHTML = '<input id="clQ" type="search" placeholder="Buscar cliente…" aria-label="Buscar cliente"><select id="clT" aria-label="Filtrar por taller" style="margin-top:8px"></select><p class="sub" id="clCt"></p><div id="clL"><p class="sub">Cargando…</p></div>';
        let C = [];
        const pintar = () => {
          const q = z.querySelector('#clQ').value.trim().toLowerCase(), t = z.querySelector('#clT').value, l = C.filter((c) => (!q || (c.nombre + ' ' + c.email + ' ' + c.telefono).toLowerCase().includes(q)) && (!t || c.taller_id === t));
          z.querySelector('#clCt').textContent = l.length + ' usuarios · ' + l.filter((c) => c.premium).length + ' Premium';
          z.querySelector('#clL').innerHTML = l.length ? '<ul class="list">' + l.slice(0, 500).map((c) => '<li><div class="grow"><b>' + esc(c.nombre || c.email) + '</b> ' + (c.rol === 'equipo' ? '<span class="pill info">Equipo</span> ' : '') + (c.premium ? '<span class="pill pro">PREMIUM</span> ' : '') + (c.suspendido ? '<span class="pill bad">Suspendido</span> ' : '') + nota(c.nota) +
            '<div class="sub" style="overflow-wrap:anywhere">' + esc(c.email) + ' · ' + esc(c.telefono) + ' · ' + esc(c.taller || '') + ' · ' + c.visitas + ' visitas · visto ' + hace(c.visto_at) + (c.premium ? ' · Premium hasta ' + fecha(c.premium_hasta) : '') + '</div></div>' +
            '<select data-cp="' + esc(c.id) + '" style="width:auto" aria-label="Acción"><option value="">Acción…</option><option value="30">⭐ +30 días</option><option value="90">⭐ +90 días</option><option value="0">Quitar Premium</option><option value="' + (c.suspendido ? 'react' : 'susp') + '">' + (c.suspendido ? 'Reactivar' : 'Suspender') + '</option><option value="del">🗑️ Eliminar</option></select></li>').join('') + '</ul>' : vacio('Sin usuarios.');
        };
        const cargar = async () => { try { C = await rpc('admin_clientes'); } catch (x) { return fallo(z.querySelector('#clL'), x); }
          const ts = Array.from(new Map(C.map((c) => [c.taller_id, c.taller])).entries()), sel = z.querySelector('#clT'), v = sel.value;
          sel.innerHTML = '<option value="">Todos los talleres</option>' + ts.map(([id, n]) => '<option value="' + esc(id) + '"' + (id === v ? ' selected' : '') + '>' + esc(n) + '</option>').join(''); pintar(); };
        z.querySelector('#clQ').oninput = pintar; z.querySelector('#clT').onchange = pintar;
        z.querySelector('#clL').onchange = async (ev) => {
          const s = ev.target.closest('[data-cp]'); if (!s || !s.value) return; const v = s.value; s.value = '';
          try {
            if (v === 'del') { if (!(await confirmar('¿Eliminar este usuario? Sus reservas quedan, sin la cuenta. No se puede deshacer.', 'Sí, eliminar'))) return; await borrar('perfil', s.dataset.cp); }
            else if (v === 'susp' || v === 'react') await rpc('admin_suspender', { p_tipo: 'perfil', p_id: s.dataset.cp, p_suspender: v === 'susp', p_motivo: null });
            else { await rpc('admin_premium', { p_tipo: 'cliente', p_id: s.dataset.cp, p_dias: +v, p_motivo: null }); empujar(); }
            toast('Listo'); cargar();
          } catch (x) { toast('⚠️ ' + x.message); }
        };
        cargar();
      } },
      { k: 'registro_abierto', ico: '📣', t: 'Link y QR para talleres', d: 'Registro gratis de talleres y ciclistas', abrir: async (z) => {
        z.innerHTML = ''; await cargarPub();
        if (String(pub.config.registro_talleres) === '0') z.insertAdjacentHTML('beforeend', '<p class="sub warn">⛔ El registro abierto está apagado. Actívalo en ⚖️ Reglas.</p>');
        X.tarjetaLink(z, { titulo: '🚲 Invita talleres', texto: 'Cualquier taller crea su cuenta solo, gratis y con ' + (pub.config.dias_regalo_taller || 30) + ' días de Premium de regalo. Los ciclistas usan el mismo link para buscar su taller.', link: web + 'n/', archivo: 'bicitaller-registro', mensaje: '🚲 ¿Tienes un taller de bicicletas? Crea tu cuenta gratis en BiciTaller y recibe reservas online. ¿Eres ciclista? Encuentra tu taller aquí' });
        z.insertAdjacentHTML('beforeend', '<div class="btns"><a class="btn small ghost" target="_blank" rel="noopener" href="' + esc(web + 'd/') + '">🗺️ Directorio de talleres</a></div>');
      } },
      { k: 'limpieza', ico: '🧹', t: 'Limpieza', d: 'Comprobantes, avisos, fotos y reservas', abrir: async (z) => {
        await cargarPub();
        z.innerHTML = '<div class="card"><p class="sub">Se hace sola todos los días a las 4 AM. También puedes limpiar ahora:</p><div class="btns"><button type="button" class="small ghost" data-l="comprobantes">Comprobantes revisados</button><button type="button" class="small ghost" data-l="notificaciones">Avisos viejos</button>' +
          '<button type="button" class="small ghost" data-l="fotos">Fotos de más de ' + (pub.config.dias_fotos || 365) + ' días</button><button type="button" class="small ghost" data-l="reservas">Reservas expiradas/rechazadas (+60 días)</button><button type="button" class="small danger" data-l="todo">Limpiar todo</button></div></div>';
        z.onclick = async (ev) => { const b = ev.target.closest('[data-l]'); if (!b) return;
          if (!(await confirmar(b.dataset.l === 'comprobantes' ? 'Se borran TODOS los comprobantes ya revisados (los en revisión se mantienen). ¿Seguir?' : '¿Limpiar ahora?', 'Limpiar'))) return;
          try { const x = await rpc('limpiar', { p_que: b.dataset.l }); toast('🧹 Borrados: ' + x.comprobantes + ' comprobantes, ' + x.notificaciones + ' avisos, ' + x.reservas + ' reservas, ' + (x.fotos || 0) + ' fotos'); } catch (x) { toast('⚠️ ' + x.message); } };
      } },
      { k: 'reglas', ico: '⚖️', t: 'Reglas', d: 'Días, abonos, límites y WhatsApp de soporte', abrir: async (z) => {
        await cargarPub(); const c = pub.config;
        z.innerHTML = '<div class="card"><label>Registro abierto de talleres (link y QR)<select id="rgReg" data-c="registro_talleres"><option value="1"' + (String(c.registro_talleres) !== '0' ? ' selected' : '') + '>✅ Abierto: cualquier taller crea su cuenta gratis</option>' +
          '<option value="0"' + (String(c.registro_talleres) === '0' ? ' selected' : '') + '>⛔ Cerrado: solo yo creo talleres</option></select></label>' +
          CAMPOS.map(([k, t]) => '<label>' + esc(t) + '<input data-c="' + k + '" inputmode="numeric" value="' + esc(c[k] == null ? '' : c[k]) + '"></label>').join('') +
          '<label>Tu WhatsApp de soporte<input data-c="soporte_whatsapp" data-txt="1" value="' + esc(c.soporte_whatsapp || '') + '" placeholder="+56 9 …"></label><div class="btns"><button type="button" id="rgOk">💾 Guardar reglas</button></div></div>';
        z.querySelector('#rgOk').onclick = async (ev) => {
          const cambios = Array.from(z.querySelectorAll('[data-c]')).map((i) => [i.dataset.c, i.dataset.txt ? i.value.trim() : Number(String(i.value).replace(/\D/g, '')) || 0]).filter(([k, v]) => String(c[k] == null ? '' : c[k]) !== String(v));
          if (!cambios.length) return toast('Sin cambios');
          ev.target.disabled = true;
          try { for (const [k, v] of cambios) await rpc('admin_config_guardar', { p_clave: k, p_valor: v, p_motivo: null }); await cargarPub(); toast('⚖️ Reglas guardadas'); } catch (x) { toast('⚠️ ' + x.message); }
          ev.target.disabled = false;
        };
      } },
      { k: 'push', ico: '🔔', t: 'Notificaciones', d: 'Claves push y función "servidor"', abrir: async (z) => {
        await cargarPub(); const pk = pub.config.vapid_publica;
        z.innerHTML = '<div class="card"><p>' + (pk ? '✅ Las claves están creadas.' : '⚠️ Falta crear las claves.') + ' La función "servidor" las usa para enviar los avisos.</p>' +
          '<div class="btns"><button type="button" class="small ghost" id="puG">' + (pk ? 'Crear claves nuevas' : 'Crear claves') + '</button><button type="button" class="small ghost" id="puP">🩺 Probar función servidor</button><button type="button" class="small ghost" id="puF">📋 Copiar código de la función</button></div><p class="sub" id="puR"></p></div>';
        z.querySelector('#puG').onclick = async () => {
          if (pk && !(await confirmar('Al crear claves nuevas, todos deberán activar las notificaciones de nuevo. ¿Seguir?', 'Crear'))) return;
          try { const k = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']), raw = new Uint8Array(await crypto.subtle.exportKey('raw', k.publicKey)), jwk = await crypto.subtle.exportKey('jwk', k.privateKey);
            const b64u = (u) => btoa(String.fromCharCode.apply(null, u)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
            await rpc('admin_push_claves', { p_publica: b64u(raw), p_privada: jwk.d }); toast('🔔 Claves creadas'); L.find((x) => x.k === 'push').abrir(z); } catch (x) { toast('⚠️ ' + x.message); }
        };
        z.querySelector('#puP').onclick = async () => { const r = z.querySelector('#puR'); try { const x = await servidor({ accion: 'ping' }); r.textContent = x.servicio ? '✅ Conectado: funciona (versión ' + x.version + ').' : '⚠️ Responde, pero sin clave de servicio.'; } catch (x) { r.textContent = '❌ No responde: créala en Supabase (guía, paso 4).'; } };
        z.querySelector('#puF').onclick = async () => {
          try { const t = (await (await fetch('https://raw.githubusercontent.com/CodeFixService/Taller/main/supabase/functions/servidor/corto.ts?_=' + Date.now(), { cache: 'no-store' })).text()).trim();
            if (!/import|serve|Deno/.test(t)) throw new Error('no se pudo leer el código'); await navigator.clipboard.writeText(t); toast('📋 Copiado: pégalo en Supabase → Edge Functions → servidor → Code → Deploy'); }
          catch (x) { toast('No se pudo copiar: ' + x.message); }
        };
      } },
      { k: 'calificaciones', ico: '⭐', t: 'Calificaciones', d: 'Revisar y borrar', abrir: async (z) => {
        let l; try { l = await rpc('admin_calificaciones'); } catch (x) { return fallo(z, x); }
        z.innerHTML = '<p class="sub">Borra las injustas u ofensivas. Los comentarios solo los ves tú.</p><ul class="list">' + (l.map((q) => '<li><div class="grow"><b>' + '★'.repeat(q.estrellas) + '</b> ' +
          (q.autor === 'cliente' ? esc(q.cliente) + ' → ' + esc(q.taller) : esc(q.taller) + ' → ' + esc(q.cliente)) + (q.comentario ? '<div class="sub">“' + esc(q.comentario) + '”</div>' : '') + '<div class="sub">' + fechaHora(q.created_at) + '</div></div>' +
          '<button type="button" class="small danger" data-x="' + esc(q.id) + '">Borrar</button></li>').join('') || '<li class="empty">Sin calificaciones.</li>') + '</ul>';
        z.onclick = async (ev) => { const b = ev.target.closest('[data-x]'); if (!b || !(await confirmar('¿Borrar la calificación?', 'Borrar'))) return;
          try { await rpc('admin_calificacion_borrar', { p_id: b.dataset.x, p_motivo: null }); L.find((x) => x.k === 'calificaciones').abrir(z); } catch (x) { toast('⚠️ ' + x.message); } };
      } },
      { k: 'socios', ico: '🤝', t: 'Socios', d: 'Quién te ayuda y qué puede hacer', abrir: async (z) => {
        let l; try { l = await rpc('admin_socios'); } catch (x) { return fallo(z, x); }
        z.innerHTML = '<p class="sub">Un socio entra al panel de BiciTaller en la app y ve todo. <b>No puede crear</b> talleres ni usuarios. Cada cambio le pide un <b>motivo</b>: te llega como aviso y queda en 📜 Registro.</p><ul class="list">' +
          (l.map((x) => '<li><div class="grow"><b>' + esc(x.nombre || x.email) + '</b>' + (x.suspendido ? ' <span class="pill bad">Suspendido</span>' : '') + '<div class="sub" style="overflow-wrap:anywhere">' + esc(x.email) + ' · visto ' + hace(x.visto_at) + ' · ' + x.cambios + ' cambio' + (x.cambios === 1 ? '' : 's') + '</div></div>' +
            '<button type="button" class="small ghost" data-ss="' + esc(x.id) + '" data-s="' + (x.suspendido ? 0 : 1) + '">' + (x.suspendido ? 'Reactivar' : 'Suspender') + '</button><button type="button" class="small danger" data-sd="' + esc(x.id) + '" data-n="' + esc(x.nombre || x.email) + '">🗑️</button></li>').join('') || '<li class="empty">Aún no tienes socios.</li>') + '</ul>' +
          '<div class="card"><h2>➕ Crear socio</h2><label>Nombre<input id="soN" maxlength="80"></label><label>WhatsApp<input id="soT" inputmode="tel"></label><label>Correo<input id="soE" type="email" autocomplete="off"></label><label>Contraseña inicial<input id="soP" value="' + clave() + '"></label>' +
          '<div class="btns"><button type="button" id="soOk">Crear socio</button></div><p class="err" id="soErr"></p></div>';
        z.onclick = async (ev) => {
          const b = ev.target.closest('button'); if (!b) return;
          try {
            if (b.id === 'soOk') { const v = (id) => z.querySelector(id).value.trim(), d = { rol: 'socio', nombre: v('#soN'), telefono: v('#soT'), email: v('#soE'), password: v('#soP') };
              if (!d.nombre || !d.email) { z.querySelector('#soErr').textContent = 'Escribe el nombre y el correo'; return; }
              b.disabled = true; await crear(d); X.acceso('✅ Socio creado', mensajeAcceso({ nombre: d.nombre.split(' ')[0], email: d.email, password: d.password, lugar: 'BiciTaller como socio administrador' }), d.telefono); L.find((x) => x.k === 'socios').abrir(z); }
            if (b.dataset.ss) { await rpc('admin_suspender', { p_tipo: 'perfil', p_id: b.dataset.ss, p_suspender: b.dataset.s === '1', p_motivo: null }); L.find((x) => x.k === 'socios').abrir(z); }
            if (b.dataset.sd) { if (!(await confirmar('¿Eliminar al socio "' + b.dataset.n + '"? Ya no podrá entrar. El registro de sus cambios se mantiene.', 'Sí, eliminar'))) return; await borrar('perfil', b.dataset.sd); toast('🗑️ Socio eliminado'); L.find((x) => x.k === 'socios').abrir(z); }
          } catch (x) { if (b.id === 'soOk') { z.querySelector('#soErr').textContent = x.message; b.disabled = false; } else toast('⚠️ ' + x.message); }
        };
      } },
      { k: 'auditoria', ico: '📜', t: 'Registro de cambios', d: 'Lo que se hizo en el panel', abrir: async (z) => {
        let l; try { l = await rpc('admin_auditoria'); } catch (x) { return fallo(z, x); }
        z.innerHTML = '<ul class="list">' + (l.map((a) => '<li><div class="grow"><b>' + esc(a.accion) + '</b> ' + (a.quien_rol === 'socio' ? '<span class="pill info">👥 ' + esc(a.quien_nombre) + '</span> ' : '') + '<span class="sub">' + esc(a.detalle) + '</span></div><span class="sub">' + fechaHora(a.created_at) + '</span></li>').join('') || '<li class="empty">Sin registros.</li>') + '</ul>';
        if (global.CFX_AJUSTES && global.CFX_AJUSTES.registro) global.CFX_AJUSTES.registro(z, (fn, a) => rpc(fn, a), { recargar: () => L.find((x) => x.k === 'auditoria').abrir(z) });
      } }
    ];
    return L;
  });
})(window);
