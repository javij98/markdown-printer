# Versionado y releases

Print Studio utiliza Semantic Versioning y tags Git anotados. El objetivo es que código, manifiestos, tag, imagen Docker y documentación identifiquen inequívocamente el mismo artefacto.

## Formato

| Tipo | Ejemplo | Uso |
| --- | --- | --- |
| Estable | `v0.7.0` | Versión validada para despliegue. |
| Release candidate | `v0.8.0-rc.1` | Prueba integrada previa a la estable. |
| Imagen | `outline-print-studio:0.7.0` | Mismo número, sin prefijo `v`. |

## Cuándo incrementar

- **MAJOR:** cambio incompatible en rutas, OAuth, formato persistido o despliegue.
- **MINOR:** nueva función compatible, editor, plantilla o capacidad de impresión.
- **PATCH:** corrección compatible, ajuste visual o documentación operativa.

Mientras el proyecto permanezca en `0.x`, una minor puede incluir cambios sustanciales; aun así deben documentarse claramente.

## Checklist previa

- [ ] El árbol de trabajo está limpio.
- [ ] La rama de release parte de `main`.
- [ ] No hay secretos ni artefactos `.tar.gz`.
- [ ] Los dos `package.json` tienen la misma versión.
- [ ] `CHANGELOG.md` describe los cambios.
- [ ] README y documentación no enlazan versiones antiguas.
- [ ] Tests y build pasan.
- [ ] Se ha probado OAuth con un documento real.
- [ ] Se han revisado las cuatro plantillas y la impresión A4.
- [ ] Se ha comprobado el diseño responsive.

## Preparar una versión

Ejemplo para `0.7.1`:

```bash
git switch main
git pull --ff-only origin main
git switch -c release/0.7.1
```

Actualiza:

```json
// package.json y server/package.json
"version": "0.7.1"
```

Mueve los cambios desde `Unreleased` a una sección fechada de `CHANGELOG.md`.

Valida:

```bash
git diff --check
pnpm test
pnpm build
docker build --pull -t outline-print-studio:0.7.1 .
```

Prueba la imagen, no solo el servidor Vite.

## Integrar y etiquetar

```bash
git add package.json server/package.json CHANGELOG.md
git commit -m "chore: release version 0.7.1"
git switch main
git merge --no-ff release/0.7.1 -m "merge: release 0.7.1"
git tag -a v0.7.1 -m "Print Studio v0.7.1"
```

Comprueba el tag:

```bash
git show --no-patch v0.7.1
git status --short --branch
```

## Publicar en el fork

```bash
git push origin main
git push origin v0.7.1
```

No uses `git push --tags`: podría publicar tags locales de pruebas. Sube únicamente el tag revisado.

Crear una GitHub Release es opcional, pero recomendable si se distribuyen binarios o imágenes:

```bash
gh release create v0.7.1 \
  --repo javij98/markdown-printer \
  --title "Print Studio v0.7.1" \
  --notes-file RELEASE_NOTES.md
```

## Empaquetar la imagen

```bash
docker save outline-print-studio:0.7.1 \
  | gzip > outline-print-studio-0.7.1-linux-amd64.tar.gz

sha256sum outline-print-studio-0.7.1-linux-amd64.tar.gz \
  > outline-print-studio-0.7.1-linux-amd64.tar.gz.sha256
```

Verifica el checksum antes de transferir y después de recibir.

## Release candidates

Utiliza RC cuando el cambio afecta OAuth, renderizado, Milkdown o impresión:

```bash
git tag -a v0.8.0-rc.1 -m "Print Studio v0.8.0-rc.1"
git push origin v0.8.0-rc.1
```

No reemplaces un RC publicado. Crea `rc.2`, `rc.3`, etc.

## Tags inmutables

Un tag publicado representa un estado inmutable. Si se descubre un error:

1. corrige en un commit nuevo;
2. aumenta la versión;
3. crea otro tag;
4. construye otra imagen.

No muevas ni fuerces un tag que ya pueda estar desplegado.

## Rollback de release

Un rollback operativo utiliza la imagen anterior; no reescribe Git:

```bash
# En Compose, vuelve a:
image: outline-print-studio:0.7.0
```

Después recrea solo Print Studio y valida OAuth. Documenta la incidencia en `CHANGELOG.md` para la siguiente corrección.
