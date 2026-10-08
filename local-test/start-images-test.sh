#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

docker compose -f docker-compose.yml up -d postgres redis mailpit outline proxy
docker build -t outline-print-studio:images-fix-candidate ..
docker compose -f docker-compose.yml -f docker-compose.images.yml \
  up -d --no-build --no-deps outline-print-studio

echo "Banco local de imágenes listo: https://localhost"
echo "Documento de prueba y adjuntos: fixtures/documento.json"
echo "Abre la URL printStudio de ese archivo y autoriza el acceso a adjuntos si se solicita."
