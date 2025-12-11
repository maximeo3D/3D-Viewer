// tweakpaneManager.js - Gestion complète de l'interface utilisateur Tweakpane

class TweakpaneManager {
    constructor(scene, materialsConfig, config) {
        this.scene = scene;
        this.materialsConfig = materialsConfig;
        this.config = config;
        
        // Paramètre pour contrôler l'état d'ouverture par défaut de Tweakpane
        this.tweakpaneOpenByDefault = true; // Changez true/false pour ouvrir/fermer Tweakpane par défaut
        // Paramètre pour contrôler la visibilité initiale (évite le clignotement)
        this.initialVisibility = true;
        
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
        this.materialParentData = { parent: 'none' };
        
        // Système de logique parent-enfant
        this.independentProperties = new Set();
        this.materialControls = new Map();
        this.labelClickHandlers = new Map();
        
        // Variables pour la création de matériaux
        this.createMaterialFolder = null;
        this.newMaterialData = { name: '' };

        // Variables pour la création de viewpoints
        this.createViewpointFolder = null;
        this.newViewpointData = { name: '' };
        this.cameraViewpointSelectControl = null;
        this.cameraHeaderFolder = null;
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
            lightmapUVSet: 0,
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
            alpha: 0.0, // degrees in UI
            radius: 10.0,
            fov: 0.8,
            minDistance: 1.0,
            maxDistance: 100.0
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

        // Viewpoints (studio.json)
        this.viewpoints = {};
        this.selectedViewpoint = 'Viewpoint1';

        // Helper pour normaliser les angles en degrés [0,360)
        this.normalizeDeg360 = (deg) => {
            let d = deg % 360;
            if (d < 0) d += 360;
            return d;
        };
    }
    
