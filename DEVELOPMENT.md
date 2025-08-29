# Guide de Développement - 3D Viewer

Ce document contient les informations techniques détaillées pour les développeurs souhaitant contribuer ou maintenir le projet.

## 🏗️ **Architecture du Projet**

### **Structure des Composants**

```
Frontend (Browser)
├── index.html          # Interface utilisateur
├── scene.js            # Logique 3D et contrôles
└── dat.GUI             # Interface de contrôle

Backend (PowerShell)
├── serve.ps1           # Serveur HTTP personnalisé
└── start-server.bat    # Script de démarrage

Configuration
├── studio.json         # Paramètres environnement/caméra
├── Assets/asset.json   # Configuration des modèles 3D
└── Textures/materials.json # Configuration des matériaux PBR
```

### **Flux de Données**

```
1. Chargement initial
   Browser → serve.ps1 → Fichiers de configuration → scene.js

2. Modification des paramètres
   dat.GUI → scene.js → applyMaterialChanges() → PBR Materials

3. Export des données
   scene.js → fetch() → serve.ps1 → Écriture fichiers JSON
```

## 🔧 **Technologies Utilisées**

### **Frontend**
- **Babylon.js 6.x** : Moteur 3D principal
  - `PBRMaterial` : Matériaux physiquement réalistes
  - `ArcRotateCamera` : Caméra orbitale
  - `SceneLoader.ImportMeshAsync` : Chargement de modèles
  - `HDRCubeTexture` : Environnement HDR

- **dat.GUI** : Interface de contrôle
  - Contrôles dynamiques (création/suppression)
  - Synchronisation avec les données
  - Gestion des événements onChange

- **JavaScript ES6+**
  - Async/await pour les opérations asynchrones
  - Fetch API pour la communication HTTP
  - Classes et modules ES6

### **Backend**
- **PowerShell 5.1+**
  - `HttpListener` : Serveur HTTP natif
  - `Get-ChildItem` : Listing des fichiers
  - `Join-Path` : Gestion des chemins
  - `ConvertTo-Json` / `ConvertFrom-Json` : Sérialisation

## 📁 **Gestion des Fichiers**

### **Système de Configuration**

#### **studio.json**
```json
{
  "environment": {
    "backgroundColor": "#ffffff",
    "hdrExposure": 1.0,
    "orientation": 0
  },
  "camera": {
    "alpha": 0,           // Yaw en radians
    "beta": 1.047,        // Pitch en radians
    "radius": 10,         // Distance
    "fov": 60,            // Field of View
    "minDistance": 1,     // Limite de zoom min
    "maxDistance": 50,    // Limite de zoom max
    "targetX": 0,         // Position cible X
    "targetY": 0,         // Position cible Y
    "targetZ": 0,         // Position cible Z
    "showTarget": true    // Visibilité de la cible
  }
}
```

#### **Assets/asset.json**
```json
{
  "models": [
    {
      "name": "NomDuModele",
      "file": "fichier.glb",
      "position": [x, y, z],
      "rotation": [x, y, z],
      "scale": [x, y, z],
      "visible": true,
      "meshes": [
        {
          "name": "NomDuMesh",
          "materialSlot1": "nom_materiau_1",
          "materialSlot2": "nom_materiau_2"
        }
      ]
    }
  ]
}
```

#### **Textures/materials.json**
```json
{
  "materials": {
    "nom_materiau": {
      "type": "pbr",
      "baseColor": "#ff0000",
      "metallic": 0.8,
      "roughness": 0.2,
      "alpha": 1.0,
      "albedoTexture": "texture.png",
      "metallicTexture": "orm.png",
      "bumpTexture": "normal.png",
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

## 🎨 **Système de Matériaux PBR**

### **Propriétés PBR**

#### **Propriétés de Base**
- **`baseColor`** : Couleur de base (hex string)
- **`metallic`** : Facteur métallique (0.0 - 1.0)
- **`roughness`** : Facteur de rugosité (0.0 - 1.0)
- **`alpha`** : Transparence (0.0 - 1.0)

#### **Textures**
- **`albedoTexture`** : Couleur et détail de surface
- **`metallicTexture`** : Texture ORM (Occlusion, Roughness, Metallic)
- **`bumpTexture`** : Relief et normal mapping

#### **Options Avancées**
- **`useAlphaFromAlbedoTexture`** : Canal alpha de la texture albedo
- **`useRoughnessFromMetallicTextureGreen`** : Rugosité depuis canal G
- **`useMetallnessFromMetallicTextureBlue`** : Métallique depuis canal B
- **`useAmbientOcclusionFromMetallicTextureRed`** : AO depuis canal R
- **`bumpTextureIntensity`** : Intensité du relief (0.0 - 5.0)
- **`backFaceCulling`** : Masquage des faces arrière

### **Application des Matériaux**

```javascript
// Création d'un matériau PBR
const pbr = new BABYLON.PBRMaterial(`${mesh.name}_material`, scene);

