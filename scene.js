// Get the canvas element
const canvas = document.getElementById("renderCanvas");

// Create the BABYLON engine
const engine = new BABYLON.Engine(canvas, true);

// Load configuration from studio.json
let config = {
    environment: {
        backgroundColor: "#ffffff",
        hdrExposure: 1.0,
        orientation: 0
    },
    camera: {
        alpha: 0,
        beta: 1.0471975511965976,
        radius: 10,
        fov: 60,
        minDistance: 1,
        maxDistance: 50,
        zoomSpeed: 1,
        zoomSensitivity: 0.5,
        inertia: 0.9,
        zoomSmoothness: 0.1,
        targetX: 0,
        targetY: 0,
        targetZ: 0,
        showTarget: true
    }
};



// Global variables to store scene and camera references
let scene;
let camera;
let loadedModels = new Map(); // Store loaded models
window.loadedModels = loadedModels; // Rendre accessible globalement pour datGUI.js
let assetConfig = null; // Asset configuration
let materialsConfig = null; // Materials configuration

// Contrôle de visibilité de dat.GUI - Changez true/false ici
let datGUIVisible = true;



// Function to load configuration
async function loadConfig() {
    try {
        const response = await fetch('studio.json');
        if (response.ok) {
            config = await response.json();
        } else {
            console.warn("Could not load studio.json, using default values");
        }
    } catch (error) {
        console.warn("Error loading studio.json, using default values:", error);
    }
}

// Function to load asset configuration
async function loadAssetConfig() {
    try {
        // Charger le fichier JavaScript comme un script
        const script = document.createElement('script');
        script.src = 'Assets/asset.js';
        script.async = true;
        
        return new Promise((resolve, reject) => {
            script.onload = () => {
                // Le fichier asset.js définit window.assetConfig
                if (window.assetConfig) {
                    assetConfig = window.assetConfig;

                    resolve();
                } else {
                    console.warn("Could not load Assets/asset.js, using default values");
                    assetConfig = { models: [] };
                    resolve();
                }
            };
            
            script.onerror = () => {
                console.warn("Error loading Assets/asset.js, using default values");
                assetConfig = { models: [] };
                resolve();
            };
            
            document.head.appendChild(script);
        });
    } catch (error) {
        console.warn("Error loading Assets/asset.js, using default values:", error);
        assetConfig = { models: [] };
    }
}

// Function to load materials configuration
async function loadMaterialsConfig() {
    try {
        const response = await fetch('Textures/materials.json');
        if (response.ok) {
            materialsConfig = await response.json();
        } else {
            console.warn("Could not load Textures/materials.json, using default values");
            materialsConfig = {
                materials: {}
            };
        }
    } catch (error) {
        console.warn("Error loading Textures/materials.json, using default values:", error);
        materialsConfig = {
            materials: {}
        };
    }
}

// Function to load 3D models
async function loadModels() {
    if (!assetConfig || !assetConfig.models) return;
    
    // Charger le modèle depuis la configuration asset.js
    const modelFile = assetConfig.models.main_model.file;
    
    try {
        
        // Load the GLB file from asset configuration
        const result = await BABYLON.SceneLoader.ImportMeshAsync("", "Assets/", modelFile, scene);
        
        if (result.meshes.length > 0) {
            // Créer un groupe pour tous les meshes
            const modelGroup = new BABYLON.TransformNode("SKU_Models", scene);
            
            // Appliquer les transformations par défaut
            modelGroup.position = new BABYLON.Vector3(0, 0, 0);
            modelGroup.rotation = new BABYLON.Vector3(0, 0, 0);
            modelGroup.scaling = new BABYLON.Vector3(1, 1, 1);
            
            // Attacher tous les meshes au groupe
            result.meshes.forEach(mesh => {
                if (mesh !== modelGroup) {
                    mesh.parent = modelGroup;
                }
            });
            
            
            // Stocker les références des meshes pour le système SKU
            result.meshes.forEach(mesh => {
                if (mesh.name && mesh.name !== "SKU_Models") {
                    // Meshes chargés pour le système SKU
                }
            });
        }
    } catch (error) {
        console.error(`❌ Error loading model ${modelFile}:`, error);
    }
    
    // Le modèle est maintenant chargé une seule fois pour tous les SKUs
}

