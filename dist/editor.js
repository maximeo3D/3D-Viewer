(function () {
    const tabs = [
        ['model', 'Modèle'],
        ['rules', 'Règles'],
        ['materials', 'Matériaux'],
        ['light', 'Éclairage'],
        ['camera', 'Caméra'],
        ['engraving', 'Gravure']
    ];
    const textureSlots = [
        ['albedoTexture', 'Base Color Map'],
        ['metallicTexture', 'Metalness Map'],
        ['microSurfaceTexture', 'Roughness Map'],
        ['ambientTexture', 'Ambient Occlusion'],
        ['opacityTexture', 'Opacity Map'],
        ['bumpTexture', 'Normal Map'],
        ['lightmapTexture', 'Lightmap']
    ];
    const state = {
        tab: 'model',
        material: null,
        rule: null,
        present: new Set(),
        textures: ['None'],
        environments: [],
        started: false
    };

    const $ = (id) => document.getElementById(id);

    function asset() { return window.getAssetConfig(); }
    function materials() { return window.getMaterialsConfig(); }
    function studio() { return window.getStudioConfig(); }
    function partModel() {
        const config = asset();
        config.models = config.models || {};
        if (!config.models.part_model) {
            config.models.part_model = {
                name: 'Modèle',
                file: '',
                format: 'bin',
                dataOffset: 0,
                meshes: {}
            };
        }
        config.models.part_model.meshes = config.models.part_model.meshes || {};
        return config.models.part_model;
    }
    function defaults() {
        const config = asset();
        config.defaults = config.defaults || { rules: {}, engravingText: '', engravingFont: 'Stencil' };
        config.defaults.rules = config.defaults.rules || {};
        return config.defaults;
    }
    function rules() {
        const config = asset();
        config.rules = config.rules || [];
        return config.rules;
    }
    function esc(value) {
        return String(value ?? '').replace(/[&<>"']/g, (char) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[char]));
    }
    function slug(value) {
        const text = String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 32);
        return text || 'option';
    }
    function uniqueId(base, used) {
        let id = slug(base);
        let index = 2;
        while (used.has(id)) id = slug(base) + index++;
        return id;
    }
    function setStatus(message) {
        const status = $('status');
        if (!status) return;
        status.hidden = !message;
        status.textContent = message || '';
    }
    function materialNames() {
        return Object.keys((materials() && materials().materials) || {});
    }
    function meshNames() {
        return Object.keys(partModel().meshes);
    }
    function knownTags() {
        const tags = new Set();
        Object.values(partModel().meshes).forEach(mesh => (mesh.tags || []).forEach(tag => tags.add(tag)));
        rules().forEach(rule => {
            if (rule.showTag) tags.add(rule.showTag);
            (rule.options || []).forEach(option => (option.tags || []).forEach(tag => tags.add(tag)));
        });
        return Array.from(tags);
    }
    function blankMaterial() {
        return {
            type: 'pbr',
            parent: 'none',
            baseColor: '#ffffff',
            metallic: 0,
            roughness: 0.5,
            alpha: 1,
            albedoTexture: 'None',
            metallicTexture: 'None',
            microSurfaceTexture: 'None',
            ambientTexture: 'None',
            opacityTexture: 'None',
            bumpTexture: 'None',
            bumpTextureIntensity: 1,
            lightmapTexture: 'None',
            useLightmapAsShadowmap: true,
            backFaceCulling: true,
            uOffset: 0,
            vOffset: 0,
            uScale: 1,
            vScale: 1,
            wRotation: 0,
            lightmapUVSet: 0
        };
    }
    function resolvedMaterial(name) {
        const all = materials().materials;
        const current = all[name] || {};
        if (current.parent && current.parent !== 'none' && all[current.parent]) {
            return { ...all[current.parent], ...current, parent: current.parent };
        }
        return { ...blankMaterial(), ...current };
    }
    function slotsFor(meshName) {
        const mesh = partModel().meshes[meshName];
        return (mesh && mesh.materialSlots && mesh.materialSlots.length) ? mesh.materialSlots : ['slot1'];
    }
    function fontNames() {
        const configs = window.engravingManager && window.engravingManager.fontConfigs;
        return configs ? Object.keys(configs) : ['Stencil', 'Futuristic', 'Western'];
    }
    function deg(radians) {
        const value = radians * 180 / Math.PI;
        return Math.round(value * 100) / 100;
    }

    function scanMeshes() {
        const scene = window.tagManager && window.tagManager.scene;
        const found = new Map();
        if (scene) {
            scene.meshes.forEach(mesh => {
                if (!mesh.name || mesh.name === '__root__' || mesh.name === 'Main_Models' || mesh.name === 'hdrSkyBox') return;
                const base = mesh.name.replace(/_primitive\d+$/, '');
                const primitive = mesh.name.match(/_primitive(\d+)$/);
                const count = primitive ? Number(primitive[1]) + 1 : 1;
                found.set(base, Math.max(found.get(base) || 0, count));
            });
        }
        const meshes = partModel().meshes;
        found.forEach((count, name) => {
            if (!meshes[name]) {
                meshes[name] = {
                    materialSlots: Array.from({ length: count }, (_, index) => `slot${index + 1}`),
                    tags: []
                };
            }
        });
        state.present = new Set(found.keys());
    }

    function currentOptionId(rule) {
        const active = window.tagManager.getActiveTags();
        if (rule.type === 'visibility') {
            const hits = (rule.options || []).filter(option =>
                (option.tags || []).every(tag => active.activeTags.includes(tag))
            );
            hits.sort((a, b) => (b.tags || []).length - (a.tags || []).length);
            if (hits[0]) return hits[0].id;
        } else if (active.materials) {
            const meshes = new Set();
            (rule.options || []).forEach(option => Object.keys(option.assignments || {}).forEach(name => meshes.add(name)));
            for (const meshName of meshes) {
                if (active.materials[meshName]) return active.materials[meshName];
            }
        }
        return rule.options && rule.options[0] && rule.options[0].id;
    }

    function render() {
        renderTabs();
        renderPanel();
        renderRulebar();
    }

    function renderTabs() {
        $('tabs').innerHTML = tabs.map(([id, label]) =>
            `<button type="button" data-tab="${id}" class="${state.tab === id ? 'active' : ''}">${label}</button>`
        ).join('');
    }

    function renderRulebar() {
        const selects = rules().map(rule => {
            const selected = currentOptionId(rule);
            const options = (rule.options || []).map(option =>
                `<option value="${esc(option.id)}" ${option.id === selected ? 'selected' : ''}>${esc(option.label || option.id)}</option>`
            ).join('');
            return `<label>${esc(rule.label || rule.id)}<select data-rule="${esc(rule.id)}">${options}</select></label>`;
        }).join('');
        const text = (window.tagManager && window.tagManager.engravingText) || '';
        const font = (window.engravingManager && window.engravingManager.currentFont) || defaults().engravingFont;
        const fonts = fontNames().map(name =>
            `<option value="${esc(name)}" ${name === font ? 'selected' : ''}>${esc(name)}</option>`
        ).join('');
        $('rulebar').innerHTML = `
            ${selects}
            <label>Aperçu gravure<input id="live-engraving" value="${esc(text)}" placeholder="Texte"></label>
            <label>Police<select id="live-font">${fonts}</select></label>`;
    }

    function formatNum(value, step) {
        const number = Number(value);
        if (!Number.isFinite(number)) return '0';
        const text = String(step);
        const decimals = text.includes('.') ? text.split('.')[1].length : 0;
        return number.toFixed(decimals);
    }
    function sliderReadout(id, label, shown) {
        return `<input class="slider-readout" id="${id}" value="${shown}" inputmode="decimal" spellcheck="false" aria-label="${esc(label)}">`;
    }
    function sliderField(label, attrs, min, max, step, value, readoutId) {
        const shown = formatNum(value, step);
        return `<label class="field">${label}
            <div class="slider-row">
                <input type="range" min="${min}" max="${max}" step="${step}" ${attrs} data-readout="${readoutId}" value="${shown}">
                ${sliderReadout(readoutId, label, shown)}
            </div>
        </label>`;
    }
    function hasParent(raw) {
        return !!(raw && raw.parent && raw.parent !== 'none' && materials().materials[raw.parent]);
    }
    function isOwn(raw, key) {
        return Object.prototype.hasOwnProperty.call(raw, key);
    }
    function inheritButton(raw, key) {
        if (!hasParent(raw)) return '';
        const own = isOwn(raw, key);
        const title = own
            ? 'Valeur propre. Cocher pour hériter du parent.'
            : 'Hérité du parent. Décocher pour définir une valeur propre.';
        return `<label class="inherit-toggle" title="${esc(title)}"><input type="checkbox" data-inherit-key="${esc(key)}" ${own ? '' : 'checked'}><span class="inherit-box"></span>Hérité</label>`;
    }
    function paramClass(raw, key) {
        if (!hasParent(raw)) return 'param';
        return `param ${isOwn(raw, key) ? 'own' : 'inherited'}`;
    }

    function renderPanel() {
        const builders = {
            model: renderModel,
            rules: renderRules,
            materials: renderMaterials,
            light: renderLight,
            camera: renderCamera,
            engraving: renderEngraving
        };
        const panel = $('panel');
        const scroll = panel.scrollTop;
        panel.innerHTML = builders[state.tab]();
        panel.scrollTop = scroll;
        if (state.tab === 'light') mountEnvPreview();
        else disposeEnvPreview();
    }

    function renderModel() {
        const model = partModel();
        const cards = meshNames().map(name => {
            const mesh = model.meshes[name];
            const tags = (mesh.tags || []).map(tag =>
                `<button type="button" class="ghost" data-action="remove-tag" data-mesh="${esc(name)}" data-tag="${esc(tag)}">${esc(tag)} ×</button>`
            ).join('');
            const absent = state.present.size && !state.present.has(name) ? '<span class="absent">Absent du fichier chargé</span>' : '';
            return `<div class="card">
                <strong>${esc(name)}</strong> ${absent}
                <div class="chips">${tags || '<span class="absent">Aucun tag</span>'}</div>
                <div class="row">
                    <input data-mesh-newtag="${esc(name)}" placeholder="Nouveau tag">
                    <button type="button" class="ghost" data-action="add-mesh-tag" data-mesh="${esc(name)}">Ajouter</button>
                </div>
                <label class="field">Slots matériau
                    <input type="number" min="1" max="8" data-slot-count="${esc(name)}" value="${(mesh.materialSlots || ['slot1']).length}">
                </label>
                <div class="row">
                    <button type="button" class="ghost" data-action="preview-mesh" data-mesh="${esc(name)}">Isoler</button>
                    <button type="button" class="ghost" data-action="remove-mesh" data-mesh="${esc(name)}">Retirer</button>
                </div>
            </div>`;
        }).join('');
        return `
            <div class="stack">
                <label class="field">Fichier<input data-model="file" value="${esc(model.file || '')}" placeholder="part.glb ou part.bin"></label>
                <label class="field">Décalage XOR<input type="number" data-model="dataOffset" value="${Number(model.dataOffset || 0)}"></label>
                <div class="row">
                    <button type="button" data-action="import-bin">Importer un .bin</button>
                    <button type="button" class="ghost" data-action="reload-model">Recharger</button>
                </div>
                <button type="button" class="ghost" data-action="restore-rules">Réafficher selon les règles</button>
            </div>
            ${cards || '<p class="help">Aucun mesh. Importez un modèle puis rechargez.</p>'}
            ${window.lastModelError ? `<p class="help">${esc(window.lastModelError)}</p>` : ''}`;
    }

    function renderRules() {
        const list = rules();
        if (!state.rule && list[0]) state.rule = list[0].id;
        const cards = list.map(rule =>
            `<button type="button" class="ghost ${rule.id === state.rule ? 'active' : ''}" data-action="select-rule" data-id="${esc(rule.id)}">${esc(rule.label || rule.id)}</button>`
        ).join('');
        return `
            <div class="row">
                <button type="button" data-action="add-rule" data-type="visibility">Visibilité</button>
                <button type="button" data-action="add-rule" data-type="material">Matériau</button>
            </div>
            <div class="chips" style="margin:10px 0">${cards}</div>
            ${renderRuleEditor()}`;
    }

    function renderRuleEditor() {
        const rule = rules().find(item => item.id === state.rule);
        if (!rule) return '';
        const opening = defaults().rules[rule.id] || (rule.options[0] && rule.options[0].id) || '';
        const openingOptions = (rule.options || []).map(option =>
            `<option value="${esc(option.id)}" ${option.id === opening ? 'selected' : ''}>${esc(option.label || option.id)}</option>`
        ).join('');
        const extra = rule.type === 'material' ? `
            <label class="field">Tag affiché avec cette règle
                <input data-rule-prop="showTag" value="${esc(rule.showTag || '')}" placeholder="flag">
            </label>
            <label class="field">Masquer ce tag pour l’option
                <select data-rule-prop="hideWhen">
                    <option value="">Jamais</option>
                    ${(rule.options || []).map(option => `<option value="${esc(option.id)}" ${rule.hideWhen === option.id ? 'selected' : ''}>${esc(option.label || option.id)}</option>`).join('')}
                </select>
            </label>` : '';
        return `<div class="card">
            <label class="field">Nom affiché<input data-rule-prop="label" value="${esc(rule.label || '')}"></label>
            <label class="field">Identifiant<input data-rule-prop="id" data-commit="change" value="${esc(rule.id)}"></label>
            <label class="field">Option à l’ouverture du viewer<select data-default-rule="${esc(rule.id)}">${openingOptions}</select></label>
            ${extra}
            <div class="row">
                <button type="button" data-action="add-option">Ajouter une option</button>
                <button type="button" class="ghost" data-action="delete-rule">Supprimer la règle</button>
            </div>
            ${(rule.options || []).map(option => renderOption(rule, option)).join('')}
        </div>`;
    }

    function renderOption(rule, option) {
        let body = '';
        if (rule.type === 'visibility') {
            const checks = knownTags().map(tag =>
                `<label><input type="checkbox" data-option-tag="${esc(tag)}" data-option="${esc(option.id)}" ${(option.tags || []).includes(tag) ? 'checked' : ''}> ${esc(tag)}</label>`
            ).join('');
            body = `<div class="check-list">${checks}</div>
                <div class="row">
                    <input data-new-tag="1" data-option="${esc(option.id)}" placeholder="Tag libre">
                    <button type="button" class="ghost" data-action="add-option-tag" data-option="${esc(option.id)}">Ajouter le tag</button>
                </div>`;
        } else {
            const targets = meshNames();
            const selected = new Set(Object.keys(option.assignments || {}));
            const checks = targets.map(name =>
                `<label><input type="checkbox" data-target-mesh="${esc(name)}" data-option="${esc(option.id)}" ${selected.has(name) ? 'checked' : ''}> ${esc(name)}</label>`
            ).join('');
            const assignments = Object.keys(option.assignments || {}).map(meshName => {
                const selects = slotsFor(meshName).map(slot => {
                    const value = option.assignments[meshName][slot] || '';
                    const mats = materialNames().map(mat =>
                        `<option value="${esc(mat)}" ${mat === value ? 'selected' : ''}>${esc(mat)}</option>`
                    ).join('');
                    return `<label class="field">${esc(meshName)} · ${esc(slot)}
                        <select data-slot-mesh="${esc(meshName)}" data-slot="${esc(slot)}" data-option="${esc(option.id)}">${mats}</select>
                    </label>`;
                }).join('');
                return selects;
            }).join('');
            body = `<div class="check-list">${checks || '<span class="absent">Aucun mesh</span>'}</div>${assignments}`;
        }
        return `<div class="card">
            <div class="grid-2">
                <label class="field">Libellé<input data-option-prop="label" data-option="${esc(option.id)}" value="${esc(option.label || '')}"></label>
                <label class="field">Identifiant<input data-option-prop="id" data-option="${esc(option.id)}" data-commit="change" value="${esc(option.id)}"></label>
            </div>
            ${body}
            <button type="button" class="ghost" data-action="delete-option" data-option="${esc(option.id)}">Supprimer l’option</button>
        </div>`;
    }

    function renderMaterials() {
        const names = materialNames();
        if (!state.material || !names.includes(state.material)) state.material = names[0] || null;
        const options = names.map(name =>
            `<option value="${esc(name)}" ${name === state.material ? 'selected' : ''}>${esc(name)}</option>`
        ).join('');
        return `
            <label class="field">Matériau<select id="material-select">${options}</select></label>
            <div class="row">
                <input id="new-material" placeholder="Nom du matériau">
                <button type="button" data-action="add-material">Créer</button>
            </div>
            ${state.material ? renderMaterialForm(state.material) : ''}`;
    }

    function renderMaterialForm(name) {
        const raw = materials().materials[name];
        const view = resolvedMaterial(name);
        const parents = ['none'].concat(materialNames().filter(item => item !== name)).map(item =>
            `<option value="${esc(item)}" ${view.parent === item ? 'selected' : ''}>${esc(item)}</option>`
        ).join('');
        const slider = (key, label, min, max, step) => {
            const shown = formatNum(view[key], step);
            return `<div class="${paramClass(raw, key)}" data-param="${key}">
                <div class="param-head"><span>${label}</span>${inheritButton(raw, key)}</div>
                <div class="param-body slider-row">
                    <input type="range" min="${min}" max="${max}" step="${step}" data-mat="${key}" data-kind="number" data-readout="out-${key}" value="${shown}">
                    ${sliderReadout(`out-${key}`, label, shown)}
                </div>
            </div>`;
        };
        const textures = textureSlots.map(([key, label]) => {
            const current = view[key] && view[key] !== 'None' ? view[key] : '';
            const files = state.textures.filter(file => file && file !== 'None');
            if (current && !files.includes(current)) files.unshift(current);
            const options = [`<option value="" ${current ? '' : 'selected'}>—</option>`].concat(files.map(file =>
                `<option value="${esc(file)}" ${file === current ? 'selected' : ''}>${esc(file)}</option>`
            )).join('');
            const thumb = current ? `<img src="Textures/${esc(encodeURIComponent(current))}" alt="">` : '';
            return `<div class="${paramClass(raw, key)}" data-param="${key}">
                <div class="param-head"><span>${label}</span>${inheritButton(raw, key)}</div>
                <div class="param-body tex-block">
                    <div class="thumb${current ? '' : ' empty'}">
                        ${thumb}
                        <div class="thumb-actions">
                            <button type="button" class="ghost icon-btn" data-action="import-image" data-slot="${key}" title="Ajouter" aria-label="Ajouter"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></button>
                            <button type="button" class="ghost icon-btn" data-action="clear-texture" data-slot="${key}" title="Supprimer" aria-label="Supprimer" ${current ? '' : 'disabled'}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 4.5h9M6.2 4.5V3.2h3.6v1.3M4.6 4.5l.5 8.2h5.8l.5-8.2" fill="none" stroke="currentColor" stroke-width="1.3"/></svg></button>
                        </div>
                    </div>
                    <select data-mat="${key}" data-tex="1">${options}</select>
                </div>
            </div>`;
        }).join('');
        const uvLabels = { uOffset: 'U Offset', vOffset: 'V Offset', uScale: 'U Scale', vScale: 'V Scale', wRotation: 'Rotation' };
        const numbers = Object.keys(uvLabels).map(key =>
            `<div class="field ${paramClass(raw, key)}" data-param="${key}">
                <div class="param-head"><span>${uvLabels[key]}</span>${inheritButton(raw, key)}</div>
                <input class="param-body" type="number" step="0.01" data-mat="${key}" data-kind="number" value="${view[key] ?? 0}">
            </div>`
        ).join('');
        return `<div class="card">
            <label class="field">Parent<select data-mat="parent">${parents}</select></label>
            <div class="${paramClass(raw, 'baseColor')}" data-param="baseColor">
                <div class="param-head"><span>Base Color</span>${inheritButton(raw, 'baseColor')}</div>
                <div class="param-body">${colorPickerHtml(view.baseColor || '#ffffff', 'material')}</div>
            </div>
            ${slider('metallic', 'Metalness', 0, 1, 0.01)}
            ${slider('roughness', 'Roughness', 0, 1, 0.01)}
            ${slider('alpha', 'Opacity', 0, 1, 0.01)}
            ${slider('bumpTextureIntensity', 'Normal Strength', 0, 5, 0.05)}
            ${textures}
            <details>
                <summary>UV et lightmap</summary>
                <div class="grid-2">
                    ${numbers}
                    <div class="field ${paramClass(raw, 'lightmapUVSet')}" data-param="lightmapUVSet">
                        <div class="param-head"><span>Lightmap UV</span>${inheritButton(raw, 'lightmapUVSet')}</div>
                        <input class="param-body" type="number" min="0" max="1" data-mat="lightmapUVSet" data-kind="number" value="${view.lightmapUVSet || 0}">
                    </div>
                </div>
                <div class="${paramClass(raw, 'useLightmapAsShadowmap')}" data-param="useLightmapAsShadowmap">
                    <div class="param-head"><span>Lightmap en ombre</span>${inheritButton(raw, 'useLightmapAsShadowmap')}</div>
                    <div class="param-body"><input type="checkbox" data-mat="useLightmapAsShadowmap" ${view.useLightmapAsShadowmap ? 'checked' : ''}></div>
                </div>
            </details>
            <div class="row">
                <button type="button" class="ghost" data-action="inherit-material">Tout hériter</button>
                <button type="button" class="ghost" data-action="delete-material">Supprimer</button>
            </div>
        </div>`;
    }

    let envPreview = null;
    let envPreviewToken = 0;

    function disposeEnvPreview() {
        envPreviewToken += 1;
        const current = envPreview;
        envPreview = null;
        if (!current) return;
        try { current.engine.stopRenderLoop(); } catch (_) {}
        try { current.scene.dispose(); } catch (_) {}
        try { current.engine.dispose(); } catch (_) {}
    }

    function mountEnvPreview() {
        disposeEnvPreview();
        const token = envPreviewToken;
        requestAnimationFrame(() => {
            if (token !== envPreviewToken || state.tab !== 'light' || !window.BABYLON) return;
            const canvas = document.querySelector('#panel .env-preview');
            const file = studio().environment && studio().environment.file;
            if (!canvas || !file) return;
            const rect = canvas.getBoundingClientRect();
            const width = Math.max(2, Math.round(rect.width || 280));
            canvas.width = width;
            canvas.height = Math.max(2, Math.round(width / 2));
            try {
                const glCanvas = document.createElement('canvas');
                const previewEngine = new BABYLON.Engine(glCanvas, true, { adaptToDeviceRatio: false, preserveDrawingBuffer: true });
                const previewScene = new BABYLON.Scene(previewEngine);
                previewScene.clearColor = new BABYLON.Color4(0, 0, 0, 1);
                const path = `Textures/HDR/${file}`;
                const texture = /\.hdr$/i.test(file)
                    ? new BABYLON.HDRCubeTexture(path, previewScene, 256, false, false, false, true)
                    : BABYLON.CubeTexture.CreateFromPrefilteredData(path, previewScene);
                previewScene.environmentTexture = texture;
                const sky = previewScene.createDefaultSkybox(texture, true, 50, 0, false);
                if (sky) {
                    sky.isPickable = false;
                    sky.infiniteDistance = true;
                }
                const camera = new BABYLON.FreeCamera('env-face', BABYLON.Vector3.Zero(), previewScene);
                camera.fov = Math.PI / 2;
                camera.minZ = 0.01;
                camera.maxZ = 10000;
                const faceSize = 128;
                const ctx = canvas.getContext('2d');
                const bag = {
                    token,
                    engine: previewEngine,
                    scene: previewScene,
                    camera,
                    sky,
                    canvas,
                    ctx,
                    faces: null,
                    exposure: null
                };
                const faceAims = [
                    [0, Math.PI / 2],
                    [0, -Math.PI / 2],
                    [-Math.PI / 2, Math.PI],
                    [Math.PI / 2, Math.PI],
                    [0, 0],
                    [0, Math.PI]
                ];
                const captureFaces = (exposure) => {
                    previewScene.environmentIntensity = exposure;
                    previewEngine.setSize(faceSize, faceSize);
                    const gl = previewEngine._gl;
                    previewScene.activeCamera = camera;
                    camera.rotationQuaternion = null;
                    camera.upVector.set(0, 1, 0);
                    camera.rotation.set(0, 0, 0);
                    previewScene.render();
                    previewScene.render();
                    const faces = [];
                    const matrices = [];
                    faceAims.forEach(([pitch, yaw]) => {
                        camera.rotation.set(pitch, yaw, 0);
                        matrices.push(Array.from(camera.getViewMatrix(true).m));
                        previewScene.render();
                        previewScene.render();
                        gl.finish();
                        const pixels = new Uint8Array(faceSize * faceSize * 4);
                        gl.readPixels(0, 0, faceSize, faceSize, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
                        faces.push(pixels);
                    });
                    return { faces, matrices };
                };
                const sampleFace = (face, u, v) => {
                    const x = Math.min(faceSize - 1, Math.max(0, Math.floor(u * (faceSize - 1))));
                    const y = Math.min(faceSize - 1, Math.max(0, Math.floor(v * (faceSize - 1))));
                    const index = (y * faceSize + x) * 4;
                    return [face[index], face[index + 1], face[index + 2]];
                };
                const drawEquirect = () => {
                    const image = ctx.createImageData(canvas.width, canvas.height);
                    const output = image.data;
                    const width = canvas.width;
                    const height = canvas.height;
                    for (let y = 0; y < height; y++) {
                        const latitude = Math.PI / 2 - (y / Math.max(1, height - 1)) * Math.PI;
                        const cosLat = Math.cos(latitude);
                        const sinLat = Math.sin(latitude);
                        for (let x = 0; x < width; x++) {
                            const longitude = (x / Math.max(1, width - 1)) * Math.PI * 2 - Math.PI;
                            const dirX = cosLat * Math.sin(longitude);
                            const dirY = sinLat;
                            const dirZ = cosLat * Math.cos(longitude);
                            let faceIndex = 0;
                            let best = -1;
                            let u = 0.5;
                            let v = 0.5;
                            const matrices = bag.matrices || [];
                            for (let index = 0; index < matrices.length; index++) {
                                const matrix = matrices[index];
                                const viewX = matrix[0] * dirX + matrix[4] * dirY + matrix[8] * dirZ;
                                const viewY = matrix[1] * dirX + matrix[5] * dirY + matrix[9] * dirZ;
                                const viewZ = matrix[2] * dirX + matrix[6] * dirY + matrix[10] * dirZ;
                                if (viewZ <= 0.05 || viewZ <= best) continue;
                                const ndcX = viewX / viewZ;
                                const ndcY = viewY / viewZ;
                                if (Math.abs(ndcX) > 1 || Math.abs(ndcY) > 1) continue;
                                best = viewZ;
                                faceIndex = index;
                                u = ndcX * 0.5 + 0.5;
                                v = ndcY * 0.5 + 0.5;
                            }
                            const color = best < 0 ? [0, 0, 0] : sampleFace(bag.faces[faceIndex], u, v);
                            const offset = (y * width + x) * 4;
                            output[offset] = color[0];
                            output[offset + 1] = color[1];
                            output[offset + 2] = color[2];
                            output[offset + 3] = 255;
                        }
                    }
                    ctx.putImageData(image, 0, 0);
                };
                const paint = () => {
                    if (bag.token !== envPreviewToken) return;
                    const reflection = sky && sky.material && sky.material.reflectionTexture;
                    if (reflection && reflection.isReady && !reflection.isReady()) {
                        requestAnimationFrame(paint);
                        return;
                    }
                    const hasColor = (faces) => {
                        if (!faces || faces.length < 6) return false;
                        return faces.every((face) => {
                            let lit = 0;
                            for (let index = 0; index < face.length; index += 64) {
                                if (face[index] + face[index + 1] + face[index + 2] > 24) lit++;
                            }
                            return lit > 4;
                        });
                    };
                    if (!hasColor(bag.faces)) {
                        const next = captureFaces(1);
                        bag.tries = (bag.tries || 0) + 1;
                        if (hasColor(next.faces) || bag.tries > 40) {
                            bag.faces = next.faces;
                            bag.matrices = next.matrices;
                        }
                    }
                    if (!bag.faces) {
                        requestAnimationFrame(paint);
                        return;
                    }
                    drawEquirect();
                    previewEngine.dispose();
                    if (envPreview && envPreview.engine === previewEngine) envPreview = null;
                };
                envPreview = { engine: previewEngine, scene: previewScene };
                requestAnimationFrame(paint);
            } catch (error) {
                console.warn('Prévisualisation environnement impossible', error);
            }
        });
    }

    function renderLight() {
        const env = (studio().environment) || {};
        const files = Array.from(new Set([env.file].concat(state.environments).filter(Boolean)));
        const options = files.map(file =>
            `<option value="${esc(file)}" ${file === env.file ? 'selected' : ''}>${esc(file)}</option>`
        ).join('');
        return `
            <div class="stack">
                <div class="field">Fond
                    ${colorPickerHtml(env.backgroundColor || '#ebebeb', 'background')}
                </div>
                <label class="field">Fichier<select data-env="file">${options}</select></label>
                <canvas class="env-preview" aria-label="Prévisualisation de l'environnement"></canvas>
                <label class="env-visible"><input type="checkbox" data-env="visible" ${env.visible ? 'checked' : ''}> Afficher l'environnement</label>
                <button type="button" data-action="import-env">Importer .env / .hdr</button>
                ${sliderField('Puissance', 'data-env="hdrExposure" data-kind="number"', 0, 5, 0.05, env.hdrExposure ?? 1, 'out-exposure')}
                ${sliderField('Rotation', 'data-env="orientation" data-kind="number"', -180, 180, 1, env.orientation ?? 0, 'out-rotation')}
            </div>`;
    }

    function renderCamera() {
        const camera = studio().camera || {};
        const alpha = deg(camera.alpha || 0);
        const fov = camera.fov > 2 ? camera.fov : deg(camera.fov || 0.8);
        const slider = (key, label, min, max, step, value) =>
            sliderField(label, `data-camera="${key}"`, min, max, step, value, `out-${key}`);
        const views = studio().viewpoints || {};
        const cards = Object.keys(views).map(name => `<div class="card">
            <input data-viewpoint-name="${esc(name)}" value="${esc(name)}">
            <div class="row">
                <button type="button" class="ghost" data-action="goto-view" data-id="${esc(name)}">Aller</button>
                <button type="button" class="ghost" data-action="replace-view" data-id="${esc(name)}">Remplacer</button>
                <button type="button" class="ghost" data-action="delete-view" data-id="${esc(name)}">Supprimer</button>
            </div>
        </div>`).join('');
        return `
            <div class="stack">
                ${slider('alphaDeg', 'Alpha', -180, 360, 1, alpha)}
                ${slider('initialPitch', 'Inclinaison', 5, 175, 0.5, camera.initialPitch ?? 60)}
                ${slider('radius', 'Distance', 0.5, 200, 0.1, camera.radius ?? 10)}
                ${slider('fov', 'Champ', 10, 120, 1, fov)}
                ${slider('minDistance', 'Distance min', 0.1, 100, 0.1, camera.minDistance ?? 1)}
                ${slider('maxDistance', 'Distance max', 1, 300, 0.5, camera.maxDistance ?? 100)}
                ${slider('targetX', 'Cible X', -20, 20, 0.1, camera.targetX ?? 0)}
                ${slider('targetY', 'Cible Y', -20, 20, 0.1, camera.targetY ?? 0)}
                ${slider('targetZ', 'Cible Z', -20, 20, 0.1, camera.targetZ ?? 0)}
                <button type="button" class="ghost" data-action="read-camera">Lire la vue actuelle</button>
            </div>
            <div class="row">
                <input id="new-viewpoint" placeholder="Nom">
                <button type="button" data-action="add-viewpoint">Capturer</button>
            </div>
            ${cards}`;
    }

    function renderEngraving() {
        const selected = meshNames().find(name => (partModel().meshes[name].tags || []).includes('engraving')) || '';
        const choices = ['', ...meshNames()].map(name =>
            `<label><input type="radio" name="engraving-zone" data-engraving-mesh="${esc(name)}" ${name === selected ? 'checked' : ''}> ${name ? esc(name) : 'Aucune'}</label>`
        ).join('');
        const fonts = fontNames().map(name =>
            `<option value="${esc(name)}" ${name === defaults().engravingFont ? 'selected' : ''}>${esc(name)}</option>`
        ).join('');
        return `
            <div class="check-list">${choices}</div>
            <button type="button" class="ghost" data-action="preview-mesh" data-mesh="${esc(selected)}">Isoler la zone</button>
            <div class="stack">
                <label class="field">Texte<input data-default="engravingText" value="${esc(defaults().engravingText || '')}"></label>
                <label class="field">Police<select data-default="engravingFont">${fonts}</select></label>
            </div>`;
    }

    function selectedRule() {
        return rules().find(rule => rule.id === state.rule);
    }

    function markOwn(key) {
        const row = document.querySelector(`[data-param="${CSS.escape(key)}"]`);
        if (!row) return;
        row.classList.remove('inherited');
        row.classList.add('own');
        const box = row.querySelector('[data-inherit-key]');
        if (box) box.checked = false;
    }

    function clamp01(value) {
        return Math.min(1, Math.max(0, value));
    }
    function hexToRgb(hex) {
        let text = String(hex || '').replace('#', '').trim();
        if (text.length === 3) text = text.split('').map(char => char + char).join('');
        if (!/^[0-9a-fA-F]{6}$/.test(text)) text = 'ffffff';
        return {
            r: parseInt(text.slice(0, 2), 16),
            g: parseInt(text.slice(2, 4), 16),
            b: parseInt(text.slice(4, 6), 16)
        };
    }
    function channelByte(value) {
        return Math.max(0, Math.min(255, Math.round(Number(value) || 0))).toString(16).padStart(2, '0');
    }
    function rgbToHex(r, g, b) {
        return '#' + channelByte(r) + channelByte(g) + channelByte(b);
    }
    function rgbToHsv(r, g, b) {
        const red = r / 255;
        const green = g / 255;
        const blue = b / 255;
        const max = Math.max(red, green, blue);
        const min = Math.min(red, green, blue);
        const delta = max - min;
        let hue = 0;
        if (delta !== 0) {
            if (max === red) hue = ((green - blue) / delta) % 6;
            else if (max === green) hue = (blue - red) / delta + 2;
            else hue = (red - green) / delta + 4;
            hue *= 60;
            if (hue < 0) hue += 360;
        }
        return { h: hue, s: max === 0 ? 0 : delta / max, v: max };
    }
    function hsvToRgb(h, s, v) {
        const hue = ((h % 360) + 360) % 360;
        const chroma = v * s;
        const x = chroma * (1 - Math.abs((hue / 60) % 2 - 1));
        const m = v - chroma;
        let red = 0;
        let green = 0;
        let blue = 0;
        if (hue < 60) { red = chroma; green = x; }
        else if (hue < 120) { red = x; green = chroma; }
        else if (hue < 180) { green = chroma; blue = x; }
        else if (hue < 240) { green = x; blue = chroma; }
        else if (hue < 300) { red = x; blue = chroma; }
        else { red = chroma; blue = x; }
        return { r: (red + m) * 255, g: (green + m) * 255, b: (blue + m) * 255 };
    }
    function colorPickerHtml(hexValue, target) {
        const rgb = hexToRgb(hexValue);
        const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
        const hue = Math.round(hsv.h);
        const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
        return `<div class="color-picker" data-color-picker data-color-target="${target || 'material'}" data-h="${hue}" data-s="${hsv.s}" data-v="${hsv.v}">
            <div class="color-sv" data-sv style="background:hsl(${hue},100%,50%)">
                <div class="color-sv-white"></div>
                <div class="color-sv-black"></div>
                <div class="color-cursor" data-sv-cursor style="left:${hsv.s * 100}%;top:${(1 - hsv.v) * 100}%"></div>
            </div>
            <input type="range" class="color-hue" min="0" max="360" step="1" data-hue value="${hue}" aria-label="Teinte">
            <div class="color-values">
                <label>R<input type="number" min="0" max="255" step="1" data-rgb="r" value="${Math.round(rgb.r)}"></label>
                <label>G<input type="number" min="0" max="255" step="1" data-rgb="g" value="${Math.round(rgb.g)}"></label>
                <label>B<input type="number" min="0" max="255" step="1" data-rgb="b" value="${Math.round(rgb.b)}"></label>
                <input class="color-hex" data-hex value="${esc(hex)}" spellcheck="false" maxlength="7" aria-label="Hexadécimal">
            </div>
        </div>`;
    }
    function applyColorPicker(root, hsv, skipHex) {
        const hue = ((Number(hsv.h) % 360) + 360) % 360;
        const saturation = clamp01(Number(hsv.s) || 0);
        const value = clamp01(Number(hsv.v) || 0);
        root.dataset.h = String(hue);
        root.dataset.s = String(saturation);
        root.dataset.v = String(value);
        const rgb = hsvToRgb(hue, saturation, value);
        const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
        root.querySelector('[data-sv]').style.background = `hsl(${hue}, 100%, 50%)`;
        const cursor = root.querySelector('[data-sv-cursor]');
        cursor.style.left = (saturation * 100) + '%';
        cursor.style.top = ((1 - value) * 100) + '%';
        const hueInput = root.querySelector('[data-hue]');
        if (document.activeElement !== hueInput) hueInput.value = String(Math.round(hue));
        ['r', 'g', 'b'].forEach(channel => {
            const input = root.querySelector(`[data-rgb="${channel}"]`);
            if (document.activeElement !== input) input.value = String(Math.round(rgb[channel]));
        });
        const hexInput = root.querySelector('[data-hex]');
        if (!skipHex && document.activeElement !== hexInput) hexInput.value = hex;
        if (root.dataset.colorTarget === 'background') {
            window.applyEnvironment({ backgroundColor: hex }, { reloadTexture: false });
        } else if (state.material) {
            writeMaterial(state.material, 'baseColor', hex);
        }
    }
    function updateColorFromControl(target) {
        const root = target.closest('[data-color-picker]');
        if (!root) return;
        if (target.dataset.hue !== undefined) {
            applyColorPicker(root, { h: Number(target.value), s: Number(root.dataset.s), v: Number(root.dataset.v) });
            return;
        }
        if (target.dataset.rgb) {
            const rgb = {
                r: Number(root.querySelector('[data-rgb="r"]').value),
                g: Number(root.querySelector('[data-rgb="g"]').value),
                b: Number(root.querySelector('[data-rgb="b"]').value)
            };
            applyColorPicker(root, rgbToHsv(rgb.r, rgb.g, rgb.b));
            return;
        }
        if (target.dataset.hex !== undefined) {
            const match = target.value.trim().match(/^#?([0-9a-fA-F]{6})$/);
            if (!match) return;
            const rgb = hexToRgb(match[1]);
            applyColorPicker(root, rgbToHsv(rgb.r, rgb.g, rgb.b), true);
        }
    }
    function onColorPointerDown(event) {
        const sv = event.target.closest('[data-sv]');
        if (!sv || event.button !== 0) return;
        const root = sv.closest('[data-color-picker]');
        event.preventDefault();
        const drag = (pointer) => {
            const rect = sv.getBoundingClientRect();
            applyColorPicker(root, {
                h: Number(root.dataset.h) || 0,
                s: clamp01((pointer.clientX - rect.left) / rect.width),
                v: clamp01(1 - (pointer.clientY - rect.top) / rect.height)
            });
        };
        const stop = () => {
            window.removeEventListener('pointermove', drag);
            window.removeEventListener('pointerup', stop);
        };
        window.addEventListener('pointermove', drag);
        window.addEventListener('pointerup', stop);
        drag(event);
    }

    function writeMaterial(name, key, value) {
        const mat = materials().materials[name];
        if (!mat) return;
        mat[key] = value;
        window.refreshMaterials();
        markOwn(key);
    }

    function onInput(event) {
        const target = event.target;
        if (target.closest('[data-color-picker]')) {
            updateColorFromControl(target);
            return;
        }
        if (target.type === 'checkbox' || target.dataset.commit === 'change') return;
        if (target.classList.contains('slider-readout')) return;
        if (target.dataset.readout) {
            const output = document.getElementById(target.dataset.readout);
            if (output) output.value = formatNum(target.value, target.step || 1);
        }
        if (target.dataset.model) {
            const model = partModel();
            model[target.dataset.model] = target.dataset.model === 'dataOffset' ? Number(target.value) : target.value;
            if (target.dataset.model === 'file') model.format = /\.bin$/i.test(target.value) ? 'bin' : model.format;
            return;
        }
        if (target.dataset.mat && state.material) {
            const value = target.dataset.kind === 'number' ? Number(target.value) : target.value;
            writeMaterial(state.material, target.dataset.mat, value);
            return;
        }
        if (target.dataset.env) {
            const value = target.dataset.kind === 'number' ? Number(target.value) : target.value;
            window.applyEnvironment({ [target.dataset.env]: value }, { reloadTexture: false });
            return;
        }
        if (target.dataset.camera) {
            applyCameraField(target.dataset.camera, Number(target.value));
            return;
        }
        if (target.dataset.ruleProp && target.dataset.ruleProp !== 'id') {
            const rule = selectedRule();
            if (rule) {
                rule[target.dataset.ruleProp] = target.value;
                renderRulebar();
            }
            return;
        }
        if (target.dataset.optionProp === 'label') {
            const rule = selectedRule();
            const option = rule && (rule.options || []).find(item => item.id === target.dataset.option);
            if (option) {
                option.label = target.value;
                renderRulebar();
            }
            return;
        }
        if (target.dataset.default) {
            defaults()[target.dataset.default] = target.value;
            if (target.dataset.default === 'engravingText') window.viewer.setEngravingText(target.value);
        }
    }

    function applyCameraField(key, value) {
        if (key === 'alphaDeg') window.applyCameraState({ alpha: value * Math.PI / 180 });
        else if (key === 'fov') window.applyCameraState({ fov: value });
        else if (key === 'initialPitch') window.applyCameraState({ initialPitch: value });
        else window.applyCameraState({ [key]: value });
    }

    function clampSliderValue(range, raw) {
        const min = Number(range.min);
        const max = Number(range.max);
        const step = Number(range.step);
        const text = String(raw).trim().replace(',', '.');
        let value = Number(text);
        if (!text || !Number.isFinite(value)) value = Number(range.value);
        if (!Number.isFinite(value)) value = min;
        value = Math.min(max, Math.max(min, value));
        if (Number.isFinite(step) && step > 0) {
            value = min + Math.round((value - min) / step) * step;
            value = Math.min(max, Math.max(min, value));
        }
        return formatNum(value, Number.isFinite(step) && step > 0 ? step : 1);
    }
    function commitSliderReadout(input) {
        const range = document.querySelector(`#panel input[type="range"][data-readout="${CSS.escape(input.id)}"]`);
        if (!range) return;
        const shown = clampSliderValue(range, input.value);
        const changed = range.value !== shown;
        range.value = shown;
        input.value = shown;
        if (changed) range.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function onChange(event) {
        const target = event.target;
        if (target.classList.contains('slider-readout')) {
            commitSliderReadout(target);
            return;
        }
        if (target.id === 'material-select') {
            state.material = target.value;
            render();
            return;
        }
        if (target.dataset.inheritKey !== undefined) {
            toggleInherit(target.dataset.inheritKey, target.checked);
            return;
        }
        if (target.dataset.commit === 'change' && target.dataset.ruleProp === 'id') return renameRule(target.value);
        if (target.dataset.commit === 'change' && target.dataset.optionProp === 'id') return renameOption(target.dataset.option, target.value);
        if (target.dataset.ruleProp) {
            const rule = selectedRule();
            if (rule) rule[target.dataset.ruleProp] = target.value;
            return;
        }
        if (target.dataset.optionTag) return toggleOptionTag(target.dataset.option, target.dataset.optionTag, target.checked);
        if (target.dataset.targetMesh) return toggleTarget(target.dataset.option, target.dataset.targetMesh, target.checked);
        if (target.dataset.slotMesh) return setSlot(target.dataset.option, target.dataset.slotMesh, target.dataset.slot, target.value);
        if (target.dataset.slotCount) return setSlotCount(target.dataset.slotCount, Number(target.value));
        if (target.dataset.defaultRule) {
            defaults().rules[target.dataset.defaultRule] = target.value;
            return;
        }
        if (target.dataset.default === 'engravingFont') {
            defaults().engravingFont = target.value;
            window.viewer.setEngravingFont(target.value);
            return;
        }
        if (target.dataset.env === 'visible') {
            window.applyEnvironment({ visible: target.checked }, { reloadTexture: false });
            return;
        }
        if (target.dataset.env === 'file') {
            window.applyEnvironment({ file: target.value }, { reloadTexture: true });
            mountEnvPreview();
            return;
        }
        if (target.dataset.mat && state.material) {
            let value = target.type === 'checkbox' ? target.checked : target.value;
            if (target.dataset.kind === 'number') value = Number(target.value);
            if (target.dataset.tex && !value) value = 'None';
            writeMaterial(state.material, target.dataset.mat, value);
            if (target.dataset.mat === 'parent' || target.dataset.tex) render();
            return;
        }
        if (target.dataset.engravingMesh !== undefined) {
            setEngravingZone(target.dataset.engravingMesh);
            render();
            return;
        }
        if (target.dataset.viewpointName) renameViewpoint(target.dataset.viewpointName, target.value.trim());
    }

    async function onClick(event) {
        const button = event.target.closest('[data-action], [data-tab]');
        if (!button) return;
        if (button.dataset.tab) {
            state.tab = button.dataset.tab;
            render();
            return;
        }
        const action = button.dataset.action;
        if (action === 'import-bin') $('file-bin').click();
        else if (action === 'reload-model') await window.reloadModels();
        else if (action === 'restore-rules') await window.viewer.applyDefaults();
        else if (action === 'add-mesh-tag') addMeshTag(button.dataset.mesh);
        else if (action === 'remove-tag') removeMeshTag(button.dataset.mesh, button.dataset.tag);
        else if (action === 'remove-mesh') {
            delete partModel().meshes[button.dataset.mesh];
            render();
        } else if (action === 'preview-mesh') previewMesh(button.dataset.mesh);
        else if (action === 'add-rule') addRule(button.dataset.type);
        else if (action === 'select-rule') {
            state.rule = button.dataset.id;
            render();
        } else if (action === 'add-option') addOption();
        else if (action === 'delete-rule') deleteRule();
        else if (action === 'delete-option') deleteOption(button.dataset.option);
        else if (action === 'add-option-tag') addOptionTag(button.dataset.option);
        else if (action === 'add-material') addMaterial();
        else if (action === 'delete-material') deleteMaterial();
        else if (action === 'inherit-material') inheritMaterial();
        else if (action === 'clear-texture') {
            writeMaterial(state.material, button.dataset.slot, 'None');
            render();
        } else if (action === 'import-image') {
            state.textureSlot = button.dataset.slot;
            $('file-image').click();
        } else if (action === 'import-env') $('file-env').click();
        else if (action === 'read-camera') readCamera();
        else if (action === 'add-viewpoint') addViewpoint();
        else if (action === 'goto-view') window.viewer.gotoViewpoint(button.dataset.id);
        else if (action === 'replace-view') replaceViewpoint(button.dataset.id);
        else if (action === 'delete-view') {
            delete studio().viewpoints[button.dataset.id];
            render();
        }
    }

    function addMeshTag(meshName) {
        const input = document.querySelector(`[data-mesh-newtag="${CSS.escape(meshName)}"]`);
        const tag = input && input.value.trim();
        if (!tag) return;
        const mesh = partModel().meshes[meshName];
        mesh.tags = Array.from(new Set([...(mesh.tags || []), tag]));
        render();
    }
    function removeMeshTag(meshName, tag) {
        const mesh = partModel().meshes[meshName];
        mesh.tags = (mesh.tags || []).filter(item => item !== tag);
        render();
    }
    function setSlotCount(meshName, count) {
        const mesh = partModel().meshes[meshName];
        const total = Math.max(1, Math.min(8, count || 1));
        mesh.materialSlots = Array.from({ length: total }, (_, index) => `slot${index + 1}`);
        rules().forEach(rule => (rule.options || []).forEach(option => {
            const assignment = option.assignments && option.assignments[meshName];
            if (!assignment) return;
            mesh.materialSlots.forEach(slot => {
                if (!assignment[slot]) assignment[slot] = materialNames()[0] || '';
            });
            Object.keys(assignment).forEach(slot => {
                if (!mesh.materialSlots.includes(slot)) delete assignment[slot];
            });
        }));
        render();
    }
    function previewMesh(meshName) {
        if (!meshName || !window.tagManager) return;
        window.tagManager.scene.meshes.forEach(mesh => {
            if (!mesh.name || mesh.name === '__root__' || mesh.name === 'hdrSkyBox') return;
            const base = mesh.name.replace(/_primitive\d+$/, '');
            mesh.setEnabled(base === meshName);
        });
    }
    function setEngravingZone(meshName) {
        Object.entries(partModel().meshes).forEach(([name, mesh]) => {
            const tags = new Set(mesh.tags || []);
            if (meshName && name === meshName) tags.add('engraving');
            else tags.delete('engraving');
            mesh.tags = Array.from(tags);
        });
    }
    function addRule(type) {
        const id = uniqueId(type === 'visibility' ? 'visibilite' : 'materiau', new Set(rules().map(rule => rule.id)));
        const rule = type === 'visibility'
            ? { id, label: 'Visibilité', type, options: [{ id: 'option1', label: 'Option 1', tags: [] }] }
            : { id, label: 'Matériau', type, options: [{ id: 'option1', label: 'Option 1', assignments: {} }] };
        rules().push(rule);
        state.rule = id;
        render();
    }
    function addOption() {
        const rule = selectedRule();
        if (!rule) return;
        const id = uniqueId('option', new Set((rule.options || []).map(option => option.id)));
        const option = { id, label: 'Option' };
        if (rule.type === 'visibility') option.tags = [];
        else option.assignments = {};
        rule.options = rule.options || [];
        rule.options.push(option);
        render();
    }
    function deleteRule() {
        asset().rules = rules().filter(rule => rule.id !== state.rule);
        delete defaults().rules[state.rule];
        state.rule = asset().rules[0] && asset().rules[0].id;
        render();
    }
    function deleteOption(optionId) {
        const rule = selectedRule();
        if (!rule) return;
        rule.options = (rule.options || []).filter(option => option.id !== optionId);
        render();
    }
    function renameRule(nextId) {
        const rule = selectedRule();
        const id = slug(nextId);
        if (!rule || !id || id === rule.id) return render();
        if (rules().some(item => item.id === id)) {
            setStatus('Cet identifiant de règle existe déjà.');
            return render();
        }
        if (defaults().rules[rule.id]) {
            defaults().rules[id] = defaults().rules[rule.id];
            delete defaults().rules[rule.id];
        }
        rule.id = id;
        state.rule = id;
        render();
    }
    function renameOption(previous, nextRaw) {
        const rule = selectedRule();
        const next = slug(nextRaw);
        const option = rule && (rule.options || []).find(item => item.id === previous);
        if (!option || !next || next === previous) return render();
        if (rule.options.some(item => item.id === next)) {
            setStatus('Cet identifiant d’option existe déjà.');
            return render();
        }
        option.id = next;
        if (defaults().rules[rule.id] === previous) defaults().rules[rule.id] = next;
        render();
    }
    function toggleOptionTag(optionId, tag, enabled) {
        const rule = selectedRule();
        const option = rule && (rule.options || []).find(item => item.id === optionId);
        if (!option) return;
        const tags = new Set(option.tags || []);
        if (enabled) tags.add(tag);
        else tags.delete(tag);
        option.tags = Array.from(tags);
        const select = document.querySelector(`#rulebar [data-rule="${CSS.escape(rule.id)}"]`);
        if (select) window.viewer.applyRule(rule.id, select.value);
        renderRulebar();
    }
    function addOptionTag(optionId) {
        const input = Array.from(document.querySelectorAll('[data-new-tag]')).find(item => item.dataset.option === optionId);
        const tag = input && input.value.trim();
        if (!tag) return;
        toggleOptionTag(optionId, tag, true);
        render();
    }
    function toggleTarget(optionId, meshName, enabled) {
        const rule = selectedRule();
        const option = rule && (rule.options || []).find(item => item.id === optionId);
        if (!option) return;
        option.assignments = option.assignments || {};
        if (!enabled) delete option.assignments[meshName];
        else if (!option.assignments[meshName]) {
            const first = materialNames()[0] || '';
            option.assignments[meshName] = {};
            slotsFor(meshName).forEach(slot => { option.assignments[meshName][slot] = first; });
        }
        render();
    }
    function setSlot(optionId, meshName, slot, materialName) {
        const rule = selectedRule();
        const option = rule && (rule.options || []).find(item => item.id === optionId);
        if (!option) return;
        option.assignments[meshName] = option.assignments[meshName] || {};
        option.assignments[meshName][slot] = materialName;
        window.viewer.applyRule(rule.id, optionId);
    }
    function addMaterial() {
        const input = $('new-material');
        const name = input && input.value.trim();
        if (!name) return;
        const all = materials().materials;
        if (all[name]) {
            setStatus('Ce matériau existe déjà.');
            return;
        }
        all[name] = blankMaterial();
        state.material = name;
        render();
    }
    function deleteMaterial() {
        const name = state.material;
        if (!name) return;
        delete materials().materials[name];
        materialNames().forEach(item => {
            if (materials().materials[item].parent === name) materials().materials[item].parent = 'none';
        });
        const fallback = materialNames()[0] || '';
        rules().forEach(rule => (rule.options || []).forEach(option => {
            Object.values(option.assignments || {}).forEach(slots => {
                Object.keys(slots).forEach(slot => {
                    if (slots[slot] === name) slots[slot] = fallback;
                });
            });
        }));
        state.material = materialNames()[0] || null;
        window.viewer.sync();
        window.refreshMaterials();
        render();
    }
    function inheritMaterial() {
        const name = state.material;
        const mat = name && materials().materials[name];
        if (!mat || !mat.parent || mat.parent === 'none') return;
        const parent = mat.parent;
        materials().materials[name] = { type: 'pbr', parent };
        window.refreshMaterials();
        render();
    }
    function toggleInherit(key, inherited) {
        const name = state.material;
        const mat = name && materials().materials[name];
        if (!mat || !hasParent(mat) || !key) return;
        if (inherited) {
            if (isOwn(mat, key)) delete mat[key];
        } else if (!isOwn(mat, key)) {
            const view = resolvedMaterial(name);
            mat[key] = view[key] !== undefined ? view[key] : blankMaterial()[key];
        } else return;
        window.refreshMaterials();
        render();
    }
    function readCamera() {
        const shot = window.captureViewpoint();
        window.applyCameraState({
            alpha: shot.alpha,
            radius: shot.radius,
            fov: shot.fov,
            minDistance: shot.minDistance,
            maxDistance: shot.maxDistance,
            targetX: shot.targetX,
            targetY: shot.targetY,
            targetZ: shot.targetZ,
            initialPitch: deg(shot.beta)
        });
        render();
    }
    function addViewpoint() {
        const input = $('new-viewpoint');
        const name = (input && input.value.trim()) || `Viewpoint${Object.keys(studio().viewpoints || {}).length + 1}`;
        studio().viewpoints = studio().viewpoints || {};
        if (studio().viewpoints[name]) {
            setStatus('Ce viewpoint existe déjà.');
            return;
        }
        studio().viewpoints[name] = window.captureViewpoint();
        render();
    }
    function replaceViewpoint(name) {
        if (studio().viewpoints && studio().viewpoints[name]) {
            studio().viewpoints[name] = window.captureViewpoint();
            setStatus(`Viewpoint ${name} mis à jour.`);
        }
    }
    function renameViewpoint(previous, next) {
        const views = studio().viewpoints || {};
        if (!next || next === previous || views[next]) return render();
        const ordered = {};
        Object.keys(views).forEach(key => { ordered[key === previous ? next : key] = views[key]; });
        studio().viewpoints = ordered;
        render();
    }

    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result).split(',')[1]);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });
    }
    async function upload(folder, file) {
        const dataBase64 = await fileToBase64(file);
        const response = await fetch('api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folder, filename: file.name, dataBase64 })
        });
        if (!response.ok) throw new Error(await response.text());
        return response.json();
    }
    async function postText(path, body) {
        const response = await fetch(path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body
        });
        if (!response.ok) throw new Error(await response.text());
    }
    function serializeAsset(config) {
        return `const assetConfiguration = ${JSON.stringify(config, null, 2)};\n`
            + `if (typeof module !== 'undefined' && module.exports) {\n`
            + `  module.exports = assetConfiguration;\n`
            + `} else {\n`
            + `  window.assetConfig = assetConfiguration;\n`
            + `}\n`;
    }

    async function saveAll() {
        try {
            window.viewer.sync();
            await postText('Assets/asset.js', serializeAsset(asset()));
            await postText('studio.json', JSON.stringify(studio(), null, 2));
            await postText('materials.json', JSON.stringify(materials(), null, 2));
            setStatus('');
        } catch (error) {
            setStatus('Enregistrement impossible. Lancez start-server.bat (le serveur Python ne peut pas écrire les fichiers). ' + error.message);
        }
    }

    function replaceContents(target, source) {
        Object.keys(target).forEach(key => delete target[key]);
        Object.assign(target, source);
    }

    function parseAssetScript(text) {
        const marker = 'const assetConfiguration = ';
        const start = text.indexOf(marker);
        const tail = text.indexOf('if (typeof module');
        if (start < 0 || tail < 0) throw new Error('asset.js illisible');
        let body = text.slice(start + marker.length, tail).trim();
        if (body.endsWith(';')) body = body.slice(0, -1);
        return (new Function('return (' + body + ')'))();
    }

    async function revertAll() {
        const savedFile = partModel().file;
        const stamp = Date.now();
        const [assetText, studioData, materialsData] = await Promise.all([
            fetch('Assets/asset.js?t=' + stamp, { cache: 'no-store' }).then(response => response.text()),
            fetch('studio.json?t=' + stamp, { cache: 'no-store' }).then(response => response.json()),
            fetch('Textures/materials.json?t=' + stamp, { cache: 'no-store' }).then(response => response.json())
        ]);
        window.setAssetConfig(parseAssetScript(assetText));
        replaceContents(studio(), studioData);
        replaceContents(materials(), materialsData);
        window.applyEnvironment(studio().environment || {}, { reloadTexture: true });
        window.applyCameraState(studio().camera || {});
        if (window.tagManager) {
            window.tagManager.materialsConfig = materials();
            window.tagManager.loadTagConfiguration();
        }
        state.material = null;
        state.rule = null;
        if (savedFile !== partModel().file) await window.reloadModels();
        else if (window.viewer) await window.viewer.applyDefaults();
        window.refreshMaterials();
        scanMeshes();
        render();
        setStatus('');
    }

    async function namesFromListing(url, pattern) {
        const response = await fetch(url);
        if (!response.ok) return [];
        const html = await response.text();
        return Array.from(html.matchAll(pattern), (match) => decodeURIComponent(match[1]));
    }
    async function loadLists() {
        try {
            const response = await fetch('api/textures');
            if (response.ok) {
                const data = await response.json();
                state.textures = data.images && data.images.length ? data.images : ['None'];
            }
        } catch (_) {}
        if (state.textures.length <= 1) {
            try {
                const images = await namesFromListing('Textures/', /href="([^"]+\.(?:png|jpe?g|webp))"/gi);
                if (images.length) state.textures = ['None', ...images];
            } catch (_) {}
        }
        if (!state.textures.includes('None')) state.textures.unshift('None');
        try {
            const response = await fetch('api/environments');
            if (response.ok) {
                const data = await response.json();
                state.environments = data.files || [];
            }
        } catch (_) {}
        if (!state.environments.length) {
            try {
                state.environments = await namesFromListing('Textures/HDR/', /href="([^"]+\.(?:hdr|env))"/gi);
            } catch (_) {}
        }
        const current = studio().environment && studio().environment.file;
        if (current && !state.environments.includes(current)) state.environments.unshift(current);
    }

    function start() {
        if (state.started || !window.viewerReady || !window.getAssetConfig()) return;
        state.started = true;
        scanMeshes();
        $('tabs').addEventListener('click', onClick);
        $('panel').addEventListener('click', onClick);
        $('panel').addEventListener('input', onInput);
        $('panel').addEventListener('change', onChange);
        $('panel').addEventListener('keydown', (event) => {
            if (event.key !== 'Enter' || !event.target.classList.contains('slider-readout')) return;
            event.preventDefault();
            event.target.blur();
        });
        $('panel').addEventListener('pointerdown', onColorPointerDown);
        $('panel').addEventListener('focusout', (event) => {
            if (event.target.dataset.hex === undefined) return;
            const root = event.target.closest('[data-color-picker]');
            if (!root) return;
            if (!/^#?[0-9a-fA-F]{6}$/.test(event.target.value.trim())) {
                applyColorPicker(root, {
                    h: Number(root.dataset.h) || 0,
                    s: Number(root.dataset.s) || 0,
                    v: Number(root.dataset.v) || 0
                });
            }
        });
        $('save-all').addEventListener('click', saveAll);
        $('revert-all').addEventListener('click', () => {
            revertAll().catch(error => setStatus('Annulation impossible. ' + error.message));
        });
        $('rulebar').addEventListener('change', (event) => {
            const select = event.target.closest('[data-rule]');
            if (select) window.viewer.applyRule(select.dataset.rule, select.value);
            if (event.target.id === 'live-font') window.viewer.setEngravingFont(event.target.value);
        });
        $('rulebar').addEventListener('input', (event) => {
            if (event.target.id === 'live-engraving') window.viewer.setEngravingText(event.target.value);
        });
        $('file-bin').addEventListener('change', async (event) => {
            const file = event.target.files && event.target.files[0];
            event.target.value = '';
            if (!file) return;
            try {
                setStatus('Import du modèle…');
                await upload('Assets', file);
                const model = partModel();
                model.file = file.name;
                model.format = 'bin';
                await window.reloadModels();
            } catch (error) {
                setStatus('Import impossible. Le serveur d’écriture doit être lancé. ' + error.message);
            }
        });
        $('file-image').addEventListener('change', async (event) => {
            const file = event.target.files && event.target.files[0];
            event.target.value = '';
            if (!file || !state.material || !state.textureSlot) return;
            try {
                await upload('Textures', file);
                if (!state.textures.includes(file.name)) state.textures.push(file.name);
                writeMaterial(state.material, state.textureSlot, file.name);
                render();
                setStatus(`${file.name} importé.`);
            } catch (error) {
                setStatus('Import d’image impossible. ' + error.message);
            }
        });
        $('file-env').addEventListener('change', async (event) => {
            const file = event.target.files && event.target.files[0];
            event.target.value = '';
            if (!file) return;
            try {
                await upload('Textures/HDR', file);
                if (!state.environments.includes(file.name)) state.environments.push(file.name);
                window.applyEnvironment({ file: file.name }, { reloadTexture: true });
                render();
                setStatus(`${file.name} utilisé pour l’éclairage.`);
            } catch (error) {
                setStatus('Import d’environnement impossible. ' + error.message);
            }
        });
        window.addEventListener('viewer-model-loaded', () => {
            scanMeshes();
            setStatus(window.lastModelError ? window.lastModelError : 'Modèle rechargé.');
            render();
        });
        loadLists().then(() => { if (state.tab === 'materials' || state.tab === 'light') render(); });
        bindMaterialPick();
        render();
    }

    function bindMaterialPick() {
        const scene = window.tagManager && window.tagManager.scene;
        if (!scene || state.pickBound || !window.BABYLON) return;
        state.pickBound = true;
        let down = null;
        scene.onPointerObservable.add((evt) => {
            if (!evt.event || evt.event.button !== 0) return;
            if (evt.type === BABYLON.PointerEventTypes.POINTERDOWN) {
                const pick = scene.pick(scene.pointerX, scene.pointerY);
                const mesh = pick && pick.hit && pick.pickedMesh;
                const materialName = mesh && mesh.material && mesh.material.name;
                down = materialName && materialNames().includes(materialName)
                    ? { x: scene.pointerX, y: scene.pointerY, name: materialName }
                    : null;
            } else if (evt.type === BABYLON.PointerEventTypes.POINTERUP && down) {
                const dx = scene.pointerX - down.x;
                const dy = scene.pointerY - down.y;
                const name = down.name;
                down = null;
                if ((dx * dx) + (dy * dy) > 25) return;
                if (!materialNames().includes(name)) return;
                if (state.tab === 'materials' && state.material === name) return;
                state.material = name;
                state.tab = 'materials';
                render();
            }
        });
    }

    window.addEventListener('viewer-api-ready', start);
    setInterval(start, 200);
})();
