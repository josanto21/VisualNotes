@echo off
cd /d "%~dp0"
where node >nul 2>nul
if not errorlevel 1 (
  node configure-tailscale.mjs
  goto :end
)
if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" (
  "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" configure-tailscale.mjs
  goto :end
)
echo Instala Node.js 20 o posterior y vuelve a abrir este archivo.
:end
pause
