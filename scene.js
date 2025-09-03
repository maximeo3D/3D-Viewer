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

console.log('Canvas dimensions:', canvas.width, canvas.height);
console.log('Canvas style dimensions:', canvas.style.width, canvas.style.height);

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
            // console.log("Configuration loaded from studio.json");
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
                    console.log("✅ Asset configuration loaded from Assets/asset.js");
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
            // console.log("Materials configuration loaded from Textures/materials.json");
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

// Fonction globale pour contrôler les animations basées sur la rotation
function updateAnimationsFromRotation() {
    // Appliquer aux animations de tous les modèles en fonction de LEUR rotation X actuelle
    if (window.loadedModels) {
        window.loadedModels.forEach((modelData, modelName) => {
            const groupNode = modelData.group;
            if (!groupNode) return;
            
            // Rotation X du TransformNode du modèle en degrés
            const rotationDegrees = BABYLON.Tools.ToDegrees(groupNode.rotation.x);
            
            // Normaliser -90°..+90° -> 0..1 (avec clamp pour éviter dépassements)
            let normalized = (rotationDegrees + 90) / 180; // 0 à 1 attendu
            if (normalized < 0) normalized = 0;
            if (normalized > 1) normalized = 1;
            
            if (modelData.animationGroups && modelData.animationGroups.length > 0) {
                modelData.animationGroups.forEach(animGroup => {
                    // Utiliser la plage réelle de l'animation (ex. 0..250)
                    const from = animGroup.from !== undefined ? animGroup.from : 0;
                    const to = animGroup.to !== undefined ? animGroup.to : 0;
                    const frameRange = to - from;
                    const targetFrame = from + (normalized * frameRange);
                    
                    // Appliquer la frame de manière plus robuste
                    animGroup.stop();
                    animGroup.goToFrame(targetFrame); // Aller à la frame spécifique
                    
                    // Forcer la mise à jour de tous les meshes de l'animation
                    if (animGroup.targetedAnimations) {
                        animGroup.targetedAnimations.forEach(targetAnim => {
                            if (targetAnim.target) {
                                targetAnim.target.markAsDirty();
                                // Forcer la mise à jour de la matrice de transformation
                                targetAnim.target.computeWorldMatrix(true);
                            }
                        });
                    }
                    
                    // Forcer la mise à jour de la scène
                    if (scene) {
                        scene.markAllMaterialsAsDirty();
                    }
                    
                    // Forcer l'évaluation de l'animation à la frame spécifique
                    animGroup.start(false, 1.0, targetFrame, targetFrame, false);
                    animGroup.stop();
                    
                    // Debug détaillé
                    console.log(`🎬 Animation ${animGroup.name} (${modelName}): rotX ${rotationDegrees.toFixed(1)}° → frame ${targetFrame.toFixed(1)}/${to.toFixed(1)}`);
                    console.log(`   - Animation from/to: ${from}/${to}`);
                    console.log(`   - Target animations count: ${animGroup.targetedAnimations ? animGroup.targetedAnimations.length : 0}`);
                });
            }
        });
    }
}

