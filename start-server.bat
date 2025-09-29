@echo off
echo Starting 3D Viewer Server...
echo.
echo This will start a local server on http://localhost:8080
echo Open your browser and navigate to: http://localhost:8080
echo.
echo Press Ctrl+C to stop the server when you're done.
echo.

REM Use the absolute path of this script's directory to locate serve.ps1
set "SCRIPT_DIR=%~dp0"
set "SERVER_PS1=%SCRIPT_DIR%serve.ps1"

if not exist "%SERVER_PS1%" (
  echo Error: serve.ps1 not found at "%SERVER_PS1%"
  echo Make sure start-server.bat is in the same folder as serve.ps1.
  pause
  exit /b 1
)

powershell -ExecutionPolicy Bypass -File "%SERVER_PS1%"
pause
