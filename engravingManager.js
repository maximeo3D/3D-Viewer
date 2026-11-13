// engravingManager.js - Gravure par zone, profil de fraise (profondeur + angle)
// Le texte donne un masque ; la distance au bord de chaque pixel donne la profondeur
// d'une fraise conique : depth = min(profondeur, distance * tan(angle)).
// On en dérive l'alpha (masque), la normal map (pente) et la diffuse (ombre de cavité).

const ENGRAVING_DEFAULT_DEPTH = 0.4;
const ENGRAVING_DEFAULT_ANGLE = 45;
const ENGRAVING_UNITS_PER_MM = 0.1;
const ENGRAVING_MAX_TEXTURE = 4096;
const ENGRAVING_BASE_HEIGHT = 1024;
const ENGRAVING_SHADE_STRENGTH = 0.75;

function edt1d(f, n, d, v, z) {
    let k = 0;
    v[0] = 0;
    z[0] = -Infinity;
    z[1] = Infinity;
    for (let q = 1; q < n; q++) {
        let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
        while (s <= z[k]) {
            k--;
            s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
        }
        k++;
        v[k] = q;
        z[k] = s;
        z[k + 1] = Infinity;
    }
    k = 0;
    for (let q = 0; q < n; q++) {
        while (z[k + 1] < q) k++;
        const dq = q - v[k];
        d[q] = dq * dq + f[v[k]];
    }
}

// Distance euclidienne (en pixels) de chaque pixel intérieur au pixel extérieur le plus proche.
function boxBlur(src, width, height, radius) {
    const tmp = new Float32Array(src.length);
    const out = new Float32Array(src.length);
    const span = 2 * radius + 1;
    for (let y = 0; y < height; y++) {
        const row = y * width;
        let sum = 0;
        for (let x = -radius; x <= radius; x++) sum += src[row + Math.min(width - 1, Math.max(0, x))];
        for (let x = 0; x < width; x++) {
            tmp[row + x] = sum / span;
            sum += src[row + Math.min(width - 1, x + radius + 1)] - src[row + Math.max(0, x - radius)];
        }
    }
    for (let x = 0; x < width; x++) {
        let sum = 0;
        for (let y = -radius; y <= radius; y++) sum += tmp[Math.min(height - 1, Math.max(0, y)) * width + x];
        for (let y = 0; y < height; y++) {
            out[y * width + x] = sum / span;
            sum += tmp[Math.min(height - 1, y + radius + 1) * width + x] - tmp[Math.max(0, y - radius) * width + x];
        }
    }
    return out;
}

function insideDistance(inside, width, height) {
    const INF = 1e20;
    const grid = new Float64Array(width * height);
    for (let i = 0; i < grid.length; i++) grid[i] = inside[i] ? INF : 0;
    const maxDim = Math.max(width, height);
    const f = new Float64Array(maxDim);
    const d = new Float64Array(maxDim);
    const v = new Int32Array(maxDim);
    const z = new Float64Array(maxDim + 1);
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) f[y] = grid[y * width + x];
        edt1d(f, height, d, v, z);
        for (let y = 0; y < height; y++) grid[y * width + x] = d[y];
    }
    for (let y = 0; y < height; y++) {
        const row = y * width;
        for (let x = 0; x < width; x++) f[x] = grid[row + x];
        edt1d(f, width, d, v, z);
        for (let x = 0; x < width; x++) grid[row + x] = d[x];
    }
    const out = new Float32Array(width * height);
    for (let i = 0; i < out.length; i++) out[i] = inside[i] ? Math.sqrt(grid[i]) : 0;
    return out;
}

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

const ENGRAVING_MAPS = ['alphaDT', 'detailTex', 'aoDT'];
const ENGRAVING_FLAT_NORMAL = 'engravingDetailFlat';

