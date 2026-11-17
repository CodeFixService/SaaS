/* G38 · 💰 Dinero (CM → Resumen, solo admin): ingresos del mes por app y por Premium/🧩 módulo, pruebas por vencer y morosos
   con 1 toque a WhatsApp para cobrar. Lee núcleo cfx_dinero() de cada app conectada (solo lectura). */
(function (global) {
  'use strict';
  const A = global.App, { esc, modal, toast } = A;
  const $$ = (n) => '$' + Math.round(+n || 0).toLocaleString('es-CL');
  const dia = (f) => { try { return new Date(f).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' }); } catch (x) { return ''; } };
  const nombreApp = (a) => a.nombre.split(' ·')[0];
  const prod = (k) => k === 'premium' ? '⭐ Premium' : '🧩 ' + k;
  let D = {}; // id app → cfx_dinero()

  function wa(tel, texto) {
    const n = global.CFX_CL && global.CFX_CL.tel ? global.CFX_CL.tel(tel || '') : '';
    return 'https://wa.me/' + (n || '') + '?text=' + encodeURIComponent(texto);
  }
  function msjCobro(a, x) {
    return 'Hola ' + (x.nombre || '') + ' 👋\nTu ' + (x.producto ? 'módulo ' + x.producto : 'Premium') + ' de ' + nombreApp(a) + ' venció el ' + dia(x.vencio) +
      '.\nPara seguir usándolo, renueva aquí: ' + a.web + '\n(Premium → Pagar). Si ya pagaste, avísame y lo reviso al tiro 🙌';
  }
  function msjVence(a, x) {
    return 'Hola ' + (x.nombre || '') + ' 👋\nTu ' + (x.pago ? 'Premium' : 'prueba Premium') + ' de ' + nombreApp(a) + ' termina el ' + dia(x.hasta) +
      '.\nPara no perder lo avanzado, actívalo aquí: ' + a.web + '\n(Premium → Pagar). ¿Te ayudo con algo?';
  }

  function lista(titulo, filas, vacio) {
    const d = modal('<div class="fila" style="align-items:center"><h2 class="grow" style="margin:0">' + esc(titulo) + '</h2><button type="button" class="small ghost" data-cerrar aria-label="Cerrar">✕</button></div>' +
      (filas.length ? filas.join('') : '<p class="empty">' + esc(vacio) + '</p>'));
    d.addEventListener('click', (ev) => { const b = ev.target.closest('[data-wa]'); if (b && !b.dataset.tel) toast('Sin WhatsApp guardado: elige el contacto en WhatsApp'); });
    return d;
  }
  function fila(a, x, linea, texto, boton) {
    return '<div class="card"><div class="fila"><span class="tit grow">' + esc(x.nombre || x.email || '') + '</span><span class="pill">' + esc(nombreApp(a)) + '</span></div>' +
      '<p class="sub">' + linea + (x.tel ? ' · ' + esc(global.CFX_CL && global.CFX_CL.telVer ? global.CFX_CL.telVer(global.CFX_CL.tel(x.tel) || x.tel) : x.tel) : ' · sin WhatsApp') + '</p>' +
      '<div class="btns-s"><a class="btn small" data-wa data-tel="' + esc(x.tel || '') + '" target="_blank" rel="noopener" href="' + esc(wa(x.tel, texto)) + '">' + boton + '</a></div></div>';
  }
  function morosos(M) {
    const f = [];
    M.APPS.forEach((a) => ((D[a.id] || {}).morosos || []).forEach((x) =>
      f.push(fila(a, x, esc(prod(x.producto || 'premium')) + ' · venció ' + dia(x.vencio) + ' · último pago ' + $$(x.monto), msjCobro(a, x), '💬 Cobrar por WhatsApp'))));
    lista('🔴 Morosos', f, 'Nadie con pago vencido 🎉');
  }
  function vencen(M) {
    const f = [];
    M.APPS.forEach((a) => ((D[a.id] || {}).vencen || []).forEach((x) =>
      f.push(fila(a, x, (x.pago ? '⭐ Renovación' : '🎁 Prueba') + ' · termina ' + dia(x.hasta), msjVence(a, x), '💬 Avisar por WhatsApp'))));
    lista('⏳ Vencen en 7 días', f, 'Nada vence esta semana');
  }
  function detalle(a) {
    const r = D[a.id] || {}, md = r.medios || {};
    const nm = { mp: '⚡ Mercado Pago', link: '🔗 Link', transferencia: '🏦 Transferencia', tarjeta: '💳 Tarjeta' };
    modal('<div class="fila" style="align-items:center"><h2 class="grow" style="margin:0">💰 ' + esc(nombreApp(a)) + '</h2><button type="button" class="small ghost" data-cerrar aria-label="Cerrar">✕</button></div>' +
      '<p class="sub">Este mes ' + $$(r.mes && r.mes.monto) + ' (' + ((r.mes && r.mes.n) || 0) + ' pagos) · mes anterior ' + $$(r.anterior && r.anterior.monto) + ' · ⭐ ' + (r.premium || 0) + ' con Premium' +
      (r.desde ? ' · contando desde ' + dia(r.desde) : '') + '</p>' +
      '<h3 style="margin:12px 0 4px">Por Premium y módulo</h3>' +
      ((r.por || []).length ? '<table class="tabla" style="width:100%;font-size:13px"><tr><th>Qué</th><th>Pagos</th><th>Monto</th></tr>' +
        r.por.map((x) => '<tr><td>' + esc(prod(x.producto)) + '</td><td>' + x.n + '</td><td>' + $$(x.monto) + '</td></tr>').join('') + '</table>' : '<p class="empty">Sin pagos este mes</p>') +
      (Object.keys(md).length ? '<h3 style="margin:12px 0 4px">Por medio</h3><p class="sub">' + Object.keys(md).map((k) => esc(nm[k] || k) + ' ' + $$(md[k])).join(' · ') + '</p>' : ''));
  }

  async function montar(z) {
    const M = global.MisApps; await M.preparar();
    const con = M.APPS.filter((a) => (M.estado[a.id] || {}).conectado);
    D = {};
    await Promise.all(con.map(async (a) => { try { D[a.id] = await M.rpcDe(M.cliente(a), 'cfx_dinero'); } catch (x) { D[a.id] = { error: x.message }; } }));
    if (!z.isConnected) return;
    const ok = con.filter((a) => D[a.id] && !D[a.id].error);
    const sum = (k) => ok.reduce((n, a) => n + (+((D[a.id][k] || {}).monto) || 0), 0);
    const cuenta = (k) => ok.reduce((n, a) => n + ((D[a.id][k] || []).length), 0);
    const mes = sum('mes'), ant = sum('anterior'), p = ant ? Math.round((mes - ant) / ant * 100) : (mes ? 100 : 0);
    const nMor = cuenta('morosos'), nVen = cuenta('vencen'), faltan = con.length - ok.length;
    z.innerHTML = '<h2>💰 Dinero</h2><p class="sub">Este mes <b>' + $$(mes) + '</b>' + (mes || ant ? ' <span class="pill ' + (p >= 0 ? 'ok' : 'bad') + '">' + (p >= 0 ? '▲ ' : '▼ ') + Math.abs(p) + '% vs mes anterior</span>' : '') + '</p>' +
      '<div class="car-apps">' + ok.map((a) => '<button type="button" class="car-it" data-din="' + a.id + '"><b>' + $$((D[a.id].mes || {}).monto) + '</b><span>' + esc(nombreApp(a)) + '</span></button>').join('') + '</div>' +
      '<div class="btns-s"><button type="button" class="small' + (nMor ? '' : ' ghost') + '" data-mor>🔴 Morosos (' + nMor + ')</button><button type="button" class="small ghost" data-ven>⏳ Vencen en 7 días (' + nVen + ')</button></div>' +
      (faltan ? '<p class="sub">' + faltan + ' app(s) sin 💰 todavía: CM → Apps → ⬆️ Actualizar base.</p>' : '');
    z.onclick = (ev) => {
      const b = ev.target.closest('[data-din],[data-mor],[data-ven]'); if (!b) return;
      if (b.dataset.din) detalle(M.APPS.find((a) => a.id === b.dataset.din)); else if ('mor' in b.dataset) morosos(M); else vencen(M);
    };
  }
  global.DineroCM = { montar };
})(window);
