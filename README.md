# 3D Viewer - Advanced PBR Material Editor

Un visualiseur 3D professionnel avec éditeur de matériaux PBR avancé, système d'assets, et exportation de paramètres en temps réel.

## 🚀 **Fonctionnalités Principales**

### **🎨 Éditeur de Matériaux PBR Complet**
- **Matériaux PBR avancés** : Albedo, Metallic, Roughness, Alpha
- **Système de textures** : Albedo, Surface (ORM), Normal Map
- **Contrôles de canaux** : Roughness from G, Metalness from B, AO from R
- **Paramètres avancés** : Back Face Culling, Texture Intensity, Use Alpha from Albedo
- **Interface datGUI** : Contrôles en temps réel avec synchronisation automatique

### **📁 Système d'Assets et Modèles 3D**
- **Chargement GLB/glTF** : Support natif des formats 3D modernes
- **Configuration d'assets** : `Assets/asset.json` pour définir modèles et matériaux
- **Assignation de matériaux** : Système de slots multiples par mesh
- **Gestion des primitives** : Support automatique des sous-meshes Babylon.js

### **🎯 Contrôles de Caméra Avancés**
- **Caméra ArcRotate** : Contrôles Yaw/Pitch/Distance avec limites
- **Indicateur de cible** : Visualisation 3D avec flèches directionnelles
- **Contrôles de position** : Précision 0.01 pour le positionnement
- **Paramètres FOV** : Field of View, Min/Max Distance configurables

### **🌍 Environnement et Éclairage**
- **HDR Environment** : Textures HDR avec orientation et exposition
- **Réflexions PBR** : Rendu physique réaliste des matériaux
- **Background configurable** : Couleur de fond et paramètres d'environnement

### **💾 Système d'Exportation Avancé**
- **Export direct** : Sauvegarde automatique sans dialogue de fichier
- **Architecture client-serveur** : Serveur PowerShell pour opérations de fichiers
- **Synchronisation temps réel** : Export des paramètres Environment, Camera, Materials
- **Persistance des données** : Configuration sauvegardée dans `studio.json`

## 🛠️ **Architecture Technique**

### **Frontend (JavaScript)**
- **Babylon.js 6.x** : Moteur 3D moderne avec support PBR natif
- **dat.GUI** : Interface utilisateur pour contrôles en temps réel
- **Fetch API** : Communication asynchrone avec le serveur
- **Système de matériaux** : Gestion dynamique des propriétés PBR

### **Backend (PowerShell)**
- **Serveur HTTP personnalisé** : Gestion des fichiers statiques et API
- **Endpoints REST** : POST pour sauvegarde, GET pour listing des textures
- **Gestion des chemins** : Support WSL et Windows natif
- **MIME types** : Support complet des formats 3D et textures

### **Structure des Fichiers**
```
3D-Viewer/
├── index.html                 # Interface HTML principale
├── scene.js                   # Logique 3D et contrôles datGUI
├── serve.ps1                  # Serveur PowerShell HTTP
├── start-server.bat           # Script de démarrage Windows
├── studio.json                # Configuration environnement/caméra
├── Assets/
│   ├── asset.json            # Configuration des modèles 3D
│   └── cube-sphere.glb       # Modèle de test
└── Textures/
    ├── materials.json         # Configuration des matériaux PBR
    ├── HDR/
    │   └── default.hdr       # Environnement HDR
    └── [autres textures]     # Textures PBR (PNG, JPG, etc.)
```

## 🚀 **Installation et Démarrage**

### **Prérequis**
- **Windows 10/11** avec PowerShell 5.1+
- **Navigateur moderne** avec support WebGL 2.0
- **Modèle 3D GLB** (optionnel, pour tests)

### **Démarrage Rapide**

1. **Cloner le projet** :
   ```bash
   git clone [repository-url]
   cd 3D-Viewer
   ```

2. **Démarrer le serveur** :
   ```bash
   # Double-cliquer sur start-server.bat
   # OU
   powershell -ExecutionPolicy Bypass -File "serve.ps1"
   ```

3. **Ouvrir le navigateur** :
   ```
   http://localhost:8080
   ```

### **Configuration Initiale**

1. **Placer vos modèles 3D** dans le dossier `Assets/`
2. **Configurer `Assets/asset.json`** avec vos meshes et matériaux
3. **Définir vos matériaux** dans `Textures/materials.json`
4. **Ajouter vos textures** dans le dossier `Textures/`

## 📖 **Guide d'Utilisation**

### **Éditeur de Matériaux**

#### **Propriétés de Base**
- **Albedo Color** : Couleur de base du matériau (sélecteur de couleur)
- **Metallic** : Facteur métallique (0.00 - 1.00, pas 0.01)
- **Roughness** : Facteur de rugosité (0.00 - 1.00, pas 0.01)
- **Alpha** : Transparence (0.00 - 1.00)

#### **Système de Textures**
- **Albedo Texture** : Texture de couleur de base
- **Surface Texture** : Texture ORM (Occlusion, Roughness, Metallic)
- **Normal Map** : Texture de relief avec intensité réglable (0-5, pas 0.1)

#### **Options Avancées**
- **Use Alpha from Albedo** : Utilise le canal alpha de la texture albedo
- **Roughness from G** : Extrait la rugosité du canal vert
- **Metalness from B** : Extrait le métallique du canal bleu
- **AO from R** : Extrait l'ambient occlusion du canal rouge
- **Back Face Culling** : Masque les faces arrière

