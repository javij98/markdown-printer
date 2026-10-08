#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

echo "=== [1/3] Levantando Postgres, Redis, Mailpit, Outline y Caddy ==="
docker compose up -d postgres redis mailpit outline proxy

echo ""
echo "=== [2/3] Servicios iniciados ==="
echo "Outline: https://localhost (Acepta el certificado autofirmado)"
echo "Mailpit: http://localhost:8025 (Buzon de correo local)"
echo ""
echo "=== [3/3] Siguientes pasos ==="
echo "1. Abre https://localhost en tu navegador."
echo "2. Introduce un correo (ej. admin@local.test)."
echo "3. Abre http://localhost:8025, abre el email y haz clic en el Magic Link."
echo "4. Pon nombre a tu equipo/workspace."
echo "5. Ejecuta ./get-team-id.sh para copiar tu OUTLINE_TEAM_ID."
echo "6. En Outline: Settings -> Developers -> OAuth Applications -> Nueva:"
echo "   - Nombre: Print Studio"
echo "   - Redirect URI: https://localhost/print/auth/callback"
echo "7. Copia el Client ID y Client Secret en el archivo .env.print."
echo "8. Ejecuta ./start-print-studio.sh"

