-- 🧹 L1 · Empezar de cero (una vez). Pegar en Supabase → SQL Editor → Run, en cada app MENOS Cerebro.
-- Queda: tu cuenta de admin (y socios) con lo suyo + configuración (planes, textos, claves, correo, pagos).
-- Se borra: todos los demás usuarios y todo lo suyo, y los registros de errores antiguos.
-- Antes copia todo en el esquema respaldo_l1 (deshacer: avisar a Claude). Re-ejecutable.
create temp table if not exists l1_res (paso text, tabla text, filas bigint);
truncate l1_res;
do $l1$
declare
  adm text := 'juanjosuecastilloloyola@gmail.com';
  quedan text[]; ids uuid[]; r record; c record; cond text; n bigint; total bigint; pasada int;
  nunca text[] := array['cfx_config','config','app_settings','app_secrets','cfx_secretos','secreto','secretos','planes','textos',
    'cfx_versiones','actualizaciones','cfx_socios','cfx_cupones','cfx_brechas','cm_puentes','limites'];
  logs text[] := array['cfx_errores','cfx_salud','cfx_cargas','cfx_analisis','cfx_login_fallos','cfx_registro','auditoria','compartido_log'];
  usr text := '^(owner_id|user_id|usuario|usuario_id|cuenta|negocio|negocio_id|cliente_id|invitado|invito|usada_por|created_by|quien|'
    || 'de|para|target_id|anulada_por|aprobada_por|creada_por|anulado_por|creado_por|enviado_por|revisado_por|ultimo_autor|objetivo)$';
begin
  if to_regclass('public.base_contenido') is not null or to_regclass('public.guia_redes') is not null then
    raise exception 'Esta es la base de Cerebro: aquí NO se limpia.';
  end if;
  quedan := '{}';
  if to_regclass('public.cfx_socios') is not null then
    execute 'select coalesce(array_agg(lower(email)), ''{}'') from public.cfx_socios' into quedan;
  end if;
  quedan := quedan || adm;
  select coalesce(array_agg(id), '{}') into ids from auth.users where lower(email) = any(quedan);
  if not exists (select 1 from auth.users where lower(email) = adm) then
    raise exception 'No encuentro la cuenta % en esta app: no borro nada.', adm;
  end if;
  -- 1) Respaldo (solo la primera vez)
  if to_regnamespace('respaldo_l1') is null then
    create schema respaldo_l1;
    revoke all on schema respaldo_l1 from public, anon, authenticated;
    for r in select s.nspname sch, t.relname tab from pg_class t join pg_namespace s on s.oid = t.relnamespace
             where s.nspname in ('public','privado') and t.relkind = 'r' loop
      execute format('create table respaldo_l1.%I as table %I.%I', r.sch || '__' || r.tab, r.sch, r.tab);
    end loop;
    create table respaldo_l1.auth__users as table auth.users;
    create table respaldo_l1.auth__identities as table auth.identities;
    insert into l1_res values ('1 respaldo', 'respaldo_l1', (select count(*) from pg_tables where schemaname = 'respaldo_l1'));
  end if;
  -- 2) Registros antiguos (errores, cargas, intentos de clave)
  for r in select s.nspname sch, t.relname tab from pg_class t join pg_namespace s on s.oid = t.relnamespace
           where s.nspname = 'public' and t.relkind = 'r' and t.relname = any(logs) loop
    execute format('delete from %I.%I', r.sch, r.tab); get diagnostics n = row_count;
    insert into l1_res values ('2 registros', r.tab, n);
  end loop;
  -- 3) Datos de los demás usuarios (varias pasadas por si una tabla depende de otra)
  for pasada in 1..4 loop
    total := 0;
    for r in select t.oid, s.nspname sch, t.relname tab from pg_class t join pg_namespace s on s.oid = t.relnamespace
             where s.nspname in ('public','privado') and t.relkind = 'r' and not t.relname = any(nunca) and not t.relname = any(logs) loop
      cond := null;
      for c in select a.attname, a.atttypid from pg_attribute a where a.attrelid = r.oid and a.attnum > 0 and not a.attisdropped
          and ((a.atttypid = 'uuid'::regtype and a.attname <> 'id' and (a.attname ~ usr or exists (select 1 from pg_constraint k
                 where k.conrelid = r.oid and k.contype = 'f' and a.attnum = any(k.conkey)
                   and k.confrelid in ('auth.users'::regclass, coalesce(to_regclass('public.profiles'), 0), coalesce(to_regclass('public.perfiles'), 0)))))
            or (a.atttypid = 'uuid'::regtype and a.attname = 'id' and r.tab in ('profiles','perfiles'))
            or (format_type(a.atttypid, null) in ('text', 'character varying', 'citext') and a.attname ~ '^(email|correo|email_directo|invitado_correo|usada_email|quien_email)$')) loop
        cond := coalesce(cond || ' or ', '') || case when c.atttypid = 'uuid'::regtype
          then format('(%I is not null and %I <> all($1))', c.attname, c.attname)
          else format('(coalesce(%I, '''') <> '''' and lower(%I) <> all($2))', c.attname, c.attname) end;
      end loop;
      if cond is null then continue; end if;
      begin
        execute format('delete from %I.%I where %s', r.sch, r.tab, cond) using ids, quedan; get diagnostics n = row_count;
        if n > 0 then insert into l1_res values ('3 datos', r.sch || '.' || r.tab, n); total := total + n; end if;
      exception when others then
        if pasada = 4 then insert into l1_res values ('⚠️ ' || left(sqlerrm, 80), r.tab, 0); end if;
      end;
    end loop;
    exit when total = 0 and pasada > 1;
  end loop;
  -- 4) Cuentas (correo y clave): queda solo la tuya y la de tus socios
  delete from auth.users where not (id = any(ids)); get diagnostics n = row_count;
  insert into l1_res values ('4 cuentas borradas', 'auth.users', n);
  insert into l1_res values ('✅ quedan', 'auth.users', (select count(*) from auth.users));
end $l1$;
select * from l1_res order by paso, tabla;
