/* Centro de Mando · Metas (con resultados clave y ritmo) y Hábitos (racha + mapa de 5 semanas). */
(function () {
  'use strict';
  const A = App, CM = window.CM, { esc, hoy, sumarDias, toast } = A;
  const ui = { sub: 'metas' };
  const pct = (n) => Math.round(n * 100);
  function meta(m) {
    const pr = CM.progresoMeta(m), rt = CM.ritmoMeta(m), e = CM.espacio(m.espacio_id);
    const estado = !rt ? '' : rt.vencida ? '<span class="pill bad">vencida</span>' : pr < rt.esperado - 0.2 ? '<span class="pill bad">en riesgo</span>' : pr >= rt.esperado ? '<span class="pill ok">en ritmo</span>' : '<span class="pill warn">atrasada</span>';
    const rs = CM.hijos(m.id, 'resultado');
    return '<div class="card meta-c"><button type="button" class="tit" data-act="ficha" data-id="' + m.id + '">' + esc(m.titulo) + '</button>' +
      '<div class="meta">' + (e ? '<span class="pt"><i style="background:' + esc(e.color) + '"></i>' + esc(e.nombre) + '</span>' : '') + estado + (m.datos.fin ? '<span class="pill">hasta ' + A.fCorta(m.datos.fin) + '</span>' : '') + '</div>' +
      '<div class="barra"><i style="width:' + pct(pr) + '%"></i>' + (rt ? '<u style="left:' + pct(rt.esperado) + '%" title="Ritmo esperado"></u>' : '') + '</div><p class="sub">' + pct(pr) + '%' + (rt ? ' · esperado ' + pct(rt.esperado) + '%' : '') + '</p>' +
      rs.map((r) => { const o = Number(r.datos.objetivo) || 0, a = Number(r.datos.actual) || 0; return '<div class="kr"><span>' + esc(r.titulo) + '</span><span class="sub">' + a + ' / ' + o + ' ' + esc(r.datos.unidad || '') + '</span><button type="button" class="x" data-act="kr" data-id="' + r.id + '" aria-label="Sumar">' + CM.ico('plus', 16) + '</button></div>'; }).join('') +
      '<button type="button" class="small ghost" data-act="nkr" data-id="' + m.id + '">+ Resultado clave</button> <button type="button" class="small ghost" data-act="ntk" data-id="' + m.id + '">+ Tarea</button></div>';
  }
  function habito(h) {
    const dias = CM.ultimosDias(35), e = CM.espacio(h.espacio_id), r = CM.rachaHabito(h), t = hoy();
    return '<div class="card hab"><div class="fila"><button type="button" class="tit" data-act="ficha" data-id="' + h.id + '">' + esc(h.titulo) + '</button><span class="pill' + (r >= 3 ? ' ok' : '') + '">' + CM.ico('fuego', 13) + ' ' + r + '</span>' +
      '<button type="button" class="chk' + (CM.cumplido(h, t) ? ' on' : '') + '" data-act="hab" data-id="' + h.id + '" aria-label="Marcar hoy">' + (CM.cumplido(h, t) ? CM.ico('check', 18) : '') + '</button></div>' +
      (e ? '<p class="sub"><i class="dot" style="background:' + esc(e.color) + '"></i> ' + esc(e.nombre) + '</p>' : '') +
      '<div class="heat">' + dias.map((d) => '<i class="' + (CM.cumplido(h, d) ? 'on' : CM.programado(h, d) ? '' : 'off') + '" title="' + d + '"></i>').join('') + '</div></div>';
  }
  function render(el) {
    const M = CM.por('meta').filter((m) => m.estado === 'abierto' && CM.enEsp(m)), H = CM.por('habito').filter((h) => h.estado !== 'descartada' && CM.enEsp(h));
    const lograd = CM.por('meta').filter((m) => m.estado === 'lograda').length;
    let x = '<div class="titulo-v"><h2>Metas</h2><span class="sub">' + lograd + ' logradas</span></div>' + CM.selectorEspacio();
    x += '<div class="chips"><button type="button" class="chip' + (ui.sub === 'metas' ? ' on' : '') + '" data-sub="metas">Metas (' + M.length + ')</button><button type="button" class="chip' + (ui.sub === 'habitos' ? ' on' : '') + '" data-sub="habitos">Hábitos (' + H.length + ')</button></div>';
    if (ui.sub === 'metas') {
      x += '<button type="button" class="big" data-act="nueva" data-t="meta">' + CM.ico('plus', 18) + ' Nueva meta</button>' + (M.length ? M.map(meta).join('') : '<p class="empty">Define una meta con fecha y 1–3 resultados que puedas medir.</p>');
    } else {
      x += '<button type="button" class="big" data-act="nueva" data-t="habito">' + CM.ico('plus', 18) + ' Nuevo hábito</button>' + (H.length ? H.map(habito).join('') : '<p class="empty">Un hábito pequeño y diario vale más que uno grande que abandonas.</p>');
    }
    el.innerHTML = x; CM.alSelectorEspacio(el);
    el.onclick = async (e) => {
      const b = e.target.closest('[data-act],[data-sub]'); if (!b) return;
      const id = b.dataset.id, it = id && CM.get(id);
      try {
        if (b.dataset.sub) { ui.sub = b.dataset.sub; CM.pintar(); }
        else if (b.dataset.act === 'ficha') CM.ficha(id);
        else if (b.dataset.act === 'nueva') CM.ficha(null, b.dataset.t);
        else if (b.dataset.act === 'hab') await CM.toggleHabito(it, hoy());
        else if (b.dataset.act === 'kr') { const v = prompt('Avance actual de "' + it.titulo + '"', it.datos.actual || 0); if (v !== null) await CM.datos(id, { actual: Number(String(v).replace(',', '.')) || 0 }); }
        else if (b.dataset.act === 'nkr') CM.ficha(null, 'resultado', { padre: id, espacio_id: it.espacio_id });
        else if (b.dataset.act === 'ntk') CM.ficha(null, 'tarea', { padre: id, espacio_id: it.espacio_id });
      } catch (er) { toast(er.message); }
    };
  }
  CM.mod.metas = { render };
})();
