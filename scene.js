// Get the canvas element
const canvas = document.getElementById("renderCanvas");

// Create the BABYLON engine
const engine = new BABYLON.Engine(canvas, true);

// Generate the BABYLON 3D scene
const createScene = function() {
    // Create the scene
    const scene = new BABYLON.Scene(engine);
    
    // Create a camera
    const camera = new BABYLON.ArcRotateCamera("camera", 0, Math.PI / 3, 10, BABYLON.Vector3.Zero(), scene);
    camera.attachControl(canvas, true);
    
    // Create a metallic sphere
    const sphere = BABYLON.MeshBuilder.CreateSphere("sphere", {diameter: 2}, scene);
    
    // Create PBR material for proper environment reflections
    const pbr = new BABYLON.PBRMaterial("pbr", scene);
    pbr.metallic = 1.0;
    pbr.roughness = 0.1;
    pbr.baseColor = new BABYLON.Color3(0.8, 0.8, 0.8);
    
    sphere.material = pbr;
    
    // HDR Environment - Try HDRCubeTexture directly as suggested in forum
    try {
        const hdrTexture = new BABYLON.HDRCubeTexture("Textures/HDR/default.hdr", scene, 512, false, false, false, true);
        scene.environmentTexture = hdrTexture;
        scene.environmentIntensity = 1.0;
        
        console.log("HDR loaded successfully with HDRCubeTexture");
    } catch (error) {
        console.error("HDR loading failed:", error);
        
        // Fallback: try the original method
        try {
            const hdrTexture = BABYLON.CubeTexture.CreateFromPrefilteredData("Textures/HDR/default.hdr", scene);
            scene.environmentTexture = hdrTexture;
            scene.environmentIntensity = 1.0;
            
            console.log("HDR loaded successfully with CreateFromPrefilteredData");
        } catch (fallbackError) {
            console.error("Fallback HDR loading also failed:", fallbackError);
        }
    }
    
    // dat.GUI Controls
    const gui = new dat.GUI();
    gui.domElement.style.position = 'absolute';
    gui.domElement.style.top = '10px';
    gui.domElement.style.right = '10px';
    
    const environmentFolder = gui.addFolder('Environment');
    
    // Background color control
    const backgroundColor = { color: '#ffffff' };
    environmentFolder.addColor(backgroundColor, 'color').name('Background color').onChange(function(value) {
        scene.clearColor = BABYLON.Color4.FromHexString(value);
    });
    
    // HDR Exposure control
    const hdrExposure = { exposure: 1.0 };
    environmentFolder.add(hdrExposure, 'exposure', 0, 2).name('HDR Exposure').onChange(function(value) {
        scene.environmentIntensity = value;
    });
    
    // HDR Orientation control using setReflectionTextureMatrix
    const hdrOrientation = { orientation: 0 };
    environmentFolder.add(hdrOrientation, 'orientation', -180, 180).name('Orientation').onChange(function(value) {
        // Get the current environment texture and rotate it
        if (scene.environmentTexture) {
            scene.environmentTexture.setReflectionTextureMatrix(
                BABYLON.Matrix.RotationY(BABYLON.Tools.ToRadians(value))
            );
        }
    });
    
    environmentFolder.open();
    
    return scene;
};

// Call the createScene function
const scene = createScene();

// Register a render loop to repeatedly render the scene
engine.runRenderLoop(function() {
    scene.render();
});

// Handle browser/canvas resize events
window.addEventListener("resize", function() {
    engine.resize();
});
