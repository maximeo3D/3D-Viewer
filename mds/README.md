# 3D Viewer - Documentation Principale

Visualiseur 3D avancé avec éditeur de matériaux PBR, système de gestion par tags et gravure dynamique de texte.

## 🎯 **Fonctionnalités Principales**

### **Système de Tags**
- Gestion flexible des configurations de produits via tags de visibilité et matériaux
- Boutons HTML pour contrôle de visibilité des meshes
- Assignation automatique de matériaux selon les configurations
- Système modulaire et extensible

### **Système de Matériaux Avancé**
- Éditeur PBR complet avec textures et transformations
- Système parent-enfant avec héritage de propriétés
- Interface Tweakpane moderne avec paramètres grisés pour les propriétés héritées
- Toggle d'indépendance par clic sur le nom du paramètre
- Création de matériaux depuis l'interface
- Synchronisation temps réel des paramètres de texture
- Color picker avec support hexadécimal pour les couleurs de base
- Export direct vers `materials.json` via serveur PowerShell
- Filtrage anisotrope pour réduire l'effet moiré sur les normal maps

### **Système de Gravure Dynamique**
- Gravure de texte dynamique sur les objets avec tag "engraving"
- Génération automatique de textures alpha, ambient occlusion et normal maps
- Support de 3 polices personnalisées (Stencil, Futuristic, Western)
- Configuration individuelle des propriétés de police (poids, style, espacement, taille)
- Calcul automatique du ratio d'aspect pour éviter l'étirement du texte
- Visibilité automatique selon la présence de texte
- Synchronisation des couleurs avec les matériaux de bloc

### **Contrôles de Caméra Personnalisés**
- Mouvement horizontal : contrôle de l'alpha (yaw) de la caméra avec sensibilité ajustable
- Mouvement vertical : rotation des objets 3D sur l'axe X
- Limites de rotation des objets (-90° à +90°)
- Élasticité de rotation des objets (retour à 0° au relâchement)
- Zoom fluide avec interpolation
- Pan désactivé (clic droit)

### **Système de Points de Vue (Viewpoints)**
- Définition de points de vue prédéfinis dans `studio.json`
- Transitions fluides entre les viewpoints avec animation étape par étape
- Contrôles de caméra synchronisés en temps réel avec Tweakpane
- Export des paramètres de caméra actuels vers les viewpoints
- Support des limites de distance (minDistance/maxDistance)
- Interface HTML avec boutons de sélection de viewpoints

## 📁 **Structure du Projet**

```
3D-Viewer/
├── index.html                 # Interface HTML avec boutons de contrôle et sélection de polices
├── scene.js                   # Logique 3D, contrôles, TagManager
├── tweakpaneManager.js        # Interface utilisateur Tweakpane moderne
├── engravingManager.js        # Gestionnaire de gravure dynamique avec polices personnalisées
├── studio.json                # Configuration environnement/caméra avec viewpoints
├── serve.ps1                  # Serveur PowerShell HTTP
├── start-server.bat           # Script de démarrage Windows
├── styles.css                 # Styles CSS avec polices personnalisées
├── Assets/
│   ├── asset.js              # Configuration des modèles et tags
│   ├── cubes.glb             # Modèle de test avec meshes multiples
│   └── part.glb              # Modèle de test avec gravure
├── Textures/
│   ├── materials.json         # Matériaux PBR avec héritage
│   ├── HDR/
│   │   └── default.hdr       # Environnement HDR
│   └── [textures]            # Textures PBR
└── Fonts/
    ├── stencil.ttf            # Police Stencil pour gravure
    ├── futuristic.otf         # Police Futuristic pour gravure
    └── western.ttf            # Police Western pour gravure
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
- `baseColor`: Base color (hex or RGB) with color picker support
- `metallic`: Metallic factor (0.0 - 1.0)
- `roughness`: Roughness factor (0.0 - 1.0)
- `alpha`: Transparency (0.0 - 1.0)
- `albedoTexture`: Base color texture
- `metallicTexture`: Metallic texture
- `microSurfaceTexture`: Roughness texture
- `ambientTexture`: Ambient occlusion texture
- `opacityTexture`: Opacity texture
- `bumpTexture`: Normal map texture with intensity control
- `lightmapTexture`: Lightmap texture with shadowmap option
- `uOffset`, `vOffset`: Texture UV offset
- `uScale`, `vScale`: Texture UV scale
- `wRotation`: Texture rotation in degrees

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

## 🎨 **Système de Gravure Dynamique**

### **EngravingManager**
Le système de gravure utilise la classe `EngravingManager` pour créer des textures dynamiques :

- **Textures générées** : Alpha map, Ambient Occlusion, Normal map
- **Polices personnalisées** : Stencil (défaut), Futuristic, Western
- **Configuration par police** : Poids, style, espacement, taille
- **Calcul automatique** : Ratio d'aspect et ajustement de taille
- **Visibilité intelligente** : Objet visible uniquement avec du texte

### **Configuration des Polices**
```javascript
// Dans engravingManager.js
this.fontConfigs = {
    'Stencil': {
        fontWeight: 'normal',
        fontStyle: 'normal',
        letterSpacing: 0,
        fontSizeScale: 1
    },
    'Futuristic': {
        fontWeight: 'normal',
        fontStyle: 'normal',
        letterSpacing: 2,
        fontSizeScale: 1
    },
    'Western': {
        fontWeight: 'normal',
        fontStyle: 'normal',
        letterSpacing: 15,
        fontSizeScale: 1
    }
};
```

### **Interface Utilisateur**
- **Champ de texte** : Saisie du texte à graver
- **Boutons de police** : Sélection entre Stencil, Futuristic, Western
- **Synchronisation** : Couleur automatiquement synchronisée avec le bloc
- **Visibilité** : Objet apparaît/disparaît selon la présence de texte

## JavaScript Configuration Benefits

Using `asset.js` instead of `asset.json` provides:
- **Comments**: Add explanatory comments in the configuration
- **Flexibility**: Use JavaScript expressions and logic
- **Maintainability**: Better structure and organization
- **Compatibility**: Maintains backward compatibility with existing systems