// Function to load 3D models
async function loadModels() {
    if (!assetConfig || !assetConfig.models) return;
    
    for (const modelConfig of assetConfig.models) {
        try {
            // console.log(`Loading model: ${modelConfig.name} from ${modelConfig.file}`);
            
            // Load the GLB file
            const result = await BABYLON.SceneLoader.ImportMeshAsync("", "Assets/", modelConfig.file, scene);
            
            if (result.meshes.length > 0) {
                // Group all meshes under a transform node
                const modelGroup = new BABYLON.TransformNode(modelConfig.name, scene);
                
                // Apply transform from config
                if (modelConfig.position) {
                    modelGroup.position = new BABYLON.Vector3(
                        modelConfig.position[0],
                        modelConfig.position[1],
                        modelConfig.position[2]
                    );
                }
                
                if (modelConfig.rotation) {
                    modelGroup.rotation = new BABYLON.Vector3(
                        modelConfig.rotation[0],
                        modelConfig.rotation[1],
                        modelConfig.rotation[2]
                    );
                }
                
                // Les objets commencent à 0° de rotation X
                modelGroup.rotation.x = 0;
                
                if (modelConfig.scale) {
                    modelGroup.scaling = new BABYLON.Vector3(
                        modelConfig.scale[0],
                        modelConfig.scale[1],
                        modelConfig.scale[2]
                    );
                }
                
                // Parent all meshes to the group
                result.meshes.forEach(mesh => {
                    mesh.parent = modelGroup;
                });
                
                // Apply visibility per mesh based on configuration
                if (modelConfig.meshes) {
                    result.meshes.forEach(mesh => {
                        // Check if this is a primitive submesh (e.g., Cube_primitive0, Cube_primitive1)
                        const primitiveMatch = mesh.name.match(/^(.+)_primitive(\d+)$/);
                        if (primitiveMatch) {
                            const baseMeshName = primitiveMatch[1];
                            
                            // Find the mesh config for the base mesh
                            const meshConfig = modelConfig.meshes.find(m => m.name === baseMeshName);
                            if (meshConfig && meshConfig.visible !== undefined) {
                                mesh.setEnabled(meshConfig.visible);
                            }
                        } else {
                            // Handle non-primitive meshes (fallback)
                            const meshConfig = modelConfig.meshes.find(m => m.name === mesh.name);
                            if (meshConfig && meshConfig.visible !== undefined) {
                                mesh.setEnabled(meshConfig.visible);
                            }
                        }
                    });
                }
                
                // Apply materials based on mesh names and material slots
                if (modelConfig.meshes && materialsConfig && materialsConfig.materials) {
                    result.meshes.forEach(mesh => {
                        // Check if this is a primitive submesh (e.g., Cube_primitive0, Cube_primitive1)
                        const primitiveMatch = mesh.name.match(/^(.+)_primitive(\d+)$/);
                        if (primitiveMatch) {
                            const baseMeshName = primitiveMatch[1];
                            const primitiveIndex = parseInt(primitiveMatch[2]);
                            
                            // Find the mesh config for the base mesh
                            const meshConfig = modelConfig.meshes.find(m => m.name === baseMeshName);
                            if (meshConfig) {
                                // Apply material based on primitive index
                                const materialSlotKey = `materialSlot${primitiveIndex + 1}`;
                                const materialName = meshConfig[materialSlotKey];
                                
                                if (materialName && materialsConfig.materials[materialName]) {
                                    applyMaterial(mesh, materialsConfig.materials[materialName]);
                                    // console.log(`Applied ${materialName} material to ${mesh.name} (${materialSlotKey})`);
                                }
                            }
                        } else {
                            // Handle non-primitive meshes (fallback)
                            const meshConfig = modelConfig.meshes.find(m => m.name === mesh.name);
                            if (meshConfig && meshConfig.materialSlot1 && materialsConfig.materials[meshConfig.materialSlot1]) {
                                applyMaterial(mesh, materialsConfig.materials[meshConfig.materialSlot1]);
                            }
                        }
                    });
                }
                
                // Handle animations - stop automatic playback and prepare for manual control
                let animationGroups = [];
                if (result.animationGroups && result.animationGroups.length > 0) {
                    result.animationGroups.forEach(animGroup => {
                        // Stop automatic playback
                        animGroup.stop();
                        // Store animation group for manual control
                        animationGroups.push(animGroup);
                        console.log(`🎬 Found animation: ${animGroup.name} (${animGroup.from} to ${animGroup.to} frames)`);
                    });
                }
                
                // Store the loaded model with animation groups
                loadedModels.set(modelConfig.name, {
                    group: modelGroup,
                    meshes: result.meshes,
                    config: modelConfig,
                    animationGroups: animationGroups
                });
                
                // Initialiser les animations selon la rotation actuelle du node (au chargement)
                if (animationGroups.length > 0) {
                    updateAnimationsFromRotation();
                }
                
                // console.log(`✅ Model ${modelConfig.name} loaded successfully`);
            }
        } catch (error) {
            console.error(`❌ Failed to load model ${modelConfig.name}:`, error);
        }
    }
}

