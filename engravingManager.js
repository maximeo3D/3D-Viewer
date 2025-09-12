// engravingManager.js - Gestion de l'engraving (DynamicTexture alpha + normal map)

class EngravingManager {
    constructor(scene, assetConfig) {
        this.scene = scene;
        this.assetConfig = assetConfig;
        this.text = '';
        this.aspectOverride = null; // largeur/hauteur, null = auto
        this.alphaDT = null; // DynamicTexture alpha du texte
        this.normalDT = null; // DynamicTexture normal map
        this.aoDT = null; // DynamicTexture ambient occlusion dérivée
        // Global blur percentage (0..1) applied to both Alpha and AO blurs
        this.blurPercent = 0.01; // 1% par défaut
        // Processing canvas to satisfy willReadFrequently for readbacks
        this._procCanvas = document.createElement('canvas');
        this._procCtx = this._procCanvas.getContext('2d', { willReadFrequently: true });
        
        // ===== PARAMÈTRES D'ENGRAVING MODIFIABLES =====
        this.fontConfigs = {
            'Stencil': {
                fontWeight: 'normal',
                fontStyle: 'normal',
                letterSpacing: 0,
                fontSizeScale: 1
            },
            'Futuristic': {
                fontWeight: 'normal',
                fontStyle: 'normal',
                letterSpacing: 2,
                fontSizeScale: 1
            },
            'Western': {
                fontWeight: 'normal',
                fontStyle: 'normal',
                letterSpacing: 15,
                fontSizeScale: 1
            }
        };
        this.currentFont = 'Stencil';  // Police active
        // ===============================================
    }

    setText(text) {
        this.text = text || '';
        // Drive tag engraving via TagManager if present
        if (window.tagManager) {
            // Synchronize TagManager.engravingText used by visibility logic
            window.tagManager.engravingText = this.text;
            if (this.text.trim() !== '') window.tagManager.activeTags.add('engraving');
            else window.tagManager.activeTags.delete('engraving');
        }
        this.update();
        if (window.tagManager) {
            window.tagManager.applyActiveTags();
        }
    }

    async setFont(fontName) {
        if (this.fontConfigs[fontName]) {
            this.currentFont = fontName;
            console.log(`EngravingManager: Switching to font: ${fontName}`);
            
            // Forcer le chargement de la police spécifique
            if (document.fonts && document.fonts.load) {
                try {
                    await document.fonts.load(`bold 16px ${fontName}`);
                    console.log(`EngravingManager: Font ${fontName} loaded successfully`);
                    
                    // Vérifier si la police est vraiment disponible
                    const testCanvas = document.createElement('canvas');
                    const testCtx = testCanvas.getContext('2d');
                    testCtx.font = `bold 16px ${fontName}`;
                    const actualFont = testCtx.font;
                    console.log(`EngravingManager: Actual font in canvas: ${actualFont}`);
                    
                    if (actualFont.includes(fontName)) {
                        console.log(`EngravingManager: Font ${fontName} is working in canvas`);
                    } else {
                        console.warn(`EngravingManager: Font ${fontName} fallback to system font`);
                    }
                } catch (error) {
                    console.warn(`EngravingManager: Error loading font ${fontName}:`, error);
                }
            }
            
            this.update();
        } else {
            console.warn(`EngravingManager: Font ${fontName} not found, available: ${Object.keys(this.fontConfigs).join(', ')}`);
        }
    }

    setAspect(aspectOrNull) {
        if (aspectOrNull === null || aspectOrNull === undefined) this.aspectOverride = null;
        else {
            const a = Number(aspectOrNull);
            if (!isNaN(a) && a > 0) this.aspectOverride = a;
        }
        this.update();
    }

