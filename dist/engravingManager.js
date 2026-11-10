// engravingManager.js - Gravure par zone (DynamicTexture alpha + normal map)

function fontFormat(file) {
    const ext = String(file || '').toLowerCase();
    if (ext.endsWith('.otf')) return 'opentype';
    if (ext.endsWith('.woff2')) return 'woff2';
    if (ext.endsWith('.woff')) return 'woff';
    return 'truetype';
}

function applyEngravingFontFaces(fonts) {
    let style = document.getElementById('engraving-font-faces');
    if (!style) {
        style = document.createElement('style');
        style.id = 'engraving-font-faces';
        document.head.appendChild(style);
    }
    style.textContent = (fonts || []).map(font => {
        const name = String(font.name || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        const file = String(font.file || '').replace(/\\/g, '/');
        if (!name || !file) return '';
        return `@font-face{font-family:'${name}';src:url('fonts/${file}') format('${fontFormat(file)}');}`;
    }).join('\n');
}

window.applyEngravingFontFaces = applyEngravingFontFaces;

class EngravingManager {
    constructor(scene, assetConfig) {
        this.scene = scene;
        this.assetConfig = assetConfig;
        this.layers = new Map();
        this.blurPercent = 0.01;
        this._procCanvas = document.createElement('canvas');
        this._procCtx = this._procCanvas.getContext('2d', { willReadFrequently: true });
        this.text = '';
        this.currentFont = 'Stencil';
        this.fontConfigs = {};
        this.alphaDT = null;
        this.aoDT = null;
        this.normalDT = null;
        this.syncFonts();
    }

    engravings() {
        return (this.assetConfig && this.assetConfig.engravings) || [];
    }

    fonts() {
        return (this.assetConfig && this.assetConfig.fonts) || [];
    }

    zone(id) {
        return this.engravings().find(item => item.id === id) || null;
    }

    syncFonts() {
        const known = {
            Stencil: { letterSpacing: 0, fontSizeScale: 1 },
            Futuristic: { letterSpacing: 2, fontSizeScale: 1 },
            Western: { letterSpacing: 15, fontSizeScale: 1 }
        };
        this.fontConfigs = {};
        this.fonts().forEach(font => {
            if (!font || !font.name) return;
            const extra = known[font.name] || { letterSpacing: 0, fontSizeScale: 1 };
            this.fontConfigs[font.name] = {
                fontWeight: 'normal',
                fontStyle: 'normal',
                letterSpacing: extra.letterSpacing,
                fontSizeScale: extra.fontSizeScale
            };
        });
        applyEngravingFontFaces(this.fonts());
    }

    textForMesh(meshName) {
        const zone = this.engravings().find(item => item.mesh === meshName);
        return (zone && zone.text) || '';
    }

    isEngravingTexture(texture) {
        if (!texture) return false;
        if (texture.name && /^engraving(DT|AODT|NormalDT)/.test(texture.name)) return true;
        for (const layer of this.layers.values()) {
            if (texture === layer.alphaDT || texture === layer.aoDT || texture === layer.normalDT) return true;
        }
        return texture === this.alphaDT || texture === this.aoDT || texture === this.normalDT;
    }

    setText(idOrText, maybeText) {
        if (maybeText !== undefined) {
            const zone = this.zone(idOrText);
            if (!zone) return;
            zone.text = maybeText || '';
            this.text = zone.text;
            this.updateZone(zone.id);
        } else {
            const first = this.engravings()[0];
            if (!first) {
                this.text = idOrText || '';
                return;
            }
            first.text = idOrText || '';
            this.text = first.text;
            this.updateZone(first.id);
        }
        if (window.tagManager && window.tagManager.applySceneVisibility) window.tagManager.applySceneVisibility();
    }

    async setFont(idOrFont, maybeFont) {
        const id = maybeFont !== undefined ? idOrFont : (this.engravings()[0] && this.engravings()[0].id);
        const fontName = maybeFont !== undefined ? maybeFont : idOrFont;
        const zone = this.zone(id);
        if (!zone || !fontName) return;
        zone.font = fontName;
        if (!Array.isArray(zone.fonts)) zone.fonts = [];
        if (fontName && !zone.fonts.includes(fontName)) zone.fonts.push(fontName);
        this.currentFont = fontName;
        if (document.fonts && document.fonts.load) {
            try { await document.fonts.load(`16px "${fontName}"`); } catch (_) {}
        }
        this.updateZone(zone.id);
        if (window.tagManager && window.tagManager.applySceneVisibility) window.tagManager.applySceneVisibility();
    }

    async applyAll() {
        this.syncFonts();
        const keep = new Set(this.engravings().map(zone => zone.id));
        Array.from(this.layers.keys()).forEach(id => {
            if (keep.has(id)) return;
            const layer = this.layers.get(id);
            if (layer && layer.mesh) this.applyToMesh(layer.mesh, null, null, null);
            this.disposeLayer(layer);
            this.layers.delete(id);
        });
        for (const zone of this.engravings()) await this.updateZone(zone.id);
        const first = this.engravings()[0];
        if (first) {
            this.text = first.text || '';
            this.currentFont = first.font || this.currentFont;
        }
        if (window.tagManager && window.tagManager.applySceneVisibility) window.tagManager.applySceneVisibility();
    }

    reapply() {
        if (!this.engravings().length) return;
        this.engravings().forEach(zone => {
            const layer = this.layers.get(zone.id);
            if (!layer || !layer.alphaDT || !zone.mesh || !(zone.text || '').trim()) {
                this.updateZone(zone.id);
                return;
            }
            this.applyToMesh(zone.mesh, layer.alphaDT, layer.aoDT, layer.normalDT);
        });
        if (window.tagManager && window.tagManager.applySceneVisibility) window.tagManager.applySceneVisibility();
    }

    update() {
        this.applyAll();
    }

    disposeLayer(layer) {
        if (!layer) return;
        ['alphaDT', 'aoDT', 'normalDT'].forEach(key => {
            if (layer[key]) {
                try { layer[key].dispose(); } catch (_) {}
                layer[key] = null;
            }
        });
    }

    sceneMeshes(meshName) {
        if (!this.scene || !meshName) return [];
        return this.scene.meshes.filter(mesh => mesh && (mesh.name === meshName || mesh.name.startsWith(meshName + '_primitive')));
    }

    async updateZone(id) {
        if (!this.scene || !this.assetConfig) return;
        const zone = this.zone(id);
        if (!zone) return;
        this.syncFonts();
        let layer = this.layers.get(id);
        if (!layer) {
            layer = { mesh: zone.mesh, alphaDT: null, aoDT: null, normalDT: null };
            this.layers.set(id, layer);
        }
        if (layer.mesh && layer.mesh !== zone.mesh) this.applyToMesh(layer.mesh, null, null, null);
        layer.mesh = zone.mesh;
        const text = (zone.text || '').trim();
        if (!zone.mesh || !text) {
            this.disposeLayer(layer);
            if (zone.mesh) this.applyToMesh(zone.mesh, null, null, null);
            return;
        }
        const fontName = zone.font || Object.keys(this.fontConfigs)[0] || 'Stencil';
        if (document.fonts && document.fonts.load) {
            try { await document.fonts.load(`16px "${fontName}"`); } catch (_) {}
        }
        const aspect = this.getAspect(zone.mesh);
        const base = 512;
        const size = { width: Math.max(2, Math.round(base * aspect)), height: base };
        const minDim = Math.min(size.width, size.height);
        const blurPx = Math.max(1, Math.round(minDim * this.blurPercent));
        const config = this.fontConfigs[fontName] || this.fontConfigs.Stencil || {
            fontWeight: 'normal', fontStyle: 'normal', letterSpacing: 0, fontSizeScale: 1
        };

        this.disposeLayer(layer);
        layer.alphaDT = new BABYLON.DynamicTexture(`engravingDT_${id}`, size, this.scene, true);
        layer.alphaDT.hasAlpha = true;
        try {
            const anisotropicMode = BABYLON.Texture.ANISOTROPIC_SAMPLINGMODE || BABYLON.Texture.TRILINEAR_SAMPLINGMODE;
            layer.alphaDT.updateSamplingMode(anisotropicMode);
            const maxAniso = (this.scene.getEngine().getCaps().maxAnisotropy || 8);
            layer.alphaDT.anisotropicFilteringLevel = Math.min(16, maxAniso);
        } catch (_) {}

        let fontPx = Math.floor(size.height * config.fontSizeScale);
        const aCtx = layer.alphaDT.getContext('2d', { willReadFrequently: true });
        if (!aCtx) return;
        aCtx.clearRect(0, 0, size.width, size.height);
        aCtx.fillStyle = 'black';
        aCtx.fillRect(0, 0, size.width, size.height);
        aCtx.textAlign = 'center';
        aCtx.textBaseline = 'middle';
        while (fontPx > 24) {
            aCtx.font = `${config.fontStyle} ${config.fontWeight} ${fontPx}px ${fontName}`;
            if (aCtx.measureText(text).width <= size.width * 0.9) break;
            fontPx -= 4;
        }
        const font = `${config.fontStyle} ${config.fontWeight} ${fontPx}px ${fontName}`;
        aCtx.font = font;
        if (config.letterSpacing) aCtx.letterSpacing = `${config.letterSpacing}px`;
        try { aCtx.filter = `blur(${blurPx}px)`; } catch (_) {}
        aCtx.fillStyle = 'white';
        aCtx.fillText(text, size.width / 2, size.height / 2);
        try { aCtx.filter = 'none'; } catch (_) {}
        layer.alphaDT.update(true);

        layer.aoDT = new BABYLON.DynamicTexture(`engravingAODT_${id}`, size, this.scene, true);
        const aoCtx = layer.aoDT.getContext('2d', { willReadFrequently: true });
        if (!aoCtx) return;
        aoCtx.clearRect(0, 0, size.width, size.height);
        aoCtx.fillStyle = 'black';
        aoCtx.fillRect(0, 0, size.width, size.height);
        try { aoCtx.filter = `blur(${blurPx}px)`; } catch (_) {}
        aoCtx.font = font;
        if (config.letterSpacing) aoCtx.letterSpacing = `${config.letterSpacing}px`;
        aoCtx.fillStyle = 'white';
        aoCtx.textAlign = 'center';
        aoCtx.textBaseline = 'middle';
        aoCtx.fillText(text, size.width / 2, size.height / 2);
        try { aoCtx.filter = 'none'; } catch (_) {}
        layer.aoDT.update(true);

        this.buildNormalFromAO(layer, id);
        this.applyToMesh(zone.mesh, layer.alphaDT, layer.aoDT, layer.normalDT);
        this.alphaDT = layer.alphaDT;
        this.aoDT = layer.aoDT;
        this.normalDT = layer.normalDT;
    }

    getAspect(meshName) {
        const meshes = this.sceneMeshes(meshName);
        const targetMesh = meshes[0];
        if (!targetMesh) return 1;
        const ext = targetMesh.getBoundingInfo().boundingBox.extendSize;
        const size = new BABYLON.Vector3(ext.x * 2, ext.y * 2, ext.z * 2);
        const dims = [size.x, size.y, size.z].sort((a, b) => b - a);
        const width = Math.max(0.0001, dims[0]);
        const height = Math.max(0.0001, dims[1]);
        return Math.max(0.1, Math.min(10, width / height));
    }

    buildNormalFromAO(layer, id) {
        const aoDT = layer.aoDT;
        const size = aoDT.getSize();
        const width = size.width;
        const height = size.height;
        const srcCtx = aoDT.getContext('2d', { willReadFrequently: true }) || aoDT.getContext();
        if (!srcCtx) return;
        if (this._procCanvas.width !== width || this._procCanvas.height !== height) {
            this._procCanvas.width = width;
            this._procCanvas.height = height;
            this._procCtx = this._procCanvas.getContext('2d', { willReadFrequently: true });
        }
        this._procCtx.clearRect(0, 0, width, height);
        this._procCtx.drawImage(srcCtx.canvas, 0, 0);
        const bd = this._procCtx.getImageData(0, 0, width, height).data;
        layer.normalDT = new BABYLON.DynamicTexture(`engravingNormalDT_${id}`, { width, height }, this.scene, true);
        const nCtx = layer.normalDT.getContext();
        if (!nCtx) return;
        const nImg = nCtx.createImageData(width, height);
        const nd = nImg.data;
        const idxAt = (x, y) => (y * width + x) * 4;
        const redAt = (x, y) => bd[idxAt(x, y)] / 255;
        const strength = 6.0;
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const tl = redAt(x - 1, y - 1), t = redAt(x, y - 1), tr = redAt(x + 1, y - 1);
                const l = redAt(x - 1, y), r = redAt(x + 1, y);
                const bl = redAt(x - 1, y + 1), b = redAt(x, y + 1), br = redAt(x + 1, y + 1);
                const dX = (tr + 2 * r + br) - (tl + 2 * l + bl);
                const dY = (bl + 2 * b + br) - (tl + 2 * t + tr);
                let nx = -dX, ny = -dY, nz = 5.0 / strength;
                const len = Math.hypot(nx, ny, nz) || 1.0;
                nx /= len; ny /= len; nz /= len;
                const i = idxAt(x, y);
                nd[i] = (nx + 1.0) * 127.5;
                nd[i + 1] = (ny + 1.0) * 127.5;
                nd[i + 2] = (nz + 1.0) * 127.5;
                nd[i + 3] = 255;
            }
        }
        nCtx.putImageData(nImg, 0, 0);
        layer.normalDT.update(true);
        try {
            layer.normalDT.gammaSpace = false;
            const anisotropicMode = BABYLON.Texture.ANISOTROPIC_SAMPLINGMODE || BABYLON.Texture.TRILINEAR_SAMPLINGMODE;
            layer.normalDT.updateSamplingMode(anisotropicMode);
            const maxAniso = (this.scene.getEngine().getCaps().maxAnisotropy || 8);
            layer.normalDT.anisotropicFilteringLevel = Math.min(16, maxAniso);
        } catch (_) {}
    }

    applyToMesh(meshName, opacity, ambient, normal) {
        this.sceneMeshes(meshName).forEach(mesh => {
            const pbr = (mesh.material && mesh.material instanceof BABYLON.PBRMaterial) ? mesh.material : null;
            if (!pbr) return;
            if (!opacity) pbr.opacityTexture = null;
            else {
                pbr.opacityTexture = opacity;
                pbr.opacityTexture.getAlphaFromRGB = true;
                pbr.opacityTexture.vFlip = false;
                pbr.transparencyMode = BABYLON.PBRMaterial.PBRMATERIAL_ALPHABLEND;
                pbr.forceAlphaTest = false;
                pbr.alphaCutOff = 0.0;
                pbr.needDepthPrePass = true;
                try { pbr.opacityTexture.updateSamplingMode(BABYLON.Texture.TRILINEAR_SAMPLINGMODE); } catch (_) {}
                pbr.unlit = false;
            }
            if (!normal) pbr.bumpTexture = null;
            else {
                pbr.bumpTexture = normal;
                pbr.bumpTexture.level = 2.8;
                try {
                    const anisotropicMode = BABYLON.Texture.ANISOTROPIC_SAMPLINGMODE || BABYLON.Texture.TRILINEAR_SAMPLINGMODE;
                    pbr.bumpTexture.updateSamplingMode(anisotropicMode);
                    const maxAniso = (this.scene.getEngine().getCaps().maxAnisotropy || 8);
                    pbr.bumpTexture.anisotropicFilteringLevel = Math.min(16, maxAniso);
                } catch (_) {}
                pbr.bumpTexture.vFlip = false;
                pbr.invertNormalMapX = false;
                pbr.invertNormalMapY = false;
            }
            if (!ambient) pbr.ambientTexture = null;
            else {
                pbr.ambientTexture = ambient;
                try { pbr.ambientTexture.gammaSpace = false; } catch (_) {}
                pbr.ambientTexture.vFlip = false;
                if ('ambientTextureStrength' in pbr) pbr.ambientTextureStrength = 1.0;
                pbr.ambientTexture.level = 1.0;
            }
            pbr.markAsDirty(BABYLON.Material.TextureDirtyFlag);
        });
    }
}

window.EngravingManager = EngravingManager;
window.engravingManager = null;
