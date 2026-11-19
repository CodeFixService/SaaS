-- CodeFix · 📏 ¿Cuánto pesa esta app? (G121). SOLO LEE: no cambia nada. Pegar en Supabase → SQL Editor → Run, en cada app.
-- Muestra: base total vs 500 MB (Free) y 8 GB (Pro), las tablas más pesadas, las fotos guardadas como texto y el almacén (Storage).
create or replace function pg_temp.cfx_peso() returns table(que text, cuanto text, detalle text) language plpgsql as $$
declare r record; b bigint; n bigint; tot bigint := 0; nf bigint := 0; db bigint := pg_database_size(current_database());
begin
  que := '🗄️ Base total'; cuanto := pg_size_pretty(db);
  detalle := round(db * 100.0 / (500 * 1024 * 1024), 1) || '% de 500 MB (Free) · ' || round(db * 100.0 / (8::bigint * 1024 * 1024 * 1024), 2) || '% de 8 GB (Pro)'; return next;
  for r in select c.table_schema s, c.table_name t, c.column_name k from information_schema.columns c
    join information_schema.tables x on x.table_schema = c.table_schema and x.table_name = c.table_name and x.table_type = 'BASE TABLE'
    where c.table_schema = 'public' and (c.data_type in ('json', 'jsonb') or (c.data_type = 'text' and c.column_name ~* '(foto|imagen|logo|portada|avatar|comprobante)')) loop
    execute format('select coalesce(sum(octet_length(%I::text)),0), count(*) from %I.%I where %I::text like ''%%data:image%%''', r.k, r.s, r.t, r.k) into b, n;
    tot := tot + b; nf := nf + n;
  end loop;
  que := '🖼️ Fotos dentro de la base'; cuanto := pg_size_pretty(tot);
  detalle := nf || ' filas con foto · promedio ' || case when nf > 0 then pg_size_pretty(tot / nf) else '0' end; return next;
  for r in select n.nspname || '.' || c.relname t, pg_total_relation_size(c.oid) z from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where c.relkind = 'r' and n.nspname in ('public', 'auth', 'privado', 'storage') order by 2 desc limit 8 loop
    que := '📋 ' || r.t; cuanto := pg_size_pretty(r.z); detalle := round(r.z * 100.0 / greatest(db, 1), 1) || '% de la base'; return next;
  end loop;
  if to_regclass('storage.objects') is not null then
    for r in execute 'select bucket_id t, count(*) c, coalesce(sum((metadata->>''size'')::bigint),0) z from storage.objects group by 1 order by 3 desc' loop
      que := '📦 Storage · ' || r.t; cuanto := pg_size_pretty(r.z::bigint); detalle := r.c || ' archivos · ' || round(r.z * 100.0 / (1024 * 1024 * 1024), 1) || '% de 1 GB (Free)'; return next;
    end loop;
  end if;
  select count(*) into n from auth.users; que := '👤 Cuentas'; cuanto := n::text; detalle := 'Free: 50.000 activas/mes · Pro: 100.000'; return next;
end $$;
select * from pg_temp.cfx_peso();
