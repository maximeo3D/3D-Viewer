// API du viewer embarqué.
// La page hôte appelle ces méthodes après l'événement viewer-api-ready :
//   viewer.applyRule('color', 'blue')
//   viewer.setEngravingText('Hello')
//   viewer.setEngravingFont('Stencil')
//   viewer.gotoViewpoint('Viewpoint1')
//   viewer.getRules()
(function () {
    let booting = false;

    function syncMaterialConfigs(asset) {
        if (!asset || !Array.isArray(asset.rules)) return;
        const configs = {};
        asset.rules.forEach(rule => {
            if (!rule || rule.type !== 'material') return;
            (rule.options || []).forEach(option => {
                const assignments = option.assignments || {};
                Object.keys(assignments).forEach(meshName => {
                    configs[meshName] = configs[meshName] || {};
                    configs[meshName][option.id] = assignments[meshName];
                });
            });
        });
        asset.materialConfigs = configs;
        if (window.tagManager) window.tagManager.loadTagConfiguration();
    }

    function ensureRules(asset) {
        if (!asset) return;
        if (Array.isArray(asset.rules) && asset.rules.length) {
            asset.defaults = asset.defaults || { rules: {}, engravingText: '', engravingFont: 'Stencil' };
            asset.defaults.rules = asset.defaults.rules || {};
            return;
        }
        const rules = [];
        const model = asset.models && asset.models.part_model;
        const tags = new Set();
        if (model && model.meshes) {
            Object.values(model.meshes).forEach(mesh => {
                (mesh.tags || []).forEach(tag => {
                    if (tag !== 'engraving') tags.add(tag);
                });
            });
        }
        if (tags.size) {
            rules.push({
                id: 'visibility',
                label: 'Visibilité',
                type: 'visibility',
                options: Array.from(tags).map(tag => ({ id: tag, label: tag, tags: [tag] }))
            });
        }
        const materialConfigs = asset.materialConfigs || {};
        Object.keys(materialConfigs).forEach(meshName => {
            rules.push({
                id: meshName,
                label: meshName,
                type: 'material',
                options: Object.keys(materialConfigs[meshName]).map(optionId => ({
                    id: optionId,
                    label: optionId,
                    assignments: { [meshName]: materialConfigs[meshName][optionId] }
                }))
            });
        });
        asset.rules = rules;
        asset.defaults = asset.defaults || {
            rules: {},
            engravingText: '',
            engravingFont: 'Stencil'
        };
        asset.defaults.rules = asset.defaults.rules || {};
    }

    function applyRule(ruleId, optionId) {
        const asset = window.assetConfig;
        if (!asset || !window.tagManager) return;
        syncMaterialConfigs(asset);
        const rule = (asset.rules || []).find(item => item.id === ruleId);
        if (!rule) return;
        const option = (rule.options || []).find(item => item.id === optionId);
        if (!option) return;
        const tagManager = window.tagManager;

        if (rule.type === 'visibility') {
            const owned = new Set();
            (rule.options || []).forEach(item => {
                (item.tags || []).forEach(tag => {
                    if (tag !== 'engraving') owned.add(tag);
                });
            });
            owned.forEach(tag => tagManager.activeTags.delete(tag));
            (option.tags || []).forEach(tag => {
                if (tag !== 'engraving') tagManager.activeTags.add(tag);
            });
            tagManager.applyActiveTags();
            return;
        }

        Object.keys(option.assignments || {}).forEach(meshName => {
            tagManager.applyMaterialConfig(meshName, option.id);
        });
        if (rule.showTag) {
            if (rule.hideWhen && option.id === rule.hideWhen) tagManager.activeTags.delete(rule.showTag);
            else tagManager.activeTags.add(rule.showTag);
            tagManager.applyActiveTags();
        }
    }

    async function applyDefaults() {
        const asset = window.assetConfig;
        if (!asset) return;
        ensureRules(asset);
        const defaults = asset.defaults || {};
        const chosen = defaults.rules || {};
        const rules = asset.rules || [];
        const ordered = rules.filter(rule => rule.type === 'visibility')
            .concat(rules.filter(rule => rule.type === 'material'));
        ordered.forEach(rule => {
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
                sync: () => syncMaterialConfigs(window.assetConfig),
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
