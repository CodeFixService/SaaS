/* Centro de Mando · Más: cuenta, espacios y horarios, descanso, espacio usado, plan Pro, instalar, salir. */
(function () {
  'use strict';
  const A = App, CM = window.CM, { esc, toast, modal, rpc, sb } = A;
  const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const mb = (b) => b < 1048576 ? Math.max(1, Math.round(b / 1024)) + ' KB' : (b / 1048576).toFixed(1).replace('.', ',') + ' MB';
  let uso = null, pago = null;

  function espacioForm(e) {
    e = e || { nombre: '', color: '#3d63ff', modo: 'personal', horario: { dias: [1, 2, 3, 4, 5], desde: '09:00', hasta: '18:00' } };
    const hz = e.horario || {}, dd = hz.dias || [1, 2, 3, 4, 5];
    const d = modal('<h2>' + (e.id ? 'Editar espacio' : 'Nuevo espacio') + '</h2><label>Nombre<input id="en" maxlength="40" value="' + esc(e.nombre) + '"></label><label>Color<input id="ec" type="color" value="' + esc(e.color) + '"></label>' +
      '<label>Tipo<select id="em"><option value="personal"' + (e.modo === 'personal' ? ' selected' : '') + '>Personal (sin exigencias)</option><option value="trabajo"' + (e.modo === 'trabajo' ? ' selected' : '') + '>Trabajo (con horario)</option></select></label>' +
      '<div id="eh"><p class="sub">Horario de trabajo: solo en estas horas te exijo avanzar; fuera de ellas te invito a descansar.</p><div class="chips">' + DIAS.map((x, i) => '<label class="chip"><input type="checkbox" value="' + (i + 1) + '"' + (dd.includes(i + 1) ? ' checked' : '') + '> ' + x + '</label>').join('') + '</div>' +
      '<div class="dos"><label>Desde<input id="ed" type="time" value="' + esc(hz.desde || '09:00') + '"></label><label>Hasta<input id="ea" type="time" value="' + esc(hz.hasta || '18:00') + '"></label></div></div>' +
      '<div class="btns">' + (e.id ? '<button class="ghost" id="eb" type="button">Archivar</button>' : '') + '<button class="ghost" data-cerrar type="button">Cancelar</button><button id="eg" type="button">Guardar</button></div>');
    const vis = () => { d.querySelector('#eh').style.display = d.querySelector('#em').value === 'trabajo' ? '' : 'none'; };
    d.querySelector('#em').onchange = vis; vis();
    d.querySelector('#eg').onclick = async () => {
      const o = { nombre: d.querySelector('#en').value.trim(), color: d.querySelector('#ec').value, modo: d.querySelector('#em').value };
      if (!o.nombre) return toast('Ponle un nombre');
      o.horario = o.modo === 'trabajo' ? { dias: [].slice.call(d.querySelectorAll('#eh input[type=checkbox]:checked')).map((c) => +c.value), desde: d.querySelector('#ed').value, hasta: d.querySelector('#ea').value } : {};
      try {
        const r = e.id ? await sb.from('espacios').update(o).eq('id', e.id) : await sb.from('espacios').insert(o);
        if (r.error) throw new Error(A.friendly(r.error));
        d.close(); await CM.cargar(); CM.pintar();
      } catch (er) { toast(er.message); }
    };
    const eb = d.querySelector('#eb'); if (eb) eb.onclick = async () => { await sb.from('espacios').update({ archivado: true }).eq('id', e.id); d.close(); await CM.cargar(); CM.pintar(); };
  }
  // Respaldo: Excel para leer (una hoja por tipo) o copia completa en .json (núcleo: respaldo.js).
  async function descargarTodo() {
    const [it, us] = await Promise.all([A.q(sb.from('items').select('*').limit(20000)), A.q(sb.from('uso_dia').select('*'))]);
    const d = modal('<h2>' + CM.ico('bajar', 18) + ' Descargar mis datos</h2><p class="muted">' + it.length + ' registros. El Excel se lee fácil; la copia completa sirve para guardar todo tal cual.</p>' +
      '<div class="btns"><button type="button" class="ghost" data-f="json">Copia completa</button><button type="button" data-f="xlsx">Excel</button></div>');
    d.onclick = (e) => {
      const b = e.target.closest('[data-f]'); if (!b) return;
      if (b.dataset.f === 'json') CFX_RESPALDO.json('centro-de-mando', { exportado: new Date().toISOString(), espacios: CM.espacios, items: it, uso: us });
      else {
        const esp = Object.fromEntries((CM.espacios || []).map((x) => [x.id, x.nombre])), hojas = { Espacios: (CM.espacios || []).map((x) => ({ nombre: x.nombre, modo: x.modo, archivado: x.archivado })) };
        it.forEach((x) => { const k = x.tipo.charAt(0).toUpperCase() + x.tipo.slice(1); (hojas[k] = hojas[k] || []).push({ titulo: x.titulo, detalle: x.cuerpo, estado: x.estado, fecha: x.fecha, espacio: esp[x.espacio_id] || '', etiquetas: (x.etiquetas || []).join(', '), datos: Object.keys(x.datos || {}).length ? x.datos : '', creado: x.created_at, hecho: x.hecho_at }); });
        hojas['Uso por día'] = us.map((x) => ({ dia: x.dia, minutos_app: x.app_min, trabajo: x.trabajo_min, descanso: x.descanso_min, foco: x.foco_min, aperturas: x.aperturas }));
        CFX_RESPALDO.excel('centro-de-mando', hojas);
      }
      d.close(); toast('Descargado');
    };
  }
  function pagar() {
    const c = (A.publica && A.publica.config) || {}, pm = Number(c.pro_precio_mensual || 0), pa = Number(c.pro_precio_anual || 0);
    const linkDe = (plan) => (plan === 'anual' ? c.pro_link_anual || c.pro_link : c.pro_link || c.pro_link_anual) || '';
    const ahorro = pa && pm ? Math.round(100 - pa * 100 / (pm * 12)) : 0;
    const d = modal('<h2>' + CM.ico('estrella', 18) + ' Pasar a Pro</h2><p class="muted">Más espacios, ideas y consejos ilimitados, revisión semanal.</p>' +
      '<div class="planes-pro"><button type="button" class="plan-op" data-p="mensual"><span class="sub">Mensual</span><b>$' + pm.toLocaleString('es-CL') + '</b><span class="sub">al mes</span></button>' +
      (pa ? '<button type="button" class="plan-op" data-p="anual"><span class="sub">Anual</span><b>$' + pa.toLocaleString('es-CL') + '</b><span class="sub">' + (ahorro > 0 ? 'ahorras ' + ahorro + '%' : 'al año') + '</span></button>' : '') + '</div>' +
      '<div id="pl"></div><label>2. Sube tu comprobante<input id="pf" type="file" accept="image/*"></label><div class="btns"><button class="ghost" data-cerrar type="button">Cancelar</button><button id="po" type="button">Enviar</button></div>');
    let plan = pa ? 'anual' : 'mensual';
    const marcar = () => {
      d.querySelectorAll('.plan-op').forEach((b) => b.classList.toggle('on', b.dataset.p === plan));
      const l = linkDe(plan);
      d.querySelector('#pl').innerHTML = l ? '<a class="btn block" href="' + esc(l) + '" target="_blank" rel="noopener">1. Pagar el plan ' + plan + ' aquí</a>' : '<p class="sub">El administrador aún no configuró el link de pago.</p>';
    };
    d.querySelectorAll('.plan-op').forEach((b) => { b.onclick = () => { plan = b.dataset.p; marcar(); }; });
    marcar();
    d.querySelector('#po').onclick = async () => {
      const f = d.querySelector('#pf').files[0]; if (!f) return toast('Sube la foto del comprobante');
      try { await rpc('pro_pagar', { p_plan: plan, p_comprobante: await A.comprimirComprobante(f) }); d.close(); toast('Enviado. Te avisamos al aprobarlo.'); pago = await rpc('mi_pago_pendiente'); CM.pintar(); } catch (e) { toast(e.message); }
    };
  }
  async function render(el) {
    const c = CM.cuenta, p = c.prefs || {}, ok = (v, d) => (v === undefined || v === null ? d : v);
    el.innerHTML = '<div class="titulo-v"><h2>Más</h2></div><p class="sub">Cargando…</p>';
    try { [uso, pago] = await Promise.all([rpc('mi_uso'), rpc('mi_pago_pendiente')]); } catch (e) { /* sigue */ }
    const lim = uso ? uso.limite_items : 0, pc = uso && lim ? Math.min(100, Math.round(uso.items / lim * 100)) : 0;
    const hasta = c.premium_hasta ? A.fCorta(c.premium_hasta.slice(0, 10)) : '';
    let x = '<div class="titulo-v"><h2>Más</h2></div>';
    const ed = CM.estadoDia(A.hoy());
    x += '<div class="card"><div class="fila"><button type="button" class="avatar con-foto" data-act="foto" aria-label="Cambiar foto" title="Cambiar foto">' + esc((c.prefs || {}).avatar || '🙂') + '<span class="cam">' + CM.ico('camara', 13) + '</span></button><input type="file" id="fPerfil" accept="image/*" hidden><h3 style="margin:0">' + esc(c.nombre || c.email) + '</h3></div><p class="sub">' + esc(c.email) + ' · ' + (c.rol === 'admin' ? 'Administrador' : c.rol === 'socio' ? 'Socio' : c.premium ? 'Plan Pro' + (hasta ? ' hasta ' + hasta : '') : 'Plan gratis') + '</p>' +
      (c.rol === 'usuario' && !c.premium ? (pago && pago.estado === 'pendiente' ? '<p class="pill warn">Pago en revisión</p>' : '<button type="button" data-act="pro">' + CM.ico('estrella', 16) + ' Pasar a Pro</button>') : '') +
      (c.rol !== 'usuario' ? '<a class="btn" href="../admin/">Panel de administración</a>' : '') + '</div>';
    const sec = [['panel', '', 'panel', 'Panel'], ['metas', '', 'metas', 'Metas'], ['cerebro', 'notas', 'libro', 'Notas'], ['cerebro', 'ideas', 'cerebro', 'Ideas'], ['cerebro', 'problemas', 'alerta', 'Problemas'],
      ['cerebro', 'diario', 'luna', 'Diario'], ['cerebro', 'logros', 'estrella', 'Logros']];
    x += '<div class="card"><h3>Secciones</h3><div class="secs">' + sec.map((s) => '<button type="button" class="ghost" data-act="sec" data-v="' + s[0] + '" data-s="' + s[1] + '">' + CM.ico(s[2], 18) + ' ' + s[3] + '</button>').join('') +
      '<button type="button" class="ghost" data-act="aterrizar">' + CM.ico('ancla', 18) + ' Aterrizar</button></div></div>';
    const pf = c.prefs || {};
    x += '<div class="card"><h3>Mi estilo</h3><label>Nombre<input id="sN" maxlength="60" value="' + esc(c.nombre || '') + '"></label><p class="sub">Color</p><div class="pal">' + CM.COLORES.map((k) => '<button type="button" data-act="col" data-c="' + k + '" class="' + ((pf.color || CM.COLORES[0]) === k ? 'on' : '') + '" style="background:' + k + '" aria-label="' + k + '"></button>').join('') + '</div>' +
      '<p class="sub">Ícono</p><div class="avs">' + CM.AVATARES.map((a) => '<button type="button" data-act="av" data-a="' + a + '" class="' + ((pf.avatar || '🙂') === a ? 'on' : '') + '">' + a + '</button>').join('') + '</div>' +
      '<p class="sub">Tema</p><div class="chips">' + [['auto', 'Automático'], ['oscuro', 'Oscuro'], ['claro', 'Claro']].map((t) => '<button type="button" class="chip' + ((pf.tema || 'auto') === t[0] ? ' on' : '') + '" data-act="tema" data-t="' + t[0] + '">' + t[1] + '</button>').join('') + '</div>' +
      '<button type="button" class="small ghost" data-act="nom">Guardar nombre</button> <button type="button" class="small ghost" data-act="tour">Ver guía</button></div>';
    const ck = CM.items.filter((i) => i.tipo === 'diario' && i.datos && (i.datos.animo || i.datos.energia)).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    x += '<div class="card"><h3>Registros de ánimo <span class="sub">(se borran solos a los 7 días)</span></h3>' + (ck.length ? ck.map((i) => '<div class="fila"><span class="grow">' + A.fCorta(i.fecha) + ' · ' + (CM.ANIMO[i.datos.animo || 0][0] || '') + ' ' + (CM.ENERGIA[i.datos.energia || 0][0] || '') + '</span><button type="button" class="x" data-act="delck" data-id="' + i.id + '" aria-label="Borrar">' + CM.ico('basura', 15) + '</button></div>').join('') : '<p class="sub">Sin registros manuales. El ánimo se calcula solo.</p>') + '</div>';
    x += '<div class="card"><h3>Espacios</h3>' + CM.espacios.filter((e) => !e.archivado).map((e) => '<div class="fila"><i class="dot" style="background:' + esc(e.color) + '"></i><span>' + esc(e.nombre) + ' <span class="sub">' + (e.modo === 'trabajo' ? 'trabajo ' + esc((e.horario || {}).desde || '') + '–' + esc((e.horario || {}).hasta || '') : 'personal') + '</span></span><button type="button" class="x" data-act="esp" data-id="' + e.id + '" aria-label="Editar">' + CM.ico('lapiz', 16) + '</button></div>').join('') +
      '<button type="button" class="small ghost" data-act="nesp">+ Espacio</button></div>';
    x += '<div class="card"><h3>' + CM.ico('bell', 17) + ' Avisos para no olvidar nada</h3>' +
      '<label class="chk2"><input id="v1" type="checkbox"' + (p.insistir === false ? '' : ' checked') + '> Insistir si no tacho algo con hora (a los 15 min y a la hora)</label>' +
      '<label class="chk2"><input id="v2" type="checkbox"' + (p.cabeza === false ? '' : ' checked') + '> Preguntarme "¿Algo que anotar?" 2 veces al día</label>' +
      '<div class="dos"><label>1ª vez<input id="v3" type="time" value="' + esc(p.cabeza_h1 || '13:00') + '"></label><label>2ª vez<input id="v4" type="time" value="' + esc(p.cabeza_h2 || '20:30') + '"></label></div>' +
      '<label class="chk2"><input id="v5" type="checkbox"' + (p.plan_semana === false ? '' : ' checked') + '> Plan de la semana (domingo 20:00)</label>' +
      '<p class="sub">Siempre: lo de mañana a las 08:00 del día antes y lo de hoy 1 hora antes. Desde la notificación puedes tocar <b>Listo</b> o <b>1 hora más</b>.</p>' +
      '<button type="button" data-act="avisos">Guardar avisos</button></div>';
    x += '<div class="card"><h3>Descanso</h3><label>Aviso si usas la app fuera de horario más de (min/día)<input id="p1" type="number" min="10" max="600" value="' + ok(p.limite_descanso_min, 60) + '"></label><label>Recordarme pausar cada (min)<input id="p2" type="number" min="0" max="180" value="' + ok(p.pausa_cada, 50) + '"></label>' +
      '<label class="chk2"><input id="p3" type="checkbox"' + (p.cierre_noche === false ? '' : ' checked') + '> Aviso de cierre del día</label><button type="button" data-act="prefs">Guardar</button><p class="sub">Solo mido el tiempo dentro de esta app, no el uso total del teléfono.</p></div>';
    if (A.pushSoportado()) x += '<div class="card"><h3>Notificaciones</h3><button type="button" data-act="push">Activar en este dispositivo</button></div>';
    if (uso) x += '<div class="card"><h3>Espacio usado</h3><div class="barra"><i style="width:' + pc + '%"></i></div><p class="sub">' + uso.items + ' de ' + lim + ' registros · ' + mb(uso.bytes) + '</p>' +
      '<button type="button" class="small ghost" data-act="bajar">' + CM.ico('bajar', 15) + ' Descargar mis datos</button> <button type="button" class="small ghost" data-act="depurar">Limpiar antiguos</button><p class="sub">Descarga primero; limpiar borra hábitos y tareas hechas con más de 90 días.</p></div>';
    x += '<div class="card">' + (A.pedirInstalar ? '<button type="button" class="ghost" data-act="inst">Instalar en el teléfono</button> ' : '') + '<button type="button" class="ghost" data-act="salir">Cerrar sesión</button> <button type="button" class="ghost" data-act="reparar">Reparar la app</button><p class="sub">Versión ' + esc(BT_CONFIG.VERSION) + '. Reparar vuelve a descargar la app en este teléfono; no borra tus datos.</p></div>';
    x += '<div class="card peligro"><h3>Zona de riesgo</h3><button type="button" class="small ghost" data-act="borrar">Borrar todos mis datos</button> <button type="button" class="small ghost" data-act="cuenta">Eliminar mi cuenta</button></div>';
    el.innerHTML = x;
    // La foto de perfil queda solo en este teléfono (no ocupa el servidor).
    CM.fotoPerfil().then((f) => { const av = el.querySelector('.avatar.con-foto'); if (f && av) { av.style.backgroundImage = 'url(' + f + ')'; av.classList.add('tiene'); } });
    el.querySelector('#fPerfil').onchange = async (e) => { const f = e.target.files[0]; if (!f) return; try { const id = await CM.fotos.guardar(f, 320); const vieja = localStorage.getItem('cm:fotoPerfil'); localStorage.setItem('cm:fotoPerfil', id); if (vieja) CM.fotos.borrar(vieja); toast('Foto actualizada'); render(el); CM.pintarAvatar(); } catch (er) { toast(er.message); } };
    el.onclick = async (e) => {
      const b = e.target.closest('[data-act]'); if (!b) return; const a = b.dataset.act;
      try {
        if (a === 'foto') { el.querySelector('#fPerfil').click(); return; }
        if (a === 'avisos') { await CM.guardarPrefs({ insistir: el.querySelector('#v1').checked, cabeza: el.querySelector('#v2').checked, cabeza_h1: el.querySelector('#v3').value || '13:00', cabeza_h2: el.querySelector('#v4').value || '20:30', plan_semana: el.querySelector('#v5').checked }); toast('Avisos guardados'); return; }
        if (a === 'sec') { CM.ui.sub = b.dataset.s || null; CM.ir(b.dataset.v); }
        else if (a === 'aterrizar') CM.aterrizar();
        else if (a === 'col') { await CM.guardarPrefs({ color: b.dataset.c }); render(el); }
        else if (a === 'av') { await CM.guardarPrefs({ avatar: b.dataset.a }); render(el); }
        else if (a === 'tema') { await CM.guardarPrefs({ tema: b.dataset.t }); render(el); }
        else if (a === 'nom') { c.nombre = el.querySelector('#sN').value.trim() || c.nombre; await rpc('mi_perfil_guardar', { p_nombre: c.nombre, p_telefono: c.telefono }); toast('Guardado'); }
        else if (a === 'tour') CM.tour();
        else if (a === 'delck') { await CM.del(b.dataset.id); render(el); }
        else if (a === 'pro') pagar();
        else if (a === 'esp') espacioForm(CM.espacio(b.dataset.id));
        else if (a === 'nesp') espacioForm();
        else if (a === 'prefs') { await rpc('mi_perfil_guardar', { p_nombre: c.nombre, p_telefono: c.telefono, p_prefs: { limite_descanso_min: +el.querySelector('#p1').value || 60, pausa_cada: +el.querySelector('#p2').value || 0, cierre_noche: el.querySelector('#p3').checked } }); c.prefs = Object.assign({}, p, { limite_descanso_min: +el.querySelector('#p1').value || 60, pausa_cada: +el.querySelector('#p2').value || 0, cierre_noche: el.querySelector('#p3').checked }); toast('Guardado'); }
        else if (a === 'push') { await A.activarPush(); toast('Notificaciones activadas'); }
        else if (a === 'bajar') await descargarTodo();
        else if (a === 'depurar') { if (await A.confirmar('¿Borrar hábitos y tareas hechas con más de 90 días? Descarga tus datos antes.', 'Limpiar')) { const n = await rpc('mi_depurar', { p_dias: 90 }); toast(n + ' registros eliminados'); await CM.cargar(); CM.pintar(); } }
        else if (a === 'inst') { if (!(await A.pedirInstalar())) toast('Usa "Agregar a pantalla de inicio" en el menú del navegador'); }
        else if (a === 'salir') A.salir();
        else if (a === 'reparar') { if (await A.confirmar('Se vuelve a descargar la app en este teléfono. No se borra ningún dato.', 'Reparar')) A.repararApp(); }
        else if (a === 'borrar') { if (await A.confirmar('Se borran todas tus tareas, ideas y diario. No se puede deshacer.', 'Borrar todo')) { await rpc('mi_borrar_datos'); await CM.cargar(); toast('Datos borrados'); CM.pintar(); } }
        else if (a === 'cuenta') { if (await A.confirmar('Se elimina tu cuenta y todos tus datos para siempre.', 'Eliminar cuenta')) await A.borrarMiCuenta(); }
      } catch (er) { toast(er.message); }
    };
  }
  CM.mod.mas = { render };
})();
