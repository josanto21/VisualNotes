# Alternativa opcional: IA de OpenAI

La opción predeterminada gratuita se instala con **Instalar-IA-gratis.cmd**; consulta README.md. Usa esta guía solo si prefieres el proveedor de pago. Fija `AI_PROVIDER=openai` en `.env` además de las variables siguientes.

La interfaz y la conexión están implementadas. Para usar la IA real necesitas una clave de la API de OpenAI con facturación habilitada. Las llamadas pueden generar costos.

1. Copia `.env.example` y renombra la copia como `.env`, dentro de esta carpeta. En Windows comprueba que no se llame `.env.txt`.
2. Abre `.env` en un editor de texto. Añade tu clave después de `OPENAI_API_KEY=`. No compartas este archivo ni pegues la clave en el chat.
3. En `OPENAI_MODEL=` escribe un modelo disponible en tu cuenta que admita Responses y Structured Outputs. Para leer imágenes debe admitir visión; puedes elegir otro modelo compatible en `OPENAI_VISION_MODEL=`.
4. Para audio se propone `gpt-4o-mini-transcribe`. Puedes configurar otro modelo de transcripción que admita respuesta JSON. Esta versión no admite configuración de diarización.
5. Guarda, cierra el servidor anterior y vuelve a abrir `Iniciar.cmd`. Entra en http://127.0.0.1:4317/?v=0.8. La aplicación mostrará «IA disponible». Esto indica que hay configuración; el proveedor comprueba la clave y los modelos al realizar una llamada.

Si ya configuraste variables de entorno, esas tienen prioridad sobre `.env`. No necesitas instalar paquetes adicionales. La clave permanece en el servidor local; los archivos de clase exportados y los respaldos no la incluyen.

## Usar tus archivos

- **Texto:** pega apuntes o abre un TXT/MD. Con la IA configurada, se selecciona «Con IA» al iniciar. Puedes volver al modo básico en Personalizar.
- **Imagen:** selecciona PNG, JPG o WEBP, hasta 8 MB, y pulsa Extraer texto. Puedes sumar imágenes una por una.
- **Audio:** selecciona MP3, WAV, M4A, MP4, WEBM, MPEG o MPGA, hasta 24 MB, y pulsa Transcribir audio. Para grabaciones más grandes utiliza archivos más cortos. La versión actual trabaja con archivos grabados; no graba desde el micrófono.
- **Revisa:** el texto aparece en el área de apuntes. Puedes corregirlo, sumarlo a lo anterior o elegir reemplazar antes de extraer. Después pulsa Preparar mi material.
- **Guarda o descarga:** se conserva el texto revisado, el texto inicialmente extraído y el nombre del archivo. El audio o la imagen original no se guarda dentro de la clase: conserva ese archivo aparte. Los fragmentos citados son posiciones dentro del texto revisado, sin marcas de tiempo ni coordenadas en la imagen.

Los archivos se procesan en memoria en el servidor local y se envían a OpenAI cuando pulsas extraer/transcribir. No se escriben en disco por el servidor. Para Responses se solicita `store: false`; esto no garantiza retención cero por parte del proveedor. Las extracciones pueden contener errores: revisa especialmente fórmulas, nombres, cifras y texto manuscrito.

Los HTML portátiles permiten revisar, editar, guardar y volver a exportar sin conexión. Para extraer archivos nuevos con IA abre la aplicación con el servidor local.

Documentación utilizada: [imágenes y visión](https://developers.openai.com/api/docs/guides/images-vision), [transcripción de audio](https://developers.openai.com/api/docs/guides/speech-to-text) y [API de transcripciones](https://developers.openai.com/api/reference/resources/audio/subresources/transcriptions/methods/create).

La integración se verifica con respuestas simuladas. Todavía debe probarse con una clave real y archivos de tus clases.
