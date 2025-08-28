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
        targetX: 0,
        targetY: 0,
        targetZ: 0,
        showTarget: true
    }
};

// Global variables to store scene and camera references
let scene;
let camera;
let targetVisual;
let loadedModels = new Map(); // Store loaded models
let assetConfig = null; // Asset configuration
let materialsConfig = null; // Materials configuration

// Function to create target visual indicator
function createTargetVisual(scene, target) {
    // Create coordinate arrows
    const arrowLength = 1.0;
    const arrowDiameter = 0.05;
    
    // Create a red material for the target
    const targetMaterial = new BABYLON.StandardMaterial("targetMaterial", scene);
    targetMaterial.diffuseColor = new BABYLON.Color3(1, 0, 0);
    targetMaterial.emissiveColor = new BABYLON.Color3(0.3, 0, 0);
    
    // Create a small sphere at the target position
    const targetSphere = BABYLON.MeshBuilder.CreateSphere("targetSphere", {diameter: 0.3}, scene);
    targetSphere.material = targetMaterial;
    
    // X-axis arrow (red)
    const xArrow = BABYLON.MeshBuilder.CreateCylinder("xArrow", {
        height: arrowLength,
        diameter: arrowDiameter
    }, scene);
    xArrow.rotation.z = Math.PI/2;
    xArrow.material = targetMaterial;
    
    // Y-axis arrow (green)
    const yMaterial = new BABYLON.StandardMaterial("yMaterial", scene);
    yMaterial.diffuseColor = new BABYLON.Color3(0, 1, 0);
    yMaterial.emissiveColor = new BABYLON.Color3(0, 0.3, 0);
    
    const yArrow = BABYLON.MeshBuilder.CreateCylinder("yArrow", {
        height: arrowLength,
        diameter: arrowDiameter
    }, scene);
    yArrow.material = yMaterial;
    
    // Z-axis arrow (blue)
    const zMaterial = new BABYLON.StandardMaterial("zMaterial", scene);
    zMaterial.diffuseColor = new BABYLON.Color3(0, 0, 1);
    zMaterial.emissiveColor = new BABYLON.Color3(0, 0, 0.3);
    
    const zArrow = BABYLON.MeshBuilder.CreateCylinder("zArrow", {
        height: arrowLength,
        diameter: arrowDiameter
    }, scene);
    zArrow.rotation.x = Math.PI/2;
    zArrow.material = zMaterial;
    
    // Group all target elements
    const targetGroup = new BABYLON.TransformNode("targetGroup", scene);
    
    // Set the target group position to the target location
    targetGroup.position = target;
    
    // Position elements relative to the group (at origin 0,0,0)
    targetSphere.position = new BABYLON.Vector3(0, 0, 0);
    xArrow.position = new BABYLON.Vector3(arrowLength/2, 0, 0);
    yArrow.position = new BABYLON.Vector3(0, arrowLength/2, 0);
    zArrow.position = new BABYLON.Vector3(0, 0, arrowLength/2);
    
    // Parent all elements to the group
    targetSphere.parent = targetGroup;
    xArrow.parent = targetGroup;
    yArrow.parent = targetGroup;
    zArrow.parent = targetGroup;
    
    return targetGroup;
}

// Function to update target visual position
function updateTargetVisual() {
    if (targetVisual) {
        // Simply move the entire target group to the new position
        // The arrows will automatically follow due to parent-child relationship
        targetVisual.position = camera.target;
    }
}

// Function to load configuration
async function loadConfig() {
    try {
        const response = await fetch('studio.json');
        if (response.ok) {
            config = await response.json();
            console.log("Configuration loaded from studio.json");
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
            console.log("Asset configuration loaded from Assets/asset.json");
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
            console.log("Materials configuration loaded from Textures/materials.json");
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
            console.log(`Loading model: ${modelConfig.name} from ${modelConfig.file}`);
            
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
                                    console.log(`Applied ${materialName} material to ${mesh.name} (${materialSlotKey})`);
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
                
                console.log(`✅ Model ${modelConfig.name} loaded successfully`);
            }
        } catch (error) {
            console.error(`❌ Failed to load model ${modelConfig.name}:`, error);
        }
    }
}

