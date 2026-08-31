# Solución de problemas

## Diagnóstico inicial

```bash
docker compose ps
docker compose logs --tail=200 outline-print-studio
curl -v http://127.0.0.1:3001/health
```

Comprueba también que el contenedor puede resolver y alcanzar los nombres internos:

```bash
docker compose exec outline-print-studio \
  wget -q -S -O - http://outline:3000 2>&1 | head
```

No pegues logs con tokens, cookies o secretos en incidencias públicas.

## El contenedor no arranca

Mensaje habitual:

```text
Missing required environment variable: ...
```

Todas las variables de `.env.print.example`, excepto el puerto con valor por defecto, son obligatorias. Verifica:

```bash
docker compose config
docker compose exec outline-print-studio env
```

Evita mostrar `OUTLINE_CLIENT_SECRET` al copiar la salida.

## Error de Redis

Síntomas:

- el proceso no termina de arrancar;
- OAuth vuelve con state inválido;
- aparecen errores `ECONNREFUSED` o DNS.

Revisa:

1. que `REDIS_URL` use el nombre de servicio correcto;
2. que ambos contenedores compartan red;
3. que Redis esté sano;
4. que no se haya configurado TLS o contraseña sin reflejarlo en la URL.

```bash
docker compose exec outline-redis redis-cli ping
```

Debe responder `PONG`.

## OAuth rechaza el callback

Compara carácter por carácter:

- redirect URI registrada en Outline;
- `OUTLINE_REDIRECT_URI`;
- dominio y protocolo vistos por el navegador;
- ruta `/print/auth/callback`.

Errores frecuentes:

- usar HTTP cuando la URL pública es HTTPS;
- omitir `/print`;
- añadir una barra final distinta;
- proxy que elimina el prefijo;
- client ID y secret de otra aplicación.

## Bucle de login

La cookie es siempre `Secure`. Si se prueba por HTTP, el navegador no la enviará.

Comprueba en DevTools:

- nombre `outline_print_session`;
- path `/print`;
- flags `HttpOnly`, `Secure` y `SameSite=Lax`;
- que la respuesta del callback incluye `Set-Cookie`.

Comprueba también que el proxy envía:

```text
X-Forwarded-Proto: https
Host: outline.example.com
```

## “Invalid or expired OAuth state”

El state dura 10 minutos y solo se usa una vez. Puede fallar si:

- el usuario tarda demasiado en autorizar;
- Redis se reinicia durante el flujo;
- varias instancias no comparten Redis;
- el callback se reutiliza desde el historial.

Inicia el proceso de login de nuevo. No amplíes el TTL como primera solución.

## Workspace no autorizado

```text
This Outline workspace is not authorized for Print Studio
```

`OUTLINE_TEAM_ID` no coincide con el team devuelto por `auth.info`. Utiliza el ID estable, no el nombre visible del workspace.

## Desde Outline abre la página inicial

El botón debe abrir:

```text
/print/document/<id>
```

No debe abrir únicamente `/print/`. Comprueba la URL final en el navegador y que el ID esté codificado con `encodeURIComponent`.

La ruta correcta se conserva durante OAuth mediante el parámetro `return`.

## No puede cargar el documento

Revisa la pestaña Network:

```text
GET /print/api/documents/<id>
```

Interpretación habitual:

- **302:** no hay sesión válida;
- **401/403:** usuario o token sin acceso;
- **404:** ID incorrecto o documento no visible;
- **502:** Print Studio no puede comunicar con Outline;
- **200 sin documento:** respuesta incompatible de la API.

Confirma que `OUTLINE_INTERNAL_URL` apunta a Outline desde la red Docker.

## Recursos 404 o página en blanco

La aplicación se construye para `/print/`. El proxy debe conservar el prefijo. Comprueba:

```bash
curl -I https://outline.example.com/print/
curl -I https://outline.example.com/print/assets/<archivo>
```

En Nginx, `proxy_pass` no debe terminar en `/` dentro de la ubicación `/print/`.

## Diferencias entre previsualización y PDF

1. Utiliza Chromium actualizado.
2. Selecciona escala 100 % en el diálogo.
3. Desactiva encabezados y pies del navegador.
4. Activa gráficos de fondo.
5. Confirma tamaño y orientación.
6. Espera a que Paged.js termine antes de imprimir.
7. Revisa que no haya extensiones que alteren estilos.

Las opciones del diálogo pueden sobreescribir `@page`.

## Tablas o código cortados

- Reduce ligeramente el tamaño de fuente o la escala de contenido.
- Comprueba márgenes y orientación.
- Usa el salto de página manual antes de un bloque indivisible.
- Evita líneas de código extremadamente largas sin wrap.
- Para tablas anchas, prueba orientación horizontal.

No apliques globalmente `break-inside: avoid` a bloques mayores que una página: impediría una paginación correcta.

## El modo visual altera un bloque avanzado

Cambia al editor Markdown para editar sintaxis de Outline o HTML avanzado. Los bloques que no pueden hacer round-trip se protegen para evitar pérdida silenciosa.

Si Markdown estándar aparece como “HTML conservado”, crea un caso de prueba mínimo con:

- texto original;
- resultado esperado;
- cercas de código;
- etiqueta o marcador que provoca el problema.

## Restablecer preferencias locales

Desde DevTools puedes borrar los datos del sitio. Esto elimina:

- preferencias;
- pestañas temporales;
- imágenes locales;
- configuración LLM local.

No elimina documentos de Outline. Para cerrar la sesión OAuth correctamente utiliza la acción de logout antes de borrar cookies.

## Recopilar información para una incidencia

Incluye:

- versión/tag de Print Studio;
- navegador y sistema;
- modo visual o Markdown;
- plantilla y ajustes avanzados;
- tamaño/orientación;
- pasos reproducibles;
- Markdown mínimo anonimizado;
- códigos HTTP relevantes;
- logs sin secretos.
