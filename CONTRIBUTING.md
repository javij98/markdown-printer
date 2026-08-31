# Contribuir

Gracias por mejorar Print Studio. Este fork prioriza la fidelidad con Outline, la edición segura de Markdown y una salida de impresión profesional.

## Antes de empezar

- Busca incidencias o cambios similares.
- Para modificaciones grandes, describe primero el problema y la propuesta.
- No incluyas documentos privados, tokens, secretos ni URLs internas.
- Mantén los cambios de Print Studio en este repositorio y los de Outline en su fork correspondiente.

## Preparar el entorno

```bash
git clone --branch main https://github.com/javij98/markdown-printer.git
cd markdown-printer
pnpm install --frozen-lockfile
pnpm test
pnpm build
```

## Crear una rama

```bash
git switch main
git pull --ff-only origin main
git switch -c feat/descripcion-breve
```

Utiliza `fix/`, `docs/`, `refactor/` o `test/` cuando corresponda.

## Commits

Se recomienda Conventional Commits:

```text
feat: add print preset
fix: preserve fenced Markdown in visual editor
docs: document Outline OAuth flow
```

Mantén cada commit enfocado y evita mezclar reformateos masivos con cambios funcionales.

## Validación obligatoria

```bash
git diff --check
pnpm test
pnpm build
```

Para cambios visuales añade una revisión manual de:

- tema claro y oscuro;
- Markdown y editor visual;
- escritorio y móvil;
- previsualización e impresión;
- plantillas y modo avanzado.

Para cambios de integración prueba OAuth, retorno al documento solicitado y permisos del workspace.

## Pull request

Describe:

1. problema;
2. solución;
3. riesgos;
4. pruebas automáticas;
5. pruebas manuales;
6. capturas antes/después si hay interfaz;
7. efecto sobre Outline, OAuth, Markdown o impresión.

No actualices la versión ni crees tags en una pull request normal; eso pertenece al proceso de release.

## Compatibilidad

- Outline sigue siendo la fuente de verdad.
- La escritura de vuelta nunca debe aparecer como efecto secundario.
- Markdown estándar no debe romperse para soportar sintaxis especial.
- Los tokens permanecen en el servidor.
- La ruta pública continúa bajo `/print/`.
- Previsualización e impresión deben compartir las mismas reglas editoriales.

## Licencia

Al contribuir aceptas que tu trabajo se distribuya bajo la licencia Apache 2.0 del proyecto.
