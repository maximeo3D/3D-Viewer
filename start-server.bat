@echo off
echo Starting 3D Viewer Server...
echo.
echo This will start a local server on http://localhost:8080
echo Open your browser and navigate to: http://localhost:8080
echo.
echo Press Ctrl+C to stop the server when you're done.
echo.
powershell -ExecutionPolicy Bypass -File "serve.ps1"
pause