// Function to create PBR material according to Babylon.js documentation
function createPBRMaterial(materialConfig, scene) {
    // Handle parent-child material inheritance
    let finalMaterialConfig = materialConfig;
    if (materialConfig.parent && materialConfig.parent !== 'none' && materialsConfig && materialsConfig.materials[materialConfig.parent]) {
        const parentMaterial = materialsConfig.materials[materialConfig.parent];
        // Merge parent properties with child properties (child overrides parent)
        finalMaterialConfig = { ...parentMaterial, ...materialConfig };
    }
    
    const pbr = new BABYLON.PBRMaterial(`${finalMaterialConfig.name || "pbr"}_material`, scene);
    
    // === BASE PBR PROPERTIES ===
    if (finalMaterialConfig.baseColor) {
        const color = BABYLON.Color3.FromHexString(finalMaterialConfig.baseColor);
        pbr.albedoColor = color;
    }
    
    pbr.metallic = finalMaterialConfig.metallic !== undefined ? finalMaterialConfig.metallic : 0;
    pbr.roughness = finalMaterialConfig.roughness !== undefined ? finalMaterialConfig.roughness : 0.5;
    pbr.alpha = finalMaterialConfig.alpha !== undefined ? finalMaterialConfig.alpha : 1.0;
    
    // === TEXTURES ===
    // Albedo texture (base color)
    if (finalMaterialConfig.albedoTexture && finalMaterialConfig.albedoTexture.trim() !== '' && finalMaterialConfig.albedoTexture !== 'None') {
        pbr.albedoTexture = new BABYLON.Texture(`Textures/${finalMaterialConfig.albedoTexture}`, scene);
        if (pbr.albedoTexture.onErrorObservable) {
            pbr.albedoTexture.onErrorObservable.add(() => {
                console.error(`❌ Failed to load albedo texture: ${finalMaterialConfig.albedoTexture}`);
            });
        }
    } else {
        pbr.albedoTexture = null;
    }
    
    // Normal/Bump texture
    if (finalMaterialConfig.bumpTexture && finalMaterialConfig.bumpTexture.trim() !== '' && finalMaterialConfig.bumpTexture !== 'None') {
        pbr.bumpTexture = new BABYLON.Texture(`Textures/${finalMaterialConfig.bumpTexture}`, scene);
        pbr.bumpTexture.level = finalMaterialConfig.bumpTextureIntensity !== undefined ? finalMaterialConfig.bumpTextureIntensity : 1.0;
        if (pbr.bumpTexture.onErrorObservable) {
            pbr.bumpTexture.onErrorObservable.add(() => {
                console.error(`❌ Failed to load bump texture: ${finalMaterialConfig.bumpTexture}`);
            });
        }
    }
    
    // === SEPARATE TEXTURES ===
    // Metallic texture
    if (finalMaterialConfig.metallicTexture && finalMaterialConfig.metallicTexture.trim() !== '' && finalMaterialConfig.metallicTexture !== 'None') {
        pbr.metallicTexture = new BABYLON.Texture(`Textures/${finalMaterialConfig.metallicTexture}`, scene);
    }
    
    // Microsurface (roughness) texture
    if (finalMaterialConfig.microSurfaceTexture && finalMaterialConfig.microSurfaceTexture.trim() !== '' && finalMaterialConfig.microSurfaceTexture !== 'None') {
        pbr.microSurfaceTexture = new BABYLON.Texture(`Textures/${finalMaterialConfig.microSurfaceTexture}`, scene);
    }
    
    // Ambient occlusion texture
    if (finalMaterialConfig.ambientTexture && finalMaterialConfig.ambientTexture.trim() !== '' && finalMaterialConfig.ambientTexture !== 'None') {
        pbr.ambientTexture = new BABYLON.Texture(`Textures/${finalMaterialConfig.ambientTexture}`, scene);
    }
    
    // Opacity texture for local transparency control
    if (finalMaterialConfig.opacityTexture && finalMaterialConfig.opacityTexture.trim() !== '' && finalMaterialConfig.opacityTexture !== 'None') {
        pbr.opacityTexture = new BABYLON.Texture(`Textures/${finalMaterialConfig.opacityTexture}`, scene);
        pbr.opacityTexture.getAlphaFromRGB = true; // CRUCIAL pour que l'opacityTexture fonctionne
        
        // When opacity texture is present, DON'T set pbr.opacity - let the texture handle it
        // The alpha slider will control the overall transparency of the visible parts
    } else {
        // When no opacity texture, use alpha for global transparency
        pbr.alpha = finalMaterialConfig.alpha !== undefined ? finalMaterialConfig.alpha : 1.0;
    }
    
    // === LIGHTMAP ===
    // Lightmap texture for baked lighting
    if (finalMaterialConfig.lightmapTexture && finalMaterialConfig.lightmapTexture.trim() !== '' && finalMaterialConfig.lightmapTexture !== 'None') {
        pbr.lightmapTexture = new BABYLON.Texture(`Textures/${finalMaterialConfig.lightmapTexture}`, scene);
        
        // Enable lightmap as shadowmap by default for better performance
        pbr.useLightmapAsShadowmap = finalMaterialConfig.useLightmapAsShadowmap !== undefined ? finalMaterialConfig.useLightmapAsShadowmap : true;
    }
    
    // === TEXTURE TRANSFORMATIONS ===
    // Apply transformations to all textures except lightmap
    applyTextureTransformations(pbr, finalMaterialConfig);
    
    // === TRANSPARENCY ===
    pbr.transparencyMode = BABYLON.PBRMaterial.PBRMATERIAL_ALPHATESTANDBLEND;
    pbr.backFaceCulling = false; // Désactivé pour la transparence
    
    // === PBR RENDERING OPTIMIZATIONS ===
    pbr.usePhysicalLightFalloff = true;
    pbr.useEnergyConservation = true;
    
    // Disable radiance over alpha to prevent transparency artifacts
    pbr.useRadianceOverAlpha = false;

    // Enable depth pre-pass to avoid transparency artifacts
    pbr.needDepthPrePass = true;
    
    return pbr;
}

