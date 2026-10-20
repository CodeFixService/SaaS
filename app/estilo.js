/* Centro de Mando · estilo personal, ánimo, frase del día, guía de inicio y animaciones. */
(function () {
  'use strict';
  const A = App, CM = window.CM, { esc, toast, modal, hoy, rpc } = A;
  const pr = () => CM.cuenta.prefs || (CM.cuenta.prefs = {});
  CM.COLORES = ['#3d63ff', '#7c4dff', '#e0457b', '#ef5b5b', '#f08a24', '#e0b020', '#2fb67c', '#16a6b6'];
  CM.AVATARES = ['🦁', '🐺', '🦅', '🐯', '🦊', '🐼', '🚀', '⚡', '🔥', '🌱', '🧠', '🎯', '🏆', '💎', '🌙', '☀️', '🛠️', '🎸'];
  CM.ANIMO = [['', ''], ['😩', 'Agotado'], ['😕', 'Débil'], ['😐', 'Normal'], ['💪', 'Con fuerza'], ['🔥', 'Imparable']];
  CM.ENERGIA = [['', ''], ['🪫', 'Vacío'], ['😴', 'Bajo'], ['🔋', 'Medio'], ['⚡', 'Alto'], ['🚀', 'Máximo']];
  const mezcla = (h, pct) => 'color-mix(in srgb,' + h + ' ' + pct + '%,transparent)';
  CM.guardarPrefs = async (parcial) => {
    Object.assign(pr(), parcial);
    CM.aplicarTema();
    await rpc('mi_perfil_guardar', { p_nombre: CM.cuenta.nombre, p_telefono: CM.cuenta.telefono, p_prefs: parcial });
  };
  CM.aplicarTema = () => {
    const p = pr(), r = document.documentElement;
    if (/^#[0-9a-f]{6}$/i.test(p.color || '')) { r.style.setProperty('--brand', p.color); r.style.setProperty('--c1', p.color); const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = p.tema === 'claro' ? '#f3f5fa' : '#0a0e17'; }
    if (p.tema === 'claro' || p.tema === 'oscuro') r.dataset.theme = p.tema === 'claro' ? 'light' : 'dark'; else delete r.dataset.theme;
    const a = document.getElementById('bAvatar'); if (a) { const d = CM.items.find((i) => i.tipo === 'diario' && i.fecha === hoy()), an = d && d.datos && d.datos.animo; a.innerHTML = '<span>' + esc(p.avatar || '🙂') + '</span>' + (an ? '<small>' + CM.ANIMO[an][0] + '</small>' : ''); }
  };
  /* Frase del día: cambia cada día, según el momento (trabajo, descanso, fin de semana). */
  const F = {
    gen: ['Hoy no tienes que hacerlo todo; solo lo siguiente.', 'Un paso pequeño hoy vale más que un plan perfecto mañana.', 'Constancia le gana al talento cuando el talento no es constante.', 'Lo que haces cada día pesa más que lo que haces de vez en cuando.', 'Empieza feo, pero empieza.', 'Tu futuro yo te agradece lo que termines hoy.', 'Avanzar lento sigue siendo avanzar.', 'No necesitas ganas: necesitas empezar dos minutos.', 'Prioriza lo importante, no lo ruidoso.', 'Cada tarea cerrada libera espacio en tu cabeza.', 'Hoy es un buen día para cumplirte a ti mismo.', 'Lo difícil primero; después todo se siente liviano.', 'Tú eliges el siguiente paso. Solo uno.', 'La disciplina es cuidarte con anticipación.', 'Termina lo empezado antes de empezar algo nuevo.', 'Un día imperfecto igual suma a tu racha.', 'Respira, ordena, avanza.', 'Tu ritmo es válido. Mantenlo.', 'Lo que mides, mejora. Lo que celebras, se repite.', 'Hoy construyes lo que mañana vas a usar.', 'No compares tu capítulo 3 con el capítulo 20 de otro.', 'Hazlo simple, hazlo hoy.', 'Estás más cerca de lo que crees.', 'Pequeñas victorias, grandes resultados.', 'Foco en una cosa; el resto puede esperar.', 'Tu energía es un recurso: invíertela bien.', 'Confía en el proceso y en tu constancia.', 'Hoy puedes ser un poco mejor que ayer.', 'La claridad llega al actuar, no al pensar más.', 'Mereces avanzar sin quemarte.'],
    trab: ['Horario de trabajo: elige una tarea y hazla bien.', 'Foco total 25 minutos; después descansas.', 'Un cliente satisfecho empieza con una tarea terminada.', 'Concéntrate en lo que mueve la aguja.', 'Cierra lo pendiente y el resto del día fluye.'],
    desc: ['Ya trabajaste suficiente. Descansar también es productivo.', 'Desconecta: mañana la cabeza rinde más.', 'Hoy toca recargar. Tu mejor trabajo sale de una mente descansada.', 'Sal a caminar, come rico, respira.', 'Fuera de horario: cero culpa.']
  };
  CM.frase = () => {
    const d = new Date(), dia = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5), fin = [0, 6].includes(d.getDay()), trab = !!CM.ahoraTrabajo();
    const L = fin || !trab ? F.desc.concat(F.gen) : F.trab.concat(F.gen);
    return fin ? F.desc[dia % F.desc.length] : L[(dia * 7 + (d.getFullYear() % 5)) % L.length];
  };
  /* Confeti liviano (sin librerías) */
  CM.confeti = (x, y) => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cs = ['#3d63ff', '#2fb67c', '#f5b942', '#ef5b5b', '#e0457b'], w = document.createElement('div'); w.className = 'conf'; w.style.left = x + 'px'; w.style.top = y + 'px';
    for (let i = 0; i < 14; i++) { const s = document.createElement('i'), a = Math.random() * 6.28, r = 40 + Math.random() * 60; s.style.cssText = 'background:' + cs[i % 5] + ';--dx:' + Math.cos(a) * r + 'px;--dy:' + (Math.sin(a) * r - 30) + 'px;'; w.appendChild(s); }
    document.body.appendChild(w); setTimeout(() => w.remove(), 900);
  };
  document.addEventListener('click', (e) => { const b = e.target.closest('.chk'); if (b && !b.classList.contains('on')) { const r = b.getBoundingClientRect(); CM.confeti(r.left + r.width / 2, r.top + r.height / 2); } }, true);
  /* Guía de inicio: se completa sola según lo que ya hiciste */
  const PASOS = () => {
    const I = CM.items, p = pr();
    return [['Crea tu espacio de trabajo con horario', CM.espacios.some((e) => e.modo === 'trabajo' && !e.archivado), 'mas'], ['Anota tu primera tarea', I.some((i) => i.tipo === 'tarea'), 'hoy'],
      ['Elige tu Top 3 del día', I.some((i) => i.tipo === 'tarea' && i.prioridad === 3), 'hoy'], ['Cuéntame cómo vas hoy (energía y ánimo)', I.some((i) => i.tipo === 'diario' && i.datos && i.datos.animo), 'hoy'],
      ['Define una meta', I.some((i) => i.tipo === 'meta'), 'metas'], ['Personaliza tu estilo (color e ícono)', !!(p.color || p.avatar), 'mas']];
  };
  CM.guiaCard = () => {
    if (pr().guia === 'ok') return '';
    const P = PASOS(), n = P.filter((x) => x[1]).length;
    if (n === P.length) { setTimeout(() => CM.guardarPrefs({ guia: 'ok' }).catch(() => {}), 0); return ''; }
    return '<div class="card guia"><h2>Empieza aquí <span class="pill">' + n + '/' + P.length + '</span></h2><div class="barra"><i style="width:' + Math.round(n / P.length * 100) + '%"></i></div>' +
      P.map((x) => '<button type="button" class="paso' + (x[1] ? ' ok' : '') + '" data-ir="' + x[2] + '">' + (x[1] ? '✅' : '⬜') + ' ' + esc(x[0]) + '</button>').join('') +
      '<div class="btns-s"><button type="button" class="small ghost" data-act="tour">¿Cómo funciona?</button><button type="button" class="small ghost" data-act="guiaX">Ocultar guía</button></div></div>';
  };
  CM.tour = () => {
    const S = [['Hoy', 'Tu pantalla diaria: captura rápido, elige tu Top 3 y marca lo cumplido. El botón Aterrizar te ayuda cuando te sientes perdido.'], ['Trabajo y vida personal', 'Crea espacios (Más → Espacios). Los de trabajo tienen horario: dentro te exijo avanzar, fuera te invito a descansar.'], ['Tablero y Metas', 'Tablero: Por hacer → En curso → Hecho. Metas: con resultados medibles y hábitos con racha.'], ['Cerebro', 'Ideas (con lluvia de ideas y puntaje), problemas con sus soluciones, notas, diario y logros.'], ['Panel', 'Gráficos y consejos que aprenden de tus propios datos: tu mejor día, tu energía, tu ritmo.'], ['Tu estilo', 'En Más → Mi estilo eliges color, ícono y tema. Tu ánimo diario cambia el ícono junto a tu avatar.']];
    let i = 0;
    const d = modal('<div id="tb"></div><div class="btns"><button class="ghost" data-cerrar type="button">Cerrar</button><button id="tn" type="button">Siguiente</button></div>');
    const pinta = () => { d.querySelector('#tb').innerHTML = '<h2>' + (i + 1) + '/' + S.length + ' · ' + esc(S[i][0]) + '</h2><p>' + esc(S[i][1]) + '</p>'; d.querySelector('#tn').textContent = i === S.length - 1 ? 'Listo' : 'Siguiente'; };
    d.querySelector('#tn').onclick = () => { if (i === S.length - 1) { d.close(); return; } i++; pinta(); }; pinta();
  };
  CM.primerTour = () => { try { if (!localStorage.getItem('cm:tour') && pr().guia !== 'ok') { localStorage.setItem('cm:tour', '1'); setTimeout(CM.tour, 900); } } catch (e) { /* sin storage */ } };
})();
