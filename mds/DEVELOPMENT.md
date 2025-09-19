# 3D Viewer - Guide de Développement

Documentation technique complète du projet 3D Viewer avec éditeur de matériaux PBR et système de tags.

## 🏗️ **Architecture du Projet**

### **Structure des Fichiers**
```
3D-Viewer/
├── index.html                 # Interface HTML principale avec contrôles de tags et polices
├── scene.js                   # Logique 3D, contrôles personnalisés, TagManager
├── tweakpaneManager.js        # Interface utilisateur Tweakpane moderne
├── engravingManager.js        # Gestionnaire de gravure dynamique avec polices
├── styles.css                 # Styles CSS avec polices personnalisées
├── serve.ps1                  # Serveur PowerShell HTTP
├── start-server.bat           # Script de démarrage Windows
├── studio.json                # Configuration environnement/caméra
├── Assets/
│   ├── asset.js              # Configuration des modèles 3D et tags
│   ├── cubes.glb             # Modèle de test avec meshes multiples
│   └── part.glb              # Modèle de test avec gravure
├── Textures/
│   ├── materials.json         # Configuration des matériaux PBR avec héritage
│   ├── HDR/
│   │   └── default.hdr       # Environnement HDR
│   └── [autres textures]     # Textures PBR (PNG, JPG, etc.)
└── Fonts/
    ├── stencil.ttf            # Police Stencil pour gravure
    ├── futuristic.otf         # Police Futuristic pour gravure
    └── western.ttf            # Police Western pour gravure
```

### **Technologies Utilisées**
- **Frontend** : Babylon.js 8.x, Tweakpane v4, HTML5/CSS3
- **Backend** : PowerShell (serveur HTTP personnalisé)
- **Formats** : GLB/glTF, HDR, PNG/JPG
- **Architecture** : Client-Serveur avec API REST
- **Animations** : Système d'animation étape par étape avec Promises

### **Architecture Modulaire**

#### **Séparation des Responsabilités**
- **`scene.js`** : Logique 3D, contrôles de caméra personnalisés, chargement des modèles, classe TagManager
- **`tweakpaneManager.js`** : Interface utilisateur Tweakpane moderne, gestion des matériaux avec héritage, contrôles d'environnement
- **`engravingManager.js`** : Gestionnaire de gravure dynamique, génération de textures, gestion des polices personnalisées
- **`styles.css`** : Styles CSS avec déclarations `@font-face` pour les polices personnalisées
- **`studio.json`** : Configuration persistante de la caméra, de l'environnement et des viewpoints
- **`Assets/asset.js`** : Configuration centralisée des modèles 3D, tags de visibilité et configurations de matériaux
- **`index.html`** : Interface utilisateur pour le contrôle des tags, configurations et sélection de polices
- **`serve.ps1`** : Serveur PowerShell HTTP avec API REST pour export et gestion des textures

#### **Classe TweakpaneManager**
```javascript
class TweakpaneManager {
    constructor(scene, config) {
        this.scene = scene;
        this.config = config;
        this.pane = null;
        this.materialsFolder = null;
        this.cameraFolder = null;
        this.environmentFolder = null;
        this.materialsConfig = null;
        this.isLoading = false;
        this.materialInstances = {};
        
        // Paramètre pour contrôler l'état d'ouverture par défaut de Tweakpane
        this.tweakpaneOpenByDefault = false; // Changez true/false pour ouvrir/fermer Tweakpane par défaut
        
        // Gestion des viewpoints
        this.viewpoints = {};
        this.selectedViewpoint = 'Viewpoint1';
    }
    
    async init() {
        // Initialisation complète de l'interface Tweakpane
        await this.loadMaterialsConfig();
        this.createGUI();
        await this.createMaterialsFolder();
        this.createCameraFolder();
        this.createEnvironmentFolder();
    }
    
    async createMaterialControls() {
        // Contrôles des matériaux PBR avec color picker
    }
    
    createCameraControls() {
        // Contrôles de caméra avec "Initial Pitch"
    }
    
    createEnvironmentControls() {
        // Contrôles d'environnement
    }
    
    createCameraFolder() {
        // Contrôles de caméra avec viewpoints et synchronisation temps réel
    }
    
    loadStudioViewpoints() {
        // Chargement des viewpoints depuis studio.json
    }
    
    async updateAppliedMaterials() {
        // Mise à jour temps réel des matériaux concernés uniquement
    }
}
```

#### **Classe EngravingManager**
```javascript
class EngravingManager {
    constructor(scene, assetConfig) {
        this.scene = scene;
        this.assetConfig = assetConfig;
        this.alphaDT = null;
        this.aoDT = null;
        this.normalDT = null;
        this.text = '';
        this.aspectOverride = null;
        this.blurPercent = 10; // Contrôle centralisé du flou
        
        // Configuration des polices personnalisées
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
        this.currentFont = 'Stencil';
    }
    
    async setFont(fontName) {
        // Chargement asynchrone des polices avec vérification Canvas
    }
    
    setText(text) {
        // Mise à jour du texte et gestion de la visibilité
    }
    
    update() {
        // Génération des textures alpha, ambient occlusion et normal maps
    }
    
    buildNormalFromAO(aoDT) {
        // Génération de normal map à partir de l'ambient occlusion
    }
}
```

