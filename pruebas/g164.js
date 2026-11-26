// G164 · 📱 Máximo de equipos por cuenta (núcleo equipos.js + sql/equipos.sql). FALLA con el código viejo (no hay cfx_equipo_registrar ni equipos.js).
//   A) SQL en las 6: 3 equipos entran, el 4.º queda pendiente con la lista; cerrar uno → entra; el cerrado vuelve al ingreso (cerrada + sin auth.sessions);
//      re-entrar en el mismo equipo no suma; pendiente de +10 min se corta solo; nadie cierra equipos ajenos; admin sin tope; tope y extra desde el CM.
//   B) Pantalla (Despega): 4 celulares con la misma cuenta → el 4.º ve "elige cuál cerrar" (no se salta con Esc), cierra uno y entra;
//      el cerrado al volver queda en el ingreso; ⚙️ Mi perfil → Avanzado → 📱 Mis equipos lista y cierra.
// Uso: node g164.js
const fs = require('fs');
const { execSync } = require('child_process');
const { abrir } = require('./h'); const { APPS, entrar } = require('./apps6');
let f = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) f++; };
const lee = (r) => fs.readFileSync('/home/user/' + r, 'utf8');
const PSQL = 'psql -h /var/tmp/pgb -p 54329 -U postgres -tA -v ON_ERROR_STOP=1 -q -d ';
const DIR = { Aplicaciones: 'shared', Barberia: 'shared', Emprendedor: 'js', Taller: 'shared', Estacionamiento: 'js', SaaS: 'shared' };
const ADM = `create or replace function public.cfx_es_admin() returns void language plpgsql as $$ begin end $$;
  create or replace function public.super_check() returns void language plpgsql as $$ begin end $$;
  create or replace function public.admin_check() returns void language plpgsql as $$ begin end $$;
  do $x$ begin if to_regproc('privado.solo_admin') is not null then execute 'create or replace function privado.solo_admin() returns void language plpgsql as $f$ begin end $f$'; end if; end $x$;`;
