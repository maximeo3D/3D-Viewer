// tweakpaneManager.js - Gestion complète de l'interface utilisateur Tweakpane
// Migration depuis datGUI vers Tweakpane pour une meilleure stabilité

class TweakpaneManager {
    constructor(scene, materialsConfig, config) {
        this.scene = scene;
        this.materialsConfig = materialsConfig;
        this.config = config;
        
        this.pane = null;
        this.loadedModels = new Map();
        
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
        this.independentProperties = new Set();
        this.materialControls = new Map();
        
        // Variables pour la création de matériaux
        this.createMaterialFolder = null;
        this.newMaterialData = { name: '' };
        this.isLoading = false;
        this.materialProperties = {
            baseColor: { r: 1, g: 1, b: 1 },
            metallic: 0.0,
            roughness: 0.5,
            alpha: 1.0,
            albedoTexture: 'None',
            metallicTexture: 'None',
            microSurfaceTexture: 'None',
            ambientTexture: 'None',
            opacityTexture: 'None',
            bumpTexture: 'None',
            bumpTextureIntensity: 1.0,
            lightmapTexture: 'None',
            useLightmapAsShadowmap: true,
            backFaceCulling: true,
            // Texture transformation parameters
            uOffset: 0.0,
            vOffset: 0.0,
            uScale: 1.0,
            vScale: 1.0,
            wRotation: 0.0
        };
        
        // Variables pour les contrôles d'environnement
        this.environmentData = {
            backgroundColor: '#87CEEB',
            hdrTexture: 'default.hdr',
            hdrOrientation: 0.0,
            hdrExposure: 1.0
        };
        
        // Variables pour les contrôles de caméra
        this.cameraData = {
            alpha: 0.0,
            beta: 1.2,
            radius: 10.0,
            fov: 0.8,
            minDistance: 1.0,
            maxDistance: 100.0,
            horizontalSensitivity: 0.01
        };
        
        // Variables pour les contrôles de cible
        this.targetData = {
            x: 0.0,
            y: 0.0,
            z: 0.0
        };
        
        // Variables pour l'inspecteur
        this.inspectorToggle = { showInspector: false };
        
        // Variables pour le refresh des images
        this.refreshImages = { refresh: false };
        
        // Callback pour les changements de matériaux
        this.onMaterialChange = null;
    }
    
    async init() {
        await this.loadMaterialsConfig();
        this.createGUI();
        this.createEnvironmentFolder();
        this.createCameraFolder();
        await this.createMaterialsFolder();
        this.createInspectorControls();
        
        // Charger les propriétés du premier matériau après l'initialisation
        if (this.materialsConfig && this.materialsConfig.materials) {
            const firstMaterial = Object.keys(this.materialsConfig.materials)[0];
            if (firstMaterial) {
                this.materialList.selected = firstMaterial;
                this.loadMaterialProperties(firstMaterial);
            }
        }
    }
    
    async loadMaterialsConfig() {
        try {
            const response = await fetch('Textures/materials.json');
            if (response.ok) {
                this.materialsConfig = await response.json();
                console.log('✅ Configuration des matériaux chargée');
                console.log('📊 Matériaux disponibles:', Object.keys(this.materialsConfig.materials));
            } else {
                console.warn('⚠️ Impossible de charger materials.json, utilisation de la configuration par défaut');
            }
        } catch (error) {
            console.warn('⚠️ Erreur lors du chargement de materials.json:', error);
        }
    }
    
    createGUI() {
        // Créer le panneau principal Tweakpane (API v3)
        this.pane = new Tweakpane.Pane({
            title: '3D Viewer Controls',
            expanded: true
        });
        
        // Positionner le panneau
        this.pane.element.style.position = 'fixed';
        this.pane.element.style.top = '10px';
        this.pane.element.style.right = '10px';
        this.pane.element.style.zIndex = '1000';
        this.pane.element.style.width = '300px';
    }
    
