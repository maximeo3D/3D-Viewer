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
window.loadedModels = loadedModels; // Rendre accessible globalement pour tweakpaneManager.js
let assetConfig = null; // Asset configuration
let materialsConfig = null; // Materials configuration

// Contrôle de visibilité de Tweakpane - Changez true/false ici
let tweakpaneVisible = true;



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
    const modelFile = assetConfig.models.part_model.file;
    
    try {
        
        // Load the GLB file from asset configuration
        const result = await BABYLON.SceneLoader.ImportMeshAsync("", "Assets/", modelFile, scene);
        
        if (result.meshes.length > 0) {
            // Trouver le mesh __root__ qui doit être le parent principal
            const rootMesh = result.meshes.find(mesh => mesh.name === "__root__");
            let modelGroup = null;
            
            if (rootMesh) {
                // Appliquer les transformations par défaut au root
                rootMesh.position = new BABYLON.Vector3(0, 0, 0);
                rootMesh.rotation = new BABYLON.Vector3(0, 0, 0);
                rootMesh.scaling = new BABYLON.Vector3(1, 1, 1);
                
                // Attacher tous les autres meshes au root
                result.meshes.forEach(mesh => {
                    if (mesh !== rootMesh && mesh.name !== "__root__") {
                        mesh.parent = rootMesh;
                    }
                });
            } else {
                // Fallback si pas de __root__ trouvé
                modelGroup = new BABYLON.TransformNode("Main_Models", scene);
                modelGroup.position = new BABYLON.Vector3(0, 0, 0);
                modelGroup.rotation = new BABYLON.Vector3(0, 0, 0);
                modelGroup.scaling = new BABYLON.Vector3(1, 1, 1);
                
                result.meshes.forEach(mesh => {
                    if (mesh !== modelGroup) {
                        mesh.parent = modelGroup;
                    }
                });
            }
            
            // Appliquer les corrections recommandées par la documentation Babylon.js/Blender
            result.meshes.forEach(mesh => {
                if (mesh.name && mesh.name !== "Main_Models" && mesh.name !== "__root__") {
                    // Correction des transformations non appliquées dans Blender (documentation officielle)
                    if (mesh.scaling.x === -1 || mesh.scaling.y === -1 || mesh.scaling.z === -1) {
                        mesh.scaling = new BABYLON.Vector3(
                            Math.abs(mesh.scaling.x),
                            Math.abs(mesh.scaling.y), 
                            Math.abs(mesh.scaling.z)
                        );
                    }
                    
                    // Correction des UVs (inversion axe V)
                    if (mesh.getVerticesData(BABYLON.VertexBuffer.UVKind)) {
                        const uvs = mesh.getVerticesData(BABYLON.VertexBuffer.UVKind);
                        const correctedUVs = [...uvs];
                        for (let i = 0; i < correctedUVs.length; i += 2) {
                            correctedUVs[i + 1] = 1.0 - correctedUVs[i + 1]; // Inverser axe V
                        }
                        mesh.setVerticesData(BABYLON.VertexBuffer.UVKind, correctedUVs);
                    }
                }
            });
            
            // Stocker les références des meshes pour le système de tags
            result.meshes.forEach(mesh => {
                if (mesh.name && mesh.name !== "Main_Models" && mesh.name !== "__root__") {
                    // Stocker les meshes pour le système de tags
                    window.loadedModels.set(mesh.name, {
                        mesh: mesh,
                        group: rootMesh || modelGroup
                    });
                }
            });
        }
    } catch (error) {
        console.error(`❌ Error loading model ${modelFile}:`, error);
    }
    
    // Le modèle est maintenant chargé une seule fois pour le système de tags
}

