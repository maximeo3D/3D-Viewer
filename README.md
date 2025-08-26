# 3D Model Viewer

A 3D model viewer built with Three.js that displays a static grey cube with full camera controls.

## Features

- 3D scene with a static grey cube (no rotation)
- Interactive camera controls (orbit, zoom, pan)
- Clean dark background
- Latest Three.js v0.179.0 via CDN
- Responsive design

## Quick Start

### Development Server (WSL Recommended)

**Option 1: Native WSL Terminal**
```bash
wsl
cd /home/maximeo/repos/3DViewer/3D-Viewer
python3 -m http.server 8001
```

**Option 2: From PowerShell**
```bash
wsl -d Ubuntu-24.04 -e bash -c "cd /home/maximeo/repos/3DViewer/3D-Viewer && python3 -m http.server 8001"
```

Then open your browser to `http://localhost:8001`

### Alternative: Node.js Server
```bash
npm run dev
```
*Note: May have path issues in WSL environment*

## Controls

- **Mouse Left Click + Drag**: Orbit the camera around the scene
- **Mouse Right Click + Drag**: Pan the camera
- **Mouse Wheel**: Zoom in/out

## Project Structure

```
3D-Viewer/
├── index.html          # Main HTML with Three.js CDN imports
├── main.js            # 3D scene logic
├── style.css          # External styles
├── package.json       # Project dependencies
├── .gitignore         # Git exclusions
├── README.md          # This file
└── PROJECT_NOTES.md   # Detailed development notes
```

## Technologies Used

- **Three.js v0.179.0**: 3D graphics library (CDN)
- **ES6 Modules**: Modern JavaScript module system
- **WebGL**: Hardware-accelerated 3D graphics
- **Python 3**: Development server

## Troubleshooting

### Server Shows Windows Root Folder
**Problem**: PowerShell-to-WSL path interpretation issues
**Solution**: Use native WSL terminal or WSL command execution

### Port Conflicts
```bash
taskkill /F /IM node.exe
taskkill /F /IM python.exe
```

### Three.js Not Loading
**Solution**: CDN imports are already implemented and should work reliably

## Development Notes

For detailed development history, technical decisions, and troubleshooting steps, see `PROJECT_NOTES.md`.

## Browser Compatibility

This project requires a modern browser with WebGL support:
- Chrome 51+
- Firefox 51+
- Safari 10+
- Edge 79+

## License

ISC
