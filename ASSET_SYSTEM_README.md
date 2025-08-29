# 3D Model Loading & Asset System

This document explains the 3D model loading and asset management system implemented in the 3D Viewer.

## 🚀 **System Overview**

The asset system allows you to:
- **Load 3D models** in GLB format
- **Configure models** with position, rotation, scale, and visibility
- **Assign materials** to specific mesh names
- **Export/import** asset configurations
- **Manage materials** with PBR properties

## 📁 **Folder Structure**

```
3D-Viewer/
├── Assets/                    ← 3D models and configuration
│   ├── asset.json            ← Asset configuration file
│   ├── cube-sphere.glb       ← 3D model file
│   └── README.md             ← Assets folder documentation
├── Textures/                  ← Texture files and materials
│   ├── materials.json        ← PBR materials configuration
│   ├── HDR/                  ← HDR environment textures
│   └── ...                   ← Other texture files
├── scene.js                   ← Main scene with asset loading
├── serve.ps1                  ← Server with GLB support
└── studio.json                ← Camera and environment settings
```

## 🎯 **Asset Configuration**

### **Models (Assets/asset.json)**
```json
{
  "models": [
    {
      "name": "my_car",
      "file": "car.glb",
      "meshes": [
        {
          "name": "Body",
          "materialSlot": "car_body_material"
        },
        {
          "name": "Wheels",
          "materialSlot": "wheel_material"
        }
      ],
      "position": [0, 0, 0],
      "rotation": [0, 0, 0],
      "scale": [1, 1, 1],
      "visible": true
    }
  ]
}
```

### **Materials (Textures/materials.json)**
```json
{
  "materials": {
    "car_body_material": {
      "type": "pbr",
      "baseColor": "#ff0000",
      "metallic": 0.0,
      "roughness": 0.8,
      "normalMap": null,
      "emissive": null,
      "alpha": 1.0
    },
    "wheel_material": {
      "type": "pbr",
      "baseColor": "#333333",
      "metallic": 0.0,
      "roughness": 0.9,
      "normalMap": null,
      "emissive": null,
      "alpha": 1.0
    }
  }
}
```

## 🔧 **How It Works**

### **1. Model Loading Process**
1. **Load asset.json** - Read configuration file
2. **Import GLB** - Use Babylon.js SceneLoader
3. **Apply Transforms** - Position, rotation, scale
4. **Assign Materials** - Match mesh names to material slots
5. **Group Management** - Organize meshes under transform nodes

### **2. Material Assignment**
- **Mesh Name Matching**: Materials are assigned based on mesh names in the GLB file
- **PBR Support**: Full PBR material system with baseColor, metallic, roughness, alpha
- **Dynamic Loading**: Materials are created and applied at runtime

### **3. Export System**
- **Asset Configuration**: Export current asset.json settings
- **Server Integration**: Direct file overwrite via HTTP POST
- **Validation**: JSON validation before saving

## 📋 **Supported Features**

### **File Formats**
- ✅ **GLB** - Binary glTF (recommended)
- ✅ **GLTF** - Text-based glTF
- ⚠️ **FBX** - Basic support (if converter available)
- ⚠️ **OBJ** - Basic support

### **Material Properties**
- **Base Color**: Hex color values
- **Metallic**: 0.0 (non-metallic) to 1.0 (fully metallic)
- **Roughness**: 0.0 (smooth) to 1.0 (rough)
- **Alpha**: Transparency (0.0 to 1.0)
- **Normal Maps**: Bump mapping support
- **Emissive**: Glowing materials

### **Transform Controls**
- **Position**: X, Y, Z coordinates
- **Rotation**: Euler angles in radians
- **Scale**: Uniform or non-uniform scaling
- **Visibility**: Show/hide entire models

## 🎮 **User Interface**

### **Assets Folder in datGUI**
- **Status Display**: Shows number of loaded models
- **Reload Models**: Refresh models and materials from files
- **Export Assets**: Save current asset configuration

### **Materials Folder in datGUI**
- **Status Display**: Shows number of loaded materials
- **Export Materials**: Save current materials configuration

### **Console Logging**
- **Loading Progress**: Model loading status
- **Material Assignment**: Material application details
- **Error Handling**: Clear error messages for debugging

## 🚀 **Getting Started**

### **1. Add Your 3D Model**
1. Place your `.glb` file in the `Assets/` folder
2. Update `asset.json` with model information
3. Define mesh names and material assignments

### **2. Configure Materials**
1. Edit the `materials` section in `asset.json`
2. Use PBR properties for realistic materials
3. Reference materials in mesh configurations

### **3. Test and Export**
1. Refresh the page to load models
2. Use the "Reload Models" button for changes
3. Export configuration when satisfied

## 🔍 **Troubleshooting**

### **Common Issues**

#### **Models Not Loading**
- Check file path in `asset.json`
- Verify GLB file is valid
- Check browser console for errors

#### **Materials Not Applying**
- Verify mesh names match exactly
- Check material slot names in configuration
- Ensure PBR material type is specified

#### **Server Issues**
- Ensure `serve.ps1` is running
- Check file permissions
- Verify HTTP server is accessible

### **Debug Tips**
- **Console Logs**: Check browser console for detailed information
- **Network Tab**: Verify file requests in browser dev tools
- **File Validation**: Test JSON syntax with online validators

## 🔮 **Future Enhancements**

### **Planned Features**
- **Material Editor**: Visual PBR material creation
- **Texture Support**: Normal maps, roughness maps, etc.
- **Animation Support**: Keyframe and skeletal animations
- **LOD System**: Level of detail management
- **Asset Library**: Pre-built material and model collections

### **Advanced Features**
- **Real-time Material Editing**: Live material preview
- **Material Presets**: Common material configurations
- **Texture Baking**: Automatic texture generation
- **Asset Versioning**: Track changes and rollbacks

## 📚 **Technical Details**

### **Babylon.js Integration**
- **SceneLoader**: Handles GLB file import
- **TransformNode**: Groups meshes for organization
- **PBRMaterial**: Advanced material system
- **Mesh Parenting**: Hierarchical scene structure

### **Performance Considerations**
- **Lazy Loading**: Models load on demand
- **Memory Management**: Automatic cleanup of unused resources
- **Optimization**: Efficient mesh and material handling

## 🤝 **Contributing**

To add new features or fix issues:
1. **Test thoroughly** with different model types
2. **Update documentation** for new features
3. **Maintain compatibility** with existing configurations
4. **Follow coding standards** established in the project

---

**Note**: This system is designed to be extensible. The modular architecture allows for easy addition of new features while maintaining backward compatibility.