    createEnvironmentFolder() {
        this.environmentFolder = this.pane.addFolder({
            title: 'Environment',
            expanded: false
        });
        
        // Background color
        this.environmentFolder.addInput(this.environmentData, 'backgroundColor', {
            color: { type: 'float' }
        }).on('change', (ev) => {
            if (this.scene && this.scene.clearColor) {
                const color = BABYLON.Color3.FromHexString(ev.value);
                this.scene.clearColor = new BABYLON.Color4(color.r, color.g, color.b, 1.0);
            }
        });
        
        // HDR Texture
        this.environmentFolder.addInput(this.environmentData, 'hdrTexture', {
            options: {
                'default.hdr': 'default.hdr',
                'None': 'None'
            }
        }).on('change', (ev) => {
            this.updateHDRTexture(ev.value);
        });
        
        // HDR Orientation
        this.environmentFolder.addInput(this.environmentData, 'hdrOrientation', {
            min: -Math.PI,
            max: Math.PI,
            step: 0.01
        }).on('change', (ev) => {
            this.updateHDROrientation(ev.value);
        });
        
        // HDR Exposure
        this.environmentFolder.addInput(this.environmentData, 'hdrExposure', {
            min: 0.1,
            max: 5.0,
            step: 0.1
        }).on('change', (ev) => {
            this.updateHDRExposure(ev.value);
        });
    }
    
    createCameraFolder() {
        this.cameraFolder = this.pane.addFolder({
            title: 'Camera',
            expanded: false
        });
        
        // Alpha (Yaw)
        this.cameraFolder.addInput(this.cameraData, 'alpha', {
            min: -Math.PI,
            max: Math.PI,
            step: 0.01
        }).on('change', (ev) => {
            this.updateCameraAlpha(ev.value);
        });
        
        // Beta (Pitch)
        this.cameraFolder.addInput(this.cameraData, 'beta', {
            min: 0.1,
            max: Math.PI - 0.1,
            step: 0.01
        }).on('change', (ev) => {
            this.updateCameraBeta(ev.value);
        });
        
        // Radius (Distance)
        this.cameraFolder.addInput(this.cameraData, 'radius', {
            min: 1.0,
            max: 50.0,
            step: 0.1
        }).on('change', (ev) => {
            this.updateCameraRadius(ev.value);
        });
        
        // Field of View
        this.cameraFolder.addInput(this.cameraData, 'fov', {
            min: 0.1,
            max: 2.0,
            step: 0.01
        }).on('change', (ev) => {
            this.updateCameraFOV(ev.value);
        });
        
        // Min Distance
        this.cameraFolder.addInput(this.cameraData, 'minDistance', {
            min: 0.1,
            max: 10.0,
            step: 0.1
        }).on('change', (ev) => {
            this.updateCameraMinDistance(ev.value);
        });
        
        // Max Distance
        this.cameraFolder.addInput(this.cameraData, 'maxDistance', {
            min: 10.0,
            max: 1000.0,
            step: 1.0
        }).on('change', (ev) => {
            this.updateCameraMaxDistance(ev.value);
        });
        
        // Horizontal Sensitivity
        this.cameraFolder.addInput(this.cameraData, 'horizontalSensitivity', {
            min: 0.001,
            max: 0.1,
            step: 0.001
        }).on('change', (ev) => {
            this.updateCameraHorizontalSensitivity(ev.value);
        });
        
        // Target controls (sous-menu de Camera)
        this.createTargetFolder();
    }
    
    async createMaterialsFolder() {
        this.materialsFolder = this.pane.addFolder({
            title: 'Materials',
            expanded: true
        });
        
        // Material selection
        this.materialSelectControl = this.materialsFolder.addInput(this.materialList, 'selected', {
            options: Object.keys(this.materialsConfig.materials).reduce((acc, key) => {
                acc[key] = key;
                return acc;
            }, {})
        }).on('change', (ev) => {
            this.onMaterialSelectionChange(ev.value);
        });
        
        // Parent selection
        const parentOptions = ['none', ...Object.keys(this.materialsConfig.materials)];
        const currentParent = this.materialsConfig.materials[this.materialList.selected]?.parent || 'none';
        this.materialParentControl = this.materialsFolder.addInput({ parent: currentParent }, 'parent', {
            options: parentOptions.reduce((acc, key) => {
                acc[key] = key;
                return acc;
            }, {})
        }).on('change', (ev) => {
            this.onParentChange(ev.value);
        });
        
        // Create material section (en premier)
        this.createNewMaterialControls();
        
        // Material properties
        await this.createMaterialControls();
        
        // Bouton Export Material à la fin
        this.materialsFolder.addButton({
            title: 'Export Material'
        }).on('click', () => {
            this.exportMaterial();
        });
    }
    
