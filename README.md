# 3D Model Viewer

A simple 3D model viewer built with Babylon.js that displays a rotating grey cube on a white background.

## Features

- **3D Scene**: Renders a grey cube in 3D space
- **Interactive Camera**: Mouse controls for rotation, zoom, and pan
- **Smooth Animation**: The cube rotates continuously for visual interest
- **Responsive Design**: Adapts to different screen sizes
- **Modern UI**: Clean, minimal interface with helpful controls information

## Setup

### Prerequisites

- A modern web browser with WebGL support
- Python 3.x (for local development server)

### Quick Start

1. **Clone or download** this repository
2. **Navigate** to the project directory
3. **Start the development server**:
   ```bash
   python -m http.server 8000
   ```
4. **Open your browser** and go to `http://localhost:8000`

### Alternative Setup

If you prefer using Node.js:
```bash
npm install -g http-server
http-server -p 8000
```

## Controls

- **Left Mouse Button + Drag**: Rotate the camera around the scene
- **Mouse Wheel**: Zoom in/out
- **Right Mouse Button + Drag**: Pan the camera

## Project Structure

```
3D-Viewer/
├── index.html          # Main HTML file with Babylon.js CDN
├── scene.js            # Babylon.js scene setup and cube creation
├── package.json        # Project configuration
├── README.md           # This file
└── Textures/           # Texture assets directory
```

## Technologies Used

- **Babylon.js**: 3D graphics engine
- **HTML5 Canvas**: Rendering surface
- **CSS3**: Styling and layout
- **Vanilla JavaScript**: Scene logic and controls

## Customization

### Changing the Cube Color

Edit `scene.js` and modify the material's diffuse color:
```javascript
greyMaterial.diffuseColor = new BABYLON.Color3(1, 0, 0); // Red cube
```

### Adding More Objects

Add new meshes in the `createScene` function:
```javascript
const sphere = BABYLON.MeshBuilder.CreateSphere("sphere", {diameter: 1}, scene);
sphere.position = new BABYLON.Vector3(3, 0, 0);
```

### Modifying the Background

Change the scene clear color in `scene.js`:
```javascript
scene.clearColor = new BABYLON.Color4(0, 0, 0, 1); // Black background
```

## Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Development

This project uses CDN links for Babylon.js, making it easy to get started without build tools. For production use, consider:

- Installing Babylon.js via npm
- Using a bundler like Webpack or Vite
- Implementing proper asset loading and error handling

## License

MIT License - feel free to use this project for learning and development.

## Next Steps

Potential enhancements for future versions:
- Model file loading (.obj, .fbx, .gltf)
- Texture mapping support
- Multiple lighting setups
- Animation controls
- Export functionality