// Function to create PBR material according to Babylon.js documentation
function createPBRMaterial(materialConfig, scene, materialName) {
    // Handle parent-child material inheritance
    let finalMaterialConfig = materialConfig;
    if (materialConfig.parent && materialConfig.parent !== 'none' && materialsConfig && materialsConfig.materials[materialConfig.parent]) {
        const parentMaterial = materialsConfig.materials[materialConfig.parent];
        // Merge parent properties with child properties (child overrides parent)
        finalMaterialConfig = { ...parentMaterial, ...materialConfig };
    }
    
    const pbr = new BABYLON.PBRMaterial(materialName || `${finalMaterialConfig.name || "pbr"}_material`, scene);
    try {
        if (!window.materialInstances) window.materialInstances = {};
        if (materialName) {
            if (!window.materialInstances[materialName]) window.materialInstances[materialName] = [];
            window.materialInstances[materialName].push(pbr);
        }
    } catch (_) {}
    
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
        pbr.bumpTexture.vFlip = false; // Corriger l'effet miroir
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
        pbr.metallicTexture.vFlip = false; // Corriger l'effet miroir
    }
    
    // Microsurface (roughness) texture
    if (finalMaterialConfig.microSurfaceTexture && finalMaterialConfig.microSurfaceTexture.trim() !== '' && finalMaterialConfig.microSurfaceTexture !== 'None') {
        pbr.microSurfaceTexture = new BABYLON.Texture(`Textures/${finalMaterialConfig.microSurfaceTexture}`, scene);
        pbr.microSurfaceTexture.vFlip = false; // Corriger l'effet miroir
    }
    
    // Ambient occlusion texture
    if (finalMaterialConfig.ambientTexture && finalMaterialConfig.ambientTexture.trim() !== '' && finalMaterialConfig.ambientTexture !== 'None') {
        pbr.ambientTexture = new BABYLON.Texture(`Textures/${finalMaterialConfig.ambientTexture}`, scene);
        pbr.ambientTexture.vFlip = false; // Corriger l'effet miroir
    }
    
    // Opacity texture for local transparency control
    if (finalMaterialConfig.opacityTexture && finalMaterialConfig.opacityTexture.trim() !== '' && finalMaterialConfig.opacityTexture !== 'None') {
        pbr.opacityTexture = new BABYLON.Texture(`Textures/${finalMaterialConfig.opacityTexture}`, scene);
        pbr.opacityTexture.getAlphaFromRGB = true; // CRUCIAL pour que l'opacityTexture fonctionne
        pbr.opacityTexture.vFlip = false; // Corriger l'effet miroir
        
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
        pbr.lightmapTexture.vFlip = false; // Corriger l'effet miroir
        
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
        // Ensure material instances are named consistently so Tweakpane can find/update by name
        const materialName = materialConfig.name || Object.keys(materialsConfig.materials).find(k => materialsConfig.materials[k] === materialConfig) || 'pbr';
        const pbr = createPBRMaterial(materialConfig, scene, materialName);
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
    scene.useRightHandedSystem = true; // Mode right-handed pour compatibilité Blender
    
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
    
    // Enable inertia for smoother camera movements
    camera.inertia = config.camera.inertia !== undefined ? config.camera.inertia : 0.9;
    
    
    // Add object rotation elasticity in the render loop
    scene.onBeforeRenderObservable.add(() => {
        
        // Object rotation elasticity - retour à 0° quand la souris est relâchée
        if (objectRotationElasticityEnabled && !isMouseDown && Math.abs(currentObjectRotationX - targetObjectRotationX) > 0.001) {
            const rotationDelta = targetObjectRotationX - currentObjectRotationX;
            const elasticityFactor = 0.1; // Vitesse de retour (ajustable)
            
            // Interpolation douce vers la rotation cible (0°)
            currentObjectRotationX += rotationDelta * elasticityFactor;
            
            // Appliquer la rotation au groupe __root__
            const rootGroup = scene.getMeshByName("__root__");
            if (rootGroup) {
                rootGroup.rotation.x = currentObjectRotationX;
            }
        }
    });
    
    // Désactiver complètement tous les contrôles par défaut
    camera.detachControl(canvas);
    
    // Ajouter seulement le contrôle de zoom (si pas déjà présent)
    const existingWheelInput = camera.inputs.attached.mousewheel;
    if (!existingWheelInput) {
        camera.inputs.add(new BABYLON.ArcRotateCameraMouseWheelInput());
    }
    
    // Configuration de la sensibilité horizontale de la caméra
    camera.angularSensibilityX = 1; // Plus élevé = moins sensible
    
    // Variable pour contrôler la sensibilité horizontale personnalisée
    window.cameraHorizontalSensitivity = 1000; // Plus élevé = moins sensible
    
    // Configuration spécifique du zoom (sensibilité réduite de 50%)
    camera.wheelPrecision = (config.camera.zoomSpeed || 1) * 0.5;
    camera.zoomSensitivity = config.camera.zoomSensitivity || 0.5;
    
    
    // Variables pour le zoom fluide
    let targetRadius = camera.radius;
    let currentRadius = camera.radius;
    const zoomSmoothness = 0.15; // Plus élevé = plus fluide (0.1 = très fluide, 0.9 = instant)
    
    // Listener de zoom fluide
    canvas.addEventListener('wheel', (event) => {
        event.preventDefault();
        
        const delta = event.deltaY;
        const zoomFactor = 1 + (delta * camera.wheelPrecision / 1000);
        const newTargetRadius = Math.max(camera.lowerRadiusLimit, Math.min(camera.upperRadiusLimit, targetRadius * zoomFactor));
        
        targetRadius = newTargetRadius;
    });
    
    // Interpolation fluide du zoom dans la boucle de rendu
    scene.onBeforeRenderObservable.add(() => {
        // Zoom interpolation
        if (Math.abs(currentRadius - targetRadius) > 0.01) {
            const delta = targetRadius - currentRadius;
            currentRadius += delta * zoomSmoothness;
            
            // Éviter les dépassements
            if ((delta > 0 && currentRadius > targetRadius) || 
                (delta < 0 && currentRadius < targetRadius)) {
                currentRadius = targetRadius;
            }
            
            camera.radius = currentRadius;
        }
    });
    
    // Variables pour la rotation des objets seulement
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
    
    // Contrôles pour la rotation des objets seulement
    scene.onPointerObservable.add((evt) => {
        if (evt.type === BABYLON.PointerEventTypes.POINTERDOWN) {
            isMouseDown = true;
            lastMouseX = evt.event.clientX;
            lastMouseY = evt.event.clientY;
            isRightClick = evt.event.button === 2; // Clic droit
            // Désactiver l'élasticité pendant le mouvement
            objectRotationElasticityEnabled = false;
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
            
            // Mouvement horizontal : contrôler la rotation horizontale de la caméra
            if (Math.abs(deltaX) > 0) {
                // Utiliser notre variable personnalisée pour la sensibilité (plus élevé = moins sensible)
                const cameraSensitivity = 5 / window.cameraHorizontalSensitivity;
                const rotationDelta = deltaX * cameraSensitivity; // Corrigé pour le mode right-handed
                
                // Appliquer la rotation horizontale à la caméra
                camera.alpha += rotationDelta;
            }
            
            // Mouvement vertical : contrôler la rotation X des objets avec limites (inversé pour plus naturel)
            if (Math.abs(deltaY) > 0) {
                const objectRotationSensitivity = 0.006;
                const rotationDelta = -deltaY * objectRotationSensitivity; // Inversé avec le signe négatif
                
                // Calculer la nouvelle rotation avec limites
                const newRotationX = currentObjectRotationX + rotationDelta;
                const clampedRotationX = Math.max(minObjectRotationX, Math.min(maxObjectRotationX, newRotationX));
                
                // Appliquer la rotation limitée au groupe __root__
                const rootGroup = scene.getMeshByName("__root__");
                if (rootGroup) {
                    rootGroup.rotation.x = clampedRotationX;
                }
                
                            // Mettre à jour la rotation actuelle
            currentObjectRotationX = clampedRotationX;
            
            // Désactiver l'élasticité pendant le mouvement
            objectRotationElasticityEnabled = false;
            
            // Beta reste fixe - ne pas modifier config.camera.beta
            // La rotation des objets est indépendante de la caméra
            }
            
            // S'assurer que la caméra ne peut pas tourner verticalement (beta fixe)
            camera.beta = config.camera.beta;
            
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
        this.activeMaterialConfigs = new Map(); // Map<objectName, configName>
        this.activeTags = new Set(); // Tags actifs (pour les boutons individuels)
        this.engravingText = '';
    }
    
    // Charger la configuration des tags depuis assetConfig (plus besoin de fichier séparé)
    loadTagConfiguration() {
        if (assetConfig && assetConfig.materialConfigs) {
            this.tagConfig = {
                materials: assetConfig.materialConfigs
            };
            // Configuration des tags chargée depuis assetConfig
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
                
                // Appliquer la visibilité aux meshes primitifs (cas multi-matériaux)
                let meshes = this.scene.meshes.filter(mesh => 
                    mesh.name.startsWith(meshName + '_primitive')
                );
                
                // Si aucun mesh primitif trouvé, chercher le mesh original (cas mono-matériau)
                if (meshes.length === 0) {
                    meshes = this.scene.meshes.filter(mesh => 
                        mesh.name === meshName && !mesh.name.includes('_primitive')
                    );
                }
                
                meshes.forEach(mesh => {
                    mesh.setEnabled(shouldBeVisible);
                });
            });
        });
        
        // Tags actifs appliqués
    }
    
    
    // Appliquer une configuration de matériaux
    applyMaterialConfig(objectName, configName) {
        if (!this.tagConfig || !this.tagConfig.materials[objectName] || !this.tagConfig.materials[objectName][configName]) {
            console.warn(`Configuration ${configName} non trouvée pour ${objectName}`);
            return;
        }
        
        const materialConfig = this.tagConfig.materials[objectName][configName];
        this.activeMaterialConfigs.set(objectName, configName);
        
        // Appliquer les matériaux seulement au mesh spécifique (objectName)
        Object.keys(assetConfig.models).forEach(modelKey => {
            const model = assetConfig.models[modelKey];
            
            // Vérifier si ce modèle contient le mesh spécifique (objectName)
            if (model.meshes[objectName]) {
                const meshConfig = model.meshes[objectName];
                
                // Appliquer les matériaux aux slots de ce mesh spécifique
                Object.keys(materialConfig).forEach(slotName => {
                    const materialName = materialConfig[slotName];
                    const slotIndex = this.getSlotIndex(slotName);
                    
                    if (slotIndex >= 0 && this.materialsConfig.materials[materialName]) {
                        // Chercher d'abord les meshes primitifs (cas multi-matériaux)
                        let meshes = this.scene.meshes.filter(mesh => 
                            mesh.name === `${objectName}_primitive${slotIndex}`
                        );
                        
                        // Si aucun mesh primitif trouvé, chercher le mesh original (cas mono-matériau)
                        if (meshes.length === 0 && slotName === 'slot1') {
                            meshes = this.scene.meshes.filter(mesh => 
                                mesh.name === objectName && !mesh.name.includes('_primitive')
                            );
                        }
                        
                        meshes.forEach(mesh => {
                        applyMaterial(mesh, this.materialsConfig.materials[materialName]);
                        });
                    }
                });
                }
        });
        
        // Configuration de matériaux appliquée
    }
    
    // Obtenir l'index du slot de matériau
    getSlotIndex(slotName) {
        // Nettoyer la chaîne pour éliminer les caractères invisibles
        const cleanSlotName = slotName.trim();
        
        // Test direct avec if/else
        let result = -1;
        if (cleanSlotName === 'slot1') {
            result = 0;
        } else if (cleanSlotName === 'slot2') {
            result = 1;
        } else if (cleanSlotName === 'slot3') {
            result = 2;
        } else if (cleanSlotName === 'slot4') {
            result = 3;
        }
        
        return result;
    }
    
    // Définir le texte d'engraving
    setEngravingText(text) {
        this.engravingText = text;
        // Ici vous pourriez ajouter la logique pour appliquer le texte à l'objet 3D
        console.log('Engraving text:', text);
    }
    
    // Obtenir les tags actifs
    getActiveTags() {
        return {
            activeTags: Array.from(this.activeTags),
            materials: Object.fromEntries(this.activeMaterialConfigs),
            engravingText: this.engravingText || ''
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
    // Initialiser l'interface Tweakpane complète avec la classe TweakpaneManager
    const tweakpaneManager = new TweakpaneManager(scene, materialsConfig, config);
    
    // Initialiser le système de tags
    const tagManager = new TagManager(scene, materialsConfig);
    tagManager.loadTagConfiguration();
    
    // Appliquer une configuration de matériaux par défaut pour que Tweakpane fonctionne
    // Appliquer les configurations par défaut pour chaque mesh
    if (assetConfig && assetConfig.materialConfigs) {
        Object.keys(assetConfig.materialConfigs).forEach(meshName => {
            const meshConfigs = assetConfig.materialConfigs[meshName];
            const firstConfig = Object.keys(meshConfigs)[0]; // Prendre la première configuration
            if (firstConfig) {
                tagManager.applyMaterialConfig(meshName, firstConfig);
            }
        });
    }
    
    // Exposer les managers globalement pour les boutons HTML
    window.tweakpaneManager = tweakpaneManager;
    window.tagManager = tagManager;
    
    // Configurer les callbacks pour les changements de matériaux
    tweakpaneManager.onMaterialChange = (type, data) => {
        if (type === 'properties') {
            // Appliquer en temps réel UNIQUEMENT aux meshes qui utilisent déjà ce matériau
            tweakpaneManager.updateAppliedMaterials();
        }
    };
    
    // Initialiser l'interface
    await tweakpaneManager.init();
    
    // Appliquer la visibilité selon la variable tweakpaneVisible
    if (!tweakpaneVisible) {
        tweakpaneManager.setTweakpaneVisibility(false);
    }
    
    // Rendre le gestionnaire accessible globalement pour la sélection par clic
    window.tweakpaneManager = tweakpaneManager;

    // Sélection de matériau par clic dans la vue 3D (bouton gauche)
    scene.onPointerObservable.add((evt) => {
        if (evt.type === BABYLON.PointerEventTypes.POINTERDOWN && evt.event && evt.event.button === 0) {
            const pick = scene.pick(scene.pointerX, scene.pointerY);
            if (pick && pick.hit && pick.pickedMesh) {
                const pickedMesh = pick.pickedMesh;
                const meshMaterial = pickedMesh.material;
                if (meshMaterial && meshMaterial.name && materialsConfig && materialsConfig.materials && materialsConfig.materials[meshMaterial.name]) {
                    const selectedName = meshMaterial.name;
                    try {
                        tweakpaneManager.materialList.selected = selectedName;
                        tweakpaneManager.onMaterialSelectionChange(selectedName);
                        if (tweakpaneManager.pane) tweakpaneManager.pane.refresh();
                    } catch (e) {
                        console.warn('⚠️ Impossible de sélectionner le matériau dans Tweakpane:', e);
                    }
                }
            }
        }
    });
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