// Propriétés de base
pbr.albedoColor = BABYLON.Color3.FromHexString(materialConfig.baseColor);
pbr.metallic = materialConfig.metallic;
pbr.roughness = materialConfig.roughness;
pbr.alpha = materialConfig.alpha;

// Textures
if (materialConfig.albedoTexture) {
    pbr.albedoTexture = new BABYLON.Texture(`Textures/${materialConfig.albedoTexture}`, scene);
}

// Options avancées
pbr.usePhysicalLightFalloff = true;
pbr.useEnergyConservation = true;
```

## 🎥 **Système de Caméra**

### **Caméra ArcRotate**

```javascript
// Création de la caméra
camera = new BABYLON.ArcRotateCamera("camera", alpha, beta, radius, target, scene);

// Propriétés configurables
camera.fov = config.camera.fov;                    // Field of View
camera.lowerRadiusLimit = config.camera.minDistance; // Distance min
camera.upperRadiusLimit = config.camera.maxDistance; // Distance max
camera.target = new BABYLON.Vector3(x, y, z);     // Position cible
```

### **Contrôles de Cible**

```javascript
// Création de l'indicateur de cible
function createTargetVisual(scene, target) {
    const targetGroup = new BABYLON.TransformNode("targetGroup", scene);
    targetGroup.position = target;
    
    // Flèches directionnelles
    const xArrow = BABYLON.MeshBuilder.CreateCylinder("xArrow", {...}, scene);
    const yArrow = BABYLON.MeshBuilder.CreateCylinder("yArrow", {...}, scene);
    const zArrow = BABYLON.MeshBuilder.CreateCylinder("zArrow", {...}, scene);
    
    // Positionnement relatif au groupe
    xArrow.parent = targetGroup;
    yArrow.parent = targetGroup;
    zArrow.parent = targetGroup;
    
    return targetGroup;
}
```

## 🌍 **Environnement et Éclairage**

### **HDR Environment**

```javascript
// Chargement de la texture HDR
const hdrTexture = new BABYLON.HDRCubeTexture("Textures/HDR/default.hdr", scene, 512, false, false, false, true);

// Application à la scène
scene.environmentTexture = hdrTexture;
scene.environmentIntensity = config.environment.hdrExposure;

// Orientation de l'environnement
hdrTexture.setReflectionTextureMatrix(
    BABYLON.Matrix.RotationY(BABYLON.Tools.ToRadians(config.environment.orientation))
);
```

### **Background et Éclairage**

```javascript
// Couleur de fond
scene.clearColor = BABYLON.Color4.FromHexString(config.environment.backgroundColor);

// Intensité de l'environnement
scene.environmentIntensity = config.environment.hdrExposure;
```

## 💾 **Système d'Export**

### **Architecture Client-Serveur**

#### **Client (JavaScript)**
```javascript
// Export des matériaux
const exportMaterials = {
    export: async function() {
        const jsonContent = JSON.stringify(materialsConfig, null, 2);
        
        const res = await fetch('materials.json?path=Textures', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: jsonContent
        });
        
        if (!res.ok) throw new Error('Save failed: ' + res.status);
    }
};
```

#### **Serveur (PowerShell)**
```powershell
# Gestion des requêtes POST
elseif ($request.HttpMethod -eq 'POST') {
    $body = [System.IO.StreamReader]::new($request.InputStream).ReadToEnd();
    $jsonData = $body | ConvertFrom-Json;
    
    # Détermination du fichier cible
    $path = $request.Url.LocalPath.TrimStart('/');
    $query = $request.Url.Query;
    
    if ($path -eq 'materials.json' -and $query -eq '?path=Textures') {
        $targetPath = Join-Path $PSScriptRoot "Textures" "materials.json";
        [System.IO.File]::WriteAllText($targetPath, $body);
    }
}
```

### **Gestion des Erreurs**

```javascript
// Gestion des erreurs côté client
try {
    const result = await res.json();
    console.log("✅ Export réussi:", result.message);
} catch (error) {
    console.error("❌ Export échoué:", error);
}