    async createMaterialControls() {
        // Base Color avec affichage hexadécimal
        this.baseColorDisplay = { hex: '#ffffff' };
        this.materialsFolder.addInput(this.baseColorDisplay, 'hex', {
            label: 'Base Color'
        }).on('change', (ev) => {
            this.updateRGBFromHex(ev.value);
            // Marquer la propriété comme indépendante pour la sauvegarde/export
            this.independentProperties.add('baseColor');
            this.applyMaterialChanges();
        });
        
        // Metallic
        this.materialsFolder.addInput(this.materialProperties, 'metallic', {
            min: 0.0,
            max: 1.0,
            step: 0.01
        }).on('change', (ev) => {
            this.materialProperties.metallic = ev.value;
            this.independentProperties.add('metallic');
            this.applyMaterialChanges();
        });
        
        // Roughness
        this.materialsFolder.addInput(this.materialProperties, 'roughness', {
            min: 0.0,
            max: 1.0,
            step: 0.01
        }).on('change', (ev) => {
            this.materialProperties.roughness = ev.value;
            this.independentProperties.add('roughness');
            this.applyMaterialChanges();
        });
        
        // Alpha
        this.materialsFolder.addInput(this.materialProperties, 'alpha', {
            min: 0.0,
            max: 1.0,
            step: 0.01
        }).on('change', (ev) => {
            this.materialProperties.alpha = ev.value;
            this.independentProperties.add('alpha');
            this.applyMaterialChanges();
        });
        
        // Texture controls (async)
        await this.createTextureControls();
        
        // Texture transformation controls
        this.createTextureTransformationControls();
    }
    
    async createTextureControls() {
        const textureFolder = this.materialsFolder.addFolder({
            title: 'Textures',
            expanded: true
        });
        
        // Get available images
        const availableImages = await this.getAvailableImages();
        
        // Albedo Texture
        this.materialControls.set('albedoTexture', textureFolder.addInput(this.materialProperties, 'albedoTexture', {
            options: availableImages
        }).on('change', (ev) => {
            this.materialProperties.albedoTexture = ev.value;
            this.applyMaterialChanges();
        }));
        
        // Metallic Texture
        this.materialControls.set('metallicTexture', textureFolder.addInput(this.materialProperties, 'metallicTexture', {
            options: availableImages
        }).on('change', (ev) => {
            this.materialProperties.metallicTexture = ev.value;
            this.applyMaterialChanges();
        }));
        
        // Micro Surface Texture
        this.materialControls.set('microSurfaceTexture', textureFolder.addInput(this.materialProperties, 'microSurfaceTexture', {
            options: availableImages
        }).on('change', (ev) => {
            this.materialProperties.microSurfaceTexture = ev.value;
            this.applyMaterialChanges();
        }));
        
        // Ambient Texture
        this.materialControls.set('ambientTexture', textureFolder.addInput(this.materialProperties, 'ambientTexture', {
            options: availableImages
        }).on('change', (ev) => {
            this.materialProperties.ambientTexture = ev.value;
            this.applyMaterialChanges();
        }));
        
        // Opacity Texture
        this.materialControls.set('opacityTexture', textureFolder.addInput(this.materialProperties, 'opacityTexture', {
            options: availableImages
        }).on('change', (ev) => {
            this.materialProperties.opacityTexture = ev.value;
            this.applyMaterialChanges();
        }));
        
        // Bump Texture
        this.materialControls.set('bumpTexture', textureFolder.addInput(this.materialProperties, 'bumpTexture', {
            options: availableImages
        }).on('change', (ev) => {
            this.materialProperties.bumpTexture = ev.value;
            this.applyMaterialChanges();
        }));
        
        // Bump Texture Intensity
        textureFolder.addInput(this.materialProperties, 'bumpTextureIntensity', {
            min: 0.0,
            max: 10.0,
            step: 0.1
        }).on('change', (ev) => {
            this.materialProperties.bumpTextureIntensity = ev.value;
            this.applyMaterialChanges();
        });
        
        // Lightmap Texture
        this.materialControls.set('lightmapTexture', textureFolder.addInput(this.materialProperties, 'lightmapTexture', {
            options: availableImages
        }).on('change', (ev) => {
            this.materialProperties.lightmapTexture = ev.value;
            this.applyMaterialChanges();
        }));
        
        // Use Lightmap as Shadowmap
        textureFolder.addInput(this.materialProperties, 'useLightmapAsShadowmap').on('change', (ev) => {
            this.materialProperties.useLightmapAsShadowmap = ev.value;
            this.applyMaterialChanges();
        });
        
        // Back Face Culling
        textureFolder.addInput(this.materialProperties, 'backFaceCulling').on('change', (ev) => {
            this.materialProperties.backFaceCulling = ev.value;
            this.applyMaterialChanges();
        });
        
    }
    
