# 3D Viewer - Guide de Développement

Documentation technique complète du projet 3D Viewer avec éditeur de matériaux PBR.

## 🏗️ **Architecture du Projet**

### **Structure des Fichiers**
```
3D-Viewer/
├── index.html                 # Interface HTML principale
├── scene.js                   # Logique 3D et contrôles datGUI (principal)
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

### **Technologies Utilisées**
- **Frontend** : Babylon.js 6.x, dat.GUI, HTML5/CSS3
- **Backend** : PowerShell (serveur HTTP personnalisé)
- **Formats** : GLB/glTF, HDR, PNG/JPG
- **Architecture** : Client-Serveur avec API REST

## 🔧 **Implémentation Technique**

### **1. Système de Matériaux PBR**

#### **Fonction `createPBRMaterial`**
```javascript
function createPBRMaterial(materialConfig, scene) {
    const pbr = new BABYLON.PBRMaterial(`${materialConfig.name || "pbr"}_material`, scene);
    
    // Propriétés de base
    if (materialConfig.baseColor) {
        const color = BABYLON.Color3.FromHexString(materialConfig.baseColor);
        pbr.albedoColor = color;
    }
    
    pbr.metallic = materialConfig.metallic !== undefined ? materialConfig.metallic : 0;
    pbr.roughness = materialConfig.roughness !== undefined ? materialConfig.roughness : 0.5;
    pbr.alpha = materialConfig.alpha !== undefined ? materialConfig.alpha : 1.0;
    
    // Textures
    if (materialConfig.albedoTexture && materialConfig.albedoTexture.trim() !== '' && materialConfig.albedoTexture !== 'None') {
        pbr.albedoTexture = new BABYLON.Texture(`Textures/${materialConfig.albedoTexture}`, scene);
    }
    
    // ... autres textures
    
    // Transparence
    pbr.transparencyMode = BABYLON.PBRMaterial.PBRMATERIAL_ALPHABLEND;
    pbr.backFaceCulling = false;
    
    // Optimisations PBR
    pbr.usePhysicalLightFalloff = true;
    pbr.useEnergyConservation = true;
    pbr.useRadianceOverAlpha = false; // Correction des artefacts de transparence
    pbr.needDepthPrePass = true; // Évite les artefacts de transparence
    
    return pbr;
}
```

#### **Propriétés PBR Implémentées**
- **`albedoColor`** : Couleur de base du matériau
- **`metallic`** : Facteur métallique (0.0 - 1.0)
- **`roughness`** : Facteur de rugosité (0.0 - 1.0)
- **`alpha`** : Transparence globale (0.0 - 1.0)
- **`albedoTexture`** : Texture de couleur de base
- **`metallicTexture`** : Texture dédiée au facteur métallique
- **`microSurfaceTexture`** : Texture de rugosité
- **`ambientTexture`** : Texture d'ambient occlusion
- **`opacityTexture`** : Texture de transparence locale
- **`bumpTexture`** : Texture de relief (normal map)
- **`bumpTextureIntensity`** : Intensité du relief (0.0 - 5.0)

### **2. Interface dat.GUI**

#### **Structure des Contrôles**
```javascript
// Dossier principal des matériaux
const materialsFolder = gui.addFolder('Materials');

// Contrôles de base
baseColorControl = materialsFolder.add(materialProperties, 'baseColor').name('Albedo Color');
metallicControl = materialsFolder.add(materialProperties, 'metallic', 0, 1).step(0.01).name('Metallic');
roughnessControl = materialsFolder.add(materialProperties, 'roughness', 0, 1).step(0.01).name('Roughness');
alphaControl = materialsFolder.add(materialProperties, 'alpha', 0, 1).step(0.01).name('Alpha');

// Contrôles de textures
albedoTextureControl = materialsFolder.add(materialProperties, 'albedoTexture', availableImages).name('Albedo Texture');
metallicTextureControl = materialsFolder.add(materialProperties, 'metallicTexture', availableImages).name('Metallic Texture');
microSurfaceTextureControl = materialsFolder.add(materialProperties, 'microSurfaceTexture', availableImages).name('MicroSurface Texture');
ambientTextureControl = materialsFolder.add(materialProperties, 'ambientTexture', availableImages).name('Ambient Texture');
opacityTextureControl = materialsFolder.add(materialProperties, 'opacityTexture', availableImages).name('Opacity Texture');

