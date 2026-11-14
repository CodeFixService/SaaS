/* Centro de Mando · G34 🧭 Panel de Despega Pyme (antes Aplicaciones/apps/admin). Mismas funciones, ahora en CM → Apps → 🧭 Panel. */
(function (global) {
  'use strict';
  const SEM = { verde: '🟢', amarillo: '🟡', rojo: '🔴' };
  const TONOS = {
    motivador: { n: '💪 Motivador', titulos: ['💪 ¡Tu tienda te espera, {n}!', '🚀 ¡Vamos con todo, {n}!', '🔥 Hoy es un buen día para vender'], inicios: ['¡Hola {n}! 💪', '¡{n}, vamos que se puede! 🚀', '¡Hola {n}! 🔥'],
      cierres: ['Cada publicación es una venta posible. ¡Tú puedes!', 'Los negocios que publican seguido venden más. ¡A darle!', 'Tus clientes están a un toque de comprarte. ¡Vamos!'] },
    amable: { n: '😊 Amable', titulos: ['😊 Te extrañamos, {n}', '🌷 Un saludo de CodeFix', '😊 ¿Cómo va todo, {n}?'], inicios: ['Hola {n}, ¿cómo estás? 😊', 'Hola {n} 🌷', '¡Hola {n}! Esperamos que estés muy bien 😊'],
      cierres: ['Si necesitas ayuda con algo, respóndenos aquí mismo. ¡Estamos para ayudarte!', 'Cualquier duda, escríbenos por este chat. 💙', 'Cuando quieras te ayudamos a armar tu próxima oferta.'] },
    directo: { n: '🎯 Directo', titulos: ['🎯 {n}: tu tienda necesita movimiento', '🎯 Una idea rápida para vender más', '🎯 5 minutos para tu tienda'], inicios: ['Hola {n}.', '{n}, un dato rápido:', 'Hola {n}, vamos al grano:'],
      cierres: ['Te toma 5 minutos: entra, sube una oferta y listo.', 'Hoy: 1 diseño nuevo en Despega Pyme. Mañana: más pedidos.', 'Entra hoy y publica algo, aunque sea chico.'] },
    divertido: { n: '😄 Divertido', titulos: ['😄 ¡Tu tienda bostezó, {n}!', '🦥 ¿{n} en modo siesta?', '🎉 ¡Hora de despertar la tienda!'], inicios: ['¡Hola {n}! 😄', '¡Toc toc, {n}! 🚪', '¡{n}! Tus productos preguntan por ti 🛍️'],
      cierres: ['Tus clientes ya están mirando el celular… ¡dales algo que ver! 📱', 'Una oferta nueva y la tienda vuelve a la vida. 🎉', 'Sube algo hoy y que se arme el carrito. 🛒'] }
  };
  const REGLAS = [['retencion_min', 'Minutos que el pedido queda apartado esperando el pago'], ['cancel_min', 'Minutos para cancelar con devolución (desde que paga)'],
    ['comprobantes_dias', 'Días que se guardan los comprobantes'], ['aviso1_dias', 'Primer aviso de vencimiento (días antes)'], ['aviso2_dias', 'Segundo aviso de vencimiento (días antes)'],
    ['dias_regalo', 'Días de Pro gratis para cada negocio nuevo (0 = sin prueba)'], ['max_rechazos', 'Comprobantes que se pueden rechazar por pedido antes de cerrarlo'],
    ['registro_negocios', 'Registro abierto de negocios (1 = cualquiera crea su cuenta Gratis con el link/QR; 0 = solo tú los creas)']];
  const clave = () => { const L = 'abcdefghjkmnpqrstuvwxyz', r = crypto.getRandomValues(new Uint32Array(9)), l = (i) => L[r[i] % L.length], n = (i) => String(r[i] % 10); return l(0).toUpperCase() + l(1) + l(2) + n(3) + n(4) + n(5) + n(6) + l(7) + l(8); };

  global.PanelApps.registrar('aplicaciones', (X) => {
    const { esc, toast, confirmar, rpc, fecha, fechaHora, dias, hace, plata, item, vacio, fallo } = X;
    const semaforo = (e) => { const d = dias(e.visto_at); return d == null || d > 7 ? 'rojo' : d >= 2 ? 'amarillo' : 'verde'; };
    // Los correos y avisos de la app usan este link (antes lo guardaba su panel al abrirse).
    rpc('admin_set_setting', { p_key: 'app_url', p_value: X.a.web }).catch(() => {});
    let actividad = [];
    const cargarAct = async () => { actividad = await rpc('admin_actividad'); actividad.forEach((e) => { e.sem = semaforo(e); }); return actividad; };

    function situacion(e) {
      const ult = [e.ultima_ficha, e.ultimo_producto].filter(Boolean).sort().pop(), dE = dias(e.visto_at), dP = dias(ult);
      if (!e.productos && !e.fichas) return 'Aún no subes productos ni ofertas: sube los primeros y tus clientes ya podrán pedirte.';
      if (dE == null) return 'Todavía no entras a tu app: entra, revisa tu tienda y sube tu primera oferta.';
      if (dP != null && dP >= 7) return 'Hace ' + dP + ' días que no publicas nada nuevo en tu tienda.';
      if (dE >= 3) return 'Hace ' + dE + ' días que no entras a tu app.';
      return '¡Vas muy bien! Sigue publicando para que tus clientes vuelvan seguido.';
    }
    function texto(e, tono, n) {
      const t = TONOS[tono] || TONOS.motivador, k = (x) => x[n % x.length], pon = (x) => x.replace(/\{n\}/g, (e.empresa || 'emprendedor').trim());
      return { titulo: pon(k(t.titulos)).slice(0, 80), cuerpo: pon(k(t.inicios)) + ' ' + situacion(e) + '\n\n' + k(t.cierres) + (e.push ? '' : '\n\n🔔 Activa las notificaciones en ⚙️ Ajustes → Notificaciones para enterarte al tiro de tus pedidos y mensajes.') };
    }
    // 📣 Motivar a una empresa: texto automático según el tono (editable). Llega como push y queda en su chat.
    async function motivar(id, alTerminar) {
      if (!actividad.length) await cargarAct();
      const e = actividad.find((x) => x.id === id); if (!e) return toast('Empresa no encontrada');
      let tono = 'motivador', vuelta = Math.floor(Math.random() * 3);
      const d = X.modal('<h2>📣 Motivar a ' + esc(e.empresa || e.email) + '</h2><p class="sub">' + SEM[e.sem] + ' Entró ' + hace(e.visto_at) + ' · ' + (e.push ? '🔔 Tiene notificaciones' : '🔕 Sin notificaciones: queda en su chat') + (e.motivado_at && dias(e.motivado_at) < 1 ? ' · ⚠️ Ya la motivaste hoy' : '') + '</p>' +
        '<div class="seg" id="mtT">' + Object.keys(TONOS).map((k) => '<button type="button" data-t="' + k + '"' + (k === tono ? ' class="on"' : '') + '>' + TONOS[k].n + '</button>').join('') + '</div>' +
        '<label>Título<input id="mtTit" maxlength="80"></label><label>Mensaje (puedes editarlo)<textarea id="mtTxt" maxlength="1000" rows="6"></textarea></label>' +
        '<div class="btns"><button type="button" class="ghost" id="mtOtro">🔄 Otro texto</button><button type="button" id="mtOk">📣 Enviar</button></div><p class="sub">Máximo 1 aviso por empresa al día.</p>');
      const gen = () => { const t = texto(e, tono, vuelta); d.querySelector('#mtTit').value = t.titulo; d.querySelector('#mtTxt').value = t.cuerpo; };
      gen();
      d.querySelector('#mtT').onclick = (ev) => { const b = ev.target.closest('[data-t]'); if (!b) return; tono = b.dataset.t; d.querySelectorAll('#mtT button').forEach((x) => x.classList.toggle('on', x === b)); gen(); };
      d.querySelector('#mtOtro').onclick = () => { vuelta++; gen(); };
      d.querySelector('#mtOk').onclick = async (ev) => {
        ev.target.disabled = true;
        try { const r = await rpc('admin_motivar', { p_user: e.id, p_titulo: d.querySelector('#mtTit').value, p_cuerpo: d.querySelector('#mtTxt').value }); if (!r.ok) throw new Error(r.error); X.enviar(); toast('📣 Enviado' + (r.push ? '' : ' (quedó en su chat)')); d.close(); if (alTerminar) alTerminar(); }
        catch (x) { toast('⚠️ ' + x.message); ev.target.disabled = false; }
      };
    }
    // 💬 Mensaje directo al chat de soporte del negocio (queda en CM → Mensajes).
    async function mensaje(id, nombre) {
      const t = await X.pedir('💬 Mensaje para ' + nombre, { largo: true, si: 'Enviar', max: 1000 }); if (!t || !t.trim()) return;
      try { await rpc('cfx_chat_iniciar', { p_cuenta: id, p_texto: t.trim(), p_nombre: nombre, p_rol: 'negocio' }); X.enviar(); toast('💬 Enviado a ' + nombre); } catch (x) { toast('⚠️ ' + x.message); }
    }
    // 👁️ Ver una empresa: números, actividad por hora y últimos diseños.
    async function verEmpresa(id) {
      const d = X.modal('<div class="titulo-v"><h2 class="grow" id="veT">🏢 Empresa</h2><button type="button" class="small ghost" data-cerrar>✕</button></div><div id="veZ"><p class="sub">Cargando…</p></div>');
      const z = d.querySelector('#veZ');
      let r; try { r = await rpc('admin_empresa', { p_id: id }); } catch (x) { return fallo(z, x); }
      d.querySelector('#veT').textContent = '🏢 ' + (r.empresa || r.email);
      z.innerHTML = '<div class="stats">' + item('Plan', esc(r.plan)) + item('Clientes', r.clientes + ' (' + r.clientes_premium + ' Premium)') + item('Productos', r.productos) + item('Diseños publicados', r.publicaciones) +
        item('Pedidos (30 días)', r.pedidos_30d) + item('Ventas entregadas (30 días)', plata(r.ventas_30d)) + '</div>' +
        '<p class="sub">' + esc(r.email) + (r.telefono ? ' · WhatsApp +' + esc(r.telefono) : '') + (r.horario ? ' · 🕒 ' + esc(r.horario) : '') + (r.abierto === false ? ' · 🔴 Cerrada' : '') + ' · desde ' + fecha(r.creada) + '</p><div id="veA"></div>' +
        '<div class="btns"><button type="button" class="small" id="veM">📣 Motivar</button><button type="button" class="small ghost" id="veC">💬 Mensaje</button></div>' +
        '<ul class="list">' + ((r.ultimas_publicaciones || []).map((x) => '<li><span class="grow">' + (x.vip ? '⭐ VIP · ' : '') + esc(x.titulo) + '</span><span class="sub">' + fecha(x.updated_at) + '</span></li>').join('') || '<li class="empty">Sin diseños publicados</li>') + '</ul>';
      z.querySelector('#veM').onclick = () => { d.close(); motivar(id); };
      z.querySelector('#veC').onclick = () => { d.close(); mensaje(id, r.empresa || r.email); };
      rpc('admin_empresa_actividad', { p_id: id }).then((a) => {
        const hs = a.horas || [], mh = Math.max(1, ...hs), pico = hs.some((x) => x) ? hs.indexOf(Math.max(...hs)) : -1;
        const barras = (l, alto) => '<div style="display:flex;align-items:flex-end;gap:2px;height:60px;margin:6px 0">' + l.map((v) => '<div title="' + esc(v[0]) + '" style="flex:1;background:var(--brand);opacity:.75;border-radius:3px 3px 0 0;height:' + Math.round(v[1] * 100 / alto) + '%"></div>').join('') + '</div>';
        const ds = a.dias || [], md = Math.max(1, ...ds.map((x) => x.entradas));
        z.querySelector('#veA').innerHTML = '<div class="stats">' + item('Última conexión', hace(a.visto_at)) + item('Días activos (30 d)', a.dias_30 + ' de 30') + item('Entradas (30 d)', a.entradas_30) +
          item('Clientes activos (7 d)', a.clientes_activos) + item('Notificaciones', a.push ? '🔔 Activas' : '🔕 No') + item('Último producto', hace(a.ultimo_producto)) + '</div>' +
          '<h3>🕒 A qué hora se conecta' + (pico >= 0 ? ' <span class="pill">más a las ' + pico + ':00</span>' : '') + '</h3>' + barras(hs.map((x, i) => [i + ':00 · ' + x, x]), mh) +
          '<h3>📅 Últimos 14 días</h3>' + barras(ds.map((x) => [fecha(x.dia + 'T12:00') + ' · ' + x.entradas, x.entradas]), md);
      }).catch(() => {});
    }
    // Acciones sobre una cuenta (negocio o cliente): Pro/Premium, inhabilitar, eliminar.
    async function accion(id, a, nombre, recargar) {
      try {
        if (a === 'susp' || a === 'react') { if (!(await confirmar((a === 'susp' ? 'Inhabilitar' : 'Reactivar') + ' la cuenta de ' + nombre + '.', a === 'susp' ? 'Inhabilitar' : 'Reactivar'))) return; await rpc('admin_suspender', { p_user: id, p_suspender: a === 'susp' }); }
        else if (a === 'del') { if ((await X.pedir('🗑️ Eliminar ' + nombre, { texto: 'Se borra la cuenta y todos sus datos. No se puede deshacer.', label: 'Escribe ELIMINAR para confirmar', si: 'Eliminar' })) !== 'ELIMINAR') return; await rpc('admin_eliminar_cuenta', { p_user: id }); }
        else { if (!(await confirmar(+a ? 'Suma ' + a + ' días de Pro/Premium a ' + nombre + '.' : 'Quita el Pro/Premium de ' + nombre + ' (queda en Gratis, sin borrar datos).', +a ? 'Dar' : 'Quitar'))) return; await rpc('admin_premium', { p_user: id, p_dias: +a }); }
        X.enviar(); toast('Listo'); recargar();
      } catch (x) { toast('⚠️ ' + x.message); }
    }
    const seg = (z, sel, f) => { z.querySelector(sel).onclick = (ev) => { const b = ev.target.closest('[data-f]'); if (!b) return; z.querySelectorAll(sel + ' button').forEach((x) => x.classList.toggle('on', x === b)); f(b.dataset.f); }; };

    const L = [
      { k: 'resumen', ico: '📊', t: 'Resumen', d: 'Números, ingresos, vencimientos y reportes', abrir: async (z) => {
        z.innerHTML = '<p class="sub">Cargando…</p>';
        let r, g, reps;
        try { [r, g, reps] = await Promise.all([rpc('admin_resumen'), rpc('admin_ingresos'), rpc('cfx_msg_reportes').catch(() => [])]); } catch (x) { return fallo(z, x); }
        z.innerHTML = '<div class="stats">' + item('🏪 Negocios', r.negocios) + item('⭐ Negocios Pro', r.negocios_pro) + item('🟢 Activos 7 días', r.activos_7d) + item('⏳ Vencen en 7 días', r.por_vencer) +
          item('👥 Clientes', r.clientes) + item('⭐ Clientes Premium', r.clientes_pro) + item('🧑‍🍳 Equipo', r.equipo) + item('🛒 Pedidos del mes', r.pedidos_mes) + item('🛒 Pedidos hoy', r.pedidos_hoy) + item('💰 Ingresos del mes', plata(r.ingresos_mes)) + '</div>' +
          '<div class="card"><h2>💰 Ingresos</h2><div class="stats">' + item('Empresas Pro', g.empresas_pro) + item('Clientes Premium', g.clientes_premium) + item('Estimado mensual (empresas)', plata(g.estimado_mes)) + item('Keys vendidas este mes', plata(g.licencias_mes)) + item('Pedidos este mes', g.pedidos_mes) + '</div>' +
          '<h3>⏰ Planes que vencen en 7 días</h3><p class="sub">Se les avisa solo (días en Reglas). Puedes avisarles antes con un toque.</p><ul class="list" id="rsV">' +
          ((g.vencen || []).map((u) => '<li><div class="grow"><b>' + esc(u.nombre) + '</b><div class="sub">' + (u.role === 'client' ? 'Cliente Premium' : 'Empresa Pro') + ' · vence el ' + fecha(u.pro_until) + '</div></div><button type="button" class="small" data-av="' + esc(u.id) + '">🔔 Avisar</button></li>').join('') || '<li class="empty">Nadie vence esta semana</li>') + '</ul></div>' +
          '<div class="card"><h2>🚩 Reportes <span class="pill">' + reps.length + '</span></h2><ul class="list" id="rsR">' + (reps.map((x) => '<li><div class="grow"><b>' + esc(x.a || x.a_email || 'Usuario') + '</b> reportado por ' + esc(x.quien || x.quien_email || '') +
            '<div class="sub">Motivo: ' + esc(x.motivo) + '</div><div class="sub">“' + esc(x.extracto || '') + '”</div></div><button type="button" class="small ghost" data-rp="ok" data-id="' + esc(x.id) + '">Descartar</button><button type="button" class="small danger" data-rp="susp" data-id="' + esc(x.id) + '">Suspender</button></li>').join('') || '<li class="empty">Sin reportes 🎉</li>') + '</ul></div>' +
          '<div class="card"><h2>🧹 Limpieza</h2><p class="sub">Se hace sola todos los días. También puedes limpiar ahora:</p><div class="btns" id="rsL"><button type="button" class="small ghost" data-l="comprobantes">Comprobantes viejos</button><button type="button" class="small ghost" data-l="avisos">Avisos de +7 días</button>' +
          '<button type="button" class="small ghost" data-l="mensajes">Mensajes de +7 días</button><button type="button" class="small ghost" data-l="pedidos">Pedidos expirados (+60 días)</button><button type="button" class="small danger" data-l="todo">Limpiar todo</button></div></div>';
        const otra = () => L[0].abrir(z);
        z.querySelector('#rsV').onclick = async (ev) => { const b = ev.target.closest('[data-av]'); if (!b) return; try { await rpc('admin_avisar_vencimiento', { p_user: b.dataset.av }); X.enviar(); toast('🔔 Aviso enviado'); } catch (x) { toast('⚠️ ' + x.message); } };
        z.querySelector('#rsR').onclick = async (ev) => { const b = ev.target.closest('[data-rp]'); if (!b) return; if (b.dataset.rp === 'susp' && !(await confirmar('¿Suspender la cuenta reportada?', 'Suspender'))) return; try { await rpc('cfx_msg_resolver', { p_id: b.dataset.id, p_suspender: b.dataset.rp === 'susp' }); toast('Listo'); otra(); } catch (x) { toast('⚠️ ' + x.message); } };
        z.querySelector('#rsL').onclick = async (ev) => { const b = ev.target.closest('[data-l]'); if (!b) return; if (!(await confirmar(b.dataset.l === 'todo' ? '¿Limpiar todo lo antiguo ahora?' : '¿Limpiar ahora: ' + b.textContent + '?', 'Limpiar'))) return;
          try { const x = await rpc('admin_limpiar', { p_que: b.dataset.l }); toast('🧹 Borrados: ' + x.comprobantes + ' comprobantes, ' + x.avisos + ' avisos, ' + x.mensajes + ' mensajes, ' + x.pedidos + ' pedidos'); } catch (x) { toast('⚠️ ' + x.message); } };
      } },
      { k: 'actividad', ico: '📡', t: 'Actividad de empresas', d: 'Quién entra, quién duerme y motivar', abrir: async (z) => {
        z.innerHTML = '<p class="sub">Cargando…</p>';
        let hoy; try { [, hoy] = await Promise.all([cargarAct(), rpc('admin_actividad_hoy')]); } catch (x) { return fallo(z, x); }
        let f = '';
        const n = { verde: 0, amarillo: 0, rojo: 0 }; actividad.forEach((e) => { n[e.sem]++; });
        z.innerHTML = '<p><span class="pill">🟢 ' + n.verde + ' · 🟡 ' + n.amarillo + ' · 🔴 ' + n.rojo + '</span></p><p class="sub"><b>Hoy:</b> ' + hoy.empresas + ' empresa(s) activa(s) · ' + hoy.clientes + ' cliente(s) · ' + hoy.productos + ' producto(s) nuevo(s) · ' + hoy.fichas + ' diseño(s) · ' + hoy.pedidos + ' pedido(s)</p>' +
          '<div class="seg" id="acF"><button type="button" class="on" data-f="">Todas</button><button type="button" data-f="verde">🟢 Activas</button><button type="button" data-f="amarillo">🟡 Tibias</button><button type="button" data-f="rojo">🔴 Dormidas</button></div><ul class="list" id="acL"></ul>' +
          '<div class="btns"><button type="button" class="small" id="acTodas">📣 Motivar a las dormidas</button><button type="button" class="small ghost" id="acLimp">🧹 Limpiar historial</button></div>' +
          '<p class="sub">🟢 entró hoy o ayer · 🟡 hace 2 a 7 días · 🔴 más de 7 días o nunca. "Limpiar historial" borra el resumen por día; la última conexión se mantiene.</p>';
        const pintar = () => { const l = actividad.filter((e) => !f || e.sem === f);
          z.querySelector('#acL').innerHTML = l.map((e) => '<li style="flex-wrap:wrap"><span>' + SEM[e.sem] + '</span><div class="grow" style="min-width:200px"><b>' + esc(e.empresa || e.email) + '</b> ' + (e.pro ? '<span class="pill pro">PRO</span>' : '<span class="pill">FREE</span>') +
            '<div class="sub">Entró ' + hace(e.visto_at) + ' · ' + (e.push ? '🔔 con notificaciones' : '🔕 sin notificaciones') + (e.motivado_at && dias(e.motivado_at) < 1 ? ' · 📣 motivada hoy' : '') + '</div>' +
            '<div class="sub">📦 Último producto: ' + hace(e.ultimo_producto) + ' · 🖼️ Diseño: ' + hace(e.ultima_ficha) + ' · 🛒 Pedido: ' + hace(e.ultimo_pedido) + '</div>' +
            '<div class="sub">' + e.productos + ' productos · ' + e.fichas + ' diseños · ' + e.clientes + ' clientes (' + e.clientes_activos + ' activos) · ' + e.pedidos_7d + ' pedidos y ' + e.entradas_7d + ' entradas en 7 días</div></div>' +
            '<button type="button" class="small ghost" data-ver="' + esc(e.id) + '">👁️ Ver</button><button type="button" class="small" data-mot="' + esc(e.id) + '">📣 Motivar</button></li>').join('') || '<li class="empty">' + (actividad.length ? 'Ninguna en este grupo 🎉' : 'Aún no hay empresas') + '</li>'; };
        pintar(); seg(z, '#acF', (v) => { f = v; pintar(); });
        z.querySelector('#acL').onclick = (ev) => { const b = ev.target.closest('button'); if (!b) return; if (b.dataset.ver) verEmpresa(b.dataset.ver); if (b.dataset.mot) motivar(b.dataset.mot, () => cargarAct().then(pintar)); };
        z.querySelector('#acLimp').onclick = async () => { if (!(await confirmar('¿Borrar el historial de conexiones? Se mantiene la última vez que entró cada uno.', 'Borrar'))) return; try { toast('🧹 Historial borrado (' + await rpc('admin_limpiar_actividad') + ' registros)'); } catch (x) { toast('⚠️ ' + x.message); } };
        z.querySelector('#acTodas').onclick = async (ev) => {
          const l = actividad.filter((e) => e.sem === 'rojo' && !(e.motivado_at && dias(e.motivado_at) < 1));
          if (!l.length) return toast('No hay empresas dormidas por motivar hoy 🎉');
          if (!(await confirmar('¿Enviar un mensaje motivador a ' + l.length + ' empresa(s) dormida(s)? Cada una recibe un texto con su nombre.', 'Enviar'))) return;
          ev.target.disabled = true; let ok = 0;
          for (const [i, e] of l.entries()) { const t = texto(e, 'motivador', i); try { const r = await rpc('admin_motivar', { p_user: e.id, p_titulo: t.titulo, p_cuerpo: t.cuerpo }); if (r.ok) ok++; } catch (x) { /* sigue */ } }
          X.enviar(); ev.target.disabled = false; toast('📣 Enviado a ' + ok + ' de ' + l.length + ' empresa(s)'); await cargarAct(); pintar();
        };
      } },
      { k: 'negocios', ico: '🏪', t: 'Negocios', d: 'Pro, inhabilitar, eliminar y crear', abrir: async (z) => {
        z.innerHTML = '<div class="btns" style="margin-top:0"><button type="button" class="small" id="ngMas">➕ Crear negocio</button></div><div class="card" id="ngForm" hidden><h2>➕ Crear negocio</h2><p class="sub">Parte con la prueba Pro gratis (días en Reglas) y luego pasa solo a Gratis. También se registran solos con el link de 🆕 Registro abierto.</p>' +
          '<label>Nombre del negocio<input id="ngN" maxlength="80" autocomplete="off"></label><label>Correo del dueño<input id="ngE" type="email" autocomplete="off"></label>' +
          '<label>Contraseña<input id="ngC" autocomplete="off"></label><div class="btns"><button type="button" class="small ghost" id="ngGen">Generar clave</button><button type="button" id="ngOk">Crear negocio</button></div><p class="err" id="ngErr"></p><div id="ngCred"></div></div>' +
          '<input style="margin-top:10px" id="ngQ" type="search" placeholder="Buscar negocio…" aria-label="Buscar negocio">' +
          '<div class="seg" id="ngF" style="margin-top:8px"><button type="button" class="on" data-f="">Todos</button><button type="button" data-f="pro">⭐ Pro</button><button type="button" data-f="free">Gratis</button><button type="button" data-f="solos">🆕 Se registraron solos</button>' +
          '<button type="button" data-f="vence">⏳ Por vencer</button><button type="button" data-f="inactivos">💤 Sin actividad 7 días</button><button type="button" data-f="susp">⛔ Suspendidos</button></div><p class="sub" id="ngCt"></p><div id="ngL"><p class="sub">Cargando…</p></div>';
        let L = [], f = '';
        const pintar = () => {
          const t = z.querySelector('#ngQ').value.trim().toLowerCase(), semana = Date.now() - 7 * 864e5, siete = Date.now() + 7 * 864e5;
          const l = L.filter((n) => (!t || ((n.empresa || '') + ' ' + n.email).toLowerCase().includes(t)) && (!f || (f === 'pro' && n.pro) || (f === 'free' && !n.pro) || (f === 'susp' && n.suspendido) || (f === 'solos' && n.autoregistro) ||
            (f === 'vence' && n.pro && n.pro_until && new Date(n.pro_until) < siete) || (f === 'inactivos' && (!n.visto_at || new Date(n.visto_at) < semana))));
          z.querySelector('#ngCt').textContent = l.length + ' negocio(s)';
          z.querySelector('#ngL').innerHTML = l.map((n) => '<div class="card"><b>' + esc(n.empresa || n.email) + '</b> ' + (n.pro ? '<span class="pill pro">PRO</span>' : '<span class="pill">GRATIS</span>') +
            (n.suspendido ? ' <span class="pill bad">Suspendido</span>' : '') + (n.pago_revision ? ' <span class="pill warn">🧾 Pago por revisar</span>' : '') + (n.link_pago ? '' : ' <span class="pill warn">Sin link de pago</span>') + (n.autoregistro ? ' <span class="pill ok">🆕 Se registró solo</span>' : '') +
            (n.rubro ? '<div class="sub">🏷️ ' + esc(n.rubro) + '</div>' : '') + '<div class="sub" style="overflow-wrap:anywhere">' + esc(n.email) + (n.telefono ? ' · +' + esc(n.telefono) : '') + '</div>' +
            '<div class="sub">' + (n.pro ? '⭐ Pro hasta ' + (n.pro_until ? fecha(n.pro_until) : 'siempre') : n.pro_until ? 'Pro venció el ' + fecha(n.pro_until) : 'Nunca fue Pro') + ' · 🟢 entró ' + hace(n.visto_at) + '</div>' +
            '<div class="sub">👥 ' + n.clientes + ' clientes · 🧑‍🍳 ' + n.equipo + ' equipo · 🛍️ ' + n.productos + ' productos · 🛒 ' + n.pedidos_mes + ' pedidos este mes' + (n.estrellas ? ' · ★ ' + n.estrellas : '') + '</div>' +
            '<div class="btns"><select data-acc="' + esc(n.id) + '" aria-label="Acciones"><option value="">Acción…</option><option value="30">⭐ Dar Pro 1 mes</option><option value="7">⭐ +7 días</option><option value="365">⭐ +1 año</option><option value="0">Quitar Pro</option>' +
            '<option value="' + (n.suspendido ? 'react' : 'susp') + '">' + (n.suspendido ? '✅ Reactivar' : '⛔ Inhabilitar') + '</option><option value="del">🗑️ Eliminar cuenta</option></select>' +
            '<button type="button" class="small ghost" data-ver="' + esc(n.id) + '">👁️ Ver</button><button type="button" class="small ghost" data-mot="' + esc(n.id) + '">📣 Motivar</button><button type="button" class="small ghost" data-msg="' + esc(n.id) + '">💬</button>' +
            (n.slug ? '<a class="btn small ghost" target="_blank" rel="noopener" href="' + esc(X.a.web + 't/?s=' + encodeURIComponent(n.slug)) + '">🔗 Tienda</a>' : '') + '</div></div>').join('') || vacio('Sin negocios en este filtro');
        };
        const cargar = async () => { try { L = await rpc('admin_negocios'); pintar(); } catch (x) { fallo(z.querySelector('#ngL'), x); } };
        z.querySelector('#ngQ').oninput = pintar; seg(z, '#ngF', (v) => { f = v; pintar(); });
        z.querySelector('#ngL').onchange = (ev) => { const id = ev.target.dataset.acc, a = ev.target.value; if (!id || !a) return; ev.target.value = ''; const n = L.find((x) => x.id === id); accion(id, a, n ? n.empresa || n.email : '', cargar); };
        z.querySelector('#ngL').onclick = (ev) => { const b = ev.target.closest('button'); if (!b) return; const n = L.find((x) => x.id === (b.dataset.ver || b.dataset.mot || b.dataset.msg)); if (!n) return;
          if (b.dataset.ver) verEmpresa(n.id); if (b.dataset.mot) motivar(n.id); if (b.dataset.msg) mensaje(n.id, n.empresa || n.email); };
        z.querySelector('#ngMas').onclick = () => { const f = z.querySelector('#ngForm'); f.hidden = !f.hidden; if (!f.hidden) z.querySelector('#ngN').focus(); };
        z.querySelector('#ngGen').onclick = () => { z.querySelector('#ngC').value = clave(); };
        z.querySelector('#ngOk').onclick = async (ev) => {
          const e = z.querySelector('#ngErr'); e.textContent = '';
          if (!z.querySelector('#ngC').value) z.querySelector('#ngC').value = clave();
          const d = { tipo: 'user', nombre: z.querySelector('#ngN').value.trim(), email: z.querySelector('#ngE').value.trim(), password: z.querySelector('#ngC').value };
          if (!d.nombre || !d.email) { e.textContent = 'Escribe el nombre y el correo'; return; }
          ev.target.disabled = true;
          try {
            const { data, error } = await X.c.functions.invoke('enviar', { body: { accion: 'crear_usuario', email: d.email, password: d.password, nombre: d.nombre, tipo: d.tipo, negocio: null } });
            if (error || !data || !data.ok) throw new Error((data && data.error) || (error && error.message) || 'No se pudo crear la cuenta (revisa la función "enviar" de Despega Pyme)');
            const msg = 'Hola ' + d.nombre + ' 👋\nTe creamos tu cuenta en Despega Pyme.\n\n📲 Entra aquí e instala la app: ' + X.a.web + '\n👤 Correo: ' + d.email + '\n🔑 Contraseña: ' + d.password + '\n\nTe recomendamos cambiar la contraseña en "Mi cuenta" la primera vez que entres.';
            z.querySelector('#ngCred').innerHTML = '<p class="pill ok" style="white-space:pre-line">' + esc(msg) + '</p><div class="btns"><a class="btn small" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(msg) + '">💬 Enviar por WhatsApp</a><button type="button" class="small ghost" id="ngCp">📋 Copiar</button></div>';
            z.querySelector('#ngCp').onclick = () => navigator.clipboard.writeText(msg).then(() => toast('Copiado'));
            ['#ngN', '#ngE', '#ngC'].forEach((s) => { z.querySelector(s).value = ''; }); toast('✅ Negocio creado'); cargar();
          } catch (x) { e.textContent = x.message; } finally { ev.target.disabled = false; }
        };
        cargar();
      } },
      { k: 'registro_abierto', ico: '🆕', t: 'Registro abierto', d: 'Link y QR para que los negocios se registren solos', abrir: (z) => {
        z.innerHTML = '';
        X.tarjetaLink(z, { titulo: '🆕 Crea tu tienda gratis', texto: 'Publícalo donde quieras (redes, ferias, afiches): cualquier negocio crea su cuenta Gratis sola, elige su rubro y parte con los días de Pro de regalo. Se cierra en ⚖️ Reglas.',
          link: X.a.web + 'n/', archivo: 'qr-crea-tu-tienda', mensaje: '🏪 ¿Tienes un negocio o emprendimiento? Crea tu tienda online gratis (link, QR, pedidos y caja)' });
      } },
      { k: 'inactivas', ico: '🧹', t: 'Cuentas que no se usan', d: 'Buscar y borrar negocios vacíos', abrir: (z) => {
        z.innerHTML = '<p class="sub">Negocios sin Pro, sin productos, pedidos, clientes ni diseños, que no entran hace los días que elijas. Revisa la lista antes: se borran para siempre.</p>' +
          '<label>Sin entrar hace (días)<input id="inD" inputmode="numeric" value="30"></label><div class="btns"><button type="button" class="small" id="inB">Buscar</button></div><ul class="list" id="inL"></ul><div class="btns" id="inX" hidden><button type="button" class="small danger" id="inBorrar">Borrar</button></div>';
        let l = [];
        const d = () => parseInt(z.querySelector('#inD').value, 10) || 0;
        z.querySelector('#inB').onclick = async () => {
          try { l = await rpc('admin_cuentas_inactivas', { p_dias: d() }); } catch (x) { return fallo(z.querySelector('#inL'), x); }
          z.querySelector('#inL').innerHTML = l.map((x) => '<li><div class="grow"><b>' + esc(x.empresa || x.email) + '</b>' + (x.autoregistro ? ' <span class="pill ok">🆕 Se registró solo</span>' : '') + '<div class="sub">' + esc(x.email) + (x.rubro ? ' · ' + esc(x.rubro) : '') + ' · creada el ' + fecha(x.creado) + ' · entró ' + hace(x.visto_at) + '</div></div></li>').join('') || '<li class="empty">Ninguna cuenta sin uso 🎉</li>';
          z.querySelector('#inX').hidden = !l.length; z.querySelector('#inBorrar').textContent = 'Borrar estas ' + l.length + ' cuenta(s)';
        };
        z.querySelector('#inBorrar').onclick = async () => {
          if (!l.length || !(await confirmar('¿Borrar ' + l.length + ' cuenta(s) sin uso? No se puede deshacer.', 'Borrar'))) return;
          try { toast('🧹 Cuentas borradas: ' + await rpc('admin_borrar_inactivas', { p_ids: l.map((x) => x.id), p_dias: d() })); l = []; z.querySelector('#inL').innerHTML = ''; z.querySelector('#inX').hidden = true; } catch (x) { toast('⚠️ ' + x.message); }
        };
      } },
      { k: 'clientes', ico: '👥', t: 'Clientes y equipo', d: 'Premium, inhabilitar y eliminar', abrir: async (z) => {
        z.innerHTML = '<input id="clQ" type="search" placeholder="Buscar cliente…" aria-label="Buscar cliente"><select id="clN" aria-label="Negocio" style="margin-top:8px"><option value="">Todos los negocios</option></select>' +
          '<div class="seg" id="clF" style="margin-top:8px"><button type="button" class="on" data-f="">Clientes</button><button type="button" data-f="pro">⭐ Premium</button><button type="button" data-f="susp">⛔ Suspendidos</button><button type="button" data-f="equipo">🧑‍🍳 Equipo</button></div><p class="sub" id="clCt"></p><ul class="list" id="clL"><li class="sub">Cargando…</li></ul>';
        let C = [], N = [], f = '';
        const pintar = () => {
          const t = z.querySelector('#clQ').value.trim().toLowerCase(), neg = z.querySelector('#clN').value;
          const l = C.filter((c) => (!t || ((c.nombre || '') + ' ' + c.email).toLowerCase().includes(t)) && (!neg || c.negocio_id === neg) && (f === 'equipo' ? c.rol === 'equipo' : c.rol === 'client') && (!f || f === 'equipo' || (f === 'pro' && c.pro) || (f === 'susp' && c.suspendido)));
          z.querySelector('#clCt').textContent = l.length + ' cuenta(s)';
          z.querySelector('#clL').innerHTML = l.map((c) => '<li style="flex-wrap:wrap"><div class="grow" style="min-width:200px"><b>' + esc(c.nombre || c.email) + '</b> ' + (c.rol === 'equipo' ? '<span class="pill">Equipo</span>' : c.pro ? '<span class="pill pro">PREMIUM</span>' : '<span class="pill">FREE</span>') +
            (c.suspendido ? ' <span class="pill bad">Suspendido</span>' : '') + '<div class="sub" style="overflow-wrap:anywhere">' + esc(c.email) + ' · ' + esc(c.negocio || 'sin negocio') + ' · entró ' + hace(c.visto_at) + ' · ' + c.pedidos + ' pedidos</div></div>' +
            '<select data-acc="' + esc(c.id) + '" style="width:auto" aria-label="Acciones"><option value="">Acción…</option>' + (c.rol === 'client' ? '<option value="30">⭐ Premium 1 mes</option><option value="0">Quitar Premium</option>' : '') +
            '<option value="' + (c.suspendido ? 'react' : 'susp') + '">' + (c.suspendido ? '✅ Reactivar' : '⛔ Inhabilitar') + '</option><option value="del">🗑️ Eliminar cuenta</option></select></li>').join('') || '<li class="empty">Sin cuentas en este filtro</li>';
        };
        const cargar = async () => {
          try { [C, N] = await Promise.all([rpc('admin_clientes'), rpc('admin_negocios')]); } catch (x) { return fallo(z.querySelector('#clL'), x); }
          const s = z.querySelector('#clN'), v = s.value;
          s.innerHTML = '<option value="">Todos los negocios</option>' + N.map((n) => '<option value="' + esc(n.id) + '"' + (n.id === v ? ' selected' : '') + '>' + esc(n.empresa || n.email) + ' (' + n.clientes + ')</option>').join('');
          pintar();
        };
        z.querySelector('#clQ').oninput = pintar; z.querySelector('#clN').onchange = pintar; seg(z, '#clF', (v) => { f = v; pintar(); });
        z.querySelector('#clL').onchange = (ev) => { const id = ev.target.dataset.acc, a = ev.target.value; if (!id || !a) return; ev.target.value = ''; const c = C.find((x) => x.id === id); accion(id, a, c ? c.nombre || c.email : '', cargar); };
        cargar();
      } },
      { k: 'reglas', ico: '⚖️', t: 'Reglas', d: 'Días, límites y tiempos', abrir: async (z) => {
        z.innerHTML = '<p class="sub">Cargando…</p>';
        let r; try { r = await rpc('reglas'); } catch (x) { return fallo(z, x); }
        z.innerHTML = REGLAS.map(([k, t]) => '<label>' + esc(t) + '<input data-rg="' + k + '" inputmode="numeric" value="' + esc(r[k]) + '"></label>').join('') + '<div class="btns"><button type="button" id="rgOk">Guardar reglas</button></div>';
        z.querySelector('#rgOk').onclick = async (ev) => {
          ev.target.disabled = true;
          try { for (const i of z.querySelectorAll('[data-rg]')) if (String(r[i.dataset.rg]) !== i.value) await rpc('admin_set_regla', { p_k: i.dataset.rg, p_v: parseInt(i.value, 10) || 0 }); r = await rpc('reglas'); toast('✅ Reglas guardadas'); } catch (x) { toast('⚠️ ' + x.message); }
          ev.target.disabled = false;
        };
      } },
      { k: 'servidor', ico: '🛰️', t: 'Servidor y correo', d: 'Función "enviar", push y Gmail', abrir: async (z) => {
        z.innerHTML = '<p class="sub">Cargando…</p>';
        let s; try { s = await rpc('admin_secret_status'); } catch (x) { return fallo(z, x); }
        z.innerHTML = '<div class="card"><h2>🛰️ Función "enviar"</h2><p class="sub">Envía las notificaciones y crea cuentas.</p><div class="btns"><button type="button" class="small" id="svP">Probar conexión</button></div><p class="sub" id="svR"></p></div>' +
          '<div class="card"><h2>🔔 Notificaciones push</h2><p class="sub">' + (s.vapid_public && s.vapid_private ? '✅ Claves push configuradas' : '⚠️ Faltan las claves push: créalas en Control → 🔔 Notificaciones.') + '</p></div>' +
          '<div class="card"><h2>✉️ Correo (Gmail)</h2><p class="sub">' + (s.gmail_user && s.gmail_app_password ? '✅ Gmail configurado' : '⚠️ Falta configurar Gmail') + '</p>' +
          '<label>Tu Gmail<input id="gmU" type="email" autocomplete="off" placeholder="tucorreo@gmail.com"></label><label>Contraseña de aplicación (16 letras)<input id="gmP" autocomplete="off" data-sin-voz></label><label>Nombre del remitente<input id="gmN" maxlength="60" value="Despega Pyme"></label>' +
          '<div class="btns"><button type="button" id="gmOk">Guardar Gmail</button></div></div>';
        z.querySelector('#svP').onclick = async () => { const o = z.querySelector('#svR'); o.textContent = 'Probando…';
          try { const { data, error } = await X.c.functions.invoke('enviar', { body: { accion: 'ping' } }); if (error) throw error; if (!data || !data.version) throw new Error('La función "enviar" responde, pero es una versión antigua.'); o.textContent = '✅ Conectado. Versión ' + data.version + (data.servicio ? '' : ' · ⚠️ falta la clave de servidor'); }
          catch (x) { o.textContent = '❌ ' + (x.message || x); } };
        z.querySelector('#gmOk').onclick = async () => {
          const u = z.querySelector('#gmU').value.trim(), p = z.querySelector('#gmP').value.replace(/\s/g, ''), n = z.querySelector('#gmN').value.trim();
          if (!/@/.test(u) || p.length < 16) return toast('Revisa el correo y la contraseña de aplicación (16 letras)');
          try { await rpc('admin_set_secret', { p_name: 'gmail_user', p_value: u }); await rpc('admin_set_secret', { p_name: 'gmail_app_password', p_value: p }); if (n) await rpc('admin_set_secret', { p_name: 'mail_from_name', p_value: n }); toast('✅ Gmail guardado'); L.find((x) => x.k === 'servidor').abrir(z); } catch (x) { toast('⚠️ ' + x.message); }
        };
      } },
      { k: 'marca', ico: '🎨', t: 'Contacto y marca', d: 'WhatsApp de soporte, nombre y logo de CodeFix', abrir: async (z) => {
        z.innerHTML = '<p class="sub">Cargando…</p>';
        let v; try { v = await rpc('public_settings'); } catch (x) { return fallo(z, x); }
        z.innerHTML = '<div class="card"><h2>💬 WhatsApp de contacto</h2><p class="sub">El número al que escriben los negocios desde la app.</p><label>Número (con 56)<input id="mkW" inputmode="tel" value="' + esc(v.contact_whatsapp || '') + '"></label><div class="btns"><button type="button" id="mkWOk">Guardar</button></div></div>' +
          '<div class="card"><h2>🏷️ Nombre y logo en el chat</h2><p class="sub">Así te ven los negocios cuando les escribes.</p><label>Nombre<input id="mkN" maxlength="60" placeholder="CodeFix"></label><div class="btns"><button type="button" id="mkNOk">Guardar nombre</button></div>' +
          '<label>Logo (imagen chica)<input id="mkL" type="file" accept="image/*"></label><div class="btns"><button type="button" class="small ghost" id="mkLX">Quitar logo</button></div></div>';
        z.querySelector('#mkWOk').onclick = async () => { try { await rpc('admin_set_setting', { p_key: 'contact_whatsapp', p_value: z.querySelector('#mkW').value.replace(/\D/g, '') }); toast('✅ Guardado'); } catch (x) { toast('⚠️ ' + x.message); } };
        z.querySelector('#mkNOk').onclick = async () => { try { await rpc('update_my_company', { p_empresa: z.querySelector('#mkN').value }); toast('✅ Nombre guardado'); } catch (x) { toast('⚠️ ' + x.message); } };
        z.querySelector('#mkLX').onclick = async () => { try { await rpc('set_mi_logo', { p_logo: null }); toast('Logo quitado'); } catch (x) { toast('⚠️ ' + x.message); } };
        z.querySelector('#mkL').onchange = async (ev) => {
          const f = ev.target.files[0]; ev.target.value = ''; if (!f) return;
          try { const url = await new Promise((ok, no) => { const i = new Image(); i.onload = () => { const k = Math.min(1, 160 / Math.max(i.width, i.height)), c = document.createElement('canvas'); c.width = Math.round(i.width * k); c.height = Math.round(i.height * k); c.getContext('2d').drawImage(i, 0, 0, c.width, c.height); URL.revokeObjectURL(i.src); ok(c.toDataURL('image/webp', 0.85)); }; i.onerror = no; i.src = URL.createObjectURL(f); });
            await rpc('set_mi_logo', { p_logo: url }); toast('✅ Logo guardado'); } catch (x) { toast('⚠️ ' + (x.message || 'No se pudo leer la imagen')); }
        };
      } },
      { k: 'auditoria', ico: '📜', t: 'Registro de cambios', d: 'Lo que se hizo en el panel', abrir: async (z) => {
        z.innerHTML = '<p class="sub">Cargando…</p>';
        let l; try { l = await rpc('admin_auditoria'); } catch (x) { return fallo(z, x); }
        z.innerHTML = '<div class="btns"><button type="button" class="small ghost" data-d="30">Borrar los de +30 días</button><button type="button" class="small danger" data-d="0">Borrar todo</button></div><ul class="list">' +
          (l.map((x) => '<li><div class="grow"><b>' + esc(x.accion) + '</b><div class="sub">' + esc(x.detalle) + '</div></div><span class="sub">' + fechaHora(x.created_at) + '</span></li>').join('') || '<li class="empty">Sin cambios registrados</li>') + '</ul>';
        z.querySelector('.btns').onclick = async (ev) => { const b = ev.target.closest('[data-d]'); if (!b) return; const d = +b.dataset.d;
          if (!(await confirmar(d ? '¿Borrar los cambios de hace más de ' + d + ' días?' : '¿Borrar todo el registro de cambios?', 'Borrar'))) return;
          try { toast('🧹 Borrados: ' + await rpc('admin_limpiar_auditoria', { p_dias: d })); L.find((x) => x.k === 'auditoria').abrir(z); } catch (x) { toast('⚠️ ' + x.message); } };
      } }
    ];
    return L;
  });
})(window);
