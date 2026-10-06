# Compartir VisualNotes

## GitHub y modelos locales

El repositorio contiene el código, las pruebas y el instalador. No incluye los modelos descargados ni configuraciones privadas, clases personales o archivos temporales.

En otro equipo: descarga el repositorio, abre Instalar-IA-gratis.cmd una vez y luego Iniciar.cmd. Los modelos se instalan dentro de la carpeta del proyecto. El instalador actual está preparado para Windows de 64 bits.

## Exportaciones

Una clase completa se comparte con «Descargar clase completa». El HTML funciona sin conexión y permite editar, pero las nuevas llamadas a IA requieren abrir la aplicación local con los modelos instalados. Para mover varias clases, exporta e importa un respaldo JSON.

Para mover el código, utiliza el ZIP del repositorio o Git. No publiques .env, models/, .tools/ ni .local-work/. El .gitignore excluye estas rutas. Si trasladas modelos ya instalados, conserva también sus licencias; pueden ocupar varios GB por los archivos de instalación.

GitHub Pages sirve archivos estáticos: puede mostrar el modo básico, pero no ejecutar el servidor Node ni los modelos locales. Publicar la IA para varios usuarios requiere otro diseño de alojamiento.