const U1 = '11111111-1111-1111-1111-111111111111', U2 = '22222222-2222-2222-2222-222222222222';
const S = (n) => '00000000-0000-0000-0000-' + String(n).padStart(12, '0');
(async () => {
  for (const [r, d] of Object.entries(DIR)) {
    ok(lee(r + '/' + d + '/equipos.js') === lee('SaaS/nucleo/equipos.js'), 'núcleo equipos.js sincronizado en ' + r);
    ok(lee(r + '/index.html').includes(d + '/equipos.js') || r === 'Emprendedor', 'equipos.js va en el <head> de ' + r);
    ok(lee(r + '/sw.js').includes("'" + d + "/equipos.js'"), 'equipos.js en la caché del service worker de ' + r);
  }
  ok(/equipos\.js[\s\S]*<\/head>/.test(lee('Emprendedor/app/index.html')), 'equipos.js va en el <head> de Billetera /app/');

  // ---------- A) SQL en las 6 ----------
  for (const app of Object.keys(DIR)) {
    const db = 'g164_' + app.toLowerCase();
    execSync(__dirname + '/base.sh /home/user/' + app + ' ' + db, { stdio: 'ignore' });
    const q = (s) => { try { return execSync(PSQL + db, { input: s, stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim(); } catch (e) { return 'ERROR ' + String(e.stderr || e.message).slice(0, 300); } };
    const json = (t) => { try { return JSON.parse(t.split('\n').filter((l) => l.startsWith('{')).pop()); } catch (e) { return { crudo: t }; } };
    const como = (u, sid, sql, admin) => json(q('begin; ' + (admin ? ADM : '') + ` select set_config('request.jwt.claims', '{"sub":"${u}","role":"authenticated","session_id":"${sid}"}', true); set local role authenticated; select (${sql})::text; ` + (admin ? 'rollback;' : 'commit;')));
    const reg = (u, sid, disp, admin) => como(u, sid, `public.cfx_equipo_registrar('${disp}', 'Chrome · Android')`, admin);
    q(`set session_replication_role = replica; insert into auth.users (id, email) values ('${U1}', 'ana@x.cl'), ('${U2}', 'beto@x.cl') on conflict do nothing;
       insert into auth.sessions (id, user_id) select ('00000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid, '${U1}' from generate_series(1, 9) g;
       insert into auth.sessions (id, user_id) values ('${S(50)}', '${U2}');`);
    let r = [1, 2, 3].map((n) => reg(U1, S(n), 'equipo-000' + n));
    ok(r.every((x) => x.ok && x.tope === 3), app + ': entran 3 equipos (tope 3) ' + JSON.stringify(r[2]));
    r = reg(U1, S(4), 'equipo-0004');
    ok(r.exceso && r.tope === 3 && r.equipos.length === 4 && r.equipos[0].este && r.equipos.filter((x) => !x.este).length === 3, app + ': el 4.º NO entra: pide elegir cuál cerrar ' + JSON.stringify(r).slice(0, 160));
    ok(q(`select count(*) from public.cfx_equipos where sesion = '${S(4)}' and pendiente is not null`) === '1', app + ': el 4.º queda pendiente en el servidor');
    r = como(U2, S(50), `public.cfx_equipo_cerrar('${S(1)}')`);
    ok(r.error && q(`select count(*) from auth.sessions where id = '${S(1)}'`) === '1', app + ': otra cuenta NO puede cerrar mis equipos (' + r.error + ')');
    r = como(U1, S(4), `public.cfx_equipo_cerrar('${S(1)}')`);
    ok(r.ok && q(`select count(*) from auth.sessions where id = '${S(1)}'`) === '0', app + ': cerrar el 1.º borra su sesión (token de refresco muerto)');
    r = reg(U1, S(4), 'equipo-0004');
    ok(r.ok, app + ': ahora el 4.º entra ' + JSON.stringify(r));
    r = reg(U1, S(1), 'equipo-0001');
    ok(r.cerrada === true, app + ': el equipo cerrado al abrir → cerrada (vuelve al ingreso)');
    r = reg(U1, S(5), 'equipo-0002');
    ok(r.ok && q(`select count(*) from auth.sessions where id = '${S(2)}'`) === '0' && q(`select count(*) from public.cfx_equipos where usuario = '${U1}' and cerrado is null`) === '3', app + ': re-entrar en el mismo equipo no suma (cierra su sesión vieja)');
    r = reg(U1, S(6), 'equipo-0006');
    ok(r.exceso, app + ': otro equipo nuevo vuelve a pedir elegir');
    q(`update public.cfx_equipos set pendiente = now() - interval '11 minutes' where sesion = '${S(6)}'; select public.cfx_equipos_limpiar(null);`);
    ok(q(`select count(*) from auth.sessions where id = '${S(6)}'`) === '0' && reg(U1, S(6), 'equipo-0006').cerrada, app + ': sin elegir en 10 min el servidor lo corta solo (no basta saltarse la pantalla)');
    r = como(U1, S(7), 'public.cfx_equipos_mios()');
    ok(r.tope === 3 && r.equipos.length === 3 && !JSON.stringify(r).includes('equipo-000'), app + ': 📱 Mis equipos lista los 3 abiertos (sin el id del equipo)');
    r = reg(U1, S(8), 'equipo-0008', true);
    ok(r.ok && r.tope == null, app + ': el administrador no tiene tope');
    r = como(U1, S(7), 'public.cfx_equipos_guardar(2, 1)');
    ok(r.error || /ERROR/.test(r.crudo || ''), app + ': una cuenta común NO cambia el tope');
    // Las funciones de admin se reemplazan para el paso de CM y después se devuelven las originales.
    const orig = q("select string_agg(pg_get_functiondef(oid), E';\\n') from pg_proc where (pronamespace = 'public'::regnamespace and proname in ('cfx_es_admin', 'super_check', 'admin_check')) or (pronamespace = to_regnamespace('privado') and proname = 'solo_admin')");
    r = json(q('begin; ' + ADM + " select public.cfx_equipos_guardar(2, 1)::text; commit;"));
    ok(r.tope === 2 && r.extra === 1, app + ': CM → Control → 📱 Equipos guarda el tope por app ' + JSON.stringify(r));
    r = json(q('begin; ' + ADM + " select public.cfx_equipos_dar('ana@x.cl', 30)::text; commit;"));
    q(orig + ';');
    ok(r.ok && r.extras === 1, app + ': ➕ equipos extra a una cuenta por correo');
    r = como(U1, S(7), 'public.cfx_equipos_mios()');
    ok(r.tope === 3, app + ': tope de la cuenta = 2 de la app + 1 extra (' + r.tope + ')');
    ok(q("select has_function_privilege('anon', 'public.cfx_equipo_registrar(text, text)', 'execute')") === 'f' && q("select has_table_privilege('authenticated', 'public.cfx_equipos', 'select')") === 'f', app + ': sin acceso anónimo ni a la tabla');
    ok(q("select count(*) from cron.job where jobname = 'cfx-equipos'").match(/^[01]$/) !== null, app + ': limpieza programada (cron si existe)');
  }

  // ---------- B) Pantalla: Despega ----------
  {
    const [repo, db, prep] = APPS.despega;
    execSync(__dirname + '/base.sh ' + repo + ' ' + db, { stdio: 'ignore' });
    const t = await abrir(repo, db); const p1 = t.page;
    try {
      const [url, email] = await prep(t);
      const cels = [p1];
      for (let i = 0; i < 3; i++) cels.push((await t.nuevo()).page);
      for (let i = 0; i < 3; i++) { await entrar(cels[i], t.base, url, email, 'clave123'); await cels[i].waitForTimeout(1500); }
      ok(await t.sim.su("select count(*)::int n from public.cfx_equipos where cerrado is null").then((x) => x[0].n) === 3, 'Despega: 3 celulares entran y quedan anotados');
      const p4 = cels[3];
      await entrar(p4, t.base, url, email, 'clave123'); await p4.waitForTimeout(2500);
      const d = await p4.evaluate(() => { const v = document.querySelector('dialog.cfx-eq[open]'); return v && { t: v.querySelector('h2').textContent, n: v.querySelectorAll('[data-eq]').length, no: !!v.querySelector('[data-eq-no]') }; });
      ok(d && d.n === 3 && /3 equipos abiertos/.test(d.t) && d.no, 'Despega: el 4.º ve «Tienes 3 equipos abiertos» con 3 para cerrar ' + JSON.stringify(d));
      await p4.keyboard.press('Escape'); await p4.waitForTimeout(400);
      ok(await p4.evaluate(() => !!document.querySelector('dialog.cfx-eq[open]')), 'Despega: Esc no salta la ventana');
      await p4.setViewportSize({ width: 320, height: 640 });
      ok(await p4.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Despega: la ventana cabe en 320 px');
      await p4.screenshot({ path: __dirname + '/capturas/despega_g164_elegir.png' }).catch(() => {});
      const cerrado = await p4.evaluate(() => { const L = [...document.querySelectorAll('dialog.cfx-eq [data-eq]')]; const b = L[L.length - 1]; const s = b.dataset.eq; b.click(); return s; });
      await p4.waitForTimeout(1500);
      ok(await p4.evaluate(() => !document.querySelector('dialog.cfx-eq')), 'Despega: al cerrar uno, el 4.º entra');
      const n = await t.sim.su("select count(*)::int n from public.cfx_equipos where cerrado is null and pendiente is null").then((x) => x[0].n);
      ok(n === 3, 'Despega: siguen 3 abiertos (' + n + ')');
      // ¿Cuál celular se cerró? El de ese session_id: al volver a abrir la app queda en el ingreso.
      let pc = null;
      for (const c of cels.slice(0, 3)) { const sid = await c.evaluate(() => { for (const k of Object.keys(localStorage)) { const v = localStorage.getItem(k) || ''; if (v.includes('access_token')) { try { const o = JSON.parse(v); return JSON.parse(atob(o.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).session_id; } catch (e) { /* nada */ } } } return ''; }); if (sid === cerrado) pc = c; }
      ok(!!pc, 'Despega: encontramos el celular cerrado');
      if (pc) {
        await pc.reload(); await pc.waitForTimeout(4000);
        const est = await pc.evaluate(() => ({ token: Object.keys(localStorage).some((k) => (localStorage.getItem(k) || '').includes('access_token')), login: !!document.querySelector('input[type=password]:not([hidden])') }));
        ok(!est.token && est.login, 'Despega: el celular cerrado vuelve al ingreso ' + JSON.stringify(est));
      }
      // ⚙️ Mi perfil → Avanzado → 📱 Mis equipos
      await p4.setViewportSize({ width: 384, height: 794 }); await p4.emulateMedia({ colorScheme: 'dark' });
      await p4.evaluate(() => window.CFX_PERFIL.abrir('avanzado')); await p4.waitForTimeout(1500);
      const m = await p4.evaluate(() => { const c = document.querySelector('[data-eq-caja]'); return c && { txt: c.querySelector('[data-eq-txt]').textContent, filas: c.querySelectorAll('.cfx-pf-fila').length, este: c.textContent.includes('Este equipo'), btn: c.querySelectorAll('[data-pf=eqcerrar]').length }; });
      ok(m && m.filas === 3 && m.este && m.btn === 2 && /3 de 3/.test(m.txt), 'Despega: Mi perfil → Avanzado → 📱 Mis equipos lista los 3 (este sin botón) ' + JSON.stringify(m));
      await p4.screenshot({ path: __dirname + '/capturas/despega_g164_mis_equipos.png' }).catch(() => {});
      if (m && m.btn) {
        await p4.evaluate(() => document.querySelector('[data-eq-caja] [data-pf=eqcerrar]').click()); await p4.waitForTimeout(1500);
        const m2 = await p4.evaluate(() => document.querySelectorAll('[data-eq-caja] .cfx-pf-fila').length);
        ok(m2 === 2, 'Despega: cerrar desde Mis equipos deja 2 (' + m2 + ')');
      }
      ok(!t.errores.filter((e) => !/favicon|cfx_humano/.test(e)).length, 'Despega: sin errores de consola (' + t.errores.slice(0, 3).join(' · ') + ')');
    } catch (e) { ok(false, 'Despega: ' + e.message); } finally { await t.cerrar(); }
  }
  // ---------- C) CM → Control → 📱 Equipos ----------
  {
    execSync(__dirname + '/base.sh /home/user/saas g164_cmui', { stdio: 'ignore' });
    const t = await abrir('/home/user/saas', 'g164_cmui'); const p = t.page;
    try {
      await t.sim.crearUsuario('juanjosuecastilloloyola@gmail.com', 'admin123');
      await t.sim.crearUsuario('cli@x.cl', 'clave123');
      await p.setViewportSize({ width: 320, height: 700 }); await p.emulateMedia({ colorScheme: 'dark' });
      await p.goto(t.base + '/'); await p.fill('input[type=email]', 'juanjosuecastilloloyola@gmail.com'); await p.fill('input[type=password]', 'admin123'); await p.press('input[type=password]', 'Enter');
      await p.waitForURL(/admin/); await p.waitForTimeout(800); await t.sinModales();
      await p.goto(t.base + '/admin/#control'); await p.waitForTimeout(3500); await t.sinModales();
      await p.click('[data-s=equipos]'); await p.waitForTimeout(2000);
      ok(await p.locator('#eqT').inputValue() === '3' && await p.locator('#eqX').inputValue() === '2', 'CM: Control → 📱 Equipos muestra tope 3 y extra 2');
      await p.fill('#eqT', '4'); await p.fill('#eqX', '1'); await p.click('#eqG'); await p.waitForTimeout(1500);
      const v = (await t.sim.su("select valor from public.cfx_config where clave = 'equipos'"))[0].valor;
      ok(v.tope === 4 && v.extra === 1 && /✓/.test(await p.locator('#eqR').innerText()), 'CM: guarda el tope de la app ' + JSON.stringify(v));
      await p.fill('#eqC', 'cli@x.cl'); await p.fill('#eqD', '30'); await p.click('#eqDar'); await p.waitForTimeout(1500);
      ok((await t.sim.su("select count(*)::int n from public.cfx_modulos_negocio where modulo = 'equipos' and hasta > now()"))[0].n === 1, 'CM: ➕ da equipos extra por correo');
      ok(await t.anchoOk(), 'CM: 📱 Equipos cabe en 320 px (oscuro)');
      await t.foto('g164-cm-equipos');
      ok((await t.sim.su("select count(*)::int n from public.cfx_equipos where cerrado is null"))[0].n >= 1, 'CM: el admin queda anotado sin tope');
      ok(!t.errores.filter((e) => !/favicon|status of 404/.test(e)).length, 'CM: sin errores de consola (los 404 son las otras 5 bases, que el simulador no tiene) (' + t.errores.slice(0, 6).join(' · ') + ')');
    } catch (e) { ok(false, 'CM: ' + e.message); } finally { await t.cerrar(); }
  }
  console.log(f ? '✗ ' + f + ' fallas' : '✓ todo ok'); process.exit(f ? 1 : 0);
})();