### **Contrôles de Caméra**

#### **Rotation et Position**
- **Yaw (Horizontal)** : Rotation horizontale (-180° à +180°)
- **Pitch (Vertical)** : Rotation verticale (0° à 180°)
- **Distance** : Distance de la caméra (1 à 50)
- **Field of View** : Angle de vision (10° à 120°)

#### **Limites et Cible**
- **Min/Max Distance** : Limites de zoom (0.1 à 100)
- **Target Position** : Position de la cible (X, Y, Z, précision 0.01)
- **Show Target** : Affiche/masque l'indicateur de cible 3D

### **Environnement**
- **Background Color** : Couleur de fond de la scène
- **HDR Exposure** : Intensité de l'environnement HDR (0.0 à 2.0)
- **Orientation** : Rotation de l'environnement (-180° à +180°)

## 🔧 **Configuration Avancée**

### **Format asset.json**
```json
{
  "models": [
    {
      "name": "MonModele",
      "file": "modele.glb",
      "position": [0, 0, 0],
      "rotation": [0, 0, 0],
      "scale": [1, 1, 1],
      "visible": true,
      "meshes": [
        {
          "name": "Mesh1",
          "materialSlot1": "material_rouge",
          "materialSlot2": "material_bleu"
        }
      ]
    }
  ]
}
```

### **Format materials.json**
```json
{
  "materials": {
    "material_rouge": {
      "type": "pbr",
      "baseColor": "#ff0000",
      "metallic": 0.8,
      "roughness": 0.2,
      "alpha": 1.0,
      "albedoTexture": "texture_albedo.png",
      "metallicTexture": "texture_orm.png",
      "bumpTexture": "texture_normal.png",
      "bumpTextureIntensity": 1.0,
      "useAlphaFromAlbedoTexture": false,
      "useRoughnessFromMetallicTextureGreen": true,
      "useMetallnessFromMetallicTextureBlue": true,
      "useAmbientOcclusionFromMetallicTextureRed": true,
      "backFaceCulling": true
    }
  }
}
```

## 🎯 **Cas d'Usage**

### **Développement de Jeux**
- **Prototypage de matériaux** : Test rapide des propriétés PBR
- **Validation d'assets** : Vérification des modèles 3D et textures
- **Configuration de scènes** : Ajustement des paramètres d'environnement

### **Architecture et Design**
- **Visualisation de projets** : Présentation de modèles 3D
- **Réalisme photométrique** : Rendu PBR pour la précision visuelle
- **Export de configurations** : Sauvegarde des paramètres optimaux

### **Éducation et Formation**
- **Apprentissage PBR** : Compréhension des matériaux physiques
- **Manipulation 3D** : Contrôles de caméra et navigation
- **Workflow de production** : Pipeline complet de création 3D

## 🔍 **Dépannage**

### **Problèmes Courants**

#### **Textures non visibles**
- Vérifier que les fichiers sont dans le dossier `Textures/`
- Contrôler les chemins dans `materials.json`
- Utiliser le bouton "Refresh Images" puis recharger la page

#### **Erreurs de serveur**
- Vérifier que PowerShell est autorisé à exécuter des scripts
- Contrôler que le port 8080 est libre
- Redémarrer le serveur avec `start-server.bat`

#### **Matériaux non appliqués**
- Vérifier la correspondance des noms dans `asset.json`
- Contrôler la structure des meshes (primitive0, primitive1)
- Vérifier la configuration dans `materials.json`

### **Logs et Debug**
- **Console navigateur** : Messages de chargement et erreurs
- **Terminal PowerShell** : Logs du serveur et requêtes
- **Fichiers de configuration** : Validation JSON et structure

## 🚀 **Fonctionnalités Futures**

### **Court Terme**
- [ ] Support des formats 3D supplémentaires (.fbx, .obj)
- [ ] Système d'animations et keyframes
- [ ] Gestion des LOD (Level of Detail)
- [ ] Export en formats standards (glTF, USDZ)

### **Moyen Terme**
- [ ] Système de particules et effets
- [ ] Rendu en temps réel avancé (Ray Tracing)
- [ ] Support multi-caméras et vues
- [ ] Intégration avec des moteurs de jeu

### **Long Terme**
- [ ] Éditeur de shaders personnalisés
- [ ] Système de physique et collisions
- [ ] Support VR/AR et stéréoscopie
- [ ] Pipeline de production automatisé

## 🤝 **Contribution**

### **Structure du Code**
- **Modularité** : Fonctions séparées pour chaque composant
- **Documentation** : Commentaires détaillés en français
- **Gestion d'erreurs** : Try-catch et validation des données
- **Performance** : Optimisation des rendus et chargements

### **Standards de Code**
- **Nommage** : Variables et fonctions en anglais, commentaires en français
- **Formatage** : Indentation cohérente et structure claire
- **Validation** : Vérification des types et des paramètres
- **Tests** : Validation des fonctionnalités principales

## 📄 **Licence**

MIT License - Libre d'utilisation pour projets personnels et commerciaux.

## 🙏 **Remerciements**

- **Babylon.js Team** : Moteur 3D puissant et bien documenté
- **dat.GUI** : Interface utilisateur intuitive pour les contrôles
- **Communauté 3D** : Standards PBR et formats de fichiers

---

**Version actuelle** : 2.0.0 - Éditeur PBR Complet  
**Dernière mise à jour** : Décembre 2024  
**Statut** : Production Ready ✅
