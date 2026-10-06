# Ejecutar VisualNotes en Miranda y usarlo desde Parfait

Los modelos y el servidor funcionan en Miranda. En Parfait solo abres la página desde el navegador con Tailscale conectado. Los archivos que extraigas y los apuntes analizados mediante IA viajan a Miranda dentro de tu conexión privada.

## Primera instalación, dentro de Miranda

1. Descarga [el proyecto completo](https://github.com/josanto21/VisualNotes/archive/refs/heads/main.zip). En el Explorador de archivos, haz clic derecho sobre **VisualNotes-main.zip → Extraer todo → Extraer**. En la carpeta que se abra, entra en **VisualNotes-main**: deben aparecer los archivos `.cmd` junto con `setup-local.mjs`, `configure-tailscale.mjs` y `server.mjs`. Ejecuta los accesos directos desde esa carpeta extraída. Abrir el ZIP con doble clic y ejecutar un `.cmd` desde allí solo copia ese acceso directo a una carpeta temporal y deja fuera sus archivos necesarios.
2. Abre **Instalar-IA-gratis.cmd**. La descarga inicial es de aproximadamente 1,4 GB. Si falta Node.js, instala [Node.js LTS](https://nodejs.org/) y vuelve a abrir el archivo.
3. Abre **Conectar-Tailscale.cmd**. Comprueba Tailscale, detecta el nombre de ese equipo, prepara el acceso privado por HTTPS y escribe su URL en `.env`. Si Tailscale solicita habilitar HTTPS, abre el enlace que muestra y completa ese paso.
4. Abre **Iniciar.cmd**. Mantén la ventana abierta. Si ya había un servidor abierto de esta carpeta, ciérralo y vuelve a iniciarlo para cargar la configuración nueva.
5. En Parfait, entra en la dirección HTTPS que mostró el conector. Lleva el nombre de Miranda y termina en `:8443`.

La URL permite abrir la interfaz desde Parfait; los archivos y las operaciones con IA se procesan en Miranda. La interfaz indica qué equipo procesa los archivos. Miranda debe permanecer encendida y conectada a Tailscale.

## Verificar

En Miranda, abre http://127.0.0.1:4317/api/status. Si la instalación terminó correctamente, texto, imagen y audio aparecen configurados. Esto comprueba los archivos instalados; después prueba una clase real y revisa la respuesta.

Desde Parfait, abre la dirección HTTPS y pulsa «Ver ejemplo». Después prepara una clase con IA y prueba una imagen clara o un audio corto. El servidor procesa una solicitud de IA por vez. Las clases guardadas siguen estando en el navegador que usas; el origen HTTPS tiene su propio registro. Para traer clases guardadas en Parfait con la dirección local anterior, exporta e importa un respaldo.

## Cómo funciona la conexión

Se utiliza [Tailscale Serve](https://tailscale.com/docs/features/tailscale-serve) para reenviar HTTPS al servidor en `127.0.0.1`. El acceso depende de las reglas de tu red Tailscale. El conector utiliza el puerto HTTPS 8443 y se detiene si ya lo ocupa otro servicio o está publicado con Funnel. No cambia la configuración de otros puertos.

Si falta la autorización para Serve o HTTPS, Tailscale indica cómo habilitarla. Si aparece «Acceso denegado», vuelve a ejecutar el conector desde una sesión de Windows con permiso para configurar Tailscale. El servidor continúa escuchando únicamente en localhost; no hace falta abrirlo en la red doméstica.

Para detener VisualNotes, cierra su ventana en Miranda. Si también quieres quitar el acceso HTTPS, ejecuta en Miranda `tailscale serve --https=8443 off`. Al volver a usar el servicio, ejecuta Conectar-Tailscale.cmd e Iniciar.cmd. El servidor de VisualNotes todavía no se inicia automáticamente al arrancar Windows.

## Estado de esta entrega

El acceso mediante proxy y los rechazos de orígenes no autorizados se verificaron con solicitudes simuladas. La instalación y la inferencia real en Miranda deben comprobarse allí: este entorno de desarrollo no tiene permiso de red para conectarse directamente a ese equipo.
