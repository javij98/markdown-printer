# Guía de Pruebas Locales E2E (Outline + Print Studio)

Este entorno configura una integración local completa, autónoma y segura entre **Outline** y **Print Studio**, replicando la topología de producción recomendada.

## Componentes incluidos

1. **Proxy Caddy (`proxy`)**:
   - Termina TLS local en `https://localhost` mediante certificados autofirmados automáticos.
   - Enruta `https://localhost/print/*` -> `outline-print-studio:3000`.
   - Enruta `https://localhost/*` -> `outline:3000`.
   - Garantiza el mismo origen y el soporte para cookies `Secure`.
2. **PostgreSQL 16 (`postgres`)**: Base de datos obligatoria para Outline.
3. **Redis Alpine (`redis`)**: Cache de Outline y almacenamiento de sesiones OAuth de Print Studio.
4. **Mailpit (`mailpit`)**: Servidor SMTP de prueba local con interfaz web en `http://localhost:8025` para autenticación por Magic Link sin servicios externos.
5. **Outline (`outline`)**: Servidor principal de Outline.
6. **Print Studio (`outline-print-studio`)**: Runtime Express y cliente OAuth construido desde este repositorio.

---

## Procedimiento de Prueba

### Prueba de imágenes privadas

Con el usuario y la aplicación OAuth ya configurados en los archivos `.env`, ejecuta:

```bash
bash ./start-images-test.sh
```

Construye la imagen `outline-print-studio:images-fix-candidate` y la selecciona mediante `docker-compose.images.yml`, conservando la referencia original `0.7.0` del Compose base.

El documento preparado se llama **Print Studio — Prueba de imágenes privadas** y está en **Test Collection**. Sus enlaces e identificadores están en `fixtures/documento.json`. Incluye tres adjuntos privados (dos PNG y un JPEG), utilizados como cuatro imágenes con URLs relativas y absolutas, dimensiones, composiciones y pies de imagen. Los archivos originales están en `fixtures/`.

1. Abre el enlace `outline` del archivo y comprueba las cuatro imágenes.
2. Abre `printStudio` y autoriza `read /api/attachments.redirect` si se solicita.
3. Comprueba las cuatro imágenes en la vista de impresión y pulsa **Imprimir** para guardar como PDF.
4. Las imágenes a izquierda o derecha se muestran junto al texto en dos columnas editables. Puedes editar los párrafos, el pie y la posición de la imagen; se conservan sus dimensiones de Outline. Las imágenes a ancho completo y otros bloques avanzados siguen protegidos.
5. Selecciona 11 pt: el editor y la vista de impresión deben calcular 14,67 px CSS antes del zoom, y el PDF debe contener texto de 11 pt. Los tamaños del selector se expresan en puntos reales; el valor inicial de 10,5 pt conserva el tamaño físico anterior (14 px).

La comprobación de columnas y tipografía está en `artifacts/columnas-tipografia-resultados.json`, con una captura en `artifacts/columnas-vertical.png` y el PDF en `artifacts/columnas-11pt.pdf`. Se verificó en una sesión de navegador con solo la cookie de Print Studio: dos composiciones editables, cuatro imágenes privadas en el PDF de dos páginas y texto de aproximadamente 11 pt (10,995 pt por el redondeo de Chromium). Las 50 pruebas automatizadas y la compilación Docker pasan.

### Crear imágenes y reiniciar el documento

1. En el editor visual, abre `+` o escribe `/` y elige **Imagen + texto**. El cursor queda en la columna de texto; la otra columna ofrece **Subir imagen** o una URL. Puedes escribir mientras la imagen está pendiente.
2. Sube `fixtures/vertical.png`, escribe un pie y cambia de lado con los botones de disposición. El cursor del pie debe ser visible en los temas claro y oscuro.
3. Arrastra uno de los tiradores inferiores de la imagen o introduce su ancho en píxeles. También se pueden redimensionar las imágenes normales. Comprueba que **Deshacer** revierte un arrastre completo y que cambiar a Markdown conserva las dimensiones `=ANCHOxALTO`.
4. Pulsa **Reiniciar**: **Cancelar** conserva los cambios; **Reiniciar documento** vuelve a leer Outline, restaura el diseño inicial y vacía el historial de deshacer. Si Outline falla, se muestra un error sin sustituir la copia. El botón solo está disponible en la pestaña vinculada a Outline.

