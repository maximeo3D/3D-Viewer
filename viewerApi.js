// API du viewer embarqué.
// La page hôte appelle ces méthodes après l'événement viewer-api-ready :
//   viewer.applyRule('color', 'blue')
//   viewer.setEngravingText('gravure', 'Hello')
//   viewer.setEngravingFont('gravure', 'Stencil')
//   viewer.getEngravings()
//   viewer.gotoViewpoint('viewpoint_1')
//   viewer.getViewpoints()
//   viewer.getRules()
(function () {
    let booting = false;

    function slotNames(mesh) {
        if (!mesh) return [];
        if (mesh.slots && mesh.slots.length) return mesh.slots;
        if (mesh.materialSlots && mesh.materialSlots.length) return mesh.materialSlots;
        return [];
    }

    function resolveSlotName(mesh, slotKey) {
        const slots = slotNames(mesh);
        const match = /^slot(\d+)$/.exec(String(slotKey || ''));
        if (match) return slots[Number(match[1]) - 1] || slotKey;
        return slotKey;
    }

    function migrateAsset(asset) {
        if (!asset || asset._rulesMigrated) return;
        const model = asset.models && asset.models.part_model;
        const meshes = (model && model.meshes) || {};
        Object.values(meshes).forEach(mesh => {
            if (!mesh.slots || !mesh.slots.length) mesh.slots = slotNames(mesh).slice();
            if (!mesh.slots.length) mesh.slots = ['Matériau 1'];
            if (mesh.engraving === undefined) mesh.engraving = (mesh.tags || []).includes('engraving');
        });
        (asset.rules || []).forEach(rule => {
            (rule.options || []).forEach(option => {
                option.meshes = option.meshes || {};
                Object.entries(option.assignments || {}).forEach(([meshName, slotMap]) => {
                    const materials = Object.assign({}, (option.meshes[meshName] && option.meshes[meshName].materials) || {});
                    Object.entries(slotMap || {}).forEach(([slotKey, materialName]) => {
                        if (!materialName) return;
                        materials[resolveSlotName(meshes[meshName], slotKey)] = materialName;
                    });
                    option.meshes[meshName] = Object.assign({}, option.meshes[meshName], { materials });
                });
                delete option.assignments;
                if (rule.type === 'visibility') {
                    Object.entries(meshes).forEach(([meshName, mesh]) => {
                        if (mesh.engraving || (mesh.tags || []).includes('engraving')) return;
                        const meshTags = (mesh.tags || []).filter(tag => tag !== 'engraving');
                        const controlled = meshTags.some(tag => (rule.options || []).some(item => (item.tags || []).includes(tag)));
                        if (!controlled) return;
                        const visible = meshTags.some(tag => (option.tags || []).includes(tag));
                        option.meshes[meshName] = Object.assign({ visible }, option.meshes[meshName]);
                    });
                    delete option.tags;
                }
                if (rule.showTag) {
                    Object.entries(meshes).forEach(([meshName, mesh]) => {
                        const tagged = (mesh.tags || []).includes(rule.showTag) || meshName === rule.showTag;
                        if (!tagged) return;
                        const visible = !(rule.hideWhen && option.id === rule.hideWhen);
                        option.meshes[meshName] = Object.assign({ visible }, option.meshes[meshName]);
                    });
                }
            });
            delete rule.type;
            delete rule.showTag;
            delete rule.hideWhen;
        });
        Object.values(meshes).forEach(mesh => {
            delete mesh.tags;
            delete mesh.materialSlots;
        });
        delete asset.materialConfigs;
        asset._rulesMigrated = true;
    }

    function defaultFonts() {
        return [
            { name: 'Stencil', file: 'stencil.ttf' },
            { name: 'Futuristic', file: 'futuristic.otf' },
            { name: 'Western', file: 'western.ttf' }
        ];
    }

    function syncMeshEngraving(asset) {
        const meshes = (asset.models && asset.models.part_model && asset.models.part_model.meshes) || {};
        const marked = new Set((asset.engravings || []).map(zone => zone.mesh).filter(Boolean));
        Object.entries(meshes).forEach(([name, mesh]) => {
            if (mesh) mesh.engraving = marked.has(name);
        });
    }

    function ensureEngravings(asset) {
        if (!asset) return;
        if (!Array.isArray(asset.fonts)) asset.fonts = defaultFonts();
        if (!Array.isArray(asset.engravings)) {
            asset.engravings = [];
            const meshes = (asset.models && asset.models.part_model && asset.models.part_model.meshes) || {};
            const text = (asset.defaults && asset.defaults.engravingText) || '';
            const font = (asset.defaults && asset.defaults.engravingFont) || (asset.fonts[0] && asset.fonts[0].name) || 'Stencil';
            const used = new Set();
            Object.entries(meshes).forEach(([name, mesh]) => {
                if (!mesh || !mesh.engraving) return;
                let id = String(name || 'gravure').toLowerCase().replace(/[^a-z0-9]+/g, '') || 'gravure';
                let index = 2;
                while (used.has(id)) id = `gravure${index++}`;
                used.add(id);
                asset.engravings.push({
                    id,
                    label: name === 'engraving' ? 'Gravure' : name,
                    mesh: name,
                    text,
                    font
                });
            });
        }
        const used = new Set();
        asset.engravings.forEach(zone => {
            let id = zone.id || 'gravure';
            let index = 2;
            while (used.has(id)) id = `${zone.id || 'gravure'}${index++}`;
            zone.id = id;
            used.add(id);
            zone.label = zone.label || zone.id;
            zone.mesh = zone.mesh || '';
            zone.text = zone.text || '';
            const catalog = (asset.fonts || []).map(font => font && font.name).filter(Boolean);
            if (!Array.isArray(zone.fonts)) zone.fonts = zone.font ? [zone.font] : [];
            zone.fonts = zone.fonts.filter(name => catalog.includes(name));
            if (zone.font && catalog.includes(zone.font) && !zone.fonts.includes(zone.font)) zone.fonts.unshift(zone.font);
            zone.font = zone.fonts.includes(zone.font) ? zone.font : (zone.fonts[0] || '');
        });
        syncMeshEngraving(asset);
        if (window.applyEngravingFontFaces) window.applyEngravingFontFaces(asset.fonts);
    }

    function ensureRules(asset) {
        if (!asset) return;
        migrateAsset(asset);
        asset.rules = asset.rules || [];
        asset.defaults = asset.defaults || { rules: {}, engravingText: '', engravingFont: 'Stencil' };
        asset.defaults.rules = asset.defaults.rules || {};
        ensureEngravings(asset);
    }

    function applyRule(ruleId, optionId) {
        const asset = window.assetConfig;
        const tagManager = window.tagManager;
        if (!asset || !tagManager) return;
        ensureRules(asset);
        const rule = (asset.rules || []).find(item => item.id === ruleId);
        if (!rule) return;
        const option = (rule.options || []).find(item => item.id === optionId);
        if (!option) return;
        tagManager.ruleChoices[ruleId] = optionId;
        Object.entries(option.meshes || {}).forEach(([meshName, effect]) => {
            Object.entries((effect && effect.materials) || {}).forEach(([slotName, materialName]) => {
                if (materialName) tagManager.applySlotMaterial(meshName, slotName, materialName);
            });
        });
        tagManager.applySceneVisibility();
        if (window.engravingManager && window.engravingManager.reapply) window.engravingManager.reapply();
    }

    async function applyDefaults() {
        const asset = window.assetConfig;
        if (!asset) return;
        ensureRules(asset);
        const defaults = asset.defaults || {};
        const chosen = defaults.rules || {};
        const rules = asset.rules || [];
        rules.forEach(rule => {
            const optionId = chosen[rule.id] || (rule.options[0] && rule.options[0].id);
            if (optionId) applyRule(rule.id, optionId);
        });
        if (window.engravingManager) {
            window.engravingManager.assetConfig = asset;
            if (window.engravingManager.applyAll) await window.engravingManager.applyAll();
        }
    }

    async function boot() {
        if (window.viewer || booting) return;
        if (!window.tagManager || !window.assetConfig) return;
        booting = true;
        try {
            ensureRules(window.assetConfig);
            window.viewer = {
                getRules: () => (window.assetConfig && window.assetConfig.rules) || [],
                getDefaults: () => (window.assetConfig && window.assetConfig.defaults) || {},
                applyRule,
                applyDefaults,
                sync: () => {
                    if (window.tagManager && window.tagManager.reapplyMaterials) window.tagManager.reapplyMaterials();
                },
                setEngravingText: (idOrText, maybeText) => {
                    if (window.engravingManager) window.engravingManager.setText(idOrText, maybeText);
                },
                setEngravingFont: async (idOrFont, maybeFont) => {
                    if (window.engravingManager) await window.engravingManager.setFont(idOrFont, maybeFont);
                },
                getEngravings: () => (window.assetConfig && window.assetConfig.engravings) || [],
                getFonts: () => (window.assetConfig && window.assetConfig.fonts) || [],
                gotoViewpoint: (name) => {
                    if (window.gotoViewpoint) window.gotoViewpoint(name);
                },
                getViewpoints: () => {
                    const studio = window.getStudioConfig ? window.getStudioConfig() : null;
                    return (studio && studio.viewpoints) || {};
                },
                getDefaultViewpoint: () => {
                    const studio = window.getStudioConfig ? window.getStudioConfig() : null;
                    return (studio && studio.defaultViewpoint) || '';
                },
                getState: () => window.tagManager.getActiveTags()
            };
            if (window.viewerApplyDefaults) await applyDefaults();
            window.viewerReady = true;
            window.dispatchEvent(new CustomEvent('viewer-api-ready'));
        } catch (error) {
            booting = false;
            console.error('Viewer API init failed:', error);
        }
    }

    window.addEventListener('viewer-ready', () => { boot(); });
    setInterval(() => { if (!window.viewer) boot(); }, 200);
})();
