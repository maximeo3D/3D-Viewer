@echo off
echo Starting 3D Viewer Server...
echo.
echo This will start a local server (auto-picks a free port starting at 9000)
echo Once started, check the terminal output for the exact port (e.g., http://localhost:9000)
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

powershell -ExecutionPolicy Bypass -File "%SERVER_PS1%" -Port 9000 -AutoFindPort
pause
