#!/usr/bin/env node
// G155 🔧 Túnel de fallas (lo usa Claude). Lee las 🐞 fallas de las 6 bases y marca 🔧 Lista para revisar. NO las cierra: eso lo hace Josué en el CM.
// La llave NO va en el repo: la pone el proxy de la sesión (cabecera x-tunel-key, guardada con request_credential por cada host de Supabase)
// o la variable TUNEL_KEY. Josué la crea en CM → Mensajes → 🐞 Fallas → 🔧 Túnel para Claude.
//   node tunel/fallas.mjs                      → fallas abiertas de las 6 (nuevo, revisando, listo)
//   node tunel/fallas.mjs todas                → también las cerradas
//   node tunel/fallas.mjs foto <app> <id>      → guarda la foto en $SALIDA (o /tmp)
//   node tunel/fallas.mjs listo <app> <id> "qué se arregló (versión)"
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const P = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'nucleo', 'proyectos.json'), 'utf8'));
const NOMBRE = { saas: 'CM', Aplicaciones: 'Despega', barberia: 'Barbería', emprendedor: 'Billetera', taller: 'BiciTaller', estacionamiento: 'Estaciona' };
const LLAVE = process.env.TUNEL_KEY || 'cfx_' + '0'.repeat(64); // relleno: el proxy lo reemplaza por la llave real

function rpc(app, fn, body) {
  const p = P[app]; if (!p) throw new Error('App desconocida: ' + app + ' (usa: ' + Object.keys(P).join(', ') + ')');
  const out = execFileSync('curl', ['-sS', '--max-time', '60', '-w', '\n%{http_code}', '-X', 'POST', p.url + '/rest/v1/rpc/' + fn,
    '-H', 'apikey: ' + p.anon, '-H', 'Authorization: Bearer ' + p.anon, '-H', 'Content-Type: application/json', '-H', 'x-tunel-key: ' + LLAVE,
    '--data-binary', '@-'], { input: JSON.stringify(body || {}), encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  const i = out.lastIndexOf('\n'), code = out.slice(i + 1), txt = out.slice(0, i);
  let j; try { j = JSON.parse(txt); } catch { j = txt; }
  if (code !== '200') throw new Error(code + ' ' + (j && j.message ? j.message : String(txt).slice(0, 200)));
  return j;
}

const [cmd, app, id, ...nota] = process.argv.slice(2);
if (cmd === 'listo') {
  if (!app || !id || !nota.length) throw new Error('Uso: listo <app> <id> "nota"');
  console.log(rpc(app, 'cfx_tunel_listo', { p_id: +id, p_nota: nota.join(' ') }));
} else if (cmd === 'foto') {
  const r = rpc(app, 'cfx_tunel_foto', { p_id: +id });
  if (!r.foto) { console.log('Sin foto'); process.exit(0); }
  const m = /^data:image\/(\w+);base64,(.*)$/s.exec(r.foto), f = join(process.env.SALIDA || '/tmp', `falla-${app}-${id}.${m[1] === 'jpeg' ? 'jpg' : m[1]}`);
  writeFileSync(f, Buffer.from(m[2], 'base64')); console.log(f);
} else {
  let mal = 0;
  for (const a of Object.keys(P)) {
    try {
      const L = rpc(a, 'cfx_tunel_fallas', { p_todas: cmd === 'todas' });
      console.log(`\n=== ${NOMBRE[a] || a} (${a}) · ${L.length}`);
      for (const f of L) {
        const d = f.datos || {};
        console.log(`#${f.id} [${f.estado}] ${f.rol} · ${String(f.creado).slice(0, 16)}${f.con_foto ? ' · 📷' : ''} · v${d.version || '?'} · ${d.pantalla || ''} · ${d.tamano || ''}${d.oscuro ? ' oscuro' : ''}`);
        console.log('   ' + f.texto.replace(/\n/g, '\n   '));
        if ((d.recorrido || []).length) console.log('   recorrido: ' + d.recorrido.join(' → '));
        for (const e of d.errores || []) console.log('   ⚠️ ' + [e.m, e.d, e.p].filter(Boolean).join(' · '));
        if (f.arreglo) console.log('   ' + f.arreglo.replace(/\n/g, '\n   '));
      }
    } catch (e) { mal++; console.log(`\n=== ${NOMBRE[a] || a}: ❌ ${e.message}`); }
  }
  process.exit(mal ? 1 : 0);
}
