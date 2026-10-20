/* Centro de Mando · Hoy: Top 3, checklist, hábitos, propuesta del día, ánimo y consejos. */
(function () {
  'use strict';
  const A = App, CM = window.CM, { esc, hoy, sumarDias, toast } = A;
  const ui = { tipo: 'tarea', hoy: true };
  const TIPOS = [['tarea', 'Tarea'], ['idea', 'Idea'], ['nota', 'Nota'], ['problema', 'Problema'], ['recordatorio', 'Recordar']];
  const chk = (on, act, id) => '<button type="button" class="chk' + (on ? ' on' : '') + '" data-act="' + act + '" data-id="' + id + '" aria-label="Marcar">' + (on ? CM.ico('check', 14) : '') + '</button>';
  const pt = (i) => { const e = CM.espacio(i.espacio_id); return e ? '<span class="pt"><i style="background:' + esc(e.color) + '"></i>' + esc(e.nombre) + '</span>' : ''; };
  function fila(i) {
    const h = hoy(), venc = i.fecha && i.fecha < h && i.estado !== 'hecho';
    const sub = CM.hijos(i.id, 'tarea'), sh = sub.filter((s) => s.estado === 'hecho').length;
    return '<div class="fila' + (i.estado === 'hecho' ? ' hecha' : '') + '" data-id="' + i.id + '">' + chk(i.estado === 'hecho', 'tarea', i.id) +
      '<button type="button" class="grow tit" data-act="ficha" data-id="' + i.id + '">' + esc(i.titulo) + '</button>' +
      (venc ? '<span class="pill bad">vencida</span>' : '') + (sub.length ? '<span class="pill">' + sh + '/' + sub.length + '</span>' : '') + (i.estado === 'en_curso' ? '<span class="pill info">en curso</span>' : '') + pt(i) + '</div>';
  }
  function propuesta(excluir) {
    const h = hoy(), trab = CM.ahoraTrabajo();
    const modoHoy = trab ? 'trabajo' : 'personal';
    return CM.items.filter((i) => i.tipo === 'tarea' && i.estado !== 'hecho' && i.prioridad !== 3 && !excluir.has(i.id)).map((i) => {
      let p = i.prioridad * 2, why = [];
      if (i.fecha && i.fecha <= h) { p += 4; why.push(i.fecha < h ? 'vencida' : 'es para hoy'); }
      if (i.estado === 'en_curso') { p += 3; why.push('ya la empezaste'); }
      const d = Math.floor((Date.now() - new Date(i.created_at)) / 864e5); if (d >= 4) { p += Math.min(5, d / 4); why.push('lleva ' + d + ' días'); }
      const pa = i.padre && CM.get(i.padre); if (pa && pa.tipo === 'meta') { p += 1.5; why.push('de tu meta "' + pa.titulo + '"'); }
      const e = CM.espacio(i.espacio_id); if (e && e.modo === modoHoy) p += 3;
      return { i, p, why: why.slice(0, 2).join(' · ') || 'sin fecha' };
    }).sort((a, b) => b.p - a.p).slice(0, 3);
  }
  function diarioHoy() { return CM.items.find((i) => i.tipo === 'diario' && i.fecha === hoy()); }

  function render(el) {
    const h = hoy(), trab = CM.ahoraTrabajo(), c = CM.cuenta, T = CM.items.filter((i) => i.tipo === 'tarea' && CM.enEsp(i));
    const top = T.filter((i) => i.prioridad === 3 && ((i.estado !== 'hecho' && (!i.fecha || i.fecha <= h)) || (i.estado === 'hecho' && CM.diaDe(i.hecho_at) === h)));
    const topAb = top.filter((i) => i.estado !== 'hecho');
    const lista = T.filter((i) => i.prioridad !== 3 && ((i.estado !== 'hecho' && ((i.fecha && i.fecha <= h) || i.estado === 'en_curso')) || (i.estado === 'hecho' && CM.diaDe(i.hecho_at) === h))).sort((a, b) => (a.estado === 'hecho') - (b.estado === 'hecho') || (a.fecha || '') .localeCompare(b.fecha || ''));
    const hab = CM.items.filter((i) => i.tipo === 'habito' && CM.programado(i, h) && CM.enEsp(i));
    const rec = CM.items.filter((i) => i.tipo === 'recordatorio' && i.estado === 'abierto' && i.aviso_at && CM.diaDe(i.aviso_at) <= h).sort((a, b) => a.aviso_at.localeCompare(b.aviso_at)).slice(0, 4);
    const prop = topAb.length < 3 ? propuesta(new Set(top.map((x) => x.id))).slice(0, 3 - topAb.length) : [];
    const hechasHoy = CM.completados(h, h).length, racha = CM.racha();
    const u = CM.estadoUso || (CM.uso.find((x) => x.dia === h) ? { app_min: CM.uso.find((x) => x.dia === h).app_min, trabajo_min: CM.uso.find((x) => x.dia === h).trabajo_min, descanso_min: CM.uso.find((x) => x.dia === h).descanso_min } : { app_min: 0, trabajo_min: 0, descanso_min: 0 });
    const di = diarioHoy(), dd = (di && di.datos) || {};
    let ins = [];
    try { if (CM.insights) ins = CM.insights(Math.min(2, CM.limiteInsights())); } catch (e) { ins = []; }
    const fecha = new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
    const hora = new Date().getHours(), saludo = hora < 12 ? 'Buenos días' : hora < 20 ? 'Buenas tardes' : 'Buenas noches';

    let x = '<div class="frase"><span>✨</span><p>' + esc(CM.frase()) + '</p></div>' + CM.guiaCard() + '<div class="hero"><div><p class="sub cap">' + esc(fecha) + '</p><h2>' + saludo + (c.nombre ? ', ' + esc(c.nombre.split(' ')[0]) : '') + '</h2>' +
      '<p class="estado ' + (trab ? 'trab' : 'desc') + '">' + CM.ico(trab ? 'maletin' : 'luna', 16) + (trab ? 'Horario de trabajo · ' + esc(trab.nombre) + ' hasta las ' + esc(trab.horario.hasta) : 'Fuera de horario de trabajo: baja el ritmo') + '</p></div>' +
      '<button type="button" class="aterriza" data-act="aterrizar">' + CM.ico('ancla', 22) + '<span>Aterrizar</span></button></div>';
    x += '<div class="kpis"><div class="kpi"><span class="ic-f">' + CM.ico('fuego', 18) + '</span><b>' + racha + '</b><small>días de racha</small></div>' +
      '<div class="kpi"><span class="ic-f ok">' + CM.ico('check', 18) + '</span><b>' + hechasHoy + '</b><small>cumplidas hoy</small></div>' +
      '<div class="kpi"><span class="ic-f">' + CM.ico('reloj', 18) + '</span><b>' + CM.minTxt(u.app_min || 0) + '</b><small>en la app hoy</small></div></div>';
    x += CM.selectorEspacio();
    // captura rápida
    x += '<div class="card cap-card"><div class="chips" id="tiposCap">' + TIPOS.map((t) => '<button type="button" class="chip' + (ui.tipo === t[0] ? ' on' : '') + '" data-t="' + t[0] + '">' + t[1] + '</button>').join('') + '</div>' +
      '<div class="cap"><input id="cap" maxlength="200" placeholder="Saca algo de tu cabeza… y Enter" autocomplete="off"><button type="button" id="capOk" aria-label="Agregar">' + CM.ico('plus', 20) + '</button></div>' +
      (ui.tipo === 'tarea' ? '<label class="check"><input type="checkbox" id="capHoy"' + (ui.hoy ? ' checked' : '') + '> Para hoy</label>' : '') + '</div>';
    // top 3
    x += '<div class="card"><h2>Top 3 de hoy <span class="pill">' + top.filter((i) => i.estado === 'hecho').length + '/' + Math.max(3, top.length) + '</span></h2>';
    if (!top.length) x += '<p class="empty">Elige lo que, si sale, hace que el día valga la pena.</p>';
    x += top.map(fila).join('');
    if (topAb.length > 3) x += '<p class="sub warn">Marcaste ' + topAb.length + ' como Top. Deja solo 3: lo demás pasa a la lista normal.</p>';
    if (prop.length) {
      x += '<div class="prop"><p class="sub">' + CM.ico('chispa', 14) + ' Propuesta para hoy' + (trab ? ' (horario de trabajo)' : ' (fuera de horario)') + '</p>' +
        prop.map((p) => '<div class="fila"><button type="button" class="grow tit" data-act="ficha" data-id="' + p.i.id + '">' + esc(p.i.titulo) + '<small class="muted">' + esc(p.why) + '</small></button><button type="button" class="small" data-act="top" data-id="' + p.i.id + '">Al Top</button></div>').join('') + '</div>';
    }
    x += '</div>';
    // checklist
    x += '<div class="card"><h2>Para hoy <span class="pill">' + lista.filter((i) => i.estado !== 'hecho').length + '</span></h2>' + (lista.length ? lista.map(fila).join('') : '<p class="empty">Nada más por ahora. Disfruta el espacio.</p>') + '</div>';
    if (hab.length) {
      x += '<div class="card"><h2>Hábitos de hoy</h2>' + hab.map((hb) => {
        const on = CM.cumplido(hb, h), rc = CM.rachaHabito(hb);
        return '<div class="fila' + (on ? ' hecha' : '') + '">' + chk(on, 'habito', hb.id) + '<span class="grow">' + esc(hb.titulo) + '</span>' + (rc ? '<span class="pill warn">' + CM.ico('fuego', 12) + ' ' + rc + '</span>' : '') + pt(hb) + '</div>';
      }).join('') + '</div>';
    }
    if (rec.length) x += '<div class="card"><h2>Recordatorios</h2>' + rec.map((r) => '<div class="fila">' + chk(false, 'rec', r.id) + '<button type="button" class="grow tit" data-act="ficha" data-id="' + r.id + '">' + esc(r.titulo) + '<small class="muted">' + new Date(r.aviso_at).toLocaleString('es-CL', { weekday: 'short', hour: '2-digit', minute: '2-digit' }) + '</small></button></div>').join('') + '</div>';
    // ánimo
    const esc5 = (k, v, L) => '<div class="esc5" data-k="' + k + '">' + [1, 2, 3, 4, 5].map((n) => '<button type="button" class="' + (v === n ? 'on' : '') + '" data-v="' + n + '" aria-label="' + L[n][1] + '" title="' + L[n][1] + '"><span>' + L[n][0] + '</span><small>' + L[n][1] + '</small></button>').join('') + '</div>';
    x += '<div class="card"><h2>¿Cómo vas hoy?</h2><div class="row2"><div><p class="sub">Energía</p>' + esc5('energia', dd.energia, CM.ENERGIA) + '</div><div><p class="sub">Ánimo</p>' + esc5('animo', dd.animo, CM.ANIMO) + '</div></div></div>';
    if (ins.length) x += '<div class="card"><h2>Lo que he notado</h2>' + ins.map(CM.tarjetaInsight).join('') + '<button class="small ghost" data-ir="panel" type="button">Ver análisis completo</button></div>';
    el.innerHTML = x;
    CM.alSelectorEspacio(el);
    const inp = el.querySelector('#cap');
    async function capturar() {
      const t = inp.value.trim(); if (!t) return;
      try {
        if (ui.tipo === 'recordatorio') { inp.value = ''; CM.ficha(null, 'recordatorio', { titulo: t }); return; }
        const o = { titulo: t };
        if (ui.tipo === 'tarea' && ui.hoy) o.fecha = hoy();
        if (ui.tipo === 'idea') o.datos = { impacto: 3, ganas: 3, esfuerzo: 3 };
        await CM.add(ui.tipo, o); inp.value = '';
        toast(ui.tipo === 'tarea' ? 'Tarea agregada' : 'Guardado');
        setTimeout(() => { const n = document.getElementById('cap'); if (n) n.focus(); }, 80);
      } catch (e) { toast(e.message); }
    }
    inp.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); capturar(); } };
    el.querySelector('#capOk').onclick = capturar;
    el.onclick = async (e) => {
      const b = e.target.closest('[data-act],[data-t],[data-ir],[data-v]'); if (!b) return;
      try {
        if (b.dataset.t) { ui.tipo = b.dataset.t; CM.pintar(); return; }
        if (b.dataset.ir) { CM.ir(b.dataset.ir); return; }
        if (b.dataset.v) {
          const k = b.parentNode.dataset.k, v = Number(b.dataset.v);
          b.parentNode.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
          ui.dq = (ui.dq || Promise.resolve()).then(async () => { const d0 = diarioHoy(); if (d0) await CM.datos(d0.id, { [k]: v }); else await CM.add('diario', { titulo: 'Diario', fecha: hoy(), datos: { [k]: v } }); CM.aplicarTema(); }).catch((er) => toast(er.message));
          return;
        }
        const id = b.dataset.id, it = id && CM.get(id);
        switch (b.dataset.act) {
          case 'aterrizar': CM.aterrizar(); break;
          case 'tour': CM.tour(); break;
          case 'guiaX': await CM.guardarPrefs({ guia: 'ok' }); CM.pintar(); break;
          case 'ficha': CM.ficha(id); break;
          case 'tarea': {
            const hecho = it.estado === 'hecho';
            await CM.upd(id, { estado: hecho ? 'abierto' : 'hecho' });
            if (!hecho) { const q = CM.items.filter((i) => i.tipo === 'tarea' && i.prioridad === 3 && ((i.estado !== 'hecho' && (!i.fecha || i.fecha <= hoy())) || (i.estado === 'hecho' && CM.diaDe(i.hecho_at) === hoy()))); toast(q.length >= 3 && q.every((i) => i.estado === 'hecho') ? 'Top 3 cumplido. Cierra con calma.' : 'Bien. Una menos.'); }
            break;
          }
          case 'habito': await CM.toggleHabito(it, hoy()); break;
          case 'rec': await CM.upd(id, { estado: 'hecho' }); break;
          case 'top': await CM.upd(id, { prioridad: 3, fecha: hoy() }); break;
        }
      } catch (er) { toast(er.message); }
    };
    el.querySelector('#capHoy') && (el.querySelector('#capHoy').onchange = (e) => { ui.hoy = e.target.checked; });
  }
  CM.mod.hoy = { render };
  CM.cargarMod('insights').then(() => CM.emit()).catch(() => {});
})();
