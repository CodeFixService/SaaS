/* Centro de Mando · Hoy = "Lo que me falta": lo que tiene fecha, ordenado por categoría y con casilla para tachar ahí mismo.
   Atrasado · Hoy (por hora) · Próximos días · Ideas · Problemas · Notas · Hábitos. Al tachar queda guardado en su sección (Más).
   Lo del Tablero (tareas sin fecha, en curso y proyectos) se queda en el Tablero: aquí solo aparece un resumen con un acceso. */
(function () {
  'use strict';
  const A = App, CM = window.CM, { esc, hoy, sumarDias, toast } = A;
  const ui = { ver: {} };
  let plegado = {};
  try { plegado = JSON.parse(localStorage.getItem('cm:plegado')) || {}; } catch (e) { plegado = {}; }
  const ABIERTO = { tarea: ['abierto', 'en_curso'], recordatorio: ['abierto', 'avisado'], pedido: ['abierto', 'listo'], idea: ['nueva'], problema: ['abierto'], nota: ['abierto'] };
  const pend = (i) => (ABIERTO[i.tipo] || []).includes(i.estado);
  const diaDe = (i) => i.tipo === 'recordatorio' ? (i.aviso_at ? CM.diaDe(i.aviso_at) : '') : (i.fecha || '');
  const horaDe = (i) => i.tipo === 'recordatorio' ? (i.aviso_at ? new Date(i.aviso_at).toTimeString().slice(0, 5) : '') : ((i.datos || {}).hora || '');
  const ETQ = { tarea: '', recordatorio: 'Recordar', pedido: 'Pedido', idea: 'Idea', problema: 'Problema', nota: 'Nota' };
  const orden = (a, b) => (horaDe(a) || '99').localeCompare(horaDe(b) || '99') || (b.prioridad || 0) - (a.prioridad || 0) || a.created_at.localeCompare(b.created_at);

  function fila(i, conTipo) {
    const hecho = !pend(i), h = horaDe(i), d = i.datos || {};
    const titulo = i.tipo === 'pedido' ? 'Entregar pedido de ' + i.titulo : i.titulo || (i.cuerpo || '').slice(0, 80) || '(sin título)';
    const sub = [];
    if (i.tipo === 'pedido') sub.push((d.items || []).map((x) => x.que).slice(0, 3).join(', ') + (i.estado === 'listo' ? ' · listo' : ''));
    if (i.tipo === 'nota' && i.cuerpo && i.titulo) sub.push(i.cuerpo.slice(0, 70));
    if (d.rep && d.rep.length) sub.push('se repite');
    const sh = CM.hijos(i.id, 'tarea'); if (sh.length) sub.push(sh.filter((s) => s.estado === 'hecho').length + '/' + sh.length + ' pasos');
    return '<div class="fila p-f' + (hecho ? ' hecha' : '') + '"><button type="button" class="chk' + (hecho ? ' on' : '') + '" data-act="ok" data-id="' + i.id + '" aria-label="' + (hecho ? 'Desmarcar' : 'Marcar como listo') + '">' + (hecho ? CM.ico('check', 14) : '') + '</button>' +
      '<button type="button" class="grow tit" data-act="ficha" data-id="' + i.id + '">' + (i.prioridad === 3 ? CM.ico('estrella', 13) + ' ' : '') + esc(titulo) + (sub.length ? '<small class="muted">' + esc(sub.join(' · ')) + '</small>' : '') + '</button>' +
      (conTipo && ETQ[i.tipo] ? '<span class="pill">' + ETQ[i.tipo] + '</span>' : '') + (h && !hecho ? '<span class="hora">' + esc(h) + '</span>' : '') + '</div>';
  }
  function seccion(k, titulo, ico, L, opc) {
    if (!L.length) return '';
    opc = opc || {};
    const cerrado = plegado[k], max = opc.max || 8, ver = ui.ver[k] ? L.length : max, n = L.filter((i) => pend(i)).length;
    return '<div class="card sec-c ' + (opc.clase || '') + '"><button type="button" class="sec-t" data-pleg="' + k + '"><span class="ico-s">' + CM.ico(ico, 17) + '</span><b>' + titulo + '</b><span class="pill' + (opc.pill ? ' ' + opc.pill : '') + '">' + n + '</span><span class="flecha' + (cerrado ? '' : ' on') + '">' + CM.ico('der', 16) + '</span></button>' +
      (cerrado ? '' : (opc.cuerpo ? opc.cuerpo(L.slice(0, ver)) : L.slice(0, ver).map((i) => fila(i, opc.conTipo)).join('')) + (L.length > ver ? '<button type="button" class="small ghost" data-mas="' + k + '">Ver ' + (L.length - ver) + ' más</button>' : '')) + '</div>';
  }

  function render(el) {
    const h = hoy(), c = CM.cuenta, trab = CM.ahoraTrabajo(), en7 = sumarDias(h, 7);
    const I = CM.items.filter((i) => ABIERTO[i.tipo] && CM.enEsp(i));
    const conFecha = I.filter((i) => ['tarea', 'recordatorio', 'pedido'].includes(i.tipo));
    const atras = conFecha.filter((i) => pend(i) && diaDe(i) && diaDe(i) < h).sort((a, b) => diaDe(a).localeCompare(diaDe(b)) || orden(a, b));
    const hoyL = conFecha.filter((i) => (pend(i) && diaDe(i) === h) || (!pend(i) && CM.diaDe(i.hecho_at) === h && (diaDe(i) <= h))).sort((a, b) => (!pend(a)) - (!pend(b)) || orden(a, b));
    const prox = conFecha.filter((i) => pend(i) && diaDe(i) > h && diaDe(i) <= en7).sort((a, b) => diaDe(a).localeCompare(diaDe(b)) || orden(a, b));
    const tab = CM.items.filter((i) => (i.tipo === 'tarea' || i.tipo === 'proyecto') && CM.enEsp(i) && !i.padre && !i.fecha && ['abierto', 'en_curso'].includes(i.estado));
    const tabCurso = tab.filter((i) => i.estado === 'en_curso').length;
    const ideas = I.filter((i) => i.tipo === 'idea' && pend(i)).sort((a, b) => CM.scoreIdea(b) - CM.scoreIdea(a));
    const probs = I.filter((i) => i.tipo === 'problema' && pend(i)).sort((a, b) => b.created_at.localeCompare(a.created_at));
    const notas = I.filter((i) => i.tipo === 'nota' && pend(i)).sort((a, b) => b.created_at.localeCompare(a.created_at));
    const hab = CM.items.filter((i) => i.tipo === 'habito' && CM.programado(i, h) && CM.enEsp(i));
    const total = atras.length + hoyL.filter(pend).length + prox.length + ideas.length + probs.length + notas.length;
    const fecha = new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
    const hr = new Date().getHours(), saludo = hr < 12 ? 'Buenos días' : hr < 20 ? 'Buenas tardes' : 'Buenas noches';

    let x = CM.guiaCard() + '<div class="hero"><div><p class="sub cap">' + esc(fecha) + '</p><h2>' + saludo + (c.nombre ? ', ' + esc(c.nombre.split(' ')[0]) : '') + '</h2>' +
      '<p class="estado ' + (trab ? 'trab' : 'desc') + '">' + CM.ico(trab ? 'maletin' : 'luna', 16) + (trab ? 'Horario de trabajo · ' + esc(trab.nombre) + ' hasta las ' + esc(trab.horario.hasta) : 'Fuera de horario de trabajo: baja el ritmo') + '</p></div></div>';
    x += '<div class="kpis"><div class="kpi' + (atras.length ? ' mal' : '') + '"><b>' + atras.length + '</b><small>atrasadas</small></div><div class="kpi"><b>' + hoyL.filter(pend).length + '</b><small>para hoy</small></div>' +
      '<div class="kpi"><b>' + CM.completados(h, h).length + '</b><small>listas hoy</small></div></div>';
    // Anotar sin salir de aquí (entiende "mañana a las 10 …", "idea: …", "pedido de …")
    x += '<div class="cap"><input id="cap" maxlength="200" placeholder="Anota algo… (ej: mañana a las 10 llamar a Maya)" autocomplete="off"><button type="button" id="capOk" aria-label="Anotar">' + CM.ico('plus', 20) + '</button></div><p class="sub" id="capAyu"></p>';
    x += CM.selectorEspacio();
    if (!total && !hoyL.length) x += '<div class="card"><p class="empty">' + CM.ico('check', 18) + ' No te falta nada. Anota lo que se te ocurra con el <b>+</b>.</p></div>';
    x += seccion('atras', 'Atrasado', 'alerta', atras, { clase: 'mal', pill: 'bad', conTipo: true });
    x += seccion('hoy', 'Hoy', 'hoy', hoyL, { conTipo: true, max: 20 });
    x += seccion('prox', 'Próximos días', 'reloj', prox, { max: 15, cuerpo: (L) => { let dp = ''; return L.map((i) => { const dd = diaDe(i), sep = dd !== dp ? '<p class="dia-sep">' + (dd === sumarDias(h, 1) ? 'Mañana' : A.fechaDe(dd).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'short' })) + '</p>' : ''; dp = dd; return sep + fila(i, true); }).join(''); } });
    if (tab.length) x += '<div class="card sec-c"><button type="button" class="sec-t" data-ir="tablero" style="background:transparent;color:inherit;box-shadow:none;width:100%"><span class="ico-s">' + CM.ico('tablero', 17) + '</span><b>Tablero</b><span class="sub grow" style="text-align:left;margin-left:6px">' +
      (tab.length - tabCurso) + ' por hacer · ' + tabCurso + ' en curso (sin fecha)</span><span class="flecha">' + CM.ico('der', 16) + '</span></button></div>';
    x += seccion('ideas', 'Ideas', 'cerebro', ideas, { max: 5 });
    x += seccion('probs', 'Problemas', 'alerta', probs, { max: 5 });
    x += seccion('notas', 'Notas', 'libro', notas, { max: 5 });
    if (hab.length) x += seccion('hab', 'Hábitos de hoy', 'fuego', hab, { cuerpo: (L) => L.map((hb) => { const on = CM.cumplido(hb, h); return '<div class="fila' + (on ? ' hecha' : '') + '"><button type="button" class="chk' + (on ? ' on' : '') + '" data-act="habito" data-id="' + hb.id + '">' + (on ? CM.ico('check', 14) : '') + '</button><span class="grow">' + esc(hb.titulo) + '</span></div>'; }).join('') });
    el.innerHTML = x;
    CM.alSelectorEspacio(el);

    const inp = el.querySelector('#cap'), ayu = el.querySelector('#capAyu');
    inp.oninput = () => { const r = CM.entender(inp.value); ayu.textContent = inp.value.trim() ? 'Se guarda como ' + ({ tarea: 'tarea', recordatorio: 'recordatorio', idea: 'idea', problema: 'problema', pedido: 'pedido (se abre para completarlo)' }[r.tipo] || 'nota') + (r.fecha ? ' · ' + A.fCorta(r.fecha) : '') + (r.hora ? ' · ' + r.hora : '') : ''; };
    async function capturar() {
      const t = inp.value.trim(); if (!t) { CM.anotar(); return; }
      const r = CM.entender(t), titulo = r.titulo || t;
      try {
        if (r.tipo === 'pedido') { inp.value = ''; ayu.textContent = ''; CM.pedido(null, { titulo }); return; }
        if (r.tipo === 'recordatorio') await CM.add('recordatorio', { titulo, aviso_at: new Date((r.fecha || h) + 'T' + (r.hora || '09:00')).toISOString() });
        else if (r.tipo === 'tarea') await CM.add('tarea', { titulo, fecha: r.fecha || h, datos: r.hora ? { hora: r.hora } : {} });
        else if (r.tipo === 'idea' || r.tipo === 'problema') await CM.add(r.tipo, { titulo, datos: r.tipo === 'idea' ? { impacto: 3, ganas: 3, esfuerzo: 3 } : {} });
        else await CM.add('nota', { titulo: t.slice(0, 200) });
        inp.value = ''; ayu.textContent = ''; toast('Anotado');
        setTimeout(() => { const n = document.getElementById('cap'); if (n) n.focus(); }, 80);
      } catch (e) { toast(e.message); }
    }
    inp.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); capturar(); } };
    el.querySelector('#capOk').onclick = capturar;
    el.onclick = async (e) => {
      const b = e.target.closest('[data-act],[data-pleg],[data-mas],[data-ir]'); if (!b) return;
      if (b.dataset.pleg) { plegado[b.dataset.pleg] = !plegado[b.dataset.pleg]; try { localStorage.setItem('cm:plegado', JSON.stringify(plegado)); } catch (er) { /* sin espacio */ } CM.pintar(); return; }
      if (b.dataset.mas) { ui.ver[b.dataset.mas] = true; CM.pintar(); return; }
      if (b.dataset.ir) { CM.ir(b.dataset.ir); return; }
      const id = b.dataset.id, it = id && CM.get(id);
      try {
        switch (b.dataset.act) {
          case 'tour': CM.tour(); break;
          case 'guiaX': await CM.guardarPrefs({ guia: 'ok' }); CM.pintar(); break;
          case 'ficha': CM.ficha(id); break;
          case 'habito': await CM.toggleHabito(it, h); break;
          case 'ok':
            if (pend(it)) { await CM.completar(it); if (!(it.datos && it.datos.rep)) toast(it.tipo === 'pedido' ? 'Pedido entregado' : 'Listo ✓'); }
            else await CM.upd(id, { estado: ABIERTO[it.tipo][0] });
            break;
        }
      } catch (er) { toast(er.message); }
    };
  }
  CM.mod.hoy = { render };
  CM.cargarMod('insights').then(() => CM.emit()).catch(() => {});
})();