    update() {
        if (!this.scene || !this.assetConfig) return;
        const hasText = this.text.trim() !== '';
        if (!hasText) {
            this.applyOpacity(null);
            this.applyNormal(null);
            this.applyAmbient(null);
            return;
        }

        const aspect = this.getAspect();
        const base = 512;
        const size = { width: Math.max(2, Math.round(base * aspect)), height: base };

        // Recréer complètement les textures à chaque fois pour éviter les contextes null
        if (this.alphaDT) {
            this.alphaDT.dispose();
            this.alphaDT = null;
        }
        this.alphaDT = new BABYLON.DynamicTexture('engravingDT', size, this.scene, true);
        this.alphaDT.hasAlpha = true;
        try {
            const anisotropicMode = BABYLON.Texture.ANISOTROPIC_SAMPLINGMODE || BABYLON.Texture.TRILINEAR_SAMPLINGMODE;
            this.alphaDT.updateSamplingMode(anisotropicMode);
            const maxAniso = (this.scene.getEngine().getCaps().maxAnisotropy || 8);
            this.alphaDT.anisotropicFilteringLevel = Math.min(16, maxAniso);
        } catch (_) {}

        // Unify blur radius for Alpha and AO using a single percentage
        const minDim = Math.min(size.width, size.height);
        const blurPx = Math.max(1, Math.round(minDim * this.blurPercent));

        // Récupérer la configuration de la police active
        const config = this.fontConfigs[this.currentFont] || this.fontConfigs['Stencil'];
        
        // Draw alpha with unified blur for softer edges
        let fontPx = Math.floor(size.height * config.fontSizeScale);
        let font = `${config.fontStyle} ${config.fontWeight} ${fontPx}px ${this.currentFont}`;
        console.log(`EngravingManager: Using font: ${font} (${this.currentFont})`);
        const aCtx = this.alphaDT.getContext('2d', { willReadFrequently: true });
        if (!aCtx) {
            console.error('EngravingManager: Cannot get alpha context after recreation');
            return;
        }
        
        aCtx.clearRect(0, 0, size.width, size.height);
        aCtx.fillStyle = 'black';
        aCtx.fillRect(0, 0, size.width, size.height);
        
        // Measure and fit text to avoid clipping
        aCtx.textAlign = 'center';
        aCtx.textBaseline = 'middle';
        while (fontPx > 24) {
            aCtx.font = `${config.fontStyle} ${config.fontWeight} ${fontPx}px ${this.currentFont}`;
            const mW = aCtx.measureText(this.text).width;
            if (mW <= size.width * 0.9) break;
            fontPx -= 4;
        }
        font = `${config.fontStyle} ${config.fontWeight} ${fontPx}px ${this.currentFont}`;
        aCtx.font = font;
        
        // Appliquer l'espacement des lettres
        if (config.letterSpacing !== 0) {
            aCtx.letterSpacing = `${config.letterSpacing}px`;
        }
        
        console.log(`EngravingManager: Final font applied: ${aCtx.font}, letterSpacing: ${config.letterSpacing}px`);
        // Soft edge via blur only (no crisp overlay to keep gradient)
        try { aCtx.filter = `blur(${blurPx}px)`; } catch(_) {}
        aCtx.fillStyle = 'white';
        aCtx.fillText(this.text, size.width / 2, size.height / 2);
        try { aCtx.filter = 'none'; } catch(_) {}
        this.alphaDT.update(true);

        // Recréer complètement la texture AO
        if (this.aoDT) {
            this.aoDT.dispose();
            this.aoDT = null;
        }
        this.aoDT = new BABYLON.DynamicTexture('engravingAODT', size, this.scene, true);
        // Draw blurred AO (not inverted) using same fitted font and unified blur
        const aoCtx = this.aoDT.getContext('2d', { willReadFrequently: true });
        if (!aoCtx) {
            console.error('EngravingManager: Cannot get AO context after recreation');
            return;
        }
        
        aoCtx.clearRect(0, 0, size.width, size.height);
        aoCtx.fillStyle = 'black';
        aoCtx.fillRect(0, 0, size.width, size.height);
        try { aoCtx.filter = `blur(${blurPx}px)`; } catch(_) {}
        aoCtx.font = font;
        
        // Appliquer l'espacement des lettres aussi pour AO
        if (config.letterSpacing !== 0) {
            aoCtx.letterSpacing = `${config.letterSpacing}px`;
        }
        
        aoCtx.fillStyle = 'white';
        aoCtx.textAlign = 'center';
        aoCtx.textBaseline = 'middle';
        aoCtx.fillText(this.text, size.width / 2, size.height / 2);
        aoCtx.filter = 'none';
        this.aoDT.update(true);

        // Build normal from AO using Sobel (readback via processing canvas)
        this.buildNormalFromAO(this.aoDT);

        // Apply
        this.applyOpacity(this.alphaDT);
        this.applyAmbient(this.aoDT);
        this.applyNormal(this.normalDT);
    }

