# PowerShell HTTP Server for 3D Viewer
# This server handles POST requests to directly overwrite studio.json

param(
    [int]$Port = 8080
)

# Create HTTP listener
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()

Write-Host "3D Viewer Server started on http://localhost:$Port"
Write-Host "Press Ctrl+C to stop the server"

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
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
                '.js' { $response.ContentType = 'application/javascript' }
                '.json' { $response.ContentType = 'application/json' }
                '.hdr' { $response.ContentType = 'application/octet-stream' }
                '.glb' { $response.ContentType = 'model/gltf-binary' }
                '.gltf' { $response.ContentType = 'model/gltf+json' }
                '.fbx' { $response.ContentType = 'application/octet-stream' }
                '.obj' { $response.ContentType = 'text/plain' }
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
    $listener.Stop()
    Write-Host "Server stopped"
}
