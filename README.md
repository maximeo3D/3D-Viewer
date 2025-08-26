# 3D Model Viewer

A 3D model viewer built with Three.js that displays a rotating cube as a starting point.

## Features

- 3D scene with a rotating cube
- Interactive camera controls (orbit, zoom, pan)
- Lighting and shadows
- Wireframe overlay
- Ground plane for reference
- Responsive design

## Installation

1. Make sure you have Node.js installed (v16 or higher)
2. Clone this repository
3. Install dependencies:
   ```bash
   npm install
   ```

## Usage

### Development Server

Start the development server:
```bash
npm run dev
```

This will:
- Start a local HTTP server on port 8000
- Open your browser automatically
- Display the 3D cube viewer

### Manual Start

If you prefer to start manually:
```bash
npm start
```

Then open your browser and navigate to `http://localhost:8000`

## Controls

- **Mouse Left Click + Drag**: Rotate the camera around the scene
- **Mouse Right Click + Drag**: Pan the camera
- **Mouse Wheel**: Zoom in/out
- **Touch**: Pinch to zoom, drag to rotate

## Project Structure

```
3D-Viewer/
├── index.html          # Main HTML file
├── main.js            # Three.js application code
├── package.json       # Project dependencies and scripts
├── node_modules/      # Installed packages (Three.js)
└── README.md          # This file
```

## Technologies Used

- **Three.js**: 3D graphics library
- **WebGL**: Hardware-accelerated 3D graphics
- **ES6 Modules**: Modern JavaScript module system

## Next Steps

This project is set up as a foundation for a 3D model viewer. Future enhancements could include:

- Loading external 3D models (GLTF, OBJ, etc.)
- Material editor
- Multiple object support
- Animation controls
- Export functionality

## Browser Compatibility

This project requires a modern browser with WebGL support:
- Chrome 51+
- Firefox 51+
- Safari 10+
- Edge 79+

## License

ISC