// Contrôles avancés
backFaceCullingControl = materialsFolder.add(materialProperties, 'backFaceCulling').name('Back Face Culling');
inspectorControl = materialsFolder.add(inspectorToggle, 'showInspector').name('Show Inspector');
refreshImagesControl = materialsFolder.add(refreshImages, 'refresh').name('Refresh Images');
```

#### **Synchronisation Temps Réel**
```javascript
function applyMaterialChanges() {
    const selectedMaterial = materialList.selected;
    if (selectedMaterial && materialsConfig.materials[selectedMaterial]) {
        // Mise à jour de la configuration
        materialsConfig.materials[selectedMaterial].baseColor = materialProperties.baseColor;
        materialsConfig.materials[selectedMaterial].metallic = materialProperties.metallic;
        // ... autres propriétés
        
        // Application aux meshes
        loadedModels.forEach((modelData, modelName) => {
            modelData.meshes.forEach(mesh => {
                // Vérification des primitives et slots de matériaux
                const primitiveMatch = mesh.name.match(/_primitive(\d+)$/);
                if (primitiveMatch) {
                    // Logique d'application des matériaux
                    const updatedMaterial = createPBRMaterial(materialProperties, scene);
                    mesh.material = updatedMaterial;
                }
            });
        });
    }
}
```

### **3. Système de Chargement d'Assets**

#### **Configuration des Modèles**
```json
{
  "models": [
    {
      "name": "CubeSphere",
      "file": "cube-sphere.glb",
      "position": [0, 0, 0],
      "rotation": [0, 0, 0],
      "scale": [1, 1, 1],
      "visible": true,
      "meshes": [
        {
          "name": "Cube",
          "materialSlot1": "red",
          "materialSlot2": "blue"
        }
      ]
    }
  ]
}
```

#### **Chargement et Application des Matériaux**
```javascript
async function loadModel(modelConfig) {
    try {
        const result = await BABYLON.SceneLoader.ImportMeshAsync("", "Assets/", modelConfig.file, scene);
        
        result.meshes.forEach(mesh => {
            // Gestion des primitives
            const primitiveMatch = mesh.name.match(/_primitive(\d+)$/);
            if (primitiveMatch) {
                const baseMeshName = mesh.name.split('_primitive')[0];
                const primitiveIndex = parseInt(primitiveMatch[1], 10);
                
                const meshConfig = modelConfig.meshes.find(m => m.name === baseMeshName);
                if (meshConfig) {
                    const materialSlotKey = `materialSlot${primitiveIndex + 1}`;
                    const materialName = meshConfig[materialSlotKey];
                    
                    if (materialName && materialsConfig.materials[materialName]) {
                        const material = createPBRMaterial(materialsConfig.materials[materialName], scene);
                        mesh.material = material;
                    }
                }
            }
        });
        
        return { meshes: result.meshes, config: modelConfig };
    } catch (error) {
        console.error(`Error loading model ${modelConfig.file}:`, error);
        return null;
    }
}
```

### **4. Serveur PowerShell**

#### **Architecture du Serveur**
```powershell
# Configuration du serveur
$port = 8080
$rootPath = Get-Location
$server = [System.Net.HttpListener]::new()
$server.Prefixes.Add("http://localhost:$port/")

# Gestion des routes
switch ($request.Url.LocalPath) {
    "/api/textures" { 
        # Listing des textures disponibles
        $textures = Get-ChildItem "Textures" -Filter "*.png" | ForEach-Object { $_.Name }
        $response = @{ count = $textures.Count; images = $textures } | ConvertTo-Json
    }
    "/materials.json" { 
        # Sauvegarde des matériaux
        $body = $reader.ReadToEnd()
        Set-Content "Textures/materials.json" $body -Encoding UTF8
        $response = "materials.json updated successfully in $rootPath\Textures\materials.json"
    }
    default { 
        # Fichiers statiques
        $filePath = Join-Path $rootPath $request.Url.LocalPath.TrimStart('/')
        if (Test-Path $filePath) {
            $content = Get-Content $filePath -Raw -Encoding UTF8
            $response = $content
        }
    }
}
```

## 🎨 **Système de Transparence**

### **Implémentation de l'Alpha**
```javascript
// Transparence globale
pbr.alpha = materialConfig.alpha !== undefined ? materialConfig.alpha : 1.0;

// Mode de transparence
pbr.transparencyMode = BABYLON.PBRMaterial.PBRMATERIAL_ALPHABLEND;
pbr.backFaceCulling = false;

