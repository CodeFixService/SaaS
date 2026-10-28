/* Centro de Mando · Pedidos: para quién, qué pide (qué, color, cantidad, precio, nota y foto), entrega y abono; el total se suma solo.
   Estados Pendiente → Listo → Entregado. PDF de uno o de todos (una página por pedido), compartir, WhatsApp al cliente.
   Las fotos quedan solo en este teléfono (CM.fotos); el servidor guarda únicamente el texto. */
(function () {
  'use strict';
  const A = App, CM = window.CM, { esc, toast, modal, hoy, sumarDias } = A;
  const ui = { f: 'abierto', abiertos: {} };
  const EST = [['abierto', 'Pendientes'], ['listo', 'Listos'], ['hecho', 'Entregados']];
  const COLORES = [['Blanco', '#ffffff'], ['Negro', '#111827'], ['Rojo', '#dc2626'], ['Rosado', '#f472b6'], ['Fucsia', '#d946ef'], ['Morado', '#7c3aed'], ['Azul', '#2563eb'],
    ['Celeste', '#7dd3fc'], ['Verde', '#16a34a'], ['Amarillo', '#facc15'], ['Naranjo', '#f97316'], ['Dorado', '#d4a017'], ['Plateado', '#c0c4cc'], ['Café', '#8b5a2b']];
  const plata = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('es-CL');
  const num = (v) => Number(String(v || '').replace(/[^\d]/g, '')) || 0;
  // Precios: escribes solo números (1000, 1560…) y la app suma sola. "Verificar precio" = aún no lo sabes.
  const cantN = (x) => /^\d+$/.test(String(x.cant || '').trim()) ? Number(x.cant) : 1;
  const linea = (x) => x.verificar ? 0 : num(x.precio) * cantN(x);
  const totalDe = (d) => { const t = (d.items || []).reduce((a, x) => a + linea(x), 0); return t || num(d.total); };
  const porVerificar = (d) => (d.items || []).filter((x) => x.verificar).length;
  const saldo = (d) => Math.max(0, totalDe(d) - num(d.abono));
  // Teléfono: escribes "912345678" y queda +56 9 1234 5678 (se guarda solo con números).
  const telNorm = (t) => { let n = String(t || '').replace(/\D/g, ''); if (n.length === 9 && n[0] === '9') n = '56' + n; else if (n.length === 8) n = '569' + n; return n; };
  const telVer = (t) => { const n = telNorm(t); return n.length === 11 && n.startsWith('569') ? '+56 9 ' + n.slice(3, 7) + ' ' + n.slice(7) : t || ''; };
  const precioTxt = (x) => x.verificar ? 'precio por verificar' : num(x.precio) ? (cantN(x) > 1 ? cantN(x) + ' × ' + plata(x.precio) + ' = ' : '') + plata(linea(x)) : '';
  const fEnt = (p) => p.fecha ? new Date(p.fecha + 'T12:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' }) + (p.datos.hora ? ' · ' + p.datos.hora : '') : 'Sin fecha';
  const itemTxt = (x) => [x.que, x.color, x.cant ? 'x' + x.cant : ''].filter(Boolean).join(' · ');

  /* ---------- PDF (hecho a mano, sin librerías). Texto con letras estándar y fotos JPEG ---------- */
  const WIN = { '€': 128, '…': 133, '•': 149, '–': 150, '—': 151, '‘': 145, '’': 146, '“': 147, '”': 148 };
  const win = (t) => Array.from(String(t == null ? '' : t)).map((c) => { const n = c.charCodeAt(0); return WIN[c] ? String.fromCharCode(WIN[c]) : n < 256 && !(n >= 128 && n < 160) ? c : ''; }).join('').replace(/\s+/g, ' ').trim();
  const pdfTxt = (t) => '(' + t.replace(/[\\()]/g, (m) => '\\' + m) + ')';
  const ancho = (t, s, b) => Array.from(t).reduce((a, c) => a + (/[il.,;:|!'j]/.test(c) ? 0.25 : /[mwMW]/.test(c) ? 0.85 : /[A-Z]/.test(c) ? 0.68 : /[0-9]/.test(c) ? 0.56 : c === ' ' ? 0.28 : 0.52), 0) * s * (b ? 1.06 : 1);
  const cortar = (t, s, max, b) => { if (ancho(t, s, b) <= max) return t; while (t.length > 1 && ancho(t + '…', s, b) > max) t = t.slice(0, -1); return t.trimEnd() + String.fromCharCode(133); };
  // Parte un texto en líneas que caben en "max".
  const lineas = (t, s, max, b) => { const out = []; let l = ''; t.split(' ').forEach((w) => { const p = l ? l + ' ' + w : w; if (ancho(p, s, b) <= max) l = p; else { if (l) out.push(l); l = cortar(w, s, max, b); } }); if (l) out.push(l); return out; };

  function Documento() {
    const W = 420, H = 595, M = 28, pags = [], imgs = [];
    const brand = (getComputedStyle(document.documentElement).getPropertyValue('--brand') || '').trim();
    const RGB = /^#[0-9a-f]{6}$/i.test(brand) ? [1, 3, 5].map((k) => (parseInt(brand.substr(k, 2), 16) / 255).toFixed(3)).join(' ') : '0.24 0.39 1';
    let c = '';
    const doc = {
      W, H, M, RGB, y: 0,
      pagina() { if (c) pags.push(c); c = RGB + ' rg 0 ' + (H - 6) + ' ' + W + ' 6 re f\n'; doc.y = H - 30; doc.pie(); },
      pie() { c += 'BT 0.6 0.62 0.66 rg /F1 8 Tf ' + M + ' 20 Td ' + pdfTxt(win('Centro de Mando · CodeFix')) + ' Tj ET\n'; },
      texto(x, y, s, f, t, col) { c += 'BT ' + (col || '0.07 0.09 0.15') + ' rg /' + f + ' ' + s + ' Tf ' + x.toFixed(1) + ' ' + y.toFixed(1) + ' Td ' + pdfTxt(t) + ' Tj ET\n'; },
      rect(x, y, w, h, col) { c += col + ' rg ' + x.toFixed(1) + ' ' + y.toFixed(1) + ' ' + w.toFixed(1) + ' ' + h.toFixed(1) + ' re f\n'; },
      linea(x1, y1, x2, y2) { c += '0.85 0.87 0.9 RG 0.6 w ' + x1 + ' ' + y1 + ' m ' + x2 + ' ' + y2 + ' l S\n'; },
      imagen(f, x, y, w, h) { let k = imgs.indexOf(f); if (k < 0) { imgs.push(f); k = imgs.length - 1; } c += 'q ' + w.toFixed(1) + ' 0 0 ' + h.toFixed(1) + ' ' + x.toFixed(1) + ' ' + y.toFixed(1) + ' cm /Im' + (k + 1) + ' Do Q\n'; },
      espacio(alto, alNuevo) { if (doc.y - alto < 40) { doc.pagina(); if (alNuevo) alNuevo(); } },
      blob() {
        if (c) { pags.push(c); c = ''; }
        const obj = [], nImg = imgs.length, base = 5 + nImg;
        obj.push('<< /Type /Catalog /Pages 2 0 R >>');
        obj.push('<< /Type /Pages /Kids [' + pags.map((_, i) => (base + i * 2) + ' 0 R').join(' ') + '] /Count ' + pags.length + ' >>');
        obj.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
        obj.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
        imgs.forEach((f) => { const bin = atob(f.d.split(',')[1]); obj.push('<< /Type /XObject /Subtype /Image /Width ' + f.w + ' /Height ' + f.h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + bin.length + ' >>\nstream\n' + bin + '\nendstream'); });
        const xo = nImg ? ' /XObject << ' + imgs.map((_, i) => '/Im' + (i + 1) + ' ' + (5 + i) + ' 0 R').join(' ') + ' >>' : '';
        pags.forEach((p, i) => {
          obj.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + W + ' ' + H + '] /Resources << /Font << /F1 3 0 R /F2 4 0 R >>' + xo + ' >> /Contents ' + (base + 1 + i * 2) + ' 0 R >>');
          obj.push('<< /Length ' + p.length + ' >>\nstream\n' + p + 'endstream');
        });
        let out = '%PDF-1.4\n%âãÏÓ\n'; const pos = [];
        obj.forEach((o, i) => { pos.push(out.length); out += (i + 1) + ' 0 obj\n' + o + '\nendobj\n'; });
        const x = out.length;
        out += 'xref\n0 ' + (obj.length + 1) + '\n0000000000 65535 f \n' + pos.map((n) => String(n).padStart(10, '0') + ' 00000 n \n').join('');
        out += 'trailer\n<< /Size ' + (obj.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + x + '\n%%EOF';
        const b = new Uint8Array(out.length); for (let i = 0; i < out.length; i++) b[i] = out.charCodeAt(i) & 255;
        return new Blob([b], { type: 'application/pdf' });
      }
    };
    return doc;
  }

  async function dibujarPedido(doc, p) {
    const d = p.datos || {}, M = doc.M, W = doc.W, items = d.items || [], gris = '0.42 0.45 0.5';
    doc.pagina();
    doc.texto(M, doc.y - 10, 9, 'F2', win('PEDIDO' + (p.estado === 'hecho' ? ' · ENTREGADO' : p.estado === 'listo' ? ' · LISTO' : '')), doc.RGB);
    doc.texto(M, doc.y - 34, 22, 'F2', cortar(win(p.titulo || 'Sin nombre'), 22, W - 2 * M, true));
    doc.texto(M, doc.y - 52, 10.5, 'F1', win('Entrega: ' + fEnt(p)), gris);
    doc.y -= 52;
    if (d.tel) { doc.texto(M, doc.y - 15, 10.5, 'F1', win('Teléfono: ' + telVer(d.tel)), gris); doc.y -= 15; }
    doc.y -= 22;
    const cols = [[M, 22, '#'], [M + 22, 142, 'Qué'], [M + 164, 72, 'Color'], [M + 236, 50, 'Cant.'], [M + 286, W - M - (M + 286), 'Precio']];
    const cab = () => { doc.rect(M, doc.y - 16, W - 2 * M, 22, doc.RGB); cols.forEach((k) => doc.texto(k[0] + 6, doc.y - 9, 9.5, 'F2', win(k[2]), '1 1 1')); doc.y -= 18; };
    cab();
    for (let i = 0; i < items.length; i++) {
      const x = items[i], nota = x.nota ? lineas(win(x.nota), 9, W - 2 * M - 34, false).slice(0, 3) : [], alto = 22 + nota.length * 11;
      doc.espacio(alto, cab);
      if (i % 2 === 0) doc.rect(M, doc.y - alto, W - 2 * M, alto, '0.95 0.96 0.97');
      const ty = doc.y - 15;
      doc.texto(cols[0][0] + 6, ty, 10, 'F1', String(i + 1), gris);
      doc.texto(cols[1][0] + 6, ty, 11, 'F2', cortar(win(x.que), 11, cols[1][1] - 10, true));
      doc.texto(cols[2][0] + 6, ty, 11, 'F1', cortar(win(x.color || '—'), 11, cols[2][1] - 10));
      doc.texto(cols[3][0] + 6, ty, 11, 'F1', cortar(win(x.cant || '1'), 11, cols[3][1] - 10));
      const pr = x.verificar ? 'por verificar' : num(x.precio) ? plata(linea(x)) : '—';
      doc.texto(W - M - 6 - ancho(win(pr), x.verificar ? 9 : 11, !x.verificar), ty, x.verificar ? 9 : 11, x.verificar ? 'F1' : 'F2', win(pr), x.verificar ? '0.85 0.45 0.05' : null);
      nota.forEach((l, k) => doc.texto(cols[1][0] + 6, ty - 13 - k * 11, 9, 'F1', l, gris));
      doc.y -= alto;
    }
    doc.linea(M, doc.y - 2, W - M, doc.y - 2);
    doc.y -= 16;
    // Totales
    if (totalDe(d) || num(d.abono)) {
      doc.espacio(64);
      const bx = W - M - 170;
      doc.rect(bx - 40, doc.y - 58, 210, 60, '0.95 0.96 0.97');
      const fila = (t, v, y, b) => { doc.texto(bx - 30, y, 10.5, b ? 'F2' : 'F1', win(t)); doc.texto(bx + 160 - ancho(win(v), 10.5, b), y, 10.5, b ? 'F2' : 'F1', win(v)); };
      fila('Total' + (porVerificar(d) ? ' (+' + porVerificar(d) + ' por verificar)' : ''), totalDe(d) ? plata(totalDe(d)) : '—', doc.y - 14);
      fila('Abono', plata(d.abono), doc.y - 31);
      fila('Saldo', totalDe(d) ? plata(saldo(d)) : '—', doc.y - 49, true);
      doc.y -= 70;
    }
    if (d.nota) {
      const ls = lineas(win(d.nota), 10, W - 2 * M, false).slice(0, 8);
      doc.espacio(18 + ls.length * 13);
      doc.texto(M, doc.y - 4, 9, 'F2', 'NOTA', gris); doc.y -= 18;
      ls.forEach((l) => { doc.texto(M, doc.y - 2, 10, 'F1', l); doc.y -= 13; });
      doc.y -= 8;
    }
    // Fotos de referencia (las de este teléfono)
    const fotos = [];
    for (let i = 0; i < items.length; i++) if (items[i].foto) { const f = await CM.fotos.get(items[i].foto); if (f) fotos.push([i, f]); }
    if (fotos.length) {
      doc.espacio(130);
      doc.texto(M, doc.y - 4, 9, 'F2', 'FOTOS DE REFERENCIA', gris); doc.y -= 14;
      const lado = 110, gap = 12;
      let col = 0;
      fotos.forEach(([i, f]) => {
        if (col === 0) doc.espacio(lado + 22);
        const k = Math.min(lado / f.w, lado / f.h), w = f.w * k, h = f.h * k, x = M + col * (lado + gap);
        doc.imagen(f, x + (lado - w) / 2, doc.y - lado + (lado - h) / 2, w, h);
        doc.texto(x, doc.y - lado - 12, 8.5, 'F1', cortar(win('#' + (i + 1) + ' ' + items[i].que), 8.5, lado, false), gris);
        col++; if (col === 3) { col = 0; doc.y -= lado + 22; }
      });
      if (col) doc.y -= lado + 22;
    }
  }
  async function pdf(lista) {
    const doc = Documento();
    for (const p of lista) await dibujarPedido(doc, p);
    return doc.blob();
  }
  const limpio = (t) => (t || 'pedido').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'pedido';
  const archivo = (lista) => (lista.length === 1 ? 'pedido-' + limpio(lista[0].titulo) : 'pedidos-' + lista.length) + '-' + hoy() + '.pdf';
  async function descargar(lista) {
    const u = URL.createObjectURL(await pdf(lista));
    A.descargar(u, archivo(lista)); setTimeout(() => URL.revokeObjectURL(u), 5000);
    toast(lista.length === 1 ? 'PDF descargado' : 'PDF con ' + lista.length + ' pedidos descargado');
  }
  const textoPedido = (p) => '*Pedido de ' + p.titulo + '*\nEntrega: ' + fEnt(p) + '\n' + (p.datos.items || []).map((x, k) => (k + 1) + '. ' + itemTxt(x) + (x.nota ? ' (' + x.nota + ')' : '') + (precioTxt(x) ? ' — ' + precioTxt(x) : '')).join('\n') +
    (totalDe(p.datos) ? '\nTotal: ' + plata(totalDe(p.datos)) + (porVerificar(p.datos) ? ' (+' + porVerificar(p.datos) + ' por verificar)' : '') + ' · Abono: ' + plata(p.datos.abono) + ' · Saldo: ' + plata(saldo(p.datos)) : num(p.datos.abono) ? '\nAbono: ' + plata(p.datos.abono) : '');
  async function compartir(lista) {
    const f = new File([await pdf(lista)], archivo(lista), { type: 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [f] })) { try { await navigator.share({ files: [f], title: lista.length === 1 ? 'Pedido de ' + lista[0].titulo : 'Pedidos' }); } catch (e) { /* canceló */ } return; }
    await descargar(lista);
    window.open('https://wa.me/?text=' + encodeURIComponent(lista.map(textoPedido).join('\n\n')), '_blank', 'noopener');
  }
  function avisarCliente(p) {
    const n = telNorm(p.datos.tel);
    const msg = 'Hola ' + p.titulo.split(' ')[0] + ', tu pedido está listo 🎉\n' + (p.datos.items || []).map((x) => '• ' + itemTxt(x)).join('\n') + (totalDe(p.datos) ? '\nSaldo por pagar: ' + plata(saldo(p.datos)) : '');
    window.open('https://wa.me/' + n + '?text=' + encodeURIComponent(msg), '_blank', 'noopener');
  }

  /* ---------- Formulario del pedido ---------- */
  async function form(id, ini) {
    const p = id ? CM.get(id) : null;
    ini = ini || {};
    const d = JSON.parse(JSON.stringify((p && p.datos) || {}));
    d.items = d.items || [];
    let quien = p ? p.titulo : '', primero = '';
    if (!p && ini.titulo) { const w = ini.titulo.trim().split(/\s+/); quien = w.shift() || ''; primero = w.join(' '); }
    const previos = Array.from(new Set(CM.por('pedido').flatMap((x) => (x.datos.items || []).map((i) => i.que)).filter(Boolean))).slice(0, 40);
    const dlg = modal('<h2>' + (p ? 'Pedido de ' + esc(p.titulo) : 'Nuevo pedido') + '</h2>' +
      '<div class="row"><div><label for="pQ">Para quién</label><input id="pQ" maxlength="60" value="' + esc(quien) + '" placeholder="Nombre" autocomplete="off"></div><div><label for="pT">Teléfono (opcional)</label><input id="pT" type="tel" maxlength="20" value="' + esc(telVer(d.tel)) + '" placeholder="9 1234 5678" inputmode="tel"></div></div>' +
      '<div class="row"><div><label for="pF">Entrega</label><input id="pF" type="date" value="' + esc((p && p.fecha) || ini.fecha || '') + '"></div><div><label for="pH">Hora (opcional)</label><input id="pH" type="time" value="' + esc(d.hora || '') + '"></div></div>' +
      '<h3 class="sec">Lo que pide</h3><div id="pItems"></div>' +
      '<div class="card add-item"><label for="iQ">Qué</label><input id="iQ" maxlength="60" list="dlQue" placeholder="Ej: mantel, globo…" value="' + esc(primero) + '" autocomplete="off"><datalist id="dlQue">' + previos.map((x) => '<option value="' + esc(x) + '">').join('') + '</datalist>' +
      '<label>Color</label><div class="colores" id="iCols">' + COLORES.map((c) => '<button type="button" data-c="' + c[0] + '" title="' + c[0] + '" style="background:' + c[1] + '"></button>').join('') + '</div><input id="iC" maxlength="30" placeholder="O escribe el color" autocomplete="off">' +
      '<div class="row"><div><label for="iN">Cantidad</label><input id="iN" maxlength="15" inputmode="numeric" placeholder="1" autocomplete="off"></div><div><label for="iP">Precio c/u</label><input id="iP" inputmode="numeric" maxlength="12" placeholder="$0" autocomplete="off"></div></div>' +
      '<label class="check"><input type="checkbox" id="iV"> No sé el precio (verificar después)</label>' +
      '<div class="row"><div><label>Foto (opcional)</label><button type="button" class="ghost" id="iFb">' + CM.ico('camara', 18) + ' <span id="iFt">Agregar</span></button><input id="iF" type="file" accept="image/*" hidden></div></div>' +
      '<label for="iD">Nota corta (opcional)</label><input id="iD" maxlength="80" placeholder="Ej: con nombre Sofía" autocomplete="off">' +
      '<button type="button" id="iAdd" class="block">' + CM.ico('plus', 18) + ' <span id="iAddT">Agregar al pedido</span></button></div>' +
      '<p class="suma" id="pSum"></p>' +
      '<label for="pA">Abono</label><input id="pA" inputmode="numeric" value="' + esc(d.abono ? plata(d.abono) : '') + '" placeholder="$0">' +
      '<label for="pN">Nota del pedido (opcional)</label><textarea id="pN" maxlength="300" rows="2">' + esc(d.nota || '') + '</textarea>' +
      '<p class="err" id="pErr"></p><div class="btns">' + (p ? '<button class="danger" id="pDel" type="button">' + CM.ico('basura', 16) + '</button>' : '') + '<button class="ghost" data-cerrar type="button">Cancelar</button><button id="pOk" type="button">Guardar pedido</button></div>');
    dlg.classList.add('hoja-pedido');
    const $$ = (x) => dlg.querySelector('#' + x);
    let foto = null, editando = null;
    function pintarSuma() {
      const t = totalDe(d), v = porVerificar(d), a = num($$('pA') ? $$('pA').value : d.abono);
      $$('pSum').innerHTML = d.items.length ? 'Total: <b>' + plata(t) + '</b>' + (v ? ' <span class="warn">+ ' + v + ' por verificar</span>' : '') + (a ? ' · Abono ' + plata(a) + ' · Saldo <b>' + plata(Math.max(0, t - a)) + '</b>' : '') : '';
    }
    async function pintarItems() {
      pintarSuma();
      $$('pItems').innerHTML = d.items.length ? d.items.map((x, k) => '<div class="ped-it"><span class="ft" data-f="' + esc(x.foto || '') + '">' + (x.foto ? '' : CM.ico('pedidos', 16)) + '</span><div class="grow" data-ed="' + k + '"><b>' + esc(x.que) + '</b><small>' + esc([x.color, x.cant ? 'x' + x.cant : '', x.nota].filter(Boolean).join(' · ')) + '</small>' + (precioTxt(x) ? '<small class="' + (x.verificar ? 'warn' : 'pr') + '">' + esc(precioTxt(x)) + '</small>' : '') + '</div><button type="button" class="x" data-x="' + k + '" aria-label="Quitar">' + CM.ico('x', 14) + '</button></div>').join('')
        : '<p class="sub">Aún no agregas nada. Llena "Qué" abajo y toca Agregar.</p>';
      for (const el of $$('pItems').querySelectorAll('.ft[data-f]')) { if (!el.dataset.f) continue; const f = await CM.fotos.get(el.dataset.f); if (f) el.style.backgroundImage = 'url(' + f.d + ')'; }
    }
    function agregar() {
      const que = $$('iQ').value.trim();
      if (!que) { $$('iQ').focus(); return false; }
      const it = { que, color: $$('iC').value.trim(), cant: $$('iN').value.trim(), nota: $$('iD').value.trim(), foto: foto || undefined };
      if ($$('iV').checked) it.verificar = true; else if (num($$('iP').value)) it.precio = num($$('iP').value);
      if (editando !== null) d.items.splice(editando, 0, it); else d.items.push(it);
      editando = null; $$('iAddT').textContent = 'Agregar al pedido';
      ['iQ', 'iC', 'iN', 'iD', 'iP'].forEach((k) => { $$(k).value = ''; }); $$('iV').checked = false; foto = null; $$('iFt').textContent = 'Agregar';
      dlg.querySelectorAll('#iCols button').forEach((b) => b.classList.remove('on'));
      pintarItems(); $$('iQ').focus(); return true;
    }
    $$('iAdd').onclick = agregar;
    // Precio con puntos solo al mostrarlo: 1500 → $1.500
    $$('iP').oninput = () => { const n = num($$('iP').value); $$('iP').value = n ? plata(n) : ''; if (n) $$('iV').checked = false; };
    $$('iV').onchange = () => { if ($$('iV').checked) $$('iP').value = ''; };
    $$('pA').oninput = () => { const n = num($$('pA').value); $$('pA').value = n ? plata(n) : ''; pintarSuma(); };
    $$('pT').onblur = () => { $$('pT').value = telVer($$('pT').value); };
    // Tocar una cosa ya agregada la sube al formulario para corregirla (ej. ponerle el precio en la tienda).
    $$('pItems').addEventListener('click', (e) => {
      const g = e.target.closest('[data-ed]'); if (!g || e.target.closest('[data-x]')) return;
      if (editando !== null) { toast('Primero guarda el que estás corrigiendo'); return; }
      const k = Number(g.dataset.ed), [x] = d.items.splice(k, 1); editando = k;
      $$('iQ').value = x.que || ''; $$('iC').value = x.color || ''; $$('iN').value = x.cant || ''; $$('iD').value = x.nota || '';
      $$('iP').value = num(x.precio) ? plata(x.precio) : ''; $$('iV').checked = !!x.verificar; foto = x.foto || null; $$('iFt').textContent = foto ? 'Foto lista ✓' : 'Agregar';
      $$('iAddT').textContent = 'Guardar cambio'; pintarItems(); $$('iP').focus(); $$('iQ').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    ['iQ', 'iC', 'iN', 'iD', 'iP'].forEach((k) => { $$(k).onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); agregar(); } }; });
    $$('iCols').onclick = (e) => { const b = e.target.closest('[data-c]'); if (!b) return; $$('iC').value = b.dataset.c; dlg.querySelectorAll('#iCols button').forEach((x) => x.classList.toggle('on', x === b)); };
    $$('iFb').onclick = () => $$('iF').click();
    $$('iF').onchange = async () => { const f = $$('iF').files[0]; if (!f) return; $$('iFt').textContent = 'Guardando…'; try { foto = await CM.fotos.guardar(f, 900); $$('iFt').textContent = 'Foto lista ✓'; } catch (er) { $$('iFt').textContent = 'Agregar'; toast(er.message); } };
    $$('pItems').onclick = (e) => { const b = e.target.closest('[data-x]'); if (!b) return; const [x] = d.items.splice(Number(b.dataset.x), 1); if (x && x.foto) CM.fotos.borrar(x.foto); pintarItems(); };
    if (p) $$('pDel').onclick = async () => { if (await A.confirmar('¿Eliminar el pedido de ' + p.titulo + '?\nSi lo necesitas, descárgalo o compártelo antes.', 'Sí, eliminar')) { dlg.close(); (p.datos.items || []).forEach((x) => CM.fotos.borrar(x.foto)); CM.del(p.id); toast('Pedido eliminado'); } };
    $$('pOk').onclick = async () => {
      if ($$('iQ').value.trim()) agregar(); // lo que quedó escrito abajo también se guarda
      const titulo = $$('pQ').value.trim();
      if (!titulo) { $$('pErr').textContent = 'Escribe para quién es el pedido'; $$('pQ').focus(); return; }
      if (!d.items.length) { $$('pErr').textContent = 'Agrega al menos una cosa al pedido'; return; }
      if (editando !== null) { $$('pErr').textContent = 'Toca "Guardar cambio" en la cosa que estás corrigiendo'; return; }
      const nd = { items: d.items, tel: telNorm($$('pT').value), abono: num($$('pA').value), nota: $$('pN').value.trim() };
      if ($$('pH').value) nd.hora = $$('pH').value;
      Object.keys(nd).forEach((k) => { if (nd[k] === '' || nd[k] === 0) delete nd[k]; });
      if (JSON.stringify(nd).length > 2900) { $$('pErr').textContent = 'El pedido es muy largo: divídelo en dos.'; return; }
      try {
        if (p) await CM.upd(p.id, { titulo, fecha: $$('pF').value || null, datos: nd });
        else await CM.add('pedido', { titulo, fecha: $$('pF').value || null, datos: nd, estado: 'abierto' });
        dlg.close(); toast('Pedido guardado');
      } catch (er) { $$('pErr').textContent = er.message; }
    };
    pintarItems();
    setTimeout(() => (quien ? $$('iQ') : $$('pQ')).focus(), 50);
    return dlg;
  }

  /* ---------- Listas antiguas (v4.3): pasarlas a pedido o borrarlas ---------- */
  function antiguas() {
    const g = {}; CM.por('falta').forEach((i) => { const l = (i.datos && i.datos.lista) || 'General'; (g[l] = g[l] || []).push(i); });
    const L = Object.entries(g);
    if (!L.length) return '';
    return '<div class="card"><h2>Listas antiguas</h2><p class="sub">Ahora todo va en Pedidos. Pasa cada lista a un pedido o bórrala.</p>' +
      L.map(([n, it], k) => '<div class="fila"><span class="grow"><b>' + esc(n) + '</b> <span class="sub">' + it.length + ' cosas</span></span><button type="button" class="small" data-act="aPed" data-k="' + k + '">A pedido</button><button type="button" class="small ghost" data-act="aDel" data-k="' + k + '">' + CM.ico('basura', 15) + '</button></div>').join('') + '</div>';
  }
  async function pasarAPedido(n, it) {
    await CM.add('pedido', { titulo: n, estado: 'abierto', datos: { items: it.map((i) => ({ que: i.titulo, cant: i.datos.cant || '', nota: i.datos.para ? 'Para ' + i.datos.para : '' })) } });
    await borrarIds(it.map((i) => i.id)); toast('Lista pasada a pedido');
  }
  async function borrarIds(ids) {
    CM.items = CM.items.filter((i) => !ids.includes(i.id)); CM.emit();
    const { error } = await A.sb.from('items').delete().in('id', ids);
    if (error) { toast(A.friendly(error)); await CM.cargar(); CM.emit(); }
  }

  /* ---------- Pantalla ---------- */
  function tarjeta(p) {
    const d = p.datos || {}, h = hoy(), venc = p.fecha && p.fecha < h && p.estado !== 'hecho', items = d.items || [];
    const sig = p.estado === 'abierto' ? ['listo', 'Marcar listo'] : p.estado === 'listo' ? ['hecho', 'Entregado'] : ['abierto', 'Reabrir'];
    return '<div class="card ped' + (venc ? ' venc' : '') + '"><div class="cab"><button type="button" class="tit" data-act="editar" data-id="' + p.id + '">' + esc(p.titulo) + '</button>' +
      '<div class="acc"><button type="button" data-act="pdf" data-id="' + p.id + '" aria-label="PDF" title="Descargar PDF">' + CM.ico('pdf', 18) + '</button><button type="button" data-act="share" data-id="' + p.id + '" aria-label="Compartir" title="Compartir">' + CM.ico('compartir', 18) + '</button>' +
      (d.tel ? '<button type="button" data-act="wsp" data-id="' + p.id + '" aria-label="WhatsApp al cliente" title="Avisar por WhatsApp">' + CM.ico('wsp', 18) + '</button>' : '') + '</div></div>' +
      '<p class="sub">' + CM.ico('reloj', 13) + ' ' + esc(fEnt(p)) + (venc ? ' <span class="pill bad">atrasado</span>' : p.fecha === h ? ' <span class="pill warn">hoy</span>' : p.fecha === sumarDias(h, 1) ? ' <span class="pill info">mañana</span>' : '') + '</p>' +
      items.map((x) => '<p class="it-l"><b>' + esc(x.que) + '</b> ' + esc([x.color, x.cant ? 'x' + x.cant : ''].filter(Boolean).join(' · ')) + (x.nota ? ' <span class="sub">— ' + esc(x.nota) + '</span>' : '') + (x.foto ? ' ' + CM.ico('camara', 13) : '') + (precioTxt(x) ? ' <span class="' + (x.verificar ? 'warn' : 'pr') + '">' + esc(x.verificar ? '⚠ verificar precio' : plata(linea(x))) + '</span>' : '') + '</p>').join('') +
      (totalDe(d) ? '<p class="tot">Total <b>' + plata(totalDe(d)) + '</b>' + (porVerificar(d) ? ' <span class="warn">(+' + porVerificar(d) + ' por verificar)</span>' : '') + ' · Abono <b>' + plata(d.abono) + '</b> · Saldo <b class="' + (saldo(d) ? 'debe' : 'ok') + '">' + plata(saldo(d)) + '</b></p>'
        : num(d.abono) || porVerificar(d) ? '<p class="tot">' + (num(d.abono) ? 'Abono <b>' + plata(d.abono) + '</b>' : '') + (porVerificar(d) ? ' <span class="warn">' + porVerificar(d) + ' por verificar</span>' : '') + '</p>' : '') +
      '<div class="btns-s"><button type="button" class="small' + (sig[0] === 'abierto' ? ' ghost' : '') + '" data-act="estado" data-e="' + sig[0] + '" data-id="' + p.id + '">' + CM.ico(sig[0] === 'abierto' ? 'izq' : 'check', 15) + ' ' + sig[1] + '</button></div></div>';
  }
  function render(el) {
    const P = CM.por('pedido'), n = (e) => P.filter((p) => p.estado === e).length;
    const L = P.filter((p) => p.estado === ui.f).sort((a, b) => ui.f === 'hecho' ? (b.hecho_at || '').localeCompare(a.hecho_at || '') : (a.fecha || '9999').localeCompare(b.fecha || '9999') || ((a.datos.hora || '99').localeCompare(b.datos.hora || '99')));
    let x = '<div class="titulo-v"><h2>Pedidos</h2><button type="button" class="small" data-act="nuevo">' + CM.ico('plus', 16) + ' Nuevo pedido</button></div>' +
      '<div class="chips">' + EST.map((e) => '<button type="button" class="chip' + (ui.f === e[0] ? ' on' : '') + '" data-f="' + e[0] + '">' + e[1] + ' (' + n(e[0]) + ')</button>').join('') + '</div>';
    if (L.length > 1) x += '<div class="btns-s todos"><button type="button" class="small ghost" data-act="pdfT">' + CM.ico('pdf', 16) + ' Todos en un PDF</button><button type="button" class="small ghost" data-act="shareT">' + CM.ico('compartir', 16) + ' Compartir todos</button></div>';
    x += L.length ? L.slice(0, 80).map(tarjeta).join('') : '<div class="card"><p class="empty">' + (ui.f === 'abierto' ? 'Sin pedidos pendientes. Toca <b>Nuevo pedido</b> o el <b>+</b> y escribe "pedido de María…".' : 'Nada por aquí.') + '</p></div>';
    if (ui.f === 'hecho' && L.length > 80) x += '<p class="sub">Se muestran los 80 últimos.</p>';
    x += antiguas();
    el.innerHTML = x;
    el.onclick = async (e) => {
      const b = e.target.closest('[data-act],[data-f]'); if (!b) return;
      if (b.dataset.f) { ui.f = b.dataset.f; CM.pintar(); return; }
      const p = b.dataset.id && CM.get(b.dataset.id), a = b.dataset.act;
      const g = {}; CM.por('falta').forEach((i) => { const l = (i.datos && i.datos.lista) || 'General'; (g[l] = g[l] || []).push(i); }); const ant = Object.entries(g);
      try {
        if (a === 'nuevo') form(null);
        else if (a === 'editar') form(p.id);
        else if (a === 'pdf') await descargar([p]);
        else if (a === 'share') await compartir([p]);
        else if (a === 'pdfT') await descargar(L);
        else if (a === 'shareT') await compartir(L);
        else if (a === 'wsp') avisarCliente(p);
        else if (a === 'estado') { await CM.upd(p.id, { estado: b.dataset.e }); toast(b.dataset.e === 'listo' ? 'Listo para entregar' + (p.datos.tel ? ': avísale por WhatsApp' : '') : b.dataset.e === 'hecho' ? 'Entregado' : 'Reabierto'); }
        else if (a === 'aPed') { const [nm, it] = ant[Number(b.dataset.k)]; await pasarAPedido(nm, it); }
        else if (a === 'aDel') { const [nm, it] = ant[Number(b.dataset.k)]; if (await A.confirmar('¿Borrar la lista "' + nm + '" (' + it.length + ' cosas)?', 'Sí, borrar')) { await borrarIds(it.map((i) => i.id)); toast('Lista borrada'); } }
      } catch (er) { toast(er.message); }
    };
  }
  CM.mod.pedidos = { render, form, pdf };
})();
