/* Centro de Mando · 📊 Analítica (E25): lo que calculó el análisis nocturno (Python en GitHub Actions → cfx_analisis de cada base).
   Arriba las 7 apps en una lista; al tocar una se ven sus números, la curva de 30 días y los consejos. Usa las conexiones de Apps (MisApps). */
(function (global) {
  'use strict';
  const A = global.App, { esc } = A;
  const M = () => global.MisApps;
  let raiz = null, actual = null, datos = {};
  const conectada = (a) => !!(M().estado[a.id] || {}).conectado;
  const $$ = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('es-CL');
  const num = (n) => Number(n || 0).toLocaleString('es-CL');
  const cambio = (p) => (p == null ? '' : ' <small class="' + (p >= 0 ? 'ok' : 'warn') + '">' + (p >= 0 ? '▲ ' : '▼ ') + Math.abs(p) + '%</small>');
  const nf = (x) => /Could not find|does not exist|PGRST202/i.test(x.message) ? 'La base de esta app aún no tiene la analítica (⚡ Actualizar base).' : x.message;
  const SIN = 'Aún sin cálculo: se hace solo cada noche. Para hacerlo ahora: GitHub → SaaS → Actions → "Análisis nocturno" → Run workflow.';

  // Barras de 30 días (una sola serie: el título la nombra). Al tocar o pasar el dedo, cada barra dice su día y valor.
  function barras(serie, fmt) {
    const max = Math.max(1, ...serie), W = 300, H = 64, w = W / serie.length;
    const hoy = new Date();
    return '<svg viewBox="0 0 ' + W + ' ' + (H + 2) + '" role="img" aria-label="Últimos 30 días" style="width:100%;height:80px;display:block">' +
      serie.map((v, i) => {
        const h = v ? Math.max(3, (v / max) * H) : 1, d = new Date(hoy - (serie.length - 1 - i) * 864e5);
        return '<g><title>' + d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }) + ': ' + fmt(v) + '</title>' +
          '<rect x="' + (i * w) + '" y="0" width="' + w + '" height="' + (H + 2) + '" fill="transparent"/>' +
          '<rect x="' + (i * w + 1) + '" y="' + (H + 1 - h) + '" width="' + Math.max(1, w - 2) + '" height="' + h + '" rx="2" fill="' + (v ? 'var(--brand)' : 'var(--line)') + '"/></g>';
      }).join('') + '</svg><div class="fila sub" style="justify-content:space-between"><span>hace 30 días</span><span>hoy</span></div>';
  }

  function detalle(a) {
    const d = datos[a.id];
    if (!d || d.error) return '<div class="card"><h2>' + esc(a.nombre) + '</h2><p class="sub">' + esc(d ? d.error : SIN) + '</p></div>';
    const u = d.usuarios || {}, v = d.ventas, ing = d.ingresos || {};
    const tiles = [['👥 Cuentas', num(u.total)], ['🆕 Nuevas 30 d', num(u.nuevos30) + cambio(u.cambio)], ['✅ Activas 7 d', num(u.activos7)], ['📅 Activas 30 d', num(u.activos30)],
      ['💳 Premium 30 d', $$(ing.d30) + cambio(ing.cambio)], ['⭐ Con Premium pagado', num(d.premium)]];
    if (v) tiles.unshift(['🛒 Pedidos 30 d', num(v.pedidos30)], ['💰 Ventas 30 d', $$(v.monto30) + cambio(v.cambio)], ['🧾 Ticket promedio', $$(v.ticket)], ['🏪 Negocios que vendieron', v.activos + ' de ' + v.negocios]);
    return '<div class="card"><div class="fila"><h2 class="grow">' + esc(a.nombre) + '</h2><span class="sub">' + A.hace(d.calculado) + '</span></div>' +
      '<div class="stats" style="grid-template-columns:repeat(2,minmax(0,1fr))">' + tiles.map((x) => '<div class="card"><b>' + x[1] + '</b><span>' + x[0] + '</span></div>').join('') + '</div>' +
      (v ? '<h3>Ventas por día</h3>' + barras(v.serie || [], $$) : '') + '<h3>Cuentas nuevas por día</h3>' + barras(u.serie || [], num) + '</div>' +
      ((d.consejos || []).length ? '<div class="card"><h2>💡 Qué dice</h2><ul class="list">' + d.consejos.map((c) => '<li style="padding:6px 0">' + esc(c) + '</li>').join('') + '</ul></div>' : '') +
      (v && v.top && v.top.length ? '<div class="card"><h2>🏆 Los que más venden (30 d)</h2>' + v.top.map((t, i) => '<div class="fila" style="padding:6px 0;border-top:1px solid var(--line)"><span class="grow">' + (i + 1) + '. ' + esc(t.nombre) + '</span><b>' + $$(t.monto) + '</b></div>').join('') + '</div>' : '') +
      '<p class="sub">Se calcula sola cada noche (GitHub → SaaS → Actions → Análisis nocturno). Los negocios ven sus clientes en riesgo y productos quietos en su app.</p>';
  }

  function pintar() {
    const apps = M().APPS.filter(conectada);
    const fila = (a) => {
      const d = datos[a.id], u = (d && d.usuarios) || {}, v = d && d.ventas;
      return '<button type="button" class="fila' + (a.id === actual ? ' on' : '') + '" data-an="' + a.id + '" style="width:100%;text-align:left;padding:10px 0;border:0;border-top:1px solid var(--line);background:none;color:inherit;gap:8px">' +
        '<span class="grow"><b>' + esc(a.nombre.split(' ·')[0]) + '</b><br><span class="sub">' + (!d ? 'Cargando…' : d.error ? esc(d.error) :
          num(u.total) + ' cuentas · ' + num(u.nuevos30) + ' nuevas' + (v ? ' · ' + $$(v.monto30) + ' en ventas' : '')) + '</span></span>' +
        (d && !d.error ? '<span class="sub">' + num(u.activos7) + ' activas</span>' : '') + '<span>›</span></button>';
    };
    raiz.innerHTML = '<div class="titulo-v"><h2>Analítica</h2><span class="sub">Últimos 30 días</span></div>' +
      '<div class="card"><h2>Las apps</h2>' + (apps.length ? apps.map(fila).join('') : '<p class="sub">Conecta tus apps en Apps para ver su analítica.</p>') + '</div>' +
      '<div id="anDet">' + (actual ? detalle(M().APPS.find((x) => x.id === actual)) : '') + '</div>';
    raiz.querySelectorAll('[data-an]').forEach((b) => { b.onclick = () => { actual = b.dataset.an; pintar(); raiz.querySelector('#anDet').scrollIntoView({ block: 'start', behavior: 'smooth' }); }; });
  }

  async function render(el) {
    raiz = el; datos = {};
    el.innerHTML = '<div class="titulo-v"><h2>Analítica</h2></div><p class="sub">Cargando…</p>';
    await M().preparar();
    const apps = M().APPS.filter(conectada);
    if (!actual || !apps.some((a) => a.id === actual)) actual = (apps[0] || {}).id || null;
    pintar();
    await Promise.all(apps.map(async (a) => {
      try { datos[a.id] = (await M().rpcDe(M().cliente(a), 'cfx_analisis_app')) || { error: SIN }; } catch (x) { datos[a.id] = { error: nf(x) }; }
    }));
    if (raiz === el) pintar();
  }
  global.AnaliticaCM = { render };
})(window);
