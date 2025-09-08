// datGUI.js - Gestion complète de l'interface utilisateur dat.GUI
// Ce fichier contient TOUT le code dat.GUI pour Environment, Camera et Materials

class DatGUIManager {
    constructor(scene, materialsConfig, config) {
        this.scene = scene;
        this.materialsConfig = materialsConfig;
        this.config = config;
        
        this.gui = null;
        this.loadedModels = new Map(); // Référence aux modèles chargés
        
        // Les contrôles personnalisés sont maintenant gérés dans scene.js
        
        // Variables pour les contrôles
        this.environmentFolder = null;
        this.cameraFolder = null;
        this.materialsFolder = null;
        this.targetFolder = null;
        
        // Variables pour les contrôles de matériaux
        this.materialList = { selected: Object.keys(materialsConfig.materials)[0] || 'red' };
        this.materialSelectControl = null;
        this.materialParentControl = null;
        
        // Système de logique parent-enfant
        this.independentProperties = new Set(); // Paramètres indépendants du parent
        this.materialControls = new Map(); // Références aux contrôles pour le grisage
        
        // Variables pour la création de matériaux
        this.createMaterialFolder = null;
        this.newMaterialData = {
            name: ''
        };
        this.materialProperties = {
            baseColor: '#ffffff',
            metallic: 0.0,
            roughness: 0.5,
            alpha: 1.0,
            albedoTexture: '',
            metallicTexture: '',
            microSurfaceTexture: '',
            ambientTexture: '',
            opacityTexture: '',
            bumpTexture: '',
            bumpTextureIntensity: 1.0,
            lightmapTexture: '',
            useLightmapAsShadowmap: true,
            backFaceCulling: true,
            // Texture transformation parameters
            uOffset: 0.0,
            vOffset: 0.0,
            uScale: 1.0,
            vScale: 1.0,
            wRotation: 0.0
        };
        
        // Variables pour les contrôles
        this.baseColorControl = null;
        this.metallicControl = null;
        this.roughnessControl = null;
        this.alphaControl = null;
        this.albedoTextureControl = null;
        this.metallicTextureControl = null;
        this.microSurfaceTextureControl = null;
        this.ambientTextureControl = null;
        this.opacityTextureControl = null;
        this.bumpTextureControl = null;
        this.bumpTextureIntensityControl = null;
        this.lightmapTextureControl = null;
        this.backFaceCullingControl = null;
        this.refreshImagesControl = null;
        this.exportMaterialsControl = null;
        
        // Variables pour Texture Parameters
        this.textureParamsFolderExists = false;
        this.textureParamsFolder = null;
        this.uOffsetControl = null;
        this.vOffsetControl = null;
        this.uScaleControl = null;
        this.vScaleControl = null;
        this.wRotationControl = null;
        
        // Images disponibles
        this.availableImages = ['None'];
        
        // Callbacks
        this.onMaterialChange = null;
        this.onCameraChange = null;
        this.onEnvironmentChange = null;
    }
    
    // Initialiser l'interface dat.GUI complète
    async init() {
        this.gui = new dat.GUI();
        this.gui.domElement.style.position = 'absolute';
        this.gui.domElement.style.top = '10px';
        this.gui.domElement.style.right = '10px';
        

        
        // Charger les images disponibles
        await this.loadAvailableImages();
        
        // Créer tous les dossiers
        this.createEnvironmentFolder();
        this.createCameraFolder();
        this.createMaterialsFolder();
        
        // Initialiser les propriétés du premier matériau
        this.initializeMaterialProperties();
        
        // Créer les contrôles de matériaux
        this.createMaterialControls();
        
        // Ajouter le contrôle Show Inspector en bas
        this.createInspectorControl();
        
        // Configurer l'état des dossiers
        this.setupFolderStates();
        
        // Initialiser le target visual
        this.initTargetVisual();
    }
    
    // Charger les images disponibles
    async loadAvailableImages() {
        try {
            const response = await fetch('api/textures', { cache: 'no-store' });
            if (!response.ok) {
                throw new Error('Failed to load textures list: ' + response.status);
            }
            
            const data = await response.json();
            // Trier les images par ordre alphabétique (sauf 'None' qui reste en premier)
            const sortedImages = data.images.sort((a, b) => a.localeCompare(b));
            this.availableImages = ['None', ...sortedImages];
            return this.availableImages;
        } catch (error) {
            console.error('Error loading available images:', error);
            this.availableImages = ['None'];
            return this.availableImages;
        }
    }
    
