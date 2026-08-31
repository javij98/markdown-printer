# Seguridad

## Versiones soportadas

| Versión | Soporte |
| --- | --- |
| 0.7.x | Sí |
| 0.6.0-rc.x | Solo referencia |
| Anteriores | No |

## Comunicar una vulnerabilidad

No abras una incidencia pública para:

- exposición de tokens o secretos;
- bypass de `OUTLINE_TEAM_ID`;
- acceso no autorizado a documentos;
- fallos OAuth, CSRF o de sesión;
- inyección de HTML/script;
- filtración de contenido privado.

Utiliza **Report a vulnerability** en la pestaña Security del repositorio si está disponible. Si no lo está, contacta de forma privada con el propietario del repositorio antes de publicar detalles.

Incluye:

- versión o commit;
- impacto;
- pasos mínimos de reproducción;
- configuración relevante anonimizada;
- propuesta de mitigación, si existe.

No incluyas tokens reales, client secrets, cookies ni documentos privados.

## Modelo de seguridad

- OAuth solicita scope `read`.
- El workspace se valida con `OUTLINE_TEAM_ID`.
- Access y refresh tokens viven únicamente en Redis.
- La cookie contiene un identificador aleatorio y es `HttpOnly`, `Secure` y `SameSite=Lax`.
- El state OAuth es aleatorio, de un solo uso y caduca en 10 minutos.
- Las sesiones caducan y la identidad se revalida.
- El backend solo expone el subconjunto necesario de `documents.info`.
- No existe escritura en Outline.

## Responsabilidades del operador

- Servir exclusivamente mediante HTTPS.
- Mantener Redis y puertos internos fuera de Internet.
- Proteger archivos de entorno y backups.
- Rotar el client secret tras una posible exposición.
- Mantener Outline, Redis, Node y la imagen base actualizados.
- No registrar cabeceras Authorization, cookies o respuestas sensibles.
- Revisar cambios del proxy que afecten a `/print`.

## Configuración LLM opcional

La aplicación puede almacenar localmente una configuración LLM para funciones auxiliares. La clave se cifra en el navegador con Web Crypto, pero continúa dependiendo de la seguridad del dispositivo y del origen web. No debe considerarse equivalente a un gestor de secretos corporativo.

Antes de usar un proveedor externo, revisa su política de datos y evita enviar documentos confidenciales sin autorización.

## Respuesta

Los informes válidos se evaluarán de forma privada. Una corrección debería publicarse como una nueva versión y tag; no se deben mover tags existentes.
