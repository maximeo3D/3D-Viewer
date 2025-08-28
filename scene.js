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

// Generate the BABYLON 3D scene
const createScene = async function() {
    // Load configuration first
    await loadConfig();
    
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
    
    // Create a metallic sphere
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
    
    environmentFolder.open();
    cameraFolder.open();
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
