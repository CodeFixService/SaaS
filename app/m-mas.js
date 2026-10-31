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
  // Pagar Pro: módulo común del núcleo (precios, link y transferencia se editan en el Centro de Mando → Pagos).
  const pagar = () => CFX_PAGOS.abrir({ rpc, alPagar: () => CM.pintar() });
  async function pintarVinc(el) {
    const cod = el.querySelector('#vCod'); if (!cod) return;
    try {
      const [c, V] = await Promise.all([rpc('vinculo_codigo'), CM.vinculos()]);
      cod.textContent = c;
      el.querySelector('#vL').innerHTML = V.length ? V.map((v) => '<div class="fila"><span class="tit grow">' + esc(v.nombre) + ' <span class="sub">' + esc(v.email) + '</span></span><button type="button" class="small ghost" data-act="desv" data-id="' + v.id + '" data-n="' + esc(v.nombre) + '">Desvincular</button></div>').join('')
        : 'Aún no te vinculas con nadie.';
    } catch (e) { el.querySelector('#vL').textContent = e.message; }
  }
  // ---------- Más: menú común del núcleo (CFX_MENU, lista + hoja desde abajo). Aquí solo qué dibuja cada opción y sus botones (data-act). ----------
  const okv = (v, d) => (v === undefined || v === null ? d : v);
  const H = {
    vinc: () => '<p class="sub" style="margin-top:0">Comparte pedidos, tareas y notas con alguien que trabaja contigo. Nadie ve lo tuyo hasta que se vinculan con un código.</p>' +
      '<p>Tu código: <b id="vCod">…</b> <button type="button" class="small ghost" data-act="vcopiar">Copiar</button></p>' +
      '<div style="display:flex;gap:8px;align-items:center"><input id="vIn" style="flex:1;min-width:0;margin:0" maxlength="12" placeholder="Código (ej. ANA-1234)" autocapitalize="characters"><button type="button" data-act="vincular" style="flex:none">Vincular</button></div>' +
      '<div id="vL" class="sub">Cargando…</div>',
    animo: () => {
      const ck = CM.items.filter((i) => i.tipo === 'diario' && i.datos && (i.datos.animo || i.datos.energia)).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
      return '<p class="sub" style="margin-top:0">Se borran solos a los 7 días.</p>' + (ck.length ? ck.map((i) => '<div class="fila"><span class="grow">' + A.fCorta(i.fecha) + ' · ' + (CM.ANIMO[i.datos.animo || 0][0] || '') + ' ' + (CM.ENERGIA[i.datos.energia || 0][0] || '') + '</span><button type="button" class="x" data-act="delck" data-id="' + i.id + '" aria-label="Borrar">' + CM.ico('basura', 15) + '</button></div>').join('') : '<p class="sub">Sin registros manuales. El ánimo se calcula solo.</p>');
    },
    espacios: () => CM.espacios.filter((e) => !e.archivado).map((e) => '<div class="fila"><i class="dot" style="background:' + esc(e.color) + '"></i><span>' + esc(e.nombre) + ' <span class="sub">' + (e.modo === 'trabajo' ? 'trabajo ' + esc((e.horario || {}).desde || '') + '–' + esc((e.horario || {}).hasta || '') : 'personal') + '</span></span><button type="button" class="x" data-act="esp" data-id="' + e.id + '" aria-label="Editar">' + CM.ico('lapiz', 16) + '</button></div>').join('') +
      '<button type="button" class="small ghost" data-act="nesp">+ Espacio</button>',
    avisos: () => { const p = CM.cuenta.prefs || {}; return '<label class="chk2"><input id="v1" type="checkbox"' + (p.insistir === false ? '' : ' checked') + '> Insistir si no tacho algo con hora (a los 15 min y a la hora)</label>' +
      '<label class="chk2"><input id="v2" type="checkbox"' + (p.cabeza === false ? '' : ' checked') + '> Preguntarme "¿Algo que anotar?" 2 veces al día</label>' +
      '<div class="dos"><label>1ª vez<input id="v3" type="time" value="' + esc(p.cabeza_h1 || '13:00') + '"></label><label>2ª vez<input id="v4" type="time" value="' + esc(p.cabeza_h2 || '20:30') + '"></label></div>' +
      '<label class="chk2"><input id="v5" type="checkbox"' + (p.plan_semana === false ? '' : ' checked') + '> Plan de la semana (domingo 20:00)</label>' +
      '<p class="sub">Siempre: lo de mañana a las 08:00 del día antes y lo de hoy 1 hora antes. Desde la notificación puedes tocar <b>Listo</b> o <b>1 hora más</b>.</p>' +
      '<button type="button" data-act="avisos">Guardar avisos</button>'; },
    descanso: () => { const p = CM.cuenta.prefs || {}; return '<label>Aviso si usas la app fuera de horario más de (min/día)<input id="p1" type="number" min="10" max="600" value="' + okv(p.limite_descanso_min, 60) + '"></label><label>Recordarme pausar cada (min)<input id="p2" type="number" min="0" max="180" value="' + okv(p.pausa_cada, 50) + '"></label>' +
      '<label class="chk2"><input id="p3" type="checkbox"' + (p.cierre_noche === false ? '' : ' checked') + '> Aviso de cierre del día</label><button type="button" data-act="prefs">Guardar</button><p class="sub">Solo mido el tiempo dentro de esta app, no el uso total del teléfono.</p>'; },
    datos: () => { const lim = uso ? uso.limite_items : 0, pc = uso && lim ? Math.min(100, Math.round(uso.items / lim * 100)) : 0;
      return (uso ? '<div class="barra"><i style="width:' + pc + '%"></i></div><p class="sub">' + uso.items + ' de ' + lim + ' registros · ' + mb(uso.bytes) + '</p>' : '') +
        '<div style="display:flex;flex-wrap:wrap;gap:10px;margin:8px 0"><button type="button" class="small ghost" data-act="bajar">' + CM.ico('bajar', 15) + ' Descargar mis datos</button><button type="button" class="small ghost" data-act="depurar">Limpiar antiguos</button></div><p class="sub">Descarga primero; limpiar borra hábitos y tareas hechas con más de 90 días.</p>' +
        '<div class="card peligro" style="margin-top:14px"><h3>Zona de riesgo</h3><button type="button" class="small ghost" data-act="borrar">Borrar todos mis datos</button></div>'; }
  };
  // Dibuja una opción en su hoja (z) y le da sus botones; volver a dibujar = mismo z (la hoja no se cierra).
  function hojaDe(k) {
    return (z) => {
      z.innerHTML = H[k]();
      if (k === 'vinc') pintarVinc(z);
      z.onclick = (e) => acciones(e, z, () => hojaDe(k)(z));
    };
  }
  async function acciones(e, z, redibujar) {
    const b = e.target.closest('[data-act]'); if (!b) return; const a = b.dataset.act, c = CM.cuenta, p = c.prefs || {};
    try {
      if (a === 'avisos') { await CM.guardarPrefs({ insistir: z.querySelector('#v1').checked, cabeza: z.querySelector('#v2').checked, cabeza_h1: z.querySelector('#v3').value || '13:00', cabeza_h2: z.querySelector('#v4').value || '20:30', plan_semana: z.querySelector('#v5').checked }); toast('Avisos guardados'); }
      else if (a === 'vcopiar') { await navigator.clipboard.writeText(z.querySelector('#vCod').textContent); toast('Código copiado'); }
      else if (a === 'vincular') { const r = await rpc('vincular', { p_codigo: z.querySelector('#vIn').value }); toast('Vinculado con ' + r.nombre); await CM.vinculos(true); pintarVinc(z); }
      else if (a === 'desv') { if (await A.confirmar('¿Desvincular a ' + b.dataset.n + '? Dejan de ver lo que se compartieron.', 'Desvincular')) { await rpc('desvincular', { p_otro: b.dataset.id }); await CM.vinculos(true); await CM.cargar(); pintarVinc(z); } }
      else if (a === 'delck') { await CM.del(b.dataset.id); redibujar(); }
      else if (a === 'esp') espacioForm(CM.espacio(b.dataset.id));
      else if (a === 'nesp') espacioForm();
      else if (a === 'prefs') { const n = { limite_descanso_min: +z.querySelector('#p1').value || 60, pausa_cada: +z.querySelector('#p2').value || 0, cierre_noche: z.querySelector('#p3').checked }; await rpc('mi_perfil_guardar', { p_nombre: c.nombre, p_telefono: c.telefono, p_prefs: n }); c.prefs = Object.assign({}, p, n); toast('Guardado'); }
      else if (a === 'bajar') await descargarTodo();
      else if (a === 'depurar') { if (await A.confirmar('¿Borrar hábitos y tareas hechas con más de 90 días? Descarga tus datos antes.', 'Limpiar')) { const n = await rpc('mi_depurar', { p_dias: 90 }); toast(n + ' registros eliminados'); await CM.cargar(); try { uso = await rpc('mi_uso'); } catch (er) { /* sigue */ } redibujar(); } }
      else if (a === 'borrar') { if (await A.confirmar('Se borran todas tus tareas, ideas y diario. No se puede deshacer.', 'Borrar todo')) { await rpc('mi_borrar_datos'); await CM.cargar(); toast('Datos borrados'); redibujar(); } }
    } catch (er) { toast(er.message); }
  }
  async function render(el) {
    const c = CM.cuenta;
    if (!el.querySelector('#menuMas')) el.innerHTML = '<div class="titulo-v"><h2>Más</h2></div><div id="menuMas"></div>';
    try { [uso, pago] = await Promise.all([rpc('mi_uso'), rpc('cfx_pago_estado').then((e) => e.ultimo)]); } catch (e) { /* sigue */ }
    const hasta = c.premium_hasta ? A.fCorta(c.premium_hasta.slice(0, 10)) : '', usuario = c.rol === 'usuario';
    const ir = (v, s) => () => { CM.ui.sub = s || null; CM.ir(v); };
    const SEC = [['panel', '', 'panel', 'Panel'], ['metas', '', 'metas', 'Metas'], ['cerebro', 'notas', 'libro', 'Notas'], ['cerebro', 'ideas', 'cerebro', 'Ideas'], ['cerebro', 'problemas', 'alerta', 'Problemas'],
      ['cerebro', 'diario', 'luna', 'Diario'], ['cerebro', 'logros', 'estrella', 'Logros']];
    const items = SEC.map((x) => ({ k: 'sec-' + (x[1] || x[0]), ico: CM.ico(x[2], 20), t: x[3], grupo: 'Secciones', accion: ir(x[0], x[1]) })).concat([
      { k: 'aterrizar', ico: CM.ico('ancla', 20), t: 'Aterrizar', grupo: 'Secciones', accion: () => CM.aterrizar() },
      { k: 'buscar', ico: CM.ico('lupa', 20), t: 'Buscar', grupo: 'Secciones', accion: () => CM.buscar() },
      { k: 'premium', ico: CM.ico('estrella', 20), t: c.rol === 'admin' ? 'Administrador' : c.rol === 'socio' ? 'Socio' : c.premium ? 'Plan Pro' : 'Pasar a Pro', grupo: 'Tu plan',
        d: c.premium && hasta ? 'Hasta el ' + hasta : usuario && pago && pago.estado === 'pendiente' ? 'Pago en revisión' : '', dato: usuario ? (c.premium ? 'PRO' : 'Gratis') : '', accion: usuario ? pagar : () => {} },
      usuario && { k: 'verif', ico: '🪪', t: 'Verificar identidad', grupo: 'Tu plan', accion: () => CFX_VERIFICAR.abrir({ rpc }) },
      !usuario && { k: 'panel', ico: '🛡️', t: 'Panel de administración', grupo: 'Tu plan', ir: '../admin/' },
      { k: 'tour', ico: '🧭', t: 'Ver guía', grupo: 'Tu plan', accion: () => CM.tour() },
      { k: 'vinc', ico: CM.ico('compartir', 20), t: 'Cuentas vinculadas', d: 'Comparte con quien trabaja contigo', grupo: 'Configuración', abrir: hojaDe('vinc') },
      { k: 'espacios', ico: '🗂️', t: 'Espacios', d: 'Personal y trabajo con horario', grupo: 'Configuración', abrir: hojaDe('espacios') },
      { k: 'avisos', ico: CM.ico('bell', 20), t: 'Avisos para no olvidar nada', grupo: 'Configuración', abrir: hojaDe('avisos') },
      { k: 'descanso', ico: '🌙', t: 'Descanso', d: 'Límite fuera de horario y pausas', grupo: 'Configuración', abrir: hojaDe('descanso') },
      { k: 'animo', ico: '🙂', t: 'Registros de ánimo', grupo: 'Configuración', abrir: hojaDe('animo') },
      { k: 'datos', ico: CM.ico('bajar', 20), t: 'Mis datos y espacio', d: uso ? uso.items + ' de ' + uso.limite_items + ' registros' : '', grupo: 'Configuración', abrir: hojaDe('datos') },
      A.pedirInstalar && { k: 'inst', ico: '📲', t: 'Instalar en el teléfono', grupo: 'Cuenta y ayuda', accion: async () => { if (!(await A.pedirInstalar())) toast('Usa "Agregar a pantalla de inicio" en el menú del navegador'); } },
      { k: 'reparar', ico: '🛠️', t: 'Reparar la app', d: 'No borra tus datos', dato: 'v' + BT_CONFIG.VERSION, grupo: 'Cuenta y ayuda', accion: async () => { if (await A.confirmar('Se vuelve a descargar la app en este teléfono. No se borra ningún dato.', 'Reparar')) A.repararApp(); } }
    ]);
    window.CFX_MENU.montar(el.querySelector('#menuMas'), items);
  }
  CM.mod.mas = { render };
})();
