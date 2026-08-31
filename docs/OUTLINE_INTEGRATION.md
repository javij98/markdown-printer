# Integración con Outline

Print Studio se integra con Outline mediante OAuth 2.0 y la API oficial del workspace. La integración es deliberadamente de solo lectura: Outline conserva el documento original y Print Studio crea una copia de maquetación temporal.

## Requisitos

- Una instancia de Outline accesible por HTTPS.
- Acceso administrativo para crear una aplicación OAuth.
- El identificador del workspace o team de Outline.
- Conectividad privada desde Print Studio hasta Outline y Redis.
- Un proxy que publique Print Studio en `https://<outline>/print/`.

## Modelo recomendado de URL

La configuración más sencilla y segura utiliza el mismo origen:

```text
https://outline.example.com/                  -> Outline
https://outline.example.com/print/            -> Print Studio
https://outline.example.com/print/document/:id -> documento en Print Studio
```

Esto evita problemas de CORS, simplifica OAuth y permite usar cookies `SameSite=Lax`. La aplicación está compilada con base `/print/`; cambiar ese prefijo requiere modificar Vite, Express, cookies y proxy.

## Crear la aplicación OAuth

En la administración de Outline crea una aplicación OAuth para Print Studio con:

| Campo | Valor recomendado |
| --- | --- |
| Nombre | Print Studio |
| Redirect URI | `https://outline.example.com/print/auth/callback` |
| Scope solicitado | `read` |

Guarda el client ID y el client secret en el archivo de entorno del servidor. El redirect URI debe coincidir exactamente, incluyendo protocolo, dominio y ruta.

> No incluyas el client secret en Outline frontend, en Compose público, en capturas, en Git ni en variables `VITE_*`.

## Variables

```dotenv
OUTLINE_PUBLIC_URL=https://outline.example.com
OUTLINE_INTERNAL_URL=http://outline:3000
OUTLINE_AUTHORIZATION_URL=https://outline.example.com/oauth/authorize
OUTLINE_CLIENT_ID=<client-id>
OUTLINE_CLIENT_SECRET=<client-secret>
OUTLINE_REDIRECT_URI=https://outline.example.com/print/auth/callback
OUTLINE_TEAM_ID=<team-id>
REDIS_URL=redis://outline-redis:6379
```

### URL pública frente a interna

- `OUTLINE_PUBLIC_URL` identifica la URL que utiliza el usuario.
- `OUTLINE_INTERNAL_URL` es la URL que utiliza el backend dentro de Docker.

No uses `localhost` como URL interna si Outline está en otro contenedor: dentro del contenedor, `localhost` es el propio Print Studio.

## Flujo OAuth

1. El usuario abre `/print/document/:id`.
2. Express busca la cookie `outline_print_session`.
3. Si no existe una sesión válida, redirige a `/print/auth/login`.
4. El servidor crea un state aleatorio, lo guarda 10 minutos en Redis y redirige a Outline.
5. Outline autentica al usuario y vuelve a `/print/auth/callback`.
6. Print Studio consume el state e intercambia el código en `/oauth/token`.
7. Consulta `/api/auth.info` y comprueba `OUTLINE_TEAM_ID`.
8. Guarda los tokens en Redis y entrega una cookie opaca.
9. Devuelve al usuario a la ruta original.
10. El frontend solicita `/print/api/documents/:id`.

El servidor refresca el token cuando queda menos de un minuto y revalida periódicamente el workspace.

## Abrir un documento desde Outline

La personalización de Outline debe navegar a esta ruta:

```text
/print/document/<DOCUMENT_ID>
```

Ejemplo conceptual:

```ts
const printStudioUrl =
  `/print/document/${encodeURIComponent(document.id)}`;

window.open(printStudioUrl, "_blank", "noopener,noreferrer");
```

La implementación concreta del botón **Maquetar e imprimir** pertenece al fork de Outline, no a este repositorio. Mantener una URL relativa permite que funcione detrás del mismo dominio en local y producción.

## Carga del documento

El backend consulta:

```http
POST /api/documents.info
Authorization: Bearer <access-token>
Content-Type: application/json
X-API-Version: 1

{"id":"<document-id>"}
```

Al frontend solo se devuelve el subconjunto necesario:

- id;
- title;
- text;
- url;
- collectionId;
- parentDocumentId;
- updatedAt.

El título se normaliza y se antepone como encabezado H1 al cuerpo Markdown. No se expone el token de Outline en la respuesta.

## Compatibilidad Markdown

La capa de renderizado contempla:

- encabezados, párrafos, énfasis y enlaces;
- listas ordenadas, no ordenadas y tareas;
- bloques de código y resaltado;
- tablas y tablas extendidas;
- KaTeX;
- avisos `:::info`, `:::tip`, `:::warning` y `:::success`;
- toggles de Outline;
- composiciones de imágenes;
- saltos escapados procedentes de Outline;
- saltos de página controlados.

El editor visual protege temporalmente sintaxis o HTML que no pueda transformar sin pérdida. El Markdown estándar dentro de cercas de código no debe interpretarse como HTML.

## Qué ocurre al editar

Los cambios se aplican únicamente a la copia abierta en Print Studio:

- no se llama a `documents.update`;
- no se modifica el historial de Outline;
- no se crean documentos ni adjuntos en Outline;
- cerrar la pestaña no afecta al original.

Si en el futuro se añade escritura de vuelta, debe ser una función explícita, separada, con permisos adicionales y confirmación del usuario.

## Cierre de sesión

`POST /print/auth/logout`:

1. intenta revocar access y refresh token;
2. elimina la sesión de Redis;
3. elimina la cookie bajo `/print`;
4. responde con HTTP 204.

Cerrar la sesión de Print Studio no elimina la sesión web normal de Outline.

## Verificación

Después de desplegar:

```bash
curl -fsS http://127.0.0.1:3001/health
curl -I https://outline.example.com/print/
```

La segunda petición debería redirigir al login OAuth si el navegador no tiene sesión. Completa luego estas pruebas manuales:

1. abrir un documento desde Outline;
2. autorizar Print Studio;
3. comprobar que vuelve al documento solicitado;
4. recargar y confirmar que la sesión se conserva;
5. abrir un documento sin permiso y confirmar que Outline lo rechaza;
6. cerrar sesión y comprobar que se solicita autenticación de nuevo.

## Invariantes de seguridad

- Scope OAuth mínimo: `read`.
- Un único workspace permitido mediante `OUTLINE_TEAM_ID`.
- HTTPS obligatorio en el acceso público.
- Redis sin exposición pública.
- Client secret únicamente en el servidor.
- Proxy sin cachear callbacks, API ni respuestas autenticadas.
- No registrar tokens ni cabeceras `Authorization`.
