// engravingManager.js - Gestion de l'engraving (DynamicTexture alpha + normal map)

class EngravingManager {
    constructor(scene, assetConfig) {
        this.scene = scene;
        this.assetConfig = assetConfig;
        this.text = '';
        this.aspectOverride = null; // largeur/hauteur, null = auto
        this.alphaDT = null; // DynamicTexture alpha du texte
        this.normalDT = null; // DynamicTexture normal map
    }

    setText(text) {
        this.text = text || '';
        // Drive tag engraving via TagManager if present
        if (window.tagManager) {
            if (this.text.trim() !== '') window.tagManager.activeTags.add('engraving');
            else window.tagManager.activeTags.delete('engraving');
        }
        this.update();
        if (window.tagManager) {
            window.tagManager.applyActiveTags();
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
            return;
        }

        const aspect = this.getAspect();
        const base = 1024;
        const size = { width: Math.max(2, Math.round(base * aspect)), height: base };

        // Ensure alpha DT
        if (!this.alphaDT) {
            this.alphaDT = new BABYLON.DynamicTexture('engravingDT', size, this.scene, true);
            this.alphaDT.hasAlpha = true;
            try {
                const anisotropicMode = BABYLON.Texture.ANISOTROPIC_SAMPLINGMODE || BABYLON.Texture.TRILINEAR_SAMPLINGMODE;
                this.alphaDT.updateSamplingMode(anisotropicMode);
                const maxAniso = (this.scene.getEngine().getCaps().maxAnisotropy || 8);
                this.alphaDT.anisotropicFilteringLevel = Math.min(16, maxAniso);
            } catch (_) {}
        }

        let ctx = this.alphaDT.getContext();
        if (!ctx) {
            this.alphaDT = new BABYLON.DynamicTexture('engravingDT', size, this.scene, true);
            this.alphaDT.hasAlpha = true;
            ctx = this.alphaDT.getContext();
        }
        // Clear to black
        ctx.fillStyle = 'rgb(0,0,0)';
        ctx.fillRect(0, 0, size.width, size.height);
        // Draw centered white text
        let fontSize = Math.floor(size.height * 0.35);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgb(255,255,255)';
        do {
            ctx.font = `bold ${fontSize}px Arial`;
            const w = ctx.measureText(this.text).width;
            if (w <= size.width * 0.9 || fontSize <= 32) break;
            fontSize -= 8;
        } while (fontSize > 32);
        ctx.fillText(this.text, size.width / 2, size.height / 2);
        this.alphaDT.update(true);

        // Build normal from alpha
        this.buildNormalFromAlpha(size.width, size.height, true);

        // Apply
        this.applyOpacity(this.alphaDT);
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

    buildNormalFromAlpha(width, height, invert) {
        const srcCanvas = document.createElement('canvas');
        srcCanvas.width = width; srcCanvas.height = height;
        const srcCtx = srcCanvas.getContext('2d');
        srcCtx.drawImage(this.alphaDT.getContext().canvas, 0, 0);
        const img = srcCtx.getImageData(0, 0, width, height);
        const data = img.data;
        for (let i = 0; i < data.length; i += 4) {
            const gray = data[i];
            const h = invert ? (255 - gray) : gray;
            data[i] = h; data[i+1] = h; data[i+2] = h; data[i+3] = 255;
        }
        srcCtx.putImageData(img, 0, 0);

        // Blur ~10%
        const blurCanvas = document.createElement('canvas');
        blurCanvas.width = width; blurCanvas.height = height;
        const blurCtx = blurCanvas.getContext('2d');
        const blurPx = Math.max(1, Math.round(Math.min(width, height) * 0.1));
        try { blurCtx.filter = `blur(${blurPx}px)`; } catch(_) {}
        blurCtx.drawImage(srcCanvas, 0, 0);

        const blurred = blurCtx.getImageData(0, 0, width, height);
        const bd = blurred.data;

        if (!this.normalDT) this.normalDT = new BABYLON.DynamicTexture('engravingNormalDT', { width, height }, this.scene, true);
        const nCtx = this.normalDT.getContext();
        const nImg = nCtx.createImageData(width, height);
        const nd = nImg.data;

        const heightAt = (x, y) => {
            const xi = Math.min(width-1, Math.max(0, x));
            const yi = Math.min(height-1, Math.max(0, y));
            const idx = (yi*width + xi) * 4;
            return bd[idx] / 255;
        };

        const strength = 2.0;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const hL = heightAt(x-1, y), hR = heightAt(x+1, y);
                const hU = heightAt(x, y-1), hD = heightAt(x, y+1);
                const dx = (hR - hL) * strength;
                const dy = (hD - hU) * strength;
                let nx = -dx, ny = -dy, nz = 1.0;
                const len = Math.hypot(nx, ny, nz) || 1.0;
                nx/=len; ny/=len; nz/=len;
                const r = Math.round((nx*0.5+0.5)*255);
                const g = Math.round((ny*0.5+0.5)*255);
                const b = Math.round((nz*0.5+0.5)*255);
                const idx = (y*width + x) * 4;
                nd[idx]=r; nd[idx+1]=g; nd[idx+2]=b; nd[idx+3]=255;
            }
        }
        nCtx.putImageData(nImg, 0, 0);
        this.normalDT.update(true);
        try {
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
                        pbr.transparencyMode = BABYLON.PBRMaterial.PBRMATERIAL_ALPHATESTANDBLEND;
                        pbr.needDepthPrePass = true;
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
}

// Exposer globalement
window.EngravingManager = EngravingManager;
window.engravingManager = null;


