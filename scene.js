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
let assetConfig = null; // Asset configuration
let materialsConfig = null; // Materials configuration



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
        const response = await fetch('Assets/asset.json');
        if (response.ok) {
            assetConfig = await response.json();
            // console.log("Asset configuration loaded from Assets/asset.json");
        } else {
            console.warn("Could not load Assets/asset.json, using default values");
            assetConfig = {
                models: []
            };
        }
    } catch (error) {
        console.warn("Error loading Assets/asset.json, using default values:", error);
        assetConfig = {
            models: []
        };
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
                
                if (modelConfig.scale) {
                    modelGroup.scaling = new BABYLON.Vector3(
                        modelConfig.scale[0],
                        modelConfig.scale[1],
                        modelConfig.scale[2]
                    );
                }
                
                // Set visibility
                if (modelConfig.visible !== undefined) {
                    modelGroup.setEnabled(modelConfig.visible);
                }
                
                // Parent all meshes to the group
                result.meshes.forEach(mesh => {
                    mesh.parent = modelGroup;
                });
                
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
                
                // Store the loaded model
                loadedModels.set(modelConfig.name, {
                    group: modelGroup,
                    meshes: result.meshes,
                    config: modelConfig
                });
                
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
    
    // Add smooth zoom interpolation in the render loop with easing
    scene.onBeforeRenderObservable.add(() => {
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
    });
    
    camera.attachControl(canvas, true);
    
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