## 🔧 **Implémentation Technique**

### **1. Système de Points de Vue (Viewpoints)**

#### **Configuration dans studio.json**
```json
{
  "viewpoints": {
    "Viewpoint1": {
      "alpha": 0,
      "beta": 1.2,
      "radius": 10.0,
      "fov": 50,
      "targetX": 0,
      "targetY": 0,
      "targetZ": 0,
      "minDistance": 1.0,
      "maxDistance": 100.0
    },
    "Viewpoint2": {
      "alpha": 180,
      "beta": 1.2,
      "radius": 15.0,
      "fov": 75,
      "targetX": 2,
      "targetY": 1,
      "targetZ": 0,
      "minDistance": 2.0,
      "maxDistance": 50.0
    }
  }
}
```

#### **Animation Étape par Étape**
```javascript
async function animateToViewpoint(vp, totalDurationMs = 1000) {
    if (!vp || !camera) return;
    
    // Durées par étape (ordre optimisé)
    const dAlpha = Math.round(totalDurationMs * 1.0);      // 25% - Alpha en premier
    const dFov = Math.round(totalDurationMs * 0.15);       // 15% - FOV
    const dTarget = Math.round(totalDurationMs * 0.25);    // 25% - Target
    const dMin = Math.round(totalDurationMs * 0.05);       // 5% - MinDistance
    const dRadius = Math.round(totalDurationMs * 0.2);     // 20% - Radius
    const dMax = Math.round(totalDurationMs * 0.1);        // 10% - MaxDistance
    
    // 1) Alpha avec gestion circulaire
    await animateAlphaCircular(startAlpha, targetAlpha, dAlpha);
    
    // 2) FOV avec conversion degrés/radians
    await animateScalar(startFov, targetFov, (v) => { camera.fov = v; }, dFov);
    
    // 3) Target (position de la caméra)
    await animateVector3(startTarget, targetTarget, (v) => { camera.target = v; }, dTarget);
    
    // 4) MinDistance (limite inférieure)
    if (vp.minDistance !== undefined) {
        await animateScalar(fromMin, targetMin, (v) => { camera.lowerRadiusLimit = v; }, dMin);
    }
    
    // 5) Radius (distance actuelle, respectant les nouvelles limites)
    const clampedTargetRadius = clamp(targetRadius, minL, maxL);
    await animateScalar(startRadius, clampedTargetRadius, (v) => { camera.radius = v; }, dRadius);
    
    // 6) MaxDistance (limite supérieure)
    if (vp.maxDistance !== undefined) {
        await animateScalar(fromMax, targetMax, (v) => { camera.upperRadiusLimit = v; }, dMax);
    }
}
```

#### **Fonctions d'Animation Modulaires**
```javascript
function animateScalar(from, to, setter, durationMs = 400, easing = (t) => 1 - Math.pow(1 - t, 3)) {
    return new Promise(resolve => {
        if (from === to || durationMs <= 0) { setter(to); return resolve(); }
        const t0 = performance.now();
        const tick = () => {
            const now = performance.now();
            const t = Math.min(1, (now - t0) / durationMs);
            const k = easing(t);
            const v = from + (to - from) * k;
            setter(v);
            if (t < 1) requestAnimationFrame(tick); else resolve();
        };
        requestAnimationFrame(tick);
    });
}

function animateAlphaCircular(fromRad, toRad, durationMs = 400) {
    const start = normalizeRadTau(fromRad);
    const target = shortestAnglePositive(start, toRad);
    return animateScalar(0, 1, (k) => {
        const v = normalizeRadTau(start + (target - start) * k);
        camera.alpha = v;
    }, durationMs);
}

function animateVector3(from, to, setter, durationMs = 400, easing = (t) => 1 - Math.pow(1 - t, 3)) {
    return new Promise(resolve => {
        const t0 = performance.now();
        const tick = () => {
            const now = performance.now();
            const t = Math.min(1, (now - t0) / durationMs);
            const k = easing(t);
            const x = from.x + (to.x - from.x) * k;
            const y = from.y + (to.y - from.y) * k;
            const z = from.z + (to.z - from.z) * k;
            setter(new BABYLON.Vector3(x, y, z));
            if (t < 1) requestAnimationFrame(tick); else resolve();
        };
        requestAnimationFrame(tick);
    });
}
```

#### **Gestion des Angles Circulaires**
```javascript
function normalizeRadTau(rad) {
    // Normaliser un angle en radians vers [0, 2π)
    while (rad < 0) rad += 2 * Math.PI;
    while (rad >= 2 * Math.PI) rad -= 2 * Math.PI;
    return rad;
}

function shortestAnglePositive(a, b) {
    // Calculer le plus court chemin pour l'interpolation circulaire
    const delta = b - a;
    if (delta > Math.PI) return a + delta - 2 * Math.PI;
    if (delta < -Math.PI) return a + delta + 2 * Math.PI;
    return b;
}

function clamp(val, min, max) { 
    return Math.max(min, Math.min(max, val)); 
}
```