// Gestion des erreurs côté serveur
try {
    [System.IO.File]::WriteAllText($targetPath, $body);
    $response.StatusCode = 200;
} catch {
    $response.StatusCode = 500;
    $errorMsg = '{"status":"error","message":"' + $_.Exception.Message + '"}';
}
```

## 🔍 **Debug et Logging**

### **Console Browser**

```javascript
// Logs de chargement
console.log(`✅ Modèle ${modelConfig.name} chargé avec succès`);

// Logs de matériaux
console.log(`✅ Texture albedo chargée: ${materialProperties.albedoTexture}`);

// Logs d'erreur
console.error(`❌ Échec du chargement du modèle ${modelConfig.name}:`, error);
```

### **Terminal PowerShell**

```powershell
# Logs de requêtes
Write-Host "GET $path"

# Logs de traitement
Write-Host "Listed $($imageFiles.Count) texture files"

# Logs d'erreur
Write-Host "Error updating materials.json: $($_.Exception.Message)"
```

### **Validation des Données**

```javascript
// Vérification de la configuration
if (!assetConfig || !assetConfig.models) {
    console.warn("Configuration d'assets invalide, utilisation des valeurs par défaut");
    return;
}

// Validation des matériaux
if (materialName && materialsConfig.materials[materialName]) {
    applyMaterial(mesh, materialsConfig.materials[materialName]);
} else {
    console.warn(`Matériau ${materialName} non trouvé pour ${mesh.name}`);
}
```

## 🚀 **Optimisations et Performance**

### **Gestion de la Mémoire**

```javascript
// Nettoyage des textures
if (mesh.material.albedoTexture) {
    mesh.material.albedoTexture.dispose();
    mesh.material.albedoTexture = null;
}

// Mise à jour des matériaux
scene.markAllMaterialsAsDirty(BABYLON.Material.TextureDirtyFlag);
```

### **Chargement Asynchrone**

```javascript
// Chargement séquentiel des configurations
await loadConfig();
await loadAssetConfig();
await loadMaterialsConfig();

// Chargement des modèles après la création de la scène
await loadModels();
```

### **Gestion des Ressources**

```javascript
// Vérification de l'existence des fichiers
const response = await fetch('Assets/asset.json');
if (response.ok) {
    assetConfig = await response.json();
} else {
    console.warn("Impossible de charger asset.json, utilisation des valeurs par défaut");
}
```

## 🧪 **Tests et Validation**

### **Tests de Fonctionnalités**

1. **Chargement des modèles**
   - Vérifier que les fichiers GLB se chargent correctement
   - Valider l'application des matériaux
   - Tester les transformations (position, rotation, scale)

2. **Éditeur de matériaux**
   - Vérifier la synchronisation datGUI ↔ materials.json
   - Tester l'application des textures
   - Valider l'export des configurations

3. **Contrôles de caméra**
   - Tester les limites de zoom
   - Valider le positionnement de la cible
   - Vérifier l'export des paramètres

### **Tests de Performance**

- **Chargement initial** : < 5 secondes
- **Application de matériaux** : < 100ms
- **Export des données** : < 500ms
- **Mémoire utilisée** : < 500MB pour scènes complexes

## 🔧 **Maintenance et Mise à Jour**

### **Mise à Jour de Babylon.js**

```html
<!-- Mise à jour de la version CDN -->
<script src="https://cdn.babylonjs.com/babylon.js"></script>
<script src="https://cdn.babylonjs.com/loaders/babylonjs.loaders.min.js"></script>
```

### **Compatibilité des Navigateurs**

- **Chrome** : 80+
- **Firefox** : 75+
- **Safari** : 13+
- **Edge** : 80+

### **Dépendances PowerShell**

- **PowerShell** : 5.1+
- **Modules** : Aucun module externe requis
- **Permissions** : ExecutionPolicy Bypass pour serve.ps1

## 📚 **Ressources et Références**

### **Documentation Babylon.js**
- [PBR Materials](https://doc.babylonjs.com/features/featuresDeepDive/materials/using/introToPBR)
- [Camera Controls](https://doc.babylonjs.com/features/featuresDeepDive/cameras/camera_introduction)
- [Model Loading](https://doc.babylonjs.com/features/featuresDeepDive/importers/loadingFileTypes)

### **Standards PBR**
- [Physically Based Rendering](https://en.wikipedia.org/wiki/Physically_based_rendering)
- [glTF Materials](https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#materials)

### **Outils de Développement**
- **Babylon.js Sandbox** : Test des matériaux et modèles
- **PowerShell ISE** : Développement et debug des scripts
- **Chrome DevTools** : Debug JavaScript et WebGL

---

**Dernière mise à jour** : Décembre 2024  
**Version du document** : 2.0.0  
**Mainteneur** : Équipe de développement 3D Viewer