    createTextureTransformationControls() {
        const transformFolder = this.materialsFolder.addFolder({
            title: 'Texture Transform',
            expanded: false
        });
        
        // U Offset
        transformFolder.addInput(this.materialProperties, 'uOffset', {
            min: -2.0,
            max: 2.0,
            step: 0.01
        }).on('change', (ev) => {
            this.materialProperties.uOffset = ev.value;
            this.applyMaterialChanges();
        });
        
        // V Offset
        transformFolder.addInput(this.materialProperties, 'vOffset', {
            min: -2.0,
            max: 2.0,
            step: 0.01
        }).on('change', (ev) => {
            this.materialProperties.vOffset = ev.value;
            this.applyMaterialChanges();
        });
        
        // U Scale
        transformFolder.addInput(this.materialProperties, 'uScale', {
            min: 0.1,
            max: 5.0,
            step: 0.01
        }).on('change', (ev) => {
            this.materialProperties.uScale = ev.value;
            this.applyMaterialChanges();
        });
        
        // V Scale
        transformFolder.addInput(this.materialProperties, 'vScale', {
            min: 0.1,
            max: 5.0,
            step: 0.01
        }).on('change', (ev) => {
            this.materialProperties.vScale = ev.value;
            this.applyMaterialChanges();
        });
        
        // W Rotation
        transformFolder.addInput(this.materialProperties, 'wRotation', {
            min: -180.0,
            max: 180.0,
            step: 1.0
        }).on('change', (ev) => {
            this.materialProperties.wRotation = ev.value;
            this.applyMaterialChanges();
        });
    }
    
    createNewMaterialControls() {
        this.createMaterialFolder = this.materialsFolder.addFolder({
            title: 'Create Material',
            expanded: false
        });
        
        // Name field
        this.createMaterialFolder.addInput(this.newMaterialData, 'name').on('change', (ev) => {
            this.newMaterialData.name = ev.value;
        });
        
        // Create button
        this.createMaterialFolder.addButton({
            title: 'Create'
        }).on('click', () => {
            this.createNewMaterial();
        });
    }
    
    createTargetFolder() {
        this.targetFolder = this.cameraFolder.addFolder({
            title: 'Target',
            expanded: false
        });
        
        // Target X
        this.targetFolder.addInput(this.targetData, 'x', {
            min: -10.0,
            max: 10.0,
            step: 0.01
        }).on('change', (ev) => {
            this.updateTargetX(ev.value);
        });
        
        // Target Y
        this.targetFolder.addInput(this.targetData, 'y', {
            min: -10.0,
            max: 10.0,
            step: 0.01
        }).on('change', (ev) => {
            this.updateTargetY(ev.value);
        });
        
        // Target Z
        this.targetFolder.addInput(this.targetData, 'z', {
            min: -10.0,
            max: 10.0,
            step: 0.01
        }).on('change', (ev) => {
            this.updateTargetZ(ev.value);
        });
    }
    
    createInspectorControls() {
        // Inspector toggle
        this.pane.addInput(this.inspectorToggle, 'showInspector').on('change', (ev) => {
            this.toggleInspector(ev.value);
        });
        
        // Refresh images
        this.pane.addButton({
            title: 'Refresh Images'
        }).on('click', () => {
            this.refreshImageList();
        });
    }
    
    // Material change handlers
    onMaterialSelectionChange(materialName) {
        this.materialList.selected = materialName;
        this.loadMaterialProperties(materialName);
        this.updateParentChildDisplay();
    }
    
