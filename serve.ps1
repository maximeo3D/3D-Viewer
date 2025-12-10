# PowerShell HTTP Server for 3D Viewer
# This server handles POST requests to directly overwrite studio.json

param(
    [int]$Port = 8080,
    [switch]$AutoFindPort = $false
)

# Resolve a locale-safe account name for URLACL (works on FR/EN Windows)
function Get-UrlAclUser {
    param()
    try {
        $sid = New-Object System.Security.Principal.SecurityIdentifier("S-1-1-0") # Everyone
        return $sid.Translate([System.Security.Principal.NTAccount]).Value
    } catch {
        return "BUILTIN\Users"
    }
}

# Function to check if a port is available
function Test-PortAvailable {
    param([int]$PortToTest)
    try {
        $connection = Get-NetTCPConnection -LocalPort $PortToTest -ErrorAction SilentlyContinue
        return -not $connection
    } catch {
        # If we can't check, assume it's available and let the listener try
        return $true
    }
}

# Function to find an available port starting from the requested port
function Find-AvailablePort {
    param([int]$StartPort)
    $currentPort = $StartPort
    $maxAttempts = 100
    $attempts = 0
    
    while ($attempts -lt $maxAttempts) {
        if (Test-PortAvailable -PortToTest $currentPort) {
            return $currentPort
        }
        $currentPort++
        $attempts++
    }
    
    return $null
}

# If AutoFindPort is enabled, we will increment ports on conflict.
# Otherwise, validate the requested port is free.
if ($AutoFindPort) {
    Write-Host "AutoFindPort enabled. Will start at $Port and increment if busy." -ForegroundColor Yellow
} elseif (-not (Test-PortAvailable -PortToTest $Port)) {
    Write-Host "Error: Port $Port is not available. Run with -AutoFindPort or choose another port." -ForegroundColor Red
    exit 1
}

# Set up graceful shutdown handling
$global:shutdownRequested = $false
$null = Register-EngineEvent PowerShell.Exiting -Action { $global:shutdownRequested = $true }

# Try to start the listener, with automatic port retry if needed
$maxRetries = 5
$retryCount = 0
$started = $false
$listener = $null

