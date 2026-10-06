@echo off
cd /d "%~dp0"
if not exist "%~dp0server.mjs" (
  echo Faltan los archivos del proyecto en esta carpeta.
  echo Haz clic derecho sobre VisualNotes-main.zip y elige "Extraer todo".
  echo Abre la carpeta extraida VisualNotes-main y ejecuta este archivo otra vez.
  pause
  exit /b 1
)
where node >nul 2>nul
if not errorlevel 1 (
  node server.mjs
  goto :end
)
if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" (
  "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" server.mjs
  goto :end
)
echo Abre index.html para usar VisualNotes sin servidor.
echo Para activar el servidor, instala Node.js 20 o posterior.
:end
pause