// Function to apply texture transformations to all textures except lightmap
function applyTextureTransformations(pbr, finalMaterialConfig) {
    const textures = [
        pbr.albedoTexture,
        pbr.metallicTexture,
        pbr.microSurfaceTexture,
        pbr.ambientTexture,
        pbr.opacityTexture,
        pbr.bumpTexture
    ].filter(texture => texture && texture !== pbr.lightmapTexture); // Exclude lightmap
    
    textures.forEach(texture => {
        if (texture) {
            // Apply U/V Offset
            if (finalMaterialConfig.uOffset !== undefined) {
                texture.uOffset = finalMaterialConfig.uOffset;
            }
            if (finalMaterialConfig.vOffset !== undefined) {
                texture.vOffset = finalMaterialConfig.vOffset;
            }
            
            // Apply U/V Scale
            if (finalMaterialConfig.uScale !== undefined) {
                texture.uScale = finalMaterialConfig.uScale;
            }
            if (finalMaterialConfig.vScale !== undefined) {
                texture.vScale = finalMaterialConfig.vScale;
            }
            
            // Apply W Rotation (convert degrees to radians)
            if (finalMaterialConfig.wRotation !== undefined) {
                texture.wAng = BABYLON.Tools.ToRadians(finalMaterialConfig.wRotation);
            }
        }
    });
}

// Function to apply material to mesh
function applyMaterial(mesh, materialConfig) {
    if (materialConfig.type === 'pbr') {
        const pbr = createPBRMaterial(materialConfig, scene);
        mesh.material = pbr;
    }
}

