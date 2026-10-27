/* Centro de Mando · Listas: lo que falta (qué, cantidad y para quién), agrupado por lista (Feria, Casa, Negocio…).
   Cada lista se descarga en PDF, se comparte (WhatsApp) y se elimina con confirmación. */
(function () {
  'use strict';
  const A = App, CM = window.CM, { esc, toast } = A;

  const deLista = (i) => (i.datos && i.datos.lista) || 'General';
  function agrupar() {
    const g = {};
    CM.por('falta').forEach((i) => { (g[deLista(i)] = g[deLista(i)] || []).push(i); });
    Object.values(g).forEach((L) => L.sort((a, b) => a.created_at.localeCompare(b.created_at)));
    return CM.listasUsadas().filter((l) => g[l]).map((l) => [l, g[l]]);
  }

  /* ---------- PDF (hecho a mano, sin librerías: liviano y funciona sin internet) ---------- */
  const WIN = { '€': 128, '‚': 130, '„': 132, '…': 133, '•': 149, '–': 150, '—': 151, '‘': 145, '’': 146, '“': 147, '”': 148, '™': 153 };
  // Texto en la codificación de las letras estándar del PDF (tildes y ñ incluidas). Los emojis se quitan.
  const win = (t) => Array.from(String(t || '')).map((c) => { const n = c.charCodeAt(0); return WIN[c] ? String.fromCharCode(WIN[c]) : n < 256 && !(n >= 128 && n < 160) ? c : ''; }).join('').replace(/\s+/g, ' ').trim();
  const pdfTxt = (t) => '(' + t.replace(/[\\()]/g, (m) => '\\' + m) + ')';
  // Ancho aproximado de Helvetica (suficiente para cortar textos largos con "…").
  const ancho = (t, s, negrita) => Array.from(t).reduce((a, c) => a + (/[il.,;:|!'j]/.test(c) ? 0.25 : /[mwMW]/.test(c) ? 0.85 : /[A-Z]/.test(c) ? 0.68 : /[0-9]/.test(c) ? 0.56 : c === ' ' ? 0.28 : 0.52), 0) * s * (negrita ? 1.06 : 1);
  // "…" va con su código del PDF (133), igual que el resto del texto ya convertido.
  const cortar = (t, s, max, n) => { if (ancho(t, s, n) <= max) return t; while (t.length > 1 && ancho(t + '…', s, n) > max) t = t.slice(0, -1); return t.trimEnd() + String.fromCharCode(133); };

  function pdfLista(nombre, L) {
    const W = 420, H = 595, M = 28, filaH = 24, cab = 118, pie = 34;
    const cols = [[M, 24, '#'], [M + 24, 160, 'Qué'], [M + 184, 84, 'Cantidad'], [M + 268, W - M - (M + 268), 'Para']];
    const porPag = Math.floor((H - cab - pie - 26) / filaH), pags = Math.max(1, Math.ceil(L.length / porPag));
    const fecha = new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const brand = (getComputedStyle(document.documentElement).getPropertyValue('--brand') || '#3d63ff').trim();
    const rgb = /^#[0-9a-f]{6}$/i.test(brand) ? [1, 3, 5].map((k) => (parseInt(brand.substr(k, 2), 16) / 255).toFixed(3)).join(' ') : '0.24 0.39 1';
    const T = (x, y, s, f, t, col) => 'BT ' + (col || '0.07 0.09 0.15') + ' rg /' + f + ' ' + s + ' Tf ' + x.toFixed(1) + ' ' + y.toFixed(1) + ' Td ' + pdfTxt(t) + ' Tj ET\n';
    const paginas = [];
    for (let p = 0; p < pags; p++) {
      let c = '';
      // Encabezado con el color de la app
      c += rgb + ' rg 0 ' + (H - 6) + ' ' + W + ' 6 re f\n';
      c += T(M, H - 46, 22, 'F2', cortar(win(nombre), 22, W - 2 * M, true));
      c += T(M, H - 66, 10, 'F1', win('Lo que falta · ' + fecha), '0.42 0.45 0.5');
      c += T(M, H - 82, 10, 'F2', win(L.length + (L.length === 1 ? ' cosa' : ' cosas') + (pags > 1 ? ' · página ' + (p + 1) + ' de ' + pags : '')), '0.42 0.45 0.5');
      // Encabezado de la tabla
      let y = H - cab;
      c += rgb + ' rg ' + M + ' ' + (y - 6) + ' ' + (W - 2 * M) + ' 22 re f\n';
      cols.forEach((k) => { c += T(k[0] + 6, y + 1, 9.5, 'F2', win(k[2]), '1 1 1'); });
      y -= 6;
      L.slice(p * porPag, (p + 1) * porPag).forEach((it, k) => {
        const n = p * porPag + k, d = it.datos || {};
        y -= filaH;
        if (n % 2 === 0) c += '0.95 0.96 0.97 rg ' + M + ' ' + y + ' ' + (W - 2 * M) + ' ' + filaH + ' re f\n';
        const ty = y + 8;
        c += T(cols[0][0] + 6, ty, 10, 'F1', String(n + 1), '0.42 0.45 0.5');
        c += T(cols[1][0] + 6, ty, 11, 'F2', cortar(win(it.titulo), 11, cols[1][1] - 10, true));
        c += T(cols[2][0] + 6, ty, 11, 'F1', cortar(win(d.cant || '—'), 11, cols[2][1] - 10));
        c += T(cols[3][0] + 6, ty, 11, 'F1', cortar(win(d.para || ''), 11, cols[3][1] - 10));
      });
      c += '0.85 0.87 0.9 RG 0.6 w ' + M + ' ' + (y - 2) + ' m ' + (W - M) + ' ' + (y - 2) + ' l S\n';
      c += T(M, 22, 8, 'F1', win('Centro de Mando · CodeFix'), '0.6 0.62 0.66');
      paginas.push(c);
    }
    // Arma el archivo: catálogo, páginas, letras y contenido de cada página.
    const obj = [];
    obj.push('<< /Type /Catalog /Pages 2 0 R >>');
    obj.push('<< /Type /Pages /Kids [' + paginas.map((_, i) => (5 + i * 2) + ' 0 R').join(' ') + '] /Count ' + paginas.length + ' >>');
    obj.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    obj.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    paginas.forEach((c, i) => {
      obj.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + W + ' ' + H + '] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ' + (6 + i * 2) + ' 0 R >>');
      obj.push('<< /Length ' + c.length + ' >>\nstream\n' + c + 'endstream');
    });
    let out = '%PDF-1.4\n%âãÏÓ\n';
    const pos = [];
    obj.forEach((o, i) => { pos.push(out.length); out += (i + 1) + ' 0 obj\n' + o + '\nendobj\n'; });
    const x = out.length;
    out += 'xref\n0 ' + (obj.length + 1) + '\n0000000000 65535 f \n' + pos.map((n) => String(n).padStart(10, '0') + ' 00000 n \n').join('');
    out += 'trailer\n<< /Size ' + (obj.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + x + '\n%%EOF';
    const bytes = new Uint8Array(out.length);
    for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 255;
    return new Blob([bytes], { type: 'application/pdf' });
  }
  const archivo = (nombre) => 'lista-' + (nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'compras') + '-' + A.hoy() + '.pdf';
  const textoLista = (nombre, L) => '*' + nombre + '*\n' + L.map((i, k) => (k + 1) + '. ' + i.titulo + (i.datos.cant ? ' — ' + i.datos.cant : '') + (i.datos.para ? ' (' + i.datos.para + ')' : '')).join('\n');

  function descargar(nombre, L) {
    const u = URL.createObjectURL(pdfLista(nombre, L));
    A.descargar(u, archivo(nombre)); setTimeout(() => URL.revokeObjectURL(u), 5000);
    toast('PDF descargado');
  }
  async function compartir(nombre, L) {
    const f = new File([pdfLista(nombre, L)], archivo(nombre), { type: 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [f] })) {
      try { await navigator.share({ files: [f], title: nombre }); } catch (e) { /* la persona canceló */ }
      return;
    }
    // Sin compartir archivos (computador): baja el PDF y abre WhatsApp con la lista en texto.
    descargar(nombre, L);
    window.open('https://wa.me/?text=' + encodeURIComponent(textoLista(nombre, L)), '_blank', 'noopener');
  }
  async function eliminar(nombre, L) {
    if (!(await A.confirmar('¿Eliminar la lista "' + nombre + '" (' + L.length + (L.length === 1 ? ' cosa' : ' cosas') + ')?\nSi la necesitas, descárgala o compártela antes.', 'Sí, eliminar'))) return;
    const ids = L.map((i) => i.id);
    CM.items = CM.items.filter((i) => !ids.includes(i.id)); CM.emit();
    const { error } = await A.sb.from('items').delete().in('id', ids);
    if (error) { toast(A.friendly(error)); await CM.cargar(); CM.emit(); } else toast('Lista eliminada');
  }

  function render(el) {
    const G = agrupar();
    let x = '<div class="titulo-v"><h2>Listas</h2><button type="button" class="small" data-act="nueva">' + CM.ico('plus', 16) + ' Agregar</button></div>';
    if (!G.length) x += '<div class="card"><p class="empty">Anota lo que falta con el botón <b>+</b> → <b>Lo que falta</b>: qué, cuánto y para quién.<br>Se agrupa solo por lista (Feria, Casa, Negocio…). Después la descargas en PDF o la compartes por WhatsApp.</p></div>';
    x += G.map(([n, L], k) => '<div class="card lista-c"><div class="cab"><h2><span class="n">' + esc(n) + '</span><span class="pill">' + L.length + '</span></h2>' +
      '<div class="acc"><button type="button" data-act="pdf" data-k="' + k + '" aria-label="Descargar PDF" title="Descargar PDF">' + CM.ico('pdf', 18) + '</button>' +
      '<button type="button" data-act="share" data-k="' + k + '" aria-label="Compartir" title="Compartir">' + CM.ico('compartir', 18) + '</button>' +
      '<button type="button" class="del" data-act="del" data-k="' + k + '" aria-label="Eliminar lista" title="Eliminar lista">' + CM.ico('basura', 18) + '</button></div></div>' +
      L.map((i) => '<button type="button" class="it-f" data-act="ficha" data-id="' + i.id + '"><b>' + esc(i.titulo) + '</b><span class="c">' + esc(i.datos.cant || '') + '</span>' + (i.datos.para ? '<span class="p">Para ' + esc(i.datos.para) + '</span>' : '') + '</button>').join('') +
      '<button type="button" class="small ghost" style="margin-top:8px" data-act="agregar" data-k="' + k + '">' + CM.ico('plus', 15) + ' Agregar a ' + esc(n) + '</button></div>').join('');
    el.innerHTML = x;
    el.onclick = async (e) => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const g = G[Number(b.dataset.k)];
      try {
        if (b.dataset.act === 'nueva') CM.anotar('falta');
        else if (b.dataset.act === 'agregar') CM.anotar('falta', { lista: g[0] });
        else if (b.dataset.act === 'ficha') CM.ficha(b.dataset.id);
        else if (b.dataset.act === 'pdf') descargar(g[0], g[1]);
        else if (b.dataset.act === 'share') await compartir(g[0], g[1]);
        else if (b.dataset.act === 'del') await eliminar(g[0], g[1]);
      } catch (er) { toast(er.message); }
    };
  }
  CM.mod.listas = { render, pdfLista };
})();