### **2. Contrôles de Caméra Personnalisés**

#### **Désactivation des Contrôles Par Défaut**
```javascript
// Désactiver les contrôles par défaut de la caméra
camera.attachControl(canvas, false);

// Variables pour les contrôles personnalisés
let isMouseDown = false;
let lastMouseX = 0;
let lastMouseY = 0;
let isRightClick = false;

// Variables pour la rotation des objets avec limites
let currentObjectRotationX = 0;
const minObjectRotationX = -Math.PI/2; // -90 degrés
const maxObjectRotationX = Math.PI/2;   // +90 degrés

// Variables pour l'élasticité de rotation des objets
let targetObjectRotationX = 0;
let objectRotationElasticityEnabled = true;
```

#### **Gestion des Événements de Souris**
```javascript
scene.onPointerObservable.add((evt) => {
    if (evt.type === BABYLON.PointerEventTypes.POINTERDOWN) {
        isMouseDown = true;
        lastMouseX = evt.event.clientX;
        lastMouseY = evt.event.clientY;
        isRightClick = evt.event.button === 2;
    }
    
    if (evt.type === BABYLON.PointerEventTypes.POINTERUP) {
        isMouseDown = false;
        isRightClick = false;
        objectRotationElasticityEnabled = true;
    }
    
    if (evt.type === BABYLON.PointerEventTypes.POINTERMOVE && isMouseDown) {
        const deltaX = evt.event.clientX - lastMouseX;
        const deltaY = evt.event.clientY - lastMouseY;
        
        // Ignorer le clic droit (pan désactivé)
        if (isRightClick) return;
        
        // Mouvement horizontal : contrôler alpha (yaw) de la caméra
        if (Math.abs(deltaX) > 0) {
            const alphaSensitivity = 0.006;
            camera.alpha -= deltaX * alphaSensitivity; // Inversé
            config.camera.alpha = camera.alpha;
        }
        
        // Mouvement vertical : rotation des objets sur l'axe X
        if (Math.abs(deltaY) > 0) {
            const objectRotationSensitivity = 0.006;
            const rotationDelta = -deltaY * objectRotationSensitivity; // Inversé
            
            const newRotationX = currentObjectRotationX + rotationDelta;
            const clampedRotationX = Math.max(minObjectRotationX, Math.min(maxObjectRotationX, newRotationX));
            
            // Appliquer aux objets
            if (window.loadedModels) {
                window.loadedModels.forEach((modelData, modelName) => {
                    if (modelData.group) {
                        modelData.group.rotation.x = clampedRotationX;
                    }
                });
            }
            
            currentObjectRotationX = clampedRotationX;
            objectRotationElasticityEnabled = false;
        }
        
        lastMouseX = evt.event.clientX;
        lastMouseY = evt.event.clientY;
    }
});
```

#### **Élasticité de Rotation des Objets**
```javascript
scene.onBeforeRenderObservable.add(() => {
    // Zoom interpolation
    if (Math.abs(currentRadius - targetRadius) > 0.01) {
        const delta = targetRadius - currentRadius;
        const easing = 0.1;
        currentRadius += delta * easing;
        
        if ((delta > 0 && currentRadius > targetRadius) || 
            (delta < 0 && currentRadius < targetRadius)) {
            currentRadius = targetRadius;
        }
        
        camera.radius = currentRadius;
    }
    
    // Object rotation elasticity - retour à 0° quand la souris est relâchée
    if (objectRotationElasticityEnabled && !isMouseDown && Math.abs(currentObjectRotationX - targetObjectRotationX) > 0.001) {
        const rotationDelta = targetObjectRotationX - currentObjectRotationX;
        const elasticityFactor = 0.1;
        
        currentObjectRotationX += rotationDelta * elasticityFactor;
        
        if (window.loadedModels) {
            window.loadedModels.forEach((modelData, modelName) => {
                if (modelData.group) {
                    modelData.group.rotation.x = currentObjectRotationX;
                }
            });
        }
    }
});
```

### **3. Interface Tweakpane avec Viewpoints**

