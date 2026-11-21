-- ---------------------------------------------------------------------
-- CodeFix · G142 b 👤 Clientes sin cuenta que después se registran: el negocio crea al cliente con su CORREO (y sus bicis, órdenes…);
--   cuando esa persona CONFIRMA ese correo, cada app le asocia lo suyo con el gancho cfx_reclamar_app(cuenta, correo).
--   🛡️ Nunca sin correo verificado: el disparador solo corre cuando auth.users.email_confirmed_at pasa a tener fecha.
--   Si el gancho falla, el registro sigue igual (nunca bloquea la cuenta).
--   cfx_correo_verificado(correo) → id de la cuenta con ese correo YA confirmado (o null); para asociar al tiro al crear.
-- ---------------------------------------------------------------------
create or replace function public.cfx_correo_verificado(p_correo text) returns uuid
language sql stable security definer set search_path = public, pg_temp as $$
  select u.id from auth.users u where lower(u.email) = lower(trim(coalesce(p_correo, ''))) and length(trim(coalesce(p_correo, ''))) > 3
    and u.email_confirmed_at is not null limit 1
$$;
revoke all on function public.cfx_correo_verificado(text) from public, anon, authenticated;

create or replace function public.cfx_reclamar_correo() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.email_confirmed_at is not null and new.email is not null and (tg_op = 'INSERT' or old.email_confirmed_at is null or lower(old.email) is distinct from lower(new.email))
     and to_regprocedure('public.cfx_reclamar_app(uuid, text)') is not null then
    begin
      execute 'select public.cfx_reclamar_app($1, $2)' using new.id, lower(new.email);
    exception when others then null;  -- nunca bloquear el registro
    end;
  end if;
  return new;
end $$;
revoke all on function public.cfx_reclamar_correo() from public, anon, authenticated;
drop trigger if exists zz_cfx_reclamar on auth.users;
create trigger zz_cfx_reclamar after insert or update of email_confirmed_at, email on auth.users
  for each row execute function public.cfx_reclamar_correo();
