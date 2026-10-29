// Simulador de Supabase para Playwright: las rutas *.supabase.co (auth, rest, rpc, storage, functions, realtime)
// se responden desde un Postgres local, respetando roles y RLS. Común a las 6 apps (NO se usa en producción).
const { Pool } = require('pg');

const b64u = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (sub, email) => b64u({ alg: 'HS256', typ: 'JWT' }) + '.' + b64u({ sub, email, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 36000 }) + '.firma';
const qi = (s) => '"' + String(s).replace(/"/g, '""') + '"';

function crear(opts) {
  const pool = new Pool({ host: process.env.PGHOST || '/var/tmp/pgb', port: +(process.env.PGPORT || 54329), user: 'postgres', database: opts.db, max: 4 });
  const archivos = new Map(); // bucket/ruta -> { body, type }
  const cache = {}, ultimoAuth = {};
  const log = opts.log || (() => {});

  const usuario = (headers) => {
    const t = (headers.authorization || '').replace(/^Bearer\s+/i, '');
    try { const p = JSON.parse(Buffer.from(t.split('.')[1], 'base64url').toString()); return p.sub ? p : null; } catch (e) { return null; }
  };

  async function como(user, fn) {
    const c = await pool.connect();
    try {
      await c.query('begin');
      const claims = user ? JSON.stringify({ sub: user.sub, email: user.email, role: 'authenticated' }) : JSON.stringify({ role: 'anon' });
      await c.query("select set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claims', $2, true), set_config('request.jwt.claim.role', $3, true)",
        [user ? user.sub : '', claims, user ? 'authenticated' : 'anon']);
      await c.query('set local role ' + (user ? 'authenticated' : 'anon'));
      const r = await fn(c);
      await c.query('commit');
      return r;
    } catch (e) { await c.query('rollback').catch(() => {}); throw e; } finally { c.release(); }
  }
  const su = async (sql, vals) => (await pool.query(sql, vals)).rows;

  async function columnas(esquema, tabla) {
    const k = esquema + '.' + tabla;
    if (cache[k]) return cache[k];
    const r = await su(`select a.attname as n, format_type(a.atttypid, a.atttypmod) as t from pg_attribute a join pg_class c on c.oid = a.attrelid
      join pg_namespace s on s.oid = c.relnamespace where s.nspname = $1 and c.relname = $2 and a.attnum > 0 and not a.attisdropped`, [esquema, tabla]);
    const pk = await su(`select a.attname as n from pg_index i join pg_class c on c.oid = i.indrelid join pg_namespace s on s.oid = c.relnamespace
      join pg_attribute a on a.attrelid = c.oid and a.attnum = any(i.indkey) where s.nspname = $1 and c.relname = $2 and i.indisprimary`, [esquema, tabla]);
    if (!r.length) throw Object.assign(new Error(`relation "${esquema}.${tabla}" does not exist`), { code: '42P01', status: 404 });
    cache[k] = { tipos: Object.fromEntries(r.map((x) => [x.n, x.t])), pk: pk.map((x) => x.n) };
    return cache[k];
  }

  // ---- PostgREST: filtros ----
  function valorLista(s) {
    const out = []; let cur = '', q = false;
    for (const ch of s) {
      if (ch === '"') { q = !q; continue; }
      if (ch === ',' && !q) { out.push(cur); cur = ''; continue; }
      cur += ch;
    }
    out.push(cur);
    return out;
  }
  function partir(s) { // a.eq.1,or(b.eq.2,c.eq.3) respetando paréntesis
    const out = []; let cur = '', d = 0, q = false;
    for (const ch of s) {
      if (ch === '"') q = !q;
      if (!q && ch === '(') d++;
      if (!q && ch === ')') d--;
      if (ch === ',' && d === 0 && !q) { out.push(cur); cur = ''; continue; }
      cur += ch;
    }
    if (cur) out.push(cur);
    return out;
  }
  function condicion(col, expr, vals, tipos) {
    let neg = false;
    if (expr.startsWith('not.')) { neg = true; expr = expr.slice(4); }
    const i = expr.indexOf('.');
    const op = i < 0 ? expr : expr.slice(0, i);
    const v = i < 0 ? '' : expr.slice(i + 1);
    const path = col.includes('->') ? col.split(/(->>?)/) : null;
    let c;
    if (path) { c = qi(path[0]); for (let k = 1; k < path.length; k += 2) c += path[k] + "'" + path[k + 1].replace(/'/g, "''") + "'"; }
    else c = qi(col);
    const t = tipos && !path ? tipos[col] : null;
    const p = (x) => { vals.push(x); return '$' + vals.length + (t ? '::' + t : ''); };
    let sql;
    switch (op) {
      case 'eq': sql = `${c} = ${p(v)}`; break;
      case 'neq': sql = `${c} <> ${p(v)}`; break;
      case 'gt': sql = `${c} > ${p(v)}`; break;
      case 'gte': sql = `${c} >= ${p(v)}`; break;
      case 'lt': sql = `${c} < ${p(v)}`; break;
      case 'lte': sql = `${c} <= ${p(v)}`; break;
      case 'like': vals.push(v.replace(/\*/g, '%')); sql = `${c}::text like $${vals.length}`; break;
      case 'ilike': vals.push(v.replace(/\*/g, '%')); sql = `${c}::text ilike $${vals.length}`; break;
      case 'is': sql = `${c} is ${v === 'null' ? 'null' : v === 'true' ? 'true' : v === 'false' ? 'false' : 'unknown'}`; break;
      case 'in': { const l = valorLista(v.replace(/^\(|\)$/g, '')); vals.push(l); sql = `${c} = any($${vals.length}${t ? '::' + t + '[]' : ''})`; break; }
      case 'cs': vals.push(v.startsWith('{') ? v : v); sql = `${c} @> $${vals.length}${t ? '::' + t : ''}`; break;
      case 'cd': vals.push(v); sql = `${c} <@ $${vals.length}${t ? '::' + t : ''}`; break;
      case 'ov': vals.push(v.replace(/^\(/, '{').replace(/\)$/, '}')); sql = `${c} && $${vals.length}${t ? '::' + t : ''}`; break;
      default: throw Object.assign(new Error('operador no simulado: ' + op), { status: 400 });
    }
    return neg ? `not (${sql})` : sql;
  }
  function logico(op, cuerpo, vals, tipos) {
    const partes = partir(cuerpo.replace(/^\(|\)$/g, '')).map((x) => {
      const m = x.match(/^(not\.)?(or|and)\((.*)\)$/);
      if (m) return (m[1] ? 'not ' : '') + logico(m[2], m[3], vals, tipos);
      const i = x.indexOf('.');
      return condicion(x.slice(0, i), x.slice(i + 1), vals, tipos);
    });
    return '(' + partes.join(op === 'or' ? ' or ' : ' and ') + ')';
  }
  const RESERVADOS = new Set(['select', 'order', 'limit', 'offset', 'on_conflict', 'columns']);
  function donde(params, vals, tipos) {
    const w = [];
    for (const [k, v] of params) {
      if (RESERVADOS.has(k)) continue;
      if (k === 'or' || k === 'and') { w.push(logico(k, v, vals, tipos)); continue; }
      if (k === 'not.or' || k === 'not.and') { w.push('not ' + logico(k.slice(4), v, vals, tipos)); continue; }
      w.push(condicion(k, v, vals, tipos));
    }
    return w.length ? ' where ' + w.join(' and ') : '';
  }
  function seleccion(sel) {
    if (!sel || sel === '*') return '*';
    return partir(sel).map((x) => {
      x = x.trim();
      if (x.includes('(')) throw Object.assign(new Error('select con relaciones no simulado: ' + x), { status: 400 });
      if (x === '*') return '*';
      let alias = null;
      const m = x.match(/^([a-zA-Z0-9_]+):(.+)$/);
      if (m) { alias = m[1]; x = m[2]; }
      x = x.replace(/::[a-z]+$/, '');
      if (x.includes('->')) {
        const path = x.split(/(->>?)/);
        let c = qi(path[0]);
        for (let k = 1; k < path.length; k += 2) c += path[k] + "'" + path[k + 1] + "'";
        return c + ' as ' + qi(alias || path[path.length - 1]);
      }
      return qi(x) + (alias ? ' as ' + qi(alias) : '');
    }).join(', ');
  }
  function orden(o) {
    if (!o) return '';
    return ' order by ' + o.split(',').map((x) => {
      const [c, ...m] = x.split('.');
      return qi(c) + (m.includes('desc') ? ' desc' : ' asc') + (m.includes('nullsfirst') ? ' nulls first' : m.includes('nullslast') ? ' nulls last' : '');
    }).join(', ');
  }

  async function rest(metodo, esquema, tabla, params, headers, body, user) {
    const { tipos, pk } = await columnas(esquema, tabla);
    const prefer = headers.prefer || '';
    const rel = qi(esquema) + '.' + qi(tabla);
    const vals = [];
    const representacion = prefer.includes('return=representation');
    let sql, conteo = null;
    if (metodo === 'GET' || metodo === 'HEAD') {
      const w = donde(params, vals, tipos);
      let lim = params.get('limit'), off = params.get('offset');
      const rango = headers.range;
      if (rango) { const [a, b] = rango.split('-').map(Number); off = a; lim = b - a + 1; }
      sql = `select ${seleccion(params.get('select'))} from ${rel}${w}${orden(params.get('order'))}${lim != null ? ' limit ' + (+lim) : ''}${off != null ? ' offset ' + (+off) : ''}`;
      if (/count=(exact|planned|estimated)/.test(prefer)) {
        const v2 = []; const w2 = donde(params, v2, tipos);
        conteo = await como(user, async (c) => +(await c.query(`select count(*) as n from ${rel}${w2}`, v2)).rows[0].n);
        if (metodo === 'HEAD') return { status: 200, rows: [], conteo, vacio: true };
      }
      const rows = await como(user, async (c) => (await c.query(sql, vals)).rows);
      return { status: 200, rows, conteo };
    }
    if (metodo === 'POST') {
      const filas = Array.isArray(body) ? body : [body];
      if (!filas.length) return { status: 201, rows: [] };
      const cols = params.get('columns') ? params.get('columns').split(',').map((k) => k.replace(/"/g, '')) : [...new Set(filas.flatMap((f) => Object.keys(f)))].filter((k) => k in tipos);
      vals.push(JSON.stringify(filas));
      const lista = cols.map(qi).join(', ');
      sql = `insert into ${rel} (${lista}) select ${lista} from json_populate_recordset(null::${rel}, $1)`;
      if (/resolution=(merge|ignore)-duplicates/.test(prefer)) {
        const obj = params.get('on_conflict') ? params.get('on_conflict').split(',') : pk;
        sql += ` on conflict (${obj.map(qi).join(', ')}) do ` + (prefer.includes('ignore-duplicates') ? 'nothing'
          : 'update set ' + cols.filter((c) => !obj.includes(c)).map((c) => `${qi(c)} = excluded.${qi(c)}`).join(', ') || 'nothing');
      }
      sql += ' returning ' + seleccion(params.get('select'));
      const rows = await como(user, async (c) => (await c.query(sql, vals)).rows);
      return { status: 201, rows: representacion ? rows : null };
    }
    if (metodo === 'PATCH') {
      const cols = Object.keys(body).filter((k) => k in tipos);
      vals.push(JSON.stringify(body));
      const w = donde(params, vals, tipos);
      sql = `update ${rel} set (${cols.map(qi).join(', ')}) = (select ${cols.map(qi).join(', ')} from json_populate_record(null::${rel}, $1))${w} returning ${seleccion(params.get('select'))}`;
      if (cols.length === 1) sql = sql.replace(/set \(([^)]+)\) = \(select ([^)]+?) from/, 'set $1 = (select $2 from');
      const rows = await como(user, async (c) => (await c.query(sql, vals)).rows);
      return { status: representacion ? 200 : 204, rows: representacion ? rows : null };
    }
    if (metodo === 'DELETE') {
      const w = donde(params, vals, tipos);
      sql = `delete from ${rel}${w} returning ${seleccion(params.get('select'))}`;
      const rows = await como(user, async (c) => (await c.query(sql, vals)).rows);
      return { status: representacion ? 200 : 204, rows: representacion ? rows : null };
    }
    throw Object.assign(new Error('método no simulado ' + metodo), { status: 405 });
  }

  async function firma(esquema, fn, nombres) {
    const k = esquema + '.' + fn + ':' + nombres.sort().join(',');
    if (cache[k]) return cache[k];
    const r = await su(`select p.proargnames as n, p.pronargs as na, p.pronargdefaults as nd, p.proretset as set, t.typtype as tt, format_type(p.prorettype, null) as ret,
      array(select format_type(x, null) from unnest(p.proargtypes) x) as t
      from pg_proc p join pg_namespace s on s.oid = p.pronamespace join pg_type t on t.oid = p.prorettype where s.nspname = $1 and p.proname = $2`, [esquema, fn]);
    if (!r.length) throw Object.assign(new Error(`Could not find the function ${esquema}.${fn}`), { code: 'PGRST202', status: 404 });
    const ok = r.filter((f) => {
      const ns = (f.n || []).slice(0, f.na);
      return nombres.every((x) => ns.includes(x)) && ns.slice(0, f.na - f.nd).every((x) => nombres.includes(x));
    });
    cache[k] = ok[0] || r[0];
    return cache[k];
  }
  async function rpc(esquema, fn, body, user) {
    body = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
    const f = await firma(esquema, fn, Object.keys(body));
    const args = [], vals = [];
    (f.n || []).slice(0, f.na).forEach((name, i) => {
      if (!(name in body)) return;
      let v = body[name];
      const t = f.t[i];
      if (v !== null && (t === 'jsonb' || t === 'json')) v = JSON.stringify(v);
      else if (v !== null && t.endsWith('[]') && Array.isArray(v)) v = v;
      else if (v !== null && typeof v === 'object') v = JSON.stringify(v);
      vals.push(v);
      args.push(qi(name) + ' => $' + vals.length + '::' + t);
    });
    const llamada = qi(esquema) + '.' + qi(fn) + '(' + args.join(', ') + ')';
    return como(user, async (c) => {
      if (f.set) return (await c.query('select * from ' + llamada, vals)).rows.map((x) => (f.tt === 'c' || Object.keys(x).length > 1 ? x : Object.values(x)[0]));
      if (f.tt === 'c') return (await c.query('select (' + llamada + ').*', vals)).rows[0];
      const r = await c.query('select ' + llamada + ' as r', vals);
      return f.ret === 'void' ? null : r.rows[0].r;
    });
  }

  // ---- auth ----
  const sesion = (u) => ({ access_token: jwt(u.id, u.email), token_type: 'bearer', expires_in: 36000, expires_at: Math.floor(Date.now() / 1000) + 36000, refresh_token: 'r-' + u.id,
    user: { id: u.id, email: u.email, aud: 'authenticated', role: 'authenticated', app_metadata: { provider: 'email' }, user_metadata: u.raw_user_meta_data || {}, created_at: new Date().toISOString(), email_confirmed_at: new Date().toISOString() } });
  async function crearUsuario(email, pass, data) {
    email = String(email || '').trim().toLowerCase();
    const [u] = await su('insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id, email, raw_user_meta_data', [email, JSON.stringify(data || {})]);
    await su('insert into auth.claves values ($1, $2) on conflict (email) do update set pass = excluded.pass', [email, pass]);
    return u;
  }

  async function manejar(route) {
    const req = route.request();
    const url = new URL(req.url());
    const p = url.pathname;
    const headers = req.headers();
    const metodo = req.method();
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': '*' };
    const json = (status, obj, extra) => route.fulfill({ status, headers: Object.assign({ 'content-type': 'application/json' }, cors, extra || {}), body: obj === undefined || obj === null ? '' : JSON.stringify(obj) });
    if (metodo === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    let body = null;
    const crudo = req.postDataBuffer();
    if (crudo && (headers['content-type'] || '').includes('json')) { try { body = JSON.parse(crudo.toString()); } catch (e) { body = null; } }
    const user = usuario(headers);
    try {
      if (p === '/auth/v1/token' || p === '/auth/v1/signup') ultimoAuth.body = body;
      if (p === '/auth/v1/token') {
        const g = url.searchParams.get('grant_type');
        if (g === 'refresh_token') {
          const id = String(body.refresh_token || '').replace(/^r-/, '');
          const r = await su('select id, email, raw_user_meta_data from auth.users where id::text = $1', [id]);
          if (!r.length) return json(400, { error: 'invalid_grant', error_description: 'Invalid Refresh Token', msg: 'Invalid Refresh Token' });
          return json(200, sesion(r[0]));
        }
        const r = await su('select u.id, u.email, u.raw_user_meta_data from auth.users u join auth.claves m on m.email = u.email where u.email = $1 and m.pass = $2', [String(body.email || '').toLowerCase(), body.password]);
        if (!r.length) return json(400, { code: 400, error_code: 'invalid_credentials', error: 'invalid_grant', error_description: 'Invalid login credentials', msg: 'Invalid login credentials' });
        await su('update auth.users set last_sign_in_at = now() where id = $1', [r[0].id]);
        return json(200, sesion(r[0]));
      }
      if (p === '/auth/v1/signup') {
        let u;
        try { u = await crearUsuario(body.email, body.password, body.data); }
        catch (e) { log('signup: ' + e.message); return json(e.code === '23505' ? 422 : 500, { code: e.code === '23505' ? 422 : 500, error_code: e.code === '23505' ? 'user_already_exists' : 'unexpected_failure', msg: e.code === '23505' ? 'User already registered' : 'Database error saving new user' }); }
        return json(200, sesion(u));
      }
      if (p === '/auth/v1/user') {
        if (!user) return json(401, { code: 401, msg: 'not authenticated' });
        if (metodo === 'PUT' && body && body.password) await su('update auth.claves set pass = $2 where email = $1', [user.email, body.password]);
        if (metodo === 'PUT' && body && body.data) await su('update auth.users set raw_user_meta_data = raw_user_meta_data || $2 where id = $1', [user.sub, JSON.stringify(body.data)]);
        const r = await su('select id, email, raw_user_meta_data from auth.users where id = $1', [user.sub]);
        if (!r.length) return json(403, { code: 403, error_code: 'user_not_found', msg: 'User from sub claim in JWT does not exist' });
        return json(200, sesion(r[0]).user);
      }
      if (p === '/auth/v1/logout') return json(204);
      if (p === '/auth/v1/recover' || p === '/auth/v1/otp' || p === '/auth/v1/resend') return json(200, {});
      if (p.startsWith('/rest/v1/')) {
        const esquema = headers['accept-profile'] || headers['content-profile'] || 'public';
        const resto = p.slice(9);
        try {
          if (resto.startsWith('rpc/')) {
            const args = metodo === 'GET' ? Object.fromEntries(url.searchParams) : body;
            const r = await rpc(esquema, resto.slice(4), args, user);
            return json(200, r);
          }
          const r = await rest(metodo, esquema, decodeURIComponent(resto), url.searchParams, headers, body, user);
          const extra = {};
          if (r.conteo != null) extra['content-range'] = (r.rows.length ? `0-${r.rows.length - 1}` : '*') + '/' + r.conteo;
          if (r.vacio) return route.fulfill({ status: 200, headers: Object.assign(cors, extra), body: '' });
          if ((headers.accept || '').includes('vnd.pgrst.object')) {
            if (r.rows && r.rows.length !== 1) return json(406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned', details: `The result contains ${r.rows.length} rows`, hint: null });
            return json(r.status === 204 ? 200 : r.status, r.rows ? r.rows[0] : null, extra);
          }
          return json(r.status, r.rows, extra);
        } catch (e) {
          if (!e.status) log(`[sim] ${metodo} ${p}: ${e.message}`);
          const st = e.status || (e.code === '42501' ? (user ? 403 : 401) : e.code === '23505' ? 409 : e.code === 'P0002' || e.code === 'PGRST116' ? 406 : 400);
          return json(st, { code: e.code || 'PGRST', message: e.message, details: e.detail || null, hint: e.hint || null });
        }
      }
      if (p.startsWith('/storage/v1/')) return await storage(route, metodo, p.slice(12), url, headers, crudo, body, user, json);
      if (p.startsWith('/functions/v1/')) {
        const nombre = p.slice(14);
        const h = (opts.funciones || {})[nombre];
        if (!h) return json(200, { ok: true });
        const r = await h(body || {}, user, { su, rpc: (fn, a, u) => rpc('public', fn, a, u === undefined ? user : u), crearUsuario, como });
        return json(r && r.__status ? r.__status : 200, r);
      }
      return json(404, { message: 'no simulado: ' + p });
    } catch (e) { log('[sim] ' + p + ': ' + (e.stack || e)); return json(500, { message: String(e.message || e) }); }
  }

  async function storage(route, metodo, p, url, headers, crudo, body, user, json) {
    // object/<bucket>/<ruta> · object/public/<bucket>/<ruta> · object/sign/<bucket>/<ruta> · object/list/<bucket> · object/<bucket> (DELETE)
    const partes = p.split('/');
    if (partes[0] === 'bucket') return json(200, await su('select id, name, public from storage.buckets'));
    if (partes[0] !== 'object') return json(404, { message: 'no simulado' });
    let tipo = partes[1];
    if (tipo === 'public' || tipo === 'sign' || tipo === 'authenticated' || tipo === 'list' || tipo === 'info' || tipo === 'move' || tipo === 'copy') partes.splice(1, 1); else tipo = null;
    const bucket = partes[1];
    const ruta = decodeURIComponent(partes.slice(2).join('/'));
    const clave = bucket + '/' + ruta;
    if (tipo === 'list') {
      const pref = (body && body.prefix) || '';
      const rows = await como(user, async (c) => (await c.query(`select name, id, created_at, updated_at, metadata from storage.objects where bucket_id = $1 and name like $2 order by name`, [bucket, (pref ? pref.replace(/\/$/, '') + '/' : '') + '%'])).rows);
      return json(200, rows.map((r) => Object.assign(r, { name: r.name.slice(pref ? pref.replace(/\/$/, '').length + 1 : 0) })).filter((r) => !r.name.includes('/')).slice(0, (body && body.limit) || 100));
    }
    if (tipo === 'sign' && metodo === 'POST') {
      if (body && body.paths) return json(200, body.paths.map((x) => ({ path: x, signedURL: `/object/sign/${bucket}/${x}?token=t`, error: null })));
      return json(200, { signedURL: `/object/sign/${bucket}/${ruta}?token=t` });
    }
    if (metodo === 'GET' || metodo === 'HEAD') {
      const a = archivos.get(clave);
      if (!a) return route.fulfill({ status: 400, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body: JSON.stringify({ statusCode: '404', error: 'not_found', message: 'Object not found' }) });
      return route.fulfill({ status: 200, headers: { 'content-type': a.type, 'access-control-allow-origin': '*' }, body: a.body });
    }
    if (metodo === 'POST' || metodo === 'PUT') {
      let datos = crudo || Buffer.alloc(0), type = headers['content-type'] || 'application/octet-stream';
      if (type.startsWith('multipart/form-data')) {
        const borde = '--' + type.split('boundary=')[1];
        const s = datos.toString('latin1');
        const ini = s.indexOf('\r\n\r\n', s.indexOf(borde)) + 4;
        const fin = s.indexOf('\r\n' + borde, ini);
        const cab = s.slice(s.indexOf(borde), ini);
        const m = cab.match(/Content-Type:\s*([^\r\n]+)/i);
        type = m ? m[1] : 'application/octet-stream';
        datos = Buffer.from(s.slice(ini, fin), 'latin1');
      }
      const upsert = (headers['x-upsert'] || '') === 'true';
      try {
        await como(user, async (c) => {
          if (upsert) await c.query('delete from storage.objects where bucket_id = $1 and name = $2', [bucket, ruta]);
          await c.query(`insert into storage.objects (bucket_id, name, owner, owner_id, metadata) values ($1, $2, $3::uuid, $3::text, $4)`, [bucket, ruta, user ? user.sub : null, JSON.stringify({ size: datos.length, mimetype: type })]);
        });
      } catch (e) {
        log(`[sim] subir ${clave}: ${e.message}`);
        return json(e.code === '23505' ? 409 : 403, { statusCode: e.code === '23505' ? '409' : '403', error: e.code === '23505' ? 'Duplicate' : 'Unauthorized', message: e.code === '23505' ? 'The resource already exists' : 'new row violates row-level security policy' });
      }
      archivos.set(clave, { body: datos, type });
      return json(200, { Key: clave, Id: clave, path: ruta });
    }
    if (metodo === 'DELETE') {
      const lista = (body && body.prefixes) || [ruta];
      const rows = await como(user, async (c) => (await c.query('delete from storage.objects where bucket_id = $1 and name = any($2) returning name, id', [bucket, lista])).rows);
      rows.forEach((r) => archivos.delete(bucket + '/' + r.name));
      return json(200, rows);
    }
    return json(404, { message: 'no simulado' });
  }

  async function realtime(ws) {
    ws.onMessage((m) => {
      let x; try { x = JSON.parse(m); } catch (e) { return; }
      if (Array.isArray(x)) { const [jr, r, topic, event] = x; ws.send(JSON.stringify([jr, r, topic, 'phx_reply', { status: 'ok', response: event === 'phx_join' ? { postgres_changes: [] } : {} }])); return; }
      ws.send(JSON.stringify({ topic: x.topic, event: 'phx_reply', payload: { status: 'ok', response: x.event === 'phx_join' ? { postgres_changes: [] } : {} }, ref: x.ref }));
    });
  }

  return {
    pool, su, rpc, crearUsuario, archivos, ultimoAuth,
    async conectar(contexto) {
      await contexto.route(/https:\/\/[a-z0-9]+\.supabase\.co\//, manejar);
      if (contexto.routeWebSocket) await contexto.routeWebSocket(/supabase\.co\/realtime/, realtime);
    },
    cerrar: () => pool.end(),
  };
}

module.exports = { crear, jwt };
