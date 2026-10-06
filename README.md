# VisualNotes · v0.8.1

Convierte apuntes universitarios en material para estudiar: tarjetas, mapas editables, fechas, procedimientos, tablas y fórmulas. Cada elemento permite consultar el fragmento que lo respalda. Puedes ajustar el objetivo y el detalle, deshacer/rehacer, guardar clases e importar respaldos.

## Empezar

1. Descarga el proyecto y descomprime la carpeta.
2. Abre **Iniciar.cmd** y entra en http://127.0.0.1:4317. Mantén la ventana del servidor abierta.
3. Pega una clase o pulsa **Ver ejemplo**. El modo básico funciona sin descargar modelos.
4. Para activar la IA gratuita, abre **Instalar-IA-gratis.cmd**. Descarga aproximadamente 1,4 GB la primera vez. Requiere Windows de 64 bits, conexión y Node.js 20 o posterior; también reconoce el runtime incluido con Codex.
5. Al terminar, abre la aplicación y pulsa **Comprobar instalación** en «Activar la IA gratis». Revisa el texto extraído de imágenes y audio antes de preparar el material.

No se requieren claves de API para la opción local. Los modelos, las herramientas y la configuración se guardan en esta carpeta, fuera del control de versiones. Tras la instalación, las clases se procesan en tu equipo. La IA de texto usa CPU y se apaga tras un minuto sin uso.

## Qué utiliza la IA local

Para ejecutar los modelos en otra computadora y abrir la interfaz desde la tuya, consulta [MIRANDA.md](MIRANDA.md). El acceso directo **Conectar-Tailscale.cmd** configura HTTPS privado con Tailscale Serve en el equipo que ejecuta los modelos.

| Entrada | Herramienta | Alcance |
| --- | --- | --- |
| Texto | [Qwen2.5 1.5B Instruct GGUF](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF), mediante [llama.cpp](https://github.com/ggml-org/llama.cpp) | Organiza fragmentos en una respuesta estructurada que el servidor valida. |
| Imagen | [Tesseract.js](https://github.com/naptha/tesseract.js), español e inglés | Extrae letras impresas; no interpreta automáticamente circuitos, dibujos ni fórmulas manuscritas. |
| Audio | [Whisper base](https://github.com/ggml-org/whisper.cpp) y FFmpeg | Transcribe voz para revisar antes del análisis. |

La IA ligera admite 12.000 caracteres para organizar una clase. Las imágenes admiten PNG/JPG/WEBP hasta 8 MB; el audio, hasta 24 MB y 20 minutos. Se procesa una solicitud de IA a la vez para limitar la memoria. No hay garantía de exactitud: revisa las fuentes y las interpretaciones. La presencia de una cita valida su existencia, no la corrección de la conclusión.

**Estado de verificación:** las rutas locales, la validación, los errores y el instalador se probaron con respuestas y archivos simulados. Los modelos reales todavía no se descargaron ni se ejecutaron en este entorno, cuya salida de red está restringida. La comprobación de instalación confirma archivos presentes; la primera clase real sigue siendo necesaria para comprobar inferencia y precisión.

## Exportar y compartir

**Descargar clase completa** crea un HTML que abre sin conexión e incluye lo generado, el texto original, sus fuentes, ajustes, ediciones e historial. Las imágenes y audios originales no se incluyen; sí su texto extraído y el nombre del archivo. El HTML portátil permite seguir editando y volver a exportar. No ejecuta modelos de IA ni un servidor dentro del archivo.

El guardado del navegador conserva hasta 30 clases. Para trasladarlas o conservar cambios, descarga otra vez la clase o un respaldo JSON. Importar un HTML o JSON recupera los datos sin ejecutar sus scripts. El PNG exporta solo el mapa.

Para compartir el proyecto completo, consulta [COMPARTIR-PROYECTO.md](COMPARTIR-PROYECTO.md). Cada equipo instala sus modelos una vez; GitHub contiene el código y las instrucciones. Este servidor es para uso local, no un despliegue público multiusuario.

## Desarrollo

Con Node.js 20 o posterior, sin dependencias obligatorias:

```sh
npm start
npm test
npm run build
```

Ejecuta el build tras cambiar la interfaz para actualizar los recursos que usa la exportación autónoma. La configuración privada va en `.env`; las variables de entorno tienen prioridad. El proveedor predeterminado es local sin clave. Puedes fijar `AI_PROVIDER=local` explícitamente. La alternativa de pago exige `AI_PROVIDER=openai` y configuración propia: [ACTIVAR-IA.md](ACTIVAR-IA.md).

## Estructura

- `engine.js`: fragmentos con posiciones, análisis básico, validación del modelo académico y adaptación al mapa.
- `app.js`: interfaz, editor, entradas, historial y guardado.
- `index.html` y CSS: interfaz y vistas accesibles.
- `server.mjs`: servidor local, límites y selección del proveedor.
- `local-ai.mjs`: ejecución de Qwen, OCR y Whisper en el equipo.
- `setup-local.mjs`: descarga e instalación, con comprobación de los paquetes principales.
- `media.mjs`: validación de archivos y proveedor opcional de nube.
- `portable.js`, `build-portable.mjs`: exportación e importación autónomas.
- `tests/`: pruebas de análisis, fuentes, rutas, errores, exportación e instalación.

El editor SVG proviene del prototipo VisualNotes v0.3 del Grupo 4. El análisis y las ediciones del mapa se guardan por separado para conservar el material original. El registro admite clases de versiones anteriores. El modo básico usa reglas para listas, años, tablas y fórmulas explícitas; sus relaciones indican coincidencia en el texto.

## Pendiente

Probar clases reales de distintas asignaturas y medir precisión y tiempos de la IA local. PDF, micrófono, reconstrucción de circuitos, resolución matemática, cuentas y colaboración todavía no están implementados. Antes de un despliegue compartido hace falta diseñar autenticación, cuotas y almacenamiento.
