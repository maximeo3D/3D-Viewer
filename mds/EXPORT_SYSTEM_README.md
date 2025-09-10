# 3D Viewer Export System

This project now includes a direct file export system that allows you to export Tweakpane parameters directly to `studio.json` and `materials.json` without opening file explorer dialogs.

## How It Works

The export system uses a **client-server architecture**:

1. **Client-Side (JavaScript)**: Tweakpane controls send POST requests when export buttons are clicked
2. **Server-Side (PowerShell)**: A custom HTTP server intercepts POST requests and writes directly to files
3. **Direct File Overwrite**: The `studio.json` and `materials.json` files are updated in real-time without downloads

## Setup Instructions

### 1. Start the Server

**Option A: Using the batch file (Windows)**
```bash
# Double-click start-server.bat
# OR run from command line:
start-server.bat
```

**Option B: Using PowerShell directly**
```powershell
# Open PowerShell in the project directory
powershell -ExecutionPolicy Bypass -File "serve.ps1"
```

### 2. Access the Application

Open your browser and navigate to:
```
http://localhost:8080
```

## Available Controls

### Environment Controls
- **Background Color**: Change the scene background color
- **HDR Exposure**: Adjust HDR environment intensity (0-2)
- **Orientation**: Rotate the HDR environment (-180° to 180°)
- **Export Parameters**: Save all environment settings to `studio.json`

### Camera Controls
- **Alpha**: Horizontal rotation angle (-π to π)
- **Beta**: Vertical rotation angle (0 to π)
- **Radius**: Distance from camera to target (1-20)
- **Export Camera**: Save camera position to `studio.json`

### Material Controls
- **Base Color**: Color picker with hex support
- **Metallic/Roughness**: PBR material properties
- **Textures**: Dynamic texture loading from server
- **Export Materials**: Save material configurations to `materials.json`

## Export Functionality

When you click any export button:

1. The current parameter values are collected from Tweakpane
2. A POST request is sent to the server
3. The server validates the JSON and writes it to the appropriate file (`studio.json` or `materials.json`)
4. The file is updated immediately with pretty-printed JSON
5. A success message confirms the export

## File Structure

```
3D-Viewer/
├── index.html          # Main HTML file
├── scene.js            # 3D scene and controls logic
├── tweakpaneManager.js # Tweakpane interface logic
├── studio.json         # Camera and environment config (auto-updated)
├── serve.ps1           # PowerShell HTTP server
├── start-server.bat    # Windows batch file to start server
└── Textures/           # Textures and materials directory
    ├── materials.json  # Material configurations (auto-updated)
    └── HDR/           # HDR environment textures
```

## Troubleshooting

### Server Won't Start
- Ensure PowerShell execution policy allows running scripts
- Check if port 8080 is already in use
- Run PowerShell as Administrator if needed

### Export Fails
- Make sure the server is running on http://localhost:8080
- Check browser console for error messages
- Verify `studio.json` is writable

### Parameters Not Saving
- Refresh the page after export to see changes
- Check that the server has write permissions to the project directory

## Technical Details

The system works by:
1. Intercepting POST requests to `studio.json` and `materials.json`
2. Validating incoming JSON data
3. Writing directly to the file system using PowerShell's `[System.IO.File]::WriteAllText()`
4. Returning success/error responses to the client
5. Providing dynamic texture listing via `/api/textures` endpoint

This approach bypasses browser download mechanisms and provides direct file overwriting capability, perfect for development and testing workflows. The server also supports dynamic texture discovery, automatically listing available images in the Textures folder.