// Function to create PBR material according to Babylon.js documentation
function createPBRMaterial(materialConfig, scene) {
    const pbr = new BABYLON.PBRMaterial(`${materialConfig.name || "pbr"}_material`, scene);
    
    // === BASE PBR PROPERTIES ===
    if (materialConfig.baseColor) {
        const color = BABYLON.Color3.FromHexString(materialConfig.baseColor);
        pbr.albedoColor = color;
    }
    
    pbr.metallic = materialConfig.metallic !== undefined ? materialConfig.metallic : 0;
    pbr.roughness = materialConfig.roughness !== undefined ? materialConfig.roughness : 0.5;
    pbr.alpha = materialConfig.alpha !== undefined ? materialConfig.alpha : 1.0;
    
    // === TEXTURES ===
    // Albedo texture (base color)
    if (materialConfig.albedoTexture && materialConfig.albedoTexture.trim() !== '' && materialConfig.albedoTexture !== 'None') {
        pbr.albedoTexture = new BABYLON.Texture(`Textures/${materialConfig.albedoTexture}`, scene);
    } else {
        pbr.albedoTexture = null;
    }
    
    // Normal/Bump texture
    if (materialConfig.bumpTexture && materialConfig.bumpTexture.trim() !== '' && materialConfig.bumpTexture !== 'None') {
        pbr.bumpTexture = new BABYLON.Texture(`Textures/${materialConfig.bumpTexture}`, scene);
        pbr.bumpTexture.level = materialConfig.bumpTextureIntensity !== undefined ? materialConfig.bumpTextureIntensity : 1.0;
    }
    
    // === SEPARATE TEXTURES ===
    // Metallic texture
    if (materialConfig.metallicTexture && materialConfig.metallicTexture.trim() !== '' && materialConfig.metallicTexture !== 'None') {
        pbr.metallicTexture = new BABYLON.Texture(`Textures/${materialConfig.metallicTexture}`, scene);
    }
    
    // Microsurface (roughness) texture
    if (materialConfig.microSurfaceTexture && materialConfig.microSurfaceTexture.trim() !== '' && materialConfig.microSurfaceTexture !== 'None') {
        pbr.microSurfaceTexture = new BABYLON.Texture(`Textures/${materialConfig.microSurfaceTexture}`, scene);
    }
    
    // Ambient occlusion texture
    if (materialConfig.ambientTexture && materialConfig.ambientTexture.trim() !== '' && materialConfig.ambientTexture !== 'None') {
        pbr.ambientTexture = new BABYLON.Texture(`Textures/${materialConfig.ambientTexture}`, scene);
    }
    
    // Opacity texture for local transparency control
    if (materialConfig.opacityTexture && materialConfig.opacityTexture.trim() !== '' && materialConfig.opacityTexture !== 'None') {
        pbr.opacityTexture = new BABYLON.Texture(`Textures/${materialConfig.opacityTexture}`, scene);
        pbr.opacityTexture.getAlphaFromRGB = true; // CRUCIAL pour que l'opacityTexture fonctionne
        
        // When opacity texture is present, DON'T set pbr.opacity - let the texture handle it
        // The alpha slider will control the overall transparency of the visible parts
    } else {
        // When no opacity texture, use alpha for global transparency
        pbr.alpha = materialConfig.alpha !== undefined ? materialConfig.alpha : 1.0;
    }
    
    // === LIGHTMAP ===
    // Lightmap texture for baked lighting
    if (materialConfig.lightmapTexture && materialConfig.lightmapTexture.trim() !== '' && materialConfig.lightmapTexture !== 'None') {
        pbr.lightmapTexture = new BABYLON.Texture(`Textures/${materialConfig.lightmapTexture}`, scene);
        
        // Enable lightmap as shadowmap by default for better performance
        pbr.useLightmapAsShadowmap = materialConfig.useLightmapAsShadowmap !== undefined ? materialConfig.useLightmapAsShadowmap : true;
    }
    
    // === TEXTURE TRANSFORMATIONS ===
    // Apply transformations to all textures except lightmap
    applyTextureTransformations(pbr, materialConfig);
    
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
function applyTextureTransformations(pbr, materialConfig) {
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
            if (materialConfig.uOffset !== undefined) {
                texture.uOffset = materialConfig.uOffset;
            }
            if (materialConfig.vOffset !== undefined) {
                texture.vOffset = materialConfig.vOffset;
            }
            
            // Apply U/V Scale
            if (materialConfig.uScale !== undefined) {
                texture.uScale = materialConfig.uScale;
            }
            if (materialConfig.vScale !== undefined) {
                texture.vScale = materialConfig.vScale;
            }
            
            // Apply W Rotation (convert degrees to radians)
            if (materialConfig.wRotation !== undefined) {
                texture.wAng = BABYLON.Tools.ToRadians(materialConfig.wRotation);
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
            
            // Appliquer la rotation aux objets
            if (window.loadedModels) {
                window.loadedModels.forEach((modelData, modelName) => {
                    if (modelData.group) {
                        modelData.group.rotation.x = currentObjectRotationX;
                    }
                });
            }
            
            // Mettre à jour les animations basées sur la rotation du node
            updateAnimationsFromRotation();
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
                
                // Appliquer la rotation limitée à tous les objets chargés
                if (window.loadedModels) {
                    window.loadedModels.forEach((modelData, modelName) => {
                        if (modelData.group) {
                            modelData.group.rotation.x = clampedRotationX;
                        }
                    });
                }
                
                // Mettre à jour les animations basées sur la rotation du node
                updateAnimationsFromRotation();
                
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
        
        // console.log("HDR loaded successfully with HDRCubeTexture");
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
            
            // console.log("HDR loaded successfully with CreateFromPrefilteredData");
        } catch (fallbackError) {
            console.error("Fallback HDR loading also failed:", fallbackError);
        }
    }
    
    return scene;
};

// Call the createScene function
createScene().then(async createdScene => {
    // Initialiser l'interface dat.GUI complète avec la classe DatGUIManager
    const datGUIManager = new DatGUIManager(scene, materialsConfig, config);
    
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
    }
});

// Handle browser/canvas resize events
window.addEventListener("resize", function() {
    engine.resize();
});