// Generate the BABYLON 3D scene
const createScene = async function() {
    // Load configuration first
    await loadConfig();
    
    // Load asset configuration
    await loadAssetConfig();
    
    // Load materials configuration
    await loadMaterialsConfig();
    
    // Create the scene
    scene = new BABYLON.Scene(engine);
    
    // Create a camera with config values
    camera = new BABYLON.ArcRotateCamera("camera", config.camera.alpha, config.camera.beta, config.camera.radius, BABYLON.Vector3.Zero(), scene);
    
    // Set camera properties from config
    if (config.camera.fov) camera.fov = config.camera.fov;
    if (config.camera.minDistance) camera.lowerRadiusLimit = config.camera.minDistance;
    if (config.camera.maxDistance) camera.upperRadiusLimit = config.camera.maxDistance;
    
    // Bloquer complètement le beta de la caméra avec les limites
    if (config.camera.initialPitch !== undefined) {
        // Convertir l'angle initial de degrés en radians
        const initialPitchRadians = BABYLON.Tools.ToRadians(config.camera.initialPitch);
        camera.lowerBetaLimit = initialPitchRadians;
        camera.upperBetaLimit = initialPitchRadians;
        camera.beta = initialPitchRadians; // Appliquer aussi à la caméra
    } else if (config.camera.lowerBetaLimit !== undefined) {
        camera.lowerBetaLimit = config.camera.lowerBetaLimit;
    } else if (config.camera.upperBetaLimit !== undefined) {
        camera.upperBetaLimit = config.camera.upperBetaLimit;
    }
    
    // Set camera target from config
    if (config.camera.targetX !== undefined) camera.target.x = config.camera.targetX;
    if (config.camera.targetY !== undefined) camera.target.y = config.camera.targetY;
    if (config.camera.targetZ !== undefined) camera.target.z = config.camera.targetZ;
    
    // Configure zoom controls with smoothing
    if (config.camera.zoomSpeed !== undefined) {
        camera.wheelPrecision = config.camera.zoomSpeed;
    } else {
        camera.wheelPrecision = 1; // Default zoom speed (lower = faster zoom)
    }
    
    // Enable zoom smoothing for smoother transitions
    camera.zoomSensitivity = config.camera.zoomSensitivity !== undefined ? config.camera.zoomSensitivity : 0.5;
    
    // Enable inertia for smoother camera movements
    camera.inertia = config.camera.inertia !== undefined ? config.camera.inertia : 0.9;
    
    // Add smooth zoom interpolation for better zoom experience
    let targetRadius = camera.radius;
    let currentRadius = camera.radius;
    let zoomLerpFactor = config.camera.zoomSmoothness !== undefined ? config.camera.zoomSmoothness : 0.1; // Controls zoom smoothness (0.1 = smooth, 0.9 = instant)
    
    // Make zoomLerpFactor accessible globally for dat.GUI control
    window.zoomLerpFactor = zoomLerpFactor;
    
    // Override the default zoom behavior with smooth interpolation
    // Use scene's pointer observable to detect mouse wheel events
    scene.onPointerObservable.add((evt) => {
        // Only handle mouse wheel events
        if (evt.type === BABYLON.PointerEventTypes.POINTERWHEEL) {
            // Calculate the target radius based on wheel delta
            const delta = evt.event.deltaY;
            const zoomFactor = 1 + (delta * camera.wheelPrecision / 1000);
            targetRadius = Math.max(camera.lowerRadiusLimit, Math.min(camera.upperRadiusLimit, targetRadius * zoomFactor));
            
            // Store the target for smooth interpolation
            // Note: We don't prevent default here as we want the camera to still respond
        }
    });
    
    // Add smooth zoom interpolation and object rotation elasticity in the render loop
    scene.onBeforeRenderObservable.add(() => {
        // Zoom interpolation
        if (Math.abs(currentRadius - targetRadius) > 0.01) {
            // Use smooth easing function for more natural zoom feel
            const delta = targetRadius - currentRadius;
            const easing = 0.1; // Base easing factor
            
            // Apply exponential smoothing for more natural movement
            currentRadius += delta * easing;
            
            // Ensure we don't overshoot
            if ((delta > 0 && currentRadius > targetRadius) || 
                (delta < 0 && currentRadius < targetRadius)) {
                currentRadius = targetRadius;
            }
            
            camera.radius = currentRadius;
        }
        
        // Object rotation elasticity - retour à 0° quand la souris est relâchée
        if (objectRotationElasticityEnabled && !isMouseDown && Math.abs(currentObjectRotationX - targetObjectRotationX) > 0.001) {
            const rotationDelta = targetObjectRotationX - currentObjectRotationX;
            const elasticityFactor = 0.1; // Vitesse de retour (ajustable)
            
            // Interpolation douce vers la rotation cible (0°)
            currentObjectRotationX += rotationDelta * elasticityFactor;
            
            // Appliquer la rotation au groupe SKU_Models
            const skuModelsGroup = scene.getTransformNodeByName("SKU_Models");
            if (skuModelsGroup) {
                skuModelsGroup.rotation.x = currentObjectRotationX;
            }
        }
    });
    
    // Désactiver complètement les contrôles par défaut de la caméra
    camera.attachControl(canvas, false);
    
    // Désactiver explicitement tous les contrôles de caméra
    camera.inputs.clear();
    
    // Désactiver le pan, zoom et rotation par défaut
    camera.inertia = 0;
    camera.angularSensibilityX = 0;
    camera.angularSensibilityY = 0;
    camera.panningSensibility = 0;
    
    // Variables pour les contrôles personnalisés
    let isMouseDown = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    let isRightClick = false;
    
    // Variables pour la rotation des objets avec limites
    let currentObjectRotationX = 0; // Rotation actuelle en radians
    const minObjectRotationX = -Math.PI/2; // -90 degrés
    const maxObjectRotationX = Math.PI/2;  // +90 degrés
    
    // Variables pour l'élasticité de rotation des objets
    let targetObjectRotationX = 0; // Rotation cible (toujours 0°)
    let objectRotationElasticityEnabled = true; // Activer l'élasticité par défaut
    
    // Contrôles personnalisés de la caméra
    scene.onPointerObservable.add((evt) => {
        if (evt.type === BABYLON.PointerEventTypes.POINTERDOWN) {
            isMouseDown = true;
            lastMouseX = evt.event.clientX;
            lastMouseY = evt.event.clientY;
            isRightClick = evt.event.button === 2; // Clic droit
        }
        
        if (evt.type === BABYLON.PointerEventTypes.POINTERUP) {
            isMouseDown = false;
            isRightClick = false;
            
            // Réactiver l'élasticité quand l'utilisateur relâche la souris
            objectRotationElasticityEnabled = true;
        }
        
        if (evt.type === BABYLON.PointerEventTypes.POINTERMOVE && isMouseDown) {
            const deltaX = evt.event.clientX - lastMouseX;
            const deltaY = evt.event.clientY - lastMouseY;
            
            // Ignorer le clic droit (pan)
            if (isRightClick) {
                // Ne rien faire - pan désactivé
                return;
            }
            
            // Mouvement horizontal : contrôler alpha (rotation horizontale de la caméra) - inversé pour plus naturel
            if (Math.abs(deltaX) > 0) {
                const alphaSensitivity = 0.006;
                camera.alpha -= deltaX * alphaSensitivity; // Inversé avec le signe négatif
                
                // Mettre à jour la config
                config.camera.alpha = camera.alpha;
            }
            
            // Mouvement vertical : contrôler la rotation X des objets avec limites (inversé pour plus naturel)
            if (Math.abs(deltaY) > 0) {
                const objectRotationSensitivity = 0.006;
                const rotationDelta = -deltaY * objectRotationSensitivity; // Inversé avec le signe négatif
                
                // Calculer la nouvelle rotation avec limites
                const newRotationX = currentObjectRotationX + rotationDelta;
                const clampedRotationX = Math.max(minObjectRotationX, Math.min(maxObjectRotationX, newRotationX));
                
                // Appliquer la rotation limitée au groupe SKU_Models
                const skuModelsGroup = scene.getTransformNodeByName("SKU_Models");
                if (skuModelsGroup) {
                    skuModelsGroup.rotation.x = clampedRotationX;
                }
                
                            // Mettre à jour la rotation actuelle
            currentObjectRotationX = clampedRotationX;
            
            // Désactiver l'élasticité pendant le mouvement
            objectRotationElasticityEnabled = false;
            
            // Beta reste fixe - ne pas modifier config.camera.beta
            // La rotation des objets est indépendante de la caméra
            }
            
            lastMouseX = evt.event.clientX;
            lastMouseY = evt.event.clientY;
        }
    });
    
    // Désactiver complètement le menu contextuel et le clic droit
    canvas.addEventListener('contextmenu', (evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        return false;
    });
    
    // Désactiver aussi le clic droit sur le document entier
    document.addEventListener('contextmenu', (evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        return false;
    });
    
    // Load 3D models from asset configuration
    await loadModels();
    
    // Mettre les animations en pause par défaut
    if (scene.animationGroups && scene.animationGroups.length > 0) {
        scene.animationGroups.forEach(animationGroup => {
            animationGroup.pause();
        });
    }
    
    // Set background color from config
    scene.clearColor = BABYLON.Color4.FromHexString(config.environment.backgroundColor);
    
    // HDR Environment - Try HDRCubeTexture directly as suggested in forum
    try {
        const hdrTexture = new BABYLON.HDRCubeTexture("Textures/HDR/default.hdr", scene, 512, false, false, false, true);
        scene.environmentTexture = hdrTexture;
        scene.environmentIntensity = config.environment.hdrExposure;
        
        // Apply orientation from config
        hdrTexture.setReflectionTextureMatrix(
            BABYLON.Matrix.RotationY(BABYLON.Tools.ToRadians(config.environment.orientation))
        );
        
    } catch (error) {
        console.error("HDR loading failed:", error);
        
        // Fallback: try the original method
        try {
            const hdrTexture = BABYLON.CubeTexture.CreateFromPrefilteredData("Textures/HDR/default.hdr", scene);
            scene.environmentTexture = hdrTexture;
            scene.environmentIntensity = config.environment.hdrExposure;
            
            // Apply orientation from config
            hdrTexture.setReflectionTextureMatrix(
                BABYLON.Matrix.RotationY(BABYLON.Tools.ToRadians(config.environment.orientation))
            );
            
        } catch (fallbackError) {
            console.error("Fallback HDR loading also failed:", fallbackError);
        }
    }
    
    return scene;
};

