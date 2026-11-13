(function () {
    const tabs = [
        ['model', 'Projet', 'cube', 'projet'],
        ['rules', 'Règles', 'list-check', 'rules'],
        ['materials', 'Matériaux', 'swatchbook', 'materials'],
        ['light', 'Éclairage', 'lightbulb', 'light'],
        ['camera', 'Caméra', 'camera', 'camera'],
        ['engraving', 'Gravure', 'pen-nib', 'engraving']
    ];
    const hashByTab = Object.fromEntries(tabs.map(([id, , , hash]) => [id, hash]));
    const tabByHash = {
        projet: 'model',
        project: 'model',
        models: 'model',
        model: 'model',
        modeles: 'model',
        rules: 'rules',
        regles: 'rules',
        materials: 'materials',
        materiaux: 'materials',
        light: 'light',
        eclairage: 'light',
        camera: 'camera',
        engraving: 'engraving',
        gravure: 'engraving'
    };
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
        renameMaterial: false,
        rule: null,
        present: new Set(),
        confirmRule: null,
        openOptions: new Set(),
        fontPicker: null,
        textures: ['None'],
        environments: [],
        started: false
    };

    const ENGINE_CDN = 'https://cdn.jsdelivr.net/gh/maximeo3D/3D-Viewer@v1.0.0';
    const BABYLON_CDN = 'https://cdn.babylonjs.com/v7.54.2';
    const TEXTURE_SLOTS = [
        'albedoTexture', 'metallicTexture', 'microSurfaceTexture',
        'ambientTexture', 'opacityTexture', 'bumpTexture', 'lightmapTexture'
    ];

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
        if (!Array.isArray(config.models.part_model.files)) {
            config.models.part_model.files = config.models.part_model.file
                ? [{ file: config.models.part_model.file, format: config.models.part_model.format || 'bin' }]
                : [];
        }
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
    function engravings() {
        const config = asset();
        config.engravings = config.engravings || [];
        return config.engravings;
    }
    function fontList() {
        const config = asset();
        config.fonts = config.fonts || [];
        return config.fonts;
    }
    function esc(value) {
        return String(value ?? '').replace(/[&<>"']/g, (char) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[char]));
    }
    function cssFontFamily(name) {
        return `'${String(name || '').replace(/\\/g, '').replace(/'/g, '')}'`;
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
    let statusTimer = 0;
    let saveCheckTimer = 0;
    function flashSaveCheck() {
        const mark = $('save-check');
        if (!mark) return;
        window.clearTimeout(saveCheckTimer);
        mark.classList.remove('is-visible');
        void mark.offsetWidth;
        mark.classList.add('is-visible');
        saveCheckTimer = window.setTimeout(() => mark.classList.remove('is-visible'), 2000);
    }
    function setStatus(message) {
        const status = $('status');
        if (!status) return;
        window.clearTimeout(statusTimer);
        status.hidden = !message;
        status.textContent = message || '';
        if (message) statusTimer = window.setTimeout(() => setStatus(''), 5000);
    }
    function materialNames() {
        return Object.keys((materials() && materials().materials) || {});
    }
    function meshNames() {
        return Object.keys(partModel().meshes);
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
    const INHERIT_KEYS = Object.keys(blankMaterial()).filter(key => key !== 'type' && key !== 'parent');
    function resolvedMaterial(name, seen) {
        const all = (materials() && materials().materials) || {};
        const current = all[name] || {};
        const visiting = seen || new Set();
        if (visiting.has(name)) return { ...blankMaterial(), ...current };
        visiting.add(name);
        const parentName = current.parent;
        if (parentName && parentName !== 'none' && all[parentName]) {
            return { ...resolvedMaterial(parentName, visiting), ...current, parent: parentName };
        }
        return { ...blankMaterial(), ...current };
    }
    function slotsFor(meshName) {
        const mesh = partModel().meshes[meshName];
        if (mesh && mesh.slots && mesh.slots.length) return mesh.slots;
        if (mesh && mesh.materialSlots && mesh.materialSlots.length) return mesh.materialSlots;
        return ['Matériau 1'];
    }
    function fontNames() {
        const names = fontList().map(font => font.name).filter(Boolean);
        return names.length ? names : ['Stencil', 'Futuristic', 'Western'];
    }
    function zoneFonts(zone) {
        const names = fontNames();
        const listed = Array.isArray(zone && zone.fonts) ? zone.fonts.filter(name => names.includes(name)) : [];
        if (!listed.length && zone && zone.font && names.includes(zone.font)) listed.push(zone.font);
        return listed;
    }
    function addZoneFont(id, name) {
        const zone = engravings().find(item => item.id === id);
        if (!zone || !name) return;
        zone.fonts = zoneFonts(zone);
        if (!zone.fonts.includes(name)) zone.fonts.push(name);
        if (!zone.font) {
            zone.font = name;
            if (window.viewer) window.viewer.setEngravingFont(zone.id, zone.font);
        }
        state.fontPicker = null;
        render();
    }
    function removeZoneFont(id, name) {
        const zone = engravings().find(item => item.id === id);
        if (!zone) return;
        zone.fonts = zoneFonts(zone).filter(font => font !== name);
        if (zone.font === name) {
            zone.font = zone.fonts[0] || '';
            if (window.viewer && zone.font) window.viewer.setEngravingFont(zone.id, zone.font);
            else refreshEngraving();
        }
        render();
    }
    function placeFontPicker() {
        if (!state.fontPicker) return;
        const wrap = document.querySelector(`[data-font-picker="${CSS.escape(state.fontPicker)}"]`);
        const menu = wrap && wrap.querySelector('.font-picker');
        const button = wrap && wrap.querySelector('[data-action="open-font-picker"]');
        if (!menu || !button) return;
        const rect = button.getBoundingClientRect();
        const width = Math.max(160, menu.offsetWidth);
        let left = rect.left;
        let top = rect.bottom + 4;
        if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - width - 8);
        const height = menu.offsetHeight || 160;
        if (top + height > window.innerHeight - 8) top = Math.max(8, rect.top - 4 - height);
        menu.style.left = `${left}px`;
        menu.style.top = `${top}px`;
    }
    function closeFontPicker() {
        if (!state.fontPicker) return;
        state.fontPicker = null;
        render();
    }
    function deg(radians) {
        const value = radians * 180 / Math.PI;
        return Math.round(value * 100) / 100;
    }
    function wrap180(degrees) {
        let value = degrees % 360;
        if (value > 180) value -= 360;
        if (value < -180) value += 360;
        return value;
    }

    function scanMeshes() {
        const scene = window.tagManager && window.tagManager.scene;
        const found = new Map();
        if (scene) {
            scene.meshes.forEach(mesh => {
        if (!mesh.name || mesh.name === '__root__' || mesh.name.endsWith('__root') || mesh.name === 'Main_Models' || mesh.name === 'hdrSkyBox') return;
                const base = mesh.name.replace(/_primitive\d+$/, '');
                const primitive = mesh.name.match(/_primitive(\d+)$/);
                const count = primitive ? Number(primitive[1]) + 1 : 1;
                found.set(base, Math.max(found.get(base) || 0, count));
            });
        }
        const meshes = partModel().meshes;
        found.forEach((count, name) => {
            if (!meshes[name]) meshes[name] = { slots: ['Matériau 1'], engraving: false };
        });
        state.present = new Set(found.keys());
    }

    function currentOptionId(rule) {
        const choices = window.tagManager && window.tagManager.ruleChoices;
        if (choices && choices[rule.id]) return choices[rule.id];
        const chosen = defaults().rules && defaults().rules[rule.id];
        if (chosen) return chosen;
        return rule.options && rule.options[0] && rule.options[0].id;
    }

    function tabFromHash(hash) {
        const key = String(hash || '').replace(/^#/, '').trim().toLowerCase();
        return tabByHash[key] || null;
    }
    function syncTabHash() {
        const slug = hashByTab[state.tab] || state.tab;
        const next = '#' + slug;
        if (location.hash !== next) history.replaceState(null, '', location.pathname + location.search + next);
    }
    function setTab(id) {
        if (!hashByTab[id]) return;
        state.tab = id;
        state.fontPicker = null;
        state.renameMaterial = false;
        syncTabHash();
        render();
    }
    function render() {
        renderTabs();
        renderPanel();
        renderRulebar();
    }

    function icon(name) {
        return `<i class="fa-solid fa-${name}" aria-hidden="true"></i>`;
    }

    function renderTabs() {
        $('tabs').innerHTML = tabs.map(([id, label, symbol]) =>
            `<button type="button" data-tab="${id}" class="${state.tab === id ? 'active' : ''}">${icon(symbol)}<span>${label}</span></button>`
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
        const engravingFields = engravings().map(zone => {
            const allowed = zoneFonts(zone);
            const active = allowed.includes(zone.font) ? zone.font : allowed[0];
            const fontField = allowed.length ? `<label>Police<select data-live-engraving-font="${esc(zone.id)}">${allowed.map(name =>
                `<option value="${esc(name)}" ${name === active ? 'selected' : ''}>${esc(name)}</option>`
            ).join('')}</select></label>` : '';
            return `<label>${esc(zone.label || zone.id)}<input data-live-engraving="${esc(zone.id)}" value="${esc(zone.text || '')}" placeholder="Texte"></label>
            ${fontField}`;
        }).join('');
        const views = studio().viewpoints || {};
        const active = (state.viewpoint && views[state.viewpoint])
            ? state.viewpoint
            : ((studio().defaultViewpoint && views[studio().defaultViewpoint]) ? studio().defaultViewpoint : '');
        const viewpointOptions = ['<option value="">Aucun</option>'].concat(Object.keys(views).map(name =>
            `<option value="${esc(name)}" ${name === active ? 'selected' : ''}>${esc(name)}</option>`
        )).join('');
        $('rulebar').innerHTML = `
            <label>Viewpoint<select id="live-viewpoint">${viewpointOptions}</select></label>
            ${selects}
            ${engravingFields}
            <a class="rulebar-viewer" href="index.html" target="_blank" rel="noopener" title="Viewer" aria-label="Ouvrir le viewer dans un nouvel onglet">${icon('arrow-up-right-from-square')}</a>`;
    }

    function formatNum(value, step) {
        const number = Number(value);
        if (!Number.isFinite(number)) return '0';
        const text = String(step);
        const decimals = text.includes('.') ? text.split('.')[1].length : 0;
        return number.toFixed(decimals);
    }
    function sliderReadout(id, label, shown, locked) {
        return `<input class="slider-readout" id="${id}" value="${shown}" inputmode="decimal" spellcheck="false" aria-label="${esc(label)}"${locked ? ' disabled' : ''}>`;
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
    function paramLocked(raw, key) {
        return hasParent(raw) && !isOwn(raw, key);
    }
    function isDescendant(name, ancestor) {
        const all = (materials() && materials().materials) || {};
        const seen = new Set();
        let current = name;
        while (current && all[current] && !seen.has(current)) {
            seen.add(current);
            if (all[current].parent === ancestor) return true;
            current = all[current].parent;
        }
        return false;
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
        placeFontPicker();
        if (state.tab === 'materials' && state.renameMaterial) {
            const input = $('rename-material');
            if (input) {
                input.focus();
                input.select();
            }
        }
        if (state.tab === 'light') mountEnvPreview();
        else disposeEnvPreview();
    }

    function renderModel() {
        const model = partModel();
        const files = (model.files || []).filter(item => item && item.file);
        const fileRows = files.map(item => `<div class="row">
                <strong>${esc(item.file)}</strong>
                <button type="button" class="ghost" data-action="remove-model-file" data-file="${esc(item.file)}">Retirer</button>
            </div>`).join('');
        const cards = meshNames().map(name => {
            const mesh = model.meshes[name];
            const absent = state.present.size && !state.present.has(name) ? '<span class="absent">Absent du fichier chargé</span>' : '';
            const zone = mesh.engraving ? '<span class="absent">Zone de gravure</span>' : '';
            const origin = mesh.file ? `<span>${esc(mesh.file)}</span>` : '';
            const slots = slotsFor(name).map(slot => `<span>${esc(slot)}</span>`).join('');
            return `<div class="card">
                <strong>${esc(name)}</strong> ${origin} ${absent} ${zone}
                <div class="chips">${slots}</div>
            </div>`;
        }).join('');
        return `
            <div class="stack">
                <label class="field">Nom du projet<input type="text" data-model="name" value="${esc(model.name || '')}" placeholder="Nouveau projet"></label>
                <div class="row project-actions">
                    <button type="button" class="ghost" data-action="new-project" id="new-project">Nouveau projet</button>
                    <button type="button" class="ghost" data-action="import-project" id="import-project">Importer</button>
                    <button type="button" data-action="export-project" id="export-project">Exporter</button>
                </div>
                <div class="field">Fichiers</div>
                ${fileRows || '<p class="help">Aucun fichier.</p>'}
                <label class="field">Décalage XOR<input type="number" data-model="dataOffset" value="${Number(model.dataOffset || 0)}"></label>
                <div class="row">
                    <button type="button" data-action="import-bin">Importer un .bin</button>
                    <button type="button" class="ghost" data-action="reload-model">Recharger</button>
                </div>
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
            <div class="chips" style="margin:10px 0">
                <button type="button" class="dashed-chip" data-action="add-rule" aria-label="Ajouter une règle">${icon('plus')}</button>
                ${cards}
            </div>
            ${renderRuleEditor()}`;
    }

    function renderRuleEditor() {
        const rule = rules().find(item => item.id === state.rule);
        if (!rule) return '';
        if (state.confirmRule === rule.id) {
            return `<div class="card rule-card rule-confirm">
                <p>Supprimer la règle ?</p>
                <div class="confirm-actions">
                    <button type="button" data-action="confirm-delete-rule">Oui</button>
                    <button type="button" class="ghost" data-action="cancel-delete-rule">Non</button>
                </div>
            </div>`;
        }
        const opening = defaults().rules[rule.id] || (rule.options[0] && rule.options[0].id) || '';
        const openingOptions = (rule.options || []).map(option =>
            `<option value="${esc(option.id)}" ${option.id === opening ? 'selected' : ''}>${esc(option.label || option.id)}</option>`
        ).join('');
        return `<div class="card rule-card">
            <div class="rule-head">
                <label class="field">Nom affiché<input data-rule-prop="label" value="${esc(rule.label || '')}"></label>
                <button type="button" class="icon-btn rule-delete" data-action="delete-rule" title="Supprimer la règle" aria-label="Supprimer la règle">${icon('trash')}</button>
            </div>
            <label class="field">Choix par défaut<select data-default-rule="${esc(rule.id)}">${openingOptions}</select></label>
            <button type="button" class="dashed-add" data-action="add-option" aria-label="Ajouter une option">${icon('plus')}</button>
            ${(rule.options || []).map(option => renderOption(rule, option)).join('')}
        </div>`;
    }

    function optionReplacesVisibility(option) {
        const entries = Object.values((option && option.meshes) || {});
        if (!entries.length) return false;
        return !entries.some(effect => effect && effect.materials && Object.keys(effect.materials).length);
    }

    function renderOption(rule, option) {
        const chosen = option.meshes || {};
        const catalog = meshNames();
        const selected = catalog.filter(name => Object.prototype.hasOwnProperty.call(chosen, name))
            .concat(Object.keys(chosen).filter(name => !catalog.includes(name)));
        const available = catalog.filter(name => !Object.prototype.hasOwnProperty.call(chosen, name));
        const meshChoices = available.map(name => `<option value="${esc(name)}">${esc(name)}</option>`).join('');
        const picker = `<label class="field">Meshes<select data-add-mesh="${esc(option.id)}" ${available.length ? '' : 'disabled'}><option value="">${available.length ? 'Ajouter un mesh' : 'Tous les meshes sont ajoutés'}</option>${meshChoices}</select></label>${optionReplacesVisibility(option) ? '<p class="help">Les meshes non ajoutés sont masqués.</p>' : ''}`;
        const body = selected.map(name => {
            const effect = chosen[name] || {};
            const visible = effect.visible === true ? 'true' : effect.visible === false ? 'false' : '';
            const slots = slotsFor(name).map(slot => {
                const value = (effect.materials && effect.materials[slot]) || '';
                const mats = ['<option value="">Inchangé</option>'].concat(materialNames().map(mat =>
                    `<option value="${esc(mat)}" ${mat === value ? 'selected' : ''}>${esc(mat)}</option>`
                )).join('');
                return `<label class="field">${esc(slot)}
                    <select data-effect-mesh="${esc(name)}" data-effect-slot="${esc(slot)}" data-option="${esc(option.id)}">${mats}</select>
                </label>`;
            }).join('');
            const dash = icon('minus');
            const eye = icon('eye');
            const eyeOff = icon('eye-slash');
            const visButton = (value, label, icon) => {
                const on = visible === value;
                return `<button type="button" class="icon-btn vis-btn${on ? ' active' : ''}" data-action="set-visible" data-effect-mesh="${esc(name)}" data-option="${esc(option.id)}" data-value="${value}" title="${label}" aria-label="${label}" aria-pressed="${on ? 'true' : 'false'}">${icon}</button>`;
            };
            return `<div class="card">
                <div class="mesh-row">
                    <strong>${esc(name)}</strong>
                    <div class="mesh-actions">
                        <button type="button" class="icon-btn mesh-remove" data-action="remove-option-mesh" data-option="${esc(option.id)}" data-mesh="${esc(name)}" title="Retirer ce mesh" aria-label="Retirer ${esc(name)}">${icon('xmark')}</button>
                        <div class="vis-group" role="group" aria-label="Visibilité de ${esc(name)}">
                            ${visButton('', 'Inchangé', dash)}
                            ${visButton('true', 'Visible', eye)}
                            ${visButton('false', 'Masqué', eyeOff)}
                        </div>
                    </div>
                </div>
                ${slots}
            </div>`;
        }).join('');
        const open = state.openOptions.has(rule.id + '\0' + option.id);
        const chevron = open
            ? icon('chevron-down')
            : icon('chevron-right');
        return `<div class="card option-card ${open ? 'is-open' : 'is-collapsed'}">
            <div class="option-head">
                <label class="field">Libellé<input data-option-prop="label" data-option="${esc(option.id)}" value="${esc(option.label || '')}"></label>
                <div class="option-tools">
                    <button type="button" class="icon-btn option-toggle" data-action="toggle-option" data-option="${esc(option.id)}" title="${open ? 'Réduire' : 'Agrandir'}" aria-label="${open ? 'Réduire l’option' : 'Agrandir l’option'}" aria-expanded="${open ? 'true' : 'false'}">${chevron}</button>
                    <div class="option-actions">
                        <button type="button" class="icon-btn option-duplicate" data-action="duplicate-option" data-option="${esc(option.id)}" title="Dupliquer l’option" aria-label="Dupliquer l’option">${icon('clone')}</button>
                        <button type="button" class="icon-btn option-delete" data-action="delete-option" data-option="${esc(option.id)}" title="Supprimer l’option" aria-label="Supprimer l’option">${icon('trash')}</button>
                    </div>
                </div>
            </div>
            ${open ? picker + body : ''}
        </div>`;
    }

    function renderMaterials() {
        const names = materialNames();
        if (!state.material || !names.includes(state.material)) state.material = names[0] || null;
        const options = names.map(name =>
            `<option value="${esc(name)}" ${name === state.material ? 'selected' : ''}>${esc(name)}</option>`
        ).join('');
        return `
            <div class="row material-create">
                <input id="new-material" placeholder="Nom du matériau">
                <button type="button" data-action="add-material">Créer</button>
            </div>
            <div class="rule-head">
                <label class="field">Matériau${state.renameMaterial && state.material
                    ? `<input id="rename-material" type="text" value="${esc(state.material)}" autocomplete="off" spellcheck="false" aria-label="Nouveau nom du matériau">`
                    : `<select id="material-select">${options}</select>`}</label>
                ${state.material ? `<div class="material-tools">
                    <button type="button" class="icon-btn" data-action="rename-material" title="Renommer le matériau" aria-label="Renommer le matériau">${icon('pencil')}</button>
                    <button type="button" class="icon-btn rule-delete" data-action="delete-material" title="Supprimer le matériau" aria-label="Supprimer le matériau">${icon('trash')}</button>
                </div>` : ''}
            </div>
            ${state.material ? renderMaterialForm(state.material) : ''}`;
    }

    function renderMaterialForm(name) {
        const raw = materials().materials[name];
        const view = resolvedMaterial(name);
        const parents = ['none'].concat(materialNames().filter(item => item !== name && !isDescendant(item, name))).map(item =>
            `<option value="${esc(item)}" ${view.parent === item ? 'selected' : ''}>${esc(item)}</option>`
        ).join('');
        const slider = (key, label, min, max, step) => {
            const shown = formatNum(view[key], step);
            const locked = paramLocked(raw, key) ? ' disabled' : '';
            return `<div class="${paramClass(raw, key)}" data-param="${key}">
                <div class="param-head"><span>${label}</span>${inheritButton(raw, key)}</div>
                <div class="param-body slider-row">
                    <input type="range" min="${min}" max="${max}" step="${step}" data-mat="${key}" data-kind="number" data-readout="out-${key}" value="${shown}"${locked}>
                    ${sliderReadout(`out-${key}`, label, shown, paramLocked(raw, key))}
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
            const locked = paramLocked(raw, key);
            const lockAttr = locked ? ' disabled' : '';
            const extra = key === 'lightmapTexture' ? `<div class="field ${paramClass(raw, 'lightmapUVSet')}" data-param="lightmapUVSet">
                    <div class="param-head"><span>Lightmap UV</span>${inheritButton(raw, 'lightmapUVSet')}</div>
                    <input class="param-body" type="number" min="0" max="1" data-mat="lightmapUVSet" data-kind="number" value="${view.lightmapUVSet || 0}"${paramLocked(raw, 'lightmapUVSet') ? ' disabled' : ''}>
                </div>` : '';
            return `<div class="${paramClass(raw, key)}" data-param="${key}">
                <div class="param-head"><span>${label}</span>${inheritButton(raw, key)}</div>
                <div class="param-body tex-block">
                    <div class="thumb${current ? '' : ' empty'}">
                        ${thumb}
                        <div class="thumb-actions">
                            <button type="button" class="ghost icon-btn" data-action="import-image" data-slot="${key}" title="Ajouter" aria-label="Ajouter"${lockAttr}>${icon('plus')}</button>
                            <button type="button" class="ghost icon-btn" data-action="clear-texture" data-slot="${key}" title="Supprimer" aria-label="Supprimer"${current && !locked ? '' : ' disabled'}>${icon('trash')}</button>
                        </div>
                    </div>
                    <select data-mat="${key}" data-tex="1"${lockAttr}>${options}</select>
                </div>
            </div>${extra}`;
        }).join('');
        const uvLabels = { uScale: 'U Scale', vScale: 'V Scale' };
        const numbers = Object.keys(uvLabels).map(key =>
            `<div class="field ${paramClass(raw, key)}" data-param="${key}">
                <div class="param-head"><span>${uvLabels[key]}</span>${inheritButton(raw, key)}</div>
                <input class="param-body" type="number" step="0.01" data-mat="${key}" data-kind="number" value="${view[key] ?? 0}"${paramLocked(raw, key) ? ' disabled' : ''}>
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
            <details open>
                <summary>Transformations</summary>
                ${slider('uOffset', 'U Offset', 0, 1, 0.01)}
                ${slider('vOffset', 'V Offset', 0, 1, 0.01)}
                ${slider('wRotation', 'Rotation', -180, 180, 1)}
                <div class="grid-2">
                    ${numbers}
                </div>
            </details>
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
        const live = window.captureViewpoint ? window.captureViewpoint() : null;
        const alpha = wrap180(deg(live ? live.alpha : (camera.alpha || 0)));
        const pitch = live
            ? (live.initialPitch !== undefined ? live.initialPitch : deg(live.beta))
            : (camera.initialPitch ?? 60);
        const radius = live ? live.radius : (camera.radius ?? 10);
        const fov = live ? live.fov : (camera.fov > 2 ? camera.fov : deg(camera.fov || 0.8));
        const minDistance = live ? live.minDistance : (camera.minDistance ?? 1);
        const maxDistance = live ? live.maxDistance : (camera.maxDistance ?? 100);
        const targetX = live ? live.targetX : (camera.targetX ?? 0);
        const targetY = live ? live.targetY : (camera.targetY ?? 0);
        const targetZ = live ? live.targetZ : (camera.targetZ ?? 0);
        const slider = (key, label, min, max, step, value) =>
            sliderField(label, `data-camera="${key}"`, min, max, step, value, `out-${key}`);
        const views = studio().viewpoints || {};
        const currentDefault = studio().defaultViewpoint || '';
        const defaultOptions = ['<option value="">Aucun</option>'].concat(Object.keys(views).map(name =>
            `<option value="${esc(name)}" ${name === currentDefault ? 'selected' : ''}>${esc(name)}</option>`
        )).join('');
        const cards = Object.keys(views).map(name => `<div class="card viewpoint-card">
            <div class="viewpoint-head">
                <input data-viewpoint-name="${esc(name)}" value="${esc(name)}" aria-label="Nom de la vue">
                <div class="viewpoint-actions">
                    <button type="button" class="view-btn" data-action="goto-view" data-id="${esc(name)}" title="Aller" aria-label="Aller à ${esc(name)}">${icon('arrow-right')}</button>
                    <button type="button" class="view-btn view-replace" data-action="replace-view" data-id="${esc(name)}" title="Remplacer" aria-label="Remplacer ${esc(name)}">${icon('pencil')}</button>
                    <button type="button" class="view-btn view-duplicate" data-action="duplicate-view" data-id="${esc(name)}" title="Dupliquer" aria-label="Dupliquer ${esc(name)}">${icon('clone')}</button>
                    <button type="button" class="view-btn view-delete" data-action="delete-view" data-id="${esc(name)}" title="Supprimer" aria-label="Supprimer ${esc(name)}">${icon('trash')}</button>
                </div>
            </div>
        </div>`).join('');
        return `
            <div class="stack">
                ${slider('alphaDeg', 'Rotation', -180, 180, 1, alpha)}
                ${slider('initialPitch', 'Inclinaison', 5, 175, 0.5, pitch)}
                ${slider('radius', 'Distance', 0.1, 100, 0.1, radius)}
                ${slider('minDistance', 'Distance min', 0.1, 100, 0.1, minDistance)}
                ${slider('maxDistance', 'Distance max', 0.1, 100, 0.1, maxDistance)}
                ${slider('fov', 'FOV', 10, 120, 1, fov)}
                ${slider('targetX', 'Cible X', -20, 20, 0.1, targetX)}
                ${slider('targetY', 'Cible Y', -20, 20, 0.1, targetY)}
                ${slider('targetZ', 'Cible Z', -20, 20, 0.1, targetZ)}
                <button type="button" class="ghost" data-action="read-camera">Lire la vue actuelle</button>
                <label class="field">Viewpoint par défaut<select data-default-viewpoint>${defaultOptions}</select></label>
            </div>
            <button type="button" class="dashed-add" data-action="add-viewpoint" aria-label="Ajouter un viewpoint">${icon('plus')}</button>
            ${cards}`;
    }

    function renderEngraving() {
        const catalog = meshNames();
        const used = new Set(engravings().map(zone => zone.mesh).filter(Boolean));
        const fonts = fontNames();
        if (document.fonts && document.fonts.load) {
            fontList().forEach(font => {
                if (font && font.name) {
                    try { document.fonts.load(`16px "${font.name}"`); } catch (_) {}
                }
            });
        }
        const fontCards = fontList().map(font => `<div class="font-chip">
            <span class="font-sample" title="${esc(font.name)}" style="font-family:${cssFontFamily(font.name)},sans-serif">${esc(font.name)}</span>
            <button type="button" class="icon-btn mesh-remove" data-action="delete-font" data-name="${esc(font.name)}" title="Retirer la police" aria-label="Retirer ${esc(font.name)}" ${fontList().length < 2 ? 'disabled' : ''}>${icon('xmark')}</button>
        </div>`).join('');
        const zones = engravings().map(zone => {
            const available = catalog.filter(name => name === zone.mesh || !used.has(name));
            const meshOptions = ['<option value="">Choisir un mesh</option>'].concat(available.map(name =>
                `<option value="${esc(name)}" ${name === zone.mesh ? 'selected' : ''}>${esc(name)}</option>`
            )).join('');
            const assigned = zoneFonts(zone);
            const remaining = fonts.filter(name => !assigned.includes(name));
            const chips = assigned.map(name => `<div class="font-chip">
                <span title="${esc(name)}">${esc(name)}</span>
                <button type="button" class="icon-btn mesh-remove" data-action="remove-zone-font" data-id="${esc(zone.id)}" data-name="${esc(name)}" title="Retirer la police" aria-label="Retirer ${esc(name)}">${icon('xmark')}</button>
            </div>`).join('');
            const picker = state.fontPicker === zone.id
                ? `<div class="font-picker" role="menu">${remaining.length
                    ? remaining.map(name => `<button type="button" role="menuitem" data-action="pick-zone-font" data-id="${esc(zone.id)}" data-name="${esc(name)}">${esc(name)}</button>`).join('')
                    : '<div class="font-picker-empty">Toutes les polices sont déjà ajoutées.</div>'
                }</div>`
                : '';
            return `<div class="card engraving-card">
                <div class="rule-head">
                    <label class="field">Nom affiché<input data-engraving-prop="label" data-engraving="${esc(zone.id)}" value="${esc(zone.label || '')}"></label>
                    <button type="button" class="icon-btn rule-delete" data-action="delete-engraving" data-id="${esc(zone.id)}" title="Supprimer la zone" aria-label="Supprimer ${esc(zone.label || zone.id)}">${icon('trash')}</button>
                </div>
                <label class="field">Mesh<select data-engraving-mesh="${esc(zone.id)}">${meshOptions}</select></label>
                <div class="field">
                    Police
                    <div class="font-grid">
                        ${chips}
                        <div class="font-picker-wrap" data-font-picker="${esc(zone.id)}">
                            <button type="button" class="font-add" data-action="open-font-picker" data-id="${esc(zone.id)}" title="Ajouter une police" aria-label="Ajouter une police" aria-expanded="${state.fontPicker === zone.id ? 'true' : 'false'}">${icon('plus')}</button>
                            ${picker}
                        </div>
                    </div>
                </div>
            </div>`;
        }).join('');
        return `
            <div class="stack">
                <div class="field">Polices</div>
                ${fontCards ? `<div class="font-grid">${fontCards}</div>` : '<p class="help">Aucune police.</p>'}
                <button type="button" data-action="import-font">Importer une police</button>
            </div>
            <button type="button" class="dashed-add" data-action="add-engraving" aria-label="Ajouter une zone">${icon('plus')}</button>
            ${zones}`;
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
            const mat = materials().materials[state.material];
            if (mat && hasParent(mat) && !isOwn(mat, 'baseColor')) return;
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
        if (sv.closest('.param.inherited')) return;
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

    function setMaterialParent(name, parentName) {
        const mat = materials().materials[name];
        if (!mat) return;
        if (parentName && parentName !== 'none' && parentName !== name && materials().materials[parentName] && !isDescendant(parentName, name)) {
            materials().materials[name] = { type: mat.type || 'pbr', parent: parentName };
            return;
        }
        const baked = resolvedMaterial(name);
        const next = Object.assign(blankMaterial(), baked);
        next.type = mat.type || 'pbr';
        next.parent = 'none';
        INHERIT_KEYS.forEach(key => {
            if (baked[key] !== undefined) next[key] = baked[key];
        });
        materials().materials[name] = next;
    }
    function writeMaterial(name, key, value) {
        const mat = materials().materials[name];
        if (!mat) return;
        if (key === 'parent') {
            setMaterialParent(name, value);
            window.refreshMaterials();
            return;
        }
        if (hasParent(mat) && !isOwn(mat, key)) return;
        if (key === 'uOffset' || key === 'vOffset') {
            const number = Number(value);
            value = Number.isFinite(number) ? Math.min(1, Math.max(0, number)) : 0;
        }
        if (key === 'wRotation') {
            const number = Number(value);
            value = Number.isFinite(number) ? Math.min(180, Math.max(-180, number)) : 0;
        }
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
        if (target.dataset.ruleProp) {
            const rule = selectedRule();
            if (rule) {
                rule[target.dataset.ruleProp] = target.value;
                renderRulebar();
            }
            return;
        }
        if (target.dataset.engravingProp === 'label') {
            const zone = engravings().find(item => item.id === target.dataset.engraving);
            if (zone) {
                zone.label = target.value;
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

    function syncLiveCameraFields() {
        if (state.tab !== 'camera' || !window.captureViewpoint) return;
        const shot = window.captureViewpoint();
        paintCameraField('alphaDeg', wrap180(deg(shot.alpha)), 1);
        paintCameraField('initialPitch', shot.initialPitch !== undefined ? shot.initialPitch : deg(shot.beta), 0.5);
        paintCameraField('radius', shot.radius, 0.1);
        paintCameraField('minDistance', shot.minDistance, 0.1);
        paintCameraField('maxDistance', shot.maxDistance, 0.1);
        paintCameraField('fov', shot.fov, 1);
        paintCameraField('targetX', shot.targetX, 0.1);
        paintCameraField('targetY', shot.targetY, 0.1);
        paintCameraField('targetZ', shot.targetZ, 0.1);
    }
    function paintCameraField(key, value, step) {
        const range = document.querySelector(`#panel input[type="range"][data-camera="${key}"]`);
        if (!range) return;
        const readout = document.getElementById(range.dataset.readout);
        if (readout && document.activeElement === readout) return;
        const limited = Math.min(Number(range.max), Math.max(Number(range.min), value));
        const shown = formatNum(limited, step);
        if (range.value !== shown) range.value = shown;
        if (readout && readout.value !== shown) readout.value = shown;
    }
    function applyCameraField(key, value) {
        if (key === 'minDistance' || key === 'maxDistance') {
            const shot = window.captureViewpoint ? window.captureViewpoint() : null;
            const cam = studio().camera || {};
            const minLimit = shot ? shot.minDistance : (cam.minDistance ?? 0.1);
            const maxLimit = shot ? shot.maxDistance : (cam.maxDistance ?? 100);
            if (key === 'maxDistance') value = Math.max(value, minLimit);
            if (key === 'minDistance') value = Math.min(value, maxLimit);
            value = Math.min(100, Math.max(0.1, value));
            const shown = formatNum(value, 0.1);
            const range = document.querySelector(`#panel input[type="range"][data-camera="${key}"]`);
            if (range && range.value !== shown) range.value = shown;
            const readout = range && document.getElementById(range.dataset.readout);
            if (readout && document.activeElement !== readout && readout.value !== shown) readout.value = shown;
        }
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
        if (target.dataset.ruleProp) {
            const rule = selectedRule();
            if (rule) rule[target.dataset.ruleProp] = target.value;
            return;
        }
        if (target.dataset.addMesh) {
            addOptionMesh(target.dataset.addMesh, target.value);
            return;
        }
        if (target.dataset.effectMesh) return setMeshEffect(target);
        if (target.dataset.defaultRule) {
            defaults().rules[target.dataset.defaultRule] = target.value;
            return;
        }
        if (target.dataset.engravingMesh) {
            const zone = engravings().find(item => item.id === target.dataset.engravingMesh);
            if (zone) {
                zone.mesh = target.value;
                syncEngravingMeshes();
                refreshEngraving();
                render();
            }
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
        if (target.dataset.defaultViewpoint !== undefined) {
            studio().defaultViewpoint = target.value;
            return;
        }
        if (target.dataset.viewpointName) renameViewpoint(target.dataset.viewpointName, target.value.trim());
    }

    async function onClick(event) {
        const button = event.target.closest('[data-action], [data-tab]');
        if (!button) {
            closeFontPicker();
            return;
        }
        if (button.dataset.tab) {
            setTab(button.dataset.tab);
            return;
        }
        const action = button.dataset.action;
        if (action === 'new-project') {
            await newProject();
            return;
        }
        else if (action === 'import-project') {
            $('file-project').click();
            return;
        }
        else if (action === 'export-project') {
            await exportProject();
            return;
        }
        if (action === 'import-bin') $('file-bin').click();
        else if (action === 'reload-model') await window.reloadModels();
        else if (action === 'remove-model-file') {
            removeProjectFile(button.dataset.file);
            await window.reloadModels();
        }
        else if (action === 'import-font') $('file-font').click();
        else if (action === 'add-engraving') addEngraving();
        else if (action === 'delete-engraving') deleteEngraving(button.dataset.id);
        else if (action === 'delete-font') deleteFont(button.dataset.name);
        else if (action === 'open-font-picker') {
            state.fontPicker = state.fontPicker === button.dataset.id ? null : button.dataset.id;
            render();
        }
        else if (action === 'pick-zone-font') addZoneFont(button.dataset.id, button.dataset.name);
        else if (action === 'remove-zone-font') removeZoneFont(button.dataset.id, button.dataset.name);
        else if (action === 'add-rule') addRule();
        else if (action === 'select-rule') {
            state.rule = button.dataset.id;
            state.confirmRule = null;
            render();
        } else if (action === 'add-option') addOption();
        else if (action === 'delete-rule') {
            state.confirmRule = state.rule;
            render();
        }
        else if (action === 'confirm-delete-rule') deleteRule();
        else if (action === 'cancel-delete-rule') {
            state.confirmRule = null;
            render();
        }
        else if (action === 'duplicate-option') duplicateOption(button.dataset.option);
        else if (action === 'toggle-option') toggleOption(button.dataset.option);
        else if (action === 'remove-option-mesh') removeOptionMesh(button.dataset.option, button.dataset.mesh);
        else if (action === 'set-visible') {
            setMeshEffect(button);
            button.parentElement.querySelectorAll('.vis-btn').forEach(item => {
                const on = item === button;
                item.classList.toggle('active', on);
                item.setAttribute('aria-pressed', on ? 'true' : 'false');
            });
        }
        else if (action === 'delete-option') deleteOption(button.dataset.option);
        else if (action === 'add-material') addMaterial();
        else if (action === 'rename-material') startRenameMaterial();
        else if (action === 'delete-material') deleteMaterial();
        else if (action === 'clear-texture') {
            writeMaterial(state.material, button.dataset.slot, 'None');
            render();
        } else if (action === 'import-image') {
            const mat = state.material && materials().materials[state.material];
            if (mat && paramLocked(mat, button.dataset.slot)) return;
            state.textureSlot = button.dataset.slot;
            $('file-image').click();
        } else if (action === 'import-env') $('file-env').click();
        else if (action === 'read-camera') readCamera();
        else if (action === 'add-viewpoint') addViewpoint();
        else if (action === 'goto-view') {
            state.viewpoint = button.dataset.id;
            const live = $('live-viewpoint');
            if (live) live.value = state.viewpoint;
            window.viewer.gotoViewpoint(button.dataset.id);
        }
        else if (action === 'replace-view') replaceViewpoint(button.dataset.id);
        else if (action === 'duplicate-view') duplicateViewpoint(button.dataset.id);
        else if (action === 'delete-view') {
            delete studio().viewpoints[button.dataset.id];
            if (studio().defaultViewpoint === button.dataset.id) studio().defaultViewpoint = '';
            if (state.viewpoint === button.dataset.id) state.viewpoint = '';
            render();
        }
    }

    function refreshEngraving() {
        if (window.engravingManager) {
            window.engravingManager.assetConfig = asset();
            if (window.engravingManager.applyAll) window.engravingManager.applyAll();
            else if (window.engravingManager.update) window.engravingManager.update();
        } else if (window.tagManager && window.tagManager.applySceneVisibility) {
            window.tagManager.applySceneVisibility();
        }
    }
    function syncEngravingMeshes() {
        const meshes = partModel().meshes || {};
        const marked = new Set(engravings().map(zone => zone.mesh).filter(Boolean));
        Object.entries(meshes).forEach(([name, mesh]) => {
            if (mesh) mesh.engraving = marked.has(name);
        });
    }
    function addEngraving() {
        const id = uniqueId('gravure', new Set(engravings().map(zone => zone.id)));
        const index = engravings().length + 1;
        engravings().push({
            id,
            label: index === 1 ? 'Gravure' : `Gravure ${index}`,
            mesh: '',
            text: '',
            font: '',
            fonts: []
        });
        render();
    }
    function deleteEngraving(id) {
        asset().engravings = engravings().filter(zone => zone.id !== id);
        syncEngravingMeshes();
        refreshEngraving();
        render();
    }
    function deleteFont(name) {
        if (fontList().length < 2) return;
        asset().fonts = fontList().filter(font => font.name !== name);
        const fallback = fontNames()[0] || '';
        engravings().forEach(zone => {
            zone.fonts = zoneFonts(zone).filter(font => font !== name);
            if (zone.font === name) zone.font = zone.fonts[0] || fallback;
        });
        if (window.engravingManager && window.engravingManager.syncFonts) window.engravingManager.syncFonts();
        refreshEngraving();
        render();
    }
    function addProjectFile(name) {
        const model = partModel();
        model.files = model.files || [];
        if (!model.files.some(item => item.file === name)) {
            model.files.push({ file: name, format: /\.bin$/i.test(name) ? 'bin' : (model.format || 'bin') });
        }
        model.file = model.files[0] ? model.files[0].file : '';
    }
    function removeProjectFile(name) {
        const model = partModel();
        model.files = (model.files || []).filter(item => item.file !== name);
        model.file = model.files[0] ? model.files[0].file : '';
        Object.keys(model.meshes).forEach(meshName => {
            if (model.meshes[meshName] && model.meshes[meshName].file === name) delete model.meshes[meshName];
        });
    }
    function addRule() {
        const id = uniqueId('regle', new Set(rules().map(rule => rule.id)));
        rules().push({ id, label: 'Règle', options: [{ id: 'option1', label: 'Option 1', meshes: {} }] });
        state.rule = id;
        render();
    }
    function addOption() {
        const rule = selectedRule();
        if (!rule) return;
        const id = uniqueId('option', new Set((rule.options || []).map(option => option.id)));
        rule.options = rule.options || [];
        rule.options.push({ id, label: 'Option', meshes: {} });
        state.openOptions.add(rule.id + '\0' + id);
        render();
    }
    function toggleOption(optionId) {
        const rule = selectedRule();
        if (!rule || !optionId) return;
        const key = rule.id + '\0' + optionId;
        if (state.openOptions.has(key)) state.openOptions.delete(key);
        else state.openOptions.add(key);
        render();
    }
    function deleteRule() {
        asset().rules = rules().filter(rule => rule.id !== state.rule);
        delete defaults().rules[state.rule];
        state.confirmRule = null;
        state.rule = asset().rules[0] && asset().rules[0].id;
        render();
    }
    function duplicateOption(optionId) {
        const rule = selectedRule();
        const source = rule && (rule.options || []).find(item => item.id === optionId);
        if (!rule || !source) return;
        const id = uniqueId(source.id || 'option', new Set((rule.options || []).map(option => option.id)));
        const copy = JSON.parse(JSON.stringify(source));
        copy.id = id;
        copy.label = source.label || 'Option';
        const index = rule.options.findIndex(item => item.id === optionId);
        rule.options.splice(index + 1, 0, copy);
        state.openOptions.add(rule.id + '\0' + id);
        render();
    }
    function optionById(optionId) {
        const rule = selectedRule();
        const option = rule && (rule.options || []).find(item => item.id === optionId);
        return { rule, option };
    }
    function addOptionMesh(optionId, meshName) {
        if (!meshName) return;
        const { rule, option } = optionById(optionId);
        if (!rule || !option || !partModel().meshes[meshName]) return;
        option.meshes = option.meshes || {};
        if (!Object.prototype.hasOwnProperty.call(option.meshes, meshName)) option.meshes[meshName] = {};
        render();
    }
    function removeOptionMesh(optionId, meshName) {
        const { rule, option } = optionById(optionId);
        if (!rule || !option || !option.meshes || !meshName) return;
        delete option.meshes[meshName];
        if (window.viewer) window.viewer.applyRule(rule.id, option.id);
        render();
    }
    function deleteOption(optionId) {
        const rule = selectedRule();
        if (!rule) return;
        rule.options = (rule.options || []).filter(option => option.id !== optionId);
        render();
    }
    function setMeshEffect(target) {
        const rule = selectedRule();
        const option = rule && (rule.options || []).find(item => item.id === target.dataset.option);
        if (!option) return;
        const meshName = target.dataset.effectMesh;
        option.meshes = option.meshes || {};
        const effect = Object.assign({}, option.meshes[meshName]);
        if (target.dataset.action === 'set-visible') {
            if (target.dataset.value === 'true') effect.visible = true;
            else if (target.dataset.value === 'false') effect.visible = false;
            else delete effect.visible;
        } else if (target.dataset.effectSlot) {
            effect.materials = Object.assign({}, effect.materials);
            if (target.value) effect.materials[target.dataset.effectSlot] = target.value;
            else delete effect.materials[target.dataset.effectSlot];
            if (!Object.keys(effect.materials).length) delete effect.materials;
        }
        if (effect.visible === undefined && !effect.materials) option.meshes[meshName] = {};
        else option.meshes[meshName] = effect;
        window.viewer.applyRule(rule.id, option.id);
        const select = document.querySelector(`#rulebar [data-rule="${CSS.escape(rule.id)}"]`);
        if (select) select.value = option.id;
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
        state.renameMaterial = false;
        render();
    }
    function startRenameMaterial() {
        if (!state.material) return;
        if (state.renameMaterial) {
            const input = $('rename-material');
            renameMaterial(state.material, input ? input.value : state.material);
            return;
        }
        state.renameMaterial = true;
        render();
    }
    function retargetMaterialInstance(previous, next) {
        const instances = window.materialInstances;
        if (!instances || !instances[previous]) return;
        instances[previous].forEach(mat => { if (mat) mat.name = next; });
        instances[next] = instances[previous];
        delete instances[previous];
        const scene = instances[next][0] && instances[next][0].getScene && instances[next][0].getScene();
        if (!scene || !scene.materials) return;
        scene.materials.forEach(mat => { if (mat && mat.name === previous) mat.name = next; });
    }
    function renameMaterial(previous, next) {
        state.renameMaterial = false;
        next = String(next || '').trim();
        if (!previous || !next || next === previous) {
            render();
            return;
        }
        const all = materials().materials;
        if (all[next]) {
            setStatus('Ce matériau existe déjà.');
            render();
            return;
        }
        const ordered = {};
        Object.keys(all).forEach(key => { ordered[key === previous ? next : key] = all[key]; });
        Object.keys(all).forEach(key => delete all[key]);
        Object.assign(all, ordered);
        Object.values(all).forEach(mat => {
            if (mat && mat.parent === previous) mat.parent = next;
        });
        rules().forEach(rule => (rule.options || []).forEach(option => {
            Object.values(option.meshes || {}).forEach(effect => {
                Object.entries((effect && effect.materials) || {}).forEach(([slot, materialName]) => {
                    if (materialName === previous) effect.materials[slot] = next;
                });
            });
        }));
        retargetMaterialInstance(previous, next);
        state.material = next;
        if (window.viewer && window.viewer.sync) window.viewer.sync();
        window.refreshMaterials();
        render();
    }
    function deleteMaterial() {
        const name = state.material;
        if (!name) return;
        state.renameMaterial = false;
        delete materials().materials[name];
        materialNames().forEach(item => {
            if (materials().materials[item].parent === name) materials().materials[item].parent = 'none';
        });
        const fallback = materialNames()[0] || '';
        rules().forEach(rule => (rule.options || []).forEach(option => {
            Object.values(option.meshes || {}).forEach(effect => {
                Object.entries((effect && effect.materials) || {}).forEach(([slot, materialName]) => {
                    if (materialName === name) effect.materials[slot] = fallback;
                });
            });
        }));
        state.material = materialNames()[0] || null;
        window.viewer.sync();
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
            initialPitch: shot.initialPitch !== undefined ? shot.initialPitch : deg(shot.beta)
        });
        render();
    }
    function nextViewpointName() {
        const used = new Set(Object.keys(studio().viewpoints || {}).map(name => name.toLowerCase()));
        let index = 1;
        while (used.has(`viewpoint_${index}`)) index += 1;
        return `viewpoint_${index}`;
    }
    function addViewpoint() {
        const name = nextViewpointName();
        studio().viewpoints = studio().viewpoints || {};
        studio().viewpoints[name] = window.captureViewpoint();
        state.viewpoint = name;
        render();
    }
    function replaceViewpoint(name) {
        if (studio().viewpoints && studio().viewpoints[name]) {
            studio().viewpoints[name] = window.captureViewpoint();
            setStatus(`Viewpoint ${name} mis à jour.`);
        }
    }
    function duplicateViewpoint(name) {
        const views = studio().viewpoints || {};
        if (!views[name]) return;
        let copyName = `${name} 2`;
        let index = 3;
        while (views[copyName]) copyName = `${name} ${index++}`;
        const ordered = {};
        Object.keys(views).forEach(key => {
            ordered[key] = views[key];
            if (key === name) ordered[copyName] = JSON.parse(JSON.stringify(views[key]));
        });
        studio().viewpoints = ordered;
        render();
    }
    function renameViewpoint(previous, next) {
        const views = studio().viewpoints || {};
        if (!next || next === previous || views[next]) return render();
        const ordered = {};
        Object.keys(views).forEach(key => { ordered[key === previous ? next : key] = views[key]; });
        studio().viewpoints = ordered;
        if (studio().defaultViewpoint === previous) studio().defaultViewpoint = next;
        if (state.viewpoint === previous) state.viewpoint = next;
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
        const copy = JSON.parse(JSON.stringify(config));
        delete copy._rulesMigrated;
        return `const assetConfiguration = ${JSON.stringify(copy, null, 2)};\n`
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
            flashSaveCheck();
        } catch (error) {
            setStatus('Enregistrement impossible. Lancez start-server.bat (le serveur Python ne peut pas écrire les fichiers). ' + error.message);
        }
    }

    function exportZipName() {
        const raw = partModel().name || 'viewer';
        const slugName = String(raw).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
        return (slugName || 'viewer') + '.zip';
    }

    function collectExportPaths(assetConfig, studioConfig, materialsConfig) {
        const paths = new Set();
        const model = assetConfig && assetConfig.models && assetConfig.models.part_model;
        if (model) {
            if (model.file) paths.add('Assets/' + model.file);
            (model.files || []).forEach(item => {
                const name = typeof item === 'string' ? item : item && item.file;
                if (name) paths.add('Assets/' + name);
            });
            Object.values(model.meshes || {}).forEach(mesh => {
                if (mesh && mesh.file) paths.add('Assets/' + mesh.file);
            });
        }
        Object.values((materialsConfig && materialsConfig.materials) || {}).forEach(mat => {
            TEXTURE_SLOTS.forEach(slot => {
                const value = mat && mat[slot];
                if (value && value !== 'None') paths.add('Textures/' + value);
            });
        });
        const envFile = studioConfig && studioConfig.environment && studioConfig.environment.file;
        if (envFile) paths.add('Textures/HDR/' + envFile);
        usedFontEntries(assetConfig).forEach(font => paths.add('fonts/' + font.file));
        return Array.from(paths);
    }

    function usedFontEntries(assetConfig) {
        const used = new Set();
        (assetConfig.engravings || []).forEach(zone => {
            (zone.fonts || []).forEach(name => used.add(name));
            if (zone.font) used.add(zone.font);
        });
        return (assetConfig.fonts || []).filter(font => font && font.file && font.name && used.has(font.name));
    }

    function fontFaceFormat(file) {
        const ext = String(file || '').toLowerCase();
        if (ext.endsWith('.otf')) return 'opentype';
        if (ext.endsWith('.woff2')) return 'woff2';
        if (ext.endsWith('.woff')) return 'woff';
        return 'truetype';
    }

    function exportedFontFaces(assetConfig) {
        return usedFontEntries(assetConfig).map(font => {
            const name = String(font.name).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            const file = String(font.file).replace(/\\/g, '/');
            return `@font-face{font-family:'${name}';src:url('fonts/${file}') format('${fontFaceFormat(file)}');}`;
        }).join('\n');
    }

    function exportedApiJson(assetConfig, studioConfig) {
        const rules = (assetConfig.rules || []).map(rule => ({
            id: rule.id,
            label: rule.label || rule.id,
            options: (rule.options || []).map(option => ({
                id: option.id,
                label: option.label || option.id
            }))
        }));
        const engravings = (assetConfig.engravings || []).map(zone => ({
            id: zone.id,
            label: zone.label || zone.id,
            fonts: (zone.fonts && zone.fonts.length) ? zone.fonts.slice() : (zone.font ? [zone.font] : [])
        }));
        const fonts = usedFontEntries(assetConfig).map(font => ({
            name: font.name,
            file: font.file
        }));
        const viewpointIds = Object.keys((studioConfig && studioConfig.viewpoints) || {});
        const viewpoints = viewpointIds.map(id => ({ id, label: id }));
        const defaultViewpoint = (studioConfig && studioConfig.defaultViewpoint) || viewpointIds[0] || '';
        const defaults = assetConfig.defaults || {};
        const examples = [];
        rules.forEach(rule => {
            const option = rule.options[0];
            if (option) examples.push(`viewer.applyRule('${rule.id}', '${option.id}')`);
        });
        engravings.forEach(zone => {
            examples.push(`viewer.setEngravingText('${zone.id}', 'Texte')`);
            if (zone.fonts[0]) examples.push(`viewer.setEngravingFont('${zone.id}', '${zone.fonts[0]}')`);
        });
        if (defaultViewpoint) examples.push(`viewer.gotoViewpoint('${defaultViewpoint}')`);
        return JSON.stringify({
            description: "Contrat d'intégration du viewer. Attendre l'événement viewer-api-ready, puis appeler window.viewer. Les identifiants de la section project sont ceux de ce zip.",
            ready: {
                event: 'viewer-api-ready',
                flag: 'window.viewerReady',
                object: 'window.viewer',
                listen: "window.addEventListener('viewer-api-ready', function () { var viewer = window.viewer; });"
            },
            methods: {
                applyRule: {
                    call: 'viewer.applyRule(ruleId, optionId)',
                    args: ['ruleId', 'optionId'],
                    description: 'Applique une option de règle (matériau, visibilité, etc.).'
                },
                setEngravingText: {
                    call: 'viewer.setEngravingText(engravingId, text)',
                    args: ['engravingId', 'text'],
                    description: 'Change le texte d’une zone de gravure.'
                },
                setEngravingFont: {
                    call: 'viewer.setEngravingFont(engravingId, fontName)',
                    args: ['engravingId', 'fontName'],
                    description: 'Change la police d’une zone de gravure. fontName doit figurer dans project.engravings[].fonts.'
                },
                gotoViewpoint: {
                    call: 'viewer.gotoViewpoint(viewpointId)',
                    args: ['viewpointId'],
                    description: 'Place la caméra sur un point de vue.'
                },
                getRules: {
                    call: 'viewer.getRules()',
                    description: 'Liste les règles et leurs options.'
                },
                getEngravings: {
                    call: 'viewer.getEngravings()',
                    description: 'Liste les zones de gravure.'
                },
                getFonts: {
                    call: 'viewer.getFonts()',
                    description: 'Liste les polices disponibles.'
                },
                getViewpoints: {
                    call: 'viewer.getViewpoints()',
                    description: 'Liste les points de vue.'
                },
                getDefaultViewpoint: {
                    call: 'viewer.getDefaultViewpoint()',
                    description: 'Identifiant du point de vue par défaut.'
                },
                getDefaults: {
                    call: 'viewer.getDefaults()',
                    description: 'Valeurs par défaut (règles, gravure).'
                }
            },
            project: {
                rules,
                engravings,
                fonts,
                viewpoints,
                defaultViewpoint,
                defaults: {
                    rules: defaults.rules || {},
                    engravingText: defaults.engravingText || '',
                    engravingFont: defaults.engravingFont || ''
                }
            },
            examples
        }, null, 2);
    }

    function exportedIndexHtml(assetConfig) {
        const title = esc(partModel().name || '3D Viewer');
        const faces = exportedFontFaces(assetConfig);
        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <!-- Intégration : api.json — window.viewer après l'événement viewer-api-ready -->
    <title>${title}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap">
    <link rel="stylesheet" href="${ENGINE_CDN}/styles.css">
    ${faces ? `<style id="engraving-font-faces">${faces}</style>` : ''}
    <script src="${BABYLON_CDN}/babylon.js"><\/script>
    <script src="${BABYLON_CDN}/loaders/babylonjs.loaders.min.js"><\/script>
    <script>
        if (window.BABYLON && BABYLON.DracoCompression) {
            BABYLON.DracoCompression.Configuration = {
                decoder: {
                    wasmUrl: '${BABYLON_CDN}/draco_wasm_wrapper_gltf.js',
                    wasmBinaryUrl: '${BABYLON_CDN}/draco_decoder_gltf.wasm',
                    fallbackUrl: '${BABYLON_CDN}/draco_decoder_gltf.js'
                }
            };
        }
        if (window.BABYLON && BABYLON.MeshoptCompression) {
            BABYLON.MeshoptCompression.Configuration = {
                decoder: { url: '${BABYLON_CDN}/meshopt_decoder.js' }
            };
        }
    <\/script>
    <script src="${BABYLON_CDN}/materialsLibrary/babylonjs.materials.min.js"><\/script>
    <script src="${BABYLON_CDN}/hdr/babylonjs.hdr.min.js"><\/script>
    <script src="https://cdn.jsdelivr.net/npm/tweakpane@3.1.10/dist/tweakpane.min.js"><\/script>
    <script src="${ENGINE_CDN}/tweakpaneManager.js"><\/script>
    <script src="${ENGINE_CDN}/engravingManager.js"><\/script>
</head>
<body>
    <div class="container">
        <div class="canvas-container">
            <canvas id="renderCanvas"></canvas>
        </div>
    </div>
    <script>
        window.showTweakpane = false;
        window.viewerApplyDefaults = true;
    <\/script>
    <script src="${ENGINE_CDN}/scene.js"><\/script>
    <script src="${ENGINE_CDN}/viewerApi.js"><\/script>
</body>
</html>
`;
    }

    async function fetchExportBlob(path) {
        const response = await fetch(path);
        if (!response.ok) throw new Error(path + ' introuvable');
        return response.blob();
    }

    async function exportProject() {
        if (!window.JSZip) {
            setStatus('Export impossible : JSZip n’est pas chargé.');
            return;
        }
        if (!window.viewerReady || !window.getAssetConfig) {
            setStatus('Export impossible : le viewer n’est pas prêt.');
            return;
        }
        const button = $('export-project');
        if (button) button.disabled = true;
        try {
            if (window.viewer && window.viewer.sync) window.viewer.sync();
            setStatus('Export du projet…');
            const assetConfig = JSON.parse(JSON.stringify(asset()));
            delete assetConfig._rulesMigrated;
            assetConfig.fonts = usedFontEntries(assetConfig);
            const studioConfig = JSON.parse(JSON.stringify(studio()));
            const materialsConfig = JSON.parse(JSON.stringify(materials()));
            const zip = new window.JSZip();
            zip.file('index.html', exportedIndexHtml(assetConfig));
            zip.file('api.json', exportedApiJson(assetConfig, studioConfig));
            zip.file('studio.json', JSON.stringify(studioConfig, null, 2));
            zip.file('Assets/asset.js', serializeAsset(assetConfig));
            zip.file('Textures/materials.json', JSON.stringify(materialsConfig, null, 2));
            const paths = collectExportPaths(assetConfig, studioConfig, materialsConfig);
            for (const path of paths) {
                zip.file(path, await fetchExportBlob(path));
            }
            const blob = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = exportZipName();
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.setTimeout(() => URL.revokeObjectURL(url), 2000);
            setStatus('Projet exporté.');
        } catch (error) {
            setStatus('Export impossible. ' + error.message);
        } finally {
            if (button) button.disabled = false;
        }
    }

    const PROJECT_FOLDERS = {
        'Assets': ['.bin', '.glb', '.gltf'],
        'Textures': ['.png', '.jpg', '.jpeg', '.webp'],
        'Textures/HDR': ['.hdr', '.env'],
        'fonts': ['.ttf', '.otf', '.woff', '.woff2']
    };
    const FLASH_KEY = 'editor-flash';

    function emptyAsset(dataOffset) {
        return {
            models: {
                part_model: {
                    name: 'Nouveau projet',
                    file: '',
                    format: 'bin',
                    dataOffset: Number(dataOffset || 0),
                    meshes: {},
                    files: []
                }
            },
            rules: [],
            engravings: [],
            fonts: [],
            defaults: { rules: {}, engravingText: '', engravingFont: '' }
        };
    }

    function emptyStudio() {
        const beta = 1.2;
        return {
            environment: {
                backgroundColor: '#ebebeb',
                hdrExposure: 1,
                orientation: 0,
                file: 'default.env',
                visible: false
            },
            camera: {
                alpha: -Math.PI / 2,
                beta,
                radius: 10,
                fov: 45,
                minDistance: 1,
                maxDistance: 100,
                zoomSpeed: 2,
                zoomSensitivity: 0.7,
                inertia: 0.85,
                zoomSmoothness: 0.1,
                targetX: 0,
                targetY: 0,
                targetZ: 0,
                showTarget: false,
                pitchElasticity: false,
                lowerBetaLimit: beta,
                upperBetaLimit: beta,
                initialPitch: beta * 180 / Math.PI
            },
            viewpoints: {},
            defaultViewpoint: ''
        };
    }

    function setProjectBusy(busy) {
        ['new-project', 'import-project', 'export-project', 'save-all', 'revert-all'].forEach(id => {
            const button = $(id);
            if (button) button.disabled = busy;
        });
    }

    async function clearProjectFiles() {
        const response = await fetch('api/project/clear', { method: 'POST' });
        if (!response.ok) throw new Error(await response.text());
    }

    function reloadWithMessage(message) {
        try { sessionStorage.setItem(FLASH_KEY, message); } catch (_) {}
        location.reload();
    }

    async function newProject() {
        const ok = window.confirm('Créer un nouveau projet ?\n\nLes modèles, textures, polices, environnements et réglages actuels seront supprimés du disque. Exportez le projet avant si vous voulez le garder.');
        if (!ok) return;
        setProjectBusy(true);
        try {
            setStatus('Réinitialisation du projet…');
            const current = window.getAssetConfig && window.getAssetConfig();
            const model = current && current.models && current.models.part_model;
            const offset = model ? model.dataOffset : 0;
            await clearProjectFiles();
            await postText('Assets/asset.js', serializeAsset(emptyAsset(offset)));
            await postText('studio.json', JSON.stringify(emptyStudio(), null, 2));
            await postText('materials.json', JSON.stringify({ materials: {} }, null, 2));
            reloadWithMessage('Nouveau projet créé.');
        } catch (error) {
            setProjectBusy(false);
            setStatus('Réinitialisation impossible. Le serveur d’écriture doit être lancé. ' + error.message);
        }
    }

    function projectEntryFolder(relativePath) {
        const slash = relativePath.lastIndexOf('/');
        if (slash < 0) return null;
        const folder = relativePath.slice(0, slash);
        const name = relativePath.slice(slash + 1);
        const allowed = PROJECT_FOLDERS[folder];
        if (!allowed || !name) return null;
        const ext = name.slice(name.lastIndexOf('.')).toLowerCase();
        return allowed.includes(ext) ? { folder, name } : null;
    }

    async function readProjectZip(file) {
        const zip = await window.JSZip.loadAsync(file);
        const entries = Object.values(zip.files).filter(entry => !entry.dir && !/(^|\/)__MACOSX\//.test(entry.name));
        const assetEntry = entries.find(entry => /(^|\/)Assets\/asset\.js$/.test(entry.name));
        if (!assetEntry) throw new Error('Assets/asset.js est absent du zip.');
        const prefix = assetEntry.name.slice(0, assetEntry.name.length - 'Assets/asset.js'.length);
        const studioEntry = zip.file(prefix + 'studio.json');
        const materialsEntry = zip.file(prefix + 'Textures/materials.json');
        if (!studioEntry) throw new Error('studio.json est absent du zip.');
        if (!materialsEntry) throw new Error('Textures/materials.json est absent du zip.');
        const assetText = await assetEntry.async('string');
        const studioText = await studioEntry.async('string');
        const materialsText = await materialsEntry.async('string');
        parseAssetScript(assetText);
        JSON.parse(studioText);
        JSON.parse(materialsText);
        const files = [];
        for (const entry of entries) {
            if (!entry.name.startsWith(prefix)) continue;
            const target = projectEntryFolder(entry.name.slice(prefix.length));
            if (!target) continue;
            const blob = await entry.async('blob');
            files.push({ folder: target.folder, file: new File([blob], target.name) });
        }
        return { assetText, studioText, materialsText, files };
    }

    async function importProject(file) {
        if (!window.JSZip) {
            setStatus('Import impossible : JSZip n’est pas chargé.');
            return;
        }
        let project;
        try {
            setStatus('Lecture du zip…');
            project = await readProjectZip(file);
        } catch (error) {
            setStatus('Zip invalide. ' + error.message);
            return;
        }
        const ok = window.confirm(`Importer « ${file.name} » ?\n\nLe projet actuel sera remplacé : ses modèles, textures, polices et réglages seront supprimés du disque. Exportez-le avant si vous voulez le garder.`);
        if (!ok) {
            setStatus('');
            return;
        }
        setProjectBusy(true);
        try {
            setStatus('Import du projet…');
            await clearProjectFiles();
            for (const item of project.files) {
                await upload(item.folder, item.file);
            }
            await postText('Assets/asset.js', project.assetText);
            await postText('studio.json', project.studioText);
            await postText('materials.json', project.materialsText);
            reloadWithMessage(`${file.name} importé.`);
        } catch (error) {
            setProjectBusy(false);
            setStatus('Import impossible. Le serveur d’écriture doit être lancé. ' + error.message);
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

    function selectedViewpointName() {
        const views = (studio() && studio().viewpoints) || {};
        if (state.viewpoint && views[state.viewpoint]) return state.viewpoint;
        if (state.viewpoint === '') return '';
        const live = $('live-viewpoint');
        if (live && views[live.value]) return live.value;
        if (studio().defaultViewpoint && views[studio().defaultViewpoint]) return studio().defaultViewpoint;
        return '';
    }

    function restoreSelectedViewpoint(name) {
        const views = studio().viewpoints || {};
        if (name && views[name]) {
            state.viewpoint = name;
            if (window.applyViewpointNow) window.applyViewpointNow(views[name]);
            return;
        }
        if (name) state.viewpoint = '';
        else window.applyCameraState(studio().camera || {});
    }

    async function revertAll() {
        const savedFiles = (partModel().files || []).map(item => item.file).join('\n');
        const keptViewpoint = selectedViewpointName();
        const stamp = Date.now();
        const [assetText, studioData, materialsData] = await Promise.all([
            fetch('Assets/asset.js?t=' + stamp, { cache: 'no-store' }).then(response => response.text()),
            fetch('studio.json?t=' + stamp, { cache: 'no-store' }).then(response => response.json()),
            fetch('Textures/materials.json?t=' + stamp, { cache: 'no-store' }).then(response => response.json())
        ]);
        window.setAssetConfig(parseAssetScript(assetText));
        if (window.captureImportedSlots) window.captureImportedSlots();
        replaceContents(studio(), studioData);
        replaceContents(materials(), materialsData);
        window.applyEnvironment(studio().environment || {}, { reloadTexture: true });
        restoreSelectedViewpoint(keptViewpoint);
        if (window.tagManager) {
            window.tagManager.materialsConfig = materials();
            window.tagManager.loadTagConfiguration();
        }
        state.material = null;
        state.rule = null;
        if (savedFiles !== (partModel().files || []).map(item => item.file).join('\n')) await window.reloadModels();
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
        const fromHash = tabFromHash(location.hash);
        if (fromHash) state.tab = fromHash;
        syncTabHash();
        scanMeshes();
        const watchCamera = () => {
            syncLiveCameraFields();
            requestAnimationFrame(watchCamera);
        };
        watchCamera();
        $('tabs').addEventListener('click', onClick);
        $('panel').addEventListener('click', onClick);
        $('panel').addEventListener('scroll', () => {
            if (state.fontPicker) placeFontPicker();
        });
        document.addEventListener('click', (event) => {
            if (!state.fontPicker) return;
            if (event.target.closest('[data-font-picker], [data-action="open-font-picker"]')) return;
            closeFontPicker();
        });
        document.addEventListener('keydown', (event) => {
            if (event.key !== 'Escape') return;
            closeFontPicker();
            if (state.renameMaterial) {
                state.renameMaterial = false;
                render();
            }
        });
        $('panel').addEventListener('input', onInput);
        $('panel').addEventListener('change', onChange);
        $('panel').addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && event.target.id === 'rename-material') {
                event.preventDefault();
                renameMaterial(state.material, event.target.value);
                return;
            }
            if (event.key !== 'Enter' || !event.target.classList.contains('slider-readout')) return;
            event.preventDefault();
            event.target.blur();
        });
        $('panel').addEventListener('pointerdown', onColorPointerDown);
        $('panel').addEventListener('focusout', (event) => {
            if (event.target.id === 'rename-material') {
                const next = event.relatedTarget;
                if (next && next.closest && next.closest('[data-action="rename-material"]')) return;
                renameMaterial(state.material, event.target.value);
                return;
            }
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
            if (event.target.dataset.liveEngravingFont) {
                window.viewer.setEngravingFont(event.target.dataset.liveEngravingFont, event.target.value);
            }
            if (event.target.id === 'live-viewpoint') {
                state.viewpoint = event.target.value;
                if (state.viewpoint) window.viewer.gotoViewpoint(state.viewpoint);
            }
        });
        $('rulebar').addEventListener('input', (event) => {
            if (event.target.dataset.liveEngraving) {
                window.viewer.setEngravingText(event.target.dataset.liveEngraving, event.target.value);
            }
        });
        $('file-bin').addEventListener('change', async (event) => {
            const selected = Array.from(event.target.files || []);
            event.target.value = '';
            if (!selected.length) return;
            try {
                setStatus(selected.length > 1 ? 'Import des modèles…' : 'Import du modèle…');
                for (const file of selected) {
                    await upload('Assets', file);
                    addProjectFile(file.name);
                }
                await window.reloadModels();
                if (!window.lastModelError) {
                    setStatus(selected.map(file => file.name).join(', ') + (selected.length > 1 ? ' ajoutés.' : ' ajouté.'));
                }
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
        $('file-font').addEventListener('change', async (event) => {
            const file = event.target.files && event.target.files[0];
            event.target.value = '';
            if (!file) return;
            try {
                await upload('fonts', file);
                const base = file.name.replace(/\.[^.]+$/, '');
                let name = base || 'Police';
                const used = new Set(fontList().map(font => font.name));
                let index = 2;
                while (used.has(name)) name = `${base} ${index++}`;
                fontList().push({ name, file: file.name });
                if (window.engravingManager && window.engravingManager.syncFonts) window.engravingManager.syncFonts();
                render();
                setStatus(`${file.name} importé.`);
            } catch (error) {
                setStatus('Import de police impossible. ' + error.message);
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
        window.addEventListener('hashchange', () => {
            const tab = tabFromHash(location.hash);
            if (tab && tab !== state.tab) {
                state.tab = tab;
                state.fontPicker = null;
                render();
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
        try {
            const flash = sessionStorage.getItem(FLASH_KEY);
            if (flash) {
                sessionStorage.removeItem(FLASH_KEY);
                setStatus(flash);
            }
        } catch (_) {}
    }

    function bindMaterialPick() {
        const scene = window.tagManager && window.tagManager.scene;
        if (!scene || state.pickBound || !window.BABYLON) return;
        state.pickBound = true;
        let down = null;
        scene.onPointerObservable.add((evt) => {
            if (!evt.event || evt.event.button !== 0) return;
            if (state.tab !== 'materials') {
                down = null;
                return;
            }
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
                if (state.material === name) return;
                state.material = name;
                render();
            }
        });
    }

    $('file-project').addEventListener('change', (event) => {
        const file = event.target.files && event.target.files[0];
        event.target.value = '';
        if (file) importProject(file).catch(error => setStatus('Import impossible. ' + error.message));
    });

    window.addEventListener('viewer-api-ready', start);
    setInterval(start, 200);
})();