class EngravingManager {
    constructor(scene, assetConfig) {
        this.scene = scene;
        this.assetConfig = assetConfig;
        this.layers = new Map();
        this.pending = new Map();
        this.text = '';
        this.currentFont = 'Stencil';
        this.fontConfigs = {};
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
        if (texture.name && /^engraving(DT|AODT|NormalDT|DiffuseDT|Detail)/.test(texture.name)) return true;
        for (const layer of this.layers.values()) {
            if (ENGRAVING_MAPS.some(key => layer[key] === texture)) return true;
        }
        return false;
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

    // Profondeur (mm) et angle (°) d'une zone ; l'angle est mesuré depuis la surface (90° = paroi verticale).
    setProfile(id, profile) {
        const zone = this.zone(id);
        if (!zone || !profile) return;
        if (profile.depth !== undefined) zone.depth = Number(profile.depth);
        if (profile.angle !== undefined) zone.angle = Number(profile.angle);
        this.scheduleZone(zone.id);
    }

    scheduleZone(id) {
        if (this.pending.has(id)) return;
        this.pending.set(id, requestAnimationFrame(() => {
            this.pending.delete(id);
            this.updateZone(id);
        }));
    }

    async applyAll() {
        this.syncFonts();
        const keep = new Set(this.engravings().map(zone => zone.id));
        Array.from(this.layers.keys()).forEach(id => {
            if (keep.has(id)) return;
            const layer = this.layers.get(id);
            if (layer && layer.mesh) this.applyToMesh(layer.mesh, null);
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
            this.applyToMesh(zone.mesh, layer);
        });
        if (window.tagManager && window.tagManager.applySceneVisibility) window.tagManager.applySceneVisibility();
    }

    update() {
        this.applyAll();
    }

    disposeLayer(layer) {
        if (!layer) return;
        ENGRAVING_MAPS.forEach(key => {
            if (layer[key]) {
                try { layer[key].dispose(); } catch (_) {}
                layer[key] = null;
            }
        });
        layer.mask = null;
    }

    sceneMeshes(meshName) {
        if (!this.scene || !meshName) return [];
        return this.scene.meshes.filter(mesh => mesh && (mesh.name === meshName || mesh.name.startsWith(meshName + '_primitive')));
    }

    // Longueur (unités scène) couverte par toute la plage U puis V, lue sur le plus grand triangle du mesh.
    getMeshSize(meshName) {
        const targetMesh = this.sceneMeshes(meshName).find(mesh => mesh.getTotalVertices && mesh.getTotalVertices() > 0);
        if (!targetMesh) return { width: 1, height: 1 };
        const fromUv = this.uvSpan(targetMesh);
        if (fromUv) return fromUv;
        const ext = targetMesh.getBoundingInfo().boundingBox.extendSize;
        const dims = [ext.x * 2, ext.y * 2, ext.z * 2].sort((a, b) => b - a);
        return { width: Math.max(0.0001, dims[0]), height: Math.max(0.0001, dims[1]) };
    }

    uvSpan(mesh) {
        const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
        const uvs = mesh.getVerticesData(BABYLON.VertexBuffer.UVKind);
        const indices = mesh.getIndices();
        if (!positions || !uvs || !indices || indices.length < 3) return null;
        const scale = mesh.absoluteScaling || new BABYLON.Vector3(1, 1, 1);
        let best = null;
        let bestArea = 0;
        for (let t = 0; t < indices.length; t += 3) {
            const a = indices[t], b = indices[t + 1], c = indices[t + 2];
            const du1 = uvs[b * 2] - uvs[a * 2], dv1 = uvs[b * 2 + 1] - uvs[a * 2 + 1];
            const du2 = uvs[c * 2] - uvs[a * 2], dv2 = uvs[c * 2 + 1] - uvs[a * 2 + 1];
            const det = du1 * dv2 - du2 * dv1;
            const area = Math.abs(det);
            if (area <= bestArea) continue;
            const e1 = [0, 1, 2].map(k => (positions[b * 3 + k] - positions[a * 3 + k]) * scale.asArray()[k]);
            const e2 = [0, 1, 2].map(k => (positions[c * 3 + k] - positions[a * 3 + k]) * scale.asArray()[k]);
            const tangent = e1.map((v, k) => (v * dv2 - e2[k] * dv1) / det);
            const bitangent = e1.map((v, k) => (e2[k] * du1 - v * du2) / det);
            const lu = Math.hypot(...tangent), lv = Math.hypot(...bitangent);
            if (!Number.isFinite(lu) || !Number.isFinite(lv) || lu <= 0 || lv <= 0) continue;
            bestArea = area;
            best = { width: lu, height: lv };
        }
        return best;
    }

    textureSize(meshName) {
        const mesh = this.getMeshSize(meshName);
        const aspect = Math.max(0.1, Math.min(10, mesh.width / mesh.height));
        let width = Math.round(ENGRAVING_BASE_HEIGHT * aspect);
        let height = ENGRAVING_BASE_HEIGHT;
        const scale = Math.min(1, ENGRAVING_MAX_TEXTURE / Math.max(width, height));
        width = Math.max(2, Math.round(width * scale));
        height = Math.max(2, Math.round(height * scale));
        return { width, height, worldPerPixel: mesh.width / width };
    }

    ensureMap(layer, key, name, size, linear) {
        const current = layer[key];
        if (current) {
            const s = current.getSize();
            if (s.width === size.width && s.height === size.height) return current;
            try { current.dispose(); } catch (_) {}
        }
        const texture = new BABYLON.DynamicTexture(name, { width: size.width, height: size.height }, this.scene, true);
        if (linear) texture.gammaSpace = false;
        try {
            const anisotropicMode = BABYLON.Texture.ANISOTROPIC_SAMPLINGMODE || BABYLON.Texture.TRILINEAR_SAMPLINGMODE;
            texture.updateSamplingMode(anisotropicMode);
            const maxAniso = (this.scene.getEngine().getCaps().maxAnisotropy || 8);
            texture.anisotropicFilteringLevel = Math.min(16, maxAniso);
        } catch (_) {}
        texture.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
        texture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
        layer[key] = texture;
        return texture;
    }

    // RGBA brut : le format detail map range la normale X dans l'alpha, qu'un canvas prémultiplierait.
    ensureRaw(layer, key, name, size) {
        const current = layer[key];
        if (current) {
            const s = current.getSize();
            if (s.width === size.width && s.height === size.height) return current;
            try { current.dispose(); } catch (_) {}
        }
        const data = new Uint8Array(size.width * size.height * 4);
        const texture = new BABYLON.RawTexture(data, size.width, size.height, BABYLON.Constants.TEXTUREFORMAT_RGBA,
            this.scene, true, false, BABYLON.Texture.TRILINEAR_SAMPLINGMODE, BABYLON.Constants.TEXTURETYPE_UNSIGNED_BYTE);
        texture.name = name;
        texture.gammaSpace = false;
        try {
            const anisotropicMode = BABYLON.Texture.ANISOTROPIC_SAMPLINGMODE || BABYLON.Texture.TRILINEAR_SAMPLINGMODE;
            texture.updateSamplingMode(anisotropicMode);
            const maxAniso = (this.scene.getEngine().getCaps().maxAnisotropy || 8);
            texture.anisotropicFilteringLevel = Math.min(16, maxAniso);
        } catch (_) {}
        texture.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
        texture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
        layer[key] = texture;
        return texture;
    }

    // Masque du texte (couverture 0..1) + distance au bord, mis en cache tant que texte/police/taille ne changent pas.
    buildMask(layer, text, fontName, size) {
        const config = this.fontConfigs[fontName] || {
            fontWeight: 'normal', fontStyle: 'normal', letterSpacing: 0, fontSizeScale: 1
        };
        const key = [text, fontName, size.width, size.height, config.letterSpacing, config.fontSizeScale].join('|');
        if (layer.mask && layer.mask.key === key) return layer.mask;
        const canvas = document.createElement('canvas');
        canvas.width = size.width;
        canvas.height = size.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, size.width, size.height);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const spacing = config.letterSpacing * (size.height / 512);
        if (spacing) ctx.letterSpacing = `${spacing}px`;
        let fontPx = Math.floor(size.height * config.fontSizeScale);
        const minPx = Math.max(12, Math.round(size.height * 0.05));
        while (fontPx > minPx) {
            ctx.font = `${config.fontStyle} ${config.fontWeight} ${fontPx}px "${fontName}"`;
            if (ctx.measureText(text).width <= size.width * 0.9) break;
            fontPx -= Math.max(2, Math.round(fontPx * 0.04));
        }
        ctx.font = `${config.fontStyle} ${config.fontWeight} ${fontPx}px "${fontName}"`;
        ctx.fillStyle = 'white';
        ctx.fillText(text, size.width / 2, size.height / 2);
        const pixels = ctx.getImageData(0, 0, size.width, size.height).data;
        const count = size.width * size.height;
        const coverage = new Float32Array(count);
        const inside = new Uint8Array(count);
        for (let i = 0; i < count; i++) {
            const c = pixels[i * 4] / 255;
            coverage[i] = c;
            inside[i] = c >= 0.5 ? 1 : 0;
        }
        const distance = insideDistance(inside, size.width, size.height);
        for (let i = 0; i < count; i++) {
            if (inside[i]) distance[i] = Math.max(0, distance[i] - 0.5);
        }
        layer.mask = { key, coverage, distance, canvas };
        return layer.mask;
    }

