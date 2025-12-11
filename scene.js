// Get the canvas element
const canvas = document.getElementById("renderCanvas");

// Create the BABYLON engine (tuned for mobile stability)
const engine = new BABYLON.Engine(canvas, true, {
    preserveDrawingBuffer: false,
    powerPreference: "high-performance",
    xrCompatible: false,
    disableUniformBuffers: true
});

// Reduce render resolution on mobile to avoid GPU memory issues
try {
    if (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
        engine.setHardwareScalingLevel(1.5);
    }
} catch (_) {}

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
let tweakpaneVisible = (typeof window !== 'undefined' && typeof window.showTweakpane === 'boolean')
    ? window.showTweakpane
    : true;



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

// Chargement d'un modèle au format binaire optimisé
async function loadBinaryModel(modelConfig) {
    const binFile = modelConfig.file.replace(/\.glb$/, '.bin');
    const offset = modelConfig.dataOffset || 0;
    const response = await fetch(`Assets/${binFile}`);
    if (!response.ok) throw new Error(`Cannot fetch ${binFile} (${response.status})`);

    const buffer = await response.arrayBuffer();
    const source = new Uint8Array(buffer);
    const data = new Uint8Array(source.length);
    for (let i = 0; i < source.length; i++) {
        data[i] = source[i] ^ offset;
    }

    const blob = new Blob([data], { type: "model/gltf-binary" });
    const file = new File([blob], modelConfig.file);

    return BABYLON.SceneLoader.ImportMeshAsync("", "file:", file, scene);
}