// Function to apply material to mesh
function applyMaterial(mesh, materialConfig) {
    if (materialConfig.type === 'pbr') {
        const pbr = new BABYLON.PBRMaterial(`${mesh.name}_material`, scene);
        
        // Base properties - using proper PBR property names
        if (materialConfig.baseColor) {
            pbr.albedoColor = BABYLON.Color3.FromHexString(materialConfig.baseColor);
            // Also set baseColor for compatibility
            pbr.baseColor = BABYLON.Color3.FromHexString(materialConfig.baseColor);
        }
        
        if (materialConfig.metallic !== undefined) {
            pbr.metallic = materialConfig.metallic;
        }
        
        if (materialConfig.roughness !== undefined) {
            pbr.roughness = materialConfig.roughness;
        }
        
        if (materialConfig.alpha !== undefined) {
            pbr.alpha = materialConfig.alpha;
        }
        
        // Additional PBR properties for better rendering
        pbr.usePhysicalLightFalloff = true;
        pbr.useEnergyConservation = true;
        
        // Apply material to mesh
        mesh.material = pbr;
        
        console.log(`Material applied to ${mesh.name}:`, materialConfig);
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
    
    camera.attachControl(canvas, true);
    
    // Create target visual indicator
    targetVisual = createTargetVisual(scene, camera.target);
    
    // Set initial target visibility from config
    if (config.camera.showTarget !== undefined) {
        targetVisual.setEnabled(config.camera.showTarget);
    }
    
    // Load 3D models from asset configuration
    await loadModels();
    
    // Create a metallic sphere (fallback if no models loaded)
    const sphere = BABYLON.MeshBuilder.CreateSphere("sphere", {diameter: 2}, scene);
    
    // Create PBR material for proper environment reflections
    const pbr = new BABYLON.PBRMaterial("pbr", scene);
    pbr.metallic = 1.0;
    pbr.roughness = 0.1;
    pbr.baseColor = new BABYLON.Color3(0.8, 0.8, 0.8);
    
    sphere.material = pbr;
    
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
        
        console.log("HDR loaded successfully with HDRCubeTexture");
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
            
            console.log("HDR loaded successfully with CreateFromPrefilteredData");
        } catch (fallbackError) {
            console.error("Fallback HDR loading also failed:", fallbackError);
        }
    }
    
    return scene;
};