// Classe TagManager pour gérer le système de tags
class TagManager {
    constructor(scene, materialsConfig) {
        this.scene = scene;
        this.materialsConfig = materialsConfig;
        this.tagConfig = null;
        this.activeMaterialConfig = null;
        this.activeTags = new Set(); // Tags actifs (pour les boutons individuels)
    }
    
    // Charger la configuration des tags depuis assetConfig (plus besoin de fichier séparé)
    loadTagConfiguration() {
        if (assetConfig && assetConfig.materialConfigs) {
            this.tagConfig = {
                materials: assetConfig.materialConfigs
            };
            console.log('✅ Configuration des tags chargée depuis assetConfig:', this.tagConfig);
        } else {
            console.warn('⚠️ assetConfig.materialConfigs non trouvé');
        }
    }
    
    
    // Définir une option unique (sélection exclusive)
    setOption(optionName) {
        // Vider tous les tags actifs
        this.activeTags.clear();
        // Ajouter seulement le tag sélectionné
        this.activeTags.add(optionName);
        this.applyActiveTags();
    }
    
    // Appliquer les tags actifs
    applyActiveTags() {
        if (!assetConfig) return;
        
        // Parcourir tous les modèles et leurs meshes
        Object.keys(assetConfig.models).forEach(modelKey => {
            const model = assetConfig.models[modelKey];
            
            Object.keys(model.meshes).forEach(meshName => {
                const meshConfig = model.meshes[meshName];
                const meshTags = meshConfig.tags || [];
                
                // Un mesh est visible si au moins un de ses tags est actif
                const shouldBeVisible = meshTags.some(tag => this.activeTags.has(tag));
                
                // Appliquer la visibilité aux meshes primitifs
                const meshes = this.scene.meshes.filter(mesh => 
                    mesh.name.startsWith(meshName + '_primitive')
                );
                
                meshes.forEach(mesh => {
                    mesh.setEnabled(shouldBeVisible);
                });
            });
        });
        
        console.log(`🎯 Tags actifs appliqués:`, Array.from(this.activeTags));
    }
    
    
    // Appliquer une configuration de matériaux
    applyMaterialConfig(objectName, configName) {
        if (!this.tagConfig || !this.tagConfig.materials[objectName] || !this.tagConfig.materials[objectName][configName]) {
            console.warn(`Configuration ${configName} non trouvée pour ${objectName}`);
            return;
        }
        
        const materialConfig = this.tagConfig.materials[objectName][configName];
        this.activeMaterialConfig = { objectName, configName };
        
        // Trouver les meshes correspondants et appliquer les matériaux
        Object.keys(assetConfig.models).forEach(modelKey => {
            const model = assetConfig.models[modelKey];
            
            Object.keys(model.meshes).forEach(meshName => {
                const meshConfig = model.meshes[meshName];
                const meshTags = meshConfig.tags || [];
                
                // Vérifier si ce mesh appartient à l'objet concerné
                if (meshTags.some(tag => tag.includes(objectName))) {
                    // Appliquer les matériaux aux slots
                    Object.keys(materialConfig).forEach(slotName => {
                        const materialName = materialConfig[slotName];
                        const slotIndex = this.getSlotIndex(slotName);
                        
                        if (slotIndex >= 0 && this.materialsConfig.materials[materialName]) {
                            // Trouver le mesh primitif correspondant au slot
                            const meshes = this.scene.meshes.filter(mesh => 
                                mesh.name === `${meshName}_primitive${slotIndex}`
                            );
                            
                            meshes.forEach(mesh => {
                                applyMaterial(mesh, this.materialsConfig.materials[materialName]);
                            });
                        }
                    });
                }
            });
        });
        
        console.log(`🎨 Configuration ${configName} appliquée à ${objectName}:`, materialConfig);
    }
    
