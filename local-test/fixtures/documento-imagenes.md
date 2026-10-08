# Print Studio — Prueba de imágenes privadas

Este documento usa adjuntos **privados** de Outline. Sirve para comprobar PNG, JPEG, URLs relativas y absolutas, dimensiones y pies de imagen.

## PNG panorámico — URL relativa

![PNG panorámico privado](/api/attachments.redirect?id=c9478132-d4e1-4ec9-bf2f-9f246f8c8ea9 "full-width =960x240")

## JPEG horizontal — URL absoluta

![JPEG privado a la derecha](https://localhost/api/attachments.redirect?id=e2a7f97e-5061-4b4d-ada9-dbe74b07a1f8 "right-50 =640x360")

Texto de prueba junto a la imagen horizontal. El archivo está almacenado en Outline y requiere una sesión válida para obtener la URL firmada.

## PNG vertical — URL relativa

![PNG privado a la izquierda](/api/attachments.redirect?id=4e64e09c-f82d-40c2-bcca-afcaf7d2f783 "left-50 =360x480")

Texto junto a la imagen vertical para verificar que conserva su composición al maquetar e imprimir.

## PNG repetido — URL absoluta

![Mismo PNG con otra URL](https://localhost/api/attachments.redirect?id=c9478132-d4e1-4ec9-bf2f-9f246f8c8ea9)

Fin del documento de prueba. Deben aparecer cuatro imágenes en la vista previa y en el PDF. La imagen sin metadatos también se muestra en el editor visual; las composiciones de Outline se conservan como tarjetas protegidas.