    async updateZone(id) {
        if (!this.scene || !this.assetConfig) return;
        const zone = this.zone(id);
        if (!zone) return;
        this.syncFonts();
        let layer = this.layers.get(id);
        if (!layer) {
            layer = { mesh: zone.mesh, alphaDT: null, detailTex: null, aoDT: null, mask: null, token: 0 };
            this.layers.set(id, layer);
        }
        const token = ++layer.token;
        if (layer.mesh && layer.mesh !== zone.mesh) this.applyToMesh(layer.mesh, null);
        layer.mesh = zone.mesh;
        const text = (zone.text || '').trim();
        if (!zone.mesh || !text) {
            if (zone.mesh) this.applyToMesh(zone.mesh, null);
            this.disposeLayer(layer);
            return;
        }
        const fontName = zone.font || Object.keys(this.fontConfigs)[0] || 'Stencil';
        if (document.fonts && document.fonts.load) {
            try { await document.fonts.load(`16px "${fontName}"`); } catch (_) {}
        }
        if (token !== layer.token) return;

        const size = this.textureSize(zone.mesh);
        const mask = this.buildMask(layer, text, fontName, size);
        this.paintMaps(layer, id, mask, size, zone);
        this.applyToMesh(zone.mesh, layer);
    }

    paintMaps(layer, id, mask, size, zone) {
        const { width, height, worldPerPixel } = size;
        const count = width * height;
        const depthMm = Number.isFinite(Number(zone.depth)) ? Math.max(0, Number(zone.depth)) : ENGRAVING_DEFAULT_DEPTH;
        const angleDeg = Number.isFinite(Number(zone.angle)) ? Math.min(90, Math.max(0, Number(zone.angle))) : ENGRAVING_DEFAULT_ANGLE;
        const maxDepth = depthMm * ENGRAVING_UNITS_PER_MM;
        const slope = angleDeg >= 89.9 ? Infinity : Math.tan(angleDeg * Math.PI / 180);
        const { coverage, distance } = mask;

        const raw = new Float32Array(count);
        for (let i = 0; i < count; i++) {
            if (coverage[i] <= 0) continue;
            const run = distance[i] * worldPerPixel;
            const wall = slope === Infinity ? maxDepth : run * slope;
            raw[i] = Math.min(maxDepth, wall);
        }
        const depth = new Float32Array(count);
        for (let y = 0; y < height; y++) {
            const y0 = Math.max(0, y - 1), y1 = Math.min(height - 1, y + 1);
            for (let x = 0; x < width; x++) {
                const x0 = Math.max(0, x - 1), x1 = Math.min(width - 1, x + 1);
                let sum = 0, n = 0;
                for (let yy = y0; yy <= y1; yy++) {
                    const row = yy * width;
                    for (let xx = x0; xx <= x1; xx++) { sum += raw[row + xx]; n++; }
                }
                depth[y * width + x] = sum / n;
            }
        }

        const alphaDT = this.ensureMap(layer, 'alphaDT', `engravingDT_${id}`, size, false);
        const detailTex = this.ensureRaw(layer, 'detailTex', `engravingDetail_${id}`, size);
        const aoDT = this.ensureMap(layer, 'aoDT', `engravingAODT_${id}`, size, true);
        alphaDT.hasAlpha = true;

        const aCtx = alphaDT.getContext();
        const dCtx = aoDT.getContext();
        const aImg = aCtx.createImageData(width, height);
        const dImg = dCtx.createImageData(width, height);
        const nd = new Uint8Array(count * 4);
        const ad = aImg.data, dd = dImg.data;
        const inv8p = 1 / (8 * worldPerPixel);
        const at = (x, y) => depth[y * width + x];
        const cavityRadius = Math.min(48, Math.max(4, Math.round(maxDepth / worldPerPixel)));
        const surround = boxBlur(depth, width, height, cavityRadius);
        const cavityScale = 1.5 / (cavityRadius * worldPerPixel);

        for (let y = 0; y < height; y++) {
            const ym = y > 0 ? y - 1 : y, yp = y < height - 1 ? y + 1 : y;
            for (let x = 0; x < width; x++) {
                const xm = x > 0 ? x - 1 : x, xp = x < width - 1 ? x + 1 : x;
                const i = y * width + x;
                const o = i * 4;
                const cov = Math.round(coverage[i] * 255);
                ad[o] = cov; ad[o + 1] = cov; ad[o + 2] = cov; ad[o + 3] = 255;

                const dx = ((at(xp, ym) + 2 * at(xp, y) + at(xp, yp)) - (at(xm, ym) + 2 * at(xm, y) + at(xm, yp))) * inv8p;
                const dy = ((at(xm, yp) + 2 * at(x, yp) + at(xp, yp)) - (at(xm, ym) + 2 * at(x, ym) + at(xp, ym))) * inv8p;
                let nx = dx, ny = -dy, nz = 1;
                const len = Math.hypot(nx, ny, nz);
                nx /= len; ny /= len;
                // Detail map : R = diffuse neutre, G = normale Y, B = rugosité neutre, A = normale X ; lignes de bas en haut.
                const r = ((height - 1 - y) * width + x) * 4;
                nd[r] = 128;
                nd[r + 1] = Math.round((ny + 1) * 127.5);
                nd[r + 2] = 128;
                nd[r + 3] = Math.round((nx + 1) * 127.5);

                const occlusion = Math.min(1, Math.max(0, (depth[i] - surround[i]) * cavityScale));
                const shade = Math.round((1 - ENGRAVING_SHADE_STRENGTH * occlusion) * 255);
                dd[o] = shade; dd[o + 1] = shade; dd[o + 2] = shade; dd[o + 3] = 255;
            }
        }
        aCtx.putImageData(aImg, 0, 0);
        dCtx.putImageData(dImg, 0, 0);
        alphaDT.update(true);
        detailTex.update(nd);
        aoDT.update(true);
    }