    async init() {
        await this.loadMaterialsConfig();
        await this.loadStudioViewpoints();
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
            } else {
                console.warn('⚠️ Impossible de charger materials.json, utilisation de la configuration par défaut');
            }
        } catch (error) {
            console.warn('⚠️ Erreur lors du chargement de materials.json:', error);
        }
    }
    
    // Charger les viewpoints depuis studio.json
    async loadStudioViewpoints() {
        try {
            const res = await fetch('studio.json');
            if (res.ok) {
                const studio = await res.json();
                this.viewpoints = (studio && studio.viewpoints) ? studio.viewpoints : {};
                const keys = Object.keys(this.viewpoints);
                if (keys.length > 0 && !keys.includes(this.selectedViewpoint)) {
                    this.selectedViewpoint = keys[0];
                }
                return;
            }
        } catch (e) {
            console.warn('⚠️ Erreur lors du chargement des viewpoints:', e);
        }
        this.viewpoints = {};
    }
    
    createGUI() {
        // Créer le panneau principal Tweakpane (API v3)
        this.pane = new Tweakpane.Pane({
            title: '3D Viewer Controls',
            expanded: this.tweakpaneOpenByDefault
        });
        
        // Positionner le panneau
        this.pane.element.style.position = 'fixed';
        this.pane.element.style.top = '10px';
        this.pane.element.style.right = '10px';
        this.pane.element.style.zIndex = '1000';
        this.pane.element.style.width = '300px';
        if (!this.initialVisibility) {
            // Masquer immédiatement pour éviter tout flash
            this.pane.element.style.display = 'none';
        }
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
            expanded: true
        });
        
        // Create Viewpoint (en haut du menu Camera)
        this.createViewpointFolder = this.cameraFolder.addFolder({ title: 'Create Viewpoint', expanded: true });
        this.newViewpointData = this.newViewpointData || { name: '' };
        this.createViewpointFolder.addInput(this.newViewpointData, 'name', { label: 'Name' });
        this.createViewpointFolder.addButton({ title: 'Export Viewpoint' }).on('click', async () => {
            const name = (this.newViewpointData.name || '').trim();
            if (!name) return;
            try {
                const res = await fetch('studio.json');
                if (!res.ok) throw new Error('Failed to read studio.json');
                const studio = await res.json();
                if (!studio.viewpoints) studio.viewpoints = {};
                const cam = this.scene?.activeCamera;
                if (!cam) throw new Error('No active camera');
                const fovDeg = cam.fov > 2 ? cam.fov : BABYLON.Tools.ToDegrees(cam.fov);
                studio.viewpoints[name] = {
                    alpha: cam.alpha,
                    beta: cam.beta,
                    radius: cam.radius,
                    fov: Math.round(fovDeg * 100) / 100,
                    minDistance: cam.lowerRadiusLimit ?? 0,
                    maxDistance: cam.upperRadiusLimit ?? 1000,
                    targetX: cam.target?.x ?? 0,
                    targetY: cam.target?.y ?? 0,
                    targetZ: cam.target?.z ?? 0
                };
                const resp = await fetch('studio.json', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(studio, null, 2)
                });
                if (!resp.ok) {
                    const txt = await resp.text();
                    console.error('Export studio.json failed:', txt);
                } else {
                    // Mettre à jour la liste des viewpoints en mémoire et dans le dropdown
                    this.viewpoints[name] = studio.viewpoints[name];
                    // Mettre à jour le sélecteur s'il existe
                    try {
                        const vpKeys = Object.keys(this.viewpoints || {});
                        if (vpKeys.length > 0) {
                            const vpOptions = vpKeys.reduce((acc, k) => { acc[k] = k; return acc; }, {});
                            if (!this.cameraViewpointSelectControl) {
                                this.cameraViewpointSelectControl = this.cameraHeaderFolder.addInput(this, 'selectedViewpoint', {
                                    options: vpOptions,
                                    label: 'Viewpoint'
                                }).on('change', (ev) => {
                                    this.selectedViewpoint = ev.value;
                                    if (window.gotoViewpoint) window.gotoViewpoint(this.selectedViewpoint);
                                });
                            } else {
                                // Remplacer les options du contrôle existant sans le déplacer de dossier
                                this.cameraViewpointSelectControl.dispose();
                                this.cameraViewpointSelectControl = this.cameraHeaderFolder.addInput(this, 'selectedViewpoint', {
                                    options: vpOptions,
                                    label: 'Viewpoint'
                                }).on('change', (ev) => {
                                    this.selectedViewpoint = ev.value;
                                    if (window.gotoViewpoint) window.gotoViewpoint(this.selectedViewpoint);
                                });
                            }
                            this.selectedViewpoint = name;
                            try { this.pane.refresh(); } catch(_) {}
                        }
                    } catch(_) {}
                }
            } catch (err) {
                console.error('Export Viewpoint error:', err);
            }
        });
        
        // Créer un sous-dossier fixe pour le sélecteur de viewpoints (reste sous "Create Viewpoint")
        this.cameraHeaderFolder = this.cameraFolder.addFolder({ title: 'Viewpoints', expanded: true });

        // Viewpoint selector
        const vpKeys = Object.keys(this.viewpoints || {});
        if (vpKeys.length > 0) {
            const vpOptions = vpKeys.reduce((acc, k) => { acc[k] = k; return acc; }, {});
            this.cameraViewpointSelectControl = this.cameraHeaderFolder.addInput(this, 'selectedViewpoint', {
                options: vpOptions,
                label: 'Viewpoint'
            }).on('change', (ev) => {
                this.selectedViewpoint = ev.value;
                if (window.gotoViewpoint) window.gotoViewpoint(this.selectedViewpoint);
            });
        }
        
        // Alpha (Yaw) en degrés [0, 360]
        this.cameraFolder.addInput(this.cameraData, 'alpha', {
            min: 0,
            max: 360,
            step: 0.1
        }).on('change', (ev) => {
            // Bouclage 0..360 puis conversion degrés → radians
            const deg = this.normalizeDeg360(ev.value);
            if (Math.abs(deg - this.cameraData.alpha) > 1e-4) {
                this.cameraData.alpha = deg;
                if (this.pane) { try { this.pane.refresh(); } catch(_) {} }
            }
            const radians = BABYLON.Tools.ToRadians(deg);
            this.updateCameraAlpha(radians);
        });
        
        // Distance (ex-radius)
        this.cameraFolder.addInput(this.cameraData, 'radius', {
            min: 1.0,
            max: 100.0,
            step: 0.1,
            label: 'Distance'
        }).on('change', (ev) => {
            this.updateCameraRadius(ev.value);
        });
        
        // Field of View (degrees 20–120)
        this.cameraFolder.addInput(this.cameraData, 'fov', {
            min: 10,
            max: 120,
            step: 0.1,
            label: 'fov (deg)'
        }).on('change', (ev) => {
            // Convert degrees → radians for camera
            const radians = BABYLON.Tools.ToRadians(ev.value);
            this.updateCameraFOV(radians);
        });
        
        // Min Distance
        this.cameraFolder.addInput(this.cameraData, 'minDistance', {
            min: 0.1,
            max: 100.0,
            step: 0.1
        }).on('change', (ev) => {
            this.updateCameraMinDistance(ev.value);
        });
        
        // Max Distance
        this.cameraFolder.addInput(this.cameraData, 'maxDistance', {
            min: 1.0,
            max: 100.0,
            step: 0.1
        }).on('change', (ev) => {
            this.updateCameraMaxDistance(ev.value);
        });
        
        // Sync live from scene
        if (this.scene && this.scene.onBeforeRenderObservable) {
            this.scene.onBeforeRenderObservable.add(() => {
                if (!this.scene.activeCamera) return;
                const cam = this.scene.activeCamera;
                // Pull values from camera
                const nextAlpha = this.normalizeDeg360(BABYLON.Tools.ToDegrees(cam.alpha));
                const nextRadius = cam.radius;
                const nextFov = BABYLON.Tools.ToDegrees(cam.fov);
                const nextMin = cam.lowerRadiusLimit ?? this.cameraData.minDistance;
                const nextMax = cam.upperRadiusLimit ?? this.cameraData.maxDistance;
                let changed = false;
                if (Math.abs(this.cameraData.alpha - nextAlpha) > 1e-2) { this.cameraData.alpha = nextAlpha; changed = true; }
                if (Math.abs(this.cameraData.radius - nextRadius) > 1e-3) { this.cameraData.radius = nextRadius; changed = true; }
                if (Math.abs(this.cameraData.fov - nextFov) > 1e-2) { this.cameraData.fov = nextFov; changed = true; }
                if (Math.abs(this.cameraData.minDistance - nextMin) > 1e-4) { this.cameraData.minDistance = nextMin; changed = true; }
                if (Math.abs(this.cameraData.maxDistance - nextMax) > 1e-4) { this.cameraData.maxDistance = nextMax; changed = true; }
                if (changed && this.pane) {
                    // Light refresh to reflect camera values
                    try { this.pane.refresh(); } catch(_) {}
                }
            });
        }
        
        // Export camera params button
        this.cameraFolder.addButton({ title: 'Export Camera Params' }).on('click', async () => {
            try {
                const res = await fetch('studio.json');
                if (!res.ok) throw new Error('Failed to read studio.json');
                const studio = await res.json();
                if (!studio.viewpoints) studio.viewpoints = {};
                const cam = this.scene?.activeCamera;
                if (!cam) throw new Error('No active camera');
                const vpName = this.selectedViewpoint || 'Viewpoint1';
                const fovDeg = cam.fov > 2 ? cam.fov : BABYLON.Tools.ToDegrees(cam.fov);
                studio.viewpoints[vpName] = {
                    alpha: cam.alpha,
                    beta: cam.beta,
                    radius: cam.radius,
                    fov: Math.round(fovDeg * 100) / 100,
                    minDistance: cam.lowerRadiusLimit ?? 0,
                    maxDistance: cam.upperRadiusLimit ?? 1000,
                    targetX: cam.target?.x ?? 0,
                    targetY: cam.target?.y ?? 0,
                    targetZ: cam.target?.z ?? 0
                };
                const resp = await fetch('studio.json', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(studio, null, 2)
                });
                if (!resp.ok) {
                    const txt = await resp.text();
                    console.error('Export studio.json failed:', txt);
                }
            } catch (err) {
                console.error('Export Camera Params error:', err);
            }
        });
        
        // Target controls (sous-menu de Camera)
        this.createTargetFolder();

        // Si viewpoint changé, refléter les valeurs dans UI sans attendre la sync
        if (Object.keys(this.viewpoints || {}).length > 0) {
            const vp = this.viewpoints[this.selectedViewpoint];
            if (vp) {
                this.cameraData.alpha = BABYLON.Tools.ToDegrees(vp.alpha ?? this.scene?.activeCamera?.alpha ?? 0);
                this.cameraData.radius = vp.radius ?? this.scene?.activeCamera?.radius ?? this.cameraData.radius;
                this.cameraData.fov = (vp.fov && vp.fov > 2) ? BABYLON.Tools.ToRadians(vp.fov) : (vp.fov ?? this.scene?.activeCamera?.fov ?? this.cameraData.fov);
                if (this.pane) {
                    try { this.pane.refresh(); } catch(_) {}
                }
            }
        }
    }
    
    async createMaterialsFolder() {
        this.materialsFolder = this.pane.addFolder({
            title: 'Materials',
            expanded: false
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
        this.materialParentData.parent = currentParent;
        this.materialParentControl = this.materialsFolder.addInput(this.materialParentData, 'parent', {
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
        const baseColorCtrl = this.materialsFolder.addInput(this.baseColorDisplay, 'hex', {
            label: 'Base Color'
        }).on('change', (ev) => {
            this.updateRGBFromHex(ev.value);
            // Marquer la propriété comme indépendante pour la sauvegarde/export
            this.independentProperties.add('baseColor');
            this.applyMaterialChanges();
        });
        this.materialControls.set('baseColor', baseColorCtrl);
        
        // Metallic
        const metallicCtrl = this.materialsFolder.addInput(this.materialProperties, 'metallic', {
            min: 0.0,
            max: 1.0,
            step: 0.01
        }).on('change', (ev) => {
            this.materialProperties.metallic = ev.value;
            this.independentProperties.add('metallic');
            this.applyMaterialChanges();
        });
        this.materialControls.set('metallic', metallicCtrl);
        
        // Roughness
        const roughnessCtrl = this.materialsFolder.addInput(this.materialProperties, 'roughness', {
            min: 0.0,
            max: 1.0,
            step: 0.01
        }).on('change', (ev) => {
            this.materialProperties.roughness = ev.value;
            this.independentProperties.add('roughness');
            this.applyMaterialChanges();
        });
        this.materialControls.set('roughness', roughnessCtrl);
        
        // Alpha
        const alphaCtrl = this.materialsFolder.addInput(this.materialProperties, 'alpha', {
            min: 0.0,
            max: 1.0,
            step: 0.01
        }).on('change', (ev) => {
            this.materialProperties.alpha = ev.value;
            this.independentProperties.add('alpha');
            this.applyMaterialChanges();
        });
        this.materialControls.set('alpha', alphaCtrl);
        
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
            this.independentProperties.add('albedoTexture');
            this.applyMaterialChanges();
        }));
        
        // Metallic Texture
        this.materialControls.set('metallicTexture', textureFolder.addInput(this.materialProperties, 'metallicTexture', {
            options: availableImages
        }).on('change', (ev) => {
            this.materialProperties.metallicTexture = ev.value;
            this.independentProperties.add('metallicTexture');
            this.applyMaterialChanges();
        }));
        
        // Micro Surface Texture
        this.materialControls.set('microSurfaceTexture', textureFolder.addInput(this.materialProperties, 'microSurfaceTexture', {
            options: availableImages
        }).on('change', (ev) => {
            this.materialProperties.microSurfaceTexture = ev.value;
            this.independentProperties.add('microSurfaceTexture');
            this.applyMaterialChanges();
        }));
        
        // Ambient Texture
        this.materialControls.set('ambientTexture', textureFolder.addInput(this.materialProperties, 'ambientTexture', {
            options: availableImages
        }).on('change', (ev) => {
            this.materialProperties.ambientTexture = ev.value;
            this.independentProperties.add('ambientTexture');
            this.applyMaterialChanges();
        }));
        
        // Opacity Texture
        this.materialControls.set('opacityTexture', textureFolder.addInput(this.materialProperties, 'opacityTexture', {
            options: availableImages
        }).on('change', (ev) => {
            this.materialProperties.opacityTexture = ev.value;
            this.independentProperties.add('opacityTexture');
            this.applyMaterialChanges();
        }));
        
        // Bump Texture
        this.materialControls.set('bumpTexture', textureFolder.addInput(this.materialProperties, 'bumpTexture', {
            options: availableImages
        }).on('change', (ev) => {
            this.materialProperties.bumpTexture = ev.value;
            this.independentProperties.add('bumpTexture');
            this.applyMaterialChanges();
        }));
        
        // Bump Texture Intensity
        const bumpIntensityCtrl = textureFolder.addInput(this.materialProperties, 'bumpTextureIntensity', {
            min: 0.0,
            max: 10.0,
            step: 0.1
        }).on('change', (ev) => {
            this.materialProperties.bumpTextureIntensity = ev.value;
            this.independentProperties.add('bumpTextureIntensity');
            this.applyMaterialChanges();
        });
        this.materialControls.set('bumpTextureIntensity', bumpIntensityCtrl);
        
        // Lightmap Texture
        this.materialControls.set('lightmapTexture', textureFolder.addInput(this.materialProperties, 'lightmapTexture', {
            options: availableImages
        }).on('change', (ev) => {
            this.materialProperties.lightmapTexture = ev.value;
            this.independentProperties.add('lightmapTexture');
            this.applyMaterialChanges();
        }));
        // Lightmap UV Set (UV0 / UV1)
        this.materialControls.set('lightmapUVSet', textureFolder.addInput(this.materialProperties, 'lightmapUVSet', {
            options: { 'UV0': 0, 'UV1': 1 }
        }).on('change', (ev) => {
            this.materialProperties.lightmapUVSet = ev.value;
            this.independentProperties.add('lightmapUVSet');
            this.applyMaterialChanges();
        }));
        
        // Use Lightmap as Shadowmap (toujours true par défaut, pas de contrôle UI)
        
        // Back Face Culling
        const bfcCtrl = textureFolder.addInput(this.materialProperties, 'backFaceCulling').on('change', (ev) => {
            this.materialProperties.backFaceCulling = ev.value;
            this.independentProperties.add('backFaceCulling');
            this.applyMaterialChanges();
        });
        this.materialControls.set('backFaceCulling', bfcCtrl);
        
    }
    
    createTextureTransformationControls() {
        const transformFolder = this.materialsFolder.addFolder({
            title: 'Texture Transform',
            expanded: false
        });
        
        // U Offset
        const uOffsetCtrl = transformFolder.addInput(this.materialProperties, 'uOffset', {
            min: -2.0,
            max: 2.0,
            step: 0.01
        }).on('change', (ev) => {
            this.materialProperties.uOffset = ev.value;
            this.independentProperties.add('uOffset');
            this.applyMaterialChanges();
        });
        this.materialControls.set('uOffset', uOffsetCtrl);
        
        // V Offset
        const vOffsetCtrl = transformFolder.addInput(this.materialProperties, 'vOffset', {
            min: -2.0,
            max: 2.0,
            step: 0.01
        }).on('change', (ev) => {
            this.materialProperties.vOffset = ev.value;
            this.independentProperties.add('vOffset');
            this.applyMaterialChanges();
        });
        this.materialControls.set('vOffset', vOffsetCtrl);
        
        // U Scale
        const uScaleCtrl = transformFolder.addInput(this.materialProperties, 'uScale', {
            min: 0,
            max: 20.0,
            step: 0.01
        }).on('change', (ev) => {
            this.materialProperties.uScale = ev.value;
            this.independentProperties.add('uScale');
            this.applyMaterialChanges();
        });
        this.materialControls.set('uScale', uScaleCtrl);
        
        // V Scale
        const vScaleCtrl = transformFolder.addInput(this.materialProperties, 'vScale', {
            min: 0,
            max: 20.0,
            step: 0.01
        }).on('change', (ev) => {
            this.materialProperties.vScale = ev.value;
            this.independentProperties.add('vScale');
            this.applyMaterialChanges();
        });
        this.materialControls.set('vScale', vScaleCtrl);
        
        // W Rotation
        const wRotationCtrl = transformFolder.addInput(this.materialProperties, 'wRotation', {
            min: 0.0,
            max: 360.0,
            step: 1.0
        }).on('change', (ev) => {
            this.materialProperties.wRotation = ev.value;
            this.independentProperties.add('wRotation');
            this.applyMaterialChanges();
        });
        this.materialControls.set('wRotation', wRotationCtrl);
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

        // Sync live target from active camera
        if (this.scene && this.scene.onBeforeRenderObservable) {
            this.scene.onBeforeRenderObservable.add(() => {
                const cam = this.scene?.activeCamera;
                if (!cam) return;
                const tx = cam.target?.x ?? 0;
                const ty = cam.target?.y ?? 0;
                const tz = cam.target?.z ?? 0;
                let changed = false;
                if (Math.abs(this.targetData.x - tx) > 1e-3) { this.targetData.x = tx; changed = true; }
                if (Math.abs(this.targetData.y - ty) > 1e-3) { this.targetData.y = ty; changed = true; }
                if (Math.abs(this.targetData.z - tz) > 1e-3) { this.targetData.z = tz; changed = true; }
                if (changed && this.pane) {
                    try { this.pane.refresh(); } catch(_) {}
                }
            });
        }
    }
    
    createInspectorControls() {
        // Inspector toggle
        this.pane.addInput(this.inspectorToggle, 'showInspector').on('change', (ev) => {
            this.toggleInspector(ev.value);
        });
    }
    
    // Material change handlers
    onMaterialSelectionChange(materialName) {
        this.materialList.selected = materialName;
        this.loadMaterialProperties(materialName);
        this.updateParentChildDisplay();
        // Synchroniser le sélecteur de parent avec la config
        const parent = this.materialsConfig.materials[materialName]?.parent || 'none';
        this.materialParentData.parent = parent;
        if (this.pane) this.pane.refresh();
    }
    
    onParentChange(parentName) {
        if (this.materialsConfig.materials[this.materialList.selected]) {
            this.materialsConfig.materials[this.materialList.selected].parent = parentName;
            // Mettre à jour l'état local pour garder l'UI en phase
            this.materialParentData.parent = parentName;
            this.updateParentChildDisplay();
            if (this.pane) this.pane.refresh();
        }
    }
    
    loadMaterialProperties(materialName) {
        const material = this.materialsConfig.materials[materialName];
        if (!material) return;
        this.isLoading = true;
        
        // Déterminer la source effective (enfant -> parent -> défaut)
        const parentName = material.parent || 'none';
        const parent = parentName !== 'none' ? this.materialsConfig.materials[parentName] : null;

        const getEffective = (prop, defVal) => {
            if (material[prop] !== undefined && material[prop] !== null) return material[prop];
            if (parent && parent[prop] !== undefined && parent[prop] !== null) return parent[prop];
            return defVal;
        };

        // baseColor (hex → RGB pour l'affichage interne)
        const effBaseColor = getEffective('baseColor', '#ffffff');
        {
            const hex = effBaseColor.replace('#', '');
            this.materialProperties.baseColor = {
                r: parseInt(hex.substr(0, 2), 16) / 255,
                g: parseInt(hex.substr(2, 2), 16) / 255,
                b: parseInt(hex.substr(4, 2), 16) / 255
            };
            if (this.baseColorDisplay) this.baseColorDisplay.hex = effBaseColor;
        }

        this.materialProperties.metallic = getEffective('metallic', 0.0);
        this.materialProperties.roughness = getEffective('roughness', 0.5);
        this.materialProperties.alpha = getEffective('alpha', 1.0);
        this.materialProperties.albedoTexture = getEffective('albedoTexture', 'None') || 'None';
        this.materialProperties.metallicTexture = getEffective('metallicTexture', 'None') || 'None';
        this.materialProperties.microSurfaceTexture = getEffective('microSurfaceTexture', 'None') || 'None';
        this.materialProperties.ambientTexture = getEffective('ambientTexture', 'None') || 'None';
        this.materialProperties.opacityTexture = getEffective('opacityTexture', 'None') || 'None';
        this.materialProperties.bumpTexture = getEffective('bumpTexture', 'None') || 'None';
        this.materialProperties.bumpTextureIntensity = getEffective('bumpTextureIntensity', 1.0);
        this.materialProperties.lightmapTexture = getEffective('lightmapTexture', 'None') || 'None';
        this.materialProperties.useLightmapAsShadowmap = getEffective('useLightmapAsShadowmap', true);
        this.materialProperties.lightmapUVSet = getEffective('lightmapUVSet', 0);
        this.materialProperties.backFaceCulling = getEffective('backFaceCulling', true);
        this.materialProperties.uOffset = getEffective('uOffset', 0.0);
        this.materialProperties.vOffset = getEffective('vOffset', 0.0);
        this.materialProperties.uScale = getEffective('uScale', 1.0);
        this.materialProperties.vScale = getEffective('vScale', 1.0);
        this.materialProperties.wRotation = getEffective('wRotation', 0.0);
                
        // Recalculer héritage et apparence (parent/enfant)
        this.updateParentChildDisplay();

        // Forcer la mise à jour des contrôles Tweakpane
        if (this.pane) {
            this.pane.refresh();
        }
        this.isLoading = false;
    }

    getDefaultValue(propertyName) {
        switch (propertyName) {
            case 'baseColor': return '#ffffff';
            case 'metallic': return 0.0;
            case 'roughness': return 0.5;
            case 'alpha': return 1.0;
            case 'albedoTexture':
            case 'metallicTexture':
            case 'microSurfaceTexture':
            case 'ambientTexture':
            case 'opacityTexture':
            case 'bumpTexture':
            case 'lightmapTexture': return 'None';
            case 'bumpTextureIntensity': return 1.0;
            case 'useLightmapAsShadowmap': return true;
            case 'lightmapUVSet': return 0;
            case 'backFaceCulling': return true;
            case 'uOffset':
            case 'vOffset': return 0.0;
            case 'uScale':
            case 'vScale': return 1.0;
            case 'wRotation': return 0.0;
            default: return undefined;
        }
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
        // Recalculer les propriétés indépendantes par rapport au parent
        this.independentProperties.clear();
        const selected = this.materialList.selected;
        const currentMaterial = this.materialsConfig.materials[selected];
        if (!currentMaterial) return;
        const parentName = currentMaterial.parent || 'none';
        const parentMaterial = parentName !== 'none' ? this.materialsConfig.materials[parentName] : null;

        if (parentMaterial) {
            Object.keys(this.materialProperties).forEach((propertyName) => {
                const hasOwn = currentMaterial[propertyName] !== undefined;
                const ownVal = currentMaterial[propertyName];
                const parentVal = parentMaterial[propertyName];
                const differs = JSON.stringify(ownVal) !== JSON.stringify(parentVal);
                if (hasOwn && differs) {
                    this.independentProperties.add(propertyName);
                }
            });
        } else {
            // Sans parent, tout est indépendant
            Object.keys(this.materialProperties).forEach((propertyName) => this.independentProperties.add(propertyName));
        }

        this.updateControlsAppearance();
    }

    updateControlsAppearance() {
        // Appliquer un style visuel aux contrôles hérités vs indépendants
        this.materialControls.forEach((control, propertyName) => {
            const el = control?.element || control?.controller_?.view?.element || null;
            if (!el) return;
            const labelEl = el.querySelector('.tp-lblv_l') || el.querySelector('[class*="tp-lblv_"]');
            const rowEl = el; // le container du contrôle
            const isIndependent = this.independentProperties.has(propertyName);

            // Grisage des valeurs héritées
            rowEl.style.opacity = isIndependent ? '1' : '0.5';
            // Désactiver les interactions si hérité
            const inputEl = el.querySelector('input, select, textarea, .tp-rotv, .tp-cp-') || null;
            if (!isIndependent) {
                // Empêcher l'édition directe quand hérité
                rowEl.classList.add('inherited');
                if (inputEl) {
                    inputEl.setAttribute('disabled', 'true');
                }
            } else {
                rowEl.classList.remove('inherited');
                if (inputEl) {
                    inputEl.removeAttribute('disabled');
                }
            }

            // Cursor + title sur le label pour indiquer le toggle
            if (labelEl) {
                labelEl.style.cursor = 'pointer';
                labelEl.title = isIndependent ? 'Cliquer pour hériter du parent' : 'Cliquer pour rendre indépendant';

                // Détacher tout ancien listener enregistré
                const key = `${propertyName}`;
                const oldHandler = this.labelClickHandlers.get(key);
                if (oldHandler) {
                    labelEl.removeEventListener('click', oldHandler);
                }

                // Attacher un unique listener et stocker sa référence
                const handler = () => {
                    // Debounce léger pour éviter le spam
                    if (this._toggleInProgress) return;
                    this._toggleInProgress = true;
                    try {
                        this.togglePropertyIndependence(propertyName);
                    } finally {
                        // Micro-délai pour laisser l'UI se rafraîchir
                        setTimeout(() => { this._toggleInProgress = false; }, 0);
                    }
                };
                labelEl.addEventListener('click', handler);
                this.labelClickHandlers.set(key, handler);
            }
        });
    }

    togglePropertyIndependence(propertyName) {
        const selected = this.materialList.selected;
        const currentMaterial = this.materialsConfig.materials[selected];
        if (!currentMaterial) return;
        const parentName = currentMaterial.parent || 'none';
        const parentMaterial = parentName !== 'none' ? this.materialsConfig.materials[parentName] : null;

        // Si pas de parent, rien à hériter, c'est toujours indépendant
        if (!parentMaterial) {
            this.independentProperties.add(propertyName);
            this.applyMaterialChanges();
            this.updateControlsAppearance();
            return;
        }

        if (this.independentProperties.has(propertyName)) {
            // Rendre hérité: supprimer la valeur propre et reprendre celle du parent
            delete currentMaterial[propertyName];
            this.independentProperties.delete(propertyName);

            // Mettre à jour l'état affiché à partir du parent
            const parentVal = parentMaterial[propertyName];
            if (propertyName === 'baseColor' && typeof parentVal === 'string') {
                this.baseColorDisplay.hex = parentVal || '#ffffff';
                this.updateRGBFromHex(this.baseColorDisplay.hex);
            } else {
                this.materialProperties[propertyName] = parentVal;
            }
        } else {
            // Rendre indépendant: copier la valeur actuelle effective dans le matériau courant
            let valueToSet = this.materialProperties[propertyName];
            if (propertyName === 'baseColor' && this.baseColorDisplay?.hex) {
                valueToSet = this.baseColorDisplay.hex;
            }
            currentMaterial[propertyName] = valueToSet;
            this.independentProperties.add(propertyName);
        }

        // Rafraîchir UI + appliquer
        // Rafraîchir d'abord le pane (recrée des DOM), puis re-attacher les écouteurs, enfin appliquer
        if (this.pane) this.pane.refresh();
        this.updateControlsAppearance();
        this.applyMaterialChanges();
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
    
    // Mettre à jour en temps réel uniquement le matériau sélectionné
    updateAppliedMaterials() {
        const selectedMaterial = this.materialList.selected;
        if (!selectedMaterial || !this.materialsConfig.materials[selectedMaterial]) {
            return;
        }
        const scene = (window.tagManager && window.tagManager.scene) ? window.tagManager.scene : (this.scene || window.scene);
        if (!scene) return;

        let updatedCount = 0;
        // Si des instances sont traquées, préférer celles-ci
        const candidates = (window.materialInstances && window.materialInstances[selectedMaterial])
            ? window.materialInstances[selectedMaterial]
            : scene.materials.filter(m => m && m.name === selectedMaterial);

        candidates.forEach(mat => {
            if (mat) {
                updatedCount++;
                // Couleur de base
                if (this.materialProperties.baseColor) {
                    mat.albedoColor = new BABYLON.Color3(
                        this.materialProperties.baseColor.r,
                        this.materialProperties.baseColor.g,
                        this.materialProperties.baseColor.b
                    );
                }
                // Scalars
                if (this.materialProperties.metallic !== undefined) mat.metallic = this.materialProperties.metallic;
                if (this.materialProperties.roughness !== undefined) mat.roughness = this.materialProperties.roughness;
                if (this.materialProperties.alpha !== undefined) mat.alpha = this.materialProperties.alpha;
                // Back Face Culling
                if (this.materialProperties.backFaceCulling !== undefined) {
                    mat.backFaceCulling = !!this.materialProperties.backFaceCulling;
                }

                // Textures (réutiliser si même nom, sinon remplacer proprement)
                const setTexture = (current, desiredName) => {
                    if (!desiredName || desiredName === 'None') {
                        if (current) { try { current.dispose(); } catch(_){} }
                        return null;
                    }
                    if (!current || current.name !== desiredName) {
                        if (current) { try { current.dispose(); } catch(_){} }
                        const t = new BABYLON.Texture(`Textures/${desiredName}`, scene);
                        t.name = desiredName;
                        return t;
                    }
                    return current;
                };

                mat.albedoTexture = setTexture(mat.albedoTexture, this.materialProperties.albedoTexture);
                mat.metallicTexture = setTexture(mat.metallicTexture, this.materialProperties.metallicTexture);
                mat.microSurfaceTexture = setTexture(mat.microSurfaceTexture, this.materialProperties.microSurfaceTexture);
                mat.ambientTexture = setTexture(mat.ambientTexture, this.materialProperties.ambientTexture);
                mat.opacityTexture = setTexture(mat.opacityTexture, this.materialProperties.opacityTexture);
                mat.bumpTexture = setTexture(mat.bumpTexture, this.materialProperties.bumpTexture);
                if (mat.bumpTexture && this.materialProperties.bumpTextureIntensity !== undefined) {
                    mat.bumpTexture.level = this.materialProperties.bumpTextureIntensity;
                    // Réduire le moiré: filtrage trilineaire + anisotropie
                    try {
                        const anisotropicMode = BABYLON.Texture.ANISOTROPIC_SAMPLINGMODE || BABYLON.Texture.TRILINEAR_SAMPLINGMODE;
                        mat.bumpTexture.updateSamplingMode(anisotropicMode);
                        const maxAniso = (scene.getEngine().getCaps().maxAnisotropy || 8);
                        mat.bumpTexture.anisotropicFilteringLevel = Math.min(16, maxAniso);
                    } catch (_) {}
                }
                mat.lightmapTexture = setTexture(mat.lightmapTexture, this.materialProperties.lightmapTexture);
                if (mat.lightmapTexture) {
                    mat.useLightmapAsShadowmap = true;
                    const uvSet = (this.materialProperties.lightmapUVSet !== undefined) ? this.materialProperties.lightmapUVSet : 1;
                    mat.lightmapTexture.coordinatesIndex = uvSet;
                }

                // Transformations de textures
                const applyTransform = (t) => {
                    if (!t) return;
                    if (this.materialProperties.uOffset !== undefined) t.uOffset = this.materialProperties.uOffset;
                    if (this.materialProperties.vOffset !== undefined) t.vOffset = this.materialProperties.vOffset;
                    if (this.materialProperties.uScale !== undefined) t.uScale = this.materialProperties.uScale;
                    if (this.materialProperties.vScale !== undefined) t.vScale = this.materialProperties.vScale;
                    if (this.materialProperties.wRotation !== undefined) t.wAng = BABYLON.Tools.ToRadians(this.materialProperties.wRotation);
                };
                applyTransform(mat.albedoTexture);
                applyTransform(mat.bumpTexture);
                applyTransform(mat.metallicTexture);
                applyTransform(mat.microSurfaceTexture);
                applyTransform(mat.ambientTexture);
                applyTransform(mat.opacityTexture);

                mat.markAsDirty(BABYLON.Material.TextureDirtyFlag);
            }
        });

        if (updatedCount === 0) {
            // Rien à mettre à jour: aucun matériau avec ce nom n'est présent sur la scène
            // C'est attendu si le matériau sélectionné n'est pas actuellement utilisé par un mesh visible
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
            // Normaliser en radians dans [0, 2π)
            let a = value % (2 * Math.PI);
            if (a < 0) a += 2 * Math.PI;
            this.scene.activeCamera.alpha = a;
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
            // Distance minimale (limite inférieure du radius)
            this.scene.activeCamera.lowerRadiusLimit = value;
        }
    }
    
    updateCameraMaxDistance(value) {
        if (this.scene && this.scene.activeCamera) {
            // Distance maximale (limite supérieure du radius)
            this.scene.activeCamera.upperRadiusLimit = value;
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
            // Load prefiltered env if available, else HDR
            let tex = null;
            try {
                tex = BABYLON.CubeTexture.CreateFromPrefilteredData(`Textures/HDR/${textureName.replace('.hdr','.env')}`, this.scene);
            } catch (_) {}
            if (!tex) {
                tex = new BABYLON.HDRCubeTexture(`Textures/HDR/${textureName}`, this.scene, 512, false, false, false, true);
            }
            this.scene.environmentTexture = tex;
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
            const response = await fetch('api/textures');
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
    
    
    setTweakpaneVisibility(visible) {
        if (this.pane) {
            this.pane.element.style.display = visible ? 'block' : 'none';
        }
    }
    
    async exportMaterial() {
        try {
            
            // Sauvegarder les modifications actuelles avant l'export
            this.applyMaterialChanges();
            
            // Préparer les données à exporter
            const exportData = {
                materials: this.materialsConfig.materials
            };
            
            
            // Envoyer les données au serveur PowerShell
            const response = await fetch('materials.json', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                // Pretty-print pour un materials.json structuré
                body: JSON.stringify(exportData, null, 2)
            });
            
            
            if (response.ok) {
                const responseText = await response.text();
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
