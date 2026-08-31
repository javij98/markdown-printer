# Changelog

Todos los cambios relevantes de este fork se documentan aquí. El formato se inspira en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto utiliza [Semantic Versioning](https://semver.org/lang/es/).

## [Unreleased]

### Documentation

- Documentación integral de producto, arquitectura, Outline, desarrollo, despliegue, releases, seguridad y solución de problemas.
- Archivo de entorno comentado y criterios operativos para Docker, proxy, Redis y OAuth.

## [0.7.0] - 2026-08-31

### Added

- Rediseño integral y responsive de la interfaz.
- Editor visual basado en Milkdown/Crepe junto al editor Markdown.
- Plantillas Outline, Académico, Informe y Minimalista.
- Panel avanzado con ajustes editoriales de color, ritmo, código, tablas, enlaces, alineación e hifenado.
- Grupo de alineación de texto equivalente a un procesador de textos.
- Temas coherentes claro y oscuro para los editores y bloques de código.
- Carga directa de documentos desde `/print/document/:id`.
- Estado de carga dedicado al abrir documentos desde Outline.
- Protección reversible de bloques avanzados de Outline en el editor visual.

### Changed

- Barra superior, botones, menús, selectores, paneles, estados vacíos y mensajes modernizados.
- Mayor fidelidad entre contenido de Outline, previsualización y salida impresa.
- Mejor contraste de texto y números de línea en modo claro.
- Las plantillas inicializan los valores del modo avanzado.
- El mensaje de protección de Outline puede cerrarse.

### Fixed

- Apertura del documento correcto después del flujo OAuth.
- Selector de tamaño de fuente truncado.
- Filas alternas de tablas en los ajustes avanzados.
- Márgenes y paginación con interlineado modificado.
- Colores arbitrarios en bloques de código.
- Falsos positivos de HTML con marcadores como `<versión>`.
- Detección de cercas Markdown con backticks y `~~~`.
- Normalización de saltos `\n` procedentes de Outline.

## [0.6.0-rc.5] - 2026-08-27

- Corrección de la carga de documentos de Outline en el editor visual.

## [0.6.0-rc.4] - 2026-08-27

- Sincronización de la configuración avanzada con las plantillas.

## [0.6.0-rc.3] - 2026-08-27

- Conservación de layouts de impresión al usar estilos avanzados.

## [0.6.0-rc.2] - 2026-08-27

- Refinamiento del editor visual y de los estilos profesionales.

## [0.6.0-rc.1] - 2026-08-27

- Primera integración del editor Milkdown orientado a impresión.

[Unreleased]: https://github.com/javij98/markdown-printer/compare/v0.7.0...main
[0.7.0]: https://github.com/javij98/markdown-printer/tree/v0.7.0
[0.6.0-rc.5]: https://github.com/javij98/markdown-printer/tree/v0.6.0-rc.5
[0.6.0-rc.4]: https://github.com/javij98/markdown-printer/tree/v0.6.0-rc.4
[0.6.0-rc.3]: https://github.com/javij98/markdown-printer/tree/v0.6.0-rc.3
[0.6.0-rc.2]: https://github.com/javij98/markdown-printer/tree/v0.6.0-rc.2
[0.6.0-rc.1]: https://github.com/javij98/markdown-printer/tree/v0.6.0-rc.1
