#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

echo "Deteniendo y eliminando contenedores de prueba..."
docker compose down

echo "Listo. Los volumenes persistentes se conservan. (Usa 'docker compose down -v' si quieres borrar los datos de base de datos)."

