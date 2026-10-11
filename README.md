# VisualNotes · Prototipo

Prototipo educativo para convertir apuntes en material de repaso: ideas, mapas editables, pasos, fechas, tablas y fórmulas. El modo básico usa reglas; no es inteligencia artificial y sus resultados deben revisarse.

## Probar el prototipo

1. Descarga el repositorio con **Code → Download ZIP**.
2. Extrae toda la carpeta ZIP antes de abrir los archivos.
3. En Windows abre **Iniciar.cmd** y utiliza la página que se abre en tu navegador. Requiere Node.js 20 o posterior. También puedes abrir `index.html` directamente en un navegador que permita ejecutar archivos locales.
4. Pulsa **Preparar mi material**.

Consulta [la guía de uso completa](COMO-USAR.md) para editar, guardar y compartir clases.

## Alcance del prototipo

- Disponible sin servidor: texto pegado, archivos TXT/MD, ejemplos, organización básica, edición, guardado en el navegador y exportación.
- Experimental: análisis con IA, extracción de imágenes y transcripción de audio. Requieren un servidor y configuración adicional; no se garantizan en esta entrega.
- GitHub almacena el código. Subir este repositorio no inicia el servidor ni los modelos. GitHub Pages solo puede servir la parte estática.
- El apartado de instrucciones de activación de IA fue retirado de la interfaz.
- No incluye PDF, grabación desde el micrófono, cuentas ni colaboración.

## Desarrollo

Con Node.js 20 o posterior:

```sh
npm start
npm test
npm run build
```

`npm start` abre el servidor en http://127.0.0.1:4318; entra en esa dirección con tu navegador. El arranque del prototipo utiliza siempre el modo básico. La integración experimental se inicia por separado con `npm run start:experimental`. En Windows también puedes ejecutar `Iniciar.cmd`.

Ejecuta `npm run build` después de cambiar la interfaz para actualizar el HTML exportable.

La integración experimental se conserva en `server.mjs`, `local-ai.mjs`, `media.mjs` y `setup-local.mjs`. Las guías técnicas anteriores de IA y Tailscale describen esa integración, no requisitos para probar el prototipo básico.

## Privacidad y límites

El modo básico procesa el texto en el navegador. Las clases guardadas dependen de ese navegador y pueden perderse al borrar sus datos: descarga respaldos. Un HTML exportado contiene los apuntes y el material de la clase; revísalo antes de compartirlo.

No publiques `.env`, claves API, modelos descargados, herramientas locales ni archivos de tus clases. `.gitignore` excluye los recursos privados de ejecución.

La validación automática de estructura y referencias no garantiza la exactitud académica. El mapa básico muestra coincidencias de términos, no relaciones causales verificadas.

El editor SVG proviene del prototipo VisualNotes v0.3 del Grupo 4.
