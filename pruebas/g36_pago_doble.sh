#!/bin/bash
# Pago: en producción quedaba la cfx_pago_pedir antigua (7 parámetros) junto a la nueva (8) → "Could not choose the best candidate function".
# Simula esa base y vuelve a correr instalar.sql: debe quedar UNA sola y el pago con 7 nombres debe funcionar.
# Uso: ./g36_pago_doble.sh   (Despega, CM y Barbería)
cd "$(dirname "$0")"; P="psql -h ${PGHOST:-/var/tmp/pgb} -p ${PGPORT:-54329} -U postgres -q"
for r in Aplicaciones SaaS Barberia; do
  d=g36_$(echo $r | tr A-Z a-z); ./base.sh /home/user/$r $d >/dev/null 2>&1
  $P -d $d -c "create function public.cfx_pago_pedir(p_periodo text, p_monto int, p_medio text, p_comprobante text, p_nota text default '', p_cupon text default null, p_meses int default null) returns uuid language sql as 'select null::uuid'"
  sed -E 's/create extension if not exists (http|pg_cron|pg_net)[^;]*;/create schema if not exists extensions;/I' /home/user/$r/supabase/instalar.sql | $P -d $d >/dev/null 2>&1
  n=$($P -d $d -Atc "select count(*) from pg_proc where proname = 'cfx_pago_pedir'")
  e=$($P -d $d -Atc "select public.cfx_pago_pedir(p_periodo => 'mes', p_monto => 1, p_medio => 'transferencia', p_comprobante => '', p_nota => '', p_cupon => null, p_meses => 1)" 2>&1 | grep -o "best candidate")
  [ "$n" = 1 ] && [ -z "$e" ] && echo "ok $r: una sola cfx_pago_pedir" || echo "✗ $r: $n versiones $e"
done