#### **Menu Camera avec Viewpoints**
```javascript
createCameraFolder() {
    this.cameraFolder = this.pane.addFolder({ title: 'Camera', expanded: false });
    
    // Charger les viewpoints depuis studio.json
    this.loadStudioViewpoints();
    
    // Contrôles de caméra avec synchronisation temps réel
    this.cameraFolder.addInput(this.cameraData, 'alpha', {
        min: 0,
        max: 360,
        step: 0.1,
        label: 'Alpha (Yaw)'
    }).on('change', (ev) => {
        this.updateCameraAlpha(ev.value);
    });
    
    this.cameraFolder.addInput(this.cameraData, 'radius', {
        min: 1.0,
        max: 100.0,
        step: 0.1,
        label: 'Distance'
    }).on('change', (ev) => {
        this.updateCameraRadius(ev.value);
    });
    
    this.cameraFolder.addInput(this.cameraData, 'fov', {
        min: 10,
        max: 120,
        step: 0.1,
        label: 'FOV (Field of View)'
    }).on('change', (ev) => {
        this.updateCameraFOV(ev.value);
    });
    
    // Sélecteur de viewpoints
    this.cameraFolder.addInput(this, 'selectedViewpoint', {
        label: 'Viewpoint',
        options: this.viewpoints
    }).on('change', (ev) => {
        if (window.gotoViewpoint) {
            window.gotoViewpoint(ev.value);
        }
    });
    
    // Bouton d'export des paramètres de caméra
    this.cameraFolder.addButton({ title: 'Export Camera Params' }).on('click', () => {
        this.exportCameraParams();
    });
}

async loadStudioViewpoints() {
    try {
        const response = await fetch('/studio.json');
        const config = await response.json();
        
        if (config.viewpoints) {
            this.viewpoints = {};
            Object.keys(config.viewpoints).forEach(key => {
                this.viewpoints[key] = key;
            });
        }
    } catch (error) {
        console.error('Error loading viewpoints:', error);
    }
}

exportCameraParams() {
    const camera = this.scene.activeCamera;
    const viewpointData = {
        alpha: BABYLON.Tools.ToDegrees(camera.alpha),
        beta: camera.beta,
        radius: camera.radius,
        fov: BABYLON.Tools.ToDegrees(camera.fov),
        targetX: camera.target.x,
        targetY: camera.target.y,
        targetZ: camera.target.z,
        minDistance: camera.lowerRadiusLimit,
        maxDistance: camera.upperRadiusLimit
    };
    
    // Sauvegarder dans studio.json
    this.saveViewpointToStudio(this.selectedViewpoint, viewpointData);
}
```

#### **Synchronisation Temps Réel**
```javascript
// Synchronisation des valeurs de caméra vers Tweakpane
syncCameraToTweakpane() {
    const camera = this.scene.activeCamera;
    
    this.cameraData.alpha = BABYLON.Tools.ToDegrees(camera.alpha);
    this.cameraData.beta = camera.beta;
    this.cameraData.radius = camera.radius;
    this.cameraData.fov = BABYLON.Tools.ToDegrees(camera.fov);
    this.cameraData.targetX = camera.target.x;
    this.cameraData.targetY = camera.target.y;
    this.cameraData.targetZ = camera.target.z;
    this.cameraData.minDistance = camera.lowerRadiusLimit;
    this.cameraData.maxDistance = camera.upperRadiusLimit;
    
    this.pane.refresh();
}

// Conversion degrés/radians pour les contrôles
updateCameraAlpha(degrees) {
    const radians = BABYLON.Tools.ToRadians(degrees);
    this.scene.activeCamera.alpha = radians;
}

updateCameraFOV(degrees) {
    const radians = BABYLON.Tools.ToRadians(degrees);
    this.scene.activeCamera.fov = radians;
}
```

### **4. Contrôle "Initial Pitch"**

#### **Configuration dans studio.json**
```json
{
  "camera": {
    "alpha": -0.8726646259971648,
    "beta": 1.20,
    "radius": 10.151602452001644,
    "lowerBetaLimit": 1.20,
    "upperBetaLimit": 1.20,
    "initialPitch": 68.75
  }
}
```

#### **Application dans scene.js**
```javascript
// Appliquer les limites beta selon initialPitch
if (config.camera.initialPitch !== undefined) {
    const pitchRadians = BABYLON.Tools.ToRadians(config.camera.initialPitch);
    camera.beta = pitchRadians;
    camera.lowerBetaLimit = pitchRadians;
    camera.upperBetaLimit = pitchRadians;
} else if (config.camera.lowerBetaLimit !== undefined && config.camera.upperBetaLimit !== undefined) {
    camera.lowerBetaLimit = config.camera.lowerBetaLimit;
    camera.upperBetaLimit = config.camera.upperBetaLimit;
}
```

#### **Contrôle dat.GUI**
```javascript
// Initial Pitch control - Contrôle l'angle initial de la caméra
const initialPitch = { pitch: this.config.camera.initialPitch !== undefined ? this.config.camera.initialPitch : 0 };
this.cameraFolder.add(initialPitch, 'pitch', -90, 90).name('Initial Pitch').onChange((value) => {
    const pitchRadians = BABYLON.Tools.ToRadians(value);
    
    // Mettre à jour la caméra
    this.scene.activeCamera.beta = pitchRadians;
    this.scene.activeCamera.lowerBetaLimit = pitchRadians;
    this.scene.activeCamera.upperBetaLimit = pitchRadians;
    
    // Mettre à jour la config
    this.config.camera.initialPitch = value;
    this.config.camera.beta = pitchRadians;
    this.config.camera.lowerBetaLimit = pitchRadians;
    this.config.camera.upperBetaLimit = pitchRadians;
    
    if (this.onCameraChange) {
        this.onCameraChange('initialPitch', value);
    }
});
```

