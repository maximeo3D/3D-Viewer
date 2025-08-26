# 3D Viewer Project Notes & Development History

## Project Overview
A 3D model viewer built with Three.js that displays a static grey cube with full camera controls.

## Key Features Implemented
- ✅ 3D scene with static grey cube (no rotation)
- ✅ Full camera controls (orbit, zoom, pan)
- ✅ Clean dark background
- ✅ Latest Three.js v0.179.0 via CDN
- ✅ Separated CSS and HTML structure
- ✅ WSL-compatible development server

## Technical Decisions Made

### 1. Server Setup Issue Resolution
**Problem**: Server was serving from Windows root directory instead of WSL project directory
**Solution**: Use WSL directly: `wsl -d Ubuntu-24.04 -e bash -c "cd /home/maximeo/repos/3DViewer/3D-Viewer && python3 -m http.server 8001"`

### 2. Three.js Import Strategy
**Problem**: Local node_modules imports were failing
**Solution**: Switched to CDN imports with import maps for better reliability

### 3. Scene Simplification
**Removed**: 
- Cube rotation animation
- Wireframe overlay
- Ground plane
- Shadows and transparency
**Result**: Clean, focused 3D viewing experience

### 4. Code Organization
- Separated CSS into `style.css`
- Clean HTML structure
- Modular JavaScript with ES6 imports

## Development Commands

### Start Development Server
```bash
# From WSL terminal (recommended)
cd /home/maximeo/repos/3DViewer/3D-Viewer
python3 -m http.server 8001

# From PowerShell (alternative)
wsl -d Ubuntu-24.04 -e bash -c "cd /home/maximeo/repos/3DViewer/3D-Viewer && python3 -m http.server 8001"
```

### Git Operations
```bash
git add .
git commit -m "Your commit message"
git push origin main
```

## File Structure
```
3D-Viewer/
├── index.html          # Main HTML with Three.js CDN imports
├── main.js            # 3D scene logic
├── style.css          # External styles
├── package.json       # Project dependencies
├── .gitignore         # Git exclusions
├── README.md          # Project documentation
└── PROJECT_NOTES.md   # This file
```

## Browser Access
- **Development**: `http://localhost:8001`
- **Controls**: 
  - Left click + drag: Orbit camera
  - Right click + drag: Pan camera
  - Mouse wheel: Zoom in/out

## Troubleshooting

### Server Shows Windows Root Folder
**Cause**: PowerShell-to-WSL path interpretation issues
**Solution**: Use native WSL terminal or WSL command execution

### Three.js Not Loading
**Cause**: ES6 module import failures
**Solution**: CDN imports with import maps (already implemented)

### Port Conflicts
**Solution**: Kill existing processes and use different port
```bash
taskkill /F /IM node.exe
taskkill /F /IM python.exe
```

## Future Enhancements Considered
- Load external 3D models (GLTF, OBJ)
- Material editor interface
- Multiple object support
- Animation controls
- Export functionality

## Dependencies
- Three.js v0.179.0 (CDN)
- ES Module Shims for browser compatibility
- Python 3 (for development server)

## Last Updated
- Date: Current session
- Three.js Version: 0.179.0
- Server Port: 8001 (Python)
- Status: ✅ Working with clean 3D scene
