# Desarrollo

## Requisitos

- Node.js 22.
- pnpm 10.
- Git.
- Docker para validar la imagen final.
- Una instancia de Outline y Redis para pruebas end-to-end.

## Preparación

```bash
git clone --branch main https://github.com/javij98/markdown-printer.git
cd markdown-printer
pnpm install --frozen-lockfile
```

## Comandos

| Comando | Acción |
| --- | --- |
| `pnpm dev --host 0.0.0.0` | Inicia Vite para trabajo de frontend. |
| `pnpm test` | Ejecuta Vitest una vez. |
| `pnpm test:watch` | Ejecuta tests en modo observación. |
| `pnpm build` | Comprueba tipos y genera `dist/`. |
| `pnpm preview` | Sirve el build de Vite para revisión visual. |

La URL base es `http://localhost:5173/print/`. Vite no ejecuta el servidor OAuth; las rutas de API solo están disponibles en el runtime Express.

## Servidor completo sin Docker

Para una integración local completa:

```bash
pnpm build
npm --prefix server install
set -a
. ./.env.print
set +a
node server/server.mjs
```

Esto requiere Redis y una instancia de Outline accesibles con las URLs del entorno. Como la cookie se crea con `Secure`, el flujo real debe probarse detrás de HTTPS. Para desarrollo integrado suele resultar más fiel usar Docker y el mismo proxy local que Outline.

## Estructura

```text
.
├── server/
│   └── server.mjs              OAuth, sesiones, API y frontend estático
├── src/
│   ├── components/             interfaz, editores y controles
│   ├── composables/            estado, Markdown, paginación y PDF
│   ├── editor/                 temas de CodeMirror
│   ├── markdown/               compatibilidad específica de Outline
│   ├── services/               integración LLM opcional
│   ├── styles/                 interfaz, contenido y presets
│   └── utils/                  tipos, almacenamiento y carga de Outline
├── docs/                       documentación operativa y técnica
├── Dockerfile                  build multi-stage
└── vite.config.ts              base /print y división de bundles
```

## Flujo de ramas

- `main`: versión estable publicable del fork.
- `feat/<nombre>`: funciones aisladas.
- `fix/<nombre>`: correcciones.
- Tags `vX.Y.Z`: releases estables.
- Tags `vX.Y.Z-rc.N`: candidatos de prueba.

Mantén los cambios de Outline en su propio repositorio. Print Studio debe adaptarse en este proyecto siempre que sea posible.

## Áreas de prueba

### Markdown

Al cambiar el parser, añade casos para:

- Markdown estándar;
- sintaxis Outline;
- bloques de código que contienen `<marcadores>`;
- saltos `\n` escapados;
- avisos, toggles e imágenes;
- documentos con cercas de backticks y `~~~`.

### Editores

Verifica el round-trip:

1. abrir Markdown;
2. cambiar al editor visual;
3. editar;
4. volver a Markdown;
5. confirmar que los bloques protegidos y el contenido se conservan.

### Impresión

Revisa al menos:

- A4 vertical y horizontal;
- márgenes pequeños y amplios;
- las cuatro plantillas;
- ajustes avanzados activados;
- tablas largas;
- bloques de código multilínea;
- imágenes;
- saltos de página;
- claro y oscuro en los editores.

### Responsive

Prueba anchuras de móvil, tablet y escritorio. Los mensajes y paneles no deben ocultar el área de edición ni impedir imprimir.

## Criterios de calidad

Antes de un commit:

```bash
git diff --check
pnpm test
pnpm build
```

Además:

- no incluyas secretos ni archivos `.env`;
- evita dependencias nuevas si CSS o utilidades existentes resuelven el caso;
- preserva los cambios locales del fork;
- separa los estilos de aplicación de los de impresión;
- documenta nuevas variables, rutas o decisiones operativas;
- no cambies la base `/print/` de forma parcial.

## Añadir una plantilla

1. Amplía `PrintPreset` en `src/utils/types.ts`.
2. Añade nombre y descripción en `PRINT_PRESETS`.
3. Define todos los valores avanzados en `ADVANCED_PRINT_STYLE_BY_PRESET`.
4. Añade las reglas visuales necesarias en `print-presets.css`.
5. Comprueba previsualización y documento impreso.
6. Añade o actualiza tests de `printStyle`.
7. Documenta el propósito editorial de la plantilla.

Una plantilla debe cambiar un conjunto coherente de tipografía, color, espaciado y elementos; no debe limitarse al color de los títulos.

## Dependencias y bundle

El bundle separa Vue/PrimeVue, CodeMirror y Markdown en chunks. Antes de añadir una dependencia grande, comprueba:

- tamaño comprimido;
- si se carga en el flujo inicial;
- compatibilidad con Vue 3 y TypeScript;
- licencia;
- mantenimiento activo;
- comportamiento dentro del documento de impresión aislado.
