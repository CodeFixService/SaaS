/* Centro de Mando · 📣 Anuncios (G93 · G87 D). CM → Control → 📣 Anuncios.
   Campaña (objetivo, fechas, apps) → Conjuntos (a quién: todos, negocios, clientes, Premium, gratis) → Anuncios (título, texto, imagen, botón).
   🚀 Publicar copia la campaña a cada app elegida (núcleo cfx_anuncios_publicar); en la app sale una tarjeta con ✕.
   📤 Compartir abre el menú del teléfono con la imagen y el texto (Instagram historia/post/reel) sin permisos de Meta.
   Solo promos PROPIAS (regla: sin publicidad de terceros). */
(function (global) {
  'use strict';
  const A = global.App, { esc, toast, modal, confirmar } = A;
  const M = () => global.MisApps;
  const OBJ = [['vender', '💰 Vender'], ['seguidores', '📈 Ganar seguidores'], ['comentarios', '💬 Comentarios'], ['compartidos', '🔁 Compartidos'], ['avisar', '📣 Avisar novedad']];
  const PUB = [['todos', 'Todos'], ['negocios', 'Negocios'], ['clientes', 'Clientes'], ['premium', 'Solo Premium'], ['gratis', 'Solo gratis']];
  const APPS_ID = ['cm', 'aplicaciones', 'barberia', 'billetera', 'bicitaller', 'estaciona'];
  const SOCIO = () => !!global.CM_SOCIO;
  const uid = () => (global.crypto && crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => (Math.random() * 16 | 0).toString(16)));
  const nombreApp = (id) => ((M().APPS.find((a) => a.id === id) || {}).nombre || id).split(' · ')[0];
  const conectada = (id) => !!(M().estado[id] || {}).conectado;
  const nAnuncios = (c) => (c.conjuntos || []).reduce((s, x) => s + (x.anuncios || []).length, 0);
  let raiz = null, L = [];

  // Foto → imagen chica dentro del anuncio (≤ 90 KB): así no hace falta subirla a otro lado.
  function achicar(file) {
    return new Promise((ok, no) => {
      const r = new FileReader();
      r.onload = () => { const im = new Image(); im.onload = () => {
        const lado = 480, k = Math.min(1, lado / Math.max(im.width, im.height)), c = document.createElement('canvas');
        c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        for (const q of [0.82, 0.7, 0.55, 0.4]) { const d = c.toDataURL('image/jpeg', q); if (d.length <= 88000) return ok(d); }
        no(new Error('La imagen es muy pesada: usa una más chica'));
      }; im.onerror = () => no(new Error('No se pudo leer la imagen')); im.src = r.result; };
      r.onerror = () => no(new Error('No se pudo leer la imagen')); r.readAsDataURL(file);
    });
  }
  // 📤 Compartir (Instagram, WhatsApp…): menú del teléfono con imagen + texto. Sin menú → copia el texto.
  async function compartir(an) {
    const txt = [an.titulo, an.texto, an.link && /^https:/.test(an.link) ? an.link : ''].filter(Boolean).join('\n');
    try {
      if (an.imagen && /^data:image/.test(an.imagen) && navigator.canShare) {
        const b = await (await fetch(an.imagen)).blob(), f = new File([b], 'anuncio.jpg', { type: b.type || 'image/jpeg' });
        if (navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], text: txt, title: an.titulo }); return; }
      }
      if (navigator.share) { await navigator.share({ text: txt, title: an.titulo }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(txt); toast('📋 Texto copiado: pégalo en Instagram'); } catch (e) { toast('No se pudo compartir'); }
  }

  // ---------- Editor de la campaña (ventana): campaña → conjuntos → anuncios ----------
  function editor(c0) {
    const c = JSON.parse(JSON.stringify(c0 || { nombre: '', objetivo: 'vender', apps: APPS_ID.slice(1), desde: '', hasta: '', activa: true, conjuntos: [{ nombre: 'Todos', publico: 'todos', anuncios: [] }] }));
    c.conjuntos.forEach((x) => (x.anuncios || []).forEach((a) => { if (!a.id) a.id = uid(); }));
    const d = modal('<div id="anE"></div>');
    const leer = () => {
      d.querySelectorAll('[data-c]').forEach((i) => {
        const k = i.dataset.c, v = i.type === 'checkbox' ? i.checked : i.value;
        if (k === 'app') { if (i.checked && !c.apps.includes(i.value)) c.apps.push(i.value); if (!i.checked) c.apps = c.apps.filter((x) => x !== i.value); return; }
        const [cj, an, campo] = k.split('.');
        if (an === undefined) c[cj] = v;
        else if (campo === undefined) c.conjuntos[+cj][an] = v;
        else c.conjuntos[+cj].anuncios[+an][campo] = v;
      });
    };
    const fila = (k, t, v, o) => '<label>' + t + '<input data-c="' + k + '" value="' + esc(v || '') + '"' + (o || '') + '></label>';
    const pintar = () => {
      d.querySelector('#anE').innerHTML = '<h2>📣 ' + (c.id ? 'Campaña' : 'Nueva campaña') + '</h2>' +
        fila('nombre', 'Nombre', c.nombre, ' maxlength="60" placeholder="Ej: Lanzamiento BiciTaller"') +
        '<label>Objetivo<select data-c="objetivo">' + OBJ.map((o) => '<option value="' + o[0] + '"' + (o[0] === c.objetivo ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select></label>' +
        '<div class="dos">' + fila('desde', 'Desde', c.desde, ' type="date"') + fila('hasta', 'Hasta', c.hasta, ' type="date"') + '</div>' +
        '<p class="sub" style="margin:8px 0 4px">Sale en estas apps</p><div class="chips an-apps">' + APPS_ID.map((id) => '<label class="chip"><input type="checkbox" data-c="app" value="' + id + '"' + (c.apps.includes(id) ? ' checked' : '') + '> ' + esc(nombreApp(id)) + '</label>').join('') + '</div>' +
        '<label class="fila" style="gap:8px"><input type="checkbox" data-c="activa" style="width:auto"' + (c.activa ? ' checked' : '') + '> Activa</label>' +
        c.conjuntos.map((x, i) => '<div class="card an-conj"><div class="fila" style="gap:8px"><b class="grow">🎯 Conjunto ' + (i + 1) + '</b>' + (c.conjuntos.length > 1 ? '<button type="button" class="small ghost" data-q="cj" data-i="' + i + '" aria-label="Quitar conjunto">🗑️</button>' : '') + '</div>' +
          '<div class="dos">' + fila(i + '.nombre', 'Nombre', x.nombre, ' maxlength="60"') + '<label>A quién<select data-c="' + i + '.publico">' + PUB.map((o) => '<option value="' + o[0] + '"' + (o[0] === x.publico ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select></label></div>' +
          (x.anuncios || []).map((an, j) => '<div class="an-an"><div class="fila" style="gap:8px"><b class="grow">Anuncio ' + (j + 1) + '</b><button type="button" class="small ghost" data-share="' + i + '.' + j + '">📤 Compartir</button><button type="button" class="small ghost" data-q="an" data-i="' + i + '" data-j="' + j + '" aria-label="Quitar anuncio">🗑️</button></div>' +
            '<div class="an-foto">' + (an.imagen ? '<img src="' + esc(global.CFX_URL(an.imagen)) + '" alt="" onerror="this.removeAttribute(\'src\')">' : '<span class="an-vacia">🖼️</span>') +
            '<div class="grow"><button type="button" class="small ghost" data-foto="' + i + '.' + j + '">📷 ' + (an.imagen ? 'Cambiar' : 'Imagen') + '</button>' + (an.imagen ? ' <button type="button" class="small ghost" data-sinfoto="' + i + '.' + j + '">Quitar</button>' : '') + '</div></div>' +
            fila(i + '.' + j + '.titulo', 'Título', an.titulo, ' maxlength="80"') + '<label>Texto<textarea data-c="' + i + '.' + j + '.texto" maxlength="240" rows="2">' + esc(an.texto || '') + '</textarea></label>' +
            '<div class="dos">' + fila(i + '.' + j + '.boton', 'Botón', an.boton, ' maxlength="30" placeholder="Ej: Ver más"') + fila(i + '.' + j + '.link', 'Link', an.link, ' maxlength="500" placeholder="https://… o #premium"') + '</div></div>').join('') +
          '<button type="button" class="small" data-mas="' + i + '">+ Anuncio</button></div>').join('') +
        '<button type="button" class="small ghost" data-mas="cj">+ Conjunto</button><p class="sub" id="anErr"></p>' +
        '<div class="btns"><button type="button" class="ghost" data-cerrar>Cancelar</button><button type="button" id="anG">Guardar</button></div>';
      d.querySelectorAll('[data-cerrar]').forEach((b) => { b.onclick = () => d.close(); });
    };
    pintar();
    d.onclick = async (e) => {
      const b = e.target.closest('[data-mas],[data-q],[data-foto],[data-sinfoto],[data-share],#anG'); if (!b) return;
      leer();
      if (b.dataset.mas === 'cj') { if (c.conjuntos.length >= 10) return toast('Máximo 10 conjuntos'); c.conjuntos.push({ nombre: '', publico: 'todos', anuncios: [] }); pintar(); }
      else if (b.dataset.mas !== undefined) { if (nAnuncios(c) >= 30) return toast('Máximo 30 anuncios'); c.conjuntos[+b.dataset.mas].anuncios.push({ id: uid(), titulo: '', texto: '', imagen: '', boton: '', link: '' }); pintar(); }
      else if (b.dataset.q === 'cj') { c.conjuntos.splice(+b.dataset.i, 1); pintar(); }
      else if (b.dataset.q === 'an') { c.conjuntos[+b.dataset.i].anuncios.splice(+b.dataset.j, 1); pintar(); }
      else if (b.dataset.sinfoto) { const [i, j] = b.dataset.sinfoto.split('.'); c.conjuntos[+i].anuncios[+j].imagen = ''; pintar(); }
      else if (b.dataset.share) { const [i, j] = b.dataset.share.split('.'); compartir(c.conjuntos[+i].anuncios[+j]); }
      else if (b.dataset.foto) {
        const [i, j] = b.dataset.foto.split('.'), f = document.createElement('input'); f.type = 'file'; f.accept = 'image/*';
        f.onchange = async () => { if (!f.files[0]) return; try { c.conjuntos[+i].anuncios[+j].imagen = await achicar(f.files[0]); pintar(); } catch (x) { toast(x.message); } };
        f.click();
      } else if (b.id === 'anG') {
        const err = (t) => { d.querySelector('#anErr').textContent = t; };
        if (!c.nombre.trim()) return err('Ponle nombre a la campaña');
        if (!c.apps.length) return err('Elige al menos una app');
        if (!nAnuncios(c)) return err('Agrega al menos un anuncio');
        const malo = c.conjuntos.flatMap((x) => x.anuncios).find((a) => !a.titulo.trim() || (a.link && !/^(https:\/\/|\/|#)/.test(a.link.trim())) || (a.boton && !a.link));
        if (malo) return err(!malo.titulo.trim() ? 'Cada anuncio necesita título' : (malo.boton && !malo.link) ? 'El botón necesita un link' : 'El link debe partir con https://, / o #');
        let mot = '';
        if (SOCIO()) { mot = await (global.CFX_DIALOGO ? global.CFX_DIALOGO.pedir('Motivo (para el registro)', '') : Promise.resolve('')); if (mot === null) return; }
        try { b.disabled = true; const id = await A.rpc('cm_campana_guardar', { p: c, p_motivo: mot || 'Campaña de anuncios' }); d.close(); toast('Campaña guardada'); await lista(); if (!c.id) abrirPublicar(id); }
        catch (x) { b.disabled = false; err(x.message); }
      }
    };
  }

  // ---------- 🚀 Publicar en cada app (y quitar de las que ya no van) ----------
  async function publicar(c) {
    const lista = c.conjuntos.flatMap((x) => (x.anuncios || []).map((a) => ({ id: a.id, conjunto: x.nombre || '', publico: x.publico || 'todos', titulo: a.titulo, texto: a.texto || '',
      imagen: a.imagen || '', boton: a.boton || '', link: a.link || '', desde: c.desde || '', hasta: c.hasta || '', activo: !!c.activa })));
    const res = [];
    for (const id of APPS_ID) {
      const a = M().APPS.find((x) => x.id === id); if (!a) continue;
      if (!conectada(id)) { if (c.apps.includes(id)) res.push('🔌 ' + nombreApp(id) + ': sin conectar'); continue; }
      try {
        if (c.apps.includes(id)) res.push('✅ ' + nombreApp(id) + ': ' + await M().rpcDe(M().cliente(a), 'cfx_anuncios_publicar', { p_campana: c.id, p_nombre: c.nombre, p_lista: lista }) + ' anuncio(s)');
        else await M().rpcDe(M().cliente(a), 'cfx_anuncios_quitar', { p_campana: c.id });
      } catch (x) { res.push('⚠️ ' + nombreApp(id) + ': ' + (/Could not find|does not exist|PGRST202/i.test(x.message) ? 'actualiza la base de esta app' : x.message)); }
    }
    try { await A.rpc('cm_campana_publicada', { p_id: c.id }); } catch (x) { /* sigue */ }
    return res;
  }
  async function abrirPublicar(id) {
    const c = L.find((x) => x.id === id); if (!c) return;
    if (!(await confirmar('Publicar "' + c.nombre + '" en ' + c.apps.length + ' app(s). Sale como tarjeta con ✕ a quienes correspondan.', '🚀 Publicar'))) return;
    toast('Publicando…');
    const res = await publicar(c);
    modal('<h2>🚀 ' + esc(c.nombre) + '</h2>' + res.map((t) => '<p class="sub">' + esc(t) + '</p>').join('') + '<div class="btns"><button type="button" data-cerrar>Listo</button></div>');
    await lista();
  }
  async function resultados(c) {
    const d = modal('<h2>📊 ' + esc(c.nombre) + '</h2><div id="anRes"><p class="sub">Cargando…</p></div><div class="btns"><button type="button" data-cerrar>Listo</button></div>');
    const tot = {}, filas = [];
    for (const id of c.apps) {
      const a = M().APPS.find((x) => x.id === id); if (!a || !conectada(id)) continue;
      try { (await M().rpcDe(M().cliente(a), 'cfx_anuncios_admin')).filter((x) => x.campana === c.id).forEach((x) => { const t = tot[x.id] = tot[x.id] || { titulo: x.titulo, vistas: 0, clics: 0, cierres: 0 }; t.vistas += x.vistas; t.clics += x.clics; t.cierres += x.cierres; }); }
      catch (x) { filas.push('<p class="sub">⚠️ ' + esc(nombreApp(id)) + ': ' + esc(x.message) + '</p>'); }
    }
    const T = Object.values(tot);
    d.querySelector('#anRes').innerHTML = (T.length ? T.map((t) => '<div class="fila an-res"><b class="grow">' + esc(t.titulo) + '</b><span title="Vistas">👀 ' + t.vistas + '</span><span title="Clics">👆 ' + t.clics + '</span><span title="Cerrados">✕ ' + t.cierres + '</span></div>' +
      '<p class="sub">' + (t.vistas ? Math.round(t.clics / t.vistas * 100) : 0) + '% tocó el botón</p>').join('') : '<p class="sub">Aún sin vistas. Publica la campaña y espera a que entren.</p>') + filas.join('');
  }

  async function lista() {
    try { L = await A.rpc('cm_campanas'); } catch (x) { raiz.innerHTML = '<p class="sub warn">' + esc(/Could not find|does not exist|PGRST202/i.test(x.message) ? 'Actualiza la base del Centro de Mando (Apps → ⬆️ Actualizar base).' : x.message) + '</p>'; return; }
    raiz.innerHTML = '<div class="card"><h2>📣 Anuncios</h2><p class="sub">Promos propias de CodeFix dentro de las apps (tarjeta con ✕). Campaña → conjuntos (a quién) → anuncios. 📤 Compartir los lleva a Instagram.</p>' +
      '<button type="button" id="anN">+ Campaña</button></div>' +
      (L.length ? L.map((c) => '<div class="card an-camp"><div class="fila" style="gap:8px"><b class="grow">' + esc(c.nombre) + '</b>' + (c.activa ? '<span class="pill ok">Activa</span>' : '<span class="pill">Pausada</span>') + '</div>' +
        '<p class="sub">' + esc((OBJ.find((o) => o[0] === c.objetivo) || OBJ[0])[1]) + ' · ' + nAnuncios(c) + ' anuncio(s) · ' + c.apps.map((a) => esc(nombreApp(a))).join(', ') +
        (c.hasta ? ' · hasta ' + esc(A.fCorta ? A.fCorta(c.hasta) : c.hasta) : '') + '<br>' + (c.publicada ? '🚀 Publicada ' + esc(new Date(c.publicada).toLocaleDateString('es-CL')) + (c.actualizado > c.publicada ? ' · ⚠️ con cambios sin publicar' : '') : '⏳ Sin publicar') + '</p>' +
        '<div class="fila an-acc"><button type="button" class="small" data-pub="' + c.id + '">🚀 Publicar</button><button type="button" class="small ghost" data-ed="' + c.id + '">✏️ Abrir</button><button type="button" class="small ghost" data-res="' + c.id + '">📊 Resultados</button>' +
        (SOCIO() ? '' : '<button type="button" class="small ghost" data-bo="' + c.id + '" aria-label="Borrar campaña">🗑️</button>') + '</div></div>').join('') : '<p class="sub">Aún no hay campañas.</p>');
    raiz.querySelector('#anN').onclick = () => editor();
  }

  async function render(el) {
    raiz = el; el.innerHTML = '<p class="sub">Cargando…</p>';
    if (!document.getElementById('an-css')) {
      const st = document.createElement('style'); st.id = 'an-css';
      st.textContent = '.an-conj{margin:12px 0;background:var(--cfx-campo)}.an-an{border-top:1px solid var(--line);padding-top:10px;margin-top:10px}.an-foto{display:flex;gap:10px;align-items:center;margin:6px 0}' +
        '.an-foto img,.an-vacia{width:64px;height:64px;border-radius:12px;object-fit:cover;background:var(--cfx-tarjeta);display:grid;place-items:center;flex:none}.an-acc{flex-wrap:wrap;gap:8px}.an-res{gap:10px}.an-apps{flex-wrap:wrap}';
      document.head.appendChild(st);
    }
    await lista();
    el.onclick = async (e) => {
      const b = e.target.closest('[data-pub],[data-ed],[data-res],[data-bo]'); if (!b) return;
      const c = L.find((x) => x.id === (b.dataset.pub || b.dataset.ed || b.dataset.res || b.dataset.bo)); if (!c) return;
      try {
        if (b.dataset.pub) await abrirPublicar(c.id);
        else if (b.dataset.ed) editor(c);
        else if (b.dataset.res) await resultados(c);
        else if (b.dataset.bo && await confirmar('¿Borrar la campaña "' + c.nombre + '"? Se quita de todas las apps.', 'Borrar')) {
          await publicar(Object.assign({}, c, { apps: [] }));
          await A.rpc('cm_campana_borrar', { p_id: c.id, p_motivo: 'Borrar campaña' }); toast('Campaña borrada'); await lista();
        }
      } catch (x) { toast(x.message); }
    };
  }
  global.AnunciosCM = { render, achicar, compartir };
})(window);