// Optimisations pour éviter les artefacts
pbr.needDepthPrePass = true;
pbr.useRadianceOverAlpha = false; // Correction des contours visibles
```

### **OpacityTexture**
```javascript
// Texture de transparence locale
if (materialConfig.opacityTexture && materialConfig.opacityTexture.trim() !== '' && materialConfig.opacityTexture !== 'None') {
    pbr.opacityTexture = new BABYLON.Texture(`Textures/${materialConfig.opacityTexture}`, scene);
    pbr.opacityTexture.getAlphaFromRGB = true; // CRUCIAL pour le fonctionnement
    
    // Quand opacityTexture est présente, ne pas définir pbr.opacity
    // Le slider alpha contrôle la transparence globale des parties visibles
} else {
    // Quand pas d'opacityTexture, utiliser alpha pour la transparence globale
    pbr.alpha = materialConfig.alpha !== undefined ? materialConfig.alpha : 1.0;
}
```

## 🔍 **Mode Inspector Babylon.js**

### **Intégration**
```javascript
// Toggle Inspector
const inspectorToggle = { showInspector: false };
const inspectorControl = materialsFolder.add(inspectorToggle, 'showInspector').name('Show Inspector').onChange(function(value) {
    if (value) {
        // Affichage de l'Inspector
        if (typeof BABYLON.Inspector !== 'undefined') {
            scene.debugLayer.show();
        } else {
            // Chargement depuis le CDN si nécessaire
            const script = document.createElement('script');
            script.src = 'https://cdn.babylonjs.com/inspector/babylon.inspector.bundle.js';
            script.onload = function() {
                scene.debugLayer.show();
            };
            document.head.appendChild(script);
        }
    } else {
        // Masquage de l'Inspector
        scene.debugLayer.hide();
    }
});
```

## 📊 **Gestion des Erreurs**

### **Validation des Données**
```javascript
// Vérification des textures
if (materialConfig.albedoTexture && materialConfig.albedoTexture.trim() !== '' && materialConfig.albedoTexture !== 'None') {
    // Chargement de la texture
} else {
    // Pas de texture
}

// Gestion des erreurs de chargement
try {
    const result = await loadModel(modelConfig);
    if (result) {
        loadedModels.set(modelConfig.name, result);
    }
} catch (error) {
    console.error(`Error loading model ${modelConfig.file}:`, error);
}
```

### **Logs et Debug**
```javascript
// Console logs pour le débogage
console.log(`🎨 Applied albedo color: ${materialConfig.baseColor}`);
console.log(`🎭 Applied opacity texture: ${materialConfig.opacityTexture}`);
console.log(`🎭 pbr.opacityTexture:`, pbr.opacityTexture);

// Gestion des erreurs de serveur
if (!response.ok) {
    throw new Error('Failed to load textures list: ' + response.status);
}
```

## 🚀 **Optimisations de Performance**

### **Rendu et Chargement**
- **`needDepthPrePass = true`** : Évite les artefacts de transparence
- **`useRadianceOverAlpha = false`** : Corrige les problèmes de contours
- **Chargement asynchrone** : Modèles et textures chargés en arrière-plan
- **Gestion des primitives** : Support automatique des sous-meshes Babylon.js

### **Mémoire et Ressources**
- **Destruction des matériaux** : Nettoyage lors des changements
- **Réutilisation des textures** : Évite les doublons
- **Gestion des meshes** : Structure optimisée pour les modèles complexes

## 🔧 **Configuration et Déploiement**

### **Variables d'Environnement**
- **Port du serveur** : 8080 (configurable dans `serve.ps1`)
- **Chemin racine** : Dossier du projet (automatique)
- **MIME types** : Support complet des formats 3D et images

### **Scripts de Démarrage**
```batch
# start-server.bat
@echo off
powershell -ExecutionPolicy Bypass -File "serve.ps1"
pause
```

```powershell
# serve.ps1
$port = 8080
$rootPath = Get-Location
# ... logique du serveur
```

## 📚 **Références et Documentation**

### **Babylon.js**
- **PBR Materials** : [Documentation officielle](https://doc.babylonjs.com/typedoc/classes/BABYLON.PBRMaterial)
- **Textures** : [Guide des textures](https://doc.babylonjs.com/features/featuresDeepDive/materials/using/textures)
- **Transparency** : [Modes de transparence](https://doc.babylonjs.com/features/featuresDeepDive/materials/using/transparency)

### **Standards PBR**
- **Physically Based Rendering** : Modèle de rendu réaliste
- **Metallic-Roughness** : Workflow PBR standard
- **Alpha Blending** : Gestion de la transparence

---

**Version de développement** : 2.1.0  
**Dernière mise à jour** : Décembre 2024  
**Statut** : Production Ready ✅