// Call the createScene function
createScene().then(createdScene => {
    // dat.GUI Controls - only create after scene is loaded
    const gui = new dat.GUI();
    gui.domElement.style.position = 'absolute';
    gui.domElement.style.top = '10px';
    gui.domElement.style.right = '10px';

    const environmentFolder = gui.addFolder('Environment');

    // Background color control
    const backgroundColor = { color: config.environment.backgroundColor };
    environmentFolder.addColor(backgroundColor, 'color').name('Background color').onChange(function(value) {
        scene.clearColor = BABYLON.Color4.FromHexString(value);
        config.environment.backgroundColor = value;
    });

    // HDR Exposure control
    const hdrExposure = { exposure: config.environment.hdrExposure };
    environmentFolder.add(hdrExposure, 'exposure', 0, 2).name('HDR Exposure').onChange(function(value) {
        scene.environmentIntensity = value;
        config.environment.hdrExposure = value;
    });

    // HDR Orientation control using setReflectionTextureMatrix
    const hdrOrientation = { orientation: config.environment.orientation };
    environmentFolder.add(hdrOrientation, 'orientation', -180, 180).name('Orientation').onChange(function(value) {
        // Get the current environment texture and rotate it
        if (scene.environmentTexture) {
            scene.environmentTexture.setReflectionTextureMatrix(
                BABYLON.Matrix.RotationY(BABYLON.Tools.ToRadians(value))
            );
        }
        config.environment.orientation = value;
    });

    // Export Parameters button - Direct file overwrite (Environment only)
    const exportParams = { export: async function() {
        try {
            // First, read the current studio.json to get the latest camera settings
            const currentConfig = await fetch('studio.json?ts=' + Date.now(), { cache: 'no-store' }).then(r => r.json());
            
            // Create export object with only environment settings, preserving current camera settings
            const exportConfig = {
                environment: {
                    backgroundColor: config.environment.backgroundColor,
                    hdrExposure: config.environment.hdrExposure,
                    orientation: config.environment.orientation
                },
                camera: currentConfig.camera // Keep existing camera settings from file unchanged
            };
            
            // Create the JSON content
            const jsonContent = JSON.stringify(exportConfig, null, 2);
            
            // Send POST request to directly overwrite studio.json
            const res = await fetch('studio.json', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: jsonContent
            });
            
            if (!res.ok) {
                throw new Error('Save failed: ' + res.status);
            }
            
            const result = await res.json();
            console.log("Environment parameters exported successfully:", result.message);
            
            // Update local config with the new file content
            config = exportConfig;
            
            console.log("✅ Environment parameters exported successfully! studio.json has been updated.");
        } catch (error) {
            console.error("❌ Environment export failed:", error);
        }
    }};
    environmentFolder.add(exportParams, 'export').name('Export Parameters');
    
    // Camera controls folder
    const cameraFolder = gui.addFolder('Camera');
    
    // Camera Yaw control (horizontal rotation)
    const cameraYaw = { yaw: config.camera.alpha };
    cameraFolder.add(cameraYaw, 'yaw', -180, 180).name('Yaw (Horizontal)').onChange(function(value) {
        const radians = BABYLON.Tools.ToRadians(value);
        camera.alpha = radians;
        config.camera.alpha = radians;
    });
    
    // Camera Pitch control (vertical rotation)
    const cameraPitch = { pitch: BABYLON.Tools.ToDegrees(config.camera.beta) };
    cameraFolder.add(cameraPitch, 'pitch', 0, 180).name('Pitch (Vertical)').onChange(function(value) {
        const radians = BABYLON.Tools.ToRadians(value);
        camera.beta = radians;
        config.camera.beta = radians;
    });
    
    // Camera Field of View control
    const cameraFov = { fov: camera.fov };
    cameraFolder.add(cameraFov, 'fov', 10, 120).name('Field of View').onChange(function(value) {
        camera.fov = value;
        config.camera.fov = value;
    });
    
    // Camera Distance control
    const cameraDistance = { distance: config.camera.radius };
    cameraFolder.add(cameraDistance, 'distance', 1, 50).name('Distance').onChange(function(value) {
        camera.radius = value;
        config.camera.radius = value;
    });
    
    // Camera Min Distance control
    const cameraMinDistance = { minDistance: config.camera.minDistance || 1 };
    cameraFolder.add(cameraMinDistance, 'minDistance', 0.1, 10).name('Min Distance').onChange(function(value) {
        camera.lowerRadiusLimit = value;
        config.camera.minDistance = value;
    });
    
    // Camera Max Distance control
    const cameraMaxDistance = { maxDistance: config.camera.maxDistance || 50 };
    cameraFolder.add(cameraMaxDistance, 'maxDistance', 10, 100).name('Max Distance').onChange(function(value) {
        camera.upperRadiusLimit = value;
        config.camera.maxDistance = value;
    });
    
    // Camera Target controls
    const targetFolder = cameraFolder.addFolder('Target Position');
    
    // Target X position control
    const targetX = { x: camera.target.x };
    targetFolder.add(targetX, 'x', -20, 20).step(0.01).name('Target X').onChange(function(value) {
        camera.target.x = value;
        config.camera.targetX = value;
        updateTargetVisual();
    });
    
    // Target Y position control
    const targetY = { y: camera.target.y };
    targetFolder.add(targetY, 'y', -20, 20).step(0.01).name('Target Y').onChange(function(value) {
        camera.target.y = value;
        config.camera.targetY = value;
        updateTargetVisual();
    });
    
    // Target Z position control
    const targetZ = { z: camera.target.z };
    targetFolder.add(targetZ, 'z', -20, 20).step(0.01).name('Target Z').onChange(function(value) {
        camera.target.z = value;
        config.camera.targetZ = value;
        updateTargetVisual();
    });
    
    // Target visibility toggle
    const showTarget = { visible: config.camera.showTarget !== undefined ? config.camera.showTarget : true };
    targetFolder.add(showTarget, 'visible').name('Show Target').onChange(function(value) {
        if (targetVisual) {
            targetVisual.setEnabled(value);
        }
        config.camera.showTarget = value;
    });
    
    targetFolder.open();
    
    // Camera export button - Direct file overwrite (Camera only)
    const exportCamera = { export: async function() {
        try {
            // First, read the current studio.json to get the latest environment settings
            const currentConfig = await fetch('studio.json?ts=' + Date.now(), { cache: 'no-store' }).then(r => r.json());
            
        // Update camera config with current values
        config.camera.alpha = camera.alpha;
        config.camera.beta = camera.beta;
        config.camera.radius = camera.radius;
            config.camera.fov = camera.fov;
            config.camera.minDistance = camera.lowerRadiusLimit;
            config.camera.maxDistance = camera.upperRadiusLimit;
            config.camera.targetX = camera.target.x;
            config.camera.targetY = camera.target.y;
            config.camera.targetZ = camera.target.z;
            config.camera.showTarget = config.camera.showTarget;
            
            // Create export object with only camera settings, preserving current environment settings
            const exportConfig = {
                environment: currentConfig.environment, // Keep existing environment settings from file unchanged
                camera: {
                    alpha: config.camera.alpha,
                    beta: config.camera.beta,
                    radius: config.camera.radius,
                    fov: config.camera.fov,
                    minDistance: config.camera.minDistance,
                    maxDistance: config.camera.maxDistance,
                    targetX: config.camera.targetX,
                    targetY: config.camera.targetY,
                    targetZ: config.camera.targetZ,
                    showTarget: config.camera.showTarget
                }
            };
        
        // Create the JSON content
            const jsonContent = JSON.stringify(exportConfig, null, 2);
            
            // Send POST request to directly overwrite studio.json
            const res = await fetch('studio.json', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: jsonContent
            });
            
            if (!res.ok) {
                throw new Error('Save failed: ' + res.status);
            }
            
            const result = await res.json();
            console.log("Camera settings exported successfully:", result.message);
            
            // Update local config with the new file content
            config = exportConfig;
            
            console.log("📷 Camera settings exported successfully! studio.json has been updated.");
        } catch (error) {
            console.error("❌ Camera export failed:", error);
        }
    }};
    cameraFolder.add(exportCamera, 'export').name('Export Camera');
    
    // Materials folder
    const materialsFolder = gui.addFolder('Materials');
    
    // Material selection dropdown
    const materialList = { selected: 'Select a material' };
    const materialNames = materialsConfig && materialsConfig.materials ? Object.keys(materialsConfig.materials) : [];
    
    if (materialNames.length > 0) {
        materialList.selected = materialNames[0];
    }
    
    const materialDropdown = materialsFolder.add(materialList, 'selected', materialNames).name('Material List');
    
    // Load available images, then create ALL material controls
    loadAvailableImages().then(() => {
        console.log('Initial texture list loaded with', availableImages.length, 'images');
        
        // Create ALL material controls now that images are loaded
        createMaterialControls();
        
        // Set menu states AFTER all controls are created
        setTimeout(() => {
            environmentFolder.close();
            cameraFolder.close();
            materialsFolder.open();
        }, 100);
    });
    
    // Function to create all material controls in the correct order
    function createMaterialControls() {
        // Basic material properties
        baseColorControl = materialsFolder.addColor(materialProperties, 'baseColor').name('Albedo Color').onChange(function(value) {
            materialProperties.baseColor = value;
            applyMaterialChanges();
        });
        
        metallicControl = materialsFolder.add(materialProperties, 'metallic', 0, 1).step(0.01).name('Metallic').onChange(function(value) {
            materialProperties.metallic = value;
            applyMaterialChanges();
        });
        
        roughnessControl = materialsFolder.add(materialProperties, 'roughness', 0, 1).step(0.01).name('Roughness').onChange(function(value) {
            materialProperties.roughness = value;
            applyMaterialChanges();
        });
        
        alphaControl = materialsFolder.add(materialProperties, 'alpha', 0, 1).name('Alpha').onChange(function(value) {
            materialProperties.alpha = value;
            applyMaterialChanges();
        });
        
        // Texture controls - positioned right after Alpha
        albedoTextureControl = materialsFolder.add(materialProperties, 'albedoTexture', availableImages).name('Albedo Texture').onChange(function(value) {
            materialProperties.albedoTexture = value === 'None' ? '' : value;
            applyMaterialChanges();
        });
        
        metallicTextureControl = materialsFolder.add(materialProperties, 'metallicTexture', availableImages).name('Surface Texture').onChange(function(value) {
            materialProperties.metallicTexture = value === 'None' ? '' : value;
            applyMaterialChanges();
        });
        
        bumpTextureControl = materialsFolder.add(materialProperties, 'bumpTexture', availableImages).name('Normal Map').onChange(function(value) {
            materialProperties.bumpTexture = value === 'None' ? '' : value;
            applyMaterialChanges();
        });
        
        // Other texture-related controls
        useAlphaFromAlbedoTextureControl = materialsFolder.add(materialProperties, 'useAlphaFromAlbedoTexture').name('Use Alpha from Albedo').onChange(function(value) {
            materialProperties.useAlphaFromAlbedoTexture = value;
            applyMaterialChanges();
        });
        
        useRoughnessFromMetallicTextureGreenControl = materialsFolder.add(materialProperties, 'useRoughnessFromMetallicTextureGreen').name('Roughness from G').onChange(function(value) {
            materialProperties.useRoughnessFromMetallicTextureGreen = value;
            applyMaterialChanges();
        });
        
        useMetallnessFromMetallicTextureBlueControl = materialsFolder.add(materialProperties, 'useMetallnessFromMetallicTextureBlue').name('Metalness from B').onChange(function(value) {
            materialProperties.useMetallnessFromMetallicTextureBlue = value;
            applyMaterialChanges();
        });
        
        useAmbientOcclusionFromMetallicTextureRedControl = materialsFolder.add(materialProperties, 'useAmbientOcclusionFromMetallicTextureRed').name('AO from R').onChange(function(value) {
            materialProperties.useAmbientOcclusionFromMetallicTextureRed = value;
            applyMaterialChanges();
        });
        
        bumpTextureIntensityControl = materialsFolder.add(materialProperties, 'bumpTextureIntensity', 0, 5).step(0.1).name('Intensity').onChange(function(value) {
            materialProperties.bumpTextureIntensity = value;
            applyMaterialChanges();
        });
        
        backFaceCullingControl = materialsFolder.add(materialProperties, 'backFaceCulling').name('Back Face Culling').onChange(function(value) {
            materialProperties.backFaceCulling = value;
            applyMaterialChanges();
        });
        
        // Add Refresh Images button
        const refreshImages = { refresh: async function() {
            console.log('Refreshing texture list...');
            await loadAvailableImages();
            console.log('✅ New textures loaded! Refresh the page to see them in dropdowns.');
            alert('✅ New textures loaded!\n\n💡 Please refresh the page (F5) to see new textures in the dropdowns.');
        }};
        refreshImagesControl = materialsFolder.add(refreshImages, 'refresh').name('Refresh Images');
        
        // Material dropdown onChange
        materialDropdown.onChange(function(value) {
            updateMaterialPropertiesDisplay();
        });
        
        // Initialize material properties with first material values
        if (materialNames.length > 0) {
            updateMaterialPropertiesDisplay();
        } else {
            exportMaterialsControl = materialsFolder.add(exportMaterials, 'export').name('Export Materials');
        }
    }
    
    // Material properties controls - Initialize with first material values
    let materialProperties = {
        baseColor: '#ffffff',
        metallic: 0.0,
        roughness: 0.5,
        alpha: 1.0,
        albedoTexture: '',
        useAlphaFromAlbedoTexture: false,
        metallicTexture: '',
        useRoughnessFromMetallicTextureGreen: false,
        useMetallnessFromMetallicTextureBlue: false,
        useAmbientOcclusionFromMetallicTextureRed: false,
        bumpTexture: '',
        bumpTextureIntensity: 1.0,
        backFaceCulling: true
    };
    
    // Declare export control variable
    let exportMaterialsControl;
    
    // Image list variables
    let availableImages = ['None'];
    let refreshImagesControl;
    
    // Function to load available texture images
    async function loadAvailableImages() {
        try {
            const response = await fetch('api/textures', { cache: 'no-store' });
            if (!response.ok) {
                throw new Error('Failed to load textures list: ' + response.status);
            }
            
            const data = await response.json();
            availableImages = ['None', ...data.images];
            console.log(`Loaded ${data.count} texture files:`, data.images);
            return availableImages;
        } catch (error) {
            console.error('Error loading available images:', error);
            availableImages = ['None'];
            return availableImages;
        }
    }
    
    // Function to refresh texture dropdowns - simplified to avoid reordering
    function refreshTextureDropdowns() {
        console.log('⚠️ Texture dropdowns require page refresh to update. Available images loaded:', availableImages.length);
        console.log('💡 Tip: Refresh the page to see new textures in dropdowns.');
    }
    
    // Function to update material properties display
    function updateMaterialPropertiesDisplay() {
        const selectedMaterial = materialList.selected;
        if (selectedMaterial && materialsConfig.materials[selectedMaterial]) {
            const material = materialsConfig.materials[selectedMaterial];
            
            // Remove old controls
            materialsFolder.remove(baseColorControl);
            materialsFolder.remove(metallicControl);
            materialsFolder.remove(roughnessControl);
            materialsFolder.remove(alphaControl);
            materialsFolder.remove(albedoTextureControl);
            materialsFolder.remove(useAlphaFromAlbedoTextureControl);
            materialsFolder.remove(metallicTextureControl);
            materialsFolder.remove(useRoughnessFromMetallicTextureGreenControl);
            materialsFolder.remove(useMetallnessFromMetallicTextureBlueControl);
            materialsFolder.remove(useAmbientOcclusionFromMetallicTextureRedControl);
            materialsFolder.remove(bumpTextureControl);
            materialsFolder.remove(bumpTextureIntensityControl);
            materialsFolder.remove(backFaceCullingControl);
            if (refreshImagesControl) {
                materialsFolder.remove(refreshImagesControl);
            }
            if (exportMaterialsControl) {
                materialsFolder.remove(exportMaterialsControl);
            }
            
            // Update the materialProperties object with actual values from materials.json
            materialProperties.baseColor = material.baseColor || '#ffffff';
            materialProperties.metallic = material.metallic !== undefined ? material.metallic : 0.0;
            materialProperties.roughness = material.roughness !== undefined ? material.roughness : 0.5;
            materialProperties.alpha = material.alpha !== undefined ? material.alpha : 1.0;
            materialProperties.albedoTexture = material.albedoTexture || '';
            materialProperties.useAlphaFromAlbedoTexture = material.useAlphaFromAlbedoTexture !== undefined ? material.useAlphaFromAlbedoTexture : false;
            materialProperties.metallicTexture = material.metallicTexture || '';
            materialProperties.useRoughnessFromMetallicTextureGreen = material.useRoughnessFromMetallicTextureGreen !== undefined ? material.useRoughnessFromMetallicTextureGreen : false;
            materialProperties.useMetallnessFromMetallicTextureBlue = material.useMetallnessFromMetallicTextureBlue !== undefined ? material.useMetallnessFromMetallicTextureBlue : false;
            materialProperties.useAmbientOcclusionFromMetallicTextureRed = material.useAmbientOcclusionFromMetallicTextureRed !== undefined ? material.useAmbientOcclusionFromMetallicTextureRed : false;
            materialProperties.bumpTexture = material.bumpTexture || '';
            materialProperties.bumpTextureIntensity = material.bumpTextureIntensity !== undefined ? material.bumpTextureIntensity : 1.0;
            materialProperties.backFaceCulling = material.backFaceCulling !== undefined ? material.backFaceCulling : true;
            
            // Recreate controls with new values
            baseColorControl = materialsFolder.addColor(materialProperties, 'baseColor').name('Albedo Color').onChange(function(value) {
                materialProperties.baseColor = value;
                applyMaterialChanges();
            });
            
            metallicControl = materialsFolder.add(materialProperties, 'metallic', 0, 1).step(0.01).name('Metallic').onChange(function(value) {
                materialProperties.metallic = value;
                applyMaterialChanges();
            });
            
            roughnessControl = materialsFolder.add(materialProperties, 'roughness', 0, 1).step(0.01).name('Roughness').onChange(function(value) {
                materialProperties.roughness = value;
                applyMaterialChanges();
            });
            
            alphaControl = materialsFolder.add(materialProperties, 'alpha', 0, 1).name('Alpha').onChange(function(value) {
                materialProperties.alpha = value;
                applyMaterialChanges();
            });
            
            // Texture controls with dropdowns - maintain same order as initial creation
            materialProperties.albedoTexture = material.albedoTexture && material.albedoTexture !== '' ? material.albedoTexture : 'None';
            albedoTextureControl = materialsFolder.add(materialProperties, 'albedoTexture', availableImages).name('Albedo Texture').onChange(function(value) {
                materialProperties.albedoTexture = value === 'None' ? '' : value;
                applyMaterialChanges();
            });
            
            materialProperties.metallicTexture = material.metallicTexture && material.metallicTexture !== '' ? material.metallicTexture : 'None';
            metallicTextureControl = materialsFolder.add(materialProperties, 'metallicTexture', availableImages).name('Surface Texture').onChange(function(value) {
                materialProperties.metallicTexture = value === 'None' ? '' : value;
                applyMaterialChanges();
            });
            
            materialProperties.bumpTexture = material.bumpTexture && material.bumpTexture !== '' ? material.bumpTexture : 'None';
            bumpTextureControl = materialsFolder.add(materialProperties, 'bumpTexture', availableImages).name('Normal Map').onChange(function(value) {
                materialProperties.bumpTexture = value === 'None' ? '' : value;
                applyMaterialChanges();
            });
            
            // Other texture-related controls
            useAlphaFromAlbedoTextureControl = materialsFolder.add(materialProperties, 'useAlphaFromAlbedoTexture').name('Use Alpha from Albedo').onChange(function(value) {
                materialProperties.useAlphaFromAlbedoTexture = value;
                applyMaterialChanges();
            });
            
            useRoughnessFromMetallicTextureGreenControl = materialsFolder.add(materialProperties, 'useRoughnessFromMetallicTextureGreen').name('Roughness from G').onChange(function(value) {
                materialProperties.useRoughnessFromMetallicTextureGreen = value;
                applyMaterialChanges();
            });
            
            useMetallnessFromMetallicTextureBlueControl = materialsFolder.add(materialProperties, 'useMetallnessFromMetallicTextureBlue').name('Metalness from B').onChange(function(value) {
                materialProperties.useMetallnessFromMetallicTextureBlue = value;
                applyMaterialChanges();
            });
            
            useAmbientOcclusionFromMetallicTextureRedControl = materialsFolder.add(materialProperties, 'useAmbientOcclusionFromMetallicTextureRed').name('AO from R').onChange(function(value) {
                materialProperties.useAmbientOcclusionFromMetallicTextureRed = value;
                applyMaterialChanges();
            });
            
            bumpTextureIntensityControl = materialsFolder.add(materialProperties, 'bumpTextureIntensity', 0, 5).step(0.1).name('Intensity').onChange(function(value) {
                materialProperties.bumpTextureIntensity = value;
                applyMaterialChanges();
            });
            
            backFaceCullingControl = materialsFolder.add(materialProperties, 'backFaceCulling').name('Back Face Culling').onChange(function(value) {
                materialProperties.backFaceCulling = value;
                applyMaterialChanges();
            });
            
            // Add Refresh Images button
            const refreshImages = { refresh: async function() {
                console.log('Refreshing texture list...');
                await loadAvailableImages();
                console.log('✅ New textures loaded! Refresh the page to see them in dropdowns.');
                alert('✅ New textures loaded!\n\n💡 Please refresh the page (F5) to see new textures in the dropdowns.');
            }};
            refreshImagesControl = materialsFolder.add(refreshImages, 'refresh').name('Refresh Images');
            
            // Recreate Export Materials button at the end
            exportMaterialsControl = materialsFolder.add(exportMaterials, 'export').name('Export Materials');
            
            console.log(`Updated display for material ${selectedMaterial}:`, materialProperties);
        }
    }
    
    // Function to apply material changes to the scene
    function applyMaterialChanges() {
        const selectedMaterial = materialList.selected;
        if (selectedMaterial && materialsConfig.materials[selectedMaterial]) {
            // Update the material config
            materialsConfig.materials[selectedMaterial].baseColor = materialProperties.baseColor;
            materialsConfig.materials[selectedMaterial].metallic = materialProperties.metallic;
            materialsConfig.materials[selectedMaterial].roughness = materialProperties.roughness;
            materialsConfig.materials[selectedMaterial].alpha = materialProperties.alpha;
            materialsConfig.materials[selectedMaterial].albedoTexture = materialProperties.albedoTexture;
            materialsConfig.materials[selectedMaterial].useAlphaFromAlbedoTexture = materialProperties.useAlphaFromAlbedoTexture;
            materialsConfig.materials[selectedMaterial].metallicTexture = materialProperties.metallicTexture;
            materialsConfig.materials[selectedMaterial].useRoughnessFromMetallicTextureGreen = materialProperties.useRoughnessFromMetallicTextureGreen;
            materialsConfig.materials[selectedMaterial].useMetallnessFromMetallicTextureBlue = materialProperties.useMetallnessFromMetallicTextureBlue;
            materialsConfig.materials[selectedMaterial].useAmbientOcclusionFromMetallicTextureRed = materialProperties.useAmbientOcclusionFromMetallicTextureRed;
            materialsConfig.materials[selectedMaterial].bumpTexture = materialProperties.bumpTexture;
            materialsConfig.materials[selectedMaterial].bumpTextureIntensity = materialProperties.bumpTextureIntensity;
            materialsConfig.materials[selectedMaterial].backFaceCulling = materialProperties.backFaceCulling;
            
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
                                // Basic properties
                                mesh.material.albedoColor = BABYLON.Color3.FromHexString(materialProperties.baseColor);
                                mesh.material.metallic = materialProperties.metallic;
                                mesh.material.roughness = materialProperties.roughness;
                                mesh.material.alpha = materialProperties.alpha;
                                mesh.material.backFaceCulling = materialProperties.backFaceCulling;
                                
                                // Texture properties (basic support - textures need to be loaded)
                                if (materialProperties.albedoTexture && materialProperties.albedoTexture.trim() !== '') {
                                    // TODO: Load albedo texture
                                    console.log(`Albedo texture: ${materialProperties.albedoTexture}`);
                                } else {
                                    mesh.material.albedoTexture = null;
                                }
                                
                                if (materialProperties.metallicTexture && materialProperties.metallicTexture.trim() !== '') {
                                    // TODO: Load metallic texture and set channel options
                                    console.log(`Metallic texture: ${materialProperties.metallicTexture}`);
                                    mesh.material.useRoughnessFromMetallicTextureGreen = materialProperties.useRoughnessFromMetallicTextureGreen;
                                    mesh.material.useMetallnessFromMetallicTextureBlue = materialProperties.useMetallnessFromMetallicTextureBlue;
                                    mesh.material.useAmbientOcclusionFromMetallicTextureRed = materialProperties.useAmbientOcclusionFromMetallicTextureRed;
                                } else {
                                    mesh.material.metallicTexture = null;
                                }
                                
                                if (materialProperties.bumpTexture && materialProperties.bumpTexture.trim() !== '') {
                                    // TODO: Load bump texture
                                    console.log(`Bump texture: ${materialProperties.bumpTexture}, intensity: ${materialProperties.bumpTextureIntensity}`);
                                } else {
                                    mesh.material.bumpTexture = null;
                                }
                                
                                console.log(`Updated existing material ${selectedMaterial} properties on ${mesh.name} (slot ${primitiveIndex + 1})`);
                            }
                        }
                    } else {
                        // Fallback for non-primitive meshes, if any
                        const meshConfig = modelData.config.meshes.find(m => m.name === mesh.name);
                        if (meshConfig && meshConfig.materialSlot1 === selectedMaterial && mesh.material) {
                            // Basic properties
                            mesh.material.albedoColor = BABYLON.Color3.FromHexString(materialProperties.baseColor);
                            mesh.material.metallic = materialProperties.metallic;
                            mesh.material.roughness = materialProperties.roughness;
                            mesh.material.alpha = materialProperties.alpha;
                            mesh.material.backFaceCulling = materialProperties.backFaceCulling;
                            
                            // Texture properties (basic support)
                            if (materialProperties.albedoTexture && materialProperties.albedoTexture.trim() !== '') {
                                console.log(`Albedo texture: ${materialProperties.albedoTexture}`);
                            } else {
                                mesh.material.albedoTexture = null;
                            }
                            
                            if (materialProperties.metallicTexture && materialProperties.metallicTexture.trim() !== '') {
                                console.log(`Metallic texture: ${materialProperties.metallicTexture}`);
                                mesh.material.useRoughnessFromMetallicTextureGreen = materialProperties.useRoughnessFromMetallicTextureGreen;
                                mesh.material.useMetallnessFromMetallicTextureBlue = materialProperties.useMetallnessFromMetallicTextureBlue;
                                mesh.material.useAmbientOcclusionFromMetallicTextureRed = materialProperties.useAmbientOcclusionFromMetallicTextureRed;
                            } else {
                                mesh.material.metallicTexture = null;
                            }
                            
                            if (materialProperties.bumpTexture && materialProperties.bumpTexture.trim() !== '') {
                                console.log(`Bump texture: ${materialProperties.bumpTexture}, intensity: ${materialProperties.bumpTextureIntensity}`);
                            } else {
                                mesh.material.bumpTexture = null;
                            }
                            
                            console.log(`Updated existing material ${selectedMaterial} properties on ${mesh.name}`);
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
    
    // Declare control variables (will be created in createMaterialControls)
    let baseColorControl, metallicControl, roughnessControl, alphaControl;
    let albedoTextureControl, metallicTextureControl, bumpTextureControl;
    let useAlphaFromAlbedoTextureControl, useRoughnessFromMetallicTextureGreenControl;
    let useMetallnessFromMetallicTextureBlueControl, useAmbientOcclusionFromMetallicTextureRedControl;
    let bumpTextureIntensityControl, backFaceCullingControl;
    
    // Export materials configuration button
    const exportMaterials = { export: async function() {
        try {
            // Create the JSON content
            const jsonContent = JSON.stringify(materialsConfig, null, 2);
            
            // Send POST request to directly overwrite materials.json
            // Use a query parameter to identify the file path since PowerShell doesn't handle slashes well
            const res = await fetch('materials.json?path=Textures', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: jsonContent
            });
            
            if (!res.ok) {
                throw new Error('Save failed: ' + res.status);
            }
            
            const result = await res.json();
            console.log("Materials configuration exported successfully:", result.message);
            console.log("✅ Materials configuration exported successfully! Textures/materials.json has been updated.");
        } catch (error) {
            console.error("❌ Materials export failed:", error);
        }
    }};
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
