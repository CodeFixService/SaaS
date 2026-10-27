/* Centro de Mando · Cerebro: Ideas (lluvia de ideas + lo mejor), Problemas→Soluciones→Lecciones, Notas, Diario, Logros. */
(function () {
  'use strict';
  const A = App, CM = window.CM, { esc, hoy, toast, modal } = A;
  const ui = { sub: 'ideas', q: '' };
  const SUBS = [['ideas', 'Ideas'], ['problemas', 'Problemas'], ['notas', 'Notas'], ['diario', 'Diario'], ['logros', 'Logros']];
  const ord = (a, b) => b.created_at.localeCompare(a.created_at);
  const busca = (i) => !ui.q || (i.titulo + ' ' + (i.cuerpo || '')).toLowerCase().includes(ui.q);
  const fila = (i, extra) => '<div class="card fila2"><button type="button" class="tit" data-act="ficha" data-id="' + i.id + '">' + esc(i.titulo || '(sin título)') + '</button>' + (extra || '') + '<p class="sub">' + (CM.espacio(i.espacio_id) ? '<i class="dot" style="background:' + esc(CM.espacio(i.espacio_id).color) + '"></i> ' + esc(CM.espacio(i.espacio_id).nombre) + ' · ' : '') + A.fCorta(CM.diaDe(i.created_at)) + (i.cuerpo ? ' · ' + esc(i.cuerpo.slice(0, 90)) : '') + '</p></div>';

  function lluvia() {
    const d = modal('<h2>Lluvia de ideas</h2><p class="muted">5 minutos, sin juzgar. Escribe una idea por línea (Enter para agregar). Después las puntúas.</p><div class="esc5"><b id="t5">5:00</b><input id="li" maxlength="150" placeholder="Escribe y Enter" autocomplete="off"></div><ol id="ll" class="sub"></ol><div class="btns"><button class="ghost" data-cerrar type="button">Cerrar</button></div>');
    let s = 300, n = 0; const li = d.querySelector('#li');
    const t = setInterval(() => { s--; d.querySelector('#t5').textContent = Math.floor(s / 60) + ':' + CM.pad(s % 60); if (s <= 0) { clearInterval(t); li.disabled = true; toast('Tiempo. Ahora elige las mejores.'); } }, 1000);
    d.addEventListener('close', () => { clearInterval(t); CM.pintar(); });
    li.onkeydown = async (e) => { if (e.key !== 'Enter') return; e.preventDefault(); const v = li.value.trim(); if (!v) return; li.value = ''; try { await CM.add('idea', { titulo: v }); const o = document.createElement('li'); o.textContent = v; d.querySelector('#ll').prepend(o); n++; } catch (er) { toast(er.message); } };
    li.focus();
  }
  function ideas() {
    const L = CM.por('idea').filter((i) => CM.enEsp(i) && busca(i)), nu = L.filter((i) => i.estado === 'nueva').sort((a, b) => CM.scoreIdea(b) - CM.scoreIdea(a));
    const ot = L.filter((i) => i.estado !== 'nueva').sort(ord);
    let x = '<button type="button" class="big" data-act="lluvia">' + CM.ico('cerebro', 18) + ' Lluvia de ideas (5 min)</button>';
    x += nu.length ? nu.map((i, k) => '<div class="card fila2' + (k === 0 && nu.length > 1 ? ' best' : '') + '"><div class="fila"><button type="button" class="tit" data-act="ficha" data-id="' + i.id + '">' + (k === 0 && nu.length > 1 ? CM.ico('estrella', 15) + ' ' : '') + esc(i.titulo) + '</button><span class="pill info" title="Impacto × ganas ÷ esfuerzo">' + CM.scoreIdea(i).toFixed(1).replace('.', ',') + '</span></div><div class="btns-s"><button type="button" class="small" data-act="aTarea" data-id="' + i.id + '">Hacerla tarea</button><button type="button" class="small ghost" data-act="desc" data-id="' + i.id + '">Descartar</button></div></div>').join('') + '<p class="sub">La puntuación sale de impacto × ganas ÷ esfuerzo (edítalos en la idea). La primera es la mejor opción hoy.</p>' : '<p class="empty">Sin ideas nuevas. Usa la lluvia de ideas.</p>';
    if (ot.length) x += '<h3 class="sec">Decididas</h3>' + ot.slice(0, 20).map((i) => fila(i, '<span class="pill">' + esc(i.estado) + '</span>')).join('');
    return x;
  }
  function problemas() {
    const L = CM.por('problema').filter((i) => CM.enEsp(i) && busca(i)).sort((a, b) => (a.estado === 'abierto' ? 0 : 1) - (b.estado === 'abierto' ? 0 : 1) || ord(a, b));
    const lec = CM.por('leccion').filter(busca).sort(ord);
    let x = '<button type="button" class="big" data-act="nueva" data-t="problema">' + CM.ico('plus', 18) + ' Nuevo problema</button>';
    x += L.length ? L.map((p) => { const s = CM.hijos(p.id, 'solucion'); return '<div class="card fila2"><div class="fila"><button type="button" class="tit" data-act="ficha" data-id="' + p.id + '">' + esc(p.titulo) + '</button><span class="pill ' + (p.estado === 'abierto' ? 'bad' : 'ok') + '">' + (p.estado === 'abierto' ? 'abierto' : 'resuelto') + '</span></div>' +
      s.map((o) => '<p class="sol">' + CM.ico('check', 13) + ' <button type="button" class="lnk" data-act="ficha" data-id="' + o.id + '">' + esc(o.titulo) + '</button></p>').join('') +
      '<div class="btns-s"><button type="button" class="small ghost" data-act="sol" data-id="' + p.id + '">+ Solución</button>' + (p.estado === 'abierto' ? '<button type="button" class="small" data-act="resolver" data-id="' + p.id + '">Resolver</button>' : '') + '</div></div>'; }).join('') : '<p class="empty">Anota el problema, luego la solución. La próxima vez lo resuelves más rápido.</p>';
    x += '<h3 class="sec">Lecciones</h3><button type="button" class="small ghost" data-act="nueva" data-t="leccion">+ Lección</button>' + lec.slice(0, 20).map((i) => fila(i)).join('');
    return x;
  }
  function notas() {
    const L = CM.por('nota').filter((i) => CM.enEsp(i) && busca(i)).sort(ord);
    return '<button type="button" class="big" data-act="nueva" data-t="nota">' + CM.ico('plus', 18) + ' Nueva nota</button>' + (L.length ? L.slice(0, 60).map((i) => fila(i)).join('') : '<p class="empty">Aquí va todo lo que no quieres olvidar.</p>');
  }
  function diario() {
    const L = CM.por('diario').filter(busca).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || ord(a, b));
    const em = ['', '😞', '😕', '😐', '🙂', '😄'];
    return '<button type="button" class="big" data-act="nueva" data-t="diario">' + CM.ico('plus', 18) + ' Escribir hoy</button>' + (L.length ? L.slice(0, 60).map((i) => { const d = i.datos || {}; return fila(i, '<span class="sub">' + (em[d.animo] || '') + (d.energia ? ' ⚡' + d.energia : '') + '</span>'); }).join('') : '<p class="empty">Tu diario de vida: cómo te sientes y qué pasó hoy.</p>');
  }
  function logros() {
    const L = CM.por('logro').filter((i) => CM.enEsp(i) && busca(i)).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || ord(a, b));
    const hechas = CM.items.filter((i) => i.tipo === 'proyecto' && i.estado === 'hecho').sort((a, b) => (b.hecho_at || '').localeCompare(a.hecho_at || ''));
    return '<button type="button" class="big" data-act="nueva" data-t="logro">' + CM.ico('plus', 18) + ' Anotar un logro</button>' + (L.length ? L.slice(0, 40).map((i) => fila(i, CM.ico('estrella', 15))).join('') : '<p class="empty">Anota lo que lograste: te recuerda cuánto avanzas.</p>') +
      (hechas.length ? '<h3 class="sec">Trabajo finalizado</h3>' + hechas.slice(0, 20).map((i) => fila(i)).join('') : '');
  }
  function render(el) {
    if (CM.ui.sub) { ui.sub = CM.ui.sub; CM.ui.sub = null; }
    const cuerpo = { ideas, problemas, notas, diario, logros }[ui.sub]();
    el.innerHTML = '<div class="titulo-v"><h2>Cerebro</h2></div>' + (['diario'].includes(ui.sub) ? '' : CM.selectorEspacio()) +
      '<div class="chips">' + SUBS.map((s) => '<button type="button" class="chip' + (ui.sub === s[0] ? ' on' : '') + '" data-sub="' + s[0] + '">' + s[1] + '</button>').join('') + '</div>' +
      '<input id="bq" type="search" placeholder="Buscar…" value="' + esc(ui.q) + '" maxlength="60">' + cuerpo;
    CM.alSelectorEspacio(el);
    const bq = el.querySelector('#bq'); bq.oninput = () => { ui.q = bq.value.trim().toLowerCase(); clearTimeout(ui.t); ui.t = setTimeout(() => { CM.pintar(); const n = document.getElementById('bq'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 250); };
    el.onclick = async (e) => {
      const b = e.target.closest('[data-act],[data-sub]'); if (!b) return;
      const id = b.dataset.id, it = id && CM.get(id);
      try {
        if (b.dataset.sub) { ui.sub = b.dataset.sub; CM.pintar(); }
        else if (b.dataset.act === 'ficha') CM.ficha(id);
        else if (b.dataset.act === 'nueva') CM.ficha(null, b.dataset.t, b.dataset.t === 'diario' || b.dataset.t === 'logro' ? { fecha: hoy() } : null);
        else if (b.dataset.act === 'lluvia') lluvia();
        else if (b.dataset.act === 'aTarea') { await CM.add('tarea', { titulo: it.titulo, cuerpo: it.cuerpo || '', espacio_id: it.espacio_id }); await CM.upd(id, { estado: 'elegida' }); toast('Ahora es una tarea'); }
        else if (b.dataset.act === 'desc') await CM.upd(id, { estado: 'descartada' });
        else if (b.dataset.act === 'sol') CM.ficha(null, 'solucion', { padre: id });
        else if (b.dataset.act === 'resolver') await CM.upd(id, { estado: 'resuelto' });
      } catch (er) { toast(er.message); }
    };
  }
  CM.mod.cerebro = { render };
})();
