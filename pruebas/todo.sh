#!/bin/bash
# Corre todas las pruebas (base, actualización desde main y navegador) de las 6 apps. ./todo.sh
cd "$(dirname "$0")"
R=/home/user
PSQL="psql -h /var/tmp/pgb -p 54329 -U postgres -q -At"
for r in saas emprendedor Aplicaciones barberia taller estacionamiento; do ./actualizar.sh $R/$r | grep -E "✓|ERROR"; python3 inventario.py $R/$r --verificar; done
(cd $R/barberia/supabase/pruebas && ./correr.sh "-h /var/tmp/pgb -p 54329 -U postgres" 2>&1 | tail -1)
$PSQL -d barberia_prueba -c "create table if not exists auth.claves (email text primary key, pass text not null); insert into auth.claves select email, 'clave123' from auth.users on conflict do nothing; alter table auth.users add column if not exists last_sign_in_at timestamptz;" >/dev/null
correr() { ./base.sh $R/$1 >/dev/null 2>&1; shift; for t in "$@"; do echo "### $t"; timeout 300 node $t.js 2>&1 | grep -vE "^ok|^url"; done; }
correr saas cm_ui; correr saas final_ui; correr saas cm_apps; correr saas cm_pagos; correr saas cm_control; correr saas cm_p5
correr emprendedor emp_ui; correr emprendedor emp_pagos
correr Aplicaciones apl_ui; correr Aplicaciones apl_pagos
for t in bar_ui bar_pagos; do $PSQL -d barberia_prueba -c "delete from cfx_exentos" >/dev/null; echo "### $t"; timeout 300 node $t.js 2>&1 | grep -vE "^ok|^url"; done
correr taller tal_ui; correr taller tal_pagos
correr estacionamiento est_ui; correr estacionamiento est_pagos
./base.sh $R/Aplicaciones >/dev/null 2>&1; ./base.sh $R/saas >/dev/null 2>&1; echo "### r2_ui"; timeout 400 node r2_ui.js 2>&1 | grep -vE "^ok|^url"
for a in saas:cm_p1 saas:cm_r2 emprendedor:emp_p1 Aplicaciones:apl_p1 Aplicaciones:apl_r2 taller:tal_p1 estacionamiento:est_p1; do r=${a%%:*}; ./base.sh $R/$r >/dev/null 2>&1; db=p_$(echo $r | tr A-Z a-z); echo "### ${a##*:}.sql"; $PSQL -d $db -f ${a##*:}.sql 2>&1 | grep -E "^f$|ERROR" | grep -v "ERROR:  La tabla tiene\|no está en la lista\|Solo el administrador" ; done
