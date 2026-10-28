/* Centro de Mando · Pagos de las 6 apps en un solo lugar.
   1) Precios, link de pago, comisión y datos de transferencia: se escriben una vez y se guardan en todas las apps (cfx_pagos_config_guardar).
   2) Comprobantes por revisar de todas las apps: ver, aprobar (con los días de Premium) o rechazar (cfx_pago_resolver).
   3) Cuentas que no pagan el primer pago (por ejemplo, las de prueba que creas tú). Usa las conexiones de Apps (MisApps). */
(function (global) {
  'use strict';
  const A = global.App, { esc, toast, modal, confirmar } = A;
  const M = () => global.MisApps;
  const pesos = (n) => '$' + Number(n || 0).toLocaleString('es-CL');
  const PERIODO = { inicio: 'Primer pago', mensual: 'Mensual', anual: 'Anual', otro: 'Otro monto' };
  let raiz = null, cfg = null, filtro = 'pendiente';

  const conectadas = () => M().APPS.filter((a) => (M().estado[a.id] || {}).conectado);
  const nf = (x) => /Could not find|does not exist|PGRST202/i.test(x.message) ? 'su base aún no tiene los pagos nuevos (se actualiza sola en máx. 10 min)' : x.message;

  function campo(k, t, v, tipo, ayuda) {
    return '<label>' + t + '<input data-k="' + k + '" type="' + (tipo || 'text') + '" value="' + esc(v == null ? '' : v) + '"' + (tipo === 'number' ? ' inputmode="decimal"' : '') + '></label>' + (ayuda ? '<p class="sub" style="margin-top:-4px">' + ayuda + '</p>' : '');
  }
  function formulario() {
    const c = cfg || {}, n = c.negocio || {}, cl = c.cliente || {}, t = c.transferencia || {};
    return '<div class="card" id="pgCfg"><h2>Precios y formas de pago</h2><p class="sub">Iguales para las 6 apps. Al guardar se copian a todas las apps conectadas.</p>' +
      '<h3>Negocio (cuenta principal)</h3><div class="grid2">' + campo('negocio.inicio', 'Primer pago', n.inicio, 'number') + campo('negocio.inicio_dias', 'Días que da', n.inicio_dias, 'number') +
      campo('negocio.mensual', 'Premium mensual', n.mensual, 'number') + campo('negocio.anual', 'Premium anual', n.anual, 'number') + '</div>' +
      '<label class="fila" style="gap:8px"><input type="checkbox" data-k="negocio.exigir_inicio" style="width:auto"' + (n.exigir_inicio ? ' checked' : '') + '> Los negocios nuevos no pueden usar la app hasta su primer pago</label>' +
      '<p class="sub">Solo para los que se registren desde que lo activas. Cuando vence, quedan en la versión gratis.</p>' +
      '<h3>Cliente</h3><div class="grid2">' + campo('cliente.mensual', 'Premium mensual', cl.mensual, 'number') + campo('cliente.anual', 'Premium anual', cl.anual, 'number') + '</div>' +
      '<h3>Link de pago</h3>' + campo('link', 'Link (sin monto: la persona escribe cuánto paga)', c.link, 'url') +
      campo('comision_pct', 'Comisión del link (%)', c.comision_pct, 'number', 'Se suma al precio cuando pagan con el link. Por transferencia pagan el precio exacto.') +
      '<h3>Transferencia</h3><div class="grid2">' + campo('transferencia.banco', 'Banco', t.banco) + campo('transferencia.tipo', 'Tipo de cuenta', t.tipo) + campo('transferencia.numero', 'Número', t.numero) +
      campo('transferencia.rut', 'RUT', t.rut) + campo('transferencia.titular', 'Titular', t.titular) + campo('transferencia.correo', 'Correo', t.correo, 'email') + '</div>' +
      campo('whatsapp', 'WhatsApp para dudas de pago (con 56)', c.whatsapp, 'tel') +
      '<button type="button" class="block" id="pgGuardar">Guardar en las 6 apps</button><div id="pgRes"></div></div>';
  }
  function leer() {
    const o = JSON.parse(JSON.stringify(cfg || {}));
    raiz.querySelectorAll('#pgCfg [data-k]').forEach((i) => {
      const r = i.dataset.k.split('.'); let d = o;
      r.slice(0, -1).forEach((k) => { d[k] = d[k] || {}; d = d[k]; });
      d[r[r.length - 1]] = i.type === 'checkbox' ? i.checked : i.type === 'number' ? Number(String(i.value).replace(',', '.')) || 0 : i.value.trim();
    });
    delete o.inicio_desde;
    return o;
  }
  async function guardarTodas() {
    const p = leer(), res = raiz.querySelector('#pgRes'), out = [];
    if (p.link && !/^https:\/\//.test(p.link)) return toast('El link debe empezar con https://');
    res.innerHTML = '<p class="sub">Guardando…</p>';
    for (const a of M().APPS) {
      const e = M().estado[a.id] || {};
      if (!e.conectado) { out.push([a, 'warn', 'No conectada: conéctala en Apps y vuelve a guardar']); continue; }
      try { const v = await M().rpcDe(M().cliente(a), 'cfx_pagos_config_guardar', { p }); if (a.propia) cfg = v; out.push([a, 'ok', 'Guardado']); }
      catch (x) { out.push([a, 'bad', nf(x)]); }
    }
    res.innerHTML = out.map((r) => '<div class="fila"><span class="grow">' + esc(r[0].nombre) + '</span><span class="pill ' + r[1] + '">' + esc(r[2]) + '</span></div>').join('');
  }

  async function lista() {
    const cont = raiz.querySelector('#pgLista'); if (!cont) return;
    cont.innerHTML = '<p class="sub">Revisando las apps…</p>';
    const filas = [], avisos = [];
    await Promise.all(conectadas().map(async (a) => {
      try { (await M().rpcDe(M().cliente(a), 'cfx_pagos_lista', { p_estado: filtro })).forEach((g) => filas.push(Object.assign(g, { app: a }))); }
      catch (x) { avisos.push(a.nombre + ': ' + nf(x)); }
    }));
    const faltan = M().APPS.length - conectadas().length;
    filas.sort((x, y) => String(y.creado).localeCompare(String(x.creado)));
    cont.innerHTML = (faltan ? '<p class="sub warn">' + faltan + ' app(s) sin conectar: conéctalas en Apps para ver sus pagos.</p>' : '') +
      avisos.map((t) => '<p class="sub warn">' + esc(t) + '</p>').join('') +
      (filas.map((g, i) => '<div class="card"><div class="fila"><span class="pill info">' + esc(g.app.nombre.split(' ·')[0]) + '</span><span class="tit grow">' + esc(g.nombre || g.email) + '</span>' +
        '<span class="pill ' + (g.estado === 'aprobado' ? 'ok' : g.estado === 'rechazado' ? 'bad' : 'warn') + '">' + g.estado + '</span></div>' +
        '<p class="sub">' + esc(g.email) + ' · ' + (g.rol === 'negocio' ? 'Negocio' : g.rol === 'cliente' ? 'Cliente' : 'Otro') + ' · ' + (PERIODO[g.periodo] || g.periodo) + ' · <b>' + pesos(g.monto) + '</b> por ' + (g.medio === 'link' ? 'link' : 'transferencia') +
        ' · ' + A.hace(g.creado) + (g.aprobados ? ' · ya pagó ' + g.aprobados + ' vez/veces' : ' · primer pago') + (g.nota ? '<br>' + esc(g.nota) : '') + (g.motivo ? '<br>Motivo: ' + esc(g.motivo) : '') +
        (g.estado === 'aprobado' && g.dias ? '<br>' + g.dias + ' días de Premium' : '') + '</p>' +
        (g.estado === 'pendiente' ? '<div class="btns-s">' + (g.con_comprobante ? '<button type="button" class="small ghost" data-v="' + i + '">Ver comprobante</button>' : '') +
          '<button type="button" class="small" data-ok="' + i + '">Aprobar</button><button type="button" class="small ghost" data-no="' + i + '">Rechazar</button></div>' : '') + '</div>').join('') ||
        '<p class="empty">' + (filtro === 'pendiente' ? 'No hay pagos por revisar 🎉' : 'Sin pagos') + '</p>');
    cont.onclick = async (ev) => {
      const b = ev.target.closest('[data-v],[data-ok],[data-no]'); if (!b) return;
      const g = filas[+(b.dataset.v || b.dataset.ok || b.dataset.no)], c = M().cliente(g.app);
      try {
        if (b.dataset.v) A.verImagen(await M().rpcDe(c, 'cfx_pago_comprobante', { p_id: g.id }), 'Comprobante', 'comprobante.jpg');
        else if (b.dataset.ok) {
          const sug = { inicio: (cfg && cfg.negocio && cfg.negocio.inicio_dias) || 30, mensual: 30, anual: 365 }[g.periodo] || 30;
          const d = modal('<h2>Aprobar pago</h2><p class="muted">' + esc(g.nombre || g.email) + ' · ' + pesos(g.monto) + ' (' + (PERIODO[g.periodo] || '') + ')</p><label>Días de Premium que activa<input id="pd" type="number" value="' + sug + '"></label>' +
            '<p class="sub">Revisa que el monto llegó a tu cuenta. 0 = solo registrar el pago.</p><div class="btns"><button class="ghost" data-cerrar type="button">Cancelar</button><button id="pk" type="button">Aprobar</button></div>');
          d.querySelector('#pk').onclick = async () => {
            try { const r = await M().rpcDe(c, 'cfx_pago_resolver', { p_id: g.id, p_aprobar: true, p_dias: +d.querySelector('#pd').value }); d.close(); toast('Aprobado' + (r.hasta ? ': Premium hasta ' + A.fCorta(String(r.hasta).slice(0, 10)) : '')); lista(); }
            catch (x) { toast(x.message); }
          };
        } else {
          const d = modal('<h2>Rechazar pago</h2><label>Motivo (le llega a la persona)<input id="pm" maxlength="200" value="No encontramos el pago en la cuenta"></label><div class="btns"><button class="ghost" data-cerrar type="button">Cancelar</button><button id="pk" type="button">Rechazar</button></div>');
          d.querySelector('#pk').onclick = async () => {
            try { await M().rpcDe(c, 'cfx_pago_resolver', { p_id: g.id, p_aprobar: false, p_motivo: d.querySelector('#pm').value }); d.close(); toast('Rechazado'); lista(); } catch (x) { toast(x.message); }
          };
        }
      } catch (x) { toast(x.message); }
    };
  }

  async function exento(si) {
    const em = raiz.querySelector('#pgEx').value.trim(), ap = M().APPS.find((a) => a.id === raiz.querySelector('#pgExApp').value);
    if (!em) return toast('Escribe el correo');
    try { await M().rpcDe(M().cliente(ap), 'cfx_exento_email', { p_email: em, p_si: si }); toast(si ? em + ' no paga el primer pago en ' + ap.nombre : em + ' vuelve a pagar normal'); }
    catch (x) { toast(nf(x)); }
  }

  async function render(el) {
    raiz = el;
    el.innerHTML = '<div class="titulo-v"><h2>Pagos</h2><span class="sub">Las 6 apps</span></div><p class="sub">Cargando…</p>';
    await M().preparar();
    try { cfg = await A.rpc('cfx_pagos_config'); } catch (x) { cfg = null; }
    const sin = M().APPS.filter((a) => !(M().estado[a.id] || {}).conectado);
    el.innerHTML = '<div class="titulo-v"><h2>Pagos</h2><span class="sub">Las 6 apps</span></div>' +
      (sin.length ? '<div class="card"><p class="sub">Para ver y aprobar sus pagos, conecta: ' + sin.map((a) => '<button type="button" class="small ghost" data-con="' + a.id + '">' + esc(a.nombre.split(' ·')[0]) + '</button>').join(' ') + '</p></div>' : '') +
      '<div class="seg chips"><button type="button" class="chip' + (filtro === 'pendiente' ? ' on' : '') + '" data-f="pendiente">Por revisar</button><button type="button" class="chip' + (filtro === 'todos' ? ' on' : '') + '" data-f="todos">Todos</button></div>' +
      '<div id="pgLista"></div>' + formulario() +
      '<div class="card"><h2>Cuentas sin primer pago</h2><p class="sub">Para cuentas de prueba o de regalo: entran sin pagar el primer pago.</p>' +
      '<label>App<select id="pgExApp">' + M().APPS.map((a) => '<option value="' + a.id + '">' + esc(a.nombre) + '</option>').join('') + '</select></label>' +
      '<label>Correo de la cuenta<input id="pgEx" type="email"></label><div class="btns-s"><button type="button" class="small" id="pgExSi">Eximir</button><button type="button" class="small ghost" id="pgExNo">Quitar</button></div></div>';
    el.querySelector('#pgGuardar').onclick = guardarTodas;
    el.querySelector('#pgExSi').onclick = () => exento(true);
    el.querySelector('#pgExNo').onclick = () => exento(false);
    el.querySelectorAll('[data-f]').forEach((b) => { b.onclick = () => { filtro = b.dataset.f; render(el); }; });
    el.querySelectorAll('[data-con]').forEach((b) => { b.onclick = () => M().conectar(M().APPS.find((a) => a.id === b.dataset.con), () => render(el)); });
    lista();
  }
  global.PagosCentral = { render };
})(window);
