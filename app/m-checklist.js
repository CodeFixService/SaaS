/* Centro de Mando · ✅ Checklists (G93 · G87 D): procedimientos paso a paso.
   Rubro en el perfil → plantillas de fábrica del rubro (editables: al editar queda TU copia) + crear desde cero.
   Datos: items tipo 'checklist' { p: [pasos], ok: [índices hechos], rubro, base } y tipo 'plantilla' { p, rubro, base }. */
(function () {
  'use strict';
  const A = App, CM = window.CM, { esc, toast, modal } = A;
  const MAXP = 25, MAXT = 90;
  const RUBROS = [['general', '🧩 General'], ['taller', '🚲 Taller de bicis'], ['barberia', '💈 Barbería / belleza'], ['tienda', '🏪 Tienda / almacén'],
    ['comida', '🍔 Comida / restaurante'], ['estaciona', '🅿️ Estacionamiento'], ['servicios', '💼 Servicios / oficina'], ['contenido', '🎬 Redes / contenido']];
  // Plantillas de fábrica: [clave, título, pasos]. Editar una crea tu copia (la de fábrica sigue disponible con ↺).
  const FAB = {
    general: [['g-abre', 'Apertura del día', ['Revisar avisos y mensajes', 'Mirar la agenda de hoy', 'Elegir las 3 tareas Top', 'Preparar lo que se entrega hoy']],
      ['g-cierra', 'Cierre del día', ['Anotar dónde quedé en cada proyecto', 'Responder mensajes pendientes', 'Revisar la caja / ingresos', 'Dejar lista la tarea de mañana']],
      ['g-lanza', 'Lanzar un producto o servicio', ['Definir precio y a quién va', 'Foto o video del producto', 'Texto corto con beneficio', 'Publicar en redes', 'Avisar por WhatsApp a clientes', 'Revisar resultados a los 3 días']]],
    taller: [['t-mant', 'Mantención completa de bici', ['Revisar estado y anotar daños', 'Lavar y desengrasar transmisión', 'Ajustar frenos', 'Ajustar cambios', 'Revisar ruedas y rayos', 'Presión de neumáticos', 'Lubricar cadena', 'Prueba de rodado', 'Avisar al cliente que está lista']],
      ['t-entrega', 'Entrega de bici', ['Mostrar lo que se hizo', 'Cobrar y dar comprobante', 'Recomendar próxima mantención', 'Pedir reseña']],
      ['t-abre', 'Apertura del taller', ['Revisar órdenes del día', 'Herramientas en su lugar', 'Repuestos que faltan', 'Confirmar retiros por WhatsApp']]],
    barberia: [['b-abre', 'Apertura del local', ['Limpiar sillas y espejos', 'Desinfectar herramientas', 'Toallas limpias', 'Revisar agenda del día', 'Música y luces']],
      ['b-cliente', 'Atención de cliente', ['Saludar y confirmar servicio', 'Capa y cuello limpios', 'Corte / servicio', 'Mostrar resultado con espejo', 'Cobrar', 'Agendar la próxima visita']],
      ['b-cierra', 'Cierre e higiene', ['Barrer y botar pelo', 'Desinfectar herramientas', 'Lavar toallas', 'Cuadrar caja', 'Apagar equipos']]],
    tienda: [['s-abre', 'Apertura de local', ['Contar caja inicial', 'Revisar stock crítico', 'Ordenar vitrina', 'Precios a la vista', 'Abrir puerta a la hora']],
      ['s-recibe', 'Recepción de mercadería', ['Comparar con la orden de compra', 'Revisar fechas de vencimiento', 'Anotar faltantes o dañados', 'Cargar stock', 'Guardar la factura o boleta']],
      ['s-cierra', 'Cierre de caja', ['Contar efectivo', 'Comparar con ventas del día', 'Anotar diferencias', 'Guardar el dinero', 'Cerrar y apagar']]],
    comida: [['c-abre', 'Apertura de cocina', ['Lavado de manos y uniforme', 'Temperatura de refrigeradores', 'Mise en place', 'Revisar pedidos del día']],
      ['c-higiene', 'Higiene (control sanitario)', ['Superficies desinfectadas', 'Alimentos rotulados con fecha', 'Basura retirada', 'Baños limpios', 'Registro de temperaturas']],
      ['c-cierra', 'Cierre', ['Guardar y rotular sobras', 'Limpiar planchas y freidoras', 'Lavar pisos', 'Cuadrar caja', 'Apagar gas y equipos']]],
    estaciona: [['e-ronda', 'Ronda del recinto', ['Lugares libres y ocupados', 'Iluminación funcionando', 'Señalética visible', 'Revisar cámaras o accesos']],
      ['e-entrega', 'Entrega de lugar', ['Confirmar reserva y patente', 'Mostrar el lugar', 'Explicar horario de salida', 'Confirmar pago']]],
    servicios: [['v-cliente', 'Cliente nuevo', ['Reunión para entender lo que necesita', 'Enviar cotización', 'Confirmar y pedir abono', 'Fecha de entrega acordada', 'Crear el proyecto en el Tablero']],
      ['v-entrega', 'Entrega de proyecto', ['Revisión final', 'Enviar al cliente', 'Recibir comentarios', 'Ajustes', 'Cobrar el saldo', 'Pedir recomendación']]],
    contenido: [['r-reel', 'Publicar un reel', ['Gancho de 0-3 s', 'Grabar tomas', 'Editar con texto en pantalla', 'Escribir copy y CTA', 'Hashtags', 'Publicar a la hora sugerida', 'Responder comentarios la 1.ª hora']],
      ['r-carru', 'Carrusel', ['Portada con gancho', 'Una idea por lámina (4:5)', 'Lámina final con CTA', 'Copy y hashtags', 'Publicar']]]
  };
  const ui = { abiertas: false };
  const rubro = () => { const r = (CM.cuenta.prefs || {}).rubro; return FAB[r] ? r : 'general'; };
  const nomRubro = (r) => (RUBROS.find((x) => x[0] === r) || RUBROS[0])[1];
  const pasos = (i) => ((i.datos || {}).p || []).map(String);
  const hechos = (i) => new Set(((i.datos || {}).ok || []).map(Number));
  const lista = (tipo) => CM.items.filter((i) => i.tipo === tipo);
  function limpiar(txt) {
    const l = String(txt || '').split('\n').map((s) => s.replace(/^\s*(?:[-*•✅☐□]|\d+[.)])\s*/, '').trim()).filter(Boolean).map((s) => s.slice(0, MAXT));
    return l.slice(0, MAXP);
  }
  // Plantillas del rubro: las tuyas (con su base reemplazan a la de fábrica) + las de fábrica que no editaste.
  function plantillas(r) {
    const mias = lista('plantilla').filter((p) => ((p.datos || {}).rubro || 'general') === r);
    const bases = new Set(mias.map((p) => (p.datos || {}).base).filter(Boolean));
    return mias.map((p) => ({ id: p.id, base: (p.datos || {}).base || '', t: p.titulo, p: pasos(p), mia: true }))
      .concat((FAB[r] || []).filter((f) => !bases.has(f[0])).map((f) => ({ id: '', base: f[0], t: f[1], p: f[2], mia: false })));
  }
  function barra(i) {
    const n = pasos(i).length, h = hechos(i).size, pc = n ? Math.round(h / n * 100) : 0;
    return '<div class="barra"><i style="width:' + pc + '%"></i></div><span class="sub">' + h + '/' + n + '</span>';
  }
  // Editor: título + un paso por línea (fácil en el teléfono).
  function editor(o, alGuardar) {
    const d = modal('<h2>' + esc(o.h) + '</h2><label>Nombre<input id="clT" maxlength="80" value="' + esc(o.t || '') + '" placeholder="Ej: Apertura del local"></label>' +
      '<label>Pasos (uno por línea, máx. ' + MAXP + ')<textarea id="clP" rows="9" placeholder="Paso 1&#10;Paso 2&#10;Paso 3">' + esc((o.p || []).join('\n')) + '</textarea></label>' +
      '<p class="sub" id="clN"></p><div class="btns"><button class="ghost" data-cerrar type="button">Cancelar</button><button id="clOk" type="button">Guardar</button></div>');
    const ta = d.querySelector('#clP'), nn = d.querySelector('#clN');
    const cuenta = () => { nn.textContent = limpiar(ta.value).length + ' pasos'; };
    ta.oninput = cuenta; cuenta();
    d.querySelector('#clOk').onclick = async () => {
      const t = d.querySelector('#clT').value.trim(), p = limpiar(ta.value);
      if (!t) return toast('Ponle un nombre');
      if (!p.length) return toast('Escribe al menos un paso');
      try { await alGuardar(t.slice(0, 80), p); d.close(); } catch (e) { toast(e.message); }
    };
  }
  async function usar(pl, r) {
    const it = await CM.add('checklist', { titulo: pl.t, datos: { p: pl.p, ok: [], rubro: r, base: pl.base || '' } });
    toast('✅ Checklist creada');
    abrir(it.id);
  }
  async function guardarPlantilla(pl, r, t, p) {
    if (pl && pl.mia && pl.id) await CM.upd(pl.id, { titulo: t, datos: { p, rubro: r, base: pl.base || '' } });
    else await CM.add('plantilla', { titulo: t, datos: { p, rubro: r, base: (pl && pl.base) || '' } });
    toast('Plantilla guardada');
  }
  // Ficha de una checklist: tachar pasos, editar, reiniciar, guardar como plantilla, borrar.
  function abrir(id) {
    const it = CM.get(id); if (!it) return;
    const d = modal('<div id="clF"></div>');
    const pintar = () => {
      const x = CM.get(id); if (!x) { d.close(); return; }
      const P = pasos(x), H = hechos(x);
      d.querySelector('#clF').innerHTML = '<h2>✅ ' + esc(x.titulo) + '</h2><div class="fila">' + barra(x) + '</div>' +
        '<div class="cl-pasos">' + P.map((s, k) => '<label class="chk2 cl-paso' + (H.has(k) ? ' ok' : '') + '"><input type="checkbox" data-k="' + k + '"' + (H.has(k) ? ' checked' : '') + '> <span>' + esc(s) + '</span></label>').join('') + '</div>' +
        (P.length && H.size === P.length ? '<p class="ok-txt">🎉 ¡Completa!</p>' : '') +
        '<div class="btns cl-btns"><button class="ghost small" type="button" data-a="reini">↺ Reiniciar</button><button class="ghost small" type="button" data-a="edit">✏️ Editar</button>' +
        '<button class="ghost small" type="button" data-a="plant">📋 Guardar como plantilla</button><button class="ghost small" type="button" data-a="borrar">🗑️ Borrar</button><button type="button" data-cerrar>Listo</button></div>';
      d.querySelectorAll('[data-cerrar]').forEach((b) => { b.onclick = () => d.close(); });
    };
    pintar();
    d.onchange = async (e) => {
      const c = e.target.closest('input[data-k]'); if (!c) return;
      const x = CM.get(id), H = hechos(x), k = +c.dataset.k;
      if (c.checked) H.add(k); else H.delete(k);
      const ok = [...H].sort((a, b) => a - b), todo = ok.length === pasos(x).length;
      try { await CM.upd(id, { datos: Object.assign({}, x.datos, { ok }), estado: todo ? 'hecho' : 'abierto' }); if (todo) toast('🎉 Checklist completa'); } catch (er) { toast(er.message); }
      pintar();
    };
    d.onclick = async (e) => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      const x = CM.get(id), r = (x.datos || {}).rubro || rubro();
      try {
        if (b.dataset.a === 'reini') { await CM.upd(id, { datos: Object.assign({}, x.datos, { ok: [] }), estado: 'abierto' }); pintar(); }
        else if (b.dataset.a === 'edit') editor({ h: '✏️ Editar checklist', t: x.titulo, p: pasos(x) }, async (t, p) => { const H = [...hechos(x)].filter((k) => k < p.length); await CM.upd(id, { titulo: t, datos: Object.assign({}, x.datos, { p, ok: H }), estado: H.length === p.length ? 'hecho' : 'abierto' }); pintar(); });
        else if (b.dataset.a === 'plant') editor({ h: '📋 Guardar como plantilla', t: x.titulo, p: pasos(x) }, (t, p) => guardarPlantilla(null, r, t, p));
        else if (b.dataset.a === 'borrar') { if (await A.confirmar('¿Borrar la checklist "' + x.titulo + '"?', 'Borrar')) { d.close(); await CM.del(id); } }
      } catch (er) { toast(er.message); }
    };
  }
  function render(el, cab) {
    const r = rubro(), L = lista('checklist'), abiertas = L.filter((i) => i.estado !== 'hecho'), listas = L.filter((i) => i.estado === 'hecho'), PL = plantillas(r);
    let x = cab + '<div class="card"><label class="cl-rubro"><span>🏷️ Mi rubro</span><select id="clR">' + RUBROS.map((o) => '<option value="' + o[0] + '"' + (o[0] === r ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select></label>' +
      '<p class="sub">Elige tu rubro y usa sus plantillas, o crea la tuya desde cero.</p><button type="button" data-a="nueva">+ Crear desde cero</button></div>';
    x += '<div class="card"><h3>✅ En curso <span class="pill">' + abiertas.length + '</span></h3>' + (abiertas.length ? abiertas.map((i) => '<button type="button" class="cl-item" data-ver="' + i.id + '"><b>' + esc(i.titulo) + '</b><span class="fila">' + barra(i) + '</span></button>').join('') : '<p class="empty">Ninguna en curso. Usa una plantilla 👇</p>') + '</div>';
    x += '<div class="card"><h3>📋 Plantillas · ' + esc(nomRubro(r)) + '</h3>' + PL.map((p, k) => '<div class="cl-plant"><div class="grow"><b>' + esc(p.t) + '</b> ' + (p.mia ? '<span class="pill info">tuya</span>' : '<span class="pill">✨ de fábrica</span>') + '<div class="sub">' + p.p.length + ' pasos · ' + esc(p.p.slice(0, 3).join(' · ')) + (p.p.length > 3 ? '…' : '') + '</div></div>' +
      '<div class="cl-acc"><button type="button" class="small" data-usar="' + k + '">Usar</button><button type="button" class="small ghost" data-edp="' + k + '" aria-label="Editar plantilla">✏️</button>' +
      (p.mia ? '<button type="button" class="small ghost" data-bop="' + k + '" aria-label="' + (p.base ? 'Restaurar la de fábrica' : 'Borrar plantilla') + '">' + (p.base ? '↺' : '🗑️') + '</button>' : '') + '</div></div>').join('') + '</div>';
    if (listas.length) x += '<details class="card"' + (ui.abiertas ? ' open' : '') + ' id="clH"><summary>🎉 Completas (' + listas.length + ')</summary>' + listas.map((i) => '<button type="button" class="cl-item" data-ver="' + i.id + '"><b>' + esc(i.titulo) + '</b><span class="sub">' + (i.hecho_at ? A.fCorta(CM.diaDe(i.hecho_at)) : '') + '</span></button>').join('') + '</details>';
    el.innerHTML = x;
    const h = el.querySelector('#clH'); if (h) h.ontoggle = () => { ui.abiertas = h.open; };
    el.querySelector('#clR').onchange = async (e) => { try { await CM.guardarPrefs({ rubro: e.target.value }); CM.pintar(); } catch (er) { toast(er.message); } };
    el.onclick = async (e) => {
      const b = e.target.closest('[data-a],[data-ver],[data-usar],[data-edp],[data-bop],[data-tv]'); if (!b) return;
      if (b.dataset.tv) return; // pestañas: las maneja el Tablero
      const d = b.dataset;
      try {
        if (d.a === 'nueva') editor({ h: '+ Nueva checklist' }, async (t, p) => { const it = await CM.add('checklist', { titulo: t, datos: { p, ok: [], rubro: r } }); abrir(it.id); });
        else if (d.ver) abrir(d.ver);
        else if (d.usar) await usar(PL[+d.usar], r);
        else if (d.edp) { const p = PL[+d.edp]; editor({ h: '✏️ Editar plantilla', t: p.t, p: p.p }, (t, ps) => guardarPlantilla(p, r, t, ps)); }
        else if (d.bop) { const p = PL[+d.bop]; if (await A.confirmar(p.base ? '¿Volver a la plantilla de fábrica? Se borra tu versión.' : '¿Borrar la plantilla "' + p.t + '"? Las checklists ya creadas siguen.', p.base ? 'Volver' : 'Borrar')) await CM.del(p.id); }
      } catch (er) { toast(er.message); }
    };
  }
  CM.mod.checklist = { render, RUBROS, FAB };
})();