    getAspect() {
        if (this.aspectOverride && this.aspectOverride > 0) return this.aspectOverride;
        // Find first engraving mesh and compute aspect from bounding box
        let targetMesh = null;
        if (this.assetConfig && this.assetConfig.models) {
            outer: for (const modelKey of Object.keys(this.assetConfig.models)) {
                const model = this.assetConfig.models[modelKey];
                for (const meshName of Object.keys(model.meshes)) {
                    const tags = model.meshes[meshName].tags || [];
                    if (tags.includes('engraving')) {
                        const meshes = this.scene.meshes.filter(m => m && (m.name === meshName || m.name.startsWith(meshName + '_primitive')));
                        if (meshes.length > 0) { targetMesh = meshes[0]; break outer; }
                    }
                }
            }
        }
        if (!targetMesh) return 1;
        const ext = targetMesh.getBoundingInfo().boundingBox.extendSize;
        const size = new BABYLON.Vector3(ext.x * 2, ext.y * 2, ext.z * 2);
        const dims = [size.x, size.y, size.z].sort((a,b) => b - a);
        const width = Math.max(0.0001, dims[0]);
        const height = Math.max(0.0001, dims[1]);
        return Math.max(0.1, Math.min(10, width / height));
    }

    buildAOFromAlpha(width, height, blurPx = 5, invert = true) {
        const srcCanvas = document.createElement('canvas');
        srcCanvas.width = width; srcCanvas.height = height;
        const srcCtx = srcCanvas.getContext('2d');
        srcCtx.drawImage(this.alphaDT.getContext().canvas, 0, 0);
        const img = srcCtx.getImageData(0, 0, width, height);
        const data = img.data;
        for (let i = 0; i < data.length; i += 4) {
            const gray = data[i];
            const val = invert ? (255 - gray) : gray; // noir = creux
            data[i] = val; data[i+1] = val; data[i+2] = val; data[i+3] = 255;
        }
        srcCtx.putImageData(img, 0, 0);

        const blurCanvas = document.createElement('canvas');
        blurCanvas.width = width; blurCanvas.height = height;
        const blurCtx = blurCanvas.getContext('2d', { willReadFrequently: true });
        const px = Math.max(1, Math.round(blurPx));
        try { blurCtx.filter = `blur(${px}px)`; } catch(_) {}
        blurCtx.drawImage(srcCanvas, 0, 0);
        return blurCanvas;
    }

    pushAOToTexture(aoCanvas) {
        const width = aoCanvas.width, height = aoCanvas.height;
        if (!this.aoDT) this.aoDT = new BABYLON.DynamicTexture('engravingAODT', { width, height }, this.scene, true);
        const ctx = this.aoDT.getContext();
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(aoCanvas, 0, 0);
        this.aoDT.update(true);
        try {
            this.aoDT.gammaSpace = false; // AO en espace linéaire
            const mode = BABYLON.Texture.ANISOTROPIC_SAMPLINGMODE || BABYLON.Texture.TRILINEAR_SAMPLINGMODE;
            this.aoDT.updateSamplingMode(mode);
        } catch(_) {}
    }

