#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

echo "Consultando el Team ID en la base de datos de Outline..."
TEAM_INFO=$(docker compose exec -T postgres psql -U outline -d outline -t -A -c "SELECT id, name FROM teams LIMIT 1;" || true)

if [ -z "$TEAM_INFO" ]; then
  echo "Error: No se encontró ningún equipo en Outline todavía."
  echo "Asegúrate de haber completado el registro en https://localhost antes de ejecutar este script."
  exit 1
fi

TEAM_ID=$(echo "$TEAM_INFO" | cut -d '|' -f 1)
TEAM_NAME=$(echo "$TEAM_INFO" | cut -d '|' -f 2)

echo ""
echo "Equipo encontrado: '$TEAM_NAME'"
echo "OUTLINE_TEAM_ID: $TEAM_ID"
echo ""
echo "Pega este valor en la variable OUTLINE_TEAM_ID de .env.print"

