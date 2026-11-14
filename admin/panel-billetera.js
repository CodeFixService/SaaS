/* Centro de Mando · G34 🧭 Panel de Billetera (antes Emprendedor/admin). Mismas funciones, ahora en CM → Apps → Billetera → 🧭 Panel.
   No ve clientes ni deudas de los negocios. Los pagos de conexiones extra se revisan en CM → Pagos. */
(function (global) {
  'use strict';
  const PLAN = { pro: 'Pro', prueba: 'Prueba Pro', free: 'Free' };
  const RUB = [['almacen', 'Almacén'], ['feria', 'Feria'], ['catalogo', 'Catálogo'], ['emprendimiento', 'Emprendimiento'], ['servicios', 'Servicios'], ['educacion', 'Educación'], ['club', 'Club'], ['personal', 'Personal'], ['otro', 'Otro']];
  const Lx = (x) => (Array.isArray(x) ? x : []);
  const claveAzar = () => { const abc = 'abcdefghjkmnpqrstuvwxyz', num = '23456789', b = crypto.getRandomValues(new Uint8Array(10)); let s = ''; for (let i = 0; i < 6; i++) s += abc[b[i] % abc.length]; for (let i = 6; i < 9; i++) s += num[b[i] % num.length]; return s.charAt(0).toUpperCase() + s.slice(1); };
  const csv = (filas, cols) => '﻿' + [cols.map((c) => c.t)].concat(filas.map((f) => cols.map((c) => c.v(f)))).map((r) => r.map((v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"').join(';')).join('\n');

  global.PanelApps.registrar('billetera', (X) => {
    const { esc, toast, confirmar, rpc, fecha, fechaHora, dias, hace, plata, item, vacio, fallo, pedir } = X;
    const web = X.a.web;
    const funcion = (body) => X.fn('enviar', body);
    const rel = (t) => { if (!t) return '—'; const d = Math.round((new Date(String(t).slice(0, 10) + 'T12:00:00') - new Date(new Date().toISOString().slice(0, 10) + 'T12:00:00')) / 864e5); return d === 0 ? 'hoy' : d === 1 ? 'mañana' : d === -1 ? 'ayer' : d > 0 ? 'en ' + d + ' días' : 'hace ' + -d + ' días'; };
    const fila = (n, sub, msg) => '<li><div class="grow"><b>' + esc(n.nombre) + '</b><div class="sub">' + esc(sub) + '</div></div>' + (n.whatsapp ? '<a class="btn small ghost" target="_blank" rel="noopener" href="' + esc(X.wa(n.whatsapp, msg)) + '">💬</a>' : '') + '</li>';
    const bloque = (t, l, sub, msg) => (l = Lx(l)).length ? '<div class="card"><h2>' + esc(t) + ' (' + l.length + ')</h2><ul class="list">' + l.map((n) => fila(n, sub(n), msg(n))).join('') + '</ul></div>' : '';

    // 📣 Aviso para un negocio (o todos): llega a su campana.
    async function aviso(destino, negocio) {
      const d = X.modal('<h2>📣 Nuevo aviso</h2><label>Título<input id="avT" maxlength="80"></label><label>Mensaje<textarea id="avC" maxlength="300" rows="4"></textarea></label><div class="btns"><button type="button" class="ghost" data-cerrar>Cancelar</button><button type="button" id="avOk">Enviar</button></div>');
      d.querySelector('#avOk').onclick = async (ev) => { ev.target.disabled = true;
        try { const n = await rpc('admin_aviso', { p_destino: destino, p_negocio: negocio || null, p_titulo: d.querySelector('#avT').value, p_cuerpo: d.querySelector('#avC').value }); X.enviar(); toast('📣 Enviado a ' + n + ' libreta(s)'); d.close(); }
        catch (x) { toast('⚠️ ' + x.message); ev.target.disabled = false; } };
    }

    async function crearCuenta(alTerminar) {
      const d = X.modal('<h2>➕ Crear cuenta para un cliente</h2><label>Nombre del negocio<input id="ccN" maxlength="50" placeholder="Ej: Almacén Don Pedro"></label><label>Rubro<select id="ccR">' + RUB.map(([v, t]) => '<option value="' + v + '">' + t + '</option>').join('') + '</select></label>' +
        '<label>Correo del cliente<input id="ccE" type="email" inputmode="email" placeholder="correo@cliente.cl"></label><label>Contraseña<input id="ccC" value="' + claveAzar() + '"></label><p class="sub">Se la envías tú. Puede cambiarla en Mi cuenta.</p>' +
        '<label>WhatsApp del cliente<input id="ccT" type="tel" inputmode="tel" placeholder="+56 9 …"></label><label>Plan inicial<select id="ccP"><option value="0">Prueba Pro (según Reglas)</option><option value="30">Pro 1 mes (ya pagó)</option><option value="90">Pro 3 meses</option></select></label>' +
        '<p class="err" id="ccErr"></p><div class="btns"><button type="button" class="ghost" data-cerrar>Cancelar</button><button type="button" id="ccOk">Crear</button></div>');
      d.querySelector('#ccOk').onclick = async (ev) => {
        const v = (id) => d.querySelector(id).value.trim(), er = d.querySelector('#ccErr'), nombre = v('#ccN'), email = v('#ccE').toLowerCase(), cl = d.querySelector('#ccC').value, tel = v('#ccT');
        er.textContent = '';
        if (nombre.length < 2) { er.textContent = 'Escribe el nombre del negocio'; return; }
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { er.textContent = 'Correo inválido'; return; }
        if (cl.length < 8) { er.textContent = 'La contraseña debe tener al menos 8 caracteres'; return; }
        if (!/[a-zA-Z]/.test(cl) || !/\d/.test(cl)) { er.textContent = 'Usa al menos una letra y un número'; return; }
        ev.target.disabled = true;
        try { await funcion({ accion: 'crear_usuario', email, clave: cl, nombre, rubro: v('#ccR'), dias_pro: Number(v('#ccP')) }); d.close();
          X.acceso('✅ Cuenta creada', 'Hola, tu billetera de ' + nombre + ' en Libreta de Cobros está lista 🎉\n\nEntra aquí: ' + web + '#ingresar\nCorreo: ' + email + '\nContraseña: ' + cl + '\n\nTe recomiendo instalarla en tu celular (botón Instalar) y cambiar la contraseña en Más → Mi cuenta.', tel);
          if (alTerminar) alTerminar(); }
        catch (x) { er.textContent = x.message; ev.target.disabled = false; }
      };
    }

    async function ficha(n, recargar) {
      const det = await rpc('admin_negocio_detalle', { p_negocio: n.id }).catch(() => null);
      const pl = [['Recordar pago', 'Hola ' + n.nombre + ', te recuerdo que tu mensualidad de Libreta de Cobros vence pronto. ¿Te paso los datos para pagar?'],
        ['Ofrecer Pro', 'Hola ' + n.nombre + ', ¿cómo te ha ido con tu billetera? Si activas Pro tienes todo sin límites, cobro a todos de una, recibos con imagen y reportes avanzados. ¿Te ayudo?'],
        ['Ayuda para empezar', 'Hola ' + n.nombre + ', te escribe el equipo de Libreta de Cobros. ¿Te ayudo a configurar tu billetera? Toma 5 minutos.']];
      const d = X.modal('<div class="titulo-v"><h2 class="grow">👛 ' + esc(n.nombre) + '</h2><button type="button" class="small ghost" data-cerrar>✕</button></div>' +
        (det ? '<div class="stats">' + item('Clientes', det.clientes) + item('Mov. del mes', (det.movimientos_mes || 0) + (det.caja_mes || 0)) + item('Días con uso', det.dias_activo) + '</div>' : '') +
        (det && det.quiere_pro_at ? '<p class="sub warn">⭐ Pidió Pro ' + rel(det.quiere_pro_at) + '</p>' : '') +
        (det && Lx(det.pagos).length ? '<details><summary class="sub">Pagos (' + det.pagos.length + ')</summary><ul class="list">' + det.pagos.map((x) => '<li><span class="grow">' + plata(x.monto) + ' · ' + fecha(x.creado) + '</span><span class="pill ' + (x.estado === 'aprobada' ? 'ok' : x.estado === 'rechazada' ? 'bad' : 'warn') + '">' + esc(x.estado) + '</span></li>').join('') + '</ul></details>' : '') +
        (n.whatsapp ? '<div class="btns">' + pl.map(([t, m]) => '<a class="btn small ghost" target="_blank" rel="noopener" href="' + esc(X.wa(n.whatsapp, m)) + '">💬 ' + esc(t) + '</a>').join('') + '</div>' : '') +
        '<p class="sub" style="overflow-wrap:anywhere">' + esc(n.email) + (n.whatsapp ? ' · ' + esc(n.whatsapp) : '') + '<br>Rubro: ' + esc(n.rubro) + ' · Desde ' + fecha(n.creado) + ' · Último uso: ' + (n.ultimo_uso ? fechaHora(n.ultimo_uso) : '—') + '</p>' +
        '<p>Plan: <b>' + esc(PLAN[n.plan] || n.plan) + '</b>' + (n.plan === 'pro' ? ' · pagado hasta ' + fecha(n.premium_hasta) : n.plan === 'prueba' ? ' · hasta ' + fecha(n.prueba_hasta) : '') + (n.activado ? ' · ✅ activación pagada' : ' · sin activación') + '</p>' +
        '<p class="sub">🤝 ' + (n.conexiones || 0) + ' conexiones activas · ' + (n.conexiones_extra || 0) + ' paquete(s) extra' + (det && det.invitados ? ' · 🎁 Invitó a ' + det.invitados + ' negocio(s), ' + det.premiados + ' con premio' : '') + (det && det.invitado_por ? ' · Llegó invitado por ' + esc(det.invitado_por) : '') + '</p>' +
        (n.estado === 'suspendido' ? '<p class="sub warn">⛔ Suspendido: ' + esc(n.motivo_suspension || '') + '</p>' : '') + (n.nota_admin ? '<p class="sub">📝 ' + esc(n.nota_admin) + '</p>' : '') +
        '<div class="btns"><button type="button" class="small" data-a="dias">⭐ Dar Pro</button>' + (n.plan !== 'pro' ? '<button type="button" class="small ghost" data-a="prueba">' + (n.plan === 'prueba' ? '🎁 Extender prueba' : '🎁 Dar prueba Pro') + '</button>' : '<button type="button" class="small ghost" data-a="quitar">⬇️ Quitar Pro</button>') +
        (n.plan === 'prueba' ? '<button type="button" class="small ghost" data-a="quitar">⬇️ Terminar prueba</button>' : '') + '<button type="button" class="small ghost" data-a="conexiones">🤝 Paquetes de conexiones</button><button type="button" class="small ghost" data-a="nota">📝 Nota interna</button>' +
        '<button type="button" class="small ghost" data-a="aviso">📣 Enviar aviso</button>' + (n.estado === 'activo' ? '<button type="button" class="small danger" data-a="suspender">⛔ Desactivar cuenta</button>' : n.estado === 'suspendido' ? '<button type="button" class="small" data-a="reactivar">✅ Reactivar cuenta</button>' : '') + '</div>');
      d.onclick = async (ev) => {
        const b = ev.target.closest('[data-a]'); if (!b) return; const v = b.dataset.a;
        try {
          let hecho = true;
          if (v === 'dias') { const x = await pedir('⭐ Dar Pro', { label: 'Días de Pro', valor: '30', si: 'Dar' }); if (!(+x >= 1 && +x <= 3660)) return; await rpc('admin_plan', { p_negocio: n.id, p_accion: 'sumar', p_dias: +x }); toast('Pro activado ✓'); }
          else if (v === 'prueba') { const x = await pedir('🎁 Prueba Pro', { label: 'Días de prueba Pro', valor: '7', si: 'Dar' }); if (!(+x >= 1 && +x <= 90)) return; await rpc('admin_plan', { p_negocio: n.id, p_accion: 'prueba', p_dias: +x }); toast('Prueba extendida ✓'); }
          else if (v === 'quitar') { if (!(await confirmar('¿Pasar a ' + n.nombre + ' a Free ahora? Su billetera sigue funcionando gratis y las funciones Pro quedan en pausa. No se borra nada.', 'Pasar a Free'))) return; await rpc('admin_plan', { p_negocio: n.id, p_accion: 'quitar', p_dias: null }); toast('Ahora está en Free'); }
          else if (v === 'conexiones') { const x = await pedir('🤝 Paquetes de conexiones', { label: 'Paquetes extra (cada uno suma conexiones según Ajustes)', valor: String(n.conexiones_extra || 0), si: 'Guardar' }); if (x == null || x === '' || !(+x >= 0 && +x <= 200)) return; await rpc('admin_plan', { p_negocio: n.id, p_accion: 'conexiones', p_dias: +x }); toast('Paquetes actualizados ✓'); }
          else if (v === 'nota') { const t = await pedir('📝 Nota interna', { label: 'Solo la ves tú', valor: n.nota_admin || '', largo: true, max: 500, si: 'Guardar' }); if (t == null) return; await rpc('admin_estado', { p_negocio: n.id, p_suspender: null, p_motivo: null, p_nota: t }); toast('Nota guardada'); }
          else if (v === 'aviso') { hecho = false; aviso('negocio', n.id); }
          else if (v === 'suspender') { const m = await pedir('⛔ Desactivar cuenta', { label: 'Motivo (lo verá el negocio)', texto: 'No podrá anotar ni sus clientes ver su link hasta que la reactives. Podrá exportar sus datos.', max: 150, si: 'Desactivar' }); if (!m || m.trim().length < 3) return; await rpc('admin_estado', { p_negocio: n.id, p_suspender: true, p_motivo: m.trim(), p_nota: null }); toast('Cuenta desactivada'); }
          else if (v === 'reactivar') { await rpc('admin_estado', { p_negocio: n.id, p_suspender: false, p_motivo: null, p_nota: null }); toast('Reactivado ✓'); }
          if (hecho) { d.close(); recargar(); }
        } catch (x) { toast('⚠️ ' + x.message); }
      };
    }

    const ajustesTabla = async () => { const { data, error } = await X.c.from('ajustes').select('*').single(); if (error) throw new Error(error.message); return data; };
    const guardar = (p) => rpc('admin_guardar_ajustes', { p });

    const L = [
      { k: 'resumen', ico: '📊', t: 'Resumen', d: 'Ingresos, embudo, vencen y oportunidades', abrir: async (z) => {
        z.innerHTML = '<p class="sub">Cargando…</p>'; let r, op; try { [r, op] = await Promise.all([rpc('admin_resumen'), rpc('admin_oportunidades')]); } catch (x) { return fallo(z, x); }
        const conv = r.negocios ? Math.round(r.convertidos * 100 / r.negocios) : 0, porDia = Object.fromEntries(Lx(r.registros_dia).map((x) => [x.dia, x.n]));
        const ds = []; for (let i = 29; i >= 0; i--) ds.push(new Date(Date.now() - i * 864e5 - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10));
        const mx = Math.max(1, ...ds.map((x) => porDia[x] || 0)), n0 = (v) => v != null ? v : '—';
        z.innerHTML = (!r.cron_ok ? '<p class="sub warn">⚠️ Las tareas automáticas no están activas: en Supabase → Database → Extensions enciende pg_cron y pg_net.</p>' : '') +
          (!r.push_ok ? '<p class="sub warn">⚠️ Falta generar las claves push (🔔 Notificaciones).</p>' : '') +
          (r.pagos_pendientes ? '<p class="sub warn">💳 ' + r.pagos_pendientes + ' pago(s) de conexiones por revisar en <a href="#pagos">CM → Pagos</a>.</p>' : '') +
          '<div class="stats">' + item('💰 Ingreso mensual recurrente', plata(r.mrr)) + item('💵 Cobrado este mes', plata(r.ingresos_mes)) + item('✅ Han pagado', r.convertidos + ' (' + conv + '%)') +
          item('👛 Billeteras creadas', r.negocios) + item('🎁 En prueba Pro', r.en_prueba) + item('⭐ Quieren Pro', r.quieren_pro) + item('💎 Pro pagando', r.premium) + item('🙂 En Free', n0(r.free)) + item('🟢 Activas 7 días', r.activos_7d) +
          item('🤝 Conexiones activas', n0(r.conexiones)) + item('🎁 Invitados (30 días)', n0(r.referidos_30d)) + item('📅 Planes anuales', n0(r.anuales)) + '</div>' +
          (Lx(r.vencen).length ? '<div class="card"><h2>⏰ Vencen hoy o mañana (' + r.vencen.length + ')</h2><ul class="list">' + r.vencen.map((n) => fila(n, (n.tipo === 'pro' ? 'Mensualidad Pro' : 'Prueba Pro') + ' · vence ' + rel(n.fecha),
            n.tipo === 'pro' ? 'Hola ' + n.nombre + ', tu mensualidad de Pro en Libreta de Cobros vence ' + rel(n.fecha) + '. ¿Te paso los datos para pagar?' : 'Hola ' + n.nombre + ', tu prueba Pro de Libreta de Cobros termina ' + rel(n.fecha) + '. Si activas Pro sigues con todo sin límites. ¿Te ayudo?')).join('') + '</ul></div>' : '') +
          '<div class="card"><h2>📈 Registros: ' + r.nuevos_7d + ' esta semana · ' + r.nuevos_30d + ' en 30 días</h2><div style="display:flex;align-items:flex-end;gap:2px;height:70px">' + ds.map((x) => '<div title="' + esc(x) + ': ' + (porDia[x] || 0) + '" style="flex:1;background:var(--brand);opacity:.75;border-radius:3px 3px 0 0;height:' + Math.round((porDia[x] || 0) * 100 / mx) + '%"></div>').join('') + '</div></div>' +
          '<h3>💡 Oportunidades</h3>' + (bloque('⭐ Quieren Pro', op.quieren_pro, (n) => 'Lo pidió ' + rel(n.fecha) + ' · ' + n.email, (n) => 'Hola ' + n.nombre + ', vi que quieres activar Pro en tu billetera 🙌 Te cuento cómo pagar:') +
          bloque('⏳ Su prueba Pro termina pronto', op.prueba_termina, (n) => 'Termina ' + rel(n.fecha) + ' · usó la app ' + (n.ultimo_uso ? rel(n.ultimo_uso) : 'nunca'), (n) => 'Hola ' + n.nombre + ', tu prueba Pro de Libreta de Cobros termina pronto. Después sigues gratis, pero sin las funciones Pro. ¿Te ayudo a activarlo?') +
          bloque('💳 Pro por vencer', op.pro_vence, (n) => 'Vence ' + rel(n.fecha), (n) => 'Hola ' + n.nombre + ', te recuerdo que tu mensualidad de Pro vence pronto. ¿Te paso los datos para pagar?') +
          bloque('🙂 En Free y usando la app', op.free, (n) => (n.activado ? 'Venció su Pro' : 'Terminó su prueba') + ' · entró ' + (n.ultimo_uso ? rel(n.ultimo_uso) : '—'), (n) => 'Hola ' + n.nombre + ', vi que sigues usando tu billetera 🙌 Si activas Pro tienes cobro a todos de una, recibos, reportes y todo sin límites. ¿Te cuento?') || vacio('Sin oportunidades por ahora.'));
      } },
      { k: 'negocios', ico: '👛', t: 'Billeteras', d: 'Pro, prueba, aviso, nota, desactivar y crear', abrir: async (z) => {
        z.innerHTML = '<div class="btns" style="margin-top:0"><button type="button" class="small" id="ngMas">➕ Crear cuenta</button><button type="button" class="small ghost" id="ngCsv">📄 Exportar lista (CSV)</button><button type="button" class="small ghost" id="ngAv">📣 Aviso a todas</button></div>' +
          '<input id="ngQ" type="search" placeholder="🔎 Nombre o correo" aria-label="Buscar billetera"><div class="seg" id="ngF" style="margin-top:8px">' + [['todos', 'Todas'], ['pro', '⭐ Pro'], ['prueba', 'En prueba'], ['free', 'Free'], ['vence', '⏳ Por vencer'], ['inactivos', '💤 Sin actividad 7 días'], ['suspendido', '⛔ Suspendidas'], ['eliminado', 'Por borrar']]
            .map(([v, t], i) => '<button type="button" data-f="' + v + '"' + (i ? '' : ' class="on"') + '>' + t + '</button>').join('') + '</div><p class="sub" id="ngCt"></p><div id="ngL"><p class="sub">Cargando…</p></div>';
        let N = [], f = 'todos', t;
        const cargar = async () => { try { N = await rpc('admin_negocios', { p_buscar: z.querySelector('#ngQ').value.trim(), p_filtro: f }); } catch (x) { return fallo(z.querySelector('#ngL'), x); }
          z.querySelector('#ngCt').textContent = N.length + ' billetera(s)';
          z.querySelector('#ngL').innerHTML = N.length ? '<ul class="list">' + N.map((n) => '<li><div class="grow"><b>' + esc(n.nombre) + '</b>' + (n.soporte ? ' 💬' : '') + ' <span class="pill ' + (n.estado !== 'activo' ? 'bad' : { pro: 'pro', prueba: 'info', free: '' }[n.plan] || '') + '">' + esc(n.estado !== 'activo' ? n.estado : PLAN[n.plan] || n.plan) + '</span>' +
            '<div class="sub" style="overflow-wrap:anywhere">' + esc(n.email) + ' · ' + n.clientes + ' clientes · ' + (n.movimientos_mes || 0) + ' mov/mes · entró ' + hace(n.ultimo_uso) + '</div></div><button type="button" class="small ghost" data-id="' + esc(n.id) + '">👁️ Ver</button></li>').join('') + '</ul>' : vacio('Sin resultados.'); };
        z.querySelector('#ngQ').oninput = () => { clearTimeout(t); t = setTimeout(cargar, 300); };
        X.seg(z, '#ngF', (v) => { f = v; cargar(); });
        z.querySelector('#ngL').onclick = (ev) => { const b = ev.target.closest('[data-id]'); if (b) ficha(N.find((n) => n.id === b.dataset.id), cargar); };
        z.querySelector('#ngMas').onclick = () => crearCuenta(cargar);
        z.querySelector('#ngAv').onclick = () => aviso('todos', null);
        z.querySelector('#ngCsv').onclick = () => {
          const txt = csv(N, [{ t: 'Negocio', v: (n) => n.nombre }, { t: 'Correo', v: (n) => n.email }, { t: 'WhatsApp', v: (n) => n.whatsapp || '' }, { t: 'Rubro', v: (n) => n.rubro }, { t: 'Plan', v: (n) => PLAN[n.plan] }, { t: 'Activación pagada', v: (n) => n.activado ? 'Sí' : 'No' },
            { t: 'Prueba hasta', v: (n) => n.prueba_hasta || '' }, { t: 'Pro hasta', v: (n) => n.premium_hasta || '' }, { t: 'Clientes', v: (n) => n.clientes }, { t: 'Movimientos del mes', v: (n) => n.movimientos_mes || 0 }, { t: 'Último uso', v: (n) => n.ultimo_uso || '' }, { t: 'Creada', v: (n) => n.creado }]);
          const u = URL.createObjectURL(new Blob([txt], { type: 'text/csv;charset=utf-8' })), a = document.createElement('a'); a.href = u; a.download = 'billeteras-' + new Date().toISOString().slice(0, 10) + '.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(u), 2000);
        };
        cargar();
      } },
      { k: 'limpieza', ico: '🧹', t: 'Limpieza y respaldo', d: 'Comprobantes, avisos, cola, sesiones y Excel', abrir: async (z) => {
        z.innerHTML = '<div class="card"><p class="sub">Descarga el respaldo antes de limpiar.</p><div class="btns">' + [['comprobantes', '🧾 Comprobantes viejos', 'Borra las fotos de comprobantes revisados más antiguas que los días de Reglas.'], ['avisos', '🔔 Avisos leídos', 'Borra los avisos leídos de más de 30 días.'],
          ['cola', '📤 Cola de push', 'Borra la cola de push ya enviada.'], ['sesiones', '🔗 Sesiones vencidas', 'Borra sesiones vencidas de los links de clientes.'], ['auditoria', '📜 Registro antiguo', 'Borra el registro de cambios de más de 180 días.'], ['soporte', '💬 Soporte antiguo', 'Borra los mensajes de soporte de más de 30 días.']]
          .map(([k, t, d]) => '<button type="button" class="small ghost" data-l="' + k + '" data-t="' + esc(d) + '">' + t + '</button>').join('') + '</div></div>' +
          '<div class="card"><h2>📗 Respaldo</h2><p class="sub">Billeteras, pagos de Pro, keys, cupones y registro de cambios.</p><div class="btns"><button type="button" id="lmR">📗 Descargar respaldo (Excel)</button></div></div>';
        z.onclick = async (ev) => {
          const b = ev.target.closest('button'); if (!b) return;
          if (b.id === 'lmR') { try { if (!global.CFX_RESPALDO) throw new Error('Falta el módulo de respaldo'); global.CFX_RESPALDO.excel('billetera-admin', await rpc('cfx_respaldo')); toast('📗 Respaldo descargado'); } catch (x) { toast('⚠️ ' + x.message); } return; }
          if (!b.dataset.l || !(await confirmar(b.dataset.t, 'Limpiar'))) return;
          try { const n = await rpc('admin_limpiar', { p_que: b.dataset.l }); toast('🧹 Listo (' + n + ')'); } catch (x) { toast('⚠️ ' + x.message); }
        };
      } },
      { k: 'conexiones', ico: '🤝', t: 'Conexiones extra', d: 'Incluidas, paquetes y precio', abrir: async (z) => {
        let a; try { a = await ajustesTabla(); } catch (x) { return fallo(z, x); }
        z.innerHTML = '<div class="card"><p class="sub">Conexiones entre billeteras: cuántas trae cada una y cuánto cuesta cada paquete extra (se paga en CM → Pagos).</p>' +
          '<label>Incluidas<input id="cxI" type="number" value="' + esc(a.conexiones_incluidas ?? '') + '"></label><label>Por paquete<input id="cxP" type="number" value="' + esc(a.conexiones_paquete ?? '') + '"></label><label>Precio/mes<input id="cxM" type="number" inputmode="numeric" value="' + esc(a.precio_paquete ?? '') + '"></label>' +
          '<div class="btns"><button type="button" id="cxOk">💾 Guardar</button></div></div>';
        z.querySelector('#cxOk').onclick = async () => { const n = (id) => Math.round(Number(z.querySelector(id).value));
          try { await guardar({ conexiones_incluidas: n('#cxI'), conexiones_paquete: n('#cxP'), precio_paquete: n('#cxM') }); toast('Guardado ✓'); } catch (x) { toast('⚠️ ' + x.message); } };
      } },
      { k: 'reglas', ico: '⚖️', t: 'Reglas', d: 'Prueba, gracia, invitados y feriados', abrir: async (z) => {
        let a; try { a = await ajustesTabla(); } catch (x) { return fallo(z, x); }
        const C = [['dias_prueba', 'Días de prueba Pro', 'Al crear una billetera.'], ['dias_gracia', 'Días de gracia', 'Después de vencer la mensualidad.'], ['dias_comprobantes', 'Días que se guardan los comprobantes', 'Después la foto se borra sola.'],
          ['dias_aviso', 'Aviso antes de vencer (días)', 'Además avisa 3 y 1 día antes y el mismo día.'], ['dias_referido', '🎁 Días de Pro por invitado', '0 = apagado'], ['ref_min_registros', '🎁 Registros mínimos del invitado', 'Ventas, gastos o fiados'],
          ['ref_max_premios', '🎁 Máximo de premios por billetera', ''], ['version_legal', 'Versión de los textos legales', 'Súbela si cambias los Términos: todos deberán aceptarlos de nuevo.']];
        z.innerHTML = '<div class="card">' + C.map(([k, t, d]) => '<label>' + esc(t) + '<input type="number" data-rg="' + k + '" value="' + esc(a[k] ?? '') + '"></label>' + (d ? '<p class="sub">' + esc(d) + '</p>' : '')).join('') +
          '<div class="btns"><button type="button" id="rgOk">💾 Guardar reglas</button></div></div><div class="card"><h2>📅 Feriados</h2><p class="sub">En feriados no se puede cobrar.</p><div id="feL"></div>' +
          '<label>Fecha<input id="feF" type="date"></label><label>Nombre<input id="feN" maxlength="60"></label><div class="btns"><button type="button" class="small" id="feOk">➕ Agregar feriado</button></div></div>';
        const feriados = async () => { const { data } = await X.c.from('feriados').select('*').gte('fecha', new Date().toISOString().slice(0, 10)).order('fecha');
          z.querySelector('#feL').innerHTML = '<ul class="list">' + ((data || []).map((x) => '<li><span class="grow">' + fecha(x.fecha + 'T12:00:00') + ' · ' + esc(x.nombre) + '</span><button type="button" class="small ghost" data-fd="' + esc(x.fecha) + '" aria-label="Borrar">🗑️</button></li>').join('') || '<li class="empty">Sin feriados próximos.</li>') + '</ul>'; };
        z.onclick = async (ev) => {
          const b = ev.target.closest('button'); if (!b) return;
          try {
            if (b.id === 'rgOk') { const p = {}; z.querySelectorAll('[data-rg]').forEach((i) => { p[i.dataset.rg] = Math.round(Number(i.value)); }); await guardar(p); toast('Guardado ✓'); }
            if (b.id === 'feOk') { const fe = z.querySelector('#feF').value; if (!fe) return toast('Elige la fecha'); await rpc('admin_feriado', { p_fecha: fe, p_nombre: z.querySelector('#feN').value, p_borrar: false }); z.querySelector('#feN').value = ''; feriados(); }
            if (b.dataset.fd) { await rpc('admin_feriado', { p_fecha: b.dataset.fd, p_nombre: null, p_borrar: true }); feriados(); }
          } catch (x) { toast('⚠️ ' + x.message); }
        };
        feriados().catch(() => {});
      } },
      { k: 'push', ico: '🔔', t: 'Notificaciones', d: 'Claves push y servidor', abrir: async (z) => {
        let cfg = {}; try { cfg = await rpc('config_publica'); } catch (e) { /* nada */ }
        z.innerHTML = '<div class="card"><p>' + (cfg.vapid_public ? '✅ Claves push configuradas' : '⚠️ Falta generar las claves push') + '</p><div class="btns"><button type="button" class="small ghost" id="puV">' + (cfg.vapid_public ? 'Regenerar claves push' : 'Generar claves push') + '</button>' +
          '<button type="button" class="small ghost" id="puP">🩺 Probar servidor</button><button type="button" class="small ghost" id="puF">📋 Copiar código de la función "enviar"</button></div><p class="sub" id="puR"></p></div>';
        z.querySelector('#puV').onclick = async () => {
          if (cfg.vapid_public && !(await confirmar('Todos tendrán que volver a activar las notificaciones. ¿Seguir?', 'Regenerar'))) return;
          try { const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']), b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
            await rpc('admin_set_secret', { p_nombre: 'vapid_private', p_valor: (await crypto.subtle.exportKey('jwk', kp.privateKey)).d }); await rpc('admin_set_secret', { p_nombre: 'vapid_public', p_valor: b64u(await crypto.subtle.exportKey('raw', kp.publicKey)) });
            toast('🔔 Claves push listas'); L.find((x) => x.k === 'push').abrir(z); } catch (x) { toast('⚠️ ' + x.message); }
        };
        z.querySelector('#puP').onclick = async () => { const r = z.querySelector('#puR'); try { const x = await funcion({ accion: 'ping' }); r.textContent = '✅ Conectado: función "enviar" v' + x.version + (x.servicio ? '' : ' · falta clave de servicio'); } catch (x) { r.textContent = '❌ ' + x.message; } };
        z.querySelector('#puF').onclick = async () => {
          try { const t = await (await fetch('https://raw.githubusercontent.com/CodeFixService/Emprendedor/main/supabase/functions/enviar/corto.ts?t=' + Date.now(), { cache: 'no-store' })).text(); if (!/^import /m.test(t)) throw new Error('No se pudo leer corto.ts');
            await navigator.clipboard.writeText(t.split('\n').filter((x) => !x.startsWith('--') && !x.startsWith('//')).join('\n').trim()); toast('📋 Código copiado: pégalo en Edge Functions → enviar → Deploy'); } catch (x) { toast('No se pudo copiar: ' + x.message); }
        };
      } },
      { k: 'auditoria', ico: '📜', t: 'Registro de cambios', d: 'Lo que se hizo en el panel', abrir: async (z) => {
        const l = await rpc('admin_auditoria').catch(() => []);
        z.innerHTML = '<ul class="list">' + (l.map((x) => '<li><div class="grow"><b>' + esc(x.accion + (x.negocio ? ' · ' + x.negocio : '')) + '</b><div class="sub">' + esc(JSON.stringify(x.detalle || {}).slice(0, 160)) + '</div></div><span class="sub">' + fechaHora(x.at) + '</span></li>').join('') || '<li class="empty">Sin registros.</li>') + '</ul>';
        if (global.CFX_AJUSTES && global.CFX_AJUSTES.registro) global.CFX_AJUSTES.registro(z, (fn, a) => rpc(fn, a), { recargar: () => L.find((x) => x.k === 'auditoria').abrir(z) });
      } }
    ];
    return L;
  });
})(window);
