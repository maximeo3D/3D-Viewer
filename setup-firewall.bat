@echo off
echo Configuration du pare-feu Windows pour le serveur 3D Viewer...
echo.

REM Vérifier si on est administrateur
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
if '%errorlevel%' NEQ '0' (
    echo Demande des privilèges administrateur...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo Configuration de la règle de pare-feu...
netsh advfirewall firewall add rule name="3D Viewer Server - HTTP" dir=in action=allow protocol=TCP localport=9001 enable=yes
if %errorlevel% EQU 0 (
    echo ✓ Règle ajoutée avec succès pour le port 9001
) else (
    echo ✗ Erreur lors de l'ajout de la règle
)

echo.
echo Vérification de la règle...
netsh advfirewall firewall show rule name="3D Viewer Server - HTTP"
echo.
echo Configuration terminée. Vous pouvez maintenant utiliser votre mobile.
pause