    // Créer le dossier Environment
    createEnvironmentFolder() {
        this.environmentFolder = this.gui.addFolder('Environment');
        
        // Background color control
        const backgroundColor = { color: this.config.environment.backgroundColor };
        this.environmentFolder.addColor(backgroundColor, 'color').name('Background color').onChange((value) => {
            this.scene.clearColor = BABYLON.Color4.FromHexString(value);
            this.config.environment.backgroundColor = value;
            if (this.onEnvironmentChange) {
                this.onEnvironmentChange('backgroundColor', value);
            }
        });
        
        // HDR Exposure control
        const hdrExposure = { exposure: this.config.environment.hdrExposure };
        this.environmentFolder.add(hdrExposure, 'exposure', 0, 2).name('HDR Exposure').onChange((value) => {
            this.scene.environmentIntensity = value;
            this.config.environment.hdrExposure = value;
            if (this.onEnvironmentChange) {
                this.onEnvironmentChange('hdrExposure', value);
            }
        });
        
        // HDR Orientation control
        const hdrOrientation = { orientation: this.config.environment.orientation };
        this.environmentFolder.add(hdrOrientation, 'orientation', -180, 180).name('Orientation').onChange((value) => {
            if (this.scene.environmentTexture) {
                this.scene.environmentTexture.setReflectionTextureMatrix(
                    BABYLON.Matrix.RotationY(BABYLON.Tools.ToRadians(value))
                );
            }
            this.config.environment.orientation = value;
            if (this.onEnvironmentChange) {
                this.onEnvironmentChange('orientation', value);
            }
        });
        
        // Export Parameters button
        const exportParams = { 
            export: async () => {
                try {
                    const currentConfig = await fetch('studio.json?ts=' + Date.now(), { cache: 'no-store' }).then(r => r.json());
                    
                    const exportConfig = {
                        environment: {
                            backgroundColor: this.config.environment.backgroundColor,
                            hdrExposure: this.config.environment.hdrExposure,
                            orientation: this.config.environment.orientation
                        },
                        camera: currentConfig.camera
                    };
                    
                    const jsonContent = JSON.stringify(exportConfig, null, 2);
                    const res = await fetch('studio.json', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: jsonContent
                    });
                    
                    if (res.ok) {
                        this.config = exportConfig;
                    } else {
                        throw new Error('Save failed: ' + res.status);
                    }
                } catch (error) {
                    console.error("❌ Environment export failed:", error);
                }
            }
        };
        this.environmentFolder.add(exportParams, 'export').name('Export Parameters');
    }
    
    // Créer le dossier Camera
    createCameraFolder() {
        this.cameraFolder = this.gui.addFolder('Camera');
        
        // Camera Yaw control (horizontal rotation)
        const cameraYaw = { yaw: this.config.camera.alpha };
        this.cameraFolder.add(cameraYaw, 'yaw', -180, 180).name('Yaw (Horizontal)').onChange((value) => {
            const radians = BABYLON.Tools.ToRadians(value);
            this.scene.activeCamera.alpha = radians;
            this.config.camera.alpha = radians;
            if (this.onCameraChange) {
                this.onCameraChange('alpha', radians);
            }
        });
        
        // Initial Pitch control - Contrôle l'angle initial de la caméra
        const initialPitch = { pitch: this.config.camera.initialPitch !== undefined ? this.config.camera.initialPitch : 0 };
        this.cameraFolder.add(initialPitch, 'pitch', -90, 90).name('Initial Pitch').onChange((value) => {
            // Convertir en radians
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
        
        // Camera Field of View control
        const cameraFov = { fov: this.scene.activeCamera.fov };
        this.cameraFolder.add(cameraFov, 'fov', 10, 120).name('Field of View').onChange((value) => {
            this.scene.activeCamera.fov = value;
            this.config.camera.fov = value;
            if (this.onCameraChange) {
                this.onCameraChange('fov', value);
            }
        });
        
        // Camera Distance control
        const cameraDistance = { distance: this.config.camera.radius };
        this.cameraFolder.add(cameraDistance, 'distance', 1, 50).name('Distance').onChange((value) => {
            this.scene.activeCamera.radius = value;
            this.config.camera.radius = value;
            if (this.onCameraChange) {
                this.onCameraChange('radius', value);
            }
        });
        
        // Camera Min Distance control
        const cameraMinDistance = { minDistance: this.config.camera.minDistance || 1 };
        this.cameraFolder.add(cameraMinDistance, 'minDistance', 0.1, 10).name('Min Distance').onChange((value) => {
            this.scene.activeCamera.lowerRadiusLimit = value;
            this.config.camera.minDistance = value;
            if (this.onCameraChange) {
                this.onCameraChange('minDistance', value);
            }
        });
        
        // Camera Max Distance control
        const cameraMaxDistance = { maxDistance: this.config.camera.maxDistance || 50 };
        this.cameraFolder.add(cameraMaxDistance, 'maxDistance', 10, 100).name('Max Distance').onChange((value) => {
            this.scene.activeCamera.upperRadiusLimit = value;
            this.config.camera.maxDistance = value;
            if (this.onCameraChange) {
                this.onCameraChange('maxDistance', value);
            }
        });
        
        // Camera Zoom Speed control (wheel precision)
        const cameraZoomSpeed = { zoomSpeed: this.config.camera.zoomSpeed || 1 };
        this.cameraFolder.add(cameraZoomSpeed, 'zoomSpeed', 0, 10).step(0.1).name('Zoom Speed (Wheel)').onChange((value) => {
            this.scene.activeCamera.wheelPrecision = value;
            this.config.camera.zoomSpeed = value;
            if (this.onCameraChange) {
                this.onCameraChange('zoomSpeed', value);
            }
        });
        
        // Camera Zoom Sensitivity control
        const cameraZoomSensitivity = { zoomSensitivity: this.config.camera.zoomSensitivity || 0.5 };
        this.cameraFolder.add(cameraZoomSensitivity, 'zoomSensitivity', 0.1, 2.0).step(0.1).name('Zoom Sensitivity').onChange((value) => {
            this.scene.activeCamera.zoomSensitivity = value;
            this.config.camera.zoomSensitivity = value;
            if (this.onCameraChange) {
                this.onCameraChange('zoomSensitivity', value);
            }
        });
        
        // Camera Inertia control for smooth movements
        const cameraInertia = { inertia: this.config.camera.inertia || 0.9 };
        this.cameraFolder.add(cameraInertia, 'inertia', 0.0, 0.99).step(0.01).name('Movement Inertia').onChange((value) => {
            this.scene.activeCamera.inertia = value;
            this.config.camera.inertia = value;
            if (this.onCameraChange) {
                this.onCameraChange('inertia', value);
            }
        });
        
        // Camera Zoom Smoothness control
        const cameraZoomSmoothness = { zoomSmoothness: this.config.camera.zoomSmoothness || 0.1 };
        this.cameraFolder.add(cameraZoomSmoothness, 'zoomSmoothness', 0.05, 0.5).step(0.01).name('Zoom Smoothness').onChange((value) => {
            if (window.zoomLerpFactor !== undefined) {
                window.zoomLerpFactor = value;
            }
            this.config.camera.zoomSmoothness = value;
            if (this.onCameraChange) {
                this.onCameraChange('zoomSmoothness', value);
            }
        });
        
        // Camera Horizontal Sensitivity control
        const cameraHorizontalSensitivity = { horizontalSensitivity: window.cameraHorizontalSensitivity || 1000 };
        this.cameraFolder.add(cameraHorizontalSensitivity, 'horizontalSensitivity', 100, 10000).step(100).name('Horizontal Sensitivity').onChange((value) => {
            window.cameraHorizontalSensitivity = value;
            if (this.onCameraChange) {
                this.onCameraChange('horizontalSensitivity', value);
            }
        });
        

        
        // Target controls
        this.targetFolder = this.cameraFolder.addFolder('Target Position');
        
        // Target X position control
        const targetX = { x: this.scene.activeCamera.target.x };
        this.targetFolder.add(targetX, 'x', -10, 10).step(0.1).name('Target X').onChange((value) => {
            this.scene.activeCamera.target.x = value;
            this.config.camera.targetX = value;
            this.updateTargetVisual();
            if (this.onCameraChange) {
                this.onCameraChange('targetX', value);
            }
        });
        
        // Target Y position control
        const targetY = { y: this.scene.activeCamera.target.y };
        this.targetFolder.add(targetY, 'y', -10, 10).step(0.1).name('Target Y').onChange((value) => {
            this.scene.activeCamera.target.y = value;
            this.config.camera.targetY = value;
            this.updateTargetVisual();
            if (this.onCameraChange) {
                this.onCameraChange('targetY', value);
            }
        });
        
        // Target Z position control
        const targetZ = { z: this.scene.activeCamera.target.z };
        this.targetFolder.add(targetZ, 'z', -10, 10).step(0.1).name('Target Z').onChange((value) => {
            this.scene.activeCamera.target.z = value;
            this.config.camera.targetZ = value;
            this.updateTargetVisual();
            if (this.onCameraChange) {
                this.onCameraChange('targetZ', value);
            }
        });
        
        // Target visibility toggle
        const showTarget = { visible: this.config.camera.showTarget !== undefined ? this.config.camera.showTarget : true };
        this.targetFolder.add(showTarget, 'visible').name('Show Target').onChange((value) => {
            // Mettre à jour la visibilité du target visual
            if (this.targetVisual) {
                this.targetVisual.setEnabled(value);
            }
            this.config.camera.showTarget = value;
            if (this.onCameraChange) {
                this.onCameraChange('showTarget', value);
            }
        });
        
        // Export studio configuration
        const exportStudio = { 
            export: async () => {
                try {
                    const jsonContent = JSON.stringify(this.config, null, 2);
                    const res = await fetch('studio.json', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: jsonContent
                    });
                    
                    if (res.ok) {
                    } else {
                        throw new Error('Save failed: ' + res.status);
                    }
                } catch (error) {
                    console.error("❌ Studio export failed:", error);
                }
            }
        };
        
        this.cameraFolder.add(exportStudio, 'export').name('Export Studio Config');
    }
    
    // Créer le dossier Materials
    createMaterialsFolder() {
        this.materialsFolder = this.gui.addFolder('Materials');
        
        // Material selection dropdown
        const materialNames = Object.keys(this.materialsConfig.materials);
        this.materialSelectControl = this.materialsFolder.add(this.materialList, 'selected', materialNames).name('Material List').onChange((value) => {
            this.updateMaterialPropertiesDisplay();
            // Ne pas appliquer les changements sur les mesh, juste lire les paramètres
        });
        
        // Create Material subfolder
        this.createMaterialFolder = this.materialsFolder.addFolder('Create Material');
        this.createNewMaterialControls();
    }
    
    // Initialiser les propriétés du premier matériau
    initializeMaterialProperties() {
        if (this.materialsConfig && this.materialsConfig.materials && Object.keys(this.materialsConfig.materials).length > 0) {
            const firstMaterialKey = Object.keys(this.materialsConfig.materials)[0];
            const firstMaterial = this.materialsConfig.materials[firstMaterialKey];
            
            // Update materialProperties with actual values from materials.json
            this.materialProperties.baseColor = firstMaterial.baseColor || '#ffffff';
            this.materialProperties.metallic = firstMaterial.metallic !== undefined ? firstMaterial.metallic : 0.0;
            this.materialProperties.roughness = firstMaterial.roughness !== undefined ? firstMaterial.roughness : 0.5;
            this.materialProperties.alpha = firstMaterial.alpha !== undefined ? firstMaterial.alpha : 1.0;
            this.materialProperties.albedoTexture = firstMaterial.albedoTexture || '';
            this.materialProperties.metallicTexture = firstMaterial.metallicTexture || '';
            this.materialProperties.microSurfaceTexture = firstMaterial.microSurfaceTexture || '';
            this.materialProperties.ambientTexture = firstMaterial.ambientTexture || '';
            this.materialProperties.opacityTexture = firstMaterial.opacityTexture || '';
            this.materialProperties.bumpTexture = firstMaterial.bumpTexture || '';
            this.materialProperties.bumpTextureIntensity = firstMaterial.bumpTextureIntensity !== undefined ? firstMaterial.bumpTextureIntensity : 1.0;
            this.materialProperties.lightmapTexture = firstMaterial.lightmapTexture || '';
            this.materialProperties.backFaceCulling = firstMaterial.backFaceCulling !== undefined ? firstMaterial.backFaceCulling : true;
            
            // Update texture transformation parameters
            this.materialProperties.uOffset = firstMaterial.uOffset !== undefined ? firstMaterial.uOffset : 0.0;
            this.materialProperties.vOffset = firstMaterial.vOffset !== undefined ? firstMaterial.vOffset : 0.0;
            this.materialProperties.uScale = firstMaterial.uScale !== undefined ? firstMaterial.uScale : 1.0;
            this.materialProperties.vScale = firstMaterial.vScale !== undefined ? firstMaterial.vScale : 1.0;
            this.materialProperties.wRotation = firstMaterial.wRotation !== undefined ? firstMaterial.wRotation : 0.0;
        }
    }
    
    // Créer tous les contrôles de matériaux
    createMaterialControls() {
        // Parent material control
        const parentOptions = ['none', ...Object.keys(this.materialsConfig.materials)];
        const currentParent = this.materialsConfig.materials[this.materialList.selected]?.parent || 'none';
        const parentData = { parent: currentParent };
        
        this.materialParentControl = this.materialsFolder.add(parentData, 'parent', parentOptions).name('Parent').onChange((value) => {
            // Update the current material's parent
            if (this.materialsConfig.materials[this.materialList.selected]) {
                this.materialsConfig.materials[this.materialList.selected].parent = value;
                // Ne pas appliquer sur les mesh, juste mettre à jour l'affichage
                this.updateParentChildDisplay();
            }
        });
        
        // Basic material properties
        this.baseColorControl = this.materialsFolder.addColor(this.materialProperties, 'baseColor').name('Albedo Color').onChange((value) => {
            this.materialProperties.baseColor = value;
            this.saveAndUpdateMaterials();
        });
        this.materialControls.set('baseColor', this.baseColorControl);
        
        this.metallicControl = this.materialsFolder.add(this.materialProperties, 'metallic', 0, 1).step(0.01).name('Metallic').onChange((value) => {
            this.materialProperties.metallic = value;
            this.saveAndUpdateMaterials();
        });
        this.materialControls.set('metallic', this.metallicControl);
        
        this.roughnessControl = this.materialsFolder.add(this.materialProperties, 'roughness', 0, 1).step(0.01).name('Roughness').onChange((value) => {
            this.materialProperties.roughness = value;
            this.saveAndUpdateMaterials();
        });
        this.materialControls.set('roughness', this.roughnessControl);
        
        this.alphaControl = this.materialsFolder.add(this.materialProperties, 'alpha', 0, 1).name('Alpha').onChange((value) => {
            this.materialProperties.alpha = value;
            this.saveAndUpdateMaterials();
        });
        this.materialControls.set('alpha', this.alphaControl);
        
        // Texture controls
        this.albedoTextureControl = this.materialsFolder.add(this.materialProperties, 'albedoTexture', this.availableImages).name('Albedo Texture').onChange((value) => {
            this.materialProperties.albedoTexture = value === 'None' ? '' : value;
            this.saveAndUpdateMaterials();
        });
        this.materialControls.set('albedoTexture', this.albedoTextureControl);
        
        this.metallicTextureControl = this.materialsFolder.add(this.materialProperties, 'metallicTexture', this.availableImages).name('Metallic Texture').onChange((value) => {
            this.materialProperties.metallicTexture = value === 'None' ? '' : value;
            this.saveAndUpdateMaterials();
        });
        this.materialControls.set('metallicTexture', this.metallicTextureControl);
        
        this.microSurfaceTextureControl = this.materialsFolder.add(this.materialProperties, 'microSurfaceTexture', this.availableImages).name('Microsurface Texture').onChange((value) => {
            this.materialProperties.microSurfaceTexture = value === 'None' ? '' : value;
            this.saveAndUpdateMaterials();
        });
        this.materialControls.set('microSurfaceTexture', this.microSurfaceTextureControl);
        
        this.ambientTextureControl = this.materialsFolder.add(this.materialProperties, 'ambientTexture', this.availableImages).name('Ambient Texture').onChange((value) => {
            this.materialProperties.ambientTexture = value === 'None' ? '' : value;
            this.saveAndUpdateMaterials();
        });
        this.materialControls.set('ambientTexture', this.ambientTextureControl);
        
        this.opacityTextureControl = this.materialsFolder.add(this.materialProperties, 'opacityTexture', this.availableImages).name('Opacity Texture').onChange((value) => {
            this.materialProperties.opacityTexture = value === 'None' ? '' : value;
            this.saveAndUpdateMaterials();
        });
        this.materialControls.set('opacityTexture', this.opacityTextureControl);
        
        this.bumpTextureControl = this.materialsFolder.add(this.materialProperties, 'bumpTexture', this.availableImages).name('Normal Map').onChange((value) => {
            this.materialProperties.bumpTexture = value === 'None' ? '' : value;
            this.saveAndUpdateMaterials();
        });
        this.materialControls.set('bumpTexture', this.bumpTextureControl);
        
        this.bumpTextureIntensityControl = this.materialsFolder.add(this.materialProperties, 'bumpTextureIntensity', 0, 5).step(0.1).name('Intensity').onChange((value) => {
            this.materialProperties.bumpTextureIntensity = value;
            this.saveAndUpdateMaterials();
        });
        this.materialControls.set('bumpTextureIntensity', this.bumpTextureIntensityControl);
        
        // Lightmap texture control
        this.lightmapTextureControl = this.materialsFolder.add(this.materialProperties, 'lightmapTexture', this.availableImages).name('Lightmap Texture').onChange((value) => {
            this.materialProperties.lightmapTexture = value === 'None' ? '' : value;
            this.saveAndUpdateMaterials();
        });
        this.materialControls.set('lightmapTexture', this.lightmapTextureControl);
        
        // Always set useLightmapAsShadowmap to true for optimal performance
        this.materialProperties.useLightmapAsShadowmap = true;
        
        // Create Texture Parameters subfolder
        this.textureParamsFolder = this.materialsFolder.addFolder('Texture Parameters');
        
        // U Offset control
        this.uOffsetControl = this.textureParamsFolder.add(this.materialProperties, 'uOffset', -2, 2).step(0.01).name('U Offset').onChange((value) => {
            this.materialProperties.uOffset = value;
            this.saveAndUpdateMaterials();
        });
        this.materialControls.set('uOffset', this.uOffsetControl);
        
        // V Offset control
        this.vOffsetControl = this.textureParamsFolder.add(this.materialProperties, 'vOffset', -2, 2).step(0.01).name('V Offset').onChange((value) => {
            this.materialProperties.vOffset = value;
            this.saveAndUpdateMaterials();
        });
        this.materialControls.set('vOffset', this.vOffsetControl);
        
        // U Scale control
        this.uScaleControl = this.textureParamsFolder.add(this.materialProperties, 'uScale', 0.1, 5).step(0.1).name('U Scale').onChange((value) => {
            this.materialProperties.uScale = value;
            this.saveAndUpdateMaterials();
        });
        this.materialControls.set('uScale', this.uScaleControl);
        
        // V Scale control
        this.vScaleControl = this.textureParamsFolder.add(this.materialProperties, 'vScale', 0.1, 5).step(0.1).name('V Scale').onChange((value) => {
            this.materialProperties.vScale = value;
            this.saveAndUpdateMaterials();
        });
        this.materialControls.set('vScale', this.vScaleControl);
        
        // W Rotation control (around W axis)
        this.wRotationControl = this.textureParamsFolder.add(this.materialProperties, 'wRotation', 0, 360).step(1).name('W Rotation').onChange((value) => {
            this.materialProperties.wRotation = value;
            this.saveAndUpdateMaterials();
        });
        this.materialControls.set('wRotation', this.wRotationControl);
        
        this.textureParamsFolderExists = true;
        
        this.backFaceCullingControl = this.materialsFolder.add(this.materialProperties, 'backFaceCulling').name('Back Face Culling').onChange((value) => {
            this.materialProperties.backFaceCulling = value;
            this.saveAndUpdateMaterials();
        });
        this.materialControls.set('backFaceCulling', this.backFaceCullingControl);
        
        // Add Refresh Images button
        const refreshImages = { 
            refresh: async () => {
                await this.loadAvailableImages();
                alert('✅ New textures loaded!\n\n💡 Please refresh the page (F5) to see new textures in the dropdowns.');
            }
        };
        this.refreshImagesControl = this.materialsFolder.add(refreshImages, 'refresh').name('Refresh Images');
        
        // Export materials configuration button
        const exportMaterials = { 
            export: async () => {
                try {
                    const jsonContent = JSON.stringify(this.materialsConfig, null, 2);
                    const res = await fetch('materials.json?path=Textures', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: jsonContent
                    });
                    
                    if (!res.ok) {
                        throw new Error('Save failed: ' + res.status);
                    }
                    
                } catch (error) {
                    console.error("❌ Materials export failed:", error);
                }
            }
        };
        
        this.exportMaterialsControl = this.materialsFolder.add(exportMaterials, 'export').name('Export Materials');
        
        
        // Force update of GUI controls to reflect initial values
        setTimeout(() => {
            this.updateGUIControls();
            this.updateParentChildDisplay();
        }, 100);
        
        // Ajouter un délai supplémentaire pour les gestionnaires de clic
        setTimeout(() => {
            this.updateControlsAppearance();
        }, 500);
    }
    
    // Créer les contrôles pour la création de matériaux
    createNewMaterialControls() {
        // Champ Name
        this.createMaterialFolder.add(this.newMaterialData, 'name').name('Name').onChange((value) => {
            this.newMaterialData.name = value;
        });
        
        // Bouton Create
        const createMaterial = {
            create: async () => {
                await this.createNewMaterial();
            }
        };
        this.createMaterialFolder.add(createMaterial, 'create').name('Create');
    }
    
    
    // Créer le nouveau matériau
    async createNewMaterial() {
        if (!this.newMaterialData.name.trim()) {
            alert('❌ Please enter a material name');
            return;
        }
        
        if (this.materialsConfig.materials[this.newMaterialData.name]) {
            alert('❌ A material with this name already exists');
            return;
        }
        
        try {
            // Créer le nouveau matériau avec parent: "none" par défaut
            const newMaterial = {
                type: 'pbr',
                parent: 'none'
            };
            
            // Ajouter le nouveau matériau à la configuration
            this.materialsConfig.materials[this.newMaterialData.name] = newMaterial;
            
            // Mettre à jour la liste des matériaux dans l'interface
            this.updateMaterialList();
            
            // Exporter la configuration mise à jour
            const jsonContent = JSON.stringify(this.materialsConfig, null, 2);
            const res = await fetch('materials.json?path=Textures', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: jsonContent
            });
            
            if (!res.ok) {
                throw new Error('Save failed: ' + res.status);
            }
            
            
            // Réinitialiser le formulaire
            this.resetCreateMaterialForm();
            
        } catch (error) {
            console.error("❌ Material creation failed:", error);
            alert("❌ Material creation failed: " + error.message);
        }
    }
    
    // Mettre à jour la liste des matériaux dans l'interface
    updateMaterialList() {
        const materialNames = Object.keys(this.materialsConfig.materials);
        
        // Pour dat.GUI, on ne peut pas facilement mettre à jour les options d'un contrôle existant
        // On va simplement ne pas recréer les contrôles pour éviter le déplacement
        // Les nouveaux matériaux seront disponibles au prochain rechargement de la page
    }
    
    // Réinitialiser le formulaire de création de matériau
    resetCreateMaterialForm() {
        this.newMaterialData.name = '';
        
        // Réinitialiser le contrôle Name
        if (this.createMaterialFolder) {
            const allControls = this.createMaterialFolder.__controllers || [];
            allControls.forEach(controller => {
                if (controller.property === 'name') {
                    controller.setValue('');
                }
            });
        }
    }
    
    // Fonction pour activer/désactiver la visibilité de dat.GUI
    toggleDatGUIVisibility(show) {
        if (this.gui && this.gui.domElement) {
            if (show) {
                this.gui.domElement.style.display = 'block';
            } else {
                this.gui.domElement.style.display = 'none';
            }
        }
    }
    
    // Créer le contrôle Show Inspector
    createInspectorControl() {
        const inspectorToggle = { showInspector: false };
        this.gui.add(inspectorToggle, 'showInspector').name('Show Inspector').onChange((value) => {
            if (value) {
                if (typeof BABYLON.Inspector !== 'undefined') {
                    this.scene.debugLayer.show();
                } else {
                    const script = document.createElement('script');
                    script.src = 'https://cdn.babylonjs.com/inspector/babylon.inspector.bundle.js';
                    script.onload = () => {
                        this.scene.debugLayer.show();
                    };
                    document.head.appendChild(script);
                }
            } else {
                this.scene.debugLayer.hide();
            }
        });
    }
    
    // Configurer l'état des dossiers
    setupFolderStates() {
        setTimeout(() => {
            this.environmentFolder.close();
            this.cameraFolder.close();
            this.materialsFolder.open();
        }, 100);
    }
    
    // Mettre à jour l'affichage des propriétés de matériau
    updateMaterialPropertiesDisplay() {
        const selectedMaterial = this.materialList.selected;
        if (selectedMaterial && this.materialsConfig.materials[selectedMaterial]) {
            const material = this.materialsConfig.materials[selectedMaterial];
            
            // Update the parent control
            if (this.materialParentControl) {
                const currentParent = material.parent || 'none';
                this.materialParentControl.setValue(currentParent);
            }
            
            // Update the materialProperties object with actual values from materials.json
            this.materialProperties.baseColor = material.baseColor || '#ffffff';
            this.materialProperties.metallic = material.metallic !== undefined ? material.metallic : 0.0;
            this.materialProperties.roughness = material.roughness !== undefined ? material.roughness : 0.5;
            this.materialProperties.alpha = material.alpha !== undefined ? material.alpha : 1.0;
            // Update texture dropdowns (convert empty strings to 'None')
            this.materialProperties.albedoTexture = material.albedoTexture && material.albedoTexture !== '' ? material.albedoTexture : 'None';
            this.materialProperties.metallicTexture = material.metallicTexture && material.metallicTexture !== '' ? material.metallicTexture : 'None';
            this.materialProperties.microSurfaceTexture = material.microSurfaceTexture && material.microSurfaceTexture !== '' ? material.microSurfaceTexture : 'None';
            this.materialProperties.ambientTexture = material.ambientTexture && material.ambientTexture !== '' ? material.ambientTexture : 'None';
            this.materialProperties.opacityTexture = material.opacityTexture && material.opacityTexture !== '' ? material.opacityTexture : 'None';
            this.materialProperties.bumpTexture = material.bumpTexture && material.bumpTexture !== '' ? material.bumpTexture : 'None';
            this.materialProperties.lightmapTexture = material.lightmapTexture && material.lightmapTexture !== '' ? material.lightmapTexture : 'None';
            
            // Update other properties
            this.materialProperties.bumpTextureIntensity = material.bumpTextureIntensity !== undefined ? material.bumpTextureIntensity : 1.0;
            this.materialProperties.backFaceCulling = material.backFaceCulling !== undefined ? material.backFaceCulling : true;
            
            // Update texture transformation parameters
            this.materialProperties.uOffset = material.uOffset !== undefined ? material.uOffset : 0.0;
            this.materialProperties.vOffset = material.vOffset !== undefined ? material.vOffset : 0.0;
            this.materialProperties.uScale = material.uScale !== undefined ? material.uScale : 1.0;
            this.materialProperties.vScale = material.vScale !== undefined ? material.vScale : 1.0;
            this.materialProperties.wRotation = material.wRotation !== undefined ? material.wRotation : 0.0;
            
            // Always set useLightmapAsShadowmap to true for optimal performance
            this.materialProperties.useLightmapAsShadowmap = true;
            
            // Force update of GUI controls to reflect the new values
            this.updateGUIControls();
            
            // Mettre à jour spécifiquement les contrôles de texture
            this.updateTextureControls();
            
            // Mettre à jour l'affichage parent-enfant
            this.updateParentChildDisplay();
        }
    }
    
    // Mettre à jour l'affichage parent-enfant
    updateParentChildDisplay() {
        const selectedMaterial = this.materialList.selected;
        if (!selectedMaterial || !this.materialsConfig.materials[selectedMaterial]) return;
        
        const material = this.materialsConfig.materials[selectedMaterial];
        const parent = material.parent;
        
        // Réinitialiser l'état des propriétés indépendantes
        this.independentProperties.clear();
        
        // Si le matériau a un parent, déterminer quelles propriétés sont indépendantes
        if (parent && parent !== 'none' && this.materialsConfig.materials[parent]) {
            const parentMaterial = this.materialsConfig.materials[parent];
            
            // Vérifier chaque propriété pour voir si elle est définie dans le matériau enfant
            const allProperties = [
                'baseColor', 'metallic', 'roughness', 'alpha',
                'albedoTexture', 'metallicTexture', 'microSurfaceTexture', 
                'ambientTexture', 'opacityTexture', 'bumpTexture', 
                'bumpTextureIntensity', 'lightmapTexture', 'backFaceCulling',
                'uOffset', 'vOffset', 'uScale', 'vScale', 'wRotation'
            ];
            
            allProperties.forEach(prop => {
                if (material[prop] !== undefined && material[prop] !== parentMaterial[prop]) {
                    this.independentProperties.add(prop);
                }
            });
        }
        
        // Mettre à jour l'affichage des contrôles
        this.updateControlsAppearance();
    }
    
    // Mettre à jour l'apparence des contrôles (grisage)
    updateControlsAppearance() {
        const selectedMaterial = this.materialList.selected;
        if (!selectedMaterial || !this.materialsConfig.materials[selectedMaterial]) return;
        
        const material = this.materialsConfig.materials[selectedMaterial];
        const parent = material.parent;
        
        this.materialControls.forEach((control, propertyName) => {
            if (!control || !control.domElement) return;
            
            const isIndependent = this.independentProperties.has(propertyName);
            const hasParent = parent && parent !== 'none';
            
            if (hasParent && !isIndependent) {
                // Propriété héritée - griser seulement
                control.domElement.style.opacity = '0.5';
                control.domElement.title = `Inherited from parent: ${parent} (Click label to make independent)`;
                
                // Ajouter gestionnaire de clic sur le label
                this.addLabelClickHandler(control, propertyName);
            } else if (hasParent && isIndependent) {
                // Propriété indépendante avec parent - normal avec option de reparenté
                control.domElement.style.opacity = '1';
                control.domElement.title = `Independent property (Click label to inherit from parent)`;
                
                // Ajouter gestionnaire de clic sur le label
                this.addLabelClickHandler(control, propertyName);
            } else {
                // Pas de parent - normal
                control.domElement.style.opacity = '1';
                control.domElement.title = '';
            }
        });
    }
    
    // Ajouter gestionnaire de clic sur le label d'un contrôle
    addLabelClickHandler(control, propertyName) {
        // Attendre que l'élément DOM soit complètement créé
        setTimeout(() => {
            // Trouver spécifiquement le span.property-name dans la structure dat.GUI
            let label = null;
            
            // Essayer différents sélecteurs pour trouver le bon élément
            const selectors = [
                'span.property-name',
                '.property-name',
                'span',
                '.dg span'
            ];
            
            for (const selector of selectors) {
                label = control.domElement.querySelector(selector);
                if (label) {
                    break;
                }
            }
            
            // Si pas de label trouvé, essayer de le trouver dans le parent
            if (!label && control.domElement.parentElement) {
                for (const selector of selectors) {
                    label = control.domElement.parentElement.querySelector(selector);
                    if (label) {
                        break;
                    }
                }
            }
            
            if (!label) {
                return;
            }
            
            // Supprimer l'ancien gestionnaire s'il existe
            if (label._labelClickHandler) {
                label.removeEventListener('click', label._labelClickHandler);
            }
            
            // Créer le nouveau gestionnaire
            const handler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.togglePropertyIndependence(propertyName);
            };
            
            // Stocker la référence et ajouter l'événement
            label._labelClickHandler = handler;
            label.addEventListener('click', handler);
            label.style.cursor = 'pointer';
            label.style.userSelect = 'none';
        }, 50); // Petit délai pour s'assurer que l'élément est créé
    }
    
    // Basculer l'indépendance d'une propriété
    togglePropertyIndependence(propertyName) {
        const selectedMaterial = this.materialList.selected;
        if (!selectedMaterial || !this.materialsConfig.materials[selectedMaterial]) return;
        
        const material = this.materialsConfig.materials[selectedMaterial];
        const parent = material.parent;
        
        if (!parent || parent === 'none') return;
        
        const parentMaterial = this.materialsConfig.materials[parent];
        if (!parentMaterial) return;
        
        if (this.independentProperties.has(propertyName)) {
            // Reparenté - supprimer la propriété du matériau enfant
            delete material[propertyName];
            this.independentProperties.delete(propertyName);
            
            // Mettre à jour l'affichage avec la valeur du parent
            this.materialProperties[propertyName] = parentMaterial[propertyName];
        } else {
            // Déparenté - ajouter la propriété au matériau enfant
            material[propertyName] = this.materialProperties[propertyName];
            this.independentProperties.add(propertyName);
        }
        
        // Mettre à jour l'affichage
        this.updateControlsAppearance();
        this.updateGUIControls();
        
        // Appliquer les changements sur les mesh pour refléter le toggle
        this.applyMaterialChanges();
    }
    
    // Mettre à jour spécifiquement les contrôles de texture
    updateTextureControls() {
        // Forcer la mise à jour des contrôles de texture
        if (this.albedoTextureControl) {
            this.albedoTextureControl.updateDisplay();
        }
        if (this.metallicTextureControl) {
            this.metallicTextureControl.updateDisplay();
        }
        if (this.microSurfaceTextureControl) {
            this.microSurfaceTextureControl.updateDisplay();
        }
        if (this.ambientTextureControl) {
            this.ambientTextureControl.updateDisplay();
        }
        if (this.opacityTextureControl) {
            this.opacityTextureControl.updateDisplay();
        }
        if (this.bumpTextureControl) {
            this.bumpTextureControl.updateDisplay();
        }
        if (this.lightmapTextureControl) {
            this.lightmapTextureControl.updateDisplay();
        }
    }
    
    // Forcer la mise à jour des contrôles GUI
    updateGUIControls() {
        // Force update of color control
        if (this.baseColorControl) {
            this.baseColorControl.updateDisplay();
        }
        
        // Force update of other controls
        if (this.metallicControl) {
            this.metallicControl.updateDisplay();
        }
        if (this.roughnessControl) {
            this.roughnessControl.updateDisplay();
        }
        if (this.alphaControl) {
            this.alphaControl.updateDisplay();
        }
        if (this.bumpTextureIntensityControl) {
            this.bumpTextureIntensityControl.updateDisplay();
        }
        if (this.backFaceCullingControl) {
            this.backFaceCullingControl.updateDisplay();
        }
        
        // Force update of texture parameter controls
        if (this.uOffsetControl) {
            this.uOffsetControl.updateDisplay();
        }
        if (this.vOffsetControl) {
            this.vOffsetControl.updateDisplay();
        }
        if (this.uScaleControl) {
            this.uScaleControl.updateDisplay();
        }
        if (this.vScaleControl) {
            this.vScaleControl.updateDisplay();
        }
        if (this.wRotationControl) {
            this.wRotationControl.updateDisplay();
        }
    }
    
    // Sauvegarder les changements et mettre à jour les matériaux appliqués
    saveAndUpdateMaterials() {
        const selectedMaterial = this.materialList.selected;
        
        if (!selectedMaterial || !this.materialsConfig.materials[selectedMaterial]) {
            return;
        }
        
        const material = this.materialsConfig.materials[selectedMaterial];
        
        // Sauvegarder les changements dans la configuration
        const allProperties = [
            'baseColor', 'metallic', 'roughness', 'alpha',
            'albedoTexture', 'metallicTexture', 'microSurfaceTexture', 
            'ambientTexture', 'opacityTexture', 'bumpTexture', 
            'bumpTextureIntensity', 'lightmapTexture', 'backFaceCulling',
            'uOffset', 'vOffset', 'uScale', 'vScale', 'wRotation'
        ];
        
        allProperties.forEach(prop => {
            if (this.independentProperties.has(prop)) {
                // Propriété indépendante - la sauvegarder
                material[prop] = this.materialProperties[prop];
            } else if (material.parent && material.parent !== 'none') {
                // Propriété héritée - la supprimer du matériau enfant
                delete material[prop];
            } else {
                // Pas de parent - sauvegarder normalement
                material[prop] = this.materialProperties[prop];
            }
        });
        
        // Toujours sauvegarder useLightmapAsShadowmap
        material.useLightmapAsShadowmap = this.materialProperties.useLightmapAsShadowmap;
        
        // Maintenant mettre à jour les matériaux appliqués en temps réel
        this.updateAppliedMaterials();
        
        if (this.onMaterialChange) {
            this.onMaterialChange('properties', this.materialProperties);
        }
    }
    
    // Mettre à jour seulement les matériaux déjà appliqués (temps réel)
    updateAppliedMaterials() {
        const selectedMaterial = this.materialList.selected;
        
        if (!selectedMaterial || !this.materialsConfig.materials[selectedMaterial]) {
            return;
        }
        
        // Trouver tous les meshes qui utilisent actuellement ce matériau
        if (!window.tagManager || !window.tagManager.scene) {
            return;
        }
        
        const scene = window.tagManager.scene;
        
        // Utiliser les informations du TagManager pour trouver les bons meshes
        if (window.tagManager.activeMaterialConfigs && window.tagManager.activeMaterialConfigs.size > 0) {
            let updatedCount = 0;
            
            // Parcourir toutes les configurations actives
            for (const [objectName, configName] of window.tagManager.activeMaterialConfigs) {
                const materialConfig = window.tagManager.tagConfig.materials[objectName][configName];
            
            // Parcourir tous les meshes et vérifier s'ils utilisent le matériau sélectionné
            scene.meshes.forEach(mesh => {
                if (mesh.isEnabled() && mesh.material) {
                    let shouldUpdate = false;
                    
                    if (mesh.name.includes('_primitive')) {
                        // Cas multi-matériaux : mesh primitif
                        const primitiveMatch = mesh.name.match(/^(.+)_primitive(\d+)$/);
                        if (primitiveMatch) {
                            const baseMeshName = primitiveMatch[1];
                            const primitiveIndex = parseInt(primitiveMatch[2]);
                            const slotName = `slot${primitiveIndex + 1}`;
                            
                            // Vérifier si ce slot utilise le matériau sélectionné
                            if (materialConfig[slotName] === selectedMaterial) {
                                shouldUpdate = true;
                            }
                        }
                    } else {
                        // Cas mono-matériau : mesh original (utilise slot1 par défaut)
                        const baseMeshName = mesh.name;
                        if (materialConfig['slot1'] === selectedMaterial) {
                            shouldUpdate = true;
                        }
                    }
                    
                    if (shouldUpdate) {
                        updatedCount++;
                        
                        // Mettre à jour les propriétés du matériau existant
                        if (this.materialProperties.baseColor) {
                            const color = BABYLON.Color3.FromHexString(this.materialProperties.baseColor);
                            mesh.material.albedoColor = color;
                        }
                        
                        if (this.materialProperties.metallic !== undefined) {
                            mesh.material.metallic = this.materialProperties.metallic;
                        }
                        
                        if (this.materialProperties.roughness !== undefined) {
                            mesh.material.roughness = this.materialProperties.roughness;
                        }
                        
                        if (this.materialProperties.alpha !== undefined) {
                            mesh.material.alpha = this.materialProperties.alpha;
                        }
                        
                        // Mettre à jour les textures
                        if (this.materialProperties.albedoTexture && this.materialProperties.albedoTexture !== 'None') {
                            const texture = new BABYLON.Texture(`Textures/${this.materialProperties.albedoTexture}`, scene);
                            mesh.material.albedoTexture = texture;
                        } else {
                            mesh.material.albedoTexture = null;
                        }
                        
                        if (this.materialProperties.metallicTexture && this.materialProperties.metallicTexture !== 'None') {
                            const texture = new BABYLON.Texture(`Textures/${this.materialProperties.metallicTexture}`, scene);
                            mesh.material.metallicTexture = texture;
                        } else {
                            mesh.material.metallicTexture = null;
                        }
                        
                        if (this.materialProperties.microSurfaceTexture && this.materialProperties.microSurfaceTexture !== 'None') {
                            const texture = new BABYLON.Texture(`Textures/${this.materialProperties.microSurfaceTexture}`, scene);
                            mesh.material.microSurfaceTexture = texture;
                        } else {
                            mesh.material.microSurfaceTexture = null;
                        }
                        
                        if (this.materialProperties.ambientTexture && this.materialProperties.ambientTexture !== 'None') {
                            const texture = new BABYLON.Texture(`Textures/${this.materialProperties.ambientTexture}`, scene);
                            mesh.material.ambientTexture = texture;
                        } else {
                            mesh.material.ambientTexture = null;
                        }
                        
                        if (this.materialProperties.opacityTexture && this.materialProperties.opacityTexture !== 'None') {
                            const texture = new BABYLON.Texture(`Textures/${this.materialProperties.opacityTexture}`, scene);
                            mesh.material.opacityTexture = texture;
                        } else {
                            mesh.material.opacityTexture = null;
                        }
                        
                        if (this.materialProperties.bumpTexture && this.materialProperties.bumpTexture !== 'None') {
                            const texture = new BABYLON.Texture(`Textures/${this.materialProperties.bumpTexture}`, scene);
                            mesh.material.bumpTexture = texture;
                        } else {
                            mesh.material.bumpTexture = null;
                        }
                        
                        if (this.materialProperties.lightmapTexture && this.materialProperties.lightmapTexture !== 'None') {
                            const texture = new BABYLON.Texture(`Textures/${this.materialProperties.lightmapTexture}`, scene);
                            mesh.material.lightmapTexture = texture;
                        } else {
                            mesh.material.lightmapTexture = null;
                        }
                        
                        // Mettre à jour les paramètres de texture
                        if (this.materialProperties.bumpTextureIntensity !== undefined && mesh.material.bumpTexture) {
                            mesh.material.bumpTexture.level = this.materialProperties.bumpTextureIntensity;
                        }
                        
                        // Appliquer les transformations UV à toutes les textures actives
                        const textureTransform = {
                            uOffset: this.materialProperties.uOffset || 0,
                            vOffset: this.materialProperties.vOffset || 0,
                            uScale: this.materialProperties.uScale || 1,
                            vScale: this.materialProperties.vScale || 1,
                            wRotation: this.materialProperties.wRotation || 0
                        };
                        
                        // Appliquer les transformations à toutes les textures du matériau
                        const textures = [
                            mesh.material.albedoTexture,
                            mesh.material.metallicTexture,
                            mesh.material.microSurfaceTexture,
                            mesh.material.ambientTexture,
                            mesh.material.opacityTexture,
                            mesh.material.bumpTexture,
                            mesh.material.lightmapTexture
                        ];
                        
                        textures.forEach(texture => {
                            if (texture) {
                                texture.uOffset = textureTransform.uOffset;
                                texture.vOffset = textureTransform.vOffset;
                                texture.uScale = textureTransform.uScale;
                                texture.vScale = textureTransform.vScale;
                                // Convertir les degrés en radians pour la rotation
                                texture.wAng = BABYLON.Tools.ToRadians(textureTransform.wRotation);
                            }
                        });
                        
                        // Marquer le matériau comme modifié
                        mesh.material.markDirty(BABYLON.Material.TextureDirtyFlag);
                    }
                }
            });
            }
            
            // Mise à jour temps réel terminée
        }
    }
    
    // Appliquer les changements de matériau
    applyMaterialChanges() {
        const selectedMaterial = this.materialList.selected;
        if (selectedMaterial && this.materialsConfig.materials[selectedMaterial]) {
            const material = this.materialsConfig.materials[selectedMaterial];
            
            // Ne mettre à jour que les propriétés indépendantes
            const allProperties = [
                'baseColor', 'metallic', 'roughness', 'alpha',
                'albedoTexture', 'metallicTexture', 'microSurfaceTexture', 
                'ambientTexture', 'opacityTexture', 'bumpTexture', 
                'bumpTextureIntensity', 'lightmapTexture', 'backFaceCulling',
                'uOffset', 'vOffset', 'uScale', 'vScale', 'wRotation'
            ];
            
            allProperties.forEach(prop => {
                if (this.independentProperties.has(prop)) {
                    // Propriété indépendante - la sauvegarder
                    material[prop] = this.materialProperties[prop];
                } else if (material.parent && material.parent !== 'none') {
                    // Propriété héritée - la supprimer du matériau enfant
                    delete material[prop];
                } else {
                    // Pas de parent - sauvegarder normalement
                    material[prop] = this.materialProperties[prop];
                }
            });
            
            // Toujours sauvegarder useLightmapAsShadowmap
            material.useLightmapAsShadowmap = this.materialProperties.useLightmapAsShadowmap;
            
            // Appliquer les changements aux meshes visibles dans la scène
            this.applyMaterialToVisibleMeshes(selectedMaterial);
            
            if (this.onMaterialChange) {
                this.onMaterialChange('properties', this.materialProperties);
            }
        }
    }
    
    // Appliquer le matériau modifié aux meshes visibles
    applyMaterialToVisibleMeshes(materialName) {
        if (!window.tagManager || !window.tagManager.scene) return;
        
        const scene = window.tagManager.scene;
        const materialConfig = this.materialsConfig.materials[materialName];
        
        // Trouver tous les meshes visibles qui utilisent ce matériau
        scene.meshes.forEach(mesh => {
            if (mesh.isEnabled() && mesh.material) {
                // Vérifier si ce mesh utilise le matériau modifié
                const meshName = mesh.name;
                if (meshName && meshName.includes('_primitive')) {
                    // Déterminer si ce mesh devrait utiliser le matériau modifié
                    const shouldUseMaterial = this.shouldMeshUseMaterialForSlot(meshName, materialName);
                    
                    if (shouldUseMaterial) {
                        // Recréer et appliquer le matériau
                        const newMaterial = this.createPBRMaterial(materialConfig, scene);
                        mesh.material = newMaterial;
                    }
                }
            }
        });
    }
    
    // Déterminer si un mesh devrait utiliser un matériau spécifique pour son slot
    shouldMeshUseMaterialForSlot(meshName, materialName) {
        if (!window.tagManager || !window.tagManager.activeMaterialConfigs || window.tagManager.activeMaterialConfigs.size === 0) return false;
        
        // Vérifier toutes les configurations actives
        for (const [objectName, configName] of window.tagManager.activeMaterialConfigs) {
            if (!window.tagManager.tagConfig || !window.tagManager.tagConfig.materials[objectName]) continue;
            
            const materialConfig = window.tagManager.tagConfig.materials[objectName][configName];
            if (!materialConfig) continue;
        
            // Extraire le nom de base du mesh et l'index du primitif (ex: cube1_primitive0 -> cube1, 0)
            const primitiveMatch = meshName.match(/^(.+)_primitive(\d+)$/);
            if (!primitiveMatch) continue;
            
            const baseMeshName = primitiveMatch[1];
            const primitiveIndex = parseInt(primitiveMatch[2]);
            const slotName = `slot${primitiveIndex + 1}`;
            
            // Vérifier si ce slot spécifique utilise le matériau modifié
            if (materialConfig[slotName] === materialName) {
                return true;
            }
        }
        
        return false;
    }
    
    // Créer un matériau PBR (copie de la fonction dans scene.js)
    createPBRMaterial(materialConfig, scene) {
        // Handle parent-child material inheritance
        let finalMaterialConfig = materialConfig;
        if (materialConfig.parent && materialConfig.parent !== 'none' && this.materialsConfig && this.materialsConfig.materials[materialConfig.parent]) {
            const parentMaterial = this.materialsConfig.materials[materialConfig.parent];
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
        
        // Ambient texture
        if (finalMaterialConfig.ambientTexture && finalMaterialConfig.ambientTexture.trim() !== '' && finalMaterialConfig.ambientTexture !== 'None') {
            pbr.ambientTexture = new BABYLON.Texture(`Textures/${finalMaterialConfig.ambientTexture}`, scene);
        }
        
        // Opacity texture
        if (finalMaterialConfig.opacityTexture && finalMaterialConfig.opacityTexture.trim() !== '' && finalMaterialConfig.opacityTexture !== 'None') {
            pbr.opacityTexture = new BABYLON.Texture(`Textures/${finalMaterialConfig.opacityTexture}`, scene);
        }
        
        // Lightmap texture
        if (finalMaterialConfig.lightmapTexture && finalMaterialConfig.lightmapTexture.trim() !== '' && finalMaterialConfig.lightmapTexture !== 'None') {
            pbr.lightmapTexture = new BABYLON.Texture(`Textures/${finalMaterialConfig.lightmapTexture}`, scene);
            pbr.useLightmapAsShadowmap = finalMaterialConfig.useLightmapAsShadowmap !== undefined ? finalMaterialConfig.useLightmapAsShadowmap : true;
        }
        
        // Propriétés supplémentaires
        if (finalMaterialConfig.backFaceCulling !== undefined) {
            pbr.backFaceCulling = finalMaterialConfig.backFaceCulling;
        }
        
        // Appliquer les transformations de texture
        this.applyTextureTransformations(pbr, finalMaterialConfig);
        
        return pbr;
    }
    
    // Appliquer les transformations de texture (copie de la fonction dans scene.js)
    applyTextureTransformations(pbr, finalMaterialConfig) {
        if (finalMaterialConfig.uOffset !== undefined || finalMaterialConfig.vOffset !== undefined || 
            finalMaterialConfig.uScale !== undefined || finalMaterialConfig.vScale !== undefined || 
            finalMaterialConfig.wRotation !== undefined) {
            
            const texture = pbr.albedoTexture || pbr.metallicTexture || pbr.microSurfaceTexture || 
                           pbr.ambientTexture || pbr.opacityTexture || pbr.bumpTexture || pbr.lightmapTexture;
            
            if (texture) {
                if (finalMaterialConfig.uOffset !== undefined) texture.uOffset = finalMaterialConfig.uOffset;
                if (finalMaterialConfig.vOffset !== undefined) texture.vOffset = finalMaterialConfig.vOffset;
                if (finalMaterialConfig.uScale !== undefined) texture.uScale = finalMaterialConfig.uScale;
                if (finalMaterialConfig.vScale !== undefined) texture.vScale = finalMaterialConfig.vScale;
                if (finalMaterialConfig.wRotation !== undefined) texture.wAng = BABYLON.Tools.ToRadians(finalMaterialConfig.wRotation);
            }
        }
    }
    
    // Obtenir le contrôle de sélection de matériau (pour la sélection par clic)
    getMaterialSelectControl() {
        return this.materialSelectControl;
    }
    
    
    // Mettre à jour la sélection de matériau (pour la sélection par clic)
    setSelectedMaterial(materialName) {
        if (this.materialSelectControl) {
            this.materialSelectControl.setValue(materialName);
        }
    }
    
    // Nettoyer l'interface
    dispose() {
        if (this.gui) {
            this.gui.destroy();
            this.gui = null;
        }
    }
    
    // Fonction pour créer le target visual
    createTargetVisual(scene, target) {
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
    
    // Fonction pour mettre à jour la position du target visual
    updateTargetVisual() {
        if (this.targetVisual) {
            // Simply move the entire target group to the new position
            // The arrows will automatically follow due to parent-child relationship
            this.targetVisual.position = this.scene.activeCamera.target;
        }
    }
    
    // Initialiser le target visual
    initTargetVisual() {
        if (this.scene && this.scene.activeCamera) {
            this.targetVisual = this.createTargetVisual(this.scene, this.scene.activeCamera.target);
            this.targetVisual.setEnabled(this.config.camera.showTarget !== undefined ? this.config.camera.showTarget : true);
            
            // Rendre accessible globalement pour compatibilité
            window.targetVisual = this.targetVisual;
        }
    }
    
    // Méthode publique pour activer/désactiver dat.GUI depuis l'extérieur
    setDatGUIVisibility(show) {
        this.toggleDatGUIVisibility(show);
    }
    
    // Méthode publique pour obtenir l'état de visibilité de dat.GUI
    isDatGUIVisible() {
        return this.gui && this.gui.domElement && this.gui.domElement.style.display !== 'none';
    }
    
    // Les contrôles personnalisés sont maintenant gérés dans scene.js
}

// Exporter la classe pour utilisation dans scene.js
window.DatGUIManager = DatGUIManager;