### **5. Système de Visibilité par Mesh**

#### **Configuration dans Assets/asset.js**
```javascript
const assetConfiguration = {
    models: [
        {
            name: "CubeSphere",
            file: "cube-sphere.glb",
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
            meshes: [
                {
                    name: "Cube",
                    visible: true,  // Contrôle individuel de visibilité
                    materialSlot1: "red",
                    materialSlot2: "blue"
                },
                {
                    name: "Sphere",
                    visible: false, // Mesh caché
                    materialSlot1: "green"
                }
            ]
        }
    ]
};
```

#### **Application dans scene.js**
```javascript
async function loadModels() {
    if (!assetConfig || !assetConfig.models) return;
    
    for (const modelConfig of assetConfig.models) {
        try {
            const result = await BABYLON.SceneLoader.ImportMeshAsync("", "Assets/", modelConfig.file, scene);
            
            // Créer un groupe pour le modèle
            const modelGroup = new BABYLON.TransformNode(`${modelConfig.name}_group`, scene);
            modelGroup.position = new BABYLON.Vector3(...modelConfig.position);
            modelGroup.rotation = new BABYLON.Vector3(...modelConfig.rotation);
            modelGroup.scaling = new BABYLON.Vector3(...modelConfig.scale);
            
            // Appliquer la visibilité par mesh
            result.meshes.forEach(mesh => {
                const primitiveMatch = mesh.name.match(/_primitive(\d+)$/);
                if (primitiveMatch) {
                    const baseMeshName = mesh.name.split('_primitive')[0];
                    const meshConfig = modelConfig.meshes.find(m => m.name === baseMeshName);
                    
                    if (meshConfig && meshConfig.visible !== undefined) {
                        mesh.isVisible = meshConfig.visible;
                    }
                }
            });
            
            // ... reste du code de chargement
        } catch (error) {
            console.error(`Error loading model ${modelConfig.file}:`, error);
        }
    }
}
```

### **6. Contrôle de Visibilité de Tweakpane**

#### **Variable de Contrôle dans scene.js**
```javascript
// Contrôle de visibilité de Tweakpane - Changez true/false ici
let tweakpaneVisible = true;
```

#### **Application lors de l'Initialisation**
```javascript
// Initialiser l'interface
await tweakpaneManager.init();

// Appliquer la visibilité selon la variable tweakpaneVisible
if (!tweakpaneVisible) {
    tweakpaneManager.setTweakpaneVisibility(false);
}

// Rendre le gestionnaire accessible globalement
window.tweakpaneManager = tweakpaneManager;
```

#### **Méthodes Publiques dans tweakpaneManager.js**
```javascript
// Méthode publique pour activer/désactiver Tweakpane depuis l'extérieur
setTweakpaneVisibility(show) {
    this.toggleTweakpaneVisibility(show);
}

// Méthode publique pour obtenir l'état de visibilité de Tweakpane
isTweakpaneVisible() {
    return this.pane && this.pane.element && this.pane.element.style.display !== 'none';
}

// Fonction pour activer/désactiver la visibilité de Tweakpane
toggleTweakpaneVisibility(show) {
    if (this.pane && this.pane.element) {
        if (show) {
            this.pane.element.style.display = 'block';
        } else {
            this.pane.element.style.display = 'none';
        }
    }
}
```

### **7. Système de Matériaux PBR**

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

### **8. Interface Tweakpane**

#### **Structure des Contrôles**
```javascript
// Dossier principal des matériaux
const materialsFolder = pane.addFolder({ title: 'Materials', expanded: true });

// Contrôles de base avec color picker
this.baseColorDisplay = { hex: '#ffffff' };
materialsFolder.addInput(this.baseColorDisplay, 'hex', {
    label: 'Base Color',
    color: { type: 'float' }
}).on('change', (ev) => {
    this.updateRGBFromHex(ev.value);
    this.applyMaterialChanges();
});

// Contrôles numériques
materialsFolder.addInput(this.materialProperties, 'metallic', {
    label: 'Metallic',
    min: 0,
    max: 1,
    step: 0.01
}).on('change', () => this.applyMaterialChanges());

materialsFolder.addInput(this.materialProperties, 'roughness', {
    label: 'Roughness',
    min: 0,
    max: 1,
    step: 0.01
}).on('change', () => this.applyMaterialChanges());

// Contrôles de textures dynamiques
const availableImages = await this.getAvailableImages();
materialsFolder.addInput(this.materialProperties, 'albedoTexture', {
    label: 'Albedo Texture',
    options: availableImages
}).on('change', () => this.applyMaterialChanges());

// Contrôles avancés
materialsFolder.addInput(this.materialProperties, 'backFaceCulling', {
    label: 'Back Face Culling'
}).on('change', () => this.applyMaterialChanges());
```