    buildNormalFromAO(aoDT) {
        const size = aoDT.getSize();
        const width = size.width, height = size.height;
        const srcCtx = aoDT.getContext('2d', { willReadFrequently: true }) || aoDT.getContext();
        if (!srcCtx) {
            console.warn('EngravingManager: Source context for normal map is null');
            return;
        }
        if (this._procCanvas.width !== width || this._procCanvas.height !== height) {
            this._procCanvas.width = width;
            this._procCanvas.height = height;
            this._procCtx = this._procCanvas.getContext('2d', { willReadFrequently: true });
        }
        this._procCtx.clearRect(0, 0, width, height);
        this._procCtx.drawImage(srcCtx.canvas, 0, 0);
        const blurred = this._procCtx.getImageData(0, 0, width, height);
        const bd = blurred.data;

        // Recréer complètement la texture normale
        if (this.normalDT) {
            this.normalDT.dispose();
            this.normalDT = null;
        }
        this.normalDT = new BABYLON.DynamicTexture('engravingNormalDT', { width, height }, this.scene, true);
        const nCtx = this.normalDT.getContext();
        if (!nCtx) {
            console.error('EngravingManager: Cannot get normal context after recreation');
            return;
        }
        const nImg = nCtx.createImageData(width, height);
        const nd = nImg.data;

        const idxAt = (x, y) => (y * width + x) * 4;
        const redAt = (x, y) => bd[idxAt(x, y)] / 255;
        // Tweak: normal map strength. Smaller = softer; larger = stronger depth.
        // Increased ~200%: was 2.0 → now 6.0
        const strength = 6.0;
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                // Sobel operator on red channel
                const tl = redAt(x-1, y-1), t = redAt(x, y-1), tr = redAt(x+1, y-1);
                const l  = redAt(x-1, y  ), r  = redAt(x+1, y  );
                const bl = redAt(x-1, y+1), b = redAt(x, y+1), br = redAt(x+1, y+1);
                const dX = (tr + 2*r + br) - (tl + 2*l + bl);
                const dY = (bl + 2*b + br) - (tl + 2*t + tr);
                // Invert XY for depth impression
                let nx = -dX, ny = -dY, nz = 5.0 / strength;
                const len = Math.hypot(nx, ny, nz) || 1.0;
                nx/=len; ny/=len; nz/=len;
                const i = idxAt(x, y);
                nd[i]   = (nx + 1.0) * 127.5;
                nd[i+1] = (ny + 1.0) * 127.5;
                nd[i+2] = (nz + 1.0) * 127.5;
                nd[i+3] = 255;
            }
        }
        nCtx.putImageData(nImg, 0, 0);
        this.normalDT.update(true);
        try {
            this.normalDT.gammaSpace = false; // normal map en linéaire
            const anisotropicMode = BABYLON.Texture.ANISOTROPIC_SAMPLINGMODE || BABYLON.Texture.TRILINEAR_SAMPLINGMODE;
            this.normalDT.updateSamplingMode(anisotropicMode);
            const maxAniso = (this.scene.getEngine().getCaps().maxAnisotropy || 8);
            this.normalDT.anisotropicFilteringLevel = Math.min(16, maxAniso);
        } catch (_) {}
    }

    applyOpacity(textureOrNull) {
        Object.keys(this.assetConfig.models).forEach(modelKey => {
            const model = this.assetConfig.models[modelKey];
            Object.keys(model.meshes).forEach(meshName => {
                const meshCfg = model.meshes[meshName];
                const tags = meshCfg.tags || [];
                if (!tags.includes('engraving')) return;
                const meshes = this.scene.meshes.filter(m => m && (m.name === meshName || m.name.startsWith(meshName + '_primitive')));
                meshes.forEach(m => {
                    const pbr = (m.material && m.material instanceof BABYLON.PBRMaterial) ? m.material : null;
                    if (!pbr) return;
                    if (!textureOrNull) {
                        pbr.opacityTexture = null;
                    } else {
                        pbr.opacityTexture = textureOrNull;
                        pbr.opacityTexture.getAlphaFromRGB = true;
                        pbr.opacityTexture.vFlip = false;
                        // Preserve blurred edges (no hard cutoff)
                        pbr.transparencyMode = BABYLON.PBRMaterial.PBRMATERIAL_ALPHABLEND;
                        pbr.forceAlphaTest = false;
                        pbr.alphaCutOff = 0.0;
                        pbr.needDepthPrePass = true;
                        try { pbr.opacityTexture.updateSamplingMode(BABYLON.Texture.TRILINEAR_SAMPLINGMODE); } catch(_) {}
                        // Ensure standard lit shading for consistency with scene lighting
                        pbr.unlit = false;
                    }
                    pbr.markAsDirty(BABYLON.Material.TextureDirtyFlag);
                });
            });
        });
    }

    applyNormal(textureOrNull) {
        Object.keys(this.assetConfig.models).forEach(modelKey => {
            const model = this.assetConfig.models[modelKey];
            Object.keys(model.meshes).forEach(meshName => {
                const meshCfg = model.meshes[meshName];
                const tags = meshCfg.tags || [];
                if (!tags.includes('engraving')) return;
                const meshes = this.scene.meshes.filter(m => m && (m.name === meshName || m.name.startsWith(meshName + '_primitive')));
                meshes.forEach(m => {
                    const pbr = (m.material && m.material instanceof BABYLON.PBRMaterial) ? m.material : null;
                    if (!pbr) return;
                    if (!textureOrNull) {
                        pbr.bumpTexture = null;
                    } else {
                        pbr.bumpTexture = textureOrNull;
                        // Tweak: bump intensity. Increase for stronger relief on the surface.
                        // Increased ~200% from base → 2.8
                        pbr.bumpTexture.level = 2.8;
                        try {
                            const anisotropicMode = BABYLON.Texture.ANISOTROPIC_SAMPLINGMODE || BABYLON.Texture.TRILINEAR_SAMPLINGMODE;
                            pbr.bumpTexture.updateSamplingMode(anisotropicMode);
                            const maxAniso = (this.scene.getEngine().getCaps().maxAnisotropy || 8);
                            pbr.bumpTexture.anisotropicFilteringLevel = Math.min(16, maxAniso);
                        } catch (_) {}
                        pbr.bumpTexture.vFlip = false;
                        // Orientation par défaut
                        pbr.invertNormalMapX = false;
                        pbr.invertNormalMapY = false;
                    }
                    pbr.markAsDirty(BABYLON.Material.TextureDirtyFlag);
                });
            });
        });
    }

    applyAmbient(textureOrNull) {
        Object.keys(this.assetConfig.models).forEach(modelKey => {
            const model = this.assetConfig.models[modelKey];
            Object.keys(model.meshes).forEach(meshName => {
                const meshCfg = model.meshes[meshName];
                const tags = meshCfg.tags || [];
                if (!tags.includes('engraving')) return;
                const meshes = this.scene.meshes.filter(m => m && (m.name === meshName || m.name.startsWith(meshName + '_primitive')));
                meshes.forEach(m => {
                    const pbr = (m.material && m.material instanceof BABYLON.PBRMaterial) ? m.material : null;
                    if (!pbr) return;
                    if (!textureOrNull) {
                        pbr.ambientTexture = null;
                    } else {
                        pbr.ambientTexture = textureOrNull;
                        try { pbr.ambientTexture.gammaSpace = false; } catch(_) {}
                        pbr.ambientTexture.vFlip = false;
                        // Tweak: AO strength (~200% relative)
                        if ('ambientTextureStrength' in pbr) pbr.ambientTextureStrength = 1.0;
                        // Fallback: some engines use ambientColor; keep texture level at 1 and control via strength
                        pbr.ambientTexture.level = 1.0;
                    }
                    pbr.markAsDirty(BABYLON.Material.TextureDirtyFlag);
                });
            });
        });
    }
}

// Exposer globalement
window.EngravingManager = EngravingManager;
window.engravingManager = null;


