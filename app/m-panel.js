/* Centro de Mando · Panel: gráficos SVG livianos que explican qué destaca en tu semana. */
(function () {
  'use strict';
  const A = App, CM = window.CM, { esc, hoy, sumarDias, fechaDe } = A;
  const ui = { n: 14 };
  const DS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
  const prom = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
  function barras(vals, labs, color, alto) {
    const W = 300, H = alto || 90, n = vals.length, m = Math.max(1, Math.max.apply(null, vals)), bw = W / n;
    return '<svg viewBox="0 0 ' + W + ' ' + (H + 16) + '" class="gf" role="img">' + vals.map((v, i) => { const h = Math.round((v / m) * H); return '<rect x="' + (i * bw + 2) + '" y="' + (H - h) + '" width="' + Math.max(2, bw - 4) + '" height="' + Math.max(v ? 2 : 0, h) + '" rx="3" fill="' + color + '"><title>' + esc(labs[i]) + ': ' + v + '</title></rect>'; }).join('') +
      (n <= 14 ? vals.map((v, i) => '<text x="' + (i * bw + bw / 2) + '" y="' + (H + 12) + '" text-anchor="middle" font-size="9" fill="currentColor" opacity=".6">' + esc(String(labs[i]).slice(-2)) + '</text>').join('') : '') + '</svg>';
  }
  function apiladas(a, b) { // trabajo vs descanso
    const W = 300, H = 90, n = a.length, m = Math.max(1, Math.max.apply(null, a.map((v, i) => v + b[i]))), bw = W / n;
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="gf" role="img">' + a.map((v, i) => { const ha = Math.round(v / m * H), hb = Math.round(b[i] / m * H); return '<rect x="' + (i * bw + 2) + '" y="' + (H - ha) + '" width="' + Math.max(2, bw - 4) + '" height="' + ha + '" fill="var(--c1)"/><rect x="' + (i * bw + 2) + '" y="' + (H - ha - hb) + '" width="' + Math.max(2, bw - 4) + '" height="' + hb + '" rx="3" fill="var(--c2)"/>'; }).join('') + '</svg>';
  }
  function linea(vals, color) {
    const W = 300, H = 70, p = vals.map((v, i) => v == null ? null : [i * (W / Math.max(1, vals.length - 1)), H - ((v - 1) / 4) * H]).filter(Boolean);
    if (p.length < 2) return '<p class="sub">Registra tu ánimo en Hoy para ver la curva.</p>';
    return '<svg viewBox="0 0 ' + W + ' ' + (H + 6) + '" class="gf" role="img"><polyline fill="none" stroke="' + color + '" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" points="' + p.map((q) => q[0].toFixed(1) + ',' + (q[1] + 3).toFixed(1)).join(' ') + '"/>' + p.map((q) => '<circle cx="' + q[0].toFixed(1) + '" cy="' + (q[1] + 3).toFixed(1) + '" r="2.5" fill="' + color + '"/>').join('') + '</svg>';
  }
  function hbar(rows) { // [nombre,color,valor]
    const m = Math.max(1, Math.max.apply(null, rows.map((r) => r[2])));
    return rows.map((r) => '<div class="hb"><span>' + esc(r[0]) + '</span><div><i style="width:' + Math.round(r[2] / m * 100) + '%;background:' + esc(r[1]) + '"></i></div><b>' + r[2] + '</b></div>').join('');
  }
  function render(el) {
    const h = hoy(), dias = CM.ultimosDias(ui.n), I = CM.items;
    const porDia = dias.map((d) => CM.completados(d, d).length), tot = porDia.reduce((a, b) => a + b, 0);
    const uso = dias.map((d) => CM.uso.find((u) => u.dia === d) || { trabajo_min: 0, descanso_min: 0, app_min: 0 });
    const tr = uso.map((u) => u.trabajo_min), de = uso.map((u) => u.descanso_min);
    const dg = dias.map((d) => CM.estadoDia(d).animo);
    const en = dias.map((d) => CM.estadoDia(d).energia);
    const porEsp = CM.espacios.filter((e) => !e.archivado).map((e) => [e.nombre, e.color, CM.completados(dias[0], h).filter((i) => i.espacio_id === e.id).length]).filter((r) => r[2]);
    const dow = Array(7).fill(0); I.filter((i) => i.tipo === 'tarea' && i.hecho_at).forEach((i) => dow[new Date(i.hecho_at).getDay()]++);
    const est = { abierto: 0, en_curso: 0, hecho: 0 }; I.filter((i) => i.tipo === 'tarea' || i.tipo === 'proyecto').forEach((i) => { if (est[i.estado] !== undefined) est[i.estado]++; });
    const metas = I.filter((m) => m.tipo === 'meta' && m.estado === 'abierto').map((m) => [m.titulo, '#3d63ff', Math.round(CM.progresoMeta(m) * 100)]);
    const ins = ui.sinIns ? [] : CM.insights(CM.limiteInsights());
    let x = '<div class="titulo-v"><h2>Panel</h2></div><div class="chips">' + [7, 14, 30].map((n) => '<button type="button" class="chip' + (ui.n === n ? ' on' : '') + '" data-n="' + n + '">' + n + ' días</button>').join('') + '</div>';
    x += '<div class="kpis"><div><b>' + tot + '</b><span>cumplidas</span></div><div><b>' + CM.racha() + '</b><span>racha</span></div><div><b>' + CM.minTxt(Math.round(prom(uso.map((u) => u.app_min)))) + '</b><span>en app/día</span></div></div>';
    if (ins.length) x += '<h3 class="sec">Lo que destaca</h3>' + ins.map(CM.tarjetaInsight).join('');
    x += '<div class="card"><h3>Tareas cumplidas por día</h3>' + barras(porDia, dias, 'var(--c1)') + '</div>';
    x += '<div class="card"><h3>Trabajo vs descanso <span class="sub"><i class="dot" style="background:var(--c1)"></i>trabajo <i class="dot" style="background:var(--c2)"></i>fuera de horario (min en la app)</span></h3>' + apiladas(tr, de) + '</div>';
    x += '<div class="card"><h3>Ánimo (automático)</h3>' + linea(dg, 'var(--c1)') + '<h3>Energía</h3>' + linea(en, 'var(--c2)') + '</div>';
    x += '<div class="card"><h3>Mejor día de la semana</h3>' + barras(dow, DS, 'var(--c1)', 60) + '</div>';
    if (porEsp.length) x += '<div class="card"><h3>Por espacio</h3>' + hbar(porEsp) + '</div>';
    x += '<div class="card"><h3>Estado del tablero</h3>' + hbar([['Por hacer', '#8a93b2', est.abierto], ['En curso', '#3d63ff', est.en_curso], ['Hecho', '#2fb67c', est.hecho]]) + '</div>';
    if (metas.length) x += '<div class="card"><h3>Metas (%)</h3>' + hbar(metas) + '</div>';
    if (CM.cuenta.premium) {
      const s0 = sumarDias(h, -6), s1 = CM.completados(s0, h).length, logr = I.filter((i) => i.tipo === 'logro' && i.fecha >= s0).length, pr = I.filter((i) => i.tipo === 'problema' && i.estado === 'resuelto' && CM.diaDe(i.hecho_at) >= s0).length;
      x += '<div class="card"><h3>Revisión semanal</h3><p>Cumpliste <b>' + s1 + '</b> cosas, anotaste <b>' + logr + '</b> logros y resolviste <b>' + pr + '</b> problemas. Elige hoy <b>una</b> prioridad para la próxima semana.</p></div>';
    } else x += '<div class="card"><p class="sub">La revisión semanal y más consejos están en Pro.</p></div>';
    el.innerHTML = x;
    el.onclick = (e) => { const b = e.target.closest('[data-n],[data-ir]'); e.stopPropagation(); if (!b) return; if (b.dataset.n) { ui.n = +b.dataset.n; CM.pintar(); } else CM.ir(b.dataset.ir); };
  }
  CM.mod.panel = { render };
})();