    onParentChange(parentName) {
        if (this.materialsConfig.materials[this.materialList.selected]) {
            this.materialsConfig.materials[this.materialList.selected].parent = parentName;
            this.updateParentChildDisplay();
        }
    }
    
    loadMaterialProperties(materialName) {
        const material = this.materialsConfig.materials[materialName];
        if (!material) return;
        this.isLoading = true;
        
        // Load properties from material config
        // Convertir la couleur hexadécimale en RGB
        if (material.baseColor) {
            const hex = material.baseColor.replace('#', '');
            this.materialProperties.baseColor = {
                r: parseInt(hex.substr(0, 2), 16) / 255,
                g: parseInt(hex.substr(2, 2), 16) / 255,
                b: parseInt(hex.substr(4, 2), 16) / 255
            };
            // Mettre à jour l'affichage hexadécimal
            if (this.baseColorDisplay) {
                this.baseColorDisplay.hex = material.baseColor;
            }
        } else {
            this.materialProperties.baseColor = { r: 1, g: 1, b: 1 };
            if (this.baseColorDisplay) {
                this.baseColorDisplay.hex = '#ffffff';
            }
        }
        this.materialProperties.metallic = material.metallic !== undefined ? material.metallic : 0.0;
        this.materialProperties.roughness = material.roughness !== undefined ? material.roughness : 0.5;
        this.materialProperties.alpha = material.alpha !== undefined ? material.alpha : 1.0;
        this.materialProperties.albedoTexture = material.albedoTexture || 'None';
        this.materialProperties.metallicTexture = material.metallicTexture || 'None';
        this.materialProperties.microSurfaceTexture = material.microSurfaceTexture || 'None';
        this.materialProperties.ambientTexture = material.ambientTexture || 'None';
        this.materialProperties.opacityTexture = material.opacityTexture || 'None';
        this.materialProperties.bumpTexture = material.bumpTexture || 'None';
        this.materialProperties.bumpTextureIntensity = material.bumpTextureIntensity !== undefined ? material.bumpTextureIntensity : 1.0;
        this.materialProperties.lightmapTexture = material.lightmapTexture || 'None';
        this.materialProperties.useLightmapAsShadowmap = material.useLightmapAsShadowmap !== undefined ? material.useLightmapAsShadowmap : true;
        this.materialProperties.backFaceCulling = material.backFaceCulling !== undefined ? material.backFaceCulling : true;
        this.materialProperties.uOffset = material.uOffset !== undefined ? material.uOffset : 0.0;
        this.materialProperties.vOffset = material.vOffset !== undefined ? material.vOffset : 0.0;
        this.materialProperties.uScale = material.uScale !== undefined ? material.uScale : 1.0;
        this.materialProperties.vScale = material.vScale !== undefined ? material.vScale : 1.0;
        this.materialProperties.wRotation = material.wRotation !== undefined ? material.wRotation : 0.0;
        
        // Debug: Afficher les valeurs chargées
        console.log('📊 Propriétés chargées pour', materialName, ':', {
            baseColor: this.materialProperties.baseColor,
            metallic: this.materialProperties.metallic,
            roughness: this.materialProperties.roughness,
            alpha: this.materialProperties.alpha,
            albedoTexture: this.materialProperties.albedoTexture,
            metallicTexture: this.materialProperties.metallicTexture,
            microSurfaceTexture: this.materialProperties.microSurfaceTexture
        });
        
        // Les contrôles de texture se mettront à jour automatiquement
        
        // Forcer la mise à jour des contrôles Tweakpane
        if (this.pane) {
            this.pane.refresh();
        }
        this.isLoading = false;
    }
    