#### **Synchronisation Temps Réel**
```javascript
async applyMaterialChanges() {
    if (this.isLoading) return; // Prévenir les mises à jour pendant le chargement
    
    const selectedMaterial = this.materialList.selected;
    if (selectedMaterial && this.materialsConfig.materials[selectedMaterial]) {
        // Mise à jour de la configuration
        this.materialsConfig.materials[selectedMaterial].baseColor = this.materialProperties.baseColor;
        this.materialsConfig.materials[selectedMaterial].metallic = this.materialProperties.metallic;
        // ... autres propriétés
        
        // Déclencher la mise à jour temps réel
        if (this.onMaterialChange) {
            this.onMaterialChange('properties', {
                materialName: selectedMaterial,
                properties: this.materialProperties
            });
        }
    }
}

async updateAppliedMaterials() {
    if (this.isLoading) return;
    
    const selectedMaterial = this.materialList.selected;
    const scene = window.tagManager?.scene;
    if (!scene) return;
    
    // Trouver les instances de matériaux par nom
    const candidates = (window.materialInstances && window.materialInstances[selectedMaterial])
        ? window.materialInstances[selectedMaterial]
        : scene.materials.filter(m => m && m.name === selectedMaterial);
    
    // Mettre à jour uniquement les matériaux concernés
    candidates.forEach(mat => {
        if (this.materialProperties.baseColor) {
            mat.albedoColor = new BABYLON.Color3(
                this.materialProperties.baseColor.r,
                this.materialProperties.baseColor.g,
                this.materialProperties.baseColor.b
            );
        }
        // ... autres propriétés
    });
}
```

### **9. Système de Chargement d'Assets**

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

