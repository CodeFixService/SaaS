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
    micro: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8"/>', lupa: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    pedidos: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/>', camara: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    wsp: '<path d="M21 12a9 9 0 0 1-13.5 7.8L3 21l1.3-4.4A9 9 0 1 1 21 12z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 1c-1 0-2.5-1.5-2.5-2.5l1-1-1-2z"/>', qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/>',
    listas: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>',
    compartir: '<path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v13"/>', pdf: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 13h6M9 17h4"/>',
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
  CM.enEsp = (i) => { const f = CM.ui.esp; if (f === 'todo') return true; if (f.indexOf('modo:') === 0) { const e = CM.espacio(i.espacio_id); return !!e && e.modo === f.slice(5); } return i.espacio_id === f; };
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
      q(sb.from('uso_dia').select('*').gte('dia', desde)),
      A.rpc('compartidos_info').catch(() => null)
    ]);
    CM.items = r[0]; CM.espacios = r[1]; CM.uso = r[2]; CM.comp = r[3] || { mios: {}, conmigo: {} }; CM.sync = Date.now();
  };
  CM.emit = () => { cancelAnimationFrame(CM._raf); CM._raf = requestAnimationFrame(() => { if (CM.pintar) CM.pintar(); }); };
  CM.add = async (tipo, o) => {
    const row = Object.assign({ tipo, titulo: '', estado: DEF[tipo] || 'abierto' }, o || {});
    if (row.espacio_id === undefined && CM.ui.esp !== 'todo') { if (CM.ui.esp.indexOf('modo:') === 0) { const e = CM.espacios.find((x) => !x.archivado && x.modo === CM.ui.esp.slice(5)); if (e) row.espacio_id = e.id; } else row.espacio_id = CM.ui.esp; }
    const { data, error } = await sb.from('items').insert(row).select().single();
    if (error) throw new Error(A.friendly(error));
    CM.items.push(data); CM.emit(); return data;
  };
  // Compartido: lo que otra cuenta vinculada me compartió (lo veo y lo cambio, pero no lo borro).
  CM.ajeno = (it) => !!(it && CM.cuenta && it.owner && it.owner !== CM.cuenta.id);
  CM.dueno = (it) => (CM.comp && CM.comp.conmigo && CM.comp.conmigo[it.id]) || '';
  CM.compartidoCon = (it) => (CM.comp && CM.comp.mios && CM.comp.mios[it.id]) || [];
  CM.upd = async (id, campos) => {
    const it = CM.get(id); if (!it) return;
    const prev = Object.assign({}, it);
    Object.assign(it, campos);
    if (campos.estado) it.hecho_at = ['hecho', 'resuelto', 'lograda', 'descartada'].includes(campos.estado) ? new Date().toISOString() : null;
    it.updated_at = new Date().toISOString();
    CM.emit();
    const c = {}; ['estado', 'titulo', 'cuerpo', 'datos'].forEach((k) => { if (k in campos) c[k] = campos[k]; });
    const { error } = CM.ajeno(it) ? await sb.rpc('compartido_guardar', { p_item: id, p_campos: c }) : await sb.from('items').update(campos).eq('id', id);
    if (error) { Object.assign(it, prev); CM.emit(); throw new Error(A.friendly(error)); }
  };
  CM.datos = (id, parcial) => { const it = CM.get(id); return CM.upd(id, { datos: Object.assign({}, it.datos, parcial) }); };
  CM.del = async (id) => {
    if (CM.ajeno(CM.get(id))) { toast('Solo quien lo creó lo puede borrar'); return; }
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
    solucion: 'Solución', nota: 'Nota', diario: 'Diario', logro: 'Logro', leccion: 'Lección', recordatorio: 'Recordatorio', falta: 'Lo que falta', pedido: 'Pedido' };
  CM.nombre = NOMBRE;
  const CAMPOS = {
    tarea: ['titulo', 'cuerpo', 'fecha', 'hora', 'rep', 'prioridad', 'espacio', 'estado'], falta: ['titulo', 'lista', 'cant', 'para'], proyecto: ['titulo', 'cuerpo', 'fecha', 'espacio', 'estado', 'donde'],
    meta: ['titulo', 'cuerpo', 'espacio', 'periodo', 'fin', 'estado'], resultado: ['titulo', 'objetivo', 'actual', 'unidad'],
    habito: ['titulo', 'espacio', 'dias'], idea: ['titulo', 'cuerpo', 'espacio', 'impacto', 'ganas', 'esfuerzo', 'estado'],
    problema: ['titulo', 'cuerpo', 'espacio', 'estado'], solucion: ['titulo', 'cuerpo'], nota: ['titulo', 'cuerpo', 'espacio', 'etiquetas'],
    logro: ['titulo', 'cuerpo', 'fecha', 'espacio'], leccion: ['titulo', 'cuerpo'], recordatorio: ['titulo', 'cuerpo', 'aviso', 'repite']
  };
  const ESTADOS = {
    tarea: [['abierto', 'Pendiente'], ['en_curso', 'Haciendo'], ['revision', 'En revisión'], ['hecho', 'Listo']], proyecto: [['abierto', 'Pendiente'], ['en_curso', 'Haciendo'], ['revision', 'En revisión'], ['hecho', 'Listo']],
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
    if (tipo === 'pedido') return CM.pedido(id, ini);
    const o = it || Object.assign({ tipo, titulo: '', cuerpo: '', estado: DEF[tipo] || 'abierto', prioridad: 0, fecha: null, repite: '', etiquetas: [], datos: {}, aviso_at: null }, ini || {});
    const dt = o.datos || {};
    const f = CAMPOS[tipo] || ['titulo', 'cuerpo'];
    let h = '<h2>' + (it ? 'Editar' : 'Nuevo') + ' · ' + esc(NOMBRE[tipo] || tipo) + '</h2>' + (CM.ajeno(it) ? '<p class="pill info">📤 Compartido por ' + esc(CM.dueno(it) || 'otra cuenta') + '</p>' : '');
    h += '<label for="fTit">' + (tipo === 'nota' || tipo === 'idea' || tipo === 'problema' ? 'Título' : 'Qué es') + '</label><input id="fTit" maxlength="200" value="' + esc(o.titulo) + '">';
    if (f.includes('cuerpo')) h += '<label for="fCue">Detalle</label><textarea id="fCue" maxlength="4000">' + esc(o.cuerpo) + '</textarea>';
    h += '<div class="row">';
    if (f.includes('estado') && ESTADOS[tipo]) h += '<div><label for="fEst">Estado</label>' + sel('fEst', ESTADOS[tipo], o.estado) + '</div>';
    if (f.includes('prioridad')) h += '<div><label for="fPri">Prioridad</label>' + sel('fPri', [[0, 'Normal'], [1, 'Importante'], [2, 'Urgente'], [3, 'Top del día']], o.prioridad) + '</div>';
    if (f.includes('fecha')) h += '<div><label for="fFec">Fecha</label><input id="fFec" type="date" value="' + esc(o.fecha || '') + '"></div>';
    if (f.includes('hora')) h += '<div><label for="fHor">Hora (opcional)</label><input id="fHor" type="time" value="' + esc(dt.hora || '') + '"></div>';
    if (f.includes('espacio')) h += '<div><label for="fEsp">Espacio</label>' + sel('fEsp', [['', 'Sin espacio']].concat(esps().map((e) => [e.id, e.nombre])), o.espacio_id || '') + '</div>';
    h += '</div>';
    if (f.includes('lista')) h += '<label for="fLis">Lista</label><input id="fLis" maxlength="40" list="dlListas" value="' + esc(dt.lista || '') + '">' + datalistListas() +
      '<div class="row"><div><label for="fCan">Cantidad</label><input id="fCan" maxlength="30" value="' + esc(dt.cant || '') + '"></div><div><label for="fPar">Para quién</label><input id="fPar" maxlength="40" value="' + esc(dt.para || '') + '"></div></div>';
    if (f.includes('donde')) h += '<label for="fDon">Dónde quedé (para retomar sin perderte)</label><input id="fDon" maxlength="200" value="' + esc(dt.donde || '') + '" placeholder="Ej: falta conectar el pago">';
    if (f.includes('periodo')) h += '<div class="row"><div><label for="fPer">Periodo</label>' + sel('fPer', [['semana', 'Semana'], ['mes', 'Mes'], ['trimestre', 'Trimestre'], ['anio', 'Año']], dt.periodo || 'mes') + '</div><div><label for="fFin">Fecha límite</label><input id="fFin" type="date" value="' + esc(dt.fin || '') + '"></div></div>';
    if (f.includes('objetivo')) h += '<div class="row"><div><label for="fObj">Objetivo (número)</label><input id="fObj" inputmode="decimal" value="' + esc(dt.objetivo == null ? '' : dt.objetivo) + '"></div><div><label for="fAct">Llevo</label><input id="fAct" inputmode="decimal" value="' + esc(dt.actual == null ? 0 : dt.actual) + '"></div><div><label for="fUni">Unidad</label><input id="fUni" maxlength="20" value="' + esc(dt.unidad || '') + '" placeholder="clientes, kg, h…"></div></div>';
    if (f.includes('rep')) { const rp = dt.rep || []; h += '<label>Repetir</label><div class="chips" id="fRep2">' + [1, 2, 3, 4, 5, 6, 7].map((n) => '<button type="button" class="chip' + (rp.includes(n) ? ' on' : '') + '" data-d="' + n + '">' + ['L', 'M', 'X', 'J', 'V', 'S', 'D'][n - 1] + '</button>').join('') + '</div>'; }
    if (f.includes('dias')) { const dias = dt.dias || [1, 2, 3, 4, 5, 6, 7]; h += '<label>Días</label><div class="chips" id="fDias">' + [1, 2, 3, 4, 5, 6, 7].map((n) => '<button type="button" class="chip' + (dias.includes(n) ? ' on' : '') + '" data-d="' + n + '">' + A.DIAS[n % 7] + '</button>').join('') + '</div>'; }
    if (f.includes('impacto')) h += '<div class="row"><div><label for="fImp">Impacto (1-5)</label>' + escala('fImp', dt.impacto) + '</div><div><label for="fGan">Ganas (1-5)</label>' + escala('fGan', dt.ganas) + '</div><div><label for="fEsf">Esfuerzo (1-5)</label>' + escala('fEsf', dt.esfuerzo) + '</div></div>';
    if (f.includes('etiquetas')) h += '<label for="fEti">Etiquetas (separadas por coma)</label><input id="fEti" maxlength="120" value="' + esc((o.etiquetas || []).join(', ')) + '">';
    if (f.includes('aviso')) h += '<div class="row"><div><label for="fAvi">Avisar el</label><input id="fAvi" type="datetime-local" value="' + localISO(o.aviso_at) + '"></div><div><label for="fRep">Repetir</label>' + sel('fRep', [['', 'No repetir'], ['diario', 'Cada día'], ['semanal', 'Cada semana'], ['mensual', 'Cada mes']], o.repite) + '</div></div>';
    if (it && HIJOS[tipo]) {
      h += '<div class="hijos" id="fHijos"></div>';
    }
    if (it) h += CM.bloqueCompartir(it);
    h += '<p class="err" id="fErr"></p><div class="btns">' + (it && !CM.ajeno(it) ? '<button class="danger" id="fDel" type="button">' + CM.ico('basura', 16) + ' Borrar</button>' : '') + '<button class="ghost" data-cerrar type="button">Cancelar</button><button id="fOk" type="button">Guardar</button></div>';
    const d = modal(h, (dlg) => {
      const $$ = (x) => dlg.querySelector('#' + x);
      if (it && HIJOS[tipo]) pintarHijos(dlg, it);
      const r2 = $$('fRep2'); if (r2) r2.onclick = (e) => { const b = e.target.closest('[data-d]'); if (b) b.classList.toggle('on'); };
      const ch = $$('fDias'); if (ch) ch.onclick = (e) => { const b = e.target.closest('[data-d]'); if (b) b.classList.toggle('on'); };
      if (it) CM.activarCompartir(dlg, it);
      if (it && $$('fDel')) $$('fDel').onclick = async () => { if (await A.confirmar('¿Borrar "' + (it.titulo || NOMBRE[tipo]) + '" y lo que depende de él?', 'Sí, borrar')) { dlg.close(); CM.del(it.id); } };
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
        if (v('fHor') !== undefined) { if (v('fHor')) nd.hora = v('fHor'); else delete nd.hora; }
        if (v('fLis') !== undefined) { nd.lista = v('fLis').trim() || 'General'; nd.cant = v('fCan').trim(); nd.para = v('fPar').trim(); }
        if (v('fPer') !== undefined) { nd.periodo = v('fPer'); nd.fin = v('fFin') || ''; }
        if (v('fObj') !== undefined) { nd.objetivo = num(v('fObj')); nd.actual = num(v('fAct')); nd.unidad = v('fUni').trim(); }
        if (v('fImp') !== undefined) { nd.impacto = Number(v('fImp')); nd.ganas = Number(v('fGan')); nd.esfuerzo = Number(v('fEsf')); }
        if (ch) nd.dias = Array.from(ch.querySelectorAll('.on')).map((b) => Number(b.dataset.d));
        if (r2) { const rp = Array.from(r2.querySelectorAll('.on')).map((b) => Number(b.dataset.d)); if (rp.length) nd.rep = rp; else delete nd.rep; }
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
  /* ---------- Compartir con cuentas vinculadas ---------- */
  const SE_COMPARTE = ['pedido', 'tarea', 'proyecto', 'nota', 'idea', 'problema', 'meta'];
  CM.vinculos = async (forzar) => { if (!CM._vinc || forzar) CM._vinc = await A.rpc('mis_vinculos').catch(() => []); return CM._vinc; };
  CM.bloqueCompartir = (it) => {
    if (!it || !SE_COMPARTE.includes(it.tipo)) return '';
    if (CM.ajeno(it)) return '<details class="comp"><summary class="sub">' + CM.ico('compartir', 14) + ' Historial</summary><div class="comp-h"></div></details>';
    return '<details class="comp"' + (CM.compartidoCon(it).length ? ' open' : '') + '><summary class="sub">' + CM.ico('compartir', 14) + ' Compartir' + (CM.compartidoCon(it).length ? ' (' + CM.compartidoCon(it).length + ')' : '') + '</summary>' +
      '<div class="chips comp-l"><span class="sub">Cargando…</span></div><div class="comp-h"></div></details>';
  };
  CM.activarCompartir = (dlg, it) => {
    const caja = dlg.querySelector('details.comp'); if (!caja) return;
    const hist = async () => {
      const L = await A.rpc('compartido_historial', { p_item: it.id }).catch(() => []);
      caja.querySelector('.comp-h').innerHTML = L.length ? '<ul class="comp-log">' + L.map((x) => '<li><b>' + esc(x.quien || '') + '</b> ' + esc(x.accion) + ' <span class="sub">' + A.hace(x.creado) + '</span></li>').join('') + '</ul>' : '';
    };
    const pintar = async () => {
      if (CM.ajeno(it)) return hist();
      const V = await CM.vinculos(true), con = CM.compartidoCon(it);
      caja.querySelector('.comp-l').innerHTML = V.length ? V.map((v) => '<button type="button" class="chip' + (con.includes(v.id) ? ' on' : '') + '" data-con="' + v.id + '">' + (con.includes(v.id) ? '✓ ' : '') + esc(v.nombre) + '</button>').join('')
        : '<span class="sub">Vincula una cuenta en Más → Cuentas vinculadas para compartirle cosas.</span>';
      hist();
    };
    caja.addEventListener('toggle', () => { if (caja.open) pintar(); });
    if (caja.open) pintar();
    caja.onclick = async (e) => {
      const b = e.target.closest('[data-con]'); if (!b) return;
      const si = !CM.compartidoCon(it).includes(b.dataset.con);
      try {
        await A.rpc('compartir', { p_item: it.id, p_con: b.dataset.con, p_si: si });
        const m = CM.comp.mios; m[it.id] = si ? CM.compartidoCon(it).concat(b.dataset.con) : CM.compartidoCon(it).filter((x) => x !== b.dataset.con);
        toast(si ? 'Compartido: le llegó un aviso' : 'Dejaste de compartirlo'); pintar(); CM.emit();
      } catch (er) { toast(er.message); }
    };
  };
  CM.pillCompartido = (it) => CM.ajeno(it) ? '<span class="pill info">de ' + esc(CM.dueno(it) || 'otra cuenta') + '</span>' : CM.compartidoCon(it).length ? '<span class="pill">' + CM.ico('compartir', 12) + ' compartido</span>' : '';

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
  // Barra de abajo: lo más usado + el botón central para anotar. Metas, Cerebro y Más se abren desde el menú de arriba.
  const TABS = [['hoy', 'Hoy'], ['pedidos', 'Pedidos'], ['nuevo', 'Anotar'], ['tablero', 'Tablero'], ['mas', 'Más']];
  const VISTAS = ['hoy', 'tablero', 'pedidos', 'panel', 'metas', 'cerebro', 'mas'];
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
  // El formulario de pedidos vive en su módulo: se carga al abrirlo desde cualquier pantalla.
  CM.pedido = async (id, ini) => { try { await cargarMod('pedidos'); return CM.mod.pedidos.form(id, ini); } catch (e) { toast(e.message); } };
  CM.actual = null;
  CM.pintar = () => {
    const n = CM.actual; if (!n || !CM.mod[n]) return;
    const el = document.getElementById('v-' + n);
    const y = scrollY;
    CM.mod[n].render(el); scrollTo(0, y);
  };
  CM.ir = async (n) => {
    n = String(n || '').split('?')[0];
    if (n === 'listas') n = 'pedidos';
    if (n === 'nuevo') { if (!CM.actual) CM.ir('hoy'); CM.anotar(); return; }
    if (!VISTAS.includes(n)) n = 'hoy';
    // Al cambiar de sección, si pasaron más de 20 s se traen los datos (así aparece al tiro lo que te compartieron).
    if (Date.now() - (CM.sync || 0) > 20000) CM.cargar().then(() => CM.emit()).catch(() => {});
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
    const m = (v, t) => '<button type="button" data-e="' + v + '" class="' + (CM.ui.esp === v ? 'on' : '') + '">' + t + '</button>';
    return '<div class="seg" id="segEsp">' + m('todo', 'Todo') + (l.some((e) => e.modo === 'trabajo') ? m('modo:trabajo', CM.ico('maletin', 13) + ' Trabajo') : '') + (l.some((e) => e.modo === 'personal') ? m('modo:personal', CM.ico('casa', 13) + ' Personal') : '') +
      (l.length > 2 ? l.map((e) => '<button type="button" data-e="' + e.id + '" class="' + (CM.ui.esp === e.id ? 'on' : '') + '"><i style="background:' + esc(e.color) + '"></i>' + esc(e.nombre) + '</button>').join('') : '') + '</div>';
  };
  CM.alSelectorEspacio = (el) => {
    const s = el.querySelector('#segEsp'); if (!s) return;
    s.onclick = (e) => { const b = e.target.closest('[data-e]'); if (b) { CM.ui.esp = b.dataset.e; CM.pintar(); } };
  };
  const listasUsadas = () => { const m = {}; CM.por('falta').forEach((i) => { const l = (i.datos && i.datos.lista) || 'General'; m[l] = Math.max(m[l] || 0, Date.parse(i.created_at) || 0); }); return Object.keys(m).sort((a, b) => m[b] - m[a]); };
  CM.listasUsadas = listasUsadas;
  function datalistListas() { return '<datalist id="dlListas">' + listasUsadas().map((l) => '<option value="' + esc(l) + '">').join('') + '</datalist>'; }
  /* ---------- Fotos: quedan SOLO en este teléfono (IndexedDB), nunca en el servidor ---------- */
  const FDB = () => new Promise((ok, no) => { const r = indexedDB.open('cm-fotos', 1); r.onupgradeneeded = () => r.result.createObjectStore('f'); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
  const fop = async (modo, fn) => { const db = await FDB(); return new Promise((ok, no) => { const t = db.transaction('f', modo), q = fn(t.objectStore('f')); t.oncomplete = () => ok(q && q.result); t.onerror = () => no(t.error); }); };
  // Comprime la foto (máx. lado px, JPEG) y la guarda. Devuelve su id.
  CM.fotos = {
    async guardar(file, lado) {
      const url = URL.createObjectURL(file);
      const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('No se pudo leer la foto')); i.src = url; });
      const k = Math.min(1, (lado || 900) / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      const id = 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      await fop('readwrite', (s) => s.put({ d: c.toDataURL('image/jpeg', 0.78), w: c.width, h: c.height }, id));
      return id;
    },
    get: (id) => id ? fop('readonly', (s) => s.get(id)).catch(() => null) : Promise.resolve(null),
    borrar: (id) => id ? fop('readwrite', (s) => s.delete(id)).catch(() => {}) : Promise.resolve()
  };

  CM.fotoPerfil = async () => { try { const f = await CM.fotos.get(localStorage.getItem('cm:fotoPerfil')); return f ? f.d : null; } catch (e) { return null; } };
  // La foto de perfil (solo en este teléfono) va en la cabecera común del núcleo.
  CM.pintarAvatar = async () => { const f = await CM.fotoPerfil(); const P = window.CFX_AYUDA_PEND; if (P) { P.foto = f || null; if (window.CFX_AYUDA) window.CFX_AYUDA.iniciar(P); } };

  /* ---------- Buscar en todo: tareas, notas, ideas, problemas, pedidos, recordatorios… ---------- */
  CM.buscar = function () {
    const d = modal('<h2>Buscar</h2><input id="bQ" type="search" placeholder="Escribe una palabra…" autocomplete="off"><div id="bR" class="busca-r"></div><div class="btns"><button class="ghost" data-cerrar type="button">Cerrar</button></div>');
    const q = d.querySelector('#bQ'), r = d.querySelector('#bR');
    const texto = (i) => sinTilde([i.titulo, i.cuerpo, i.datos && i.datos.nota, i.datos && (i.datos.items || []).map((x) => [x.que, x.color, x.nota].join(' ')).join(' '), i.datos && i.datos.lista, i.datos && i.datos.para].join(' '));
    q.oninput = () => {
      const v = sinTilde(q.value.trim());
      if (v.length < 2) { r.innerHTML = '<p class="sub">Escribe al menos 2 letras.</p>'; return; }
      const L = CM.items.filter((i) => !['check', 'resultado', 'solucion'].includes(i.tipo) && texto(i).includes(v)).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 40);
      r.innerHTML = L.length ? L.map((i) => '<button type="button" class="res" data-id="' + i.id + '"><span class="pill">' + esc(NOMBRE[i.tipo] || i.tipo) + '</span><span class="grow">' + esc(i.titulo || (i.cuerpo || '').slice(0, 60)) + '</span>' + (i.hecho_at ? CM.ico('check', 14) : '') + '</button>').join('') : '<p class="sub">Nada con "' + esc(q.value) + '".</p>';
    };
    r.onclick = (e) => { const b = e.target.closest('[data-id]'); if (b) { d.close(); CM.ficha(b.dataset.id); } };
    q.focus();
  };

  /* ---------- Completar: tacha y, si la tarea se repite, deja lista la siguiente ---------- */
  const FIN = { tarea: 'hecho', recordatorio: 'hecho', idea: 'elegida', problema: 'resuelto', pedido: 'hecho', proyecto: 'hecho', nota: 'hecho' };
  CM.FIN = FIN;
  CM.proxRep = (desde, dias) => { for (let k = 1; k <= 7; k++) { const f = sumarDias(desde, k); if (dias.includes(fechaDe(f).getDay() || 7)) return f; } return null; };
  CM.completar = async (it) => {
    // Recordatorio que se repite: tacharlo lo deja para la próxima vez (no se apaga).
    if (it.tipo === 'recordatorio' && it.repite && it.aviso_at) {
      const t = new Date(it.aviso_at);
      while (t <= new Date()) { if (it.repite === 'mensual') t.setMonth(t.getMonth() + 1); else t.setDate(t.getDate() + (it.repite === 'semanal' ? 7 : 1)); }
      await CM.upd(it.id, { estado: 'abierto', aviso_at: t.toISOString() }); toast('Listo. Te lo recuerdo de nuevo el ' + A.fCorta(iso(t))); return;
    }
    await CM.upd(it.id, { estado: FIN[it.tipo] || 'hecho' });
    const rep = it.tipo === 'tarea' && it.datos && it.datos.rep;
    if (rep && rep.length) {
      const f = CM.proxRep(it.fecha && it.fecha > hoy() ? it.fecha : hoy(), rep);
      if (f && !CM.items.some((x) => x.tipo === 'tarea' && x.titulo === it.titulo && x.fecha === f && x.estado !== 'hecho')) {
        await CM.add('tarea', { titulo: it.titulo, cuerpo: it.cuerpo || '', fecha: f, prioridad: it.prioridad, espacio_id: it.espacio_id, datos: { hora: it.datos.hora, rep } });
        toast('Listo. La próxima: ' + A.fCorta(f));
      }
    }
  };

  /* ---------- Anotar rápido (botón +): escribe o dicta; la app adivina qué es, el día y la hora ---------- */
  const DSEM = { domingo: 7, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6 };
  const sinTilde = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  // "mañana a las 10:30 llamar a Maya" → { tipo: 'tarea', fecha: mañana, hora: '10:30', titulo: 'Llamar a Maya' }
  CM.entender = function (texto) {
    let t = ' ' + texto.trim() + ' ', n = sinTilde(t), r = {};
    const quita = (re) => { const m = re.exec(n); if (!m) return null; t = t.slice(0, m.index) + ' ' + t.slice(m.index + m[0].length); n = sinTilde(t); return m; };
    let m;
    if ((m = quita(/^\s*(idea)\s*[:,-]?\s/))) r.tipo = 'idea';
    else if ((m = quita(/^\s*(problema)\s*[:,-]?\s/))) r.tipo = 'problema';
    else if ((m = quita(/^\s*(nota)\s*[:,-]?\s/))) r.tipo = 'nota';
    else if ((m = quita(/^\s*(pedido|encargo)\s+(de|para)?\s*/))) r.tipo = 'pedido';
    else if ((m = quita(/^\s*(recuerdame|recordar|recordatorio|acuerdate de|avisame)\s*(que|de)?\s*/))) r.tipo = 'recordatorio';
    else if ((m = quita(/^\s*(tarea|tengo que|hay que|debo)\s*[:,-]?\s*/))) r.tipo = 'tarea';
    if ((m = quita(/\s(pasado manana)\s/))) r.fecha = sumarDias(hoy(), 2);
    else if ((m = quita(/\s(manana)\s/))) r.fecha = sumarDias(hoy(), 1);
    else if ((m = quita(/\s(hoy)\s/))) r.fecha = hoy();
    else if ((m = quita(/\s(el |este |proximo )?(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\s/))) { const d = DSEM[m[2]]; for (let k = 1; k <= 7; k++) { const f = sumarDias(hoy(), k); if ((fechaDe(f).getDay() || 7) === d) { r.fecha = f; break; } } }
    // Hora solo si viene con "a las", con minutos (10:30) o con am/pm/hrs: "2 manteles" no es una hora.
    const reH = /\s(a las|a la|tipo|como a las)\s*(\d{1,2})(?:[:.h](\d{2}))?\s*(am|pm|hrs?|horas)?\s|\s()(\d{1,2})[:.h](\d{2})\s*(am|pm|hrs?|horas)?\s|\s()(\d{1,2})\s*(am|pm|hrs|horas)\s/;
    if ((m = quita(reH))) {
      const g = m[2] ? [m[2], m[3], m[4]] : m[6] ? [m[6], m[7], m[8]] : [m[10], '', m[11]];
      let h = Number(g[0]); const mi = g[1] || '00';
      if (g[2] === 'pm' && h < 12) h += 12; else if (!g[2] && h >= 1 && h <= 7) h += 12; // "a las 5" = 17:00
      if (h < 24 && Number(mi) < 60) r.hora = pad(h) + ':' + mi;
    }
    if (!r.tipo) r.tipo = r.fecha || r.hora ? 'tarea' : '';
    r.titulo = t.replace(/\s+/g, ' ').trim().replace(/^[:,-]\s*/, '');
    if (r.titulo) r.titulo = r.titulo[0].toUpperCase() + r.titulo.slice(1);
    return r;
  };
  const TIPOS_A = [['nota', 'Nota'], ['tarea', 'Tarea'], ['pedido', 'Pedido'], ['recordatorio', 'Recordar'], ['idea', 'Idea'], ['problema', 'Problema']];
  const DIAS1 = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const anot = { tipo: 'nota', auto: true };
  const vozOk = !!(global.SpeechRecognition || global.webkitSpeechRecognition);
  CM.anotar = function (tipo, ini) {
    ini = ini || {};
    if (tipo === 'pedido') return CM.pedido(null, ini);
    anot.tipo = tipo || 'nota'; anot.auto = !tipo;
    const mas1h = () => { const d = new Date(Date.now() + 3600e3); return pad(d.getHours()) + ':00'; };
    const d = modal('<h2>¿Qué anotas?</h2><div class="chips" id="aTip"></div><div class="cap-voz" data-sin-voz><div id="aCue"></div>' + (vozOk ? '<button type="button" class="voz" id="aVoz" aria-label="Dictar">' + CM.ico('micro', 22) + '</button>' : '') + '</div>' +
      '<div id="aExt"></div><p class="sub" id="aAyu"></p><p class="err" id="aErr"></p><div class="btns"><button class="ghost" data-cerrar type="button">Cerrar</button><button id="aOk" type="button">Guardar</button></div>');
    d.classList.add('hoja-anotar');
    const $$ = (x) => d.querySelector('#' + x);
    let rep = [], fecha = ini.fecha || hoy(), hora = ini.hora || '';
    function chips() { $$('aTip').innerHTML = TIPOS_A.map((x) => '<button type="button" class="chip' + (x[0] === anot.tipo ? ' on' : '') + '" data-t="' + x[0] + '">' + x[1] + '</button>').join(''); }
    function extras() {
      const t = anot.tipo; let h = '';
      if (t === 'tarea' || t === 'recordatorio') {
        if (t === 'recordatorio' && !hora) hora = mas1h();
        h += '<div class="row"><div><label for="aFec">' + (t === 'tarea' ? 'Fecha' : 'Día') + '</label><input id="aFec" type="date" value="' + esc(fecha) + '"></div><div><label for="aHor">Hora' + (t === 'tarea' ? ' (opcional)' : '') + '</label><input id="aHor" type="time" value="' + esc(hora) + '"></div></div>' +
          '<div class="chips" id="aDia"><button type="button" class="chip" data-f="0">Hoy</button><button type="button" class="chip" data-f="1">Mañana</button><button type="button" class="chip" data-f="2">Pasado</button></div>';
        if (t === 'tarea') h += '<label>Repetir (opcional)</label><div class="chips" id="aRep">' + DIAS1.map((x, i) => '<button type="button" class="chip' + (rep.includes(i + 1) ? ' on' : '') + '" data-r="' + (i + 1) + '">' + x + '</button>').join('') + '</div>';
      }
      $$('aExt').innerHTML = h;
      ['aFec', 'aHor'].forEach((k) => { const i = $$(k); if (i) { i.onchange = () => { if (k === 'aFec') fecha = i.value; else hora = i.value; }; i.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); guardar(); } }; } });
      $$('aAyu').textContent = t === 'nota' ? 'Tip: escribe "mañana a las 10 llamar a Maya" y la paso a Tarea con su hora. "Pedido de Juan…" abre un pedido.' : '';
    }
    function cuerpo(texto) {
      const t = anot.tipo;
      $$('aCue').innerHTML = t === 'nota' ? '<textarea id="aTxt" maxlength="4000" rows="3" placeholder="Escribe o dicta… (la app adivina si es tarea, idea o pedido)">' + esc(texto || '') + '</textarea>'
        : '<input id="aTxt" maxlength="200" autocomplete="off" placeholder="' + ({ tarea: '¿Qué hay que hacer?', recordatorio: '¿Qué te recuerdo?', idea: 'Tu idea', problema: '¿Qué problema?' }[t]) + '" value="' + esc(texto || '') + '">';
      const tx = $$('aTxt'); tx.focus(); tx.setSelectionRange(tx.value.length, tx.value.length);
      tx.oninput = adivinar;
      tx.onkeydown = (e) => { if (e.key === 'Enter' && (t !== 'nota' || !e.shiftKey && !tx.value.includes('\n') && tx.value.length < 120)) { e.preventDefault(); guardar(); } };
    }
    // Mientras escribes, sugiere la categoría, el día y la hora (sin cambiar lo que elegiste a mano).
    function adivinar() {
      if (!anot.auto) return;
      const v = $$('aTxt').value, r = CM.entender(v);
      if (r.tipo === 'pedido') { $$('aAyu').textContent = 'Al guardar se abre el pedido de "' + (r.titulo || '…') + '" para agregarle lo que pide.'; return; }
      const nt = r.tipo || 'nota';
      if (r.fecha) fecha = r.fecha; if (r.hora) hora = r.hora;
      if (nt !== anot.tipo) { anot.tipo = nt; chips(); cuerpo(v); }
      extras();
      if (r.tipo) $$('aAyu').textContent = 'Lo guardo como ' + ({ tarea: 'tarea', recordatorio: 'recordatorio', idea: 'idea', problema: 'problema', nota: 'nota' }[nt]) + (r.fecha ? ' para el ' + A.fCorta(fecha) : '') + (r.hora ? ' a las ' + hora : '') + ': "' + (r.titulo || '…') + '"';
    }
    async function guardar() {
      const t = anot.tipo, raw = ($$('aTxt').value || '').trim();
      if (!raw) { $$('aErr').textContent = 'Escribe algo primero'; return; }
      const r = anot.auto ? CM.entender(raw) : { titulo: raw }, txt = (r.titulo || raw).trim();
      if (r.tipo === 'pedido') { d.close(); CM.pedido(null, { titulo: txt }); return; }
      const v = (k) => ($$(k) ? $$(k).value.trim() : '');
      $$('aErr').textContent = '';
      try {
        if (t === 'nota') { const l = raw.split('\n'); await CM.add('nota', { titulo: l[0].slice(0, 200), cuerpo: l.length > 1 || l[0].length > 200 ? raw : '' }); }
        else if (t === 'tarea') { const dt = {}; if (v('aHor')) dt.hora = v('aHor'); if (rep.length) dt.rep = rep.slice().sort(); await CM.add('tarea', { titulo: txt, fecha: v('aFec') || null, datos: dt }); }
        else if (t === 'recordatorio') { const f = v('aFec') || hoy(), hh = v('aHor') || mas1h(); await CM.add('recordatorio', { titulo: txt, aviso_at: new Date(f + 'T' + hh).toISOString() }); }
        else await CM.add(t, { titulo: txt, datos: t === 'idea' ? { impacto: 3, ganas: 3, esfuerzo: 3 } : {} });
        toast({ tarea: 'Tarea agregada', recordatorio: 'Te lo recuerdo', idea: 'Idea guardada', problema: 'Problema anotado' }[t] || 'Guardado'); d.close();
      } catch (e) { $$('aErr').textContent = e.message; }
    }
    // Dictado por voz (Chrome / Android): hablas y se escribe solo.
    let rec = null;
    function dictar() {
      const b = $$('aVoz');
      if (rec) { rec.stop(); return; }
      const R = global.SpeechRecognition || global.webkitSpeechRecognition; rec = new R();
      rec.lang = 'es-CL'; rec.interimResults = true; rec.continuous = false;
      const base = $$('aTxt').value ? $$('aTxt').value.trim() + ' ' : '';
      rec.onresult = (e) => { const tx = $$('aTxt'); tx.value = base + Array.from(e.results).map((x) => x[0].transcript).join(''); adivinar(); };
      rec.onend = () => { rec = null; b.classList.remove('on'); const tx = $$('aTxt'); if (tx) tx.focus(); };
      rec.onerror = (e) => { if (e.error === 'not-allowed') toast('Permite el micrófono para dictar'); };
      b.classList.add('on'); rec.start();
    }
    d.onclick = (e) => {
      const b = e.target.closest('[data-t],[data-f],[data-r],#aVoz'); if (!b) return;
      if (b.id === 'aVoz') return dictar();
      if (b.dataset.t) {
        if (b.dataset.t === 'pedido') { const tx = $$('aTxt'); d.close(); CM.pedido(null, { titulo: tx ? tx.value.trim() : '' }); return; }
        const tx = $$('aTxt'); anot.tipo = b.dataset.t; anot.auto = false; chips(); cuerpo(tx ? tx.value : ''); extras();
      } else if (b.dataset.f) { fecha = sumarDias(hoy(), Number(b.dataset.f)); $$('aFec').value = fecha; $$('aTxt').focus(); }
      else if (b.dataset.r) { const n = Number(b.dataset.r); rep = rep.includes(n) ? rep.filter((x) => x !== n) : rep.concat(n); b.classList.toggle('on'); }
    };
    d.addEventListener('close', () => { if (rec) rec.abort(); });
    $$('aOk').onclick = guardar;
    chips(); cuerpo(ini.titulo || ''); extras();
    return d;
  };

  global.addEventListener('hashchange', () => { const h = location.hash.slice(1).split('?')[0]; if (h && h !== CM.actual) CM.ir(h); });
})(window);
