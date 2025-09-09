# 3D Viewer - Documentation Principale

Visualiseur 3D avancé avec éditeur de matériaux PBR et système de gestion par tags.

## 🎯 **Fonctionnalités Principales**

### **Système de Tags**
- Gestion flexible des configurations de produits via tags de visibilité et matériaux
- Boutons HTML pour contrôle de visibilité des meshes
- Assignation automatique de matériaux selon les configurations
- Système modulaire et extensible

### **Système de Matériaux Avancé**
- Éditeur PBR complet avec textures et transformations
- Système parent-enfant avec héritage de propriétés
- Interface dat.GUI avec paramètres grisés pour les propriétés héritées
- Toggle d'indépendance par clic sur le nom du paramètre
- Création de matériaux depuis l'interface
- Synchronisation temps réel des paramètres de texture

### **Contrôles de Caméra Personnalisés**
- Mouvement horizontal : contrôle de l'alpha (yaw) de la caméra avec sensibilité ajustable
- Mouvement vertical : rotation des objets 3D sur l'axe X
- Limites de rotation des objets (-90° à +90°)
- Élasticité de rotation des objets (retour à 0° au relâchement)
- Zoom fluide avec interpolation
- Pan désactivé (clic droit)

## 📁 **Structure du Projet**

```
3D-Viewer/
├── index.html                 # Interface HTML avec boutons de contrôle
├── scene.js                   # Logique 3D, contrôles, TagManager
├── datGUI.js                  # Interface utilisateur dat.GUI
├── studio.json                # Configuration environnement/caméra
├── Assets/
│   ├── asset.js              # Configuration des modèles et tags
│   └── part.glb              # Modèle de test
└── Textures/
    ├── materials.json         # Matériaux PBR avec héritage
    └── [textures]            # Textures PBR
```

## 🔧 **Configuration des Assets**

### **Assets/asset.js**
Fichier de configuration centralisé définissant :
- **Models**: Fichiers de modèles 3D et leurs propriétés
- **Meshes**: Noms des meshes individuels avec tags de visibilité et slots de matériaux
- **Tags**: Système de tags pour la visibilité et les configurations de matériaux
- **Material Configs**: Configurations de matériaux par mesh

### **Système de Tags**
- **Tags de visibilité**: Contrôlent l'affichage des meshes (ex: "base", "flag", "engraving")
- **Tags de matériaux**: Définissent les configurations de matériaux par mesh
- **Flexibilité**: Système modulaire permettant d'ajouter facilement de nouveaux tags

**Note**: Les matériaux PBR sont définis dans `Textures/materials.json`

## Adding Models

1. Place your `.glb` file in the `Assets/` folder
2. Update `asset.js` with model information
3. Define mesh names and assign tags for visibility and materials
4. Configure material assignments in the `materialConfigs` section
5. Test the configuration with the HTML interface

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

## Tag-Based Visibility Control

Each mesh can be controlled using tags for visibility and materials:

```javascript
// Dans Assets/asset.js
meshes: {
    "bloc": { 
        materialSlots: ["slot1"], 
        tags: ["base"] 
    },
    "flag": { 
        materialSlots: ["slot1"], 
        tags: ["flag"] 
    },
    "engraving": { 
        materialSlots: ["slot1"], 
        tags: ["engraving"] 
    }
}
```

## JavaScript Configuration Benefits

Using `asset.js` instead of `asset.json` provides:
- **Comments**: Add explanatory comments in the configuration
- **Flexibility**: Use JavaScript expressions and logic
- **Maintainability**: Better structure and organization
- **Compatibility**: Maintains backward compatibility with existing systems
