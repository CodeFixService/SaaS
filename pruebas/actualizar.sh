#!/bin/bash
# Prueba de actualización: instala el instalar.sql de origin/main y encima el nuevo (como hace auto_actualizar). ./actualizar.sh <repo>
set -e
cd "$(dirname "$0")"
REPO=$1; DB=up_$(basename "$REPO" | tr A-Z a-z)
PSQL="psql -h /var/tmp/pgb -p 54329 -U postgres -v ON_ERROR_STOP=1 -q"
SED='s/create extension if not exists (http|pg_cron|pg_net)[^;]*;/create schema if not exists extensions;/I'
$PSQL -d postgres -c "drop database if exists $DB with (force)" -c "create database $DB" >/dev/null
$PSQL -d $DB -f stub.sql >/dev/null 2>&1
git -C "$REPO" show origin/main:supabase/instalar.sql | sed -E "$SED" > /tmp/viejo_$DB.sql
sed -E "$SED" "$REPO/supabase/instalar.sql" > /tmp/nuevo_$DB.sql
$PSQL -d $DB -f /tmp/viejo_$DB.sql >/dev/null 2>&1
$PSQL -d $DB -f /tmp/nuevo_$DB.sql 2>&1 | grep -E "ERROR|resultado|instalad|v[0-9]" | tail -2
$PSQL -d $DB -f /tmp/nuevo_$DB.sql >/dev/null 2>&1 && echo "  ✓ $REPO: actualiza y se puede volver a correr"
