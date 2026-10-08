#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

# Validar que .env.print no tenga placeholders
if grep -q "replace-with-" .env.print; then
  echo "ERROR: El archivo .env.print todavia contiene valores de ejemplo ('replace-with-...')."
  echo "Debes editar .env.print y configurar:"
  echo " - OUTLINE_CLIENT_ID"
  echo " - OUTLINE_CLIENT_SECRET"
  echo " - OUTLINE_TEAM_ID"
  echo ""
  echo "Ejecuta ./get-team-id.sh para obtener el Team ID y crea la app OAuth en https://localhost"
  exit 1
fi

echo "=== Construyendo y levantando Print Studio ==="
docker compose up -d --build outline-print-studio

echo ""
echo "=== Print Studio iniciado con éxito ==="
docker compose logs -n 20 outline-print-studio
echo ""
echo "¡Todo listo! Abre https://localhost y prueba a acceder a Print Studio desde tus documentos."

