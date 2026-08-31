# Despliegue

Esta guía cubre la construcción y operación de Print Studio junto a una instancia existente de Outline. Los ejemplos utilizan la versión `0.7.0`.

## Topología recomendada

```text
Internet
   |
HTTPS / reverse proxy
   |-- /          -> Outline
   +-- /print/*   -> Print Studio

Red Docker privada
   |-- outline:3000
   |-- outline-print-studio:3000
   +-- outline-redis:6379
```

Print Studio debe compartir red con Outline y Redis. Redis no debe publicar su puerto a Internet.

## 1. Construir la imagen

Desde la raíz del repositorio:

```bash
git switch main
git pull --ff-only origin main
git checkout v0.7.0
docker build --pull -t outline-print-studio:0.7.0 .
```

Comprueba la imagen:

```bash
docker image inspect outline-print-studio:0.7.0
```

No utilices `latest` en producción. Una etiqueta inmutable permite volver a una versión anterior.

## 2. Preparar el entorno

```bash
cp .env.print.example print-studio.env
chmod 600 print-studio.env
```

Edita `print-studio.env` con los valores reales. No lo añadas a Git.

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `PORT` | No | Puerto interno; por defecto `3000`. |
| `OUTLINE_PUBLIC_URL` | Sí | URL pública HTTPS de Outline. |
| `OUTLINE_INTERNAL_URL` | Sí | URL de Outline accesible desde el contenedor. |
| `OUTLINE_AUTHORIZATION_URL` | Sí | Endpoint público `/oauth/authorize`. |
| `OUTLINE_CLIENT_ID` | Sí | Identificador de la aplicación OAuth. |
| `OUTLINE_CLIENT_SECRET` | Sí | Secreto OAuth, solo servidor. |
| `OUTLINE_REDIRECT_URI` | Sí | Callback público exacto bajo `/print/auth/callback`. |
| `OUTLINE_TEAM_ID` | Sí | Workspace autorizado. |
| `REDIS_URL` | Sí | Redis privado utilizado para sesiones. |

## 3. Añadir el servicio a Compose

La opción preferida es incorporar el servicio al mismo Compose que Outline:

```yaml
services:
  outline-print-studio:
    image: outline-print-studio:0.7.0
    restart: unless-stopped
    env_file:
      - ./print-studio.env
    expose:
      - "3000"
    ports:
      - "127.0.0.1:3001:3000"
    healthcheck:
      test: ["CMD", "wget", "-q", "-O", "-", "http://127.0.0.1:3000/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
```

El puerto enlazado a `127.0.0.1` es útil cuando el proxy se ejecuta en el host. Si el proxy comparte la red Docker, elimina `ports` y utiliza `outline-print-studio:3000`.

Los nombres de `OUTLINE_INTERNAL_URL` y `REDIS_URL` deben coincidir con los nombres reales de servicio o aliases de red.

Inicia únicamente el nuevo servicio:

```bash
docker compose up -d outline-print-studio
docker compose ps outline-print-studio
docker compose logs --tail=100 outline-print-studio
```

## 4. Configurar el proxy

### Nginx en el host

```nginx
location = /print {
    return 301 /print/;
}

location ^~ /print/ {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
    proxy_no_cache 1;
    proxy_cache_bypass 1;
}
```

No añadas una barra al final de `proxy_pass`: Print Studio necesita recibir la ruta `/print/...` completa.

### Caddy

```caddy
handle /print/* {
    reverse_proxy 127.0.0.1:3001
}

redir /print /print/ 308
```

No uses `handle_path`, porque elimina el prefijo `/print`.

## 5. Configurar OAuth

En Outline registra:

```text
https://outline.example.com/print/auth/callback
```

Debe ser idéntico a `OUTLINE_REDIRECT_URI`. Después reinicia Print Studio:

```bash
docker compose up -d --force-recreate outline-print-studio
```

## 6. Verificar

```bash
curl -fsS http://127.0.0.1:3001/health
curl -sS -o /dev/null -D - https://outline.example.com/print/
docker compose logs --tail=100 outline-print-studio
```

Resultado esperado:

- `/health` responde `ok`;
- `/print/` redirige a OAuth sin una sesión;
- tras autenticarse vuelve a la ruta solicitada;
- `/print/document/:id` carga el título y el Markdown;
- no hay errores de Redis, token o `auth.info`.

## Actualizar

```bash
docker build --pull -t outline-print-studio:<nueva-version> .
```

Actualiza únicamente la etiqueta del servicio y recrea:

```bash
docker compose up -d --no-deps --force-recreate outline-print-studio
```

Conserva la imagen anterior hasta terminar la validación.

## Rollback

1. Cambia la imagen del Compose a la versión anterior.
2. Recrea únicamente Print Studio.
3. Comprueba `/health`, OAuth y un documento real.

```bash
docker compose up -d --no-deps --force-recreate outline-print-studio
docker compose logs --tail=100 outline-print-studio
```

Print Studio no mantiene documentos en el servidor, así que volver de versión no requiere migración de datos. Las sesiones Redis pueden invalidarse sin afectar a los documentos de Outline.

## Exportar una imagen para otro servidor

```bash
docker save outline-print-studio:0.7.0 \
  | gzip > outline-print-studio-0.7.0-linux-amd64.tar.gz

sha256sum outline-print-studio-0.7.0-linux-amd64.tar.gz \
  > outline-print-studio-0.7.0-linux-amd64.tar.gz.sha256
```

En el servidor de destino:

```bash
sha256sum -c outline-print-studio-0.7.0-linux-amd64.tar.gz.sha256
gzip -dc outline-print-studio-0.7.0-linux-amd64.tar.gz | docker load
```

## Copias de seguridad

Print Studio no contiene la base documental. La estrategia de backup debe priorizar:

1. PostgreSQL y almacenamiento de Outline;
2. configuración y secretos de Outline;
3. Compose y `print-studio.env`, cifrados y fuera del repositorio;
4. referencia de las imágenes y tags desplegados.

Redis de Print Studio contiene sesiones recuperables y normalmente no necesita backup. Si se pierde, los usuarios deben autenticarse de nuevo.

## Endurecimiento

- Ejecuta siempre detrás de HTTPS.
- Publica el puerto solo en loopback o en una red Docker privada.
- No expongas Redis.
- Protege los archivos de entorno con permisos restrictivos.
- Mantén logs sin tokens ni secretos.
- Limita el acceso administrativo a Outline y al host.
- Fija versiones de imagen y verifica checksums al transferir archivos.
- Incluye `/health` en la monitorización, pero valida OAuth periódicamente de extremo a extremo.
