/* Centro de Mando · Pagos de todas las apps en un solo lugar.
   1) Precios, link de pago, comisión y datos de transferencia: se escriben una vez y se guardan en todas las apps (cfx_pagos_config_guardar).
   2) Comprobantes por revisar de todas las apps: ver, aprobar (con los días de Premium) o rechazar (cfx_pago_resolver).
   3) Cuentas que no pagan el primer pago (por ejemplo, las de prueba que creas tú). Usa las conexiones de Apps (MisApps). */
(function (global) {
  'use strict';
  const A = global.App, { esc, toast, modal, confirmar } = A;
  const M = () => global.MisApps;
  const pesos = (n) => '$' + Number(n || 0).toLocaleString('es-CL');
  const PERIODO = { inicio: 'Primer pago', mensual: 'Mensual', meses: 'Varios meses', anual: 'Anual', otro: 'Otro monto', conexiones: 'Conexiones extra' };
  const MEDIO = { link: 'link', transferencia: 'transferencia', tarjeta: 'tarjeta', mp: '⚡ Mercado Pago', flow: '💳 Flow' };
  let raiz = null, cfg = null, filtro = 'pendiente';

  const conectadas = () => M().APPS.filter((a) => (M().estado[a.id] || {}).conectado);
  const nf = (x) => /Could not find|does not exist|PGRST202/i.test(x.message) ? 'su base aún no tiene los pagos nuevos (se actualiza sola en máx. 10 min)' : x.message;

  function campo(k, t, v, tipo, ayuda) {
    return '<label>' + t + '<input data-k="' + k + '" type="' + (tipo || 'text') + '" value="' + esc(v == null ? '' : v) + '"' + (tipo === 'number' ? ' inputmode="decimal"' : '') + '></label>' + (ayuda ? '<p class="sub" style="margin-top:-4px">' + ayuda + '</p>' : '');
  }
  // G85: un solo PAGO GENERAL para todas las apps (⚡ Mercado Pago automático · 🔗 link abierto · 🏦 transferencia) + cupones.
  // Lo antiguo (links de monto fijo y link de tarjeta) ya no se muestra ni se usa, pero queda guardado (no se borra).
  function formulario() {
    const c = cfg || {}, n = c.negocio || {}, cl = c.cliente || {}, t = c.transferencia || {};
    return '<div class="card" id="pgCfg"><h2>Precios</h2><p class="sub">Iguales para todas las apps. Al guardar se copian a todas las apps conectadas.</p>' +
      '<h3>Negocio (cuenta principal)</h3><div class="grid2">' + campo('negocio.inicio', 'Primer pago', n.inicio, 'number') + campo('negocio.inicio_dias', 'Días que da', n.inicio_dias, 'number') +
      campo('negocio.mensual', 'Premium mensual', n.mensual, 'number') + campo('negocio.anual', 'Premium anual', n.anual, 'number') + '</div>' +
      '<label class="fila" style="gap:8px"><input type="checkbox" data-k="negocio.exigir_inicio" style="width:auto"' + (n.exigir_inicio ? ' checked' : '') + '> Los negocios nuevos no pueden usar la app hasta su primer pago</label>' +
      '<p class="sub">Solo para los que se registren desde que lo activas. Cuando vence, quedan en la versión gratis.</p>' +
      '<h3>Cliente</h3><div class="grid2">' + campo('cliente.mensual', 'Premium mensual', cl.mensual, 'number') + campo('cliente.anual', 'Premium anual', cl.anual, 'number') + '</div>' +
      '<h2 style="margin-top:18px">💳 Pago general</h2><p class="sub">Uno solo para todo (cada app, Premium, módulos y packs). La persona ve el total con su cupón ya descontado.</p>' +
      '<div class="pg-medio"><h3>🔗 Link de pago abierto</h3><p class="sub">Tu link sin monto (el que dejas abierto). La persona copia el total, paga y sube el pantallazo: lo apruebas en "Por revisar".</p>' +
        campo('link', 'Link general (sin monto)', c.link, 'url') +
        campo('comision_pct', 'Cargo por pago online (%)', c.comision_pct, 'number', 'Se suma como una línea aparte en Mercado Pago y en el link. Por transferencia pagan el precio exacto. 0 = sin cargo.') + '</div>' +
      '<div class="pg-medio"><h3>🏦 Transferencia</h3><div class="grid2">' + campo('transferencia.banco', 'Banco', t.banco) + campo('transferencia.tipo', 'Tipo de cuenta', t.tipo) + campo('transferencia.numero', 'Número', t.numero) +
        campo('transferencia.rut', 'RUT', t.rut) + campo('transferencia.titular', 'Titular', t.titular) + campo('transferencia.correo', 'Correo', t.correo, 'email') + '</div></div>' +
      campo('whatsapp', 'WhatsApp para dudas de pago (con 56)', c.whatsapp, 'tel') +
      '<button type="button" class="block" id="pgGuardar">Guardar en todas las apps</button><div id="pgRes"></div></div>' +
      '<div class="card" id="pgMp"><h2>⚡ Mercado Pago automático</h2><p class="sub">Pagan con tarjeta, débito o saldo y el plan <b>se activa solo</b>: sin comprobante y sin que tú apruebes. Te llega push "⚡ Pago automático" y a la persona "✅ Pago aprobado".</p><div id="mpEst"><p class="sub">Revisando…</p></div>' +
        '<label>Access Token de producción<input id="mpTk" autocomplete="off" spellcheck="false" placeholder="APP_USR-…"></label>' +
        '<p class="sub" style="margin-top:-4px">Dónde: Mercado Pago → Tu negocio → Configuración → Credenciales → Credenciales de producción → Access Token. Queda guardado solo en la base de cada app: nadie lo puede volver a ver.</p>' +
        '<div class="btns-s"><button type="button" id="mpCon">Conectar en todas las apps</button><button type="button" class="ghost" id="mpPausa">Pausar</button></div><div id="mpRes"></div><div id="mpSubs"></div></div>' +
      // G38 💳 Flow: Webpay + transferencia + MACH con una sola cuenta (se activa solo, igual que Mercado Pago).
      '<div class="card" id="pgFlow"><h2>💳 Webpay con Flow</h2><p class="sub">Un 2.º pago automático: Webpay (débito, crédito, prepago), transferencia o MACH. Se activa solo, igual que Mercado Pago.</p><div id="flEst"><p class="sub">Revisando…</p></div>' +
        '<label>API Key<input id="flKey" autocomplete="off" spellcheck="false" placeholder="XXXXXXXX-XXXX-…"></label>' +
        '<label>Secret Key<input id="flSec" type="password" autocomplete="off" spellcheck="false"></label>' +
        '<label class="fila" style="gap:8px"><input type="checkbox" id="flSand" style="width:auto"> Son llaves de pruebas (sandbox.flow.cl)</label>' +
        '<p class="sub">Dónde: flow.cl → Mi cuenta → Integración → API Keys (copia las 2). Quedan solo en la base de cada app: nadie las vuelve a ver.</p>' +
        '<div class="btns-s"><button type="button" id="flCon">Conectar en todas las apps</button><button type="button" class="ghost" id="flPausa">Pausar</button></div><div id="flRes"></div></div>' +
      '<div class="card"><h2>🏷️ Cupones</h2><p class="sub">Se aplican al pagar Premium (Mercado Pago, link o transferencia): la persona escribe el código y ve el descuento al tiro.</p><button type="button" class="ghost" id="pgCup">Crear o ver cupones</button></div>';
  }
  // G112 c2 · 🔄 Desde cuándo está la llave; con más de 1 año avisa "Cámbiala" (y en qué apps).
  const llaveDesde = (c) => { try { return c && c.desde ? ' · 🔑 ' + esc(new Date(c.desde).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })) : ''; } catch (x) { return ''; } };
  const llaveRotar = (out, donde) => { const v = out.filter((r) => r[1].rotar); return v.length ? '<p class="sub warn" data-cfx-rotar>🔄 La llave tiene más de 1 año en ' + esc(v.map((r) => r[0].nombre.split(' ·')[0]).join(', ')) + ': crea una nueva en ' + esc(donde) + ', pégala aquí y toca Conectar en todas las apps.</p>' : ''; };
  // Estado del pago automático en cada app.
  async function mpEstado() {
    const z = raiz.querySelector('#mpEst'); if (!z) return;
    const out = await Promise.all(conectadas().map(async (a) => { try { return [a, await M().rpcDe(M().cliente(a), 'cfx_mp_estado')]; } catch (x) { return [a, { error: nf(x) }]; } }));
    const on = out.filter((r) => r[1].activo), cuenta = (on[0] || [])[1];
    z.innerHTML = (cuenta ? '<p class="pill ok" style="display:inline-block">✓ Activo en ' + on.length + ' de ' + out.length + (cuenta.nick ? ' · ' + esc(cuenta.nick) : '') + ' · …' + esc(cuenta.fin || '') + llaveDesde(cuenta) + '</p>' + llaveRotar(out, 'Mercado Pago → Credenciales → Access Token') : '<p class="pill warn" style="display:inline-block">Sin conectar</p>') +
      out.filter((r) => !r[1].activo).map((r) => '<p class="sub">' + esc(r[0].nombre.split(' ·')[0]) + ': ' + esc(r[1].error || (r[1].conectado ? 'en pausa' : 'sin conectar')) + '</p>').join('');
    const bp = raiz.querySelector('#mpPausa'); if (bp) { bp.textContent = on.length ? 'Pausar' : 'Prender'; bp.dataset.on = on.length ? '1' : ''; bp.hidden = !out.some((r) => r[1].conectado); }
    mpSubs();
  }
  // G108 🔁 Renovaciones automáticas (Premium/módulos que se pagan solos con MP), de todas las apps.
  async function mpSubs() {
    const z = raiz.querySelector('#mpSubs'); if (!z) return;
    const out = await Promise.all(conectadas().map(async (a) => { try { return [a, await M().rpcDe(M().cliente(a), 'cfx_mp_subs_admin')]; } catch (x) { return [a, null]; } }));
    const it = [];
    out.forEach((r) => { if (r[1]) (r[1].items || []).forEach((x) => it.push(Object.assign({ app: r[0].nombre.split(' ·')[0] }, x))); });
    const act = it.filter((x) => x.estado === 'activa').length;
    const fe = (f) => f ? new Date(f).toLocaleDateString('es-CL') : '';
    z.innerHTML = '<details style="margin-top:8px"><summary>🔁 Renovaciones automáticas: ' + act + ' activa' + (act === 1 ? '' : 's') + '</summary>' +
      (it.length ? it.map((x) => '<div class="fila"><span class="grow">' + esc(x.app) + ' · ' + esc(x.nombre || x.email) + '<br><small class="sub">' + esc(x.producto ? '🧩 ' + x.producto : '⭐ Premium') + ' · $' + (+x.monto || 0).toLocaleString('es-CL') +
        (x.periodo === 'anual' ? '/año' : '/mes') + ' · ' + (x.cobros ? x.cobros + ' cobro(s), último ' + fe(x.ultimo) : '1.er cobro ' + fe(x.inicio)) + '</small></span><span class="pill ' + (x.estado === 'activa' ? 'ok' : 'warn') + '">' + esc(x.estado) + '</span></div>').join('')
        : '<p class="sub">Aún nadie. Aparece cuando alguien marca "🔁 Renovar solo" al pagar con Mercado Pago.</p>') + '</details>';
  }
  async function mpGuardar(tk, activo) {
    const res = raiz.querySelector('#mpRes'), out = [];
    if (tk && !/^(APP_USR|TEST)-/.test(tk)) return toast('El Access Token empieza con APP_USR-');
    res.innerHTML = '<p class="sub">Guardando…</p>';
    for (const a of M().APPS) {
      if (!(M().estado[a.id] || {}).conectado) { out.push([a, 'warn', 'No conectada']); continue; }
      try { await M().rpcDe(M().cliente(a), 'cfx_mp_guardar', { p_token: tk || null, p_activo: activo }); out.push([a, 'ok', tk ? 'Conectado' : activo ? 'Prendido' : 'En pausa']); }
      catch (x) { out.push([a, 'bad', nf(x)]); }
    }
    res.innerHTML = out.map((r) => '<div class="fila"><span class="grow">' + esc(r[0].nombre.split(' ·')[0]) + '</span><span class="pill ' + r[1] + '">' + esc(r[2]) + '</span></div>').join('');
    raiz.querySelector('#mpTk').value = ''; mpEstado();
  }
  // G38 💳 Flow: mismo modelo que Mercado Pago (estado por app · conectar/pausar en las 7).
  async function flEstado() {
    const z = raiz.querySelector('#flEst'); if (!z) return;
    const out = await Promise.all(conectadas().map(async (a) => { try { return [a, await M().rpcDe(M().cliente(a), 'cfx_flow_estado')]; } catch (x) { return [a, { error: nf(x) }]; } }));
    const on = out.filter((r) => r[1].activo), cuenta = (on[0] || [])[1];
    z.innerHTML = (cuenta ? '<p class="pill ok" style="display:inline-block">✓ Activo en ' + on.length + ' de ' + out.length + (cuenta.sandbox ? ' · 🧪 pruebas' : '') + ' · …' + esc(cuenta.fin || '') + llaveDesde(cuenta) + '</p>' + llaveRotar(out, 'Flow → Integración → API Keys') : '<p class="pill warn" style="display:inline-block">Sin conectar</p>') +
      out.filter((r) => !r[1].activo).map((r) => '<p class="sub">' + esc(r[0].nombre.split(' ·')[0]) + ': ' + esc(r[1].error || (r[1].conectado ? 'en pausa' : 'sin conectar')) + '</p>').join('');
    const bp = raiz.querySelector('#flPausa'); if (bp) { bp.textContent = on.length ? 'Pausar' : 'Prender'; bp.dataset.on = on.length ? '1' : ''; bp.hidden = !out.some((r) => r[1].conectado); }
  }
  async function flGuardar(k, sc, activo) {
    const res = raiz.querySelector('#flRes'), out = [], sand = !!(raiz.querySelector('#flSand') || {}).checked;
    res.innerHTML = '<p class="sub">Guardando…</p>';
    for (const a of M().APPS) {
      if (!(M().estado[a.id] || {}).conectado) { out.push([a, 'warn', 'No conectada']); continue; }
      try { await M().rpcDe(M().cliente(a), 'cfx_flow_guardar', { p_apikey: k || null, p_secret: sc || null, p_activo: activo, p_sandbox: sand }); out.push([a, 'ok', k ? 'Conectado' : activo ? 'Prendido' : 'En pausa']); }
      catch (x) { out.push([a, 'bad', nf(x)]); }
    }
    res.innerHTML = out.map((r) => '<div class="fila"><span class="grow">' + esc(r[0].nombre.split(' ·')[0]) + '</span><span class="pill ' + r[1] + '">' + esc(r[2]) + '</span></div>').join('');
    raiz.querySelector('#flKey').value = ''; raiz.querySelector('#flSec').value = ''; flEstado();
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
      // Billetera: las conexiones extra se piden aparte (solicitudes_pago) y también se revisan aquí.
      if (a.id === 'billetera') try {
        const est = { pendiente: 'pendiente', aprobada: 'aprobado', rechazada: 'rechazado' };
        (await M().rpcDe(M().cliente(a), 'admin_pagos')).filter((s) => s.tipo === 'conexiones' && (filtro === 'todos' || est[s.estado] === filtro)).forEach((s) => filas.push({
          id: s.id, conexiones: true, nombre: s.negocio_nombre, email: (s.paquetes || '') + ' paquete(s) de conexiones extra', rol: 'negocio', periodo: 'conexiones', monto: s.monto, medio: 'transferencia',
          creado: s.creado, nota: s.nota, motivo: s.motivo, estado: est[s.estado] || s.estado, con_comprobante: !!s.comprobante_path, path: s.comprobante_path, aprobados: 1, app: a }));
      } catch (x) { /* Billetera sin conexiones extra */ }
    }));
    const faltan = M().APPS.length - conectadas().length;
    filas.sort((x, y) => String(y.creado).localeCompare(String(x.creado)));
    cont.innerHTML = (faltan ? '<p class="sub warn">' + faltan + ' app(s) sin conectar: conéctalas en Apps para ver sus pagos.</p>' : '') +
      avisos.map((t) => '<p class="sub warn">' + esc(t) + '</p>').join('') +
      (filas.map((g, i) => '<div class="card"><div class="fila"><span class="pill info">' + esc(g.app.nombre.split(' ·')[0]) + '</span><span class="tit grow">' + esc(g.nombre || g.email) + '</span>' +
        '<span class="pill ' + (g.estado === 'aprobado' ? 'ok' : g.estado === 'rechazado' ? 'bad' : 'warn') + '">' + g.estado + '</span></div>' +
        '<p class="sub">' + esc(g.email) + ' · ' + (g.rol === 'negocio' ? 'Negocio' : g.rol === 'cliente' ? 'Cliente' : 'Otro') + ' · ' + (PERIODO[g.periodo] || g.periodo) + (g.meses ? ' (' + g.meses + ')' : '') + (g.producto ? ' · 🧩 ' + esc(g.producto) : '') + ' · <b>' + pesos(g.monto) + '</b> por ' + (MEDIO[g.medio] || g.medio) +
        ' · ' + A.hace(g.creado) + (g.aprobados ? ' · ya pagó ' + g.aprobados + ' vez/veces' : ' · primer pago') + (g.nota ? '<br>' + esc(g.nota) : '') + (g.motivo ? '<br>Motivo: ' + esc(g.motivo) : '') +
        (g.estado === 'aprobado' && g.dias ? '<br>' + g.dias + ' días de ' + (g.producto ? 'módulo' : 'Premium') + (g.hasta ? ' · activo hasta ' + esc(new Date(g.hasta).toLocaleDateString('es-CL')) : '') : '') +
        // G87 K: 🎁 regalo o 🔑 respaldo (no se pudo activar solo): la key de 1 uso, para reenviarla si la persona la pierde.
        (g.key_regalo ? '<br>' + (g.regalo ? '🎁 Key de regalo: ' : '🔑 Key de respaldo: ') + '<b>' + esc(g.key_regalo) + '</b>' : '') + '</p>' +
        (g.estado === 'pendiente' && (g.medio === 'mp' || g.medio === 'flow') ? '<p class="sub">⏳ Abrió ' + (g.medio === 'flow' ? 'Flow' : 'Mercado Pago') + ': se aprueba solo apenas pague (se revisa cada 1 min).</p><div class="btns-s"><button type="button" class="small ghost" data-mp="' + i + '">🔄 Revisar ahora</button><button type="button" class="small ghost" data-no="' + i + '">Cerrar</button></div>' :
        g.estado === 'pendiente' ? '<div class="btns-s">' + (g.con_comprobante ? '<button type="button" class="small ghost" data-v="' + i + '">Ver comprobante</button>' : '') +
          '<button type="button" class="small" data-ok="' + i + '">Aprobar</button><button type="button" class="small ghost" data-no="' + i + '">Rechazar</button></div>' :
          g.estado === 'aprobado' && global.CFX_COMPROBANTE ? '<div class="btns-s"><button type="button" class="small ghost" data-cb="' + i + '">🧾 Comprobante</button></div>' : '') + '</div>').join('') ||
        '<p class="empty">' + (filtro === 'pendiente' ? 'No hay pagos por revisar 🎉' : 'Sin pagos') + '</p>');
    cont.onclick = async (ev) => {
      const b = ev.target.closest('[data-v],[data-ok],[data-no],[data-cb],[data-mp]'); if (!b) return;
      if (b.dataset.cb) return comprobante(filas[+b.dataset.cb]);
      if (b.dataset.mp) { const g = filas[+b.dataset.mp]; try { const r = await M().rpcDe(M().cliente(g.app), 'cfx_mp_revisar_admin', { p_id: g.id }); toast(r === 'aprobado' ? '✅ Pagado: plan activado' : 'Aún no paga en ' + (g.medio === 'flow' ? 'Flow' : 'Mercado Pago')); lista(); } catch (x) { toast(nf(x)); } return; }
      const g = filas[+(b.dataset.v || b.dataset.ok || b.dataset.no)], c = M().cliente(g.app);
      try {
        if (b.dataset.v && g.conexiones) { const { data: u } = await c.storage.from('pagos').createSignedUrl(g.path, 600); if (u) A.verImagen(u.signedUrl, 'Comprobante', 'comprobante.jpg'); }
        else if (b.dataset.v) A.verImagen(await M().rpcDe(c, 'cfx_pago_comprobante', { p_id: g.id }), 'Comprobante', 'comprobante.jpg');
        else if (b.dataset.ok && g.conexiones) {
          const d = modal('<h2>Aprobar conexiones extra</h2><p class="muted">' + esc(g.nombre) + ' · ' + pesos(g.monto) + '</p><p class="sub">Revisa que el monto llegó a tu cuenta. Se suman las conexiones y se le avisa al negocio.</p><div class="btns"><button class="ghost" data-cerrar type="button">Cancelar</button><button id="pk" type="button">Aprobar</button></div>');
          d.querySelector('#pk').onclick = async () => { try { await M().rpcDe(c, 'admin_resolver_pago', { p_id: g.id, p_aprobar: true, p_motivo: null }); d.close(); toast('Conexiones sumadas'); lista(); } catch (x) { toast(x.message); } };
        } else if (b.dataset.ok) {
          const sug = g.sugeridos != null ? g.sugeridos : ({ inicio: (cfg && cfg.negocio && cfg.negocio.inicio_dias) || 30, mensual: 30, anual: 365 }[g.periodo] || 30);
          const d = modal('<h2>Aprobar pago</h2><p class="muted">' + esc(g.nombre || g.email) + ' · ' + pesos(g.monto) + ' (' + (PERIODO[g.periodo] || '') + (g.meses ? ', ' + g.meses + ' meses' : '') + ')' + (g.producto ? ' · 🧩 ' + esc(g.producto) : '') + '</p><label>Días de ' + (g.producto ? 'módulo' : 'Premium') + ' que activa<input id="pd" type="number" inputmode="numeric" step="1" value="' + sug + '"></label>' +
            '<p class="sub">Calculado según lo que pagó (mensual 30, anual 365, cada mes 30; otro monto en proporción). Siempre días enteros. Revisa que el monto llegó a tu cuenta. 0 = solo registrar el pago.</p><div class="btns"><button class="ghost" data-cerrar type="button">Cancelar</button><button id="pk" type="button">Aprobar</button></div>');
          d.querySelector('#pk').onclick = async () => {
            try { const r = await M().rpcDe(c, 'cfx_pago_resolver', { p_id: g.id, p_aprobar: true, p_dias: Math.max(0, Math.round(+d.querySelector('#pd').value || 0)) }); d.close(); toast('Aprobado' + (r.hasta ? ': Premium hasta ' + A.fCorta(String(r.hasta).slice(0, 10)) : '')); lista(); }
            catch (x) { toast(x.message); }
          };
        } else {
          const d = modal('<h2>Rechazar pago</h2><label>Motivo (le llega a la persona)<input id="pm" maxlength="200" value="No encontramos el pago en la cuenta"></label><div class="btns"><button class="ghost" data-cerrar type="button">Cancelar</button><button id="pk" type="button">Rechazar</button></div>');
          d.querySelector('#pk').onclick = async () => {
            try { await (g.conexiones ? M().rpcDe(c, 'admin_resolver_pago', { p_id: g.id, p_aprobar: false, p_motivo: d.querySelector('#pm').value }) : M().rpcDe(c, 'cfx_pago_resolver', { p_id: g.id, p_aprobar: false, p_motivo: d.querySelector('#pm').value })); d.close(); toast('Rechazado'); lista(); } catch (x) { toast(x.message); }
          };
        }
      } catch (x) { toast(x.message); }
    };
  }

  /* G37: comprobante del pago aprobado (núcleo comprobante.js: WhatsApp, Bluetooth o PDF). No es boleta. */
  function comprobante(g) {
    const app = g.app.nombre.split(' ·')[0];
    const nom = g.conexiones ? 'Conexiones extra' : g.producto ? 'Módulo ' + g.producto : 'Plan Premium · ' + (PERIODO[g.periodo] || g.periodo || '');
    global.CFX_COMPROBANTE.abrir({ titulo: 'Comprobante de pago', negocio: 'CodeFix · ' + app, fecha: g.resuelto || g.creado, numero: String(g.id || '').slice(0, 8).toUpperCase(), cliente: g.nombre || g.email,
      items: [{ cant: 1, nombre: nom + (g.meses ? ' (' + g.meses + ' meses)' : ''), precio: Number(g.monto) || 0 }], total: Number(g.monto) || 0,
      medio: g.medio === 'link' ? 'Link de pago' : g.medio === 'mp' ? 'Mercado Pago' : g.medio === 'flow' ? 'Flow' : g.medio });
  }

  async function exento(si) {
    const em = raiz.querySelector('#pgEx').value.trim(), ap = M().APPS.find((a) => a.id === raiz.querySelector('#pgExApp').value);
    if (!em) return toast('Escribe el correo');
    try { await M().rpcDe(M().cliente(ap), 'cfx_exento_email', { p_email: em, p_si: si }); toast(si ? em + ' no paga el primer pago en ' + ap.nombre : em + ' vuelve a pagar normal'); }
    catch (x) { toast(nf(x)); }
  }

  // Liberar el registro N días (en una app o en todas): nadie queda bloqueado y las cuentas nuevas quedan en gratis sin primer pago.
  async function liberar(dias) {
    const id = raiz.querySelector('#lbApp').value, res = raiz.querySelector('#lbRes');
    const apps = conectadas().filter((a) => id === 'todas' || a.id === id), out = [];
    for (const a of apps) {
      try { const r = await M().rpcDe(M().cliente(a), 'cfx_liberar', { p_dias: dias }); out.push([a, r.activo ? 'ok' : 'info', r.activo ? 'Liberada hasta el ' + A.fCorta(String(r.hasta).slice(0, 10)) : 'Cobro normal']); }
      catch (x) { out.push([a, 'bad', nf(x)]); }
    }
    res.innerHTML = out.map((r) => '<div class="fila"><span class="grow">' + esc(r[0].nombre.split(' ·')[0]) + '</span><span class="pill ' + r[1] + '">' + esc(r[2]) + '</span></div>').join('') || '<p class="sub warn">Conecta la app en Apps.</p>';
  }
  async function verLiberar() {
    const res = raiz.querySelector('#lbRes'); if (!res) return;
    const out = await Promise.all(conectadas().map(async (a) => { try { const r = await M().rpcDe(M().cliente(a), 'cfx_liberar', {}); return r.activo ? esc(a.nombre.split(' ·')[0]) + ' hasta el ' + A.fCorta(String(r.hasta).slice(0, 10)) : ''; } catch (x) { return ''; } }));
    const l = out.filter(Boolean);
    res.innerHTML = l.length ? '<p class="sub">🎁 Liberadas ahora: ' + l.join(' · ') + '</p>' : '<p class="sub">Ninguna app liberada: se cobra normal.</p>';
  }

  async function render(el) {
    raiz = el;
    el.innerHTML = '<div class="titulo-v"><h2>Pagos</h2><span class="sub">Las 7 apps</span></div><p class="sub">Cargando…</p>';
    await M().preparar();
    try { cfg = await A.rpc('cfx_pagos_config'); } catch (x) { cfg = null; }
    const sin = M().APPS.filter((a) => !(M().estado[a.id] || {}).conectado);
    el.innerHTML = '<div class="titulo-v"><h2>Pagos</h2><span class="sub">Las 7 apps</span></div>' +
      (sin.length ? '<div class="card"><p class="sub" style="margin:0 0 10px">Para ver y aprobar sus pagos, conecta:</p><div class="apps-con" style="display:flex;flex-wrap:wrap;gap:8px">' + sin.map((a) => '<button type="button" class="small ghost" data-con="' + a.id + '">' + esc(a.nombre.split(' ·')[0]) + '</button>').join('') + '</div></div>' : '') +
      '<div class="seg chips"><button type="button" class="chip' + (filtro === 'pendiente' ? ' on' : '') + '" data-f="pendiente">Por revisar</button><button type="button" class="chip' + (filtro === 'todos' ? ' on' : '') + '" data-f="todos">Todos</button></div>' +
      '<div id="pgLista"></div>' + formulario() +
      '<div class="card"><h2>Cuentas sin primer pago</h2><p class="sub">Para cuentas de prueba o de regalo: entran sin pagar el primer pago.</p>' +
      '<label>App<select id="pgExApp">' + M().APPS.map((a) => '<option value="' + a.id + '">' + esc(a.nombre) + '</option>').join('') + '</select></label>' +
      '<label>Correo de la cuenta<input id="pgEx" type="email"></label><div class="btns-s"><button type="button" class="small" id="pgExSi">Eximir</button><button type="button" class="small ghost" id="pgExNo">Quitar</button></div></div>' +
      '<div class="card"><h2>🎁 Liberar el registro</h2><p class="sub">Por los días que elijas nadie queda bloqueado por el primer pago, y las cuentas que se creen en ese tiempo quedan en la versión gratis (sin primer pago). Al terminar, vuelve el cobro normal para las nuevas.</p>' +
      '<label>App<select id="lbApp"><option value="todas">Las 7 apps</option>' + M().APPS.map((a) => '<option value="' + a.id + '">' + esc(a.nombre) + '</option>').join('') + '</select></label>' +
      '<label>Días<input id="lbDias" type="number" inputmode="numeric" min="1" max="90" value="7"></label>' +
      '<div class="btns-s"><button type="button" class="small" id="lbSi">Liberar</button><button type="button" class="small ghost" id="lbNo">Terminar ahora</button></div><div id="lbRes"></div></div>';
    el.querySelector('#pgGuardar').onclick = guardarTodas;
    el.querySelector('#mpCon').onclick = () => { const tk = el.querySelector('#mpTk').value.trim(); if (!tk) return toast('Pega tu Access Token'); mpGuardar(tk, true); };
    el.querySelector('#mpPausa').onclick = (ev) => mpGuardar(null, !ev.target.dataset.on);
    el.querySelector('#flCon').onclick = () => { const k = el.querySelector('#flKey').value.trim(), sc = el.querySelector('#flSec').value.trim(); if (!k || !sc) return toast('Pega las 2 llaves de Flow'); flGuardar(k, sc, true); };
    el.querySelector('#flPausa').onclick = (ev) => flGuardar(null, null, !ev.target.dataset.on);
    el.querySelector('#pgCup').onclick = () => { try { sessionStorage.setItem('cm-control-secc', 'cupones'); } catch (x) { /* nada */ } const b = document.querySelector('[data-v="control"]'); if (b) b.click(); else location.hash = '#control'; };
    mpEstado(); flEstado();
    el.querySelector('#pgExSi').onclick = () => exento(true);
    el.querySelector('#pgExNo').onclick = () => exento(false);
    el.querySelector('#lbSi').onclick = () => { const n = Math.round(+el.querySelector('#lbDias').value || 0); if (n < 1 || n > 90) return toast('De 1 a 90 días'); liberar(n); };
    el.querySelector('#lbNo').onclick = () => liberar(0);
    verLiberar();
    el.querySelectorAll('[data-f]').forEach((b) => { b.onclick = () => { filtro = b.dataset.f; render(el); }; });
    el.querySelectorAll('[data-con]').forEach((b) => { b.onclick = () => M().conectar(M().APPS.find((a) => a.id === b.dataset.con), () => render(el)); });
    lista();
  }
  global.PagosCentral = { render };
})(window);