// Function to load 3D models
async function loadModels() {
    if (!assetConfig || !assetConfig.models) return;
    
    // Charger le modèle depuis la configuration asset.js
    const modelConfig = assetConfig.models.part_model;
    if (!modelConfig) return;
    const modelFile = modelConfig.file;
    
    try {
        let result;
        if (modelConfig.format === "bin") {
            result = await loadBinaryModel(modelConfig);
        } else {
            result = await BABYLON.SceneLoader.ImportMeshAsync("", "Assets/", modelFile, scene);
        }
        
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
    
    const name = materialName || `${finalMaterialConfig.name || "pbr"}_material`;
    // Reuse existing material instance if available
    let pbr = scene.materials.find(m => m && m.name === name && m instanceof BABYLON.PBRMaterial);
    if (!pbr) {
        pbr = new BABYLON.PBRMaterial(name, scene);
    }
    // Track single instance per material name
    try {
        if (!window.materialInstances) window.materialInstances = {};
        window.materialInstances[name] = [pbr];
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
        if (!pbr.albedoTexture || pbr.albedoTexture.name !== finalMaterialConfig.albedoTexture) {
            if (pbr.albedoTexture) { try { pbr.albedoTexture.dispose(); } catch(_){} }
            pbr.albedoTexture = new BABYLON.Texture(`Textures/${finalMaterialConfig.albedoTexture}`, scene);
            pbr.albedoTexture.name = finalMaterialConfig.albedoTexture;
        }
        if (pbr.albedoTexture.onErrorObservable) {
            pbr.albedoTexture.onErrorObservable.add(() => {
                console.error(`❌ Failed to load albedo texture: ${finalMaterialConfig.albedoTexture}`);
            });
        }
    } else {
        if (pbr.albedoTexture) { try { pbr.albedoTexture.dispose(); } catch(_){} }
        pbr.albedoTexture = null;
    }
    
    // Normal/Bump texture
    if (finalMaterialConfig.bumpTexture && finalMaterialConfig.bumpTexture.trim() !== '' && finalMaterialConfig.bumpTexture !== 'None') {
        if (!pbr.bumpTexture || pbr.bumpTexture.name !== finalMaterialConfig.bumpTexture) {
            if (pbr.bumpTexture) { try { pbr.bumpTexture.dispose(); } catch(_){} }
            pbr.bumpTexture = new BABYLON.Texture(`Textures/${finalMaterialConfig.bumpTexture}`, scene);
            pbr.bumpTexture.name = finalMaterialConfig.bumpTexture;
        }
        pbr.bumpTexture.level = finalMaterialConfig.bumpTextureIntensity !== undefined ? finalMaterialConfig.bumpTextureIntensity : 1.0;
        pbr.bumpTexture.vFlip = false; // Corriger l'effet miroir
        // Réduire le moiré: filtrage trilineaire + anisotropie
        try {
            const anisotropicMode = BABYLON.Texture.ANISOTROPIC_SAMPLINGMODE || BABYLON.Texture.TRILINEAR_SAMPLINGMODE;
            pbr.bumpTexture.updateSamplingMode(anisotropicMode);
            const maxAniso = (scene.getEngine().getCaps().maxAnisotropy || 8);
            pbr.bumpTexture.anisotropicFilteringLevel = Math.min(16, maxAniso);
        } catch (_) {}
        if (pbr.bumpTexture.onErrorObservable) {
            pbr.bumpTexture.onErrorObservable.add(() => {
                console.error(`❌ Failed to load bump texture: ${finalMaterialConfig.bumpTexture}`);
            });
        }
    } else if (pbr.bumpTexture) { try { pbr.bumpTexture.dispose(); } catch(_){} pbr.bumpTexture = null; }
    
    // === SEPARATE TEXTURES ===
    // Metallic texture
    if (finalMaterialConfig.metallicTexture && finalMaterialConfig.metallicTexture.trim() !== '' && finalMaterialConfig.metallicTexture !== 'None') {
        if (!pbr.metallicTexture || pbr.metallicTexture.name !== finalMaterialConfig.metallicTexture) {
            if (pbr.metallicTexture) { try { pbr.metallicTexture.dispose(); } catch(_){} }
            pbr.metallicTexture = new BABYLON.Texture(`Textures/${finalMaterialConfig.metallicTexture}`, scene);
            pbr.metallicTexture.name = finalMaterialConfig.metallicTexture;
        }
        pbr.metallicTexture.vFlip = false; // Corriger l'effet miroir
    } else if (pbr.metallicTexture) { try { pbr.metallicTexture.dispose(); } catch(_){} pbr.metallicTexture = null; }
    
    // Microsurface (roughness) texture
    if (finalMaterialConfig.microSurfaceTexture && finalMaterialConfig.microSurfaceTexture.trim() !== '' && finalMaterialConfig.microSurfaceTexture !== 'None') {
        if (!pbr.microSurfaceTexture || pbr.microSurfaceTexture.name !== finalMaterialConfig.microSurfaceTexture) {
            if (pbr.microSurfaceTexture) { try { pbr.microSurfaceTexture.dispose(); } catch(_){} }
            pbr.microSurfaceTexture = new BABYLON.Texture(`Textures/${finalMaterialConfig.microSurfaceTexture}`, scene);
            pbr.microSurfaceTexture.name = finalMaterialConfig.microSurfaceTexture;
        }
        pbr.microSurfaceTexture.vFlip = false; // Corriger l'effet miroir
    } else if (pbr.microSurfaceTexture) { try { pbr.microSurfaceTexture.dispose(); } catch(_){} pbr.microSurfaceTexture = null; }
    
    // Ambient occlusion texture
    if (finalMaterialConfig.ambientTexture && finalMaterialConfig.ambientTexture.trim() !== '' && finalMaterialConfig.ambientTexture !== 'None') {
        if (!pbr.ambientTexture || pbr.ambientTexture.name !== finalMaterialConfig.ambientTexture) {
            if (pbr.ambientTexture) { try { pbr.ambientTexture.dispose(); } catch(_){} }
            pbr.ambientTexture = new BABYLON.Texture(`Textures/${finalMaterialConfig.ambientTexture}`, scene);
            pbr.ambientTexture.name = finalMaterialConfig.ambientTexture;
        }
        pbr.ambientTexture.vFlip = false; // Corriger l'effet miroir
    } else if (pbr.ambientTexture) { try { pbr.ambientTexture.dispose(); } catch(_){} pbr.ambientTexture = null; }
    
    // Opacity texture for local transparency control
    if (finalMaterialConfig.opacityTexture && finalMaterialConfig.opacityTexture.trim() !== '' && finalMaterialConfig.opacityTexture !== 'None') {
        if (!pbr.opacityTexture || pbr.opacityTexture.name !== finalMaterialConfig.opacityTexture) {
            if (pbr.opacityTexture) { try { pbr.opacityTexture.dispose(); } catch(_){} }
            pbr.opacityTexture = new BABYLON.Texture(`Textures/${finalMaterialConfig.opacityTexture}`, scene);
            pbr.opacityTexture.name = finalMaterialConfig.opacityTexture;
        }
        pbr.opacityTexture.getAlphaFromRGB = true; // CRUCIAL pour que l'opacityTexture fonctionne
        pbr.opacityTexture.vFlip = false; // Corriger l'effet miroir
        
        // When opacity texture is present, DON'T set pbr.opacity - let the texture handle it
        // The alpha slider will control the overall transparency of the visible parts
    } else {
        if (pbr.opacityTexture) { try { pbr.opacityTexture.dispose(); } catch(_){} }
        pbr.opacityTexture = null;
        // When no opacity texture, use alpha for global transparency
        pbr.alpha = finalMaterialConfig.alpha !== undefined ? finalMaterialConfig.alpha : 1.0;
    }
    
    // === LIGHTMAP ===
    // Lightmap texture for baked lighting
    if (finalMaterialConfig.lightmapTexture && finalMaterialConfig.lightmapTexture.trim() !== '' && finalMaterialConfig.lightmapTexture !== 'None') {
        if (!pbr.lightmapTexture || pbr.lightmapTexture.name !== finalMaterialConfig.lightmapTexture) {
            if (pbr.lightmapTexture) { try { pbr.lightmapTexture.dispose(); } catch(_){} }
            pbr.lightmapTexture = new BABYLON.Texture(`Textures/${finalMaterialConfig.lightmapTexture}`, scene);
            pbr.lightmapTexture.name = finalMaterialConfig.lightmapTexture;
        }
        pbr.lightmapTexture.vFlip = false; // Corriger l'effet miroir
        // Set lightmap UV set (0 or 1)
        const lmUV = (finalMaterialConfig.lightmapUVSet !== undefined) ? finalMaterialConfig.lightmapUVSet : 0;
        pbr.lightmapTexture.coordinatesIndex = lmUV;
        
        // Enable lightmap as shadowmap by default for better performance
        pbr.useLightmapAsShadowmap = finalMaterialConfig.useLightmapAsShadowmap !== undefined ? finalMaterialConfig.useLightmapAsShadowmap : true;
    } else if (pbr.lightmapTexture) { try { pbr.lightmapTexture.dispose(); } catch(_){} pbr.lightmapTexture = null; }
    
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

    // Viewpoint helper and wiring
    function normalizeRadTau(angle) {
        // Wrap to [0, 2π)
        let a = angle % (2 * Math.PI);
        if (a < 0) a += 2 * Math.PI;
        return a;
    }
    function shortestAnglePositive(from, to) {
        // Work in [0,2π). Compute shortest delta considering wrap-around
        const a = normalizeRadTau(from);
        const b = normalizeRadTau(to);
        let delta = b - a;
        if (delta > Math.PI) delta -= 2 * Math.PI;
        if (delta < -Math.PI) delta += 2 * Math.PI;
        return a + delta;
    }

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

    function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }

    async function animateToViewpoint(vp, totalDurationMs = 1000) {
        if (!vp || !camera) return;

        const start = {
            alpha: camera.alpha,
            fov: camera.fov,
            target: camera.target.clone(),
            radius: camera.radius,
            min: camera.lowerRadiusLimit ?? 0.1,
            max: camera.upperRadiusLimit ?? 1000
        };

        const end = {
            alpha: (vp.alpha !== undefined ? vp.alpha : start.alpha),
            fov: (vp.fov !== undefined ? (vp.fov > 2 ? BABYLON.Tools.ToRadians(vp.fov) : vp.fov) : start.fov),
            target: new BABYLON.Vector3(
                vp.targetX !== undefined ? vp.targetX : start.target.x,
                vp.targetY !== undefined ? vp.targetY : start.target.y,
                vp.targetZ !== undefined ? vp.targetZ : start.target.z
            ),
            min: (vp.minDistance !== undefined ? vp.minDistance : start.min),
            max: (vp.maxDistance !== undefined ? vp.maxDistance : start.max),
            radius: (vp.radius !== undefined ? vp.radius : start.radius)
        };

        const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

        // Helper: démarrer la phase 2 (zoom/target/limites/radius) pour une durée donnée
        const startZoomPhase = (durationMs, startSnapshot) => new Promise(resolve => {
            const s2 = startSnapshot || {
                fov: camera.fov,
                target: camera.target.clone(),
                radius: camera.radius,
                min: camera.lowerRadiusLimit ?? start.min,
                max: camera.upperRadiusLimit ?? start.max
            };
            const t0 = performance.now();
            const tick = () => {
                const now = performance.now();
                const t = Math.min(1, (now - t0) / durationMs);
                const k = easeInOutCubic(t);

                // FOV
                camera.fov = s2.fov + (end.fov - s2.fov) * k;

                // Target
                const tx = s2.target.x + (end.target.x - s2.target.x) * k;
                const ty = s2.target.y + (end.target.y - s2.target.y) * k;
                const tz = s2.target.z + (end.target.z - s2.target.z) * k;
                camera.target = new BABYLON.Vector3(tx, ty, tz);

                // Limites
                const curMin = s2.min + (end.min - s2.min) * k;
                const curMax = s2.max + (end.max - s2.max) * k;
                camera.lowerRadiusLimit = curMin;
                camera.upperRadiusLimit = curMax;

                // Radius clampé
                const desiredRadius = s2.radius + (end.radius - s2.radius) * k;
                camera.radius = Math.max(curMin, Math.min(curMax, desiredRadius));

                if (t < 1) requestAnimationFrame(tick); else resolve();
            };
            requestAnimationFrame(tick);
        });

        // Phase 1: Rotation alpha uniquement, avec overlap démarrant la phase 2 avant la fin
        const alphaStart = normalizeRadTau(start.alpha);
        const alphaTarget = shortestAnglePositive(alphaStart, end.alpha);
        const alphaDuration = Math.max(200, Math.round(totalDurationMs * 0.5));
        const overlap = Math.min(250, Math.max(80, Math.round(alphaDuration * 0.5))); // chevauchement doux
        const restDuration = Math.max(200, totalDurationMs - alphaDuration);
        let phase2Promise = null;

        await new Promise(resolve => {
            const t0 = performance.now();
            const tick = () => {
                const now = performance.now();
                const elapsed = now - t0;
                const t = Math.min(1, elapsed / alphaDuration);
                const k = easeInOutCubic(t);
                camera.alpha = normalizeRadTau(alphaStart + (alphaTarget - alphaStart) * k);

                // Lancer la phase 2 sur les derniers X ms de la rotation pour lisser la transition
                if (!phase2Promise && elapsed >= alphaDuration - overlap) {
                    const startSnapshot = {
                        fov: camera.fov,
                        target: camera.target.clone(),
                        radius: camera.radius,
                        min: camera.lowerRadiusLimit ?? start.min,
                        max: camera.upperRadiusLimit ?? start.max
                    };
                    phase2Promise = startZoomPhase(restDuration + overlap, startSnapshot);
                }

                if (t < 1) requestAnimationFrame(tick); else resolve();
            };
            requestAnimationFrame(tick);
        });

        // Si la phase 2 n'a pas démarré pendant l'overlap, la démarrer maintenant
        if (!phase2Promise) {
            phase2Promise = startZoomPhase(restDuration, null);
        }
        await phase2Promise;
    }

    window.gotoViewpoint = (name) => {
        const vp = (config.viewpoints && config.viewpoints[name]) ? config.viewpoints[name] : null;
        if (vp) animateToViewpoint(vp, 800);
    };

    // Apply default viewpoint on init if present
    if (config.viewpoints && config.viewpoints.Viewpoint1) {
        const vp = config.viewpoints.Viewpoint1;
        camera.alpha = (vp.alpha !== undefined ? vp.alpha : camera.alpha);
        if (vp.beta !== undefined) camera.beta = vp.beta;
        camera.radius = (vp.radius !== undefined ? vp.radius : camera.radius);
        if (vp.fov !== undefined) camera.fov = (vp.fov > 2 ? BABYLON.Tools.ToRadians(vp.fov) : vp.fov);
        camera.target = new BABYLON.Vector3(
            vp.targetX !== undefined ? vp.targetX : camera.target.x,
            vp.targetY !== undefined ? vp.targetY : camera.target.y,
            vp.targetZ !== undefined ? vp.targetZ : camera.target.z
        );
        if (vp.minDistance !== undefined) camera.lowerRadiusLimit = vp.minDistance;
        if (vp.maxDistance !== undefined) camera.upperRadiusLimit = vp.maxDistance;
    }
    
    
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
    
    // Supprimer tous les inputs existants
    camera.inputs.clear();
    
    // Ajouter seulement le contrôle de zoom par molette
    camera.inputs.add(new BABYLON.ArcRotateCameraMouseWheelInput());
    
    // Ajouter le contrôle tactile pour le pinch-to-zoom UNIQUEMENT
    const pointersInput = new BABYLON.ArcRotateCameraPointersInput();
    // Désactiver tous les boutons pour empêcher rotation/pan via pointersInput
    pointersInput.buttons = [];
    pointersInput.pinchPrecision = 100; // Sensibilité du pinch (plus bas = plus sensible)
    pointersInput.multiTouchPanning = false;
    pointersInput.multiTouchPanAndZoom = false;
    pointersInput.panningSensibility = 0;
    camera.inputs.add(pointersInput);
    
    // Réattacher UNIQUEMENT pour le pinch, pas pour la rotation
    camera.attachControl(canvas, true);
    
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
    
    // Listener de zoom fluide (molette de souris)
    canvas.addEventListener('wheel', (event) => {
        event.preventDefault();
        
        const delta = event.deltaY;
        const zoomFactor = 1 + (delta * camera.wheelPrecision / 1000);
        const newTargetRadius = Math.max(camera.lowerRadiusLimit, Math.min(camera.upperRadiusLimit, targetRadius * zoomFactor));
        
        targetRadius = newTargetRadius;
    });
    
    // Implémentation manuelle du pinch-to-zoom pour mobile
    let touchStartDistance = 0;
    let touchStartRadius = 0;
    let isPinching = false;
    const savedBeta = config.camera.beta; // Sauvegarder la valeur de beta
    let savedAlpha = camera.alpha; // Sauvegarder la valeur de alpha
    
    canvas.addEventListener('touchstart', (event) => {
        if (event.touches.length === 2) {
            isPinching = true;
            // Sauvegarder les valeurs actuelles de la caméra
            savedAlpha = camera.alpha;
            // Calculer la distance initiale entre les deux doigts
            const touch1 = event.touches[0];
            const touch2 = event.touches[1];
            const dx = touch2.clientX - touch1.clientX;
            const dy = touch2.clientY - touch1.clientY;
            touchStartDistance = Math.sqrt(dx * dx + dy * dy);
            touchStartRadius = targetRadius;
        }
    }, { passive: true });
    
    canvas.addEventListener('touchmove', (event) => {
        if (event.touches.length === 2) {
            event.preventDefault();
            isPinching = true;
            
            // Calculer la distance actuelle entre les deux doigts
            const touch1 = event.touches[0];
            const touch2 = event.touches[1];
            const dx = touch2.clientX - touch1.clientX;
            const dy = touch2.clientY - touch1.clientY;
            const currentDistance = Math.sqrt(dx * dx + dy * dy);
            
            // Calculer le facteur de zoom basé sur la variation de distance
            const distanceRatio = touchStartDistance / currentDistance;
            const newTargetRadius = touchStartRadius * distanceRatio;
            
            // Appliquer les limites
            targetRadius = Math.max(camera.lowerRadiusLimit, Math.min(camera.upperRadiusLimit, newTargetRadius));
            
            // Forcer alpha et beta à rester constants pendant le pinch
            camera.alpha = savedAlpha;
            camera.beta = savedBeta;
        }
    }, { passive: false });
    
    canvas.addEventListener('touchend', (event) => {
        if (event.touches.length < 2) {
            touchStartDistance = 0;
            isPinching = false;
        }
    }, { passive: true });
    
    // Interpolation fluide du zoom
    scene.onBeforeRenderObservable.add(() => {
        // Forcer alpha et beta à rester constants pendant le pinch
        if (isPinching) {
            camera.alpha = savedAlpha;
            camera.beta = savedBeta;
        }
        
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
            // Ignorer si c'est un pinch (2+ doigts) ou si on est en train de pincher
            if ((evt.event.touches && evt.event.touches.length > 1) || isPinching) {
                return;
            }
            
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
            // Ignorer si c'est un pinch (2+ doigts) ou si on est en train de pincher
            if ((evt.event.touches && evt.event.touches.length > 1) || isPinching) {
                return;
            }
            
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
    
    // HDR/Environment setup with robust mobile fallbacks
    try {
        let envSet = false;
        try {
            // Prefer prefiltered .env if available
            const env = BABYLON.CubeTexture.CreateFromPrefilteredData("Textures/HDR/default.env", scene);
            if (env) {
                scene.environmentTexture = env;
                envSet = true;
            }
        } catch (_) {}

        if (!envSet) {
            // Try HDR as fallback
            const hdrTexture = new BABYLON.HDRCubeTexture("Textures/HDR/default.hdr", scene, 256, false, false, false, true);
            scene.environmentTexture = hdrTexture;
        }

        scene.environmentIntensity = config.environment.hdrExposure;

        // Apply orientation from config when possible
        const tex = scene.environmentTexture;
        if (tex) {
            if (typeof tex.rotationY === 'number') {
                tex.rotationY = config.environment.orientation;
            } else if (tex.setReflectionTextureMatrix) {
                tex.setReflectionTextureMatrix(
                    BABYLON.Matrix.RotationY(BABYLON.Tools.ToRadians(config.environment.orientation))
                );
            }
        }
    } catch (error) {
        console.error("HDR/env loading failed:", error);
        try {
            const hdrTexture = BABYLON.CubeTexture.CreateFromPrefilteredData("Textures/HDR/default.hdr", scene);
            scene.environmentTexture = hdrTexture;
            scene.environmentIntensity = config.environment.hdrExposure;
            if (hdrTexture.setReflectionTextureMatrix) {
                hdrTexture.setReflectionTextureMatrix(
                    BABYLON.Matrix.RotationY(BABYLON.Tools.ToRadians(config.environment.orientation))
                );
            }
        } catch (fallbackError) {
            console.error("Fallback HDR loading also failed:", fallbackError);
            // Last resort: simple lighting so scene is visible on mobile
            const hemi = new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0, 1, 0), scene);
            hemi.intensity = 1.0;
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
                let shouldBeVisible = meshTags.some(tag => this.activeTags.has(tag));
                // Cas particulier: les meshes 'engraving' sont invisibles tant que le texte est vide
                if (meshTags.includes('engraving')) {
                    if (!this.engravingText || this.engravingText.trim() === '') {
                        shouldBeVisible = false;
                    }
                }
                
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
                            // Appliquer un matériau réutilisable (évite la duplication)
                            const mat = createPBRMaterial(this.materialsConfig.materials[materialName], this.scene, materialName);
                            mesh.material = mat;
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
        // Gérer automatiquement le tag 'engraving' selon la présence de texte
        if (this.engravingText && this.engravingText.trim() !== '') {
            this.activeTags.add('engraving');
        } else {
            this.activeTags.delete('engraving');
        }
        // Délégué au EngravingManager si disponible
        if (window.engravingManager) {
            window.engravingManager.setText(this.engravingText);
        }
    }

    // Définir manuellement le ratio largeur/hauteur (ex: 2 pour 2:1). Passer null pour revenir à l'auto.
    setEngravingAspect(aspectOrNull) {
        if (aspectOrNull === null || aspectOrNull === undefined) {
            this.engravingAspectOverride = null;
        } else {
            const a = Number(aspectOrNull);
            if (!isNaN(a) && a > 0) this.engravingAspectOverride = a;
        }
        this.updateEngravingTextures();
    }

    // Calcul automatique du ratio à partir des dimensions du mesh taggé 'engraving'
    getEngravingAspectRatio() {
        if (this.engravingAspectOverride && this.engravingAspectOverride > 0) return this.engravingAspectOverride;

        // Trouver un mesh avec le tag 'engraving'
        let targetMesh = null;
        if (assetConfig && assetConfig.models) {
            outer: for (const modelKey of Object.keys(assetConfig.models)) {
                const model = assetConfig.models[modelKey];
                for (const meshName of Object.keys(model.meshes)) {
                    const tags = model.meshes[meshName].tags || [];
                    if (tags.includes('engraving')) {
                        const meshes = this.scene.meshes.filter(m => m && (m.name === meshName || m.name.startsWith(meshName + '_primitive')));
                        if (meshes.length > 0) { targetMesh = meshes[0]; break outer; }
                    }
                }
            }
        }
        if (!targetMesh) return 1; // fallback carré

        const ext = targetMesh.getBoundingInfo().boundingBox.extendSize; // demi-tailles
        const size = new BABYLON.Vector3(ext.x * 2, ext.y * 2, ext.z * 2);
        // Prendre les deux plus grandes dimensions comme plan
        const dims = [size.x, size.y, size.z].sort((a,b) => b - a);
        const width = Math.max(0.0001, dims[0]);
        const height = Math.max(0.0001, dims[1]);
        const aspect = width / height;
        // Clamping raisonnable
        return Math.max(0.1, Math.min(10, aspect));
    }
    
    // Obtenir les tags actifs
    getActiveTags() {
        return {
            activeTags: Array.from(this.activeTags),
            materials: Object.fromEntries(this.activeMaterialConfigs),
            engravingText: this.engravingText || ''
        };
    }

    // (logique d'engraving déportée dans EngravingManager)

    // Appliquer la texture d'alpha aux meshes taggés 'engraving'
    applyEngravingOpacity(textureOrNull) {
        Object.keys(assetConfig.models).forEach(modelKey => {
            const model = assetConfig.models[modelKey];
            Object.keys(model.meshes).forEach(meshName => {
                const meshCfg = model.meshes[meshName];
                const tags = meshCfg.tags || [];
                if (!tags.includes('engraving')) return;

                let meshes = this.scene.meshes.filter(m => m && (m.name === meshName || m.name.startsWith(meshName + '_primitive')));
                meshes.forEach(m => {
                    const pbr = (m.material && m.material instanceof BABYLON.PBRMaterial) ? m.material : null;
                    if (!pbr) return;
                    if (!textureOrNull) {
                        // Ne pas disposer la texture partagée; simplement détacher
                        pbr.opacityTexture = null;
                        pbr.alpha = (pbr.alpha !== undefined ? pbr.alpha : 1.0);
                    } else {
                        pbr.opacityTexture = textureOrNull;
                        pbr.opacityTexture.getAlphaFromRGB = true;
                        pbr.opacityTexture.vFlip = false;
                        pbr.transparencyMode = BABYLON.PBRMaterial.PBRMATERIAL_ALPHATESTANDBLEND;
                        pbr.needDepthPrePass = true;
                    }
                    pbr.markAsDirty(BABYLON.Material.TextureDirtyFlag);
                });
            });
        });
    }

    // Appliquer/retirer la normal map d'engraving
    applyEngravingNormal(textureOrNull) {
        Object.keys(assetConfig.models).forEach(modelKey => {
            const model = assetConfig.models[modelKey];
            Object.keys(model.meshes).forEach(meshName => {
                const meshCfg = model.meshes[meshName];
                const tags = meshCfg.tags || [];
                if (!tags.includes('engraving')) return;

                let meshes = this.scene.meshes.filter(m => m && (m.name === meshName || m.name.startsWith(meshName + '_primitive')));
                meshes.forEach(m => {
                    const pbr = (m.material && m.material instanceof BABYLON.PBRMaterial) ? m.material : null;
                    if (!pbr) return;
                    if (!textureOrNull) {
                        pbr.bumpTexture = null;
                    } else {
                        pbr.bumpTexture = textureOrNull;
                        try {
                            const anisotropicMode = BABYLON.Texture.ANISOTROPIC_SAMPLINGMODE || BABYLON.Texture.TRILINEAR_SAMPLINGMODE;
                            pbr.bumpTexture.updateSamplingMode(anisotropicMode);
                            const maxAniso = (this.scene.getEngine().getCaps().maxAnisotropy || 8);
                            pbr.bumpTexture.anisotropicFilteringLevel = Math.min(16, maxAniso);
                        } catch (_) {}
                        pbr.bumpTexture.vFlip = false;
                    }
                    pbr.markAsDirty(BABYLON.Material.TextureDirtyFlag);
                });
            });
        });
    }

    // Fabrique la normal map depuis la DynamicTexture d'alpha (texte)
    updateEngravingNormalMap(width, height, invert) {
        if (!this.engravingTexture) return;
        // Préparer canvas source (alpha → height)
        const srcCanvas = document.createElement('canvas');
        srcCanvas.width = width;
        srcCanvas.height = height;
        const srcCtx = srcCanvas.getContext('2d');
        srcCtx.drawImage(this.engravingTexture.getContext().canvas, 0, 0);

        // Convertir en height (gris) et optionnellement inverser
        const img = srcCtx.getImageData(0, 0, width, height);
        const data = img.data;
        for (let i = 0; i < data.length; i += 4) {
            // Luminance simple (texture est déjà noir/blanc)
            const gray = data[i]; // R
            const h = invert ? (255 - gray) : gray;
            data[i] = h; data[i+1] = h; data[i+2] = h; data[i+3] = 255;
        }
        srcCtx.putImageData(img, 0, 0);

        // Flou gaussien approximé (via filter CSS canvas) ~10%
        const blurCanvas = document.createElement('canvas');
        blurCanvas.width = width;
        blurCanvas.height = height;
        const blurCtx = blurCanvas.getContext('2d');
        const blurPx = Math.max(1, Math.round(Math.min(width, height) * 0.1));
        try {
            blurCtx.filter = `blur(${blurPx}px)`;
            blurCtx.drawImage(srcCanvas, 0, 0);
        } catch (_) {
            // fallback sans blur
            blurCtx.drawImage(srcCanvas, 0, 0);
        }

        // Extraire height flouté pour dériver les normales (dX/dY)
        const blurred = blurCtx.getImageData(0, 0, width, height);
        const bd = blurred.data;

        // Préparer la DynamicTexture de normal si besoin
        if (!this.engravingNormalTexture) {
            this.engravingNormalTexture = new BABYLON.DynamicTexture('engravingNormalDT', { width, height }, this.scene, true);
        } else {
            // Si taille a changé: recréer
            const sz = this.engravingNormalTexture.getSize();
            if (sz.width !== width || sz.height !== height) {
                this.engravingNormalTexture.dispose();
                this.engravingNormalTexture = new BABYLON.DynamicTexture('engravingNormalDT', { width, height }, this.scene, true);
            }
        }
        const nCtx = this.engravingNormalTexture.getContext();
        const nImg = nCtx.createImageData(width, height);
        const nd = nImg.data;

        // Fonction util pour hauteur [0..1]
        const heightAt = (x, y) => {
            const xi = Math.min(width-1, Math.max(0, x));
            const yi = Math.min(height-1, Math.max(0, y));
            const idx = (yi*width + xi) * 4;
            return bd[idx] / 255; // red channel
        };

        const strength = 2.0; // Intensité du relief
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const hL = heightAt(x-1, y);
                const hR = heightAt(x+1, y);
                const hU = heightAt(x, y-1);
                const hD = heightAt(x, y+1);
                const dx = (hR - hL) * strength;
                const dy = (hD - hU) * strength;
                // Normal
                let nx = -dx, ny = -dy, nz = 1.0;
                const len = Math.hypot(nx, ny, nz) || 1.0;
                nx /= len; ny /= len; nz /= len;
                const r = Math.round((nx * 0.5 + 0.5) * 255);
                const g = Math.round((ny * 0.5 + 0.5) * 255);
                const b = Math.round((nz * 0.5 + 0.5) * 255);
                const idx = (y*width + x) * 4;
                nd[idx] = r; nd[idx+1] = g; nd[idx+2] = b; nd[idx+3] = 255;
            }
        }
        nCtx.putImageData(nImg, 0, 0);
        this.engravingNormalTexture.update(true);
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
    // Aligner l'état d'ouverture/visibilité initiale sur la préférence globale
    tweakpaneManager.tweakpaneOpenByDefault = tweakpaneVisible;
    tweakpaneManager.initialVisibility = tweakpaneVisible;
    
    // Initialiser le système de tags
    const tagManager = new TagManager(scene, materialsConfig);
    tagManager.loadTagConfiguration();

    // Initialiser l'EngravingManager (après assetConfig chargé et tagManager créé)
    if (window.EngravingManager) {
        window.engravingManager = new window.EngravingManager(scene, assetConfig);
    }
    
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
