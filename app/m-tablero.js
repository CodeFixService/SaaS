/* Centro de Mando · Tablero: tareas y proyectos en columnas (Por hacer / En curso / Hecho). */
(function () {
  'use strict';
  const A = App, CM = window.CM, { esc, hoy, toast, modal } = A;
  const ui = { f: 'todo', tipo: 'tarea' };
  const COLS = [['abierto', 'Por hacer'], ['en_curso', 'En curso'], ['hecho', 'Hecho']];
  const WIP = () => Number((CM.cuenta.prefs || {}).wip) || 3;

  function pedirDonde(it) {
    return new Promise((ok) => {
      const d = modal('<h2>¿Dónde quedaste?</h2><p class="muted">Una línea para retomar sin perderte: qué falta o cuál es el siguiente paso.</p><input id="dq" maxlength="200" value="' + esc((it.datos || {}).donde || '') + '" placeholder="Ej: falta conectar el pago"><div class="btns"><button class="ghost" data-cerrar type="button">Omitir</button><button id="dqOk" type="button">Guardar</button></div>');
      d.querySelector('#dqOk').onclick = async () => { const v = d.querySelector('#dq').value.trim(); d.close(); if (v) await CM.datos(it.id, { donde: v }); };
      d.addEventListener('close', () => ok());
      d.querySelector('#dq').focus();
    });
  }
  async function mover(it, est) {
    if (!it || est === it.estado) return;
    if (est === 'en_curso') {
      const n = CM.items.filter((i) => (i.tipo === 'tarea' || i.tipo === 'proyecto') && i.estado === 'en_curso').length;
      if (n >= WIP() && !(await A.confirmar('Ya tienes ' + n + ' cosas en curso. Terminar una antes de empezar otra evita el agobio. ¿Empezar igual?', 'Empezar igual'))) return;
    }
    if (it.tipo === 'proyecto' && it.estado === 'en_curso' && est === 'abierto') await pedirDonde(it);
    await CM.upd(it.id, { estado: est });
    if (est === 'hecho') toast('Terminado. Date un respiro.');
  }
  function tarjeta(i) {
    const e = CM.espacio(i.espacio_id), h = hoy(), sub = CM.hijos(i.id, 'tarea'), sh = sub.filter((s) => s.estado === 'hecho').length;
    const idx = COLS.findIndex((c) => c[0] === i.estado);
    return '<div class="tk" draggable="true" data-id="' + i.id + '"><button type="button" class="tit" data-act="ficha" data-id="' + i.id + '">' + esc(i.titulo) + '</button>' +
      '<div class="meta">' + (i.tipo === 'proyecto' ? '<span class="pill info">proyecto</span>' : '') + (e ? '<span class="pt"><i style="background:' + esc(e.color) + '"></i>' + esc(e.nombre) + '</span>' : '') +
      (i.prioridad === 3 ? '<span class="pill warn">Top</span>' : i.prioridad === 2 ? '<span class="pill bad">urgente</span>' : '') +
      (i.fecha ? '<span class="pill' + (i.fecha < h && i.estado !== 'hecho' ? ' bad' : '') + '">' + A.fCorta(i.fecha) + '</span>' : '') + (sub.length ? '<span class="pill">' + sh + '/' + sub.length + '</span>' : '') + '</div>' +
      (i.tipo === 'proyecto' && i.datos.donde ? '<p class="donde">' + CM.ico('flecha', 13) + ' ' + esc(i.datos.donde) + '</p>' : '') +
      '<div class="mv">' + (idx > 0 ? '<button type="button" class="x" data-mv="' + COLS[idx - 1][0] + '" data-id="' + i.id + '" aria-label="Mover atrás">' + CM.ico('izq', 16) + '</button>' : '<span></span>') +
      (idx < 2 ? '<button type="button" class="x" data-mv="' + COLS[idx + 1][0] + '" data-id="' + i.id + '" aria-label="Mover adelante">' + CM.ico('der', 16) + '</button>' : '') + '</div></div>';
  }
  function render(el) {
    const h = hoy(), lim = WIP();
    let L = CM.items.filter((i) => (i.tipo === 'tarea' || i.tipo === 'proyecto') && CM.enEsp(i) && !i.padre);
    if (ui.f !== 'todo') L = L.filter((i) => i.tipo === ui.f);
    const enCurso = L.filter((i) => i.estado === 'en_curso').length;
    let x = '<div class="titulo-v"><h2>Tablero</h2><span class="sub">' + L.filter((i) => i.estado !== 'hecho').length + ' abiertas</span></div>' + CM.selectorEspacio();
    x += '<div class="chips" id="fTipo">' + [['todo', 'Todo'], ['tarea', 'Tareas'], ['proyecto', 'Proyectos']].map((t) => '<button type="button" class="chip' + (ui.f === t[0] ? ' on' : '') + '" data-f="' + t[0] + '">' + t[1] + '</button>').join('') + '</div>';
    x += '<div class="card cap-card"><div class="cap"><input id="tkIn" maxlength="200" placeholder="Nueva tarea o proyecto…" autocomplete="off"><select id="tkTipo" aria-label="Tipo"><option value="tarea"' + (ui.tipo === 'tarea' ? ' selected' : '') + '>Tarea</option><option value="proyecto"' + (ui.tipo === 'proyecto' ? ' selected' : '') + '>Proyecto</option></select><button type="button" id="tkOk" aria-label="Agregar">' + CM.ico('plus', 20) + '</button></div></div>';
    x += '<div class="cols">' + COLS.map((c) => {
      let l = L.filter((i) => i.estado === c[0]);
      let extra = '';
      if (c[0] === 'hecho') { const todas = l.length; l = l.filter((i) => i.hecho_at && Date.now() - new Date(i.hecho_at) < 14 * 864e5).sort((a, b) => b.hecho_at.localeCompare(a.hecho_at)).slice(0, 15); if (todas > l.length) extra = '<p class="sub">+' + (todas - l.length) + ' terminadas antes (en Panel y Logros)</p>'; }
      else l = l.sort((a, b) => b.prioridad - a.prioridad || (a.fecha || '9').localeCompare(b.fecha || '9') || a.created_at.localeCompare(b.created_at));
      return '<div class="col" data-col="' + c[0] + '"><h3>' + c[1] + ' <span class="pill' + (c[0] === 'en_curso' && enCurso > lim ? ' bad' : '') + '">' + l.length + '</span></h3>' +
        (c[0] === 'en_curso' && enCurso > lim ? '<p class="sub warn">Demasiado en curso. Termina una antes de empezar otra.</p>' : '') +
        (l.length ? l.map(tarjeta).join('') : '<p class="empty">Vacío</p>') + extra + '</div>';
    }).join('') + '</div>';
    el.innerHTML = x;
    CM.alSelectorEspacio(el);
    const inp = el.querySelector('#tkIn');
    async function agregar() {
      const t = inp.value.trim(); if (!t) return;
      try { await CM.add(ui.tipo, { titulo: t }); inp.value = ''; setTimeout(() => { const n = document.getElementById('tkIn'); if (n) n.focus(); }, 80); } catch (e) { toast(e.message); }
    }
    inp.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); agregar(); } };
    el.querySelector('#tkOk').onclick = agregar;
    el.querySelector('#tkTipo').onchange = (e) => { ui.tipo = e.target.value; };
    el.onclick = async (e) => {
      const b = e.target.closest('[data-act],[data-mv],[data-f]'); if (!b) return;
      try {
        if (b.dataset.f) { ui.f = b.dataset.f; CM.pintar(); }
        else if (b.dataset.mv) await mover(CM.get(b.dataset.id), b.dataset.mv);
        else if (b.dataset.act === 'ficha') CM.ficha(b.dataset.id);
      } catch (er) { toast(er.message); }
    };
    // Arrastrar y soltar (escritorio)
    el.ondragstart = (e) => { const t = e.target.closest('.tk'); if (t) { e.dataTransfer.setData('text/plain', t.dataset.id); e.dataTransfer.effectAllowed = 'move'; } };
    el.ondragover = (e) => { if (e.target.closest('.col')) e.preventDefault(); };
    el.ondrop = (e) => { const c = e.target.closest('.col'); if (!c) return; e.preventDefault(); const id = e.dataTransfer.getData('text/plain'); mover(CM.get(id), c.dataset.col).catch((er) => toast(er.message)); };
  }
  CM.mod.tablero = { render };
})();
