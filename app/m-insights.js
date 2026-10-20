/* Centro de Mando · análisis que aprende de tus propios datos (reglas estadísticas, sin IA externa).
   CM.insights() devuelve consejos ordenados por importancia. */
(function () {
  'use strict';
  const A = App, CM = window.CM, { hoy, sumarDias } = A;
  CM.mod.insights = { render() {} };
  const dias = (t) => Math.floor((Date.now() - new Date(t).getTime()) / 864e5);
  const prom = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
  const franja = (h) => h < 6 ? 'la madrugada' : h < 12 ? 'la mañana' : h < 18 ? 'la tarde' : 'la noche';
  const DIA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

  CM.insights = function (max) {
    const L = [], h = hoy(), I = CM.items, d = new Date();
    const hecho7 = CM.completados(sumarDias(h, -6), h).length, prev7 = CM.completados(sumarDias(h, -13), sumarDias(h, -7)).length;
    const r = CM.racha();
    if (r >= 3) L.push({ n: 'bien', p: 60, t: 'Racha de ' + r + ' días', x: 'Llevas ' + r + ' días seguidos cumpliendo algo. Protégela: mañana basta con una cosa pequeña.' });
    else if (r === 0 && hecho7 > 0) L.push({ n: 'info', p: 40, t: 'Retoma la racha', x: 'Hoy aún no cumples nada. Con una sola tarea pequeña la reinicias.' });
    if (hecho7 + prev7 >= 4) {
      if (hecho7 > prev7 * 1.2) L.push({ n: 'bien', p: 50, t: 'Vas más rápido', x: 'Esta semana cumpliste ' + hecho7 + ' cosas contra ' + prev7 + ' la anterior. Sigue con lo que estás haciendo.' });
      else if (hecho7 < prev7 * 0.7) L.push({ n: 'ojo', p: 68, t: 'Bajó tu ritmo', x: 'Cumpliste ' + hecho7 + ' esta semana contra ' + prev7 + ' la anterior. Revisa si estás cargado, cansado o con demasiadas cosas abiertas.' });
    }
    const tareas = I.filter((i) => i.tipo === 'tarea' && i.hecho_at);
    if (tareas.length >= 10) {
      const porDia = Array(7).fill(0), porFr = { 'la madrugada': 0, 'la mañana': 0, 'la tarde': 0, 'la noche': 0 };
      tareas.forEach((t) => { const f = new Date(t.hecho_at); porDia[f.getDay()]++; porFr[franja(f.getHours())]++; });
      const md = porDia.indexOf(Math.max.apply(null, porDia)), mf = Object.keys(porFr).sort((a, b) => porFr[b] - porFr[a])[0];
      L.push({ n: 'info', p: 45, t: 'Tu mejor momento', x: 'Terminas más cosas los ' + DIA[md] + ' y en ' + mf + '. Reserva ese momento para lo difícil.' });
    }
    const enCurso = I.filter((i) => (i.tipo === 'tarea' || i.tipo === 'proyecto') && i.estado === 'en_curso').length;
    if (enCurso > 3) L.push({ n: 'ojo', p: 80, t: 'Demasiado en curso', x: 'Tienes ' + enCurso + ' cosas en curso a la vez. Termina una antes de empezar otra; así se evita el agobio.', ir: 'tablero' });
    const estanc = I.filter((i) => i.tipo === 'proyecto' && i.estado === 'en_curso' && dias(i.updated_at) > 10);
    if (estanc.length) L.push({ n: 'ojo', p: 70, t: 'Proyecto estancado', x: '"' + estanc[0].titulo + '" lleva ' + dias(estanc[0].updated_at) + ' días sin moverse' + (estanc[0].datos.donde ? '. Dejaste anotado: ' + estanc[0].datos.donde : '. Define el siguiente paso o ponlo en pausa') + '.', ir: 'tablero' });
    const ideas = I.filter((i) => i.tipo === 'idea' && i.estado === 'nueva');
    if (ideas.filter((i) => dias(i.created_at) > 7).length >= 3) {
      const mejor = ideas.slice().sort((a, b) => CM.scoreIdea(b) - CM.scoreIdea(a))[0];
      L.push({ n: 'info', p: 50, t: 'Revisa tus ideas', x: 'Tienes ' + ideas.length + ' ideas sin decidir. La mejor puntuada es "' + mejor.titulo + '". Conviértela en tarea o descártala.', ir: 'cerebro' });
    }
    const prob = I.filter((i) => i.tipo === 'problema' && i.estado === 'abierto' && dias(i.created_at) > 5);
    if (prob.length) L.push({ n: 'ojo', p: 75, t: 'Problema sin resolver', x: '"' + prob[0].titulo + '" lleva ' + dias(prob[0].created_at) + ' días abierto. Anota una posible solución, aunque sea pequeña.', ir: 'cerebro' });
    I.filter((m) => m.tipo === 'meta' && m.estado === 'abierto').forEach((m) => {
      const rt = CM.ritmoMeta(m), pr = CM.progresoMeta(m);
      if (rt && !rt.vencida && pr < rt.esperado - 0.2) L.push({ n: 'ojo', p: 85, t: 'Meta en riesgo', x: '"' + m.titulo + '" va en ' + Math.round(pr * 100) + '% y debería ir cerca del ' + Math.round(rt.esperado * 100) + '%. Agrega una tarea concreta para esta semana.', ir: 'metas' });
      else if (rt && pr >= rt.esperado + 0.1 && pr < 1) L.push({ n: 'bien', p: 42, t: 'Meta en ritmo', x: '"' + m.titulo + '" va adelantada: ' + Math.round(pr * 100) + '%.' });
    });
    const diarios = I.filter((i) => i.tipo === 'diario' && i.datos && i.datos.energia);
    if (diarios.length >= 6) {
      const alta = [], baja = [];
      diarios.forEach((e) => { const n = CM.completados(e.fecha, e.fecha).length; if (e.datos.energia >= 4) alta.push(n); else if (e.datos.energia <= 2) baja.push(n); });
      if (alta.length >= 2 && baja.length >= 2 && prom(alta) > prom(baja) + 0.8) L.push({ n: 'info', p: 46, t: 'Tu energía manda', x: 'Los días con energía alta cumples ' + prom(alta).toFixed(1).replace('.', ',') + ' cosas; con energía baja, ' + prom(baja).toFixed(1).replace('.', ',') + '. Cuida el sueño y planifica menos en días bajos.' });
    }
    const hoyE = CM.estadoDia(h);
    if (hoyE.carga === 4) L.push({ n: 'ojo', p: 95, t: 'Hoy vas sobrecargado', x: 'Hay mucho abierto o nuevo para un solo día. Elige 3 cosas, mueve el resto a mañana y descansa.', ir: 'hoy' });
    const an = I.filter((e) => e.tipo === 'diario' && e.datos && e.datos.animo);
    if (an.length >= 6) {
      const bj = an.filter((e) => e.datos.animo <= 2).length / an.length;
      if (bj >= 0.5) L.push({ n: 'ojo', p: 77, t: 'Ánimo bajo seguido', x: 'Más de la mitad de tus registros recientes son de ánimo bajo. Baja la carga, duerme y habla con alguien de confianza.' });
      else if (an.slice(-5).every((e) => e.datos.animo >= 4)) L.push({ n: 'bien', p: 44, t: 'Buen ánimo sostenido', x: 'Tus últimos registros son de ánimo alto. Anota qué estás haciendo distinto y repítelo.', ir: 'cerebro' });
    }
    const lim = Number((CM.cuenta.prefs || {}).limite_descanso_min) || 60, u7 = CM.uso.filter((u) => u.dia >= sumarDias(h, -6));
    if (u7.length >= 3 && prom(u7.map((u) => u.descanso_min)) > lim) L.push({ n: 'ojo', p: 78, t: 'Mucha pantalla fuera de horario', x: 'En promedio usas la app ' + Math.round(prom(u7.map((u) => u.descanso_min))) + ' min al día fuera de tu horario de trabajo. Cierra el día y desconecta.', ir: 'mas' });
    const venc = I.filter((i) => i.tipo === 'tarea' && i.estado !== 'hecho' && i.fecha && i.fecha < h);
    if (venc.length >= 3) L.push({ n: 'ojo', p: 72, t: venc.length + ' tareas vencidas', x: 'Reagéndalas o descártalas. Las vencidas pesan más en la cabeza que en la agenda.', ir: 'tablero' });
    if (d.getHours() >= 17) {
      const riesgo = I.filter((i) => i.tipo === 'habito' && CM.programado(i, h) && !CM.cumplido(i, h) && CM.rachaHabito(i) >= 3);
      if (riesgo.length) L.push({ n: 'ojo', p: 90, t: 'Tu hábito está en riesgo', x: '"' + riesgo[0].titulo + '" tiene racha de ' + CM.rachaHabito(riesgo[0]) + ' días y hoy aún no lo marcas.', ir: 'metas' });
    }
    if ([0, 6].includes(d.getDay())) {
      const pend = I.filter((i) => i.tipo === 'tarea' && i.estado !== 'hecho' && i.fecha && i.fecha <= h && i.espacio_id && (CM.espacio(i.espacio_id) || {}).modo === 'trabajo').length;
      if (pend) L.push({ n: 'info', p: 55, t: 'Es fin de semana', x: 'Tienes ' + pend + ' tareas de trabajo para hoy. Si no son urgentes, muévelas al lunes y descansa.', ir: 'tablero' });
    }
    if (!I.some((i) => i.tipo === 'tarea' && i.prioridad === 3 && i.estado !== 'hecho') && I.some((i) => i.tipo === 'tarea' && i.estado !== 'hecho')) L.push({ n: 'info', p: 65, t: 'Elige tu Top 3', x: 'Aún no marcas lo más importante de hoy. Usa la propuesta de la pantalla Hoy.', ir: 'hoy' });
    if (hecho7 >= 5) L.push({ n: 'bien', p: 35, t: 'Buena semana', x: 'Terminaste ' + hecho7 + ' cosas en los últimos 7 días. Anota un logro para recordarlo.', ir: 'cerebro' });
    if (I.length < 20) L.push({ n: 'info', p: 10, t: 'Sigue usándome', x: 'Con unos días más de datos mis consejos serán más precisos.' });
    L.sort((a, b) => b.p - a.p);
    return L.slice(0, max || 30);
  };
  CM.limiteInsights = () => {
    const p = (A.publica && A.publica.planes) || {}, plan = CM.cuenta.premium ? 'pro' : 'free';
    return Number((p[plan] && p[plan].limites && p[plan].limites.insights) || 3);
  };
  CM.tarjetaInsight = (x) => '<div class="ins ' + x.n + '"><b>' + A.esc(x.t) + '</b><p>' + A.esc(x.x) + '</p>' + (x.ir ? '<button type="button" class="small ghost" data-ir="' + x.ir + '">Ver</button>' : '') + '</div>';
})();
