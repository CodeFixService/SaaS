/* Conexión con Supabase. Ambos valores son públicos por diseño:
   la seguridad está en las reglas de la base de datos (supabase/schema.sql). */
window.BT_CONFIG = {
  SUPABASE_URL: 'https://vqevujjraisrcoirswuq.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxZXZ1ampyYWlzcmNvaXJzd3VxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzMzk3NzMsImV4cCI6MjEwNzkxNTc3M30.XHeUtKmMJ5sSMCeGCzYnsYS3xQwPYrDwuylw3p7ICFk',
  VERSION: '3.0',     // versión de la app (súbela en cada cambio y en version.json)
  DB_VERSION: '3.0'   // versión que debe tener la base de datos (supabase/schema.sql → db_version)
};
