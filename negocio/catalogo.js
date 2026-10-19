/* CodeFix · Panel de la tienda (rubros de catálogo): productos, cobro y pedidos. */
window.Catalogo = (function () {
  'use strict';
  const { $, esc, plata, rpc, toast, modal, confirmar } = App;
  const ESTADOS = {
    por_pagar: ['⏳ Sin pagar', 'warn'], en_revision: ['🧾 Por revisar', 'info'], confirmado: ['✅ Confirmado', 'ok'],
    preparando: ['📦 Preparando', 'info'], listo: ['✅ Listo', 'ok'], entregado: ['🎉 Entregado', 'ok'],
    rechazado: ['❌ Rechazado', 'bad'], cancelado: ['❌ Cancelado', 'bad'], expirado: ['⌛ Expirado', '']
  };
  // Siguiente paso de cada estado (lo mismo valida el servidor).
  const SIGUE = {
    en_revision: [['confirmado', '✅ Aprobar pago'], ['rechazado', '❌ Rechazar']],
    por_pagar: [['confirmado', '💵 Pagó por otro medio'], ['cancelado', 'Cancelar']],
    confirmado: [['preparando', '📦 Preparando'], ['listo', '✅ Listo'], ['entregado', '🎉 Entregado']],
    preparando: [['listo', '✅ Listo'], ['entregado', '🎉 Entregado']],
    listo: [['entregado', '🎉 Entregado']]
  };
  const FILTROS = { activos: ['en_revision', 'confirmado', 'preparando', 'listo'], en_revision: ['en_revision'], por_pagar: ['por_pagar'],
    cerrados: ['entregado', 'rechazado', 'cancelado', 'expirado'] };
  let filtro = 'activos', datos = null, pedidos = [];

  function mostrar(v) { if (v === 'pedidos') cargarPedidos(); else cargarProductos(); }

  /* ---------- Pedidos ---------- */
  async function cargarPedidos() {
    try { pedidos = await rpc('negocio_pedidos', { p_estados: FILTROS[filtro] }); } catch (e) { $('pdLista').innerHTML = '<p class="err">' + esc(e.message) + '</p>'; return; }
    if (filtro === 'activos') {
      const n = pedidos.filter((p) => p.estado === 'en_revision').length;
      $('tabPed').textContent = n; $('tabPed').classList.toggle('hidden', !n);
    }
    $('pdLista').innerHTML = pedidos.length ? pedidos.map((p) => {
      const e = ESTADOS[p.estado] || [p.estado, ''];
      return '<div class="card"><div style="display:flex;justify-content:space-between;gap:8px"><b>#' + esc(p.codigo) + ' · ' + esc(p.nombre) + '</b><span class="pill ' + e[1] + '">' + e[0] + '</span></div>' +
        '<div class="sub">' + App.fHora(p.created_at) + ' · RUT ' + esc(p.rut.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + p.rut.slice(-1)) + ' · ' + esc(p.telefono) + (p.email ? ' · ' + esc(p.email) : '') + '</div>' +
        '<ul class="list" style="margin:8px 0">' + p.items.map((i) => '<li><div class="grow">' + i.cant + ' × ' + esc(i.nombre) + '</div><b>' + plata(i.precio * i.cant) + '</b></li>').join('') + '</ul>' +
        '<div class="sub">' + (p.entrega === 'despacho' ? '🚚 Despacho: ' + esc(p.direccion) + ' (' + plata(p.despacho) + ')' : '🏪 Retiro en tienda') + '</div>' +
        '<div><b>Total ' + plata(p.total) + '</b>' + (p.a_pagar < p.total ? ' · abono ' + plata(p.a_pagar) + ' · saldo ' + plata(p.total - p.a_pagar) : '') + '</div>' +
        (p.nota ? '<div class="sub">📝 ' + esc(p.nota) + '</div>' : '') +
        '<div class="acc">' + (p.tiene_comprobante ? '<button class="small ghost" data-comp="' + p.id + '">🧾 Ver comprobante</button>' : '') +
        (SIGUE[p.estado] || []).map((s) => '<button class="small' + (s[0] === 'rechazado' || s[0] === 'cancelado' ? ' danger' : '') + '" data-est="' + s[0] + '" data-id="' + p.id + '">' + s[1] + '</button>').join('') +
        '<a class="btn small alt" target="_blank" rel="noopener" href="' + App.wa(p.telefono, 'Hola ' + p.nombre.split(' ')[0] + ', te escribo por tu pedido #' + p.codigo + ': ' +
          location.origin + location.pathname.replace(/negocio\/.*$/, '') + 'p/?k=' + p.token) + '">📲</a></div></div>';
    }).join('') : '<p class="empty">No hay pedidos aquí.</p>';
  }
  $('pdSeg').onclick = (e) => {
    const b = e.target.closest('[data-f]'); if (!b) return;
    filtro = b.dataset.f; $('pdSeg').querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); cargarPedidos();
  };
  $('pdLista').onclick = async (e) => {
    const c = e.target.closest('[data-comp]');
    if (c) { try { const img = await rpc('pedido_comprobante_ver', { p_id: c.dataset.comp }); if (img) App.verImagen(img, 'Comprobante'); else toast('El comprobante ya se borró'); } catch (err) { toast(err.message); } return; }
    const b = e.target.closest('[data-est]'); if (!b) return;
    const est = b.dataset.est;
    let nota = '';
    if (est === 'rechazado' || est === 'cancelado') {
      if (!await confirmar(est === 'rechazado' ? '¿Rechazar el pago? El stock vuelve a quedar disponible.' : '¿Cancelar el pedido? El stock vuelve a quedar disponible.', 'Sí')) return;
      nota = prompt('Motivo para el cliente (opcional)') || '';
    }
    try { await rpc('pedido_estado', { p_id: b.dataset.id, p_estado: est, p_nota: nota }); toast('✅ Listo'); cargarPedidos(); } catch (err) { toast(err.message); }
  };

  /* ---------- Productos y cobro ---------- */
  async function cargarProductos() {
    try { datos = await rpc('negocio_productos'); } catch (e) { $('prLista').innerHTML = '<p class="err">' + esc(e.message) + '</p>'; return; }
    const slug = ((App.cuenta || {}).negocio || {}).slug || '';
    $('prVer').href = '../c/?s=' + encodeURIComponent(slug);
    const c = datos.cobro, l = datos.productos, lim = Number(datos.limite) || 0;
    $('cobro').innerHTML = '<h2>💳 Cobro y entrega</h2>' +
      (!c.link ? '<p class="aviso">⚠️ Para recibir pedidos online configura tu link de pago en <a href="#mas" onclick="setTimeout(()=>document.querySelector(\'[data-m=abono]\')?.click(),50)">Más → 💳 Abono</a> (el monto de ese link no se usa en la tienda: el cliente paga el total de su pedido).</p>' : '') +
      (!c.online ? '<p class="aviso">⚠️ Tu tienda tiene los pedidos online apagados.</p>' : '') +
      '<div class="row"><div><label for="kModo">Qué cobras online</label><select id="kModo"><option value="total"' + (c.modo === 'total' ? ' selected' : '') + '>El total del pedido</option>' +
      '<option value="abono"' + (c.modo === 'abono' ? ' selected' : '') + '>Un abono (porcentaje)</option></select></div>' +
      '<div><label for="kPct">Porcentaje del abono</label><input id="kPct" type="number" min="1" max="100" value="' + c.pct + '"></div></div>' +
      '<label class="check"><input type="checkbox" id="kDesp"' + (c.despacho ? ' checked' : '') + '> Hago despacho a domicilio</label>' +
      '<label for="kCosto">Costo del despacho</label><input id="kCosto" inputmode="numeric" value="' + (c.despacho_costo || 0) + '">' +
      '<div class="btns"><button id="kGuardar">Guardar</button></div>';
    $('kGuardar').onclick = async () => {
      const pct = parseInt($('kPct').value, 10), costo = parseInt(String($('kCosto').value).replace(/\D/g, '') || '0', 10);
      if (!(pct >= 1 && pct <= 100)) { toast('El porcentaje va de 1 a 100'); return; }
      try { await rpc('negocio_cobro_guardar', { p_modo: $('kModo').value, p_pct: pct, p_despacho: $('kDesp').checked, p_costo: costo }); toast('✅ Guardado'); }
      catch (e) { toast(e.message); }
    };
    $('prCuenta').textContent = l.length + ' de ' + lim + ' productos de tu plan';
    $('prLista').innerHTML = l.length ? l.map((p) => '<div class="card" style="display:flex;gap:12px;align-items:center">' +
      '<div class="mini-logo" style="' + (p.foto ? 'background-image:url(\'' + p.foto + '\')' : '') + '">' + (p.foto ? '' : '🛍️') + '</div>' +
      '<div class="grow"><b>' + esc(p.nombre) + '</b> ' + (p.activo ? '' : '<span class="pill">Oculto</span>') + (p.stock === 0 ? ' <span class="pill bad">Agotado</span>' : '') +
      '<div class="sub">' + plata(p.precio) + ' · ' + (p.stock === null ? 'sin control de stock' : 'stock ' + p.stock) + (p.categoria ? ' · ' + esc(p.categoria) : '') + '</div></div>' +
      '<button class="small ghost" data-ed="' + p.id + '">✏️</button></div>').join('') : '<p class="empty">Aún no tienes productos. Agrega el primero.</p>';
  }
  $('prLista').onclick = (e) => { const b = e.target.closest('[data-ed]'); if (b) editar(datos.productos.find((p) => p.id === b.dataset.ed)); };
  $('prNuevo').onclick = () => editar(null);

  function editar(p) {
    const x = p || { nombre: '', descripcion: '', categoria: '', precio: '', stock: null, activo: true, foto: null };
    let foto = x.foto, fotoCambio = false;
    const d = modal('<h2>' + (p ? '✏️ Editar producto' : '➕ Nuevo producto') + '</h2>' +
      '<label for="eN">Nombre</label><input id="eN" maxlength="80" value="' + esc(x.nombre) + '">' +
      '<div class="row"><div><label for="eP">Precio</label><input id="eP" inputmode="numeric" value="' + (x.precio === '' ? '' : x.precio) + '"></div>' +
      '<div><label for="eS">Stock (vacío = sin control)</label><input id="eS" inputmode="numeric" value="' + (x.stock === null ? '' : x.stock) + '"></div></div>' +
      '<label for="eC">Categoría (opcional)</label><input id="eC" maxlength="40" value="' + esc(x.categoria) + '">' +
      '<label for="eD">Descripción (opcional)</label><textarea id="eD" maxlength="500">' + esc(x.descripcion) + '</textarea>' +
      '<label for="eF">Foto (opcional)</label><input id="eF" type="file" accept="image/*"><div id="eFv" class="sub"></div>' +
      '<label class="check"><input type="checkbox" id="eA"' + (x.activo ? ' checked' : '') + '> Visible en la tienda</label>' +
      '<div class="btns">' + (p ? '<button class="danger ghost" id="eDel">🗑️ Borrar</button>' : '') + '<button class="ghost" data-cerrar>Cancelar</button><button id="eOk">Guardar</button></div><p class="err" id="eErr"></p>');
    const v = (id) => d.querySelector(id);
    if (foto) v('#eFv').textContent = '✅ Tiene foto';
    v('#eF').onchange = async () => {
      const f = v('#eF').files[0]; if (!f) return;
      try { foto = await App.comprimirLogo(f); fotoCambio = true; v('#eFv').textContent = '✅ Foto lista'; } catch (e) { v('#eErr').textContent = e.message; }
    };
    v('#eOk').onclick = async () => {
      const precio = parseInt(String(v('#eP').value).replace(/\D/g, ''), 10), st = String(v('#eS').value).trim();
      if (!v('#eN').value.trim()) { v('#eErr').textContent = 'Escribe el nombre'; return; }
      if (!(precio >= 0)) { v('#eErr').textContent = 'Escribe el precio (solo números)'; return; }
      if (st !== '' && !/^\d+$/.test(st)) { v('#eErr').textContent = 'El stock debe ser un número'; return; }
      const body = { id: p ? p.id : '', nombre: v('#eN').value.trim(), precio, stock: st, categoria: v('#eC').value.trim(),
        descripcion: v('#eD').value.trim(), activo: v('#eA').checked };
      if (fotoCambio || !p) body.foto = foto || '';
      try { await rpc('producto_guardar', { p: body }); d.close(); toast('✅ Guardado'); cargarProductos(); } catch (e) { v('#eErr').textContent = e.message; }
    };
    if (p) v('#eDel').onclick = async () => {
      if (!await confirmar('¿Borrar "' + p.nombre + '"? Los pedidos anteriores no cambian.', 'Sí, borrar')) return;
      try { await rpc('producto_borrar', { p_id: p.id }); d.close(); cargarProductos(); } catch (e) { toast(e.message); }
    };
  }

  return { mostrar };
})();