La verificación está en `artifacts/editor-reinicio-resultados.json`. Se comprobaron los menús `+` y `/`, subida local, dimensiones, temas, redimensionado con deshacer, y reinicio cancelado, fallido y correcto. Cambiar inmediatamente a Markdown o imprimir conserva el último texto y tamaño, incluso antes de actualizarse la vista previa. El PDF `artifacts/editor-imagenes-redimensionadas.pdf` contiene cuatro imágenes privadas y una local en tres páginas; todas están dentro del área imprimible. La imagen local de 180 × 240 px aparece en el PDF con 135 × 180 pt. Las 75 pruebas automatizadas y la compilación Docker pasan. Las capturas `controles-imagen-light.png`, `controles-imagen-dark.png` y `editor-imagenes-final.png` muestran los controles.

La prueba automatizada se ha ejecutado con la cookie de Print Studio y sin la cookie de Outline. La versión original devuelve 403 para los adjuntos; la corregida obtiene la imagen mediante `/print/api/attachments/<uuid>`. Las capturas, el PDF y el informe están en `artifacts/`.

Los enlaces del documento siguen siendo válidos mientras se conserven los volúmenes locales. Si se borran los volúmenes, será necesario crear nuevamente el usuario, la aplicación OAuth y los adjuntos.

Para volver al runtime original sin borrar datos:

```bash
docker compose -f docker-compose.yml up -d --no-build --no-deps outline-print-studio
```

### Prerrequisitos

1. Iniciar Docker:
```bash
sudo systemctl start docker
```

2. Construir la imagen personalizada de Outline (desde `/home/javirles/dev/projects/outline`):
```bash
cd /home/javirles/dev/projects/outline
git switch feature/print-studio
docker build -f Dockerfile.base -t outline:1.9.2-print-base .
docker build --build-arg BASE_IMAGE=outline:1.9.2-print-base -t outline-custom:1.9.2-printstudio.2 .
```

---

### Paso 1: Levantar Outline y la infraestructura base

Desde este directorio (`local-test/`), ejecuta:
```bash
./start-outline.sh
```

Espera a que los servicios inicialicen. Outline aplicará las migraciones de base de datos automáticamente.

---

### Paso 2: Crear el usuario y el workspace

1. Abre en tu navegador: `https://localhost`
   *(Acepta la advertencia de certificado autofirmado local).*
2. Escribe una dirección de email (ej: `admin@local.test`).
3. Abre en otra pestaña el buzón de Mailpit: `http://localhost:8025`.
4. Abre el correo que ha llegado y pulsa en el botón **Sign In** (Magic Link).
5. Asigna un nombre a tu equipo/workspace (ej: `Empresa Test`).

---

### Paso 3: Obtener el `OUTLINE_TEAM_ID`

En tu terminal ejecuta:
```bash
./get-team-id.sh
```
El script consultará Postgres y te devolverá el UUID de tu equipo.

---

### Paso 4: Crear la aplicación OAuth en Outline

1. En Outline (`https://localhost`), ve a **Configuración** (`Settings`) > **Desarrolladores** (`Developers`) > **Aplicaciones OAuth** (`OAuth Applications`).
2. Haz clic en **Nueva aplicación**:
   - **Nombre:** `Print Studio`
   - **Redirect URI:** `https://localhost/print/auth/callback` *(es obligatorio que sea idéntico)*
3. Guarda y copia el **Client ID** y el **Client Secret**.

---

### Paso 5: Configurar `.env.print` y arrancar Print Studio

1. Edita el archivo `.env.print`:
   ```bash
   nano .env.print   # o tu editor preferido
   ```
   Rellena las tres variables:
   ```dotenv
   OUTLINE_CLIENT_ID=<tu_client_id>
   OUTLINE_CLIENT_SECRET=<tu_client_secret>
   OUTLINE_TEAM_ID=<tu_team_id>
   ```

2. Arranca Print Studio:
   ```bash
   ./start-print-studio.sh
   ```

---

### Paso 6: Validar la integración de extremo a extremo

1. En Outline (`https://localhost`), crea una colección y añade un documento de prueba con encabezados, tablas, listas y texto.
2. Copia el identificador del documento (el UUID o slug que aparece en la URL del navegador).
3. Abre en tu navegador:
   ```text
   https://localhost/print/document/<ID_DEL_DOCUMENTO>
   ```
4. Verás la pantalla de autorización OAuth de Outline. Haz clic en **Autorizar**.
5. Outline redirigirá a Print Studio, la cookie de sesión se creará y se renderizará el documento en el editor visual paginado.

---

### Limpieza
Para detener los contenedores:
```bash
./stop.sh
```
Para borrar también los datos de prueba de base de datos y redis:
```bash
docker compose down -v
```