    // Obtenir l'index du slot de matériau
    getSlotIndex(slotName) {
        const slotMap = {
            'slot1': 0,
            'slot2': 1,
            'slot3': 2,
            'slot4': 3
        };
        return slotMap[slotName] || -1;
    }
    
    // Obtenir les tags actifs
    getActiveTags() {
        return {
            activeTags: Array.from(this.activeTags),
            material: this.activeMaterialConfig
        };
    }
    
    // Générer automatiquement les configurations de matériaux disponibles
    getAvailableMaterialConfigs() {
        if (!assetConfig || !assetConfig.materialConfigs) return {};
        return assetConfig.materialConfigs;
    }
    
    // Générer automatiquement les tags de visibilité disponibles
    getAvailableVisibilityTags() {
        if (!assetConfig) return [];
        
        const allTags = new Set();
        Object.keys(assetConfig.models).forEach(modelKey => {
            const model = assetConfig.models[modelKey];
            Object.keys(model.meshes).forEach(meshName => {
                const meshConfig = model.meshes[meshName];
                const meshTags = meshConfig.tags || [];
                meshTags.forEach(tag => allTags.add(tag));
            });
        });
        
        return Array.from(allTags);
    }
}

// Call the createScene function
createScene().then(async createdScene => {
    // Initialiser l'interface dat.GUI complète avec la classe DatGUIManager
    const datGUIManager = new DatGUIManager(scene, materialsConfig, config);
    
    // Initialiser le système de tags
    const tagManager = new TagManager(scene, materialsConfig);
    tagManager.loadTagConfiguration();
    
    // Exposer les managers globalement pour les boutons HTML
    window.datGUIManager = datGUIManager;
    window.tagManager = tagManager;
    
    // Configurer les callbacks pour les changements de matériaux
    datGUIManager.onMaterialChange = (type, data) => {
        if (type === 'properties') {
            // Appliquer les changements de matériau à la scène
            const selectedMaterial = datGUIManager.materialList.selected;
            if (selectedMaterial && materialsConfig.materials[selectedMaterial]) {
                // Find all meshes that currently use this material and update their material properties
                loadedModels.forEach((modelData, modelName) => {
                    modelData.meshes.forEach(mesh => {
                        // Check if this is a primitive submesh (e.g., Cube_primitive0, Cube_primitive1)
                        const primitiveMatch = mesh.name.match(/_primitive(\d+)$/);
                        if (primitiveMatch) {
                            const baseMeshName = mesh.name.split('_primitive')[0];
                            const primitiveIndex = parseInt(primitiveMatch[1], 10); // 0 for primitive0, 1 for primitive1
                            
                            const meshConfig = modelData.config.meshes.find(m => m.name === baseMeshName);
                            if (meshConfig) {
                                const materialSlotKey = `materialSlot${primitiveIndex + 1}`; // materialSlot1 for primitive0
                                const materialName = meshConfig[materialSlotKey];
                                
                                // Only update if this specific primitive uses the selected material
                                if (materialName === selectedMaterial && mesh.material) {
                                    // Create completely new PBR material with updated properties
                                    const updatedMaterial = createPBRMaterial(data, scene);
                                    mesh.material = updatedMaterial;
                                }
                            }
                        } else {
                            // Fallback for non-primitive meshes, if any
                            const meshConfig = modelData.config.meshes.find(m => m.name === mesh.name);
                            if (meshConfig && meshConfig.materialSlot1 === selectedMaterial && mesh.material) {
                                // Create completely new PBR material with updated properties
                                const updatedMaterial = createPBRMaterial(data, scene);
                                mesh.material = updatedMaterial;
                            }
                        }
                    });
                });
                
                // Force scene update to ensure changes are visible
                if (scene) {
                    scene.markAllMaterialsAsDirty(BABYLON.Material.TextureDirtyFlag);
                }
            }
        }
    };
    
    // Initialiser l'interface
    await datGUIManager.init();
    
    // Appliquer la visibilité selon la variable datGUIVisible
    if (!datGUIVisible) {
        datGUIManager.setDatGUIVisibility(false);
    }
    
    // Rendre le gestionnaire accessible globalement pour la sélection par clic
    window.datGUIManager = datGUIManager;
});

