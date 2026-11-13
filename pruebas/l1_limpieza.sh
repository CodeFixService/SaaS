#!/bin/bash
# L1 · prueba de nucleo/sql/limpieza_l1.sql sobre copias de las bases locales (deben existir: ./base.sh o central.js antes).
# Uso: ./l1_limpieza.sh p_aplicaciones p_saas ...   → queda 1 usuario (admin), config intacta; Cerebro se niega.
P="psql -h ${PGHOST:-/var/tmp/pgb} -p ${PGPORT:-54329} -U postgres"; F="$(dirname "$0")/../nucleo/sql/limpieza_l1.sql"
for d in "$@"; do
  $P -d postgres -qc "drop database if exists t_l1 with (force)" -c "create database t_l1 template $d" 2>/dev/null
  $P -d t_l1 -qc "insert into auth.users (email) select 'juanjosuecastilloloyola@gmail.com' where not exists (select 1 from auth.users where email = 'juanjosuecastilloloyola@gmail.com')" -c "insert into auth.users (email) values ('otro@x.cl')" 2>/dev/null
  $P -d t_l1 -q -f "$F" >/dev/null 2>&1
  u=$($P -d t_l1 -Atc "select count(*) from auth.users"); c=$($P -d t_l1 -Atc "select count(*) from public.cfx_config")
  [ "$u" = 1 ] && [ "$c" -gt 0 ] && echo "ok $d (queda 1 cuenta, config $c)" || echo "✗ $d usuarios=$u config=$c"
done