    updateRGBFromHex(hexValue) {
        // Convertir Hex vers RGB
        try {
            const hex = hexValue.replace('#', '');
            if (hex.length === 6) {
                const r = parseInt(hex.substr(0, 2), 16) / 255;
                const g = parseInt(hex.substr(2, 2), 16) / 255;
                const b = parseInt(hex.substr(4, 2), 16) / 255;
                this.materialProperties.baseColor = { r, g, b };
            }
        } catch (error) {
            console.warn('⚠️ Valeur hexadécimale invalide:', hexValue);
        }
    }
    
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
        // Tweakpane doesn't have the same styling options as datGUI
        // We'll implement a simpler approach for now
        console.log('Independent properties:', Array.from(this.independentProperties));
    }
    
    applyMaterialChanges() {
        if (this.isLoading) {
            return;
        }
        const currentMaterial = this.materialsConfig.materials[this.materialList.selected];
        if (!currentMaterial) return;
        
        // Si pas de parent, tout est indépendant par défaut
        const propertiesToSave = new Set(this.independentProperties);
        if (currentMaterial.parent === 'none') {
            Object.keys(this.materialProperties).forEach(name => propertiesToSave.add(name));
        }
        
        // Sauvegarder les propriétés
        propertiesToSave.forEach(propertyName => {
            if (propertyName === 'baseColor') {
                const r = Math.round(this.materialProperties.baseColor.r * 255);
                const g = Math.round(this.materialProperties.baseColor.g * 255);
                const b = Math.round(this.materialProperties.baseColor.b * 255);
                currentMaterial[propertyName] = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
            } else {
                currentMaterial[propertyName] = this.materialProperties[propertyName];
            }
        });
        
        // Remove inherited properties from material config
        if (currentMaterial.parent !== 'none') {
            const parentMaterial = this.materialsConfig.materials[currentMaterial.parent];
            Object.keys(this.materialProperties).forEach(propertyName => {
                if (!propertiesToSave.has(propertyName)) {
                    delete currentMaterial[propertyName];
                }
            });
        }
        
        // Apply changes to 3D scene
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
                                const color = new BABYLON.Color3(
                                    this.materialProperties.baseColor.r,
                                    this.materialProperties.baseColor.g,
                                    this.materialProperties.baseColor.b
                                );
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
                                mesh.material.bumpTextureIntensity = this.materialProperties.bumpTextureIntensity;
                            } else {
                                mesh.material.bumpTexture = null;
                            }
                            
                            if (this.materialProperties.lightmapTexture && this.materialProperties.lightmapTexture !== 'None') {
                                const texture = new BABYLON.Texture(`Textures/${this.materialProperties.lightmapTexture}`, scene);
                                mesh.material.lightmapTexture = texture;
                                mesh.material.useLightmapAsShadowmap = this.materialProperties.useLightmapAsShadowmap;
                            } else {
                                mesh.material.lightmapTexture = null;
                            }
                            
                            // Mettre à jour les propriétés de transformation de texture
                            if (this.materialProperties.uOffset !== undefined) {
                                if (mesh.material.albedoTexture) mesh.material.albedoTexture.uOffset = this.materialProperties.uOffset;
                                if (mesh.material.bumpTexture) mesh.material.bumpTexture.uOffset = this.materialProperties.uOffset;
                                if (mesh.material.metallicTexture) mesh.material.metallicTexture.uOffset = this.materialProperties.uOffset;
                                if (mesh.material.microSurfaceTexture) mesh.material.microSurfaceTexture.uOffset = this.materialProperties.uOffset;
                                if (mesh.material.ambientTexture) mesh.material.ambientTexture.uOffset = this.materialProperties.uOffset;
                                if (mesh.material.opacityTexture) mesh.material.opacityTexture.uOffset = this.materialProperties.uOffset;
                            }
                            
                            if (this.materialProperties.vOffset !== undefined) {
                                if (mesh.material.albedoTexture) mesh.material.albedoTexture.vOffset = this.materialProperties.vOffset;
                                if (mesh.material.bumpTexture) mesh.material.bumpTexture.vOffset = this.materialProperties.vOffset;
                                if (mesh.material.metallicTexture) mesh.material.metallicTexture.vOffset = this.materialProperties.vOffset;
                                if (mesh.material.microSurfaceTexture) mesh.material.microSurfaceTexture.vOffset = this.materialProperties.vOffset;
                                if (mesh.material.ambientTexture) mesh.material.ambientTexture.vOffset = this.materialProperties.vOffset;
                                if (mesh.material.opacityTexture) mesh.material.opacityTexture.vOffset = this.materialProperties.vOffset;
                            }
                            
                            if (this.materialProperties.uScale !== undefined) {
                                if (mesh.material.albedoTexture) mesh.material.albedoTexture.uScale = this.materialProperties.uScale;
                                if (mesh.material.bumpTexture) mesh.material.bumpTexture.uScale = this.materialProperties.uScale;
                                if (mesh.material.metallicTexture) mesh.material.metallicTexture.uScale = this.materialProperties.uScale;
                                if (mesh.material.microSurfaceTexture) mesh.material.microSurfaceTexture.uScale = this.materialProperties.uScale;
                                if (mesh.material.ambientTexture) mesh.material.ambientTexture.uScale = this.materialProperties.uScale;
                                if (mesh.material.opacityTexture) mesh.material.opacityTexture.uScale = this.materialProperties.uScale;
                            }
                            
                            if (this.materialProperties.vScale !== undefined) {
                                if (mesh.material.albedoTexture) mesh.material.albedoTexture.vScale = this.materialProperties.vScale;
                                if (mesh.material.bumpTexture) mesh.material.bumpTexture.vScale = this.materialProperties.vScale;
                                if (mesh.material.metallicTexture) mesh.material.metallicTexture.vScale = this.materialProperties.vScale;
                                if (mesh.material.microSurfaceTexture) mesh.material.microSurfaceTexture.vScale = this.materialProperties.vScale;
                                if (mesh.material.ambientTexture) mesh.material.ambientTexture.vScale = this.materialProperties.vScale;
                                if (mesh.material.opacityTexture) mesh.material.opacityTexture.vScale = this.materialProperties.vScale;
                            }
                            
                            if (this.materialProperties.wRotation !== undefined) {
                                const rotationRadians = BABYLON.Tools.ToRadians(this.materialProperties.wRotation);
                                if (mesh.material.albedoTexture) mesh.material.albedoTexture.wAng = rotationRadians;
                                if (mesh.material.bumpTexture) mesh.material.bumpTexture.wAng = rotationRadians;
                                if (mesh.material.metallicTexture) mesh.material.metallicTexture.wAng = rotationRadians;
                                if (mesh.material.microSurfaceTexture) mesh.material.microSurfaceTexture.wAng = rotationRadians;
                                if (mesh.material.ambientTexture) mesh.material.ambientTexture.wAng = rotationRadians;
                                if (mesh.material.opacityTexture) mesh.material.opacityTexture.wAng = rotationRadians;
                            }
                            
                            // Marquer le matériau comme modifié
                            mesh.material.markAsDirty(BABYLON.Material.TextureDirtyFlag);
                        }
                    }
                });
            }
            
            console.log(`✅ ${updatedCount} matériaux mis à jour pour ${selectedMaterial}`);
        } else {
            console.warn('⚠️ Aucune configuration de matériaux active trouvée');
        }
    }
    
    createNewMaterial() {
        const materialName = this.newMaterialData.name.trim();
        if (!materialName) return;
        
        // Create new material with default parent
        this.materialsConfig.materials[materialName] = {
            type: 'pbr',
            parent: 'none',
            baseColor: '#ffffff',
            metallic: 0,
            roughness: 0.5,
            alpha: 1
        };
        
        // Update material list
        this.updateMaterialList();
        this.resetCreateMaterialForm();
    }
    
    updateMaterialList() {
        const options = Object.keys(this.materialsConfig.materials).reduce((acc, key) => {
            acc[key] = key;
            return acc;
        }, {});
        
        this.materialSelectControl.dispose();
        this.materialSelectControl = this.materialsFolder.addInput(this.materialList, 'selected', {
            options: options
        }).on('change', (ev) => {
            this.onMaterialSelectionChange(ev.value);
        });
    }
    
    resetCreateMaterialForm() {
        this.newMaterialData.name = '';
    }
    
    // Camera update methods
    updateCameraAlpha(value) {
        if (this.scene && this.scene.activeCamera) {
            this.scene.activeCamera.alpha = value;
        }
    }
    
    updateCameraBeta(value) {
        if (this.scene && this.scene.activeCamera) {
            this.scene.activeCamera.beta = value;
        }
    }
    
    updateCameraRadius(value) {
        if (this.scene && this.scene.activeCamera) {
            this.scene.activeCamera.radius = value;
        }
    }
    
    updateCameraFOV(value) {
        if (this.scene && this.scene.activeCamera) {
            this.scene.activeCamera.fov = value;
        }
    }
    
    updateCameraMinDistance(value) {
        if (this.scene && this.scene.activeCamera) {
            this.scene.activeCamera.minZ = value;
        }
    }
    
    updateCameraMaxDistance(value) {
        if (this.scene && this.scene.activeCamera) {
            this.scene.activeCamera.maxZ = value;
        }
    }
    
    updateCameraHorizontalSensitivity(value) {
        // This will be used by the custom camera controls in scene.js
        window.cameraHorizontalSensitivity = value;
    }
    
    // Target update methods
    updateTargetX(value) {
        if (this.scene && this.scene.activeCamera) {
            this.scene.activeCamera.target.x = value;
        }
    }
    
    updateTargetY(value) {
        if (this.scene && this.scene.activeCamera) {
            this.scene.activeCamera.target.y = value;
        }
    }
    
    updateTargetZ(value) {
        if (this.scene && this.scene.activeCamera) {
            this.scene.activeCamera.target.z = value;
        }
    }
    
    // Environment update methods
    updateHDRTexture(textureName) {
        if (textureName === 'None') {
            if (this.scene && this.scene.environmentTexture) {
                this.scene.environmentTexture.dispose();
                this.scene.environmentTexture = null;
            }
        } else {
            // Load HDR texture
            const hdrTexture = new BABYLON.CubeTexture.CreateFromPrefilteredData(`Textures/HDR/${textureName}`, this.scene);
            this.scene.environmentTexture = hdrTexture;
        }
    }
    
    updateHDROrientation(value) {
        if (this.scene && this.scene.environmentTexture) {
            this.scene.environmentTexture.rotationY = value;
        }
    }
    
    updateHDRExposure(value) {
        if (this.scene && this.scene.environmentTexture) {
            this.scene.environmentTexture.level = value;
        }
    }
    
    // Utility methods
    async getAvailableImages() {
        try {
            const response = await fetch('http://localhost:8080/api/textures');
            if (response.ok) {
                const data = await response.json();
                const images = {};
                // S'assurer que "None" est toujours en premier
                images['None'] = 'None';
                data.images.forEach(imageName => {
                    if (imageName !== 'None') {
                        images[imageName] = imageName;
                    }
                });
                return images;
            } else {
                console.warn('⚠️ Impossible de charger la liste des textures, utilisation de la liste par défaut');
                return this.getDefaultImages();
            }
        } catch (error) {
            console.warn('⚠️ Erreur lors du chargement des textures:', error);
            return this.getDefaultImages();
        }
    }
    
    getDefaultImages() {
        // Liste de fallback en cas d'erreur
        return {
            'None': 'None',
            'color_grid.png': 'color_grid.png',
            'filament_albedo.png': 'filament_albedo.png',
            'filament_nm.png': 'filament_nm.png',
            'alpha.png': 'alpha.png',
            'RGB.png': 'RGB.png'
        };
    }
    
    toggleInspector(show) {
        if (show && this.scene) {
            this.scene.debugLayer.show();
        } else if (this.scene) {
            this.scene.debugLayer.hide();
        }
    }
    
    refreshImageList() {
        // Refresh the image list in texture controls
        console.log('Refreshing image list...');
    }
    
    setTweakpaneVisibility(visible) {
        if (this.pane) {
            this.pane.element.style.display = visible ? 'block' : 'none';
        }
    }
    
    async exportMaterial() {
        try {
            console.log('🔄 Starting material export...');
            
            // Sauvegarder les modifications actuelles avant l'export
            this.applyMaterialChanges();
            
            // Préparer les données à exporter
            const exportData = {
                materials: this.materialsConfig.materials
            };
            
            console.log('📤 Sending data to server:', exportData);
            
            // Envoyer les données au serveur PowerShell
            const response = await fetch('http://localhost:8080/materials.json', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                // Pretty-print pour un materials.json structuré
                body: JSON.stringify(exportData, null, 2)
            });
            
            console.log('📡 Server response status:', response.status);
            
            if (response.ok) {
                const responseText = await response.text();
                console.log('✅ Material exported successfully:', responseText);
            } else {
                const errorText = await response.text();
                console.error('❌ Server error:', errorText);
            }
            
        } catch (error) {
            console.error('❌ Error exporting material:', error);
            console.error('❌ Error details:', error.message);
        }
    }
    
    dispose() {
        if (this.pane) {
            this.pane.dispose();
        }
    }
}
