# Assets Folder

This folder contains 3D models and asset configuration for the 3D Viewer.

## Structure

- `asset.js` - Asset configuration file defining models, meshes, and materials (JavaScript format)
- `*.glb` - 3D model files in GLB format
- `README.md` - This file

## Asset Configuration

The `asset.js` file defines:
- **Models**: 3D model files and their properties
- **Meshes**: Individual mesh names within each model with visibility control
- **Material Slots**: Material assignments for each mesh
- **Transform**: Position, rotation, scale, and visibility

**Note**: Materials are defined separately in `Textures/materials.json`

## Adding Models

1. Place your `.glb` file in this folder
2. Update `asset.js` with model information
3. Define mesh names and material slot assignments
4. Set individual mesh visibility with the `visible` property
5. Configure materials in the materials section

## Supported Formats

- **GLB**: Binary glTF format (recommended)
- **GLTF**: Text-based glTF format
- **FBX**: Autodesk FBX format (if converter available)
- **OBJ**: Wavefront OBJ format (basic support)

## Material System

Materials are defined with PBR properties:
- `baseColor`: Base color (hex or RGB)
- `metallic`: Metallic factor (0.0 - 1.0)
- `roughness`: Roughness factor (0.0 - 1.0)
- `alpha`: Transparency (0.0 - 1.0)
- `normalMap`: Normal map texture
- `emissive`: Emissive color and intensity

## Mesh Visibility Control

Each mesh can be individually controlled for visibility:

```javascript
{
    name: "Cube",
    visible: true,  // Show this mesh
    materialSlot1: "red"
},
{
    name: "Sphere", 
    visible: false, // Hide this mesh
    materialSlot1: "blue"
}
```

## JavaScript Configuration Benefits

Using `asset.js` instead of `asset.json` provides:
- **Comments**: Add explanatory comments in the configuration
- **Flexibility**: Use JavaScript expressions and logic
- **Maintainability**: Better structure and organization
- **Compatibility**: Maintains backward compatibility with existing systems
