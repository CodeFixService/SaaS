/* Centro de Mando · G34 🧭 Panel de Estaciona (antes Estacionamiento #/admin). Mismas funciones, ahora en CM → Apps → Estaciona → 🧭 Panel. */
(function (global) {
  'use strict';
  const ESTADO = { disponible: ['ok', 'Disponible'], ocupado: ['warn', 'Ocupado'], pausado: ['', 'Pausado'], oculto: ['bad', 'Oculto por el admin'] };
  const REGLAS = { minutos_pago: 'Minutos para pagar y subir el comprobante (reserva retenida)', minutos_devolucion: 'Minutos para cancelar con devolución',
    horas_cancelacion: 'Horas de anticipación para saldo a favor', dias_saldo: 'Días que dura el saldo a favor', dias_regalo: 'Días de Premium de regalo al crear una cuenta',
    dias_aviso_vencimiento: 'Días de aviso antes de que venza el Premium', dias_comprobantes: 'Días antes de borrar los comprobantes', dias_mensajes: 'Días antes de borrar los mensajes',
    mensajes_seguidos: 'Mensajes seguidos sin respuesta', mensajes_dia: 'Mensajes por día por persona', dias_devolucion: 'Días que tiene el dueño para devolver un pago (luego te avisa)', dias_anual: 'Días de Premium que entrega el pago anual' };
  const rut = (r) => { const c = String(r || '').replace(/[^0-9kK]/g, '').toUpperCase().slice(0, 9); return c.length < 2 ? c : c.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + c.slice(-1); };

  global.PanelApps.registrar('estaciona', (X) => {
    const { esc, toast, confirmar, rpc, fecha, fechaHora, hace, plata, item, vacio, fallo, pedir } = X;
    const web = X.a.web;
    const funcion = (accion, extra) => X.fn('enviar', Object.assign({ accion }, extra || {}));
    const empujar = () => { try { X.c.functions.invoke('enviar', { body: { accion: 'push' } }).catch(() => {}); } catch (e) { /* nada */ } };
    const foto = (r) => r ? X.c.storage.from('fotos').getPublicUrl(r).data.publicUrl : '';
    const privada = async (r) => { if (!r) return ''; const { data } = await X.c.storage.from('privado').createSignedUrl(r, 600); return data ? data.signedUrl : ''; };
    const verPrivadas = (z) => z.querySelectorAll('[data-priv]').forEach(async (img) => { img.src = await privada(img.dataset.priv); img.onclick = () => global.open(img.src, '_blank', 'noopener'); });
    const precio = (e) => [e.ph && plata(e.ph) + '/h', e.pd && plata(e.pd) + '/día', e.pm && plata(e.pm) + '/mes'].filter(Boolean).join(' · ');
    const abrirL = (s) => ' <a target="_blank" rel="noopener" href="' + esc(web + s) + '">ver</a>';
    const img = 'style="width:100%;max-width:160px;border-radius:8px;background:var(--line);min-height:60px;cursor:pointer"';

    const L = [
      { k: 'resumen', ico: '📊', t: 'Resumen', d: 'Usuarios, arriendos, comunas y devoluciones', abrir: async (z) => {
        z.innerHTML = '<p class="sub">Cargando…</p>'; let r; try { r = await rpc('admin_resumen'); } catch (x) { return fallo(z, x); }
        const mx = Math.max(1, ...(r.registros || []).map((x) => x.n));
        z.innerHTML = (r.pend_verif || r.pend_denuncias ? '<p class="sub warn">' + (r.pend_verif ? '🪪 ' + r.pend_verif + ' verificación(es) por revisar. ' : '') + (r.pend_denuncias ? '🚩 ' + r.pend_denuncias + ' denuncia(s) abiertas.' : '') + '</p>' : '') +
          '<div class="stats">' + [['👥 Usuarios', r.usuarios], ['🆕 Nuevos (7 días)', r.nuevos7], ['🟢 Activos (7 días)', r.activos7], ['🪪 Verificados', r.verificados], ['🅿️ Estacionamientos', r.estacionamientos], ['✅ Disponibles', r.disponibles],
            ['🔑 Arriendos activos', r.arriendos_activos], ['📦 Arriendos totales', r.arriendos_total], ['🧾 Reservas en revisión', r.reservas_revision], ['⛔ Suspendidos', r.suspendidos], ['🗄️ Base de datos', esc(r.version_bd || '1')]].map((k) => item(k[0], k[1])).join('') + '</div>' +
          ((r.devoluciones || []).length ? '<div class="card"><h2>💸 Devoluciones atrasadas</h2><ul class="list">' + r.devoluciones.map((d) => '<li><div class="grow"><b>' + esc(d.dueno.nombre) + '</b> debe ' + plata(d.monto) + ' a ' + esc(d.arrendatario.nombre) +
            '<div class="sub">"' + esc(d.titulo) + '" · desde ' + fecha(d.desde) + '</div></div><button type="button" class="small ghost" data-dev="' + esc(d.dueno.id) + '" data-n="' + esc(d.dueno.nombre) + '" data-m="' + esc(d.monto) + '">💬 Escribir</button></li>').join('') + '</ul></div>' : '') +
          '<div class="card"><h2>📈 Registros últimos 14 días</h2><div style="display:flex;align-items:flex-end;gap:3px;height:70px">' + (r.registros || []).map((x) => '<div title="' + esc(x.d) + ': ' + x.n + '" style="flex:1;background:var(--brand);opacity:.75;border-radius:3px 3px 0 0;height:' + Math.round(x.n / mx * 100) + '%"></div>').join('') + '</div></div>' +
          '<div class="card"><h2>🏙️ Comunas con más estacionamientos</h2><ul class="list">' + ((r.comunas || []).map((c) => '<li><span class="grow">' + esc(c.c) + '</span><b>' + c.n + '</b></li>').join('') || '<li class="empty">Aún no hay</li>') + '</ul></div>';
        z.onclick = (ev) => { const b = ev.target.closest('[data-dev]'); if (b) X.soporte(b.dataset.dev, b.dataset.n, 'Hola ' + b.dataset.n + ' 👋 Tienes pendiente devolver ' + plata(b.dataset.m) + ' a un arrendatario. ¿Me confirmas cuándo lo haces?'); };
      } },
      { k: 'verificaciones', ico: '🪪', t: 'Verificaciones', d: 'Identidades por revisar', abrir: async (z) => {
        z.innerHTML = '<p class="sub">Cargando…</p>'; let r; try { r = await rpc('admin_verificaciones'); } catch (x) { return fallo(z, x); }
        if (!r.length) { z.innerHTML = vacio('No hay verificaciones pendientes 🎉'); return; }
        z.innerHTML = '<p class="sub">Revisa que el RUT y la foto coincidan con la selfie. Confirma en el Registro Civil que el documento esté <b>vigente</b>. Al aprobar o rechazar, las fotos se borran.</p>' +
          r.map((v) => '<div class="card" data-u="' + esc(v.usuario) + '"><b>' + esc(v.nombre) + '</b><div class="sub" style="overflow-wrap:break-word">' + App.correo(v.email) + ' · ' + hace(v.enviada) + '</div>' +
            '<p class="sub">RUT <b>' + esc(rut(v.rut)) + '</b> <button type="button" class="small ghost" data-copiar="' + esc(rut(v.rut)) + '">📋</button> · N° documento <b>' + esc(v.serie) + '</b> <button type="button" class="small ghost" data-copiar="' + esc(v.serie) + '">📋</button></p>' +
            '<a class="btn small ghost" target="_blank" rel="noopener" href="https://portal.sidiv.registrocivil.cl/usuarios-portal/pages/DocumentRequestStatus.xhtml">🔎 Consultar vigencia en el Registro Civil</a>' +
            '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">' + [['frente', 'Frente'], ['reverso', 'Reverso'], ['selfie', 'Selfie']].map((f) => '<div><div class="sub">' + f[1] + '</div><img ' + img + ' data-priv="' + esc(v[f[0]] || '') + '" alt="' + f[1] + '"></div>').join('') + '</div>' +
            '<div class="btns"><button type="button" class="small" data-ap="1">✅ Aprobar</button><button type="button" class="small danger" data-ap="0">Rechazar</button></div></div>').join('');
        verPrivadas(z);
        z.onclick = async (ev) => {
          const cp = ev.target.closest('[data-copiar]'); if (cp) { try { await navigator.clipboard.writeText(cp.dataset.copiar); toast('📋 Copiado'); } catch (e) { toast(cp.dataset.copiar); } return; }
          const b = ev.target.closest('[data-ap]'); if (!b) return; const ok = b.dataset.ap === '1';
          let motivo = null; if (!ok) { motivo = await pedir('Motivo del rechazo', { ph: 'Ej: La foto de la cédula está borrosa / el RUT no coincide', si: 'Rechazar' }); if (motivo == null) return; }
          try { await rpc('admin_resolver_verificacion', { p_id: b.closest('[data-u]').dataset.u, p_aprobar: ok, p_motivo: motivo }); empujar(); toast(ok ? 'Aprobada ✅' : 'Rechazada'); L.find((x) => x.k === 'verificaciones').abrir(z); } catch (x) { toast('⚠️ ' + x.message); }
        };
      } },
      { k: 'denuncias', ico: '🚩', t: 'Denuncias', d: 'Reportes de usuarios', abrir: async (z) => {
        let estado = 'abierta';
        const pintar = async () => {
          z.innerHTML = '<div class="seg" id="deF"><button type="button" data-f="abierta">Abiertas</button><button type="button" data-f="resuelta">Resueltas</button><button type="button" data-f="descartada">Descartadas</button></div><div id="deL"><p class="sub">Cargando…</p></div>';
          z.querySelectorAll('#deF [data-f]').forEach((b) => b.classList.toggle('on', b.dataset.f === estado)); X.seg(z, '#deF', (v) => { estado = v; pintar(); });
          let r; try { r = await rpc('admin_denuncias', { p_estado: estado }); } catch (x) { return fallo(z.querySelector('#deL'), x); }
          z.querySelector('#deL').innerHTML = r.map((d) => '<div class="card" data-id="' + esc(d.id) + '"><span class="pill bad">' + esc(d.motivo) + '</span> <span class="sub">' + hace(d.creado) + '</span><p style="white-space:pre-line">' + esc(d.detalle) + '</p>' +
            '<p class="sub">Denuncia: <b>' + esc(d.autor.nombre) + '</b>' + abrirL('#/u/' + d.autor.id) + ' · Denunciado (' + d.previas + ' denuncia' + (d.previas === 1 ? '' : 's') + '): ' + (d.denunciado ? '<b>' + esc(d.denunciado.nombre) + '</b>' + abrirL('#/u/' + d.denunciado.id) : '—') + '</p>' +
            '<p class="sub">Sobre: ' + esc(d.tipo) + (d.tipo === 'estacionamiento' ? abrirL('#/e/' + d.objetivo) : '') + (d.tipo === 'conversacion' ? ' · <button type="button" class="small ghost" data-conv="' + esc(d.objetivo) + '">💬 Leer conversación</button>' : '') + '</p>' +
            (d.evidencia ? '<div class="sub">Evidencia:</div><img ' + img + ' data-priv="' + esc(d.evidencia) + '" alt="Evidencia">' : '') + (d.resolucion ? '<p class="sub"><b>Resolución:</b> ' + esc(d.resolucion) + '</p>' : '') +
            (estado === 'abierta' ? '<div class="btns"><button type="button" class="small danger" data-ac="suspender">Suspender al denunciado</button>' + (d.tipo === 'estacionamiento' ? '<button type="button" class="small ghost" data-ac="ocultar">Ocultar estacionamiento</button>' : '') +
              '<button type="button" class="small" data-ac="resolver">Marcar resuelta</button><button type="button" class="small ghost" data-ac="descartar">Descartar</button></div>' : '') + '</div>').join('') || vacio('No hay denuncias ' + (estado === 'abierta' ? 'abiertas 🎉' : 'aquí'));
          verPrivadas(z);
        };
        z.onclick = async (ev) => {
          const cv = ev.target.closest('[data-conv]');
          if (cv) { try { const x = await rpc('admin_conversacion', { p_conv: cv.dataset.conv });
            X.modal('<div class="titulo-v"><h2 class="grow">Conversación denunciada</h2><button type="button" class="small ghost" data-cerrar>✕</button></div><p class="sub">' + esc(x.a.nombre) + ' ↔ ' + esc(x.b.nombre) + '</p><ul class="list" style="max-height:60vh;overflow:auto">' +
              (x.mensajes.map((m) => '<li><div class="grow"><b>' + esc(m.autor === x.a.id ? x.a.nombre : x.b.nombre) + '</b><div>' + esc(m.texto) + '</div><div class="sub">' + fechaHora(m.fecha) + '</div></div></li>').join('') || '<li class="empty">Sin mensajes (se borran a los 30 días)</li>') + '</ul>'); } catch (er) { toast('⚠️ ' + er.message); } return; }
          const b = ev.target.closest('[data-ac]'); if (!b) return; const id = b.closest('[data-id]').dataset.id, ac = b.dataset.ac;
          if (ac === 'suspender' && !(await confirmar('¿Suspender la cuenta denunciada?', 'Suspender'))) return;
          const nota = ac === 'descartar' ? null : await pedir('Nota de resolución (opcional)', { ph: 'Ej: Se suspendió por intento de estafa', si: 'Guardar' });
          if (nota === null && ac !== 'descartar') return;
          try { await rpc('admin_resolver_denuncia', { p_id: id, p_accion: ac, p_nota: nota }); empujar(); toast('Listo'); estado = 'abierta'; pintar(); } catch (er) { toast('⚠️ ' + er.message); }
        };
        pintar();
      } },
      { k: 'usuarios', ico: '👥', t: 'Usuarios', d: 'Premium, chat, suspender y eliminar', abrir: async (z) => {
        z.innerHTML = '<input id="usQ" type="search" placeholder="Nombre o RUT" aria-label="Buscar usuario"><div class="seg" id="usF" style="margin-top:8px"><button type="button" class="on" data-f="">Todos</button><button type="button" data-f="premium">⭐ Premium</button><button type="button" data-f="gratis">Gratis</button>' +
          '<button type="button" data-f="por_vencer">⏳ Por vencer</button><button type="button" data-f="inactivos">💤 Inactivos 30 días</button><button type="button" data-f="verificados">🪪 Verificados</button><button type="button" data-f="sin_verificar">Sin verificar</button><button type="button" data-f="suspendidos">⛔ Suspendidos</button></div>' +
          '<div id="usL"><p class="sub">Cargando…</p></div><div class="btns"><button type="button" class="small ghost" id="usMas" hidden>Ver más</button></div>';
        let off = 0, f = '', t, U = [];
        const card = (u) => '<div class="card" data-id="' + esc(u.id) + '"><b>' + esc(u.nombre) + '</b>' + (u.verificado ? ' 🪪' : '') + (u.suspendido ? ' <span class="pill bad">Suspendido</span>' : '') +
          '<div class="sub" style="overflow-wrap:break-word">' + App.correo(u.email) + (u.rut && u.rut[0] !== 'X' ? ' · RUT ' + esc(rut(u.rut)) : '') + '</div>' +
          '<div class="sub">' + (u.admin ? 'Administrador' : u.premium ? '⭐ ' + (u.plan_origen === 'prueba' ? 'Prueba' : 'Premium') + (u.premium_hasta && !/infinity/i.test(String(u.premium_hasta)) ? ' hasta ' + fecha(u.premium_hasta) : ' de por vida') : 'Gratis') +
          ' · ' + u.publicados + ' publicados' + (u.denuncias ? ' · <b>' + u.denuncias + ' denuncias</b>' : '') + ' · registro ' + fecha(u.creado) + '</div>' +
          (u.admin ? '' : '<div class="btns"><select data-prem aria-label="Premium"><option value="">⭐ Premium…</option><option value="7">+7 días</option><option value="30">+30 días</option><option value="90">+90 días</option><option value="365">+365 días</option><option value="0">De por vida</option><option value="-1">Quitar Premium</option></select>' +
            '<button type="button" class="small ghost" data-a="chat">💬</button><a class="btn small ghost" target="_blank" rel="noopener" href="' + esc(web + '#/u/' + u.id) + '">👁️</a>' +
            '<button type="button" class="small ' + (u.suspendido ? '' : 'ghost') + '" data-a="susp" data-s="' + (u.suspendido ? 0 : 1) + '">' + (u.suspendido ? '✅ Reactivar' : '⛔ Suspender') + '</button><button type="button" class="small danger" data-a="borrar">🗑️</button></div>') + '</div>';
        const cargar = async (mas) => {
          off = mas ? off + 50 : 0;
          try { const r = await rpc('admin_usuarios', { p_q: z.querySelector('#usQ').value, p_filtro: f, p_off: off }); U = mas ? U.concat(r) : r;
            const h = r.map(card).join(''); if (mas) z.querySelector('#usL').insertAdjacentHTML('beforeend', h); else z.querySelector('#usL').innerHTML = h || vacio('Sin resultados'); z.querySelector('#usMas').hidden = r.length < 50; }
          catch (x) { fallo(z.querySelector('#usL'), x); }
        };
        z.querySelector('#usQ').oninput = () => { clearTimeout(t); t = setTimeout(() => cargar(false), 350); };
        X.seg(z, '#usF', (v) => { f = v; cargar(false); });
        z.querySelector('#usMas').onclick = () => cargar(true);
        z.querySelector('#usL').onchange = async (ev) => { const s = ev.target.closest('[data-prem]'); if (!s || s.value === '') return; const v = +s.value; s.value = '';
          try { await rpc('admin_premium', { p_id: s.closest('[data-id]').dataset.id, p_dias: v }); empujar(); toast('Plan actualizado'); cargar(false); } catch (x) { toast('⚠️ ' + x.message); } };
        z.querySelector('#usL').onclick = async (ev) => {
          const b = ev.target.closest('[data-a]'); if (!b) return; const id = b.closest('[data-id]').dataset.id, u = U.find((x) => x.id === id) || { nombre: '' };
          try {
            if (b.dataset.a === 'chat') { X.soporte(id, u.nombre); return; }
            if (b.dataset.a === 'susp') { const si = b.dataset.s === '1'; if (si && !(await confirmar('¿Suspender a ' + u.nombre + '? No podrá publicar, arrendar ni chatear.', 'Suspender'))) return; await rpc('admin_suspender', { p_id: id, p_si: si }); toast(si ? 'Suspendido' : 'Reactivado'); }
            if (b.dataset.a === 'borrar') { if (!(await confirmar('¿Eliminar la cuenta de ' + u.nombre + '? Se borran su perfil, estacionamientos, fotos y mensajes. No se puede deshacer.', 'Eliminar'))) return; await funcion('eliminar_usuario', { id }); toast('Cuenta eliminada'); }
            cargar(false);
          } catch (x) { toast('⚠️ ' + x.message); }
        };
        cargar(false);
      } },
      { k: 'estacionamientos', ico: '🅿️', t: 'Estacionamientos', d: 'Ocultar del mapa o eliminar', abrir: async (z) => {
        z.innerHTML = '<div class="btns" style="margin-top:0"><a class="btn small ghost" target="_blank" rel="noopener" href="' + esc(web + '#/') + '">🗺️ Ver mapa</a><a class="btn small ghost" target="_blank" rel="noopener" href="' + esc(web + '#/publicar') + '">＋ Agregar</a></div>' +
          '<input id="esQ" type="search" placeholder="Buscar lugar, comuna o dueño" aria-label="Buscar estacionamiento"><div id="esL"><p class="sub">Cargando…</p></div><div class="btns"><button type="button" class="small ghost" id="esMas" hidden>Ver más</button></div>';
        let off = 0, t;
        const card = (e) => '<div class="card" data-id="' + esc(e.id) + '"><div style="display:flex;gap:10px">' + (e.foto ? '<img src="' + esc(foto(e.foto)) + '" alt="" loading="lazy" style="width:64px;height:64px;object-fit:cover;border-radius:8px;flex:none">' : '') +
          '<div class="grow"><b>' + esc(e.titulo) + '</b><div class="sub">' + esc(e.direccion) + (e.comuna ? ', ' + esc(e.comuna) : '') + '</div><div class="sub">' + esc(precio(e)) + ' · ' + e.vistas + ' visitas</div>' +
          '<div class="sub">Dueño: ' + esc(e.dueno) + ' · ' + fecha(e.creado) + ' · <span class="pill ' + ((ESTADO[e.estado] || [])[0] || '') + '">' + esc((ESTADO[e.estado] || [, e.estado])[1]) + '</span></div></div></div>' +
          '<div class="btns"><a class="btn small ghost" target="_blank" rel="noopener" href="' + esc(web + '#/e/' + e.id) + '">👁️ Ver</a><button type="button" class="small ghost" data-a="' + (e.estado === 'oculto' ? 'mostrar' : 'ocultar') + '">' + (e.estado === 'oculto' ? 'Volver a mostrar' : 'Ocultar del mapa') + '</button>' +
          '<button type="button" class="small danger" data-a="borrar">🗑️ Eliminar</button></div></div>';
        const cargar = async (mas) => {
          off = mas ? off + 50 : 0;
          try { const r = await rpc('admin_estacionamientos', { p_q: z.querySelector('#esQ').value, p_off: off }), h = r.map(card).join('');
            if (mas) z.querySelector('#esL').insertAdjacentHTML('beforeend', h); else z.querySelector('#esL').innerHTML = h || vacio('Sin resultados'); z.querySelector('#esMas').hidden = r.length < 50; }
          catch (x) { fallo(z.querySelector('#esL'), x); }
        };
        z.querySelector('#esQ').oninput = () => { clearTimeout(t); t = setTimeout(() => cargar(false), 350); };
        z.querySelector('#esMas').onclick = () => cargar(true);
        z.querySelector('#esL').onclick = async (ev) => {
          const b = ev.target.closest('[data-a]'); if (!b) return; const id = b.closest('[data-id]').dataset.id;
          try {
            if (b.dataset.a === 'borrar') { if (!(await confirmar('¿Eliminar este estacionamiento y sus fotos?', 'Eliminar'))) return; await rpc('borrar_estacionamiento', { p_id: id }); empujar(); }
            else await rpc('admin_ocultar', { p_id: id, p_ocultar: b.dataset.a === 'ocultar' });
            toast('Listo'); cargar(false);
          } catch (x) { toast('⚠️ ' + x.message); }
        };
        cargar(false);
      } },
      { k: 'reglas', ico: '⏱️', t: 'Reglas', d: 'Pagos, devoluciones y mensajes', abrir: async (z) => {
        let a; try { a = await rpc('admin_config'); } catch (x) { return fallo(z, x); }
        z.innerHTML = '<div class="card">' + Object.keys(REGLAS).map((k) => '<label>' + esc(REGLAS[k]) + '<input type="number" min="0" data-rg="' + k + '" value="' + esc((a.reglas || {})[k] ?? '') + '"></label>').join('') + '<div class="btns"><button type="button" id="rgOk">💾 Guardar reglas</button></div></div>';
        z.querySelector('#rgOk').onclick = async (ev) => { const p = {}; z.querySelectorAll('[data-rg]').forEach((i) => { if (i.value !== '') p[i.dataset.rg] = +i.value; });
          ev.target.disabled = true; try { await rpc('admin_guardar_config', { p }); toast('✅ Reglas guardadas'); } catch (x) { toast('⚠️ ' + x.message); } ev.target.disabled = false; };
      } },
      { k: 'push', ico: '🔔', t: 'Notificaciones', d: 'Claves push y función "enviar"', abrir: async (z) => {
        let a; try { a = await rpc('admin_config'); } catch (x) { return fallo(z, x); }
        z.innerHTML = '<div class="card"><p>' + (a.vapid_public && a.push ? '✅ Claves configuradas.' : 'Genera las claves una sola vez para enviar notificaciones al celular.') + '</p>' +
          '<div class="btns"><button type="button" class="small ghost" id="puV">' + (a.vapid_public ? 'Regenerar claves' : 'Generar claves push') + '</button><button type="button" class="small ghost" id="puP">🩺 Probar función "enviar"</button><button type="button" class="small ghost" id="puY">Prueba: aviso solo a mí</button></div><p class="sub" id="puR"></p></div>';
        z.querySelector('#puV').onclick = async () => {
          if (a.vapid_public && !(await confirmar('Si regeneras las claves, cada persona deberá activar de nuevo las notificaciones. ¿Seguir?', 'Regenerar'))) return;
          try { const k = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']), raw = new Uint8Array(await crypto.subtle.exportKey('raw', k.publicKey));
            const pub = btoa(String.fromCharCode(...raw)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''), priv = (await crypto.subtle.exportKey('jwk', k.privateKey)).d;
            await rpc('admin_guardar_ajustes', { p: { vapid_public: pub, vapid_private: priv } }); toast('🔔 Claves creadas'); L.find((x) => x.k === 'push').abrir(z); } catch (x) { toast('⚠️ ' + x.message); }
        };
        z.querySelector('#puP').onclick = async () => { const r = z.querySelector('#puR'); try { const x = await funcion('ping'); r.textContent = '✅ Conectado: función "enviar" v' + x.version + (x.servicio ? ' lista' : ' sin clave de servidor'); } catch (x) { r.textContent = '❌ ' + x.message; } };
        z.querySelector('#puY').onclick = async () => { try { await rpc('admin_prueba_push'); const r = await funcion('push'); toast('Push enviados: ' + (r.enviados || 0) + (r.error ? ' · ' + r.error : '')); } catch (x) { toast('⚠️ ' + x.message); } };
      } },
      { k: 'mant', ico: '🧹', t: 'Mantención', d: 'Limpieza y base de datos', abrir: async (z) => {
        let v = '?'; try { v = String(((await rpc('ajustes_publicos')) || {}).version_bd || '?'); } catch (e) { /* nada */ }
        z.innerHTML = '<div class="card"><p class="sub">Los mensajes se borran solos a los 30 días y las fotos se guardan comprimidas. Borra ahora mensajes y comprobantes viejos y fotos que ya no se usan, según las reglas.</p><div class="btns"><button type="button" id="mtL">🧹 Limpiar ahora</button></div></div>' +
          '<div class="card"><h2>🗄️ Base de datos</h2><p class="sub">Instalada: <b>' + esc(v) + '</b>. Se actualiza sola cuando hay una versión nueva (máximo 10 minutos, no borra datos).</p></div>';
        z.querySelector('#mtL').onclick = async (ev) => { ev.target.disabled = true; try { const x = await funcion('limpiar'); toast('Listo: ' + (x.borrados || 0) + ' archivos borrados'); } catch (x) { toast('⚠️ ' + x.message); } ev.target.disabled = false; };
      } },
      { k: 'auditoria', ico: '📜', t: 'Registro de cambios', d: 'Lo que se hizo en el panel', abrir: (z) => {
        z.innerHTML = '';
        if (global.CFX_AJUSTES && global.CFX_AJUSTES.registro) return global.CFX_AJUSTES.registro(z, (fn, a) => rpc(fn, a), { lista: true });
        z.innerHTML = vacio('Sin registros.');
      } }
    ];
    return L;
  });
})(window);
