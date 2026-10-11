# Cómo utilizar VisualNotes

## 1. Abrir el prototipo

Descarga el ZIP desde GitHub y extrae **todo** su contenido. En Windows, con Node.js 20 o posterior, abre **Iniciar.cmd**: inicia el prototipo básico y abre http://127.0.0.1:4318 en tu navegador. Mantén la consola abierta mientras lo utilizas. Para detenerlo pulsa Ctrl+C. También puedes abrir `index.html` directamente en un navegador que admita archivos locales. Mantén los archivos JavaScript y CSS junto al HTML. No necesitas instalar modelos ni introducir claves para usar el modo básico.

## 2. Añadir apuntes

- Pega el contenido en el cuadro de texto.
- O pulsa **Abrir un archivo de texto** para seleccionar un TXT o MD.
- Para explorar sin tus propios apuntes, elige un tema y pulsa **Ver ejemplo**.

Se admiten hasta 60.000 caracteres. Las opciones Imagen y Audio son experimentales: la extracción necesita un servidor configurado y no funciona en el HTML independiente.

## 3. Preparar el material

Elige tu objetivo y pulsa **Preparar mi material**. En **Personalizar (opcional)** puedes indicar el nombre de la clase, asignatura, nivel de detalle y cantidad de ideas. Usa **Básico · sin IA** para probar sin configuración adicional.

## 4. Revisar y editar

Explora las vistas de ideas, pasos, fechas, tablas, fórmulas y mapa según el contenido detectado. Consulta los fragmentos de origen y corrige los resultados. El modo básico reconoce patrones del texto; no comprende ni verifica la materia. Puedes editar el mapa y utilizar deshacer y rehacer.

## 5. Guardar y compartir

- Guarda la clase para recuperarla en **Clases guardadas** en el mismo navegador.
- **Descargar clase completa** genera un HTML portátil que permite revisar, editar y volver a exportar sin conexión.
- **Descargar respaldo** conserva las clases en JSON.
- **Abrir clase o respaldo** recupera un HTML exportado o un respaldo compatible.
- La exportación PNG contiene solo el mapa.

Después de editar una clase portátil, vuelve a descargarla para conservar los cambios en un archivo. No dependas únicamente del guardado del navegador. El archivo exportado contiene tus apuntes: compártelo solo con quien deba verlos.

## Problemas frecuentes

**La página no tiene diseño o no responde:** extrae todo el ZIP y conserva los archivos juntos; no abras el HTML dentro del archivo comprimido. Cierra las pestañas anteriores y abre **Iniciar.cmd**. Utiliza la dirección http://127.0.0.1:4318; recarga con Ctrl+F5 si conservabas una versión anterior.

**No aparecen fechas, tablas o fórmulas:** esas vistas dependen del contenido explícito de los apuntes. Prueba uno de los ejemplos.

**Imagen, audio o IA no funcionan:** no son funciones autónomas de esta entrega. Tener los modelos descargados o el código en GitHub no significa que un servidor esté funcionando. Puedes usar texto y el modo básico.

**No encuentro mis clases:** comprueba que uses el mismo navegador y ubicación de la aplicación. Importa tu respaldo si cambiaste de equipo o borraste los datos del navegador.

## Estado de la entrega

Este proyecto es un prototipo para demostración y evaluación. La publicación en GitHub no incluye alojamiento de IA ni garantiza la precisión del material generado.
