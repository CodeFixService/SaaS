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
  // Perfil común del núcleo (ayuda.js → CFX_PERFIL): aquí solo cómo guarda el Centro de Mando.
  const pf = () => CM.cuenta.prefs || {};
  window.CFX_PERFIL_APP = {
    __proto__: App.perfil,
    foto: () => CM.fotoPerfil(),
    // La foto de perfil queda solo en este teléfono (no ocupa el servidor).
    guardarFoto: async (f) => {
      const vieja = localStorage.getItem('cm:fotoPerfil');
      if (f) localStorage.setItem('cm:fotoPerfil', await CM.fotos.guardar(f, 320)); else localStorage.removeItem('cm:fotoPerfil');
      if (vieja) CM.fotos.borrar(vieja);
      CM.pintarAvatar();
    },
    iconos: CM.AVATARES, icono: () => pf().avatar || '🙂',
    guardar: async (d) => {
      CM.cuenta.nombre = d.nombre || CM.cuenta.nombre;
      if (d.icono && d.icono !== pf().avatar) await CM.guardarPrefs({ avatar: d.icono });
      else await rpc('mi_perfil_guardar', { p_nombre: CM.cuenta.nombre, p_telefono: CM.cuenta.telefono });
    },
    colores: CM.COLORES, libre: false, color: () => pf().color || CM.COLORES[0], guardarColor: (c) => CM.guardarPrefs({ color: c }),
    modo: () => pf().tema || 'auto', guardarModo: (m) => CM.guardarPrefs({ tema: m })
  };  CM.aplicarTema = () => {
    const p = pr(), r = document.documentElement;
    if (/^#[0-9a-f]{6}$/i.test(p.color || '')) { r.style.setProperty('--brand', p.color); r.style.setProperty('--c1', p.color); const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = p.tema === 'claro' ? '#f3f5fa' : '#0a0e17'; }
    if (p.tema === 'claro' || p.tema === 'oscuro') r.dataset.theme = p.tema === 'claro' ? 'light' : 'dark'; else delete r.dataset.theme;
    const a = document.getElementById('bAvatar'); if (a) { const d = CM.items.find((i) => i.tipo === 'diario' && i.fecha === hoy()), an = d && d.datos && d.datos.animo; a.innerHTML = '<span>' + esc(p.avatar || '🙂') + '</span>' + (an ? '<small>' + CM.ANIMO[an][0] + '</small>' : ''); }
  };

  /* Estado automático del día: ánimo, energía y carga salen de lo que registras (no se guarda nada). */
  const dd = (t) => (t ? CM.diaDe(t) : '');
  CM.estadoDia = (d) => {
    const I = CM.items, man = I.find((i) => i.tipo === 'diario' && i.fecha === d && i.datos && (i.datos.animo || i.datos.energia)), md = (man && man.datos) || {};
    const nuevos = I.filter((i) => ['tarea', 'idea', 'problema', 'proyecto'].includes(i.tipo) && dd(i.created_at) === d);
    const prob = nuevos.filter((i) => i.tipo === 'problema').length, ideas = nuevos.filter((i) => i.tipo === 'idea').length;
    const hecho = CM.completados(d, d).length, logros = I.filter((i) => i.tipo === 'logro' && i.fecha === d).length;
    const venc = I.filter((i) => i.tipo === 'tarea' && i.fecha && i.fecha < d && (i.estado !== 'hecho' || dd(i.hecho_at) >= d)).length;
    const encur = d === hoy() ? Math.max(0, I.filter((i) => (i.tipo === 'tarea' || i.tipo === 'proyecto') && i.estado === 'en_curso').length - 3) : 0;
    const u = CM.uso.find((x) => x.dia === d), desc = u ? u.descanso_min : 0;
    const act = nuevos.length + hecho + logros;
    const pts = nuevos.length + prob * 2 + venc * 1.5 + encur * 2 + desc / 30 - hecho * 0.5;
    const carga = pts < 4 ? 1 : pts < 8 ? 2 : pts < 12 ? 3 : 4, cl = ['', 'Ligera', 'Normal', 'Alta', 'Sobrecargado'][carga];
    const cl5 = (n) => Math.max(1, Math.min(5, Math.round(n)));
    let an = 3 + (hecho >= 3 ? 1 : 0) + (hecho >= 6 || logros ? 1 : 0) - (prob >= 2 ? 1 : 0) - (venc >= 3 ? 1 : 0) - (carga === 4 ? 1 : 0);
    let en = 3 + (hecho >= 5 ? 1 : 0) + (ideas >= 2 ? 1 : 0) - (desc > 60 ? 1 : 0) - (carga >= 3 ? 1 : 0);
    return { animo: md.animo || (act ? cl5(an) : null), energia: md.energia || (act ? cl5(en) : null), carga: act || venc ? carga : 0, cargaTxt: cl, manual: !!(md.animo || md.energia), diario: man };
  };
  // Los check-ins de ánimo sin texto duran 7 días; el resto del diario no se toca.
  CM.limpiarAnimo = async () => {
    const lim = A.sumarDias(hoy(), -7), v = CM.items.filter((i) => i.tipo === 'diario' && !i.cuerpo && i.fecha && i.fecha < lim && i.datos && (i.datos.animo || i.datos.energia));
    for (const i of v) { try { await CM.del(i.id); } catch (x) { break; } }
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
      ['Dicta algo con el micrófono del + (ej: "mañana a las 10 llamar a Maya")', I.some((i) => i.tipo === 'tarea' && i.datos && i.datos.hora), 'nuevo'], ['Crea tu primer pedido', I.some((i) => i.tipo === 'pedido'), 'pedidos'],
      ['Activa las notificaciones (Más → Notificaciones)', typeof Notification !== 'undefined' && Notification.permission === 'granted', 'mas'], ['Personaliza tu estilo (color e ícono)', !!(p.color || p.avatar), 'mas']];
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
    const S = [['Anotar (+)', 'Escribe o dicta con el micrófono. La app entiende "mañana a las 10 llamar a Maya" (tarea con hora), "idea: …", "recuérdame…" o "pedido de María…".'], ['Hoy = lo que te falta', 'Todo lo pendiente ordenado: atrasado, hoy por hora, próximos días, ideas, problemas y notas. Tacha ahí mismo.'], ['Pedidos', 'Para quién, qué (color, cantidad, foto), entrega, abono y total. PDF de uno o de todos, compartir y avisar por WhatsApp cuando esté listo.'], ['Avisos que no se rinden', 'Lo de mañana a las 8:00 del día antes, lo de hoy 1 hora antes, y si no lo tachas insiste. Desde la notificación: Listo o 1 hora más.'], ['Más (arriba)', 'Metas, Notas, Ideas, Problemas, Diario, Logros, tu foto, tus avisos y tu estilo. La lupa busca en todo.']];
    let i = 0;
    const d = modal('<div id="tb"></div><div class="btns"><button class="ghost" data-cerrar type="button">Cerrar</button><button id="tn" type="button">Siguiente</button></div>');
    const pinta = () => { d.querySelector('#tb').innerHTML = '<h2>' + (i + 1) + '/' + S.length + ' · ' + esc(S[i][0]) + '</h2><p>' + esc(S[i][1]) + '</p>'; d.querySelector('#tn').textContent = i === S.length - 1 ? 'Listo' : 'Siguiente'; };
    d.querySelector('#tn').onclick = () => { if (i === S.length - 1) { d.close(); return; } i++; pinta(); }; pinta();
  };
  CM.primerTour = () => { try { if (!localStorage.getItem('cm:tour') && pr().guia !== 'ok') { localStorage.setItem('cm:tour', '1'); setTimeout(CM.tour, 900); } } catch (e) { /* sin storage */ } };
})();
