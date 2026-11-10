// API du viewer embarqué.
// La page hôte appelle ces méthodes après l'événement viewer-api-ready :
//   viewer.applyRule('color', 'blue')
//   viewer.setEngravingText('Hello')
//   viewer.setEngravingFont('Stencil')
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

    function ensureRules(asset) {
        if (!asset) return;
        migrateAsset(asset);
        asset.rules = asset.rules || [];
        asset.defaults = asset.defaults || { rules: {}, engravingText: '', engravingFont: 'Stencil' };
        asset.defaults.rules = asset.defaults.rules || {};
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
            if (defaults.engravingFont) await window.engravingManager.setFont(defaults.engravingFont);
            window.engravingManager.setText(defaults.engravingText || '');
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
                setEngravingText: (text) => {
                    if (window.engravingManager) window.engravingManager.setText(text || '');
                    else if (window.tagManager && window.tagManager.setEngravingText) window.tagManager.setEngravingText(text || '');
                },
                setEngravingFont: async (font) => {
                    if (window.engravingManager) await window.engravingManager.setFont(font);
                },
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
