# 3D Viewer - Documentation Principale

Visualiseur 3D avancé avec éditeur de matériaux PBR et système de gestion des SKUs.

## 🎯 **Fonctionnalités Principales**

### **Système SKU (Stock Keeping Unit)**
- Gestion des configurations de produits via `SKUconfigs.json`
- Boutons HTML pour sélection de modèles et schémas de couleurs
- Contrôle de visibilité des meshes par configuration
- Assignation automatique de matériaux selon les slots

### **Système de Matériaux Avancé**
- Éditeur PBR complet avec textures et transformations
- Système parent-enfant avec héritage de propriétés
- Interface dat.GUI avec paramètres grisés pour les propriétés héritées
- Toggle d'indépendance par clic sur le nom du paramètre
- Création de matériaux depuis l'interface

### **Contrôles de Caméra Personnalisés**
- Mouvement horizontal : contrôle uniquement l'alpha (yaw) de la caméra
- Mouvement vertical : rotation des objets 3D sur l'axe X
- Limites de rotation des objets (-90° à +90°)
- Élasticité de rotation des objets (retour à 0° au relâchement)

## 📁 **Structure du Projet**

```
3D-Viewer/
├── index.html                 # Interface HTML avec boutons SKU
├── scene.js                   # Logique 3D, contrôles, SKUManager
├── datGUI.js                  # Interface utilisateur dat.GUI
├── SKUconfigs.json            # Configuration des SKUs
├── studio.json                # Configuration environnement/caméra
├── Assets/
│   ├── asset.js              # Données techniques des modèles
│   └── cubes.glb             # Modèle de test
└── Textures/
    ├── materials.json         # Matériaux PBR avec héritage
    └── [textures]            # Textures PBR
```

## 🔧 **Configuration des Assets**

### **Assets/asset.js**
Fichier de données techniques définissant :
- **Models**: Fichiers de modèles 3D et leurs propriétés
- **Meshes**: Noms des meshes individuels avec slots de matériaux
- **Material Slots**: Définition des slots de matériaux pour chaque mesh
- **Transform**: Position, rotation, échelle

### **SKUconfigs.json**
Configuration métier des produits :
- **Models**: Correspondance entre identifiants techniques et noms d'affichage
- **ColorSchemes**: Schémas de couleurs disponibles
- **SKUs**: Configurations complètes des produits (visibilité, matériaux)

**Note**: Les matériaux sont définis séparément dans `Textures/materials.json`

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