// Register a render loop to repeatedly render the scene
engine.runRenderLoop(function() {
    if (scene) {
        scene.render();
        
        // Synchroniser l'animation avec la rotation de l'objet "Fleche"
        if (scene.animationGroups && scene.animationGroups.length > 0 && window.loadedModels && window.loadedModels.has("Fleche")) {
            const ChainRotation = window.loadedModels.get("Fleche");
            if (ChainRotation.group) {
                // Récupérer la valeur de rotation
                const currentRotationDegrees = BABYLON.Tools.ToDegrees(ChainRotation.group.rotation.x);
                
                // Mapping rotation → frame (INVERSÉ pour le bon sens)
                // -90° → frame 125
                // 0° → frame 62.5  
                // +90° → frame 0
                const minRotation = -90;
                const maxRotation = 90;
                const minFrame = 250;
                const maxFrame = 0;
                
                // Calculer la frame correspondante
                const normalizedRotation = (currentRotationDegrees - minRotation) / (maxRotation - minRotation);
                const targetFrame = minFrame + (normalizedRotation * (maxFrame - minFrame));
                
                // Envoyer la frame à l'animation
                scene.animationGroups.forEach(animationGroup => {
                    animationGroup.goToFrame(targetFrame);
                });
                

            }
        }
    }
});

// Handle browser/canvas resize events
window.addEventListener("resize", function() {
    engine.resize();
});