    getAspect(meshName) {
        const mesh = this.getMeshSize(meshName);
        return Math.max(0.1, Math.min(10, mesh.width / mesh.height));
    }

    applyToMesh(meshName, layer) {
        this.sceneMeshes(meshName).forEach(mesh => {
            const pbr = (mesh.material && mesh.material instanceof BABYLON.PBRMaterial) ? mesh.material : null;
            if (!pbr) return;
            if (!layer || !layer.alphaDT) {
                this.restoreMaterial(pbr);
                return;
            }
            const legacyBump = this.isEngravingTexture(pbr.bumpTexture) && !this.isFlatNormal(pbr.bumpTexture);
            if (legacyBump || this.isEngravingTexture(pbr.albedoTexture)) this.restoreMaterial(pbr);
            pbr.opacityTexture = layer.alphaDT;
            pbr.opacityTexture.getAlphaFromRGB = true;
            pbr.opacityTexture.vFlip = false;
            pbr.transparencyMode = BABYLON.PBRMaterial.PBRMATERIAL_ALPHABLEND;
            pbr.forceAlphaTest = false;
            pbr.alphaCutOff = 0.0;
            pbr.needDepthPrePass = true;
            pbr.unlit = false;

            // La normale de gravure passe par la detail map, que Babylon combine (RNM) avec la normal map du matériau.
            // Sans normal map, Babylon prend un repère tangent inversé pour la detail map seule : on pose une normale plate.
            if (!pbr.bumpTexture) pbr.bumpTexture = this.createFlatNormal();
            const bumpLevel = pbr.bumpTexture.level > 0 ? pbr.bumpTexture.level : 1;
            pbr.detailMap.texture = layer.detailTex;
            pbr.detailMap.isEnabled = true;
            pbr.detailMap.diffuseBlendLevel = 0;
            pbr.detailMap.roughnessBlendLevel = 0;
            pbr.detailMap.bumpLevel = 1 / bumpLevel;
            pbr.detailMap.normalBlendMethod = BABYLON.Material.MATERIAL_NORMALBLENDMETHOD_RNM;

            pbr.ambientTexture = layer.aoDT;
            pbr.ambientTextureStrength = 1;
            pbr.markAsDirty(BABYLON.Material.TextureDirtyFlag);
        });
    }