### **10. Serveur PowerShell**

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
        # Listing dynamique des textures disponibles
        $textures = Get-ChildItem "Textures" -Filter "*.png" | ForEach-Object { $_.Name }
        $textures += Get-ChildItem "Textures" -Filter "*.jpg" | ForEach-Object { $_.Name }
        $textures += Get-ChildItem "Textures" -Filter "*.jpeg" | ForEach-Object { $_.Name }
        $response = @{ count = $textures.Count; images = $textures } | ConvertTo-Json
    }
    "/materials.json" { 
        if ($request.HttpMethod -eq "POST") {
            # Sauvegarde des matériaux via POST
            $body = $reader.ReadToEnd()
            Set-Content "Textures/materials.json" $body -Encoding UTF8
            $response = "materials.json updated successfully in $rootPath\Textures\materials.json"
        } else {
            # Lecture des matériaux via GET
            $content = Get-Content "Textures/materials.json" -Raw -Encoding UTF8
            $response = $content
        }
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

## 🎨 **Système de Gravure Dynamique**

### **Génération de Textures Dynamiques**
```javascript
// Génération de l'alpha map
update() {
    if (!this.text || this.text.trim() === '') {
        this.applyOpacity(null);
        this.applyNormal(null);
        this.applyAmbient(null);
        return;
    }
    
    // Disposer et recréer les textures pour éviter les contextes null
    if (this.alphaDT) this.alphaDT.dispose();
    if (this.aoDT) this.aoDT.dispose();
    if (this.normalDT) this.normalDT.dispose();
    
    const aspect = this.getAspect();
    const size = Math.max(512, Math.min(2048, Math.round(512 * aspect)));
    
    // Créer les textures avec contexte optimisé
    this.alphaDT = new BABYLON.DynamicTexture('engraving_alpha', { width: size, height: size }, this.scene, false, BABYLON.Texture.TRILINEAR_SAMPLINGMODE, false);
    this.aoDT = new BABYLON.DynamicTexture('engraving_ao', { width: size, height: size }, this.scene, false, BABYLON.Texture.TRILINEAR_SAMPLINGMODE, false);
    this.normalDT = new BABYLON.DynamicTexture('engraving_normal', { width: size, height: size }, this.scene, false, BABYLON.Texture.TRILINEAR_SAMPLINGMODE, false);
    
    // Obtenir les contextes avec willReadFrequently
    const aCtx = this.alphaDT.getContext('2d', { willReadFrequently: true });
    const aoCtx = this.aoDT.getContext('2d', { willReadFrequently: true });
    
    // Configuration de la police
    const config = this.fontConfigs[this.currentFont];
    const fontPx = Math.max(16, Math.min(128, Math.round(size * 0.15)));
    const font = `${config.fontStyle} ${config.fontWeight} ${fontPx}px ${this.currentFont}`;
    
    // Dessiner le texte
    aCtx.font = font;
    aCtx.letterSpacing = `${config.letterSpacing}px`;
    aCtx.textAlign = 'center';
    aCtx.textBaseline = 'middle';
    aCtx.fillStyle = 'white';
    aCtx.fillText(this.text, size / 2, size / 2);
    
    // Générer l'ambient occlusion avec flou
    const imageData = aCtx.getImageData(0, 0, size, size);
    const blurredData = this.applyGaussianBlur(imageData, this.blurPercent);
    aoCtx.putImageData(blurredData, 0, 0);
    
    // Générer la normal map
    this.buildNormalFromAO(this.aoDT);
    
    // Appliquer les textures
    this.applyOpacity(this.alphaDT);
    this.applyNormal(this.normalDT);
    this.applyAmbient(this.aoDT);
}
```

### **Gestion des Polices Personnalisées**
```javascript
async setFont(fontName) {
    if (this.fontConfigs[fontName]) {
        this.currentFont = fontName;
        console.log(`EngravingManager: Switching to font: ${fontName}`);
        
        // Forcer le chargement de la police spécifique
        if (document.fonts && document.fonts.load) {
            try {
                await document.fonts.load(`bold 16px ${fontName}`);
                console.log(`EngravingManager: Font ${fontName} loaded successfully`);
                
                // Vérifier si la police est vraiment disponible
                const testCanvas = document.createElement('canvas');
                const testCtx = testCanvas.getContext('2d');
                testCtx.font = `bold 16px ${fontName}`;
                const actualFont = testCtx.font;
                
                if (actualFont.includes(fontName)) {
                    console.log(`EngravingManager: Font ${fontName} is working in canvas`);
                } else {
                    console.warn(`EngravingManager: Font ${fontName} fallback to system font`);
                }
            } catch (error) {
                console.warn(`EngravingManager: Error loading font ${fontName}:`, error);
            }
        }
        
        this.update();
    }
}
```

### **Génération de Normal Map**
```javascript
buildNormalFromAO(aoDT) {
    const size = aoDT.getSize().width;
    const aoCtx = aoDT.getContext('2d', { willReadFrequently: true });
    const imageData = aoCtx.getImageData(0, 0, size, size);
    const data = imageData.data;
    
    const normalData = new ImageData(size, size);
    const normalArray = normalData.data;
    
    // Appliquer l'opérateur Sobel pour générer la normal map
    for (let y = 1; y < size - 1; y++) {
        for (let x = 1; x < size - 1; x++) {
            const idx = (y * size + x) * 4;
            
            // Sobel X
            const sobelX = 
                -1 * this.getGray(data, x-1, y-1, size) +
                 1 * this.getGray(data, x+1, y-1, size) +
                -2 * this.getGray(data, x-1, y,   size) +
                 2 * this.getGray(data, x+1, y,   size) +
                -1 * this.getGray(data, x-1, y+1, size) +
                 1 * this.getGray(data, x+1, y+1, size);
            
            // Sobel Y
            const sobelY = 
                -1 * this.getGray(data, x-1, y-1, size) +
                -2 * this.getGray(data, x,   y-1, size) +
                -1 * this.getGray(data, x+1, y-1, size) +
                 1 * this.getGray(data, x-1, y+1, size) +
                 2 * this.getGray(data, x,   y+1, size) +
                 1 * this.getGray(data, x+1, y+1, size);
            
            // Normaliser et convertir en RGB
            const length = Math.sqrt(sobelX * sobelX + sobelY * sobelY + 1);
            const nx = (sobelX / length + 1) * 0.5;
            const ny = (sobelY / length + 1) * 0.5;
            const nz = (1 / length + 1) * 0.5;
            
            normalArray[idx]     = Math.round(nx * 255); // R
            normalArray[idx + 1] = Math.round(ny * 255); // G
            normalArray[idx + 2] = Math.round(nz * 255); // B
            normalArray[idx + 3] = 255; // A
        }
    }
    
    const normalCtx = this.normalDT.getContext('2d', { willReadFrequently: true });
    normalCtx.putImageData(normalData, 0, 0);
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

## 🎯 **Système de Tags**

### **Classe TagManager**
```javascript
class TagManager {
    constructor(scene, assetConfig) {
        this.scene = scene;
        this.assetConfig = assetConfig;
        this.activeTags = new Set();
        this.activeMaterialConfigs = new Map();
    }
    
    setOption(tag) {
        // Définir l'option active (ex: "base")
        this.activeTags.clear();
        this.activeTags.add(tag);
        this.applyActiveTags();
    }
    
    applyMaterialConfig(objectName, configName) {
        // Appliquer une configuration de matériau à un objet spécifique
        this.activeMaterialConfigs.set(objectName, configName);
        this.applyActiveTags();
    }
    
    applyActiveTags() {
        // Appliquer tous les tags actifs à la scène
        // Gestion de la visibilité et des matériaux
    }
    
    getActiveTags() {
        // Retourner l'état actuel des tags et configurations
        return {
            activeTags: Array.from(this.activeTags),
            materials: Object.fromEntries(this.activeMaterialConfigs)
        };
    }
}
```

### **Configuration des Tags**
```javascript
// Dans Assets/asset.js
const assetConfiguration = {
    models: {
        "part_model": {
            name: "Modèle Part",
            file: "part.glb",
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
        }
    },
    materialConfigs: {
        "bloc": { 
            "red": { "slot1": "red" }, 
            "blue": { "slot1": "blue" }, 
            "green": { "slot1": "green" } 
        },
        "flag": { 
            "none": { "slot1": "red" }, 
            "red": { "slot1": "red" }, 
            "blue": { "slot1": "blue" }, 
            "green": { "slot1": "green" } 
        }
    }
};
```

### **Interface HTML**
```html
<div class="sidebar">
    <div class="category">
        <h3>Options</h3>
        <div class="buttons">
            <button class="sidebar-btn" id="option1-btn">Option 1</button>
        </div>
    </div>
    
    <div class="category">
        <h3>Bloc Material</h3>
        <div class="buttons">
            <button class="sidebar-btn" id="bloc-red-btn">Red</button>
            <button class="sidebar-btn" id="bloc-blue-btn">Blue</button>
            <button class="sidebar-btn" id="bloc-green-btn">Green</button>
        </div>
    </div>
    
    <div class="category">
        <h3>Flag</h3>
        <div class="buttons">
            <button class="sidebar-btn" id="flag-none-btn">None</button>
            <button class="sidebar-btn" id="flag-red-btn">Red</button>
            <button class="sidebar-btn" id="flag-blue-btn">Blue</button>
            <button class="sidebar-btn" id="flag-green-btn">Green</button>
        </div>
    </div>
    
    <div class="category">
        <h3>Engraving</h3>
        <div class="checkbox-container">
            <input type="checkbox" id="engraving-checkbox">
            <label for="engraving-checkbox">Enable</label>
        </div>
        <div class="text-container" id="engraving-text" style="display: none;">
            <input type="text" id="engraving-text-input" placeholder="Enter text...">
        </div>
    </div>
</div>

<script>
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        if (window.tagManager) {
            // Boutons de contrôle des tags
            document.getElementById('option1-btn').addEventListener('click', () => {
                window.tagManager.setOption('base');
                updateButtonStates();
            });
            
            // Boutons de matériaux
            document.getElementById('bloc-red-btn').addEventListener('click', () => {
                window.tagManager.applyMaterialConfig('bloc', 'red');
                updateButtonStates();
            });
            
            updateButtonStates();
        }
    }, 1000);
});
</script>
```

## 🎨 **Système de Matériaux Parent-Enfant**

### **Héritage de Propriétés**
```javascript
function createPBRMaterial(materialConfig, scene) {
    // Handle parent-child material inheritance
    let finalMaterialConfig = materialConfig;
    if (materialConfig.parent && materialConfig.parent !== 'none' && materialsConfig && materialsConfig.materials[materialConfig.parent]) {
        const parentMaterial = materialsConfig.materials[materialConfig.parent];
        // Merge parent properties with child properties (child overrides parent)
        finalMaterialConfig = { ...parentMaterial, ...materialConfig };
    }
    
    const pbr = new BABYLON.PBRMaterial(`${finalMaterialConfig.name || "pbr"}_material`, scene);
    
    // ... application des propriétés
    return pbr;
}
```

### **Interface Tweakpane avec Héritage**
```javascript
updateParentChildDisplay() {
    // Clear independent properties
    this.independentProperties.clear();
    
    // If material has a parent, determine which properties are independent
    if (this.materialsConfig.materials[this.materialList.selected]?.parent !== 'none') {
        const currentMaterial = this.materialsConfig.materials[this.materialList.selected];
        const parentMaterial = this.materialsConfig.materials[currentMaterial.parent];
        
        // Compare each property to determine independence
        Object.keys(this.materialProperties).forEach(propertyName => {
            if (currentMaterial[propertyName] !== undefined && 
                currentMaterial[propertyName] !== parentMaterial[propertyName]) {
                this.independentProperties.add(propertyName);
            }
        });
    }
    
    this.updateControlsAppearance();
}

