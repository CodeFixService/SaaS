/* Centro de Mando · núcleo de la app: datos, utilidades, íconos, ficha de edición,
   latido de uso (trabajo/descanso) y Aterrizaje. Cada módulo se carga solo al abrirlo. */
(function (global) {
  'use strict';
  const A = global.App, sb = A.sb;
  const { esc, q, toast, modal, hoy, iso, sumarDias, fechaDe } = A;
  const CM = global.CM = { items: [], espacios: [], uso: [], mod: {}, ui: { esp: 'todo' }, cuenta: null, estadoUso: null };
  const pad = (n) => String(n).padStart(2, '0');

  /* ---------- Íconos (SVG en línea, sin imágenes) ---------- */
  const IC = {
    hoy: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    tablero: '<rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="10" rx="1.5"/><rect x="17" y="4" width="4" height="6" rx="1.5"/>',
    metas: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    cerebro: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>',
    panel: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
    mas: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21a2 2 0 0 0 4 0"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
    izq: '<path d="M15 5l-7 7 7 7"/>', der: '<path d="M9 5l7 7-7 7"/>',
    fuego: '<path d="M12 22c4 0 7-2.8 7-7 0-3.5-2.4-5.6-4-8-.5 2-1.8 3-3 3 0-3-1.5-5-3-6-.5 4-4 6.5-4 11 0 4.2 3 7 7 7z"/>',
    luna: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z"/>',
    maletin: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>',
    casa: '<path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>',
    ancla: '<circle cx="12" cy="5" r="2"/><path d="M12 7v14M5 12H3a9 9 0 0 0 18 0h-2M8 11h8"/>',
    basura: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    lapiz: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    bajar: '<path d="M12 4v12M7 11l5 5 5-5M5 20h14"/>',
    alerta: '<path d="M12 3l10 18H2zM12 10v5M12 18v.5"/>',
    estrella: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    chispa: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
    libro: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19a2 2 0 0 1 2-2h13"/>',
    nube: '<path d="M7 18a4 4 0 0 1-.6-8A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9z"/>',
    rayo: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>', flecha: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    usuario: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>', ojo: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'
  };
  CM.ico = (n, s) => '<svg class="ic" width="' + (s || 20) + '" height="' + (s || 20) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (IC[n] || '') + '</svg>';

  /* ---------- Datos ---------- */
  const DEF = { idea: 'nueva', tarea: 'abierto', proyecto: 'abierto' };
  CM.pad = pad;
  CM.get = (id) => CM.items.find((i) => i.id === id);
  CM.por = (tipo) => CM.items.filter((i) => i.tipo === tipo);
  CM.hijos = (id, tipo) => CM.items.filter((i) => i.padre === id && (!tipo || i.tipo === tipo));
  CM.espacio = (id) => CM.espacios.find((e) => e.id === id);
  CM.enEsp = (i) => CM.ui.esp === 'todo' || i.espacio_id === CM.ui.esp;
  CM.diaDe = (t) => t ? iso(new Date(t)) : '';
  CM.ultimosDias = (n) => { const r = []; for (let k = n - 1; k >= 0; k--) r.push(sumarDias(hoy(), -k)); return r; };
  // Día en que se cumplió algo (los días de hábito usan su propia fecha).
  CM.diaHecho = (i) => i.tipo === 'check' ? (i.fecha || '') : CM.diaDe(i.hecho_at);
  CM.completados = (desde, hasta) => CM.items.filter((i) => i.hecho_at && (i.tipo === 'tarea' || i.tipo === 'check') && CM.diaHecho(i) >= desde && CM.diaHecho(i) <= hasta);

  CM.cargar = async () => {
    const desde = sumarDias(hoy(), -45);
    const r = await Promise.all([
      q(sb.from('items').select('*').order('created_at', { ascending: true }).limit(5000)),
      q(sb.from('espacios').select('*').order('orden')),
      q(sb.from('uso_dia').select('*').gte('dia', desde))
    ]);
    CM.items = r[0]; CM.espacios = r[1]; CM.uso = r[2]; CM.sync = Date.now();
  };
  CM.emit = () => { cancelAnimationFrame(CM._raf); CM._raf = requestAnimationFrame(() => { if (CM.pintar) CM.pintar(); }); };
  CM.add = async (tipo, o) => {
    const row = Object.assign({ tipo, titulo: '', estado: DEF[tipo] || 'abierto' }, o || {});
    if (row.espacio_id === undefined && CM.ui.esp !== 'todo') row.espacio_id = CM.ui.esp;
    const { data, error } = await sb.from('items').insert(row).select().single();
    if (error) throw new Error(A.friendly(error));
    CM.items.push(data); CM.emit(); return data;
  };
  CM.upd = async (id, campos) => {
    const it = CM.get(id); if (!it) return;
    const prev = Object.assign({}, it);
    Object.assign(it, campos);
    if (campos.estado) it.hecho_at = ['hecho', 'resuelto', 'lograda', 'descartada'].includes(campos.estado) ? new Date().toISOString() : null;
    it.updated_at = new Date().toISOString();
    CM.emit();
    const { error } = await sb.from('items').update(campos).eq('id', id);
    if (error) { Object.assign(it, prev); CM.emit(); throw new Error(A.friendly(error)); }
  };
  CM.datos = (id, parcial) => { const it = CM.get(id); return CM.upd(id, { datos: Object.assign({}, it.datos, parcial) }); };
  CM.del = async (id) => {
    const quitar = new Set([id]);
    let cambio = true;
    while (cambio) { cambio = false; CM.items.forEach((i) => { if (i.padre && quitar.has(i.padre) && !quitar.has(i.id)) { quitar.add(i.id); cambio = true; } }); }
    CM.items = CM.items.filter((i) => !quitar.has(i.id)); CM.emit();
    const { error } = await sb.from('items').delete().eq('id', id);
    if (error) { toast(A.friendly(error)); await CM.cargar(); CM.emit(); }
  };
  const esps = () => CM.espacios.filter((e) => !e.archivado);

  /* ---------- Contexto: ¿trabajo o descanso? ---------- */
  CM.ahoraTrabajo = () => {
    const d = new Date(), dow = d.getDay() || 7, hm = pad(d.getHours()) + ':' + pad(d.getMinutes());
    return esps().find((e) => e.modo === 'trabajo' && e.horario && (e.horario.dias || []).includes(dow) && hm >= (e.horario.desde || '99') && hm < (e.horario.hasta || '00')) || null;
  };
  CM.racha = () => {
    const dias = new Set(CM.items.filter((i) => i.hecho_at && (i.tipo === 'tarea' || i.tipo === 'check')).map(CM.diaHecho));
    let d = hoy(), n = 0;
    if (!dias.has(d)) d = sumarDias(d, -1);
    while (dias.has(d)) { n++; d = sumarDias(d, -1); }
    return n;
  };
  /* Hábitos, metas e ideas */
  CM.diasHabito = (h) => (h.datos && h.datos.dias) || [1, 2, 3, 4, 5, 6, 7];
  CM.programado = (h, dia) => CM.diasHabito(h).includes(fechaDe(dia).getDay() || 7);
  CM.cumplido = (h, dia) => CM.items.some((c) => c.tipo === 'check' && c.padre === h.id && c.fecha === dia);
  CM.rachaHabito = (h) => {
    let d = hoy(), n = 0;
    if (CM.programado(h, d) && !CM.cumplido(h, d)) d = sumarDias(d, -1);
    for (let g = 0; g < 400; g++) { if (CM.programado(h, d)) { if (CM.cumplido(h, d)) n++; else break; } d = sumarDias(d, -1); }
    return n;
  };
  CM.toggleHabito = async (h, dia) => {
    const c = CM.items.find((x) => x.tipo === 'check' && x.padre === h.id && x.fecha === dia);
    if (c) await CM.del(c.id); else await CM.add('check', { padre: h.id, fecha: dia, estado: 'hecho', espacio_id: h.espacio_id });
  };
  CM.progresoMeta = (m) => {
    const p = [];
    CM.hijos(m.id, 'resultado').forEach((r) => { const o = Number(r.datos.objetivo) || 0; if (o > 0) p.push(Math.min(1, (Number(r.datos.actual) || 0) / o)); });
    const t = CM.hijos(m.id, 'tarea'); if (t.length) p.push(t.filter((x) => x.estado === 'hecho').length / t.length);
    return p.length ? p.reduce((a, b) => a + b, 0) / p.length : (m.estado === 'lograda' ? 1 : 0);
  };
  CM.ritmoMeta = (m) => {
    const fin = m.datos && m.datos.fin; if (!fin) return null;
    const ini = CM.diaDe(m.created_at), tot = (fechaDe(fin) - fechaDe(ini)) / 864e5, tr = (fechaDe(hoy()) - fechaDe(ini)) / 864e5;
    if (tot <= 0) return null;
    return { esperado: Math.min(1, Math.max(0, tr / tot)), vencida: hoy() > fin };
  };
  CM.scoreIdea = (i) => { const d = i.datos || {}; return Math.round(((d.impacto || 3) * (d.ganas || 3) / (d.esfuerzo || 3)) * 10) / 10; };
  CM.minTxt = (m) => m >= 60 ? Math.floor(m / 60) + ' h ' + (m % 60 ? (m % 60) + ' min' : '') : m + ' min';

  /* ---------- Ficha de edición (sirve para todos los tipos) ---------- */
  const NOMBRE = { tarea: 'Tarea', proyecto: 'Proyecto', meta: 'Meta', resultado: 'Resultado clave', habito: 'Hábito', idea: 'Idea', problema: 'Problema',
    solucion: 'Solución', nota: 'Nota', diario: 'Diario', logro: 'Logro', leccion: 'Lección', recordatorio: 'Recordatorio' };
  CM.nombre = NOMBRE;
  const CAMPOS = {
    tarea: ['titulo', 'cuerpo', 'fecha', 'prioridad', 'espacio', 'estado'], proyecto: ['titulo', 'cuerpo', 'fecha', 'espacio', 'estado', 'donde'],
    meta: ['titulo', 'cuerpo', 'espacio', 'periodo', 'fin', 'estado'], resultado: ['titulo', 'objetivo', 'actual', 'unidad'],
    habito: ['titulo', 'espacio', 'dias'], idea: ['titulo', 'cuerpo', 'espacio', 'impacto', 'ganas', 'esfuerzo', 'estado'],
    problema: ['titulo', 'cuerpo', 'espacio', 'estado'], solucion: ['titulo', 'cuerpo'], nota: ['titulo', 'cuerpo', 'espacio', 'etiquetas'],
    logro: ['titulo', 'cuerpo', 'fecha', 'espacio'], leccion: ['titulo', 'cuerpo'], recordatorio: ['titulo', 'cuerpo', 'aviso', 'repite']
  };
  const ESTADOS = {
    tarea: [['abierto', 'Por hacer'], ['en_curso', 'En curso'], ['hecho', 'Hecho']], proyecto: [['abierto', 'Por hacer'], ['en_curso', 'En curso'], ['hecho', 'Hecho']],
    meta: [['abierto', 'Activa'], ['lograda', 'Lograda'], ['descartada', 'Descartada']], idea: [['nueva', 'Nueva'], ['elegida', 'Elegida'], ['descartada', 'Descartada']],
    problema: [['abierto', 'Abierto'], ['resuelto', 'Resuelto']]
  };
  CM.ESTADOS = ESTADOS;
  const HIJOS = { tarea: ['tarea'], proyecto: ['tarea'], meta: ['resultado', 'tarea'], problema: ['solucion'] };
  const num = (v) => { const n = Number(String(v).replace(',', '.')); return isFinite(n) ? n : 0; };
  const sel = (id, ops, v) => '<select id="' + id + '">' + ops.map((o) => '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(v) ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select>';
  const escala = (id, v) => sel(id, [1, 2, 3, 4, 5].map((n) => [n, String(n)]), v || 3);
  const localISO = (t) => { if (!t) return ''; const d = new Date(t); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()); };

  // Abre la ficha: existente (id) o nueva (tipo + valores iniciales).
  CM.ficha = function (id, tipo, ini) {
    const it = id ? CM.get(id) : null;
    tipo = it ? it.tipo : tipo;
    const o = it || Object.assign({ tipo, titulo: '', cuerpo: '', estado: DEF[tipo] || 'abierto', prioridad: 0, fecha: null, repite: '', etiquetas: [], datos: {}, aviso_at: null }, ini || {});
    const dt = o.datos || {};
    const f = CAMPOS[tipo] || ['titulo', 'cuerpo'];
    let h = '<h2>' + (it ? 'Editar' : 'Nuevo') + ' · ' + esc(NOMBRE[tipo] || tipo) + '</h2>';
    h += '<label for="fTit">' + (tipo === 'nota' || tipo === 'idea' || tipo === 'problema' ? 'Título' : 'Qué es') + '</label><input id="fTit" maxlength="200" value="' + esc(o.titulo) + '">';
    if (f.includes('cuerpo')) h += '<label for="fCue">Detalle</label><textarea id="fCue" maxlength="4000">' + esc(o.cuerpo) + '</textarea>';
    h += '<div class="row">';
    if (f.includes('estado') && ESTADOS[tipo]) h += '<div><label for="fEst">Estado</label>' + sel('fEst', ESTADOS[tipo], o.estado) + '</div>';
    if (f.includes('prioridad')) h += '<div><label for="fPri">Prioridad</label>' + sel('fPri', [[0, 'Normal'], [1, 'Importante'], [2, 'Urgente'], [3, 'Top del día']], o.prioridad) + '</div>';
    if (f.includes('fecha')) h += '<div><label for="fFec">Fecha</label><input id="fFec" type="date" value="' + esc(o.fecha || '') + '"></div>';
    if (f.includes('espacio')) h += '<div><label for="fEsp">Espacio</label>' + sel('fEsp', [['', 'Sin espacio']].concat(esps().map((e) => [e.id, e.nombre])), o.espacio_id || '') + '</div>';
    h += '</div>';
    if (f.includes('donde')) h += '<label for="fDon">Dónde quedé (para retomar sin perderte)</label><input id="fDon" maxlength="200" value="' + esc(dt.donde || '') + '" placeholder="Ej: falta conectar el pago">';
    if (f.includes('periodo')) h += '<div class="row"><div><label for="fPer">Periodo</label>' + sel('fPer', [['semana', 'Semana'], ['mes', 'Mes'], ['trimestre', 'Trimestre'], ['anio', 'Año']], dt.periodo || 'mes') + '</div><div><label for="fFin">Fecha límite</label><input id="fFin" type="date" value="' + esc(dt.fin || '') + '"></div></div>';
    if (f.includes('objetivo')) h += '<div class="row"><div><label for="fObj">Objetivo (número)</label><input id="fObj" inputmode="decimal" value="' + esc(dt.objetivo == null ? '' : dt.objetivo) + '"></div><div><label for="fAct">Llevo</label><input id="fAct" inputmode="decimal" value="' + esc(dt.actual == null ? 0 : dt.actual) + '"></div><div><label for="fUni">Unidad</label><input id="fUni" maxlength="20" value="' + esc(dt.unidad || '') + '" placeholder="clientes, kg, h…"></div></div>';
    if (f.includes('dias')) { const dias = dt.dias || [1, 2, 3, 4, 5, 6, 7]; h += '<label>Días</label><div class="chips" id="fDias">' + [1, 2, 3, 4, 5, 6, 7].map((n) => '<button type="button" class="chip' + (dias.includes(n) ? ' on' : '') + '" data-d="' + n + '">' + A.DIAS[n % 7] + '</button>').join('') + '</div>'; }
    if (f.includes('impacto')) h += '<div class="row"><div><label for="fImp">Impacto (1-5)</label>' + escala('fImp', dt.impacto) + '</div><div><label for="fGan">Ganas (1-5)</label>' + escala('fGan', dt.ganas) + '</div><div><label for="fEsf">Esfuerzo (1-5)</label>' + escala('fEsf', dt.esfuerzo) + '</div></div>';
    if (f.includes('etiquetas')) h += '<label for="fEti">Etiquetas (separadas por coma)</label><input id="fEti" maxlength="120" value="' + esc((o.etiquetas || []).join(', ')) + '">';
    if (f.includes('aviso')) h += '<div class="row"><div><label for="fAvi">Avisar el</label><input id="fAvi" type="datetime-local" value="' + localISO(o.aviso_at) + '"></div><div><label for="fRep">Repetir</label>' + sel('fRep', [['', 'No repetir'], ['diario', 'Cada día'], ['semanal', 'Cada semana'], ['mensual', 'Cada mes']], o.repite) + '</div></div>';
    if (it && HIJOS[tipo]) {
      h += '<div class="hijos" id="fHijos"></div>';
    }
    h += '<p class="err" id="fErr"></p><div class="btns">' + (it ? '<button class="danger" id="fDel" type="button">' + CM.ico('basura', 16) + ' Borrar</button>' : '') + '<button class="ghost" data-cerrar type="button">Cancelar</button><button id="fOk" type="button">Guardar</button></div>';
    const d = modal(h, (dlg) => {
      const $$ = (x) => dlg.querySelector('#' + x);
      if (it && HIJOS[tipo]) pintarHijos(dlg, it);
      const ch = $$('fDias'); if (ch) ch.onclick = (e) => { const b = e.target.closest('[data-d]'); if (b) b.classList.toggle('on'); };
      if (it) $$('fDel').onclick = async () => { if (await A.confirmar('¿Borrar "' + (it.titulo || NOMBRE[tipo]) + '" y lo que depende de él?', 'Sí, borrar')) { dlg.close(); CM.del(it.id); } };
      $$('fOk').onclick = async () => {
        const v = (x) => { const e = $$(x); return e ? e.value : undefined; };
        const campos = {};
        const titulo = (v('fTit') || '').trim();
        if (!titulo && tipo !== 'nota') { $$('fErr').textContent = 'Escribe un título'; return; }
        campos.titulo = titulo;
        if (v('fCue') !== undefined) campos.cuerpo = v('fCue');
        if (v('fEst') !== undefined) campos.estado = v('fEst');
        if (v('fPri') !== undefined) campos.prioridad = Number(v('fPri'));
        if (v('fFec') !== undefined) campos.fecha = v('fFec') || null;
        if (v('fEsp') !== undefined) campos.espacio_id = v('fEsp') || null;
        if (v('fEti') !== undefined) campos.etiquetas = v('fEti').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 8);
        if (v('fAvi') !== undefined) { campos.aviso_at = v('fAvi') ? new Date(v('fAvi')).toISOString() : null; campos.repite = v('fRep') || ''; }
        const nd = Object.assign({}, dt);
        if (v('fDon') !== undefined) nd.donde = v('fDon').trim();
        if (v('fPer') !== undefined) { nd.periodo = v('fPer'); nd.fin = v('fFin') || ''; }
        if (v('fObj') !== undefined) { nd.objetivo = num(v('fObj')); nd.actual = num(v('fAct')); nd.unidad = v('fUni').trim(); }
        if (v('fImp') !== undefined) { nd.impacto = Number(v('fImp')); nd.ganas = Number(v('fGan')); nd.esfuerzo = Number(v('fEsf')); }
        if (ch) nd.dias = Array.from(ch.querySelectorAll('.on')).map((b) => Number(b.dataset.d));
        campos.datos = nd;
        try {
          if (it) await CM.upd(it.id, campos); else await CM.add(tipo, Object.assign({}, ini || {}, campos));
          dlg.close(); toast('Guardado');
        } catch (e) { $$('fErr').textContent = e.message; }
      };
      const t = $$('fTit'); if (t && !it) t.focus();
    });
    return d;
  };
  function pintarHijos(dlg, it) {
    const cont = dlg.querySelector('#fHijos'); if (!cont) return;
    const tipos = HIJOS[it.tipo];
    const lista = CM.items.filter((i) => i.padre === it.id && tipos.includes(i.tipo));
    cont.innerHTML = '<h3>' + (it.tipo === 'problema' ? 'Soluciones probadas o posibles' : it.tipo === 'meta' ? 'Resultados y tareas de esta meta' : 'Pasos') + '</h3>' +
      lista.map((h) => '<div class="fila"><button type="button" class="chk' + (h.hecho_at ? ' on' : '') + '" data-h="' + h.id + '" aria-label="Marcar">' + (h.hecho_at ? CM.ico('check', 14) : '') + '</button><span class="grow">' + esc(h.titulo) +
        (h.tipo === 'resultado' ? ' <small class="muted">' + esc((h.datos.actual || 0) + '/' + (h.datos.objetivo || 0) + ' ' + (h.datos.unidad || '')) + '</small>' : '') + '</span><button type="button" class="x" data-x="' + h.id + '" aria-label="Quitar">' + CM.ico('x', 14) + '</button></div>').join('') +
      '<div class="row" style="margin-top:8px"><input id="hNuevo" placeholder="Agregar…" maxlength="200">' + (tipos.length > 1 ? sel('hTipo', tipos.map((t) => [t, NOMBRE[t]]), tipos[0]) : '') + '<button type="button" class="small" id="hAdd">Agregar</button></div>';
    cont.onclick = async (e) => {
      const b = e.target.closest('[data-h]'), x = e.target.closest('[data-x]');
      if (b) { const h = CM.get(b.dataset.h); await CM.upd(h.id, { estado: h.hecho_at ? 'abierto' : (h.tipo === 'solucion' ? 'resuelto' : 'hecho') }); pintarHijos(dlg, it); }
      else if (x) { await CM.del(x.dataset.x); pintarHijos(dlg, it); }
      else if (e.target.id === 'hAdd') {
        const t = dlg.querySelector('#hNuevo').value.trim(); if (!t) return;
        const tp = dlg.querySelector('#hTipo') ? dlg.querySelector('#hTipo').value : tipos[0];
        await CM.add(tp, { titulo: t, padre: it.id, espacio_id: it.espacio_id, datos: tp === 'resultado' ? { objetivo: 1, actual: 0, unidad: '' } : {} });
        pintarHijos(dlg, it); const n = dlg.querySelector('#hNuevo'); if (n) n.focus();
      }
    };
    const n = cont.querySelector('#hNuevo'); if (n) n.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); cont.querySelector('#hAdd').click(); } };
  }

  /* ---------- Aterrizaje (anti-agobio, 5 minutos) ---------- */
  CM.aterrizar = function () {
    let paso = 1, lineas = [], pick = '', left = 25 * 60, corre = false, tid = null;
    try { A.rpc('uso_evento', { p_tipo: 'aterrizaje', p_min: 0 }).catch(() => {}); } catch (e) { /* sin red */ }
    const d = document.createElement('dialog'); d.className = 'aterrizaje'; document.body.appendChild(d);
    const cerrar = () => { clearInterval(tid); d.close(); setTimeout(() => d.remove(), 60); };
    function dibujar() {
      let h = '<div class="card">';
      h += '<div class="pasos">' + [1, 2, 3].map((n) => '<i class="' + (n <= paso ? 'on' : '') + '"></i>').join('') + '</div>';
      if (paso === 1) {
        h += '<h2>1 · Vuelca todo</h2><p class="muted">Escribe todo lo que tienes en la cabeza, una cosa por línea. No ordenes, no juzgues.</p><textarea id="aTa" rows="8" placeholder="Llamar a Pedro&#10;Terminar el reel&#10;Pagar la cuenta de luz&#10;…">' + esc(lineas.join('\n')) + '</textarea>' +
          '<div class="btns"><button class="ghost" id="aNo" type="button">Cancelar</button><button id="aSig" type="button">Siguiente</button></div>';
      } else if (paso === 2) {
        h += '<h2>2 · Elige UNA</h2><p class="muted">La que más destraba el resto o la que puedes terminar hoy. Lo demás se guarda en tu bandeja de ideas, nada se pierde.</p>' +
          lineas.map((l, i) => '<button class="opt" type="button" data-i="' + i + '">' + esc(l) + '</button>').join('');
      } else {
        h += '<h2>3 · Solo esto</h2><p class="foco">' + esc(pick) + '</p><div class="reloj" id="aRel">' + pad(Math.floor(left / 60)) + ':' + pad(left % 60) + '</div>' +
          '<div class="btns"><button id="aGo" type="button">' + (corre ? 'Pausar' : 'Empezar 25 min') + '</button><button class="ghost" id="aFin" type="button">Listo, cerrar</button></div>' +
          '<p class="muted">Al cerrar, esto queda como tu prioridad de hoy. Si te trabas, escribe solo el primer paso de 2 minutos.</p>';
      }
      d.innerHTML = h + '</div>';
      const $$ = (x) => d.querySelector(x);
      if ($$('#aNo')) $$('#aNo').onclick = cerrar;
      if ($$('#aSig')) $$('#aSig').onclick = () => { lineas = $$('#aTa').value.split('\n').map((s) => s.trim()).filter(Boolean); if (!lineas.length) { toast('Escribe al menos una cosa'); return; } paso = 2; dibujar(); };
      d.querySelectorAll('.opt').forEach((b) => { b.onclick = () => { pick = lineas[Number(b.dataset.i)]; paso = 3; dibujar(); }; });
      if ($$('#aGo')) $$('#aGo').onclick = () => {
        corre = !corre; clearInterval(tid);
        if (corre) tid = setInterval(() => { left = Math.max(0, left - 1); const r = $$('#aRel'); if (r) r.textContent = pad(Math.floor(left / 60)) + ':' + pad(left % 60); if (!left) { clearInterval(tid); corre = false; toast('Se acabó el tiempo. Respira.'); dibujar(); } }, 1000);
        dibujar();
      };
      if ($$('#aFin')) $$('#aFin').onclick = async () => {
        const usados = Math.round((25 * 60 - left) / 60);
        clearInterval(tid);
        try {
          await CM.add('tarea', { titulo: pick, fecha: hoy(), prioridad: 3 });
          for (const r of lineas.filter((l) => l !== pick)) await CM.add('idea', { titulo: r, datos: { impacto: 3, ganas: 3, esfuerzo: 3 } });
          if (usados > 0) A.rpc('uso_evento', { p_tipo: 'foco', p_min: usados }).catch(() => {});
        } catch (e) { toast(e.message); }
        cerrar(); toast('Listo. Una cosa a la vez.'); CM.ir('hoy');
      };
    }
    d.addEventListener('click', (e) => { if (e.target === d) cerrar(); });
    dibujar(); d.showModal();
  };

  /* ---------- Latido de uso: tiempo en la app (trabajo / descanso) ---------- */
  CM.chip = () => {
    const c = document.getElementById('chipModo'); if (!c) return;
    const e = CM.ahoraTrabajo();
    c.className = 'chip-modo ' + (e ? 'trab' : 'desc');
    c.innerHTML = CM.ico(e ? 'maletin' : 'luna', 15) + '<span>' + (e ? esc(e.nombre) : 'Descanso') + '</span>';
    c.title = e ? 'En horario de trabajo hasta las ' + e.horario.hasta : 'Fuera de tu horario de trabajo';
  };
  CM.seguidos = 0;
  async function latido() {
    if (document.hidden) { CM.seguidos = 0; return; }
    CM.seguidos++;
    try {
      const r = await A.rpc('uso_latido', { p_min: 1 });
      if (r) { CM.estadoUso = r; if (r.aviso) toast(r.aviso); }
    } catch (e) { /* sin red: no pasa nada */ }
    CM.chip();
    const cada = Number((CM.cuenta.prefs || {}).pausa_cada) || 50;
    if (cada > 0 && CM.seguidos >= cada) {
      CM.seguidos = 0;
      modal('<h2>Pausa de 5 minutos</h2><p class="muted">Llevas ' + cada + ' minutos seguidos. Estira, toma agua y mira lejos de la pantalla.</p><div class="btns"><button data-cerrar type="button">Voy a descansar</button></div>');
    }
  }
  CM.iniciarLatido = () => {
    A.rpc('uso_evento', { p_tipo: 'apertura', p_min: 0 }).catch(() => {});
    setInterval(latido, 60000);
    setInterval(CM.chip, 60000);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { CM.seguidos = 0; return; }
      if (Date.now() - (CM.sync || 0) > 90000) CM.cargar().then(() => CM.emit()).catch(() => {});
    });
  };

  /* ---------- Módulos y pestañas ---------- */
  const TABS = [['hoy', 'Hoy'], ['tablero', 'Tablero'], ['metas', 'Metas'], ['cerebro', 'Cerebro'], ['panel', 'Panel']];
  CM.TABS = TABS;
  const cargados = {};
  function cargarMod(n) {
    if (CM.mod[n]) return Promise.resolve();
    if (cargados[n]) return cargados[n];
    cargados[n] = new Promise((ok, no) => {
      const s = document.createElement('script'); s.src = 'm-' + n + '.js?v=' + (global.BT_CONFIG.VERSION || '');
      s.onload = ok; s.onerror = () => { delete cargados[n]; no(new Error('No se pudo cargar la sección. Revisa tu conexión.')); };
      document.head.appendChild(s);
    });
    return cargados[n];
  }
  CM.cargarMod = cargarMod;
  CM.actual = null;
  CM.pintar = () => {
    const n = CM.actual; if (!n || !CM.mod[n]) return;
    const el = document.getElementById('v-' + n);
    const y = scrollY;
    CM.mod[n].render(el); scrollTo(0, y);
  };
  CM.ir = async (n) => {
    if (!TABS.some((t) => t[0] === n) && n !== 'mas') n = 'hoy';
    document.querySelectorAll('.view').forEach((v) => v.classList.toggle('on', v.id === 'v-' + n));
    document.querySelectorAll('nav.tabs button[data-v]').forEach((b) => b.classList.toggle('on', b.dataset.v === n));
    if (location.hash !== '#' + n) history.replaceState(null, '', '#' + n);
    CM.actual = n; scrollTo(0, 0);
    try { await cargarMod(n); } catch (e) { document.getElementById('v-' + n).innerHTML = '<p class="err">' + esc(e.message) + '</p>'; return; }
    if (CM.actual === n) CM.pintar();
  };
  CM.selectorEspacio = () => {
    const l = esps();
    if (l.length < 2) return '';
    return '<div class="seg" id="segEsp"><button type="button" data-e="todo" class="' + (CM.ui.esp === 'todo' ? 'on' : '') + '">Todo</button>' +
      l.map((e) => '<button type="button" data-e="' + e.id + '" class="' + (CM.ui.esp === e.id ? 'on' : '') + '"><i style="background:' + esc(e.color) + '"></i>' + esc(e.nombre) + '</button>').join('') + '</div>';
  };
  CM.alSelectorEspacio = (el) => {
    const s = el.querySelector('#segEsp'); if (!s) return;
    s.onclick = (e) => { const b = e.target.closest('[data-e]'); if (b) { CM.ui.esp = b.dataset.e; CM.pintar(); } };
  };
  global.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (h && h !== CM.actual) CM.ir(h); });
})(window);
