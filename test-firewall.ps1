# Test du pare-feu pour le port 8080

Write-Host "=== Test du Pare-feu Windows ===" -ForegroundColor Cyan

# Test 1: Verifier les regles pour le port 8080
Write-Host "1. Verification des regles de pare-feu..." -ForegroundColor Yellow
$firewallRules = netsh advfirewall firewall show rule name=all | Select-String -Pattern "8080"
if ($firewallRules) {
    Write-Host "   ✓ Regles trouvees pour le port 8080" -ForegroundColor Green
    $firewallRules | ForEach-Object { Write-Host "   $_" }
} else {
    Write-Host "   ✗ Aucune regle pour le port 8080" -ForegroundColor Red
    Write-Host "   Solution: Executer setup-firewall.bat en tant qu'administrateur" -ForegroundColor Yellow
}

# Test 2: Verifier le statut du pare-feu
Write-Host "2. Statut du pare-feu..." -ForegroundColor Yellow
$firewallStatus = netsh advfirewall show allprofiles state | Select-String "Actif|Inactif"
Write-Host "   $firewallStatus"

# Test 3: Tester si le port est ouvert
Write-Host "3. Test du port 8080..." -ForegroundColor Yellow
try {
    $tcpClient = New-Object System.Net.Sockets.TcpClient("127.0.0.1", 8080)
    $tcpClient.Close()
    Write-Host "   ✓ Port 8080 accessible localement" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Port 8080 non accessible localement" -ForegroundColor Red
}

Write-Host "=== Instructions ===" -ForegroundColor Cyan
Write-Host "1. Double-cliquer sur setup-firewall.bat si aucune regle trouvee" -ForegroundColor White
Write-Host "2. Tester avec votre mobile sur http://192.168.0.37:8080" -ForegroundColor White