updateControlsAppearance() {
    this.materialControls.forEach((control, propertyName) => {
        const isIndependent = this.independentProperties.has(propertyName);
        
        // Set opacity for inherited properties
        control.element.style.opacity = isIndependent ? '1' : '0.5';
        
        // Set tooltip
        control.element.title = isIndependent ? 
            `Independent - Click to inherit from parent` : 
            `Inherited from parent - Click to make independent`;
        
        // Add click handler to parameter name
        this.addLabelClickHandler(control, propertyName);
    });
}
```

### **Toggle d'Indépendance**
```javascript
togglePropertyIndependence(propertyName) {
    const currentMaterial = this.materialsConfig.materials[this.materialList.selected];
    
    if (this.independentProperties.has(propertyName)) {
        // Make inherited - remove from material and independentProperties
        delete currentMaterial[propertyName];
        this.independentProperties.delete(propertyName);
        
        // Update display with parent value
        const parentMaterial = this.materialsConfig.materials[currentMaterial.parent];
        this.materialProperties[propertyName] = parentMaterial[propertyName];
    } else {
        // Make independent - add to material and independentProperties
        currentMaterial[propertyName] = this.materialProperties[propertyName];
        this.independentProperties.add(propertyName);
    }
    
    this.updateControlsAppearance();
    this.updateGUIControls();
    this.applyMaterialChanges();
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

**Version de développement** : 2.7.0  
**Dernière mise à jour** : Décembre 2024  
**Statut** : Production Ready ✅
