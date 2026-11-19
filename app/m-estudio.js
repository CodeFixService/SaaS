/* Centro de Mando · 🎬 Estudio de contenido (G94 · G74 d). Solo la cuenta admin (Josué). SIN API de IA:
   motor propio (est-motor.js = motor de Cerebro) + la base y las métricas que sube Josué (plantillas CSV que arma esta pantalla).
   Cada Espacio del CM = una marca/empresa con su objetivo (💰 vender · 📈 seguidores · 💬 comentarios · 🔁 compartidos/guardados).
   Datos (items, privados por dueño):
     est_conf  espacio_id · datos { obj, publico, tono, tags, ritmo { tiktok, instagram, facebook, historias } }
     est_base  espacio_id · titulo = texto · datos { tema, cat }
     est_idea  espacio_id · titulo = gancho · fecha = día plan · estado pendiente/grabada/publicada · datos = idea del motor + m { métricas } */
(function () {
  'use strict';
  const A = App, CM = window.CM, sb = A.sb, { esc, toast, modal, hoy } = A;
  const ui = { v: 'idea', esp: null, red: 'instagram', idea: null, semana: null, q: '' };
  const OBJ = [['vender', '💰 Vender'], ['seguidores', '📈 Ganar seguidores'], ['comentarios', '💬 Comentarios'], ['compartidos', '🔁 Compartidos y guardados']];
  const REDES = [['tiktok', 'TikTok'], ['instagram', 'Instagram'], ['facebook', 'Facebook'], ['historias', 'Historias']];
  const CATS = ['error', 'sintoma', 'dato', 'mito', 'parte', 'costo', 'idea_video', 'cta'];
  const CATN = { error: 'Errores', sintoma: 'Síntomas', dato: 'Datos', mito: 'Mitos', parte: 'Partes / productos', costo: 'Costos', idea_video: 'Ideas de video', cta: 'Llamados (CTA)', estructura_gancho: 'Estructuras de gancho', toma: 'Tomas', formato: 'Formatos' };
  const CTA_OBJ = {
    vender: ['Escríbenos por DM y te cotizamos', 'Agenda hoy: link en la bio', 'Pide el tuyo por WhatsApp', 'Quedan pocos cupos esta semana'],
    seguidores: ['Síguenos para la parte 2', 'Síguenos: cada semana un dato así', 'Activa la campanita para no perderte el próximo'],
    comentarios: ['Comenta "SÍ" si te pasó', '¿Tú qué harías? Te leo en comentarios', 'Etiqueta a quien le pasa esto'],
    compartidos: ['Guárdalo para cuando lo necesites', 'Compártelo con quien lo necesita', 'Mándaselo a tu amigo que siempre hace esto']
  };
  // Formatos que mejor sirven a cada objetivo (se prefieren 2 de cada 3 veces).
  const FMT_OBJ = { vender: /Antes y después|Testimonio|caso real|agenda|Proceso/i, seguidores: /Serie|Tendencia|POV|Top/i, comentarios: /Respuesta|interactiva|Pregunta|Mito|Reto|Diagnóstico/i, compartidos: /Carrusel|Tip|Top|educativo/i };
  // 🧠 Biblioteca de ganchos con su técnica psicológica. {t} = tema · {e} = elemento (el error, síntoma, dato…).
  const PSICO = [
    ['curiosidad', 'Bucle abierto', 'Nadie habla de esto sobre {t}… y te está costando', 1.15, 'seguidores'],
    ['interrupcion', 'Interrupción de patrón', 'DETENTE si {e}', 1.1, 'comentarios'],
    ['perdida', 'Aversión a la pérdida', 'Estás perdiendo plata por esto: {e}', 1.2, 'vender'],
    ['social', 'Prueba social', '9 de cada 10 clientes llegan por esto: {e}', 1.1, 'vender'],
    ['numero', 'Especificidad con número', '3 señales de que {e}', 1.15, 'compartidos'],
    ['mito', 'Contraintuitivo', 'Todos creen esto de {t}. Es al revés', 1.1, 'comentarios'],
    ['identidad', 'Identidad', 'Si te importa tu {t}, mira esto', 1.05, 'seguidores'],
    ['urgencia', 'Urgencia', 'Antes de que sea tarde: {e}', 1.05, 'vender'],
    ['autoridad', 'Autoridad', 'Después de cientos de casos de {t}, esto es lo que más vemos', 1.1, 'seguidores'],
    ['antes', 'Antes / después', 'Así llegó y así se fue: {e}', 1.15, 'vender'],
    ['pregunta', 'Pregunta directa', '¿Te pasa que {e}?', 1.05, 'comentarios'],
    ['error', 'Error común', 'El error de {e} que casi todos cometen', 1.15, 'compartidos'],
    ['promesa', 'Promesa con tiempo', 'En 15 segundos vas a saber si {e}', 1.1, 'compartidos']
  ];
  const REGANCHO = ['Pero ojo…', 'Y aquí viene lo importante:', 'Lo peor es que…', 'Espera, que hay más:', 'Y nadie te lo dice:'];
  const may = (s) => { s = String(s || '').trim(); return s ? s[0].toUpperCase() + s.slice(1) : s; };
  const min = (s) => { s = String(s || '').trim(); return s ? s[0].toLowerCase() + s.slice(1) : s; };
  const tagDe = (s) => '#' + String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9ñÑ]+/g, '').toLowerCase().slice(0, 28);
  const dia = (f) => f ? f.slice(8, 10) + '/' + f.slice(5, 7) : '';

  /* ---------- carga perezosa del motor y el importador ---------- */
  let libs;
  const cargarLibs = () => libs || (libs = Promise.all(['est-motor.js', 'est-importador.js'].map((f) => new Promise((ok, no) => {  // G112 d: viven en el núcleo (shared/)
    if ((f === 'est-motor.js' && window.Motor) || (f === 'est-importador.js' && window.Importador)) return ok();
    const s = document.createElement('script'); s.src = '../shared/' + f + '?v=' + (window.BT_CONFIG.VERSION || ''); s.onload = ok; s.onerror = () => { libs = null; no(new Error('No se pudo cargar el Estudio. Revisa tu conexión.')); }; document.head.appendChild(s);
  }))));

  /* ---------- datos del espacio ---------- */
  const espacios = () => CM.espacios.filter((e) => !e.archivado);
  const esp = () => CM.espacio(ui.esp);
  const conf = () => CM.items.find((i) => i.tipo === 'est_conf' && i.espacio_id === ui.esp);
  const cf = () => Object.assign({ obj: 'vender', publico: '', tono: '', tags: '', ritmo: { tiktok: 5, instagram: 5, facebook: 3, historias: 4 } }, (conf() || {}).datos || {});
  const base = () => CM.items.filter((i) => i.tipo === 'est_base' && i.espacio_id === ui.esp);
  const ideas = () => CM.items.filter((i) => i.tipo === 'est_idea' && i.espacio_id === ui.esp);
  const baseMotor = () => base().map((b) => ({ id: b.id, tema: (b.datos || {}).tema || 'General', categoria: (b.datos || {}).cat || 'dato', texto: b.titulo }));
  const ideasMotor = () => ideas().map((i) => Object.assign({ id: i.id, created_at: i.created_at }, i.datos || {}));
  // Métricas de las publicadas → rendimiento por estructura/tema (motor) y puntajes propios.
  const publicadas = () => ideas().filter((i) => i.estado === 'publicada' && i.datos && i.datos.m);
  const puntos = (m) => (+m.vistas || 0) / 1000 + 2 * (+m.compartidos || 0) / 10 + (+m.guardados || 0) / 10 + (+m.comentarios || 0) / 10 + (+m.seguidores || 0) / 5 + 3 * (+m.clientes || 0);
  function rendimiento() {
    const P = publicadas(); if (!P.length) return { estructura: {}, tema: {}, n: 0 };
    const media = P.reduce((a, i) => a + puntos(i.datos.m), 0) / P.length || 1;
    const agr = (k) => { const o = {}; P.forEach((i) => { const c = i.datos[k]; if (c) (o[c] = o[c] || []).push(puntos(i.datos.m) / media); }); Object.keys(o).forEach((x) => { o[x] = o[x].reduce((a, b) => a + b, 0) / o[x].length; }); return o; };
    return { estructura: agr('estructura'), tema: agr('tema'), formato: agr('formato'), red: agr('red'), hora: agr('hora'), n: P.length };
  }
  // Hora sugerida por red: la de mejor rendimiento en SUS métricas (mín. 2 publicaciones), si no la tabla de Cerebro.
  function horas() {
    const o = {}, P = publicadas();
    REDES.forEach(([r]) => { const g = {}; P.filter((i) => i.datos.red === r && i.datos.hora).forEach((i) => { (g[i.datos.hora] = g[i.datos.hora] || []).push(puntos(i.datos.m)); });
      const mejor = Object.keys(g).filter((h) => g[h].length >= 2).sort((a, b) => (g[b].reduce((x, y) => x + y, 0) / g[b].length) - (g[a].reduce((x, y) => x + y, 0) / g[a].length))[0];
      if (mejor) o[r] = mejor; });
    return o;
  }
  const ctx = () => window.Motor.contexto(baseMotor(), ideasMotor(), { rendimiento: rendimiento(), horas: horas() });

  /* ---------- las 8 cajas ---------- */
  function puntaje(txt, tecnica) {
    const t = String(txt || ''), c = cf(), P = PSICO.find((p) => p[0] === tecnica);
    let s = 50;
    if (/\d/.test(t)) s += 10;
    if (/\?|¿/.test(t)) s += 6;
    if (/\b(tu|tú|te|ti)\b/i.test(t)) s += 8;
    if (/nadie|error|nunca|sale caro|pierde|perdiendo|tarde|falso|al revés|detente/i.test(t)) s += 8;
    if (t.length <= 60) s += 8; else if (t.length > 90) s -= 10;
    if (P) { s += Math.round((P[3] - 1) * 60); if (P[4] === c.obj) s += 8; }
    const r = (rendimiento().estructura || {})[tecnica]; if (r) s += Math.round((r - 1) * 15);
    return Math.max(10, Math.min(99, s));
  }
  function alternativas(idea) {
    const c = cf(), e = min(idea.elemento || idea.tema), t = min(idea.tema);
    const orden = PSICO.slice().sort((a, b) => (b[4] === c.obj) - (a[4] === c.obj) || b[3] - a[3]);
    const sem = (idea.combo || '').length + (idea.gancho || '').length;
    const pick = [orden[sem % 4], orden[4 + (sem % (orden.length - 4))]];
    return pick.map((p) => { const txt = may(p[2].replace('{t}', t).replace('{e}', e)); return { txt, tec: p[1], k: p[0], pts: puntaje(txt, p[0]) }; });
  }
  function guion(idea) {
    const d = +idea.duracion_seg || 15, pant = idea.texto_pantalla || '', el = may(idea.elemento || idea.tema);
    if (/Carrusel/.test(idea.formato)) return ['Lámina 1 (portada): ' + idea.gancho, 'Lámina 2: el problema — ' + el, 'Lámina 3: por qué pasa', 'Lámina 4: qué hacer (paso a paso)', 'Lámina 5: error a evitar', 'Lámina 6 (cierre): ' + idea.cta].join('\n');
    if (idea.red === 'historias') return ['Historia 1: ' + idea.gancho + ' (texto grande)', 'Historia 2: ' + el + ' (foto o video corto)', 'Historia 3: sticker de encuesta "¿Te ha pasado?" Sí / No', 'Historia 4: ' + idea.cta + ' (sticker de link o DM)'].join('\n');
    const L = ['0-3 s · GANCHO: ' + idea.gancho + (pant ? ' · en pantalla: ' + pant : '')];
    let s = 3; const fin = Math.max(6, d - 4); let k = 0;
    while (s < fin) { const h = Math.min(fin, s + 5); L.push(s + '-' + h + ' s · ' + (k ? REGANCHO[k % REGANCHO.length] + ' ' : 'Desarrollo: ') + (k === 0 ? el : k === 1 ? 'muestra el detalle (' + min(idea.toma || 'primer plano') + ')' : 'la solución o el resultado')); s = h; k++; }
    L.push(fin + '-' + d + ' s · CIERRE: ' + idea.cta);
    return L.join('\n');
  }
  function copy(idea) {
    const c = cf(), el = may(idea.elemento || idea.tema);
    const cuerpo = c.obj === 'vender' ? el + '. Lo vemos todos los días y tiene solución.' : c.obj === 'comentarios' ? el + '. ¿A ti te ha pasado?' : c.obj === 'compartidos' ? el + '. Guárdalo: te va a servir.' : el + '. Cada semana te traigo uno así.';
    return idea.gancho + '\n\n' + cuerpo + (c.publico ? '\nPara ' + c.publico + '.' : '') + '\n\n👉 ' + idea.cta;
  }
  function hashtags(idea) {
    const c = cf(), s = new Set();
    String(c.tags || '').split(/[\s,]+/).filter(Boolean).forEach((x) => s.add(x[0] === '#' ? x.toLowerCase() : tagDe(x)));
    s.add(tagDe(idea.tema)); if (esp()) s.add(tagDe(esp().nombre));
    if (idea.red === 'tiktok') s.add('#tiktokchile'); else if (idea.red !== 'historias') s.add('#chile');
    return Array.from(s).filter((x) => x.length > 2).slice(0, 8).join(' ');
  }
  function cajas(idea) {
    const alt = alternativas(idea), pts = puntaje(idea.gancho, idea.estructura);
    return [
      ['gancho', '🎣 Gancho principal', idea.gancho, '⭐ ' + pts + ' · ' + (idea.estructura_nombre || 'Gancho'), alt],
      ['guion', '🎬 Guión por segundos', guion(idea), (idea.duracion_seg || 15) + ' s'],
      ['texto_pantalla', '🔤 Texto en pantalla', idea.texto_pantalla],
      ['copy', '✍️ Copy / descripción', copy(idea)],
      ['tags', '#️⃣ Hashtags', hashtags(idea)],
      ['cta', '📣 CTA', idea.cta],
      ['red', '📅 Red, formato y hora', (REDES.find((r) => r[0] === idea.red) || [0, idea.red])[1] + ' · ' + idea.formato + ' · ' + (idea.hora || '19:00') + (idea.fecha_plan ? ' · ' + dia(idea.fecha_plan) : '')],
      ['toma', '🎥 Tomas a grabar', may(idea.toma)]
    ];
  }
  const REFRESCA = { gancho: 'gancho', texto_pantalla: 'texto_pantalla', cta: 'cta', red: 'red', toma: 'toma', guion: 'formato' };
  function htmlCajas(idea, conId) {
    return cajas(idea).map((c) => '<div class="card est-caja" data-caja="' + c[0] + '"><div class="fila"><b>' + c[1] + '</b>' + (c[3] ? '<span class="pill info">' + esc(c[3]) + '</span>' : '') + '</div>' +
      '<p class="est-txt">' + esc(c[2] || '—') + '</p>' +
      (c[4] ? '<details class="comp"><summary>2 ganchos más</summary>' + c[4].map((a, k) => '<div class="est-alt"><p>' + esc(a.txt) + '</p><span class="sub">⭐ ' + a.pts + ' · ' + esc(a.tec) + '</span><div class="btns-s"><button type="button" class="small ghost" data-act="copiaAlt" data-k="' + k + '">📋 Copiar</button><button type="button" class="small ghost" data-act="usarAlt" data-k="' + k + '">Usar este</button></div></div>').join('') + '</details>' : '') +
      '<div class="btns-s"><button type="button" class="small" data-act="copiar" data-c="' + c[0] + '">📋 Copiar</button>' + (REFRESCA[c[0]] ? '<button type="button" class="small ghost" data-act="refrescar" data-c="' + c[0] + '" aria-label="Otra opción">🔄 Otra</button>' : '') + '</div></div>').join('') +
      '<div class="btns"><button type="button" class="ghost" data-act="prompt">📋 Copiar prompt para Claude</button>' + (conId ? '' : '<button type="button" data-act="guardar">💾 Guardar idea</button>') + '</div>';
  }
  function promptClaude(idea) {
    const c = cf(), e = esp();
    return 'Eres experto en contenido para redes. Mejora esta idea para ' + ((REDES.find((r) => r[0] === idea.red) || [0, idea.red])[1]) + ' (' + idea.formato + ', ' + (idea.duracion_seg || 15) + ' s).\n' +
      'Marca: ' + (e ? e.nombre : '') + ' · Objetivo: ' + (OBJ.find((o) => o[0] === c.obj) || [0, c.obj])[1] + (c.publico ? ' · Público: ' + c.publico : '') + (c.tono ? ' · Tono: ' + c.tono : '') + '\n' +
      'Tema: ' + idea.tema + ' — ' + (idea.elemento || '') + '\nGancho actual: ' + idea.gancho + '\n\n' +
      'Dame: 5 ganchos que paren el scroll (usa curiosidad, número específico o aversión a la pérdida; máx. 10 palabras), un guión por segundos con re-ganchos cada 3-5 s, texto en pantalla, copy corto, 5 hashtags y un CTA para ' + (OBJ.find((o) => o[0] === c.obj) || [0, ''])[1].replace(/^\S+ /, '').toLowerCase() + '.';
  }
  async function copiar(t) { try { await navigator.clipboard.writeText(t); } catch (e) { const a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); document.execCommand('copy'); a.remove(); } toast('📋 Copiado'); }
  function ajustarObjetivo(idea) {
    const c = cf(), op = CTA_OBJ[c.obj] || [];
    if (op.length && !(idea.bloqueados || []).includes('cta')) idea.cta = op[(idea.gancho || '').length % op.length];
    const re = FMT_OBJ[c.obj];
    if (re && !re.test(idea.formato) && ((idea.combo || '').length % 3) !== 0) { const f = window.Motor.formatosDe(idea.red).find((x) => re.test(x.t)); if (f) { idea.formato = f.t; idea.duracion_seg = f.dur || idea.duracion_seg; } }
    return idea;
  }
  function datosIdea(i) { const o = {}; ['combo', 'tema', 'red', 'estructura', 'estructura_nombre', 'elemento_id', 'elemento', 'gancho', 'formato', 'duracion_seg', 'toma', 'texto_pantalla', 'cta', 'hora', 'fecha_plan', 'm'].forEach((k) => { if (i[k] != null) o[k] = typeof i[k] === 'string' ? i[k].slice(0, 300) : i[k]; }); return o; }
  const guardarIdea = (i) => CM.add('est_idea', { espacio_id: ui.esp, titulo: String(i.gancho || '').slice(0, 200), fecha: i.fecha_plan || null, estado: 'pendiente', datos: datosIdea(i) });

  /* ---------- CSV ---------- */
  const celda = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
  function bajarCsv(nombre, filas) { const u = URL.createObjectURL(new Blob(['﻿' + filas.map((f) => f.map(celda).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' })); A.descargar(u, nombre); setTimeout(() => URL.revokeObjectURL(u), 4000); }
  const PLANT = {
    base: () => [['tema', 'categoria', 'texto'], ['Frenos', 'error', 'apretar solo el freno delantero en bajada'], ['Frenos', 'sintoma', 'el freno chilla al frenar'], ['Frenos', 'dato', 'las pastillas duran menos con barro'], ['Frenos', 'mito', 'si frena, está bien'], ['Frenos', 'parte', 'pastillas gastadas'], ['Frenos', 'costo', 'cambiar el disco cuesta 4 veces más que las pastillas'], ['Frenos', 'idea_video', 'sonido del freno antes y después'], ['Frenos', 'cta', 'Agenda tu revisión de frenos'], ['General', 'estructura_gancho', 'Error que cuesta: El error de {error} te sale caro'], ['General', 'toma', 'Primer plano de la pieza con problema']],
    historial: () => [['fecha de publicacion', 'red', 'formato', 'descripcion', 'visualizaciones', 'guardados', 'compartidos', 'comentarios', 'seguidores nuevos', 'clientes generados'], [hoy() + ' 19:00', 'instagram', 'reel', 'El error de apretar solo el freno delantero te sale caro', '1200', '15', '8', '4', '3', '1']],
    videos: () => [['archivo', 'descripcion', 'duracion', 'tema', 'red', 'estado'], ['VID_001.mp4', 'Freno chillando de cerca', '12', 'Frenos', 'tiktok', 'grabado']]
  };
  function leerArchivo(cb) {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.csv,.txt,text/csv';
    inp.onchange = async () => { const f = inp.files[0]; if (!f) return; try { const txt = window.Importador.decodificar(await f.arrayBuffer()); await cb(window.Importador.analizar(txt, f.name), f.name, txt); } catch (e) { toast(e.message); } };
    inp.click();
  }
  async function insertar(rows) {
    for (let k = 0; k < rows.length; k += 200) {
      const { data, error } = await sb.from('items').insert(rows.slice(k, k + 200)).select();
      if (error) throw new Error(A.friendly(error));
      CM.items.push.apply(CM.items, data);
    }
    CM.emit();
  }
  async function subirBase() {
    leerArchivo(async (r) => {
      if (r.tipo !== 'base') return toast('El archivo debe tener columnas tema, categoria, texto (baja la plantilla).');
      const ya = new Set(base().map((b) => ((b.datos || {}).tema + '|' + (b.datos || {}).cat + '|' + b.titulo).toLowerCase()));
      const rows = r.filas.filter((f) => !ya.has((f.tema + '|' + f.categoria + '|' + f.texto).toLowerCase())).slice(0, 1500)
        .map((f) => ({ tipo: 'est_base', estado: 'abierto', espacio_id: ui.esp, titulo: String(f.texto).slice(0, 200), datos: { tema: String(f.tema).slice(0, 60), cat: String(f.categoria).slice(0, 30) } }));
      if (!rows.length) return toast('Nada nuevo: esas filas ya estaban.');
      await insertar(rows); toast('✅ ' + rows.length + ' filas sumadas a la base');
    });
  }
  async function subirHistorial() {
    leerArchivo(async (r, nombre) => {
      if (r.tipo !== 'contenido' || !r.filas.length) return toast('No encontré publicaciones con métricas. Usa la plantilla o el export de Meta Business Suite / TikTok Studio.');
      const rows = r.filas.slice(0, 500).map((f) => {
        const ex = f.extra || {}, red = String(ex.red || ex.Red || r.red || (/tiktok/i.test(nombre) ? 'tiktok' : 'instagram')).toLowerCase();
        const fh = f.fecha_hora || '', m = { vistas: f.vistas || 0, guardados: f.guardados || 0, compartidos: f.compartidos || 0, comentarios: f.comentarios || 0, seguidores: f.seguidores_nuevos || 0, clientes: f.clientes_generados || 0 };
        const tx = String(f.texto || f.link || 'Publicación').slice(0, 200);
        return { tipo: 'est_idea', estado: 'publicada', espacio_id: ui.esp, titulo: tx, fecha: fh ? fh.slice(0, 10) : null,
          datos: { gancho: tx.slice(0, 300), red: REDES.some((x) => x[0] === red) ? red : 'instagram', formato: String(ex.formato || f.tipo || 'reel'), hora: fh.slice(11, 13) ? fh.slice(11, 13) + ':00' : '', fecha_plan: fh.slice(0, 10) || null, tema: String(ex.tema || 'Importado').slice(0, 60), estructura: 'importado', m } };
      });
      await insertar(rows); toast('✅ ' + rows.length + ' publicaciones con métricas');
    });
  }

  /* ---------- pantallas ---------- */
  function vIdea() {
    const B = base();
    let x = '<div class="chips">' + REDES.map((r) => '<button type="button" class="chip' + (ui.red === r[0] ? ' on' : '') + '" data-red="' + r[0] + '">' + r[1] + '</button>').join('') + '</div>';
    if (!B.length) return x + '<div class="card"><p>Este espacio aún no tiene base de temas.</p><p class="sub">Con 1 tema y sus errores, síntomas o datos ya salen ideas. En 📚 Base bajas la plantilla y la subes llena.</p><button type="button" class="big" data-v="base">📚 Ir a la base</button></div>';
    x += '<button type="button" class="big" data-act="generar">✨ Generar idea</button>';
    if (ui.idea) x += htmlCajas(ui.idea);
    return x;
  }
  function vSemana() {
    const L = ideas().filter((i) => i.estado !== 'publicada').sort((a, b) => (a.fecha || '9').localeCompare(b.fecha || '9'));
    let x = '<button type="button" class="big" data-act="semana">📅 Armar la semana (según tu ritmo)</button>';
    if (ui.semana) x += '<div class="card"><b>' + ui.semana.length + ' ideas nuevas</b><p class="sub">' + ui.semana.map((i) => dia(i.fecha_plan) + ' · ' + esc(i.red) + ' · ' + esc(i.gancho)).slice(0, 30).join('<br>') + '</p><div class="btns-s"><button type="button" class="small" data-act="guardarSemana">💾 Guardar todas</button><button type="button" class="small ghost" data-act="otraSemana">🔄 Otra</button></div></div>';
    x += '<h3 class="sec">Por grabar y publicar</h3>' + (L.length ? L.map(filaIdea).join('') : '<p class="empty">Sin ideas guardadas. Genera una o arma la semana.</p>');
    const P = ideas().filter((i) => i.estado === 'publicada').sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    if (P.length) x += '<h3 class="sec">Publicadas</h3>' + P.slice(0, 30).map(filaIdea).join('');
    return x;
  }
  const filaIdea = (i) => '<div class="card fila2"><button type="button" class="tit" data-act="abrir" data-id="' + i.id + '">' + esc(i.titulo || '(sin gancho)') + '</button><p class="sub">' + (i.fecha ? dia(i.fecha) + ' · ' : '') + esc((i.datos || {}).red || '') + ' · ' + esc((i.datos || {}).formato || '') + ' · <span class="pill' + (i.estado === 'publicada' ? ' ok' : i.estado === 'grabada' ? ' info' : '') + '">' + esc(i.estado) + '</span>' + (i.datos && i.datos.m ? ' · 👁️ ' + (+i.datos.m.vistas || 0) : '') + '</p></div>';
  function vBase() {
    const B = base(), por = {};
    B.forEach((b) => { const d = b.datos || {}; const t = (por[d.tema || 'General'] = por[d.tema || 'General'] || {}); t[d.cat] = (t[d.cat] || 0) + 1; });
    let cap = { libres: 0, total: 0 }; try { cap = window.Motor.capacidad(ctx()); } catch (e) { /* sin base */ }
    let x = '<div class="card"><b>' + B.length + ' filas · ' + Object.keys(por).length + ' temas</b><p class="sub">Quedan ' + cap.libres + ' de ' + cap.total + ' ideas sin repetir. Cada combinación se usa 1 vez.</p>' +
      '<div class="btns-s"><button type="button" class="small" data-act="subirBase">⬆️ Subir CSV</button><button type="button" class="small ghost" data-act="plant" data-p="base">⬇️ Plantilla</button><button type="button" class="small ghost" data-act="agregar">＋ Agregar</button></div></div>';
    x += '<details class="comp"><summary>¿Qué va en la base?</summary><p class="sub">Una fila por dato: <b>tema</b> (ej. Frenos), <b>categoria</b> (error, sintoma, dato, mito, parte, costo, idea_video, cta) y <b>texto</b>. Tema "General": estructura_gancho (con {error} {sintoma} {dato}…), toma, cta. Ábrela en Excel, llénala y súbela.</p></details>';
    x += Object.keys(por).sort().map((t) => '<div class="card fila2"><button type="button" class="tit" data-act="tema" data-t="' + esc(t) + '">' + esc(t) + '</button><p class="sub">' + Object.keys(por[t]).map((c) => esc(CATN[c] || c) + ' ' + por[t][c]).join(' · ') + '</p></div>').join('');
    return x;
  }
  function vBI() {
    const P = publicadas();
    let x = '<div class="card"><b>📊 Lo que funciona en ' + esc((esp() || {}).nombre || '') + '</b><p class="sub">Sale de TUS métricas: marca las ideas como publicadas con sus números, o sube tu historial / el export de Meta Business Suite o TikTok Studio.</p>' +
      '<div class="btns-s"><button type="button" class="small" data-act="subirHist">⬆️ Subir historial</button><button type="button" class="small ghost" data-act="plant" data-p="historial">⬇️ Plantilla historial</button><button type="button" class="small ghost" data-act="plant" data-p="videos">⬇️ Plantilla videos</button></div></div>';
    if (!P.length) return x + '<p class="empty">Aún sin publicaciones con métricas. Mientras tanto el motor usa 70 % lo probado y 30 % lo nuevo, con horas de fábrica.</p>';
    const media = P.reduce((a, i) => a + puntos(i.datos.m), 0) / P.length || 1;
    const top = (k, nombre, fmt) => {
      const g = {}; P.forEach((i) => { const v = fmt ? fmt(i) : i.datos[k]; if (v) (g[v] = g[v] || []).push(puntos(i.datos.m) / media); });
      const L = Object.keys(g).map((v) => [v, g[v].reduce((a, b) => a + b, 0) / g[v].length, g[v].length]).sort((a, b) => b[1] - a[1]);
      if (!L.length) return '';
      return '<div class="card"><b>' + nombre + '</b>' + L.slice(0, 5).map((l, n) => '<p class="sub">' + (n === 0 ? '🏆 ' : '') + esc(l[0]) + ' · ' + (l[1] >= 1 ? '▲ ' : '▼ ') + Math.round(l[1] * 100) + ' % del promedio (' + l[2] + ')</p>').join('') + '</div>';
    };
    const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const tot = P.reduce((a, i) => { const m = i.datos.m; a.v += +m.vistas || 0; a.c += +m.clientes || 0; a.s += +m.seguidores || 0; return a; }, { v: 0, c: 0, s: 0 });
    x += '<div class="card"><b>' + P.length + ' publicaciones</b><p class="sub">👁️ ' + tot.v.toLocaleString('es-CL') + ' vistas · 👥 +' + tot.s + ' seguidores · 💰 ' + tot.c + ' clientes (' + (tot.c / P.length).toFixed(1).replace('.', ',') + ' por video)</p></div>';
    x += top('tema', '🏷️ Temas') + top('estructura_nombre', '🎣 Ganchos') + top('formato', '🎞️ Formatos') + top('red', '📱 Redes') + top('hora', '⏰ Horas') + top(null, '📅 Días', (i) => i.fecha ? DIAS[new Date(i.fecha + 'T12:00:00').getDay()] : '');
    // Temas cansados: sus 3 últimas publicaciones bajo el promedio.
    const porT = {}; P.slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')).forEach((i) => { const t = i.datos.tema; if (t) (porT[t] = porT[t] || []).push(puntos(i.datos.m) / media); });
    const cans = Object.keys(porT).filter((t) => porT[t].length >= 3 && porT[t].slice(0, 3).every((v) => v < 0.8));
    if (cans.length) x += '<div class="card"><b>😴 Temas cansados</b><p class="sub">' + cans.map(esc).join(', ') + ': sus últimas 3 rindieron bajo el promedio. Descánsalos 2 semanas.</p></div>';
    const mes = hoy().slice(0, 7), delMes = P.filter((i) => (i.fecha || '').slice(0, 7) === mes);
    if (delMes.length) { const b = delMes.sort((a, c) => puntos(c.datos.m) - puntos(a.datos.m))[0]; x += '<div class="card"><b>📈 Lo mejor del mes</b><p class="sub">' + esc(b.titulo) + ' · 👁️ ' + (+b.datos.m.vistas || 0) + '</p><button type="button" class="small" data-act="masAsi" data-id="' + b.id + '">✨ Más como esta</button></div>'; }
    return x;
  }
  function vEspacio() {
    const c = cf();
    return '<div class="card"><b>🎯 Objetivo de ' + esc((esp() || {}).nombre || '') + '</b><p class="sub">Elige formatos, ganchos y CTA según lo que buscas.</p><div class="chips" id="eObj">' + OBJ.map((o) => '<button type="button" class="chip' + (c.obj === o[0] ? ' on' : '') + '" data-obj="' + o[0] + '">' + o[1] + '</button>').join('') + '</div>' +
      '<label>Público<input id="ePub" maxlength="80" value="' + esc(c.publico) + '" placeholder="ej. ciclistas de Santiago"></label>' +
      '<label>Tono<input id="eTono" maxlength="60" value="' + esc(c.tono) + '" placeholder="ej. cercano, con humor"></label>' +
      '<label>Hashtags fijos<input id="eTags" maxlength="160" value="' + esc(c.tags) + '" placeholder="#bicis #taller"></label>' +
      '<p class="sub">Ritmo por semana</p><div class="est-ritmo">' + REDES.map((r) => '<label>' + r[1] + '<input type="number" min="0" max="21" inputmode="numeric" data-ritmo="' + r[0] + '" value="' + (+c.ritmo[r[0]] || 0) + '"></label>').join('') + '</div>' +
      '<button type="button" class="big" data-act="guardarConf">💾 Guardar</button></div>';
  }

  function abrir(id) {
    const it = CM.get(id); if (!it) return;
    const idea = Object.assign({}, it.datos, { gancho: it.titulo, fecha_plan: it.fecha }), m = (it.datos || {}).m || {};
    const d = modal('<h2>🎬 ' + esc(dia(it.fecha) || 'Idea') + '</h2><div id="eCaj">' + htmlCajas(idea, true) + '</div>' +
      '<div class="card"><b>Estado</b><div class="chips">' + [['pendiente', '⏳ Por grabar'], ['grabada', '🎥 Grabada'], ['publicada', '✅ Publicada']].map((s) => '<button type="button" class="chip' + (it.estado === s[0] ? ' on' : '') + '" data-est="' + s[0] + '">' + s[1] + '</button>').join('') + '</div>' +
      '<p class="sub">Métricas (a los 7 días)</p><div class="est-ritmo">' + [['vistas', '👁️ Vistas'], ['guardados', '🔖 Guardados'], ['compartidos', '🔁 Compartidos'], ['comentarios', '💬 Comentarios'], ['seguidores', '👥 Seguidores'], ['clientes', '💰 Clientes']].map((k) => '<label>' + k[1] + '<input type="number" min="0" inputmode="numeric" data-m="' + k[0] + '" value="' + (m[k[0]] != null ? +m[k[0]] : '') + '"></label>').join('') + '</div>' +
      '<div class="btns-s"><button type="button" class="small" data-act="guardarM">💾 Guardar métricas</button><button type="button" class="small ghost" data-act="pedido">📲 Pedir grabación</button><button type="button" class="small ghost" data-act="borrar">🗑️ Borrar</button></div></div><div class="btns"><button type="button" class="ghost" data-cerrar>Cerrar</button></div>');
    d.onclick = async (e) => {
      const b = e.target.closest('[data-act],[data-est]'); if (!b) return;
      try {
        if (b.dataset.est) { await CM.upd(id, { estado: b.dataset.est }); d.querySelectorAll('[data-est]').forEach((x) => x.classList.toggle('on', x === b)); toast('Listo'); }
        else if (b.dataset.act === 'guardarM') { const nm = {}; d.querySelectorAll('[data-m]').forEach((i) => { if (i.value !== '') nm[i.dataset.m] = Math.max(0, Math.round(+i.value) || 0); }); await CM.upd(id, { estado: 'publicada', datos: Object.assign({}, CM.get(id).datos, { m: nm }) }); toast('✅ Métricas guardadas: el motor ya aprende de esta'); d.close(); }
        else if (b.dataset.act === 'pedido') { await cargarLibs(); open('https://wa.me/?text=' + encodeURIComponent(window.Motor.mensajePedido(idea, (esp() || {}).nombre)), '_blank', 'noopener'); }
        else if (b.dataset.act === 'borrar') { if (await CFX_DIALOGO.confirmar('¿Borrar esta idea?', { si: 'Borrar' })) { await CM.del(id); d.close(); } }
        else accionCaja(b, idea, d);
      } catch (er) { toast(er.message); }
    };
  }
  function accionCaja(b, idea, cont) {
    const a = b.dataset.act;
    if (a === 'copiar') { const c = cajas(idea).find((x) => x[0] === b.dataset.c); copiar(c ? c[2] : ''); }
    else if (a === 'copiaAlt') copiar(alternativas(idea)[+b.dataset.k].txt);
    else if (a === 'prompt') copiar(promptClaude(idea));
    else return false;
    return true;
  }

  async function render(el, head, alSub) {
    if (!ui.esp || !esp()) { const f = CM.ui.esp; ui.esp = (f && f !== 'todo' && f.indexOf('modo:') !== 0 && CM.espacio(f)) ? f : (espacios()[0] || {}).id || null; }
    const top = head + '<div class="chips" data-cfx-pestanas>' + [['idea', '💡 Idea'], ['semana', '📅 Semana'], ['base', '📚 Base'], ['bi', '📊 Qué funciona'], ['espacio', '🎯 Espacio']].map((t) => '<button type="button" class="chip' + (ui.v === t[0] ? ' on' : '') + '" data-v="' + t[0] + '">' + t[1] + '</button>').join('') + '</div>';
    if (!espacios().length) { el.innerHTML = top + '<p class="empty">Crea un Espacio (Más → Espacios) para cada marca: Ciclaselfie, Personal…</p>'; bind(el, alSub); return; }
    const selE = '<div class="chips">' + espacios().map((e) => '<button type="button" class="chip' + (e.id === ui.esp ? ' on' : '') + '" data-esp="' + e.id + '"><i class="dot" style="background:' + esc(e.color) + '"></i> ' + esc(e.nombre) + '</button>').join('') + '</div>';
    try { await cargarLibs(); } catch (e) { el.innerHTML = top + '<p class="err">' + esc(e.message) + '</p>'; bind(el, alSub); return; }
    const c = cf(), o = OBJ.find((x) => x[0] === c.obj);
    el.innerHTML = top + selE + '<p class="sub">Objetivo: ' + esc(o ? o[1] : '') + (conf() ? '' : ' · <button type="button" class="lnk" data-v="espacio">elegir</button>') + '</p><div id="estCuerpo">' + ({ idea: vIdea, semana: vSemana, base: vBase, bi: vBI, espacio: vEspacio }[ui.v] || vIdea)() + '</div>';
    bind(el, alSub);
  }
  function bind(el, alSub) {
    el.onclick = async (e) => {
      const b = e.target.closest('[data-act],[data-sub],[data-v],[data-esp],[data-red],[data-obj]'); if (!b) return;
      if (b.dataset.sub) return alSub(b.dataset.sub);
      try {
        if (b.dataset.v) { ui.v = b.dataset.v; CM.pintar(); return; }
        if (b.dataset.esp) { ui.esp = b.dataset.esp; ui.idea = null; ui.semana = null; CM.pintar(); return; }
        if (b.dataset.red) { ui.red = b.dataset.red; ui.idea = null; CM.pintar(); return; }
        if (b.dataset.obj) { el.querySelectorAll('[data-obj]').forEach((x) => x.classList.toggle('on', x === b)); return; }
        const a = b.dataset.act, id = b.dataset.id;
        if (accionCaja(b, ui.idea || {}, el)) return;
        if (a === 'generar' || a === 'masAsi') {
          const C = ctx(), it = id && CM.get(id), opc = it ? { tema: (it.datos || {}).tema } : {};
          let n = C.temas.includes(opc.tema) ? window.Motor.nueva(C, ui.red, hoy(), opc) : window.Motor.nueva(C, ui.red, hoy());
          if (!n) return toast('Se usaron todas las combinaciones: suma filas a la base (📚 Base).');
          ui.idea = ajustarObjetivo(n); ui.v = 'idea'; CM.pintar();
        } else if (a === 'refrescar') {
          const campo = REFRESCA[b.dataset.c], prev = ui.idea.cta, op = CTA_OBJ[cf().obj] || [];
          ui.idea = window.Motor.refrescar(ctx(), ui.idea, campo);
          if (campo === 'cta' && op.length) ui.idea.cta = op[(op.indexOf(prev) + 1) % op.length];
          CM.pintar();
        }
        else if (a === 'usarAlt') { const al = alternativas(ui.idea)[+b.dataset.k]; ui.idea = Object.assign({}, ui.idea, { gancho: al.txt, estructura: al.k, estructura_nombre: al.tec }); CM.pintar(); }
        else if (a === 'guardar') { await guardarIdea(ui.idea); ui.idea = null; toast('💾 Guardada en 📅 Semana'); }
        else if (a === 'semana' || a === 'otraSemana') { const d = new Date(hoy() + 'T12:00:00'), w = d.getDay() || 7; d.setDate(d.getDate() + (w === 1 ? 0 : 8 - w)); const C = ctx(); ui.semana = window.Motor.semana(C, cf().ritmo, d.toISOString().slice(0, 10)).map(ajustarObjetivo); if (!ui.semana.length) toast('Falta base: súbela en 📚 Base.'); CM.pintar(); }
        else if (a === 'guardarSemana') { const L = ui.semana || []; await insertar(L.map((i) => ({ tipo: 'est_idea', estado: 'pendiente', espacio_id: ui.esp, titulo: String(i.gancho || '').slice(0, 200), fecha: i.fecha_plan || null, datos: datosIdea(i) }))); ui.semana = null; toast('💾 ' + L.length + ' ideas guardadas'); }
        else if (a === 'abrir') abrir(id);
        else if (a === 'subirBase') subirBase();
        else if (a === 'subirHist') subirHistorial();
        else if (a === 'plant') bajarCsv('plantilla-' + b.dataset.p + '.csv', PLANT[b.dataset.p]());
        else if (a === 'agregar' || a === 'tema') agregar(b.dataset.t);
        else if (a === 'guardarConf') {
          const ritmo = {}; el.querySelectorAll('[data-ritmo]').forEach((i) => { ritmo[i.dataset.ritmo] = Math.max(0, Math.min(21, Math.round(+i.value) || 0)); });
          const on = el.querySelector('[data-obj].on'), datos = { obj: on ? on.dataset.obj : 'vender', publico: el.querySelector('#ePub').value.trim().slice(0, 80), tono: el.querySelector('#eTono').value.trim().slice(0, 60), tags: el.querySelector('#eTags').value.trim().slice(0, 160), ritmo };
          const c = conf(); if (c) await CM.upd(c.id, { datos }); else await CM.add('est_conf', { espacio_id: ui.esp, titulo: 'Estudio', datos });
          toast('💾 Guardado'); ui.v = 'idea'; CM.pintar();
        }
      } catch (er) { toast(er.message); }
    };
  }
  function agregar(tema) {
    const L = tema ? base().filter((b) => ((b.datos || {}).tema || 'General') === tema) : [];
    const d = modal('<h2>' + (tema ? esc(tema) : '＋ Agregar a la base') + '</h2>' +
      (L.length ? '<div class="sub">' + L.map((b) => '<p>' + esc(CATN[(b.datos || {}).cat] || (b.datos || {}).cat) + ': ' + esc(b.titulo) + ' <button type="button" class="lnk" data-del="' + b.id + '" aria-label="Quitar">✕</button></p>').join('') + '</div>' : '') +
      '<label>Tema<input id="aT" maxlength="60" value="' + esc(tema || '') + '" placeholder="ej. Frenos"></label><label>Categoría<select id="aC">' + CATS.concat(['estructura_gancho', 'toma']).map((c) => '<option value="' + c + '">' + esc(CATN[c]) + '</option>').join('') + '</select></label>' +
      '<label>Texto<input id="aX" maxlength="200" placeholder="ej. el freno chilla al frenar"></label><div class="btns"><button type="button" class="ghost" data-cerrar>Cerrar</button><button type="button" id="aOk">＋ Sumar</button></div>');
    d.onclick = async (e) => { const x = e.target.closest('[data-del]'); if (x) { try { await CM.del(x.dataset.del); x.parentNode.remove(); } catch (er) { toast(er.message); } } };
    d.querySelector('#aOk').onclick = async () => {
      const t = d.querySelector('#aT').value.trim(), tx = d.querySelector('#aX').value.trim();
      if (!t || !tx) return toast('Escribe tema y texto');
      try { await CM.add('est_base', { espacio_id: ui.esp, titulo: tx, datos: { tema: t, cat: d.querySelector('#aC').value } }); d.querySelector('#aX').value = ''; toast('＋ Sumado'); } catch (er) { toast(er.message); }
    };
  }
  CM.mod.estudio = { render, _ui: ui };
})();