    createFlatNormal() {
        const texture = new BABYLON.RawTexture(new Uint8Array([128, 128, 255, 255]), 1, 1, BABYLON.Constants.TEXTUREFORMAT_RGBA,
            this.scene, false, false, BABYLON.Texture.NEAREST_SAMPLINGMODE);
        texture.name = ENGRAVING_FLAT_NORMAL;
        texture.gammaSpace = false;
        return texture;
    }

    isFlatNormal(texture) {
        return !!(texture && texture.name === ENGRAVING_FLAT_NORMAL);
    }

    // Retire les cartes de gravure et recharge les textures configurées du matériau.
    restoreMaterial(pbr) {
        let touched = false;
        if (pbr.detailMap && this.isEngravingTexture(pbr.detailMap.texture)) {
            pbr.detailMap.texture = null;
            pbr.detailMap.isEnabled = false;
            touched = true;
        }
        ['opacityTexture', 'bumpTexture', 'albedoTexture', 'ambientTexture'].forEach(slot => {
            if (this.isEngravingTexture(pbr[slot])) {
                if (this.isFlatNormal(pbr[slot])) pbr[slot].dispose();
                pbr[slot] = null;
                touched = true;
            }
        });
        if (!touched) return;
        const all = (typeof materialsConfig !== 'undefined' && materialsConfig && materialsConfig.materials) || null;
        if (all && all[pbr.name] && typeof createPBRMaterial === 'function') {
            createPBRMaterial(all[pbr.name], this.scene, pbr.name);
        }
        pbr.markAsDirty(BABYLON.Material.TextureDirtyFlag);
    }
}

window.EngravingManager = EngravingManager;
window.engravingManager = null;
window.ENGRAVING_DEFAULT_DEPTH = ENGRAVING_DEFAULT_DEPTH;
window.ENGRAVING_DEFAULT_ANGLE = ENGRAVING_DEFAULT_ANGLE;