while (-not $started -and $retryCount -lt $maxRetries) {
    try {
        # Clean up previous listener if retrying
        if ($listener -ne $null) {
            try {
                if ($listener.IsListening) {
                    $listener.Stop()
                }
            } catch {
                # Ignore cleanup errors
            }
            $listener = $null
        }
        
        # Create HTTP listener
        $listener = New-Object System.Net.HttpListener
        
        # Clean old URLACLs then bind to localhost and all hosts on the given port
        try {
            $urlAclUser = Get-UrlAclUser
            $null = netsh http delete urlacl url="http://localhost:$Port/" 2>$null
            $null = netsh http delete urlacl url="http://+:$Port/" 2>$null
            $aclCmd = "netsh http add urlacl url=http://localhost:$Port/ user=""$urlAclUser"""
            Invoke-Expression $aclCmd 2>$null
            $aclCmd2 = "netsh http add urlacl url=http://+:$Port/ user=""$urlAclUser"""
            Invoke-Expression $aclCmd2 2>$null
        } catch {
            # Ignore URLACL errors - may already exist or already granted
        }
        
        $listener.Prefixes.Add("http://localhost:$Port/")
        $listener.Prefixes.Add("http://+:$Port/")
        $listener.Start()
        $started = $true
        
        # Get local IP addresses for display
        $ipAddresses = [System.Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces() | 
            Where-Object { $_.OperationalStatus -eq 'Up' -and $_.NetworkInterfaceType -ne 'Loopback' } | 
            ForEach-Object { $_.GetIPProperties().UnicastAddresses } | 
            Where-Object { $_.Address.AddressFamily -eq 'InterNetwork' } | 
            ForEach-Object { $_.Address }
        
        Write-Host "3D Viewer Server started successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Listening on http://+:$Port/"
        Write-Host "Local access: http://localhost:$Port"
        foreach ($ip in $ipAddresses) {
            Write-Host "Network access: http://$($ip):$Port"
        }
        Write-Host ""
        Write-Host "If mobile devices cannot connect, check:" -ForegroundColor Yellow
        Write-Host "1. Windows Firewall - Allow port $Port for Python/PowerShell" -ForegroundColor Yellow
        Write-Host "2. Run PowerShell as Administrator for URLACL permissions" -ForegroundColor Yellow
        Write-Host "3. Ensure mobile device is on the same network" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Press Ctrl+C to stop the server"
    } catch {
        $ex = $_.Exception
        $errorMsg = $ex.Message
        if ($ex.InnerException) {
            $errorMsg += " " + $ex.InnerException.Message
        }
        
        # Check for common "port in use" error messages (English and French)
        $portInUse = $AutoFindPort
        if (-not $portInUse) {
            if ($errorMsg -like "*fichier est utilisé*" -or 
                $errorMsg -like "*already in use*" -or 
                $errorMsg -like "*Access is denied*" -or 
                $errorMsg -like "*Prefixes*" -or
                $errorMsg -like "*conflit*" -or
                $errorMsg -like "*conflict*") {
                $portInUse = $true
            }
        }

        if ($portInUse -and $retryCount -lt ($maxRetries - 1)) {
            # Port is in use, try next port (increment)
            $retryCount++
            $oldPort = $Port
            $Port++
            Write-Host "Port $oldPort seems to be in use (Error: $errorMsg). Retrying with port $Port..." -ForegroundColor Yellow
            # Update URLACL for new port
            try {
                $urlAclUser = Get-UrlAclUser
                $aclCmd = "netsh http add urlacl url=http://localhost:$Port/ user=""$urlAclUser"""
                Invoke-Expression $aclCmd 2>$null
            } catch {
                # Ignore URLACL errors
            }
        } else {
            Write-Host "Error starting server: $errorMsg" -ForegroundColor Red
            Write-Host ""
            
            if ($portInUse) {
                Write-Host "Port $Port is already in use. Try one of the following:" -ForegroundColor Yellow
                Write-Host "1. Stop the existing server process" -ForegroundColor Yellow
                Write-Host "2. Use a different port: powershell -File serve.ps1 -Port 8081" -ForegroundColor Yellow
                Write-Host ""
                Write-Host "To find and stop the process using port $Port, run:" -ForegroundColor Yellow
                Write-Host "  `$conn = Get-NetTCPConnection -LocalPort $Port; Stop-Process -Id `$conn.OwningProcess" -ForegroundColor Cyan
            } else {
                Write-Host "Try running PowerShell as Administrator for URLACL permissions" -ForegroundColor Yellow
            }
            exit 1
        }
    }
}

try {
    while ($listener.IsListening -and -not $global:shutdownRequested) {
        try {
            $context = $listener.GetContext()
            $request = $context.Request
            $response = $context.Response
        } catch {
            if ($global:shutdownRequested) {
                Write-Host "Shutdown requested, stopping server..."
                break
            }
            continue
        }
        
        $path = $request.Url.LocalPath.TrimStart('/')
        $full = Join-Path $PSScriptRoot $path
        
        Write-Host "$($request.HttpMethod) $path"
        
        # Handle POST save for studio.json
        if ($request.HttpMethod -eq 'POST' -and $path -eq 'studio.json') {
            try {
                $reader = New-Object System.IO.StreamReader($request.InputStream, $request.ContentEncoding)
                $content = $reader.ReadToEnd()
                $reader.Close()
                
                # Validate JSON
                $null = $content | ConvertFrom-Json
                
                # Write file directly
                [System.IO.File]::WriteAllText($full, $content, [System.Text.Encoding]::UTF8)
                
                $response.StatusCode = 200
                $response.ContentType = "application/json"
                $responseBuffer = [System.Text.Encoding]::UTF8.GetBytes('{"status":"success","message":"studio.json updated successfully"}')
                $response.ContentLength64 = $responseBuffer.Length
                $response.OutputStream.Write($responseBuffer, 0, $responseBuffer.Length)
                
                Write-Host "studio.json updated successfully"
            } catch {
                $response.StatusCode = 400
                $response.ContentType = "application/json"
                $errorMsg = '{"status":"error","message":"' + $_.Exception.Message + '"}' 
                $responseBuffer = [System.Text.Encoding]::UTF8.GetBytes($errorMsg)
                $response.ContentLength64 = $responseBuffer.Length
                $response.OutputStream.Write($responseBuffer, 0, $responseBuffer.Length)
                
                Write-Host "Error updating studio.json: $($_.Exception.Message)"
            }
        }
        # Handle POST save for materials.json
        elseif ($request.HttpMethod -eq 'POST' -and $path -eq 'materials.json') {
            try {
                $reader = New-Object System.IO.StreamReader($request.InputStream, $request.ContentEncoding)
                $content = $reader.ReadToEnd()
                $reader.Close()
                
                # Validate JSON
                $null = $content | ConvertFrom-Json
                
                # Write file directly to Textures/materials.json
                $materialsPath = Join-Path $PSScriptRoot "Textures\materials.json"
                [System.IO.File]::WriteAllText($materialsPath, $content, [System.Text.Encoding]::UTF8)
                
                $response.StatusCode = 200
                $response.ContentType = "application/json"
                $responseBuffer = [System.Text.Encoding]::UTF8.GetBytes('{"status":"success","message":"materials.json updated successfully"}')
                $response.ContentLength64 = $responseBuffer.Length
                $response.OutputStream.Write($responseBuffer, 0, $responseBuffer.Length)
                
                Write-Host "materials.json updated successfully"
            } catch {
                $response.StatusCode = 400
                $response.ContentType = "application/json"
                $errorMsg = '{"status":"error","message":"' + $_.Exception.Message + '"}' 
                $responseBuffer = [System.Text.Encoding]::UTF8.GetBytes($errorMsg)
                $response.ContentLength64 = $responseBuffer.Length
                $response.OutputStream.Write($responseBuffer, 0, $responseBuffer.Length)
                
                Write-Host "Error updating materials.json: $($_.Exception.Message)"
            }
        }
        # Handle GET request for listing Textures images
        elseif ($request.HttpMethod -eq 'GET' -and $path -eq 'api/textures') {
            try {
                $texturesPath = Join-Path $PSScriptRoot "Textures"
                $imageFiles = Get-ChildItem -Path $texturesPath -File | Where-Object { 
                    $_.Extension -match '\.(png|jpg|jpeg|gif|bmp|tga)$' 
                } | ForEach-Object { $_.Name }
                
                $responseData = @{
                    images = @('None') + $imageFiles
                } | ConvertTo-Json
                
                $response.StatusCode = 200
                $response.ContentType = "application/json"
                $responseBuffer = [System.Text.Encoding]::UTF8.GetBytes($responseData)
                $response.ContentLength64 = $responseBuffer.Length
                $response.OutputStream.Write($responseBuffer, 0, $responseBuffer.Length)
                
                Write-Host "Textures list sent: $($imageFiles -join ', ')"
            } catch {
                $response.StatusCode = 500
                $response.ContentType = "application/json"
                $errorMsg = '{"status":"error","message":"' + $_.Exception.Message + '"}' 
                $responseBuffer = [System.Text.Encoding]::UTF8.GetBytes($errorMsg)
                $response.ContentLength64 = $responseBuffer.Length
                $response.OutputStream.Write($responseBuffer, 0, $responseBuffer.Length)
                
                Write-Host "Error listing textures: $($_.Exception.Message)"
            }
        }
        
        # Handle POST requests for asset.json
        elseif ($request.HttpMethod -eq 'POST' -and $path -eq 'Assets/asset.json') {
            try {
                $reader = New-Object System.IO.StreamReader($request.InputStream, $request.ContentEncoding)
                $content = $reader.ReadToEnd()
                $reader.Close()

                # Validate JSON
                $null = $content | ConvertFrom-Json

                # Write file directly
                [System.IO.File]::WriteAllText($full, $content, [System.Text.Encoding]::UTF8)

                $response.StatusCode = 200
                $response.ContentType = "application/json"
                $responseBuffer = [System.Text.Encoding]::UTF8.GetBytes('{"status":"success","message":"asset.json updated successfully"}')
                $response.ContentLength64 = $responseBuffer.Length
                $response.OutputStream.Write($responseBuffer, 0, $responseBuffer.Length)

                Write-Host "asset.json updated successfully"
            } catch {
                $response.StatusCode = 400
                $response.ContentType = "application/json"
                $errorMsg = '{"status":"error","message":"' + $_.Exception.Message + '"}'
                $responseBuffer = [System.Text.Encoding]::UTF8.GetBytes($errorMsg)
                $response.ContentLength64 = $responseBuffer.Length
                $response.OutputStream.Write($responseBuffer, 0, $responseBuffer.Length)

                Write-Host "Error updating asset.json: $($_.Exception.Message)"
            }
        }
        
        # Handle GET requests for listing textures
        elseif ($request.HttpMethod -eq 'GET' -and $path -eq 'api/textures') {
            try {
                # Get all image files from Textures directory
                $texturesPath = Join-Path $PSScriptRoot "Textures"
                $imageExtensions = @("*.jpg", "*.jpeg", "*.png", "*.bmp", "*.tga", "*.dds", "*.hdr", "*.exr")
                $imageFiles = @()
                
                foreach ($ext in $imageExtensions) {
                    $files = Get-ChildItem -Path $texturesPath -Filter $ext -Recurse | ForEach-Object {
                        $relativePath = $_.FullName.Replace($texturesPath, "").TrimStart('\', '/')
                        $relativePath -replace '\\', '/'
                    }
                    $imageFiles += $files
                }
                
                # Return JSON list of image files
                $jsonResponse = @{
                    images = $imageFiles
                    count = $imageFiles.Count
                } | ConvertTo-Json
                
                $response.StatusCode = 200
                $response.ContentType = "application/json"
                $responseBuffer = [System.Text.Encoding]::UTF8.GetBytes($jsonResponse)
                $response.ContentLength64 = $responseBuffer.Length
                $response.OutputStream.Write($responseBuffer, 0, $responseBuffer.Length)
                
                Write-Host "Listed $($imageFiles.Count) texture files"
            } catch {
                $response.StatusCode = 500
                $response.ContentType = "application/json"
                $errorMsg = '{"status":"error","message":"' + $_.Exception.Message + '"}'
                $responseBuffer = [System.Text.Encoding]::UTF8.GetBytes($errorMsg)
                $response.ContentLength64 = $responseBuffer.Length
                $response.OutputStream.Write($responseBuffer, 0, $responseBuffer.Length)
                
                Write-Host "Error listing textures: $($_.Exception.Message)"
            }
        }
        
        # Handle POST requests for materials.json
        elseif ($request.HttpMethod -eq 'POST' -and $path -eq 'materials.json') {
            try {
                $reader = New-Object System.IO.StreamReader($request.InputStream, $request.ContentEncoding)
                $content = $reader.ReadToEnd()
                $reader.Close()

                # Get the target directory from query parameter
                $queryString = $request.Url.Query
                $targetDir = "Textures"  # Default
                if ($queryString -match "path=([^&]+)") {
                    $targetDir = $matches[1]
                }

                # Construct the full file path using PSScriptRoot (current script directory)
                $targetPath = Join-Path (Join-Path $PSScriptRoot $targetDir) "materials.json"
                
                # Validate JSON
                $null = $content | ConvertFrom-Json

                # Write file directly
                [System.IO.File]::WriteAllText($targetPath, $content, [System.Text.Encoding]::UTF8)

                $response.StatusCode = 200
                $response.ContentType = "application/json"
                $responseBuffer = [System.Text.Encoding]::UTF8.GetBytes('{"status":"success","message":"materials.json updated successfully"}')
                $response.ContentLength64 = $responseBuffer.Length
                $response.OutputStream.Write($responseBuffer, 0, $responseBuffer.Length)

                Write-Host "materials.json updated successfully in $targetPath"
            } catch {
                $response.StatusCode = 400
                $response.ContentType = "application/json"
                $errorMsg = '{"status":"error","message":"' + $_.Exception.Message + '"}'
                $responseBuffer = [System.Text.Encoding]::UTF8.GetBytes($errorMsg)
                $response.ContentLength64 = $responseBuffer.Length
                $response.OutputStream.Write($responseBuffer, 0, $responseBuffer.Length)

                Write-Host "Error updating materials.json: $($_.Exception.Message)"
            }
        }
        
        # Serve index.html at root
        elseif ($request.HttpMethod -eq 'GET' -and ($path -eq '' -or $path -eq '/')) {
            $indexPath = Join-Path $PSScriptRoot 'index.html'
            if (Test-Path $indexPath -PathType Leaf) {
                $response.StatusCode = 200
                $response.ContentType = 'text/html'
                $content = [System.IO.File]::ReadAllBytes($indexPath)
                $response.ContentLength64 = $content.Length
                $response.OutputStream.Write($content, 0, $content.Length)
            } else {
                $response.StatusCode = 404
                $response.Close()
            }
        }

        # Handle GET requests for studio.json
        elseif ($request.HttpMethod -eq 'GET' -and $path -eq 'studio.json') {
            if (Test-Path $full) {
                $response.StatusCode = 200
                $response.ContentType = "application/json"
                $content = Get-Content $full -Raw
                $responseBuffer = [System.Text.Encoding]::UTF8.GetBytes($content)
                $response.ContentLength64 = $responseBuffer.Length
                $response.OutputStream.Write($responseBuffer, 0, $responseBuffer.Length)
            } else {
                $response.StatusCode = 404
                $response.Close()
            }
        }
        # Handle static files
        elseif ($request.HttpMethod -eq 'GET' -and (Test-Path $full -PathType Leaf)) {
            $response.StatusCode = 200
            
            # Set content type based on file extension
            $extension = [System.IO.Path]::GetExtension($full).ToLower()
            switch ($extension) {
                '.html' { $response.ContentType = 'text/html' }
                '.css' { $response.ContentType = 'text/css' }
                '.js' { $response.ContentType = 'application/javascript' }
                '.json' { $response.ContentType = 'application/json' }
                '.hdr' { $response.ContentType = 'application/octet-stream' }
                '.glb' { $response.ContentType = 'model/gltf-binary' }
                '.gltf' { $response.ContentType = 'model/gltf+json' }
                '.fbx' { $response.ContentType = 'application/octet-stream' }
                '.obj' { $response.ContentType = 'text/plain' }
                '.png' { $response.ContentType = 'image/png' }
                '.jpg' { $response.ContentType = 'image/jpeg' }
                '.jpeg' { $response.ContentType = 'image/jpeg' }
                '.ttf' { $response.ContentType = 'font/ttf' }
                '.otf' { $response.ContentType = 'font/otf' }
                '.woff' { $response.ContentType = 'font/woff' }
                '.woff2' { $response.ContentType = 'font/woff2' }
                default { $response.ContentType = 'text/plain' }
            }
            
            $content = [System.IO.File]::ReadAllBytes($full)
            $response.ContentLength64 = $content.Length
            $response.OutputStream.Write($content, 0, $content.Length)
        }
        # Handle directory requests
        elseif ($request.HttpMethod -eq 'GET' -and (Test-Path $full -PathType Container)) {
            $response.StatusCode = 200
            $response.ContentType = "text/html"
            
            $html = @"
<!DOCTYPE html>
<html>
<head>
    <title>Directory Listing</title>
</head>
<body>
    <h1>Directory: $path</h1>
    <ul>
"@
            
            Get-ChildItem $full | ForEach-Object {
                $itemPath = $_.Name
                if ($_.PSIsContainer) { $itemPath += "/" }
                $html += "<li><a href='$itemPath'>$itemPath</a></li>"
            }
            
            $html += @"
    </ul>
</body>
</html>
"@
            
            $responseBuffer = [System.Text.Encoding]::UTF8.GetBytes($html)
            $response.ContentLength64 = $responseBuffer.Length
            $response.OutputStream.Write($responseBuffer, 0, $responseBuffer.Length)
        }
        else {
            $response.StatusCode = 404
            $response.Close()
        }
        
        $response.Close()
    }
} finally {
    try {
        if ($listener -and $listener.IsListening) {
            $listener.Stop()
            Write-Host "Server stopped gracefully"
        }
    } catch {
        Write-Host "Warning: Error stopping server: $($_.Exception.Message)"
    }
}
