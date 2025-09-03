# PowerShell HTTP Server for 3D Viewer
# This server handles POST requests to directly overwrite studio.json

param(
    [int]$Port = 8080
)

# Create HTTP listener
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")

# Set up graceful shutdown handling
$global:shutdownRequested = $false
$null = Register-EngineEvent PowerShell.Exiting -Action { $global:shutdownRequested = $true }

try {
    $listener.Start()
    Write-Host "3D Viewer Server started on http://localhost:$Port"
    Write-Host "Press Ctrl+C to stop the server"
} catch {
    Write-Host "Error starting server: $($_.Exception.Message)"
    exit 1
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
