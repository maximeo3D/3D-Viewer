# Système de Matériaux Parent-Enfant - Documentation

Documentation complète du système d'héritage de matériaux avec interface dat.GUI interactive.

## 🎯 **Vue d'Ensemble**

Le système de matériaux parent-enfant permet de créer des matériaux qui héritent des propriétés d'un matériau parent, avec la possibilité de surcharger certaines propriétés spécifiques. Cela facilite la gestion de familles de matériaux similaires.

## 🏗️ **Architecture du Système**

### **Structure des Matériaux**
```json
{
  "materials": {
    "green": {
      "type": "pbr",
      "parent": "none",
      "baseColor": "#62d046",
      "metallic": 0,
      "roughness": 0.47,
      "alpha": 1,
      "albedoTexture": "None",
      "bumpTexture": "metal_normal.png",
      "bumpTextureIntensity": 3.5
    },
    "yellow": {
      "type": "pbr",
      "parent": "green",
      "baseColor": "#FFAA00"
    }
  }
}
```

### **Logique d'Héritage**
- **Matériau Parent** : `parent: "none"` (matériau de base)
- **Matériau Enfant** : `parent: "green"` (hérite de "green")
- **Propriétés Héritées** : Toutes les propriétés du parent sauf celles explicitement définies
- **Propriétés Surchargées** : Seules les propriétés modifiées sont sauvegardées

## 🔧 **Implémentation Technique**

### **1. Création de Matériaux avec Héritage**
```javascript
function createPBRMaterial(materialConfig, scene) {
    // Handle parent-child material inheritance
    let finalMaterialConfig = materialConfig;
    if (materialConfig.parent && materialConfig.parent !== 'none' && materialsConfig && materialsConfig.materials[materialConfig.parent]) {
        const parentMaterial = materialsConfig.materials[materialConfig.parent];
        // Merge parent properties with child properties (child overrides parent)
        finalMaterialConfig = { ...parentMaterial, ...materialConfig };
    }
    
    const pbr = new BABYLON.PBRMaterial(`${finalMaterialConfig.name || "pbr"}_material`, scene);
    
    // Apply all properties from the merged configuration
    if (finalMaterialConfig.baseColor) {
        const color = BABYLON.Color3.FromHexString(finalMaterialConfig.baseColor);
        pbr.albedoColor = color;
    }
    
    pbr.metallic = finalMaterialConfig.metallic !== undefined ? finalMaterialConfig.metallic : 0;
    pbr.roughness = finalMaterialConfig.roughness !== undefined ? finalMaterialConfig.roughness : 0.5;
    pbr.alpha = finalMaterialConfig.alpha !== undefined ? finalMaterialConfig.alpha : 1.0;
    
    // ... application des textures et autres propriétés
    
    return pbr;
}
```

### **2. Interface dat.GUI avec Héritage**

#### **Classe DatGUIManager**
```javascript
class DatGUIManager {
    constructor(scene, config) {
        this.scene = scene;
        this.config = config;
        this.materialsConfig = null;
        this.materialList = { selected: '' };
        this.materialProperties = {};
        this.independentProperties = new Set();
        this.materialControls = new Map();
        this.materialParentControl = null;
    }
    
    async init() {
        await this.loadMaterialsConfig();
        this.createGUI();
        this.createMaterialsFolder();
    }
}
```

#### **Création des Contrôles de Matériaux**
```javascript
createMaterialControls() {
    // Parent control
    const parentOptions = ['none', ...Object.keys(this.materialsConfig.materials)];
    const currentParent = this.materialsConfig.materials[this.materialList.selected]?.parent || 'none';
    const parentData = { parent: currentParent };
    
    this.materialParentControl = this.materialsFolder.add(parentData, 'parent', parentOptions)
        .name('Parent')
        .onChange((value) => {
            if (this.materialsConfig.materials[this.materialList.selected]) {
                this.materialsConfig.materials[this.materialList.selected].parent = value;
                this.updateParentChildDisplay();
            }
        });
    
    // Material property controls
    this.baseColorControl = this.materialsFolder.addColor(this.materialProperties, 'baseColor')
        .name('Albedo Color')
        .onChange((value) => {
            this.materialProperties.baseColor = value;
            this.applyMaterialChanges();
        });
    this.materialControls.set('baseColor', this.baseColorControl);
    
    // ... autres contrôles de propriétés
}
```

### **3. Gestion de l'Affichage Parent-Enfant**

#### **Détermination des Propriétés Indépendantes**
```javascript
updateParentChildDisplay() {
    // Clear independent properties
    this.independentProperties.clear();
    
    // If material has a parent, determine which properties are independent
    if (this.materialsConfig.materials[this.materialList.selected]?.parent !== 'none') {
        const currentMaterial = this.materialsConfig.materials[this.materialList.selected];
        const parentMaterial = this.materialsConfig.materials[currentMaterial.parent];
        
        // Compare each property to determine independence
        Object.keys(this.materialProperties).forEach(propertyName => {
            if (currentMaterial[propertyName] !== undefined && 
                currentMaterial[propertyName] !== parentMaterial[propertyName]) {
                this.independentProperties.add(propertyName);
            }
        });
    }
    
    this.updateControlsAppearance();
}
```

#### **Mise à Jour de l'Apparence des Contrôles**
```javascript
updateControlsAppearance() {
    this.materialControls.forEach((control, propertyName) => {
        const isIndependent = this.independentProperties.has(propertyName);
        
        // Set opacity for inherited properties
        control.domElement.style.opacity = isIndependent ? '1' : '0.5';
        
        // Set tooltip
        control.domElement.title = isIndependent ? 
            `Independent - Click to inherit from parent` : 
            `Inherited from parent - Click to make independent`;
        
        // Add click handler to parameter name
        this.addLabelClickHandler(control, propertyName);
    });
}
```

### **4. Toggle d'Indépendance par Clic**

#### **Gestionnaire de Clic sur les Labels**
```javascript
addLabelClickHandler(control, propertyName) {
    // Multiple attempts to find the correct label element
    const selectors = [
        'span.property-name',
        '.property-name',
        'span',
        '.dg span'
    ];
    
    let label = null;
    for (const selector of selectors) {
        label = control.domElement.querySelector(selector);
        if (label) break;
    }
    
    // Fallback to parent element
    if (!label) {
        label = control.domElement.parentElement?.querySelector('span');
    }
    
    if (label) {
        // Remove any existing handler
        if (label._labelClickHandler) {
            label.removeEventListener('click', label._labelClickHandler);
        }
        
        // Create new handler
        const handler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.togglePropertyIndependence(propertyName);
        };
        
        // Attach handler with delay to ensure DOM is ready
        setTimeout(() => {
            label.addEventListener('click', handler);
            label._labelClickHandler = handler;
            label.style.cursor = 'pointer';
            label.style.userSelect = 'none';
        }, 50);
    }
}
```

#### **Toggle d'Indépendance**
```javascript
togglePropertyIndependence(propertyName) {
    const currentMaterial = this.materialsConfig.materials[this.materialList.selected];
    
    if (this.independentProperties.has(propertyName)) {
        // Make inherited - remove from material and independentProperties
        delete currentMaterial[propertyName];
        this.independentProperties.delete(propertyName);
        
        // Update display with parent value
        const parentMaterial = this.materialsConfig.materials[currentMaterial.parent];
        this.materialProperties[propertyName] = parentMaterial[propertyName];
    } else {
        // Make independent - add to material and independentProperties
        currentMaterial[propertyName] = this.materialProperties[propertyName];
        this.independentProperties.add(propertyName);
    }
    
    this.updateControlsAppearance();
    this.updateGUIControls();
    this.applyMaterialChanges();
}
```

### **5. Application des Changements**

#### **Application Intelligente des Matériaux**
```javascript
applyMaterialChanges() {
    const currentMaterial = this.materialsConfig.materials[this.materialList.selected];
    if (!currentMaterial) return;
    
    // Save independent properties
    this.independentProperties.forEach(propertyName => {
        currentMaterial[propertyName] = this.materialProperties[propertyName];
    });
    
    // Remove inherited properties from material config
    if (currentMaterial.parent !== 'none') {
        const parentMaterial = this.materialsConfig.materials[currentMaterial.parent];
        Object.keys(this.materialProperties).forEach(propertyName => {
            if (!this.independentProperties.has(propertyName)) {
                delete currentMaterial[propertyName];
            }
        });
    }
    
    // Apply changes to 3D scene
    this.onMaterialChange('properties', this.materialProperties);
}
```

## 🎨 **Interface Utilisateur**

### **Création de Matériaux**
```javascript
createNewMaterialControls() {
    this.createMaterialFolder = this.materialsFolder.addFolder('Create Material');
    
    // Name field
    this.newMaterialData = { name: '' };
    this.createMaterialFolder.add(this.newMaterialData, 'name').name('Name');
    
    // Create button
    this.createMaterialFolder.add(this, 'createNewMaterial').name('Create');
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
```

### **Contrôle Parent**
```javascript
// Parent dropdown in main materials folder
const parentOptions = ['none', ...Object.keys(this.materialsConfig.materials)];
const currentParent = this.materialsConfig.materials[this.materialList.selected]?.parent || 'none';
const parentData = { parent: currentParent };

this.materialParentControl = this.materialsFolder.add(parentData, 'parent', parentOptions)
    .name('Parent')
    .onChange((value) => {
        if (this.materialsConfig.materials[this.materialList.selected]) {
            this.materialsConfig.materials[this.materialList.selected].parent = value;
            this.updateParentChildDisplay();
        }
    });
```

## 📊 **Exemples d'Utilisation**

### **Exemple 1 : Matériau de Base**
```json
"metal_base": {
  "type": "pbr",
  "parent": "none",
  "baseColor": "#888888",
  "metallic": 1,
  "roughness": 0.2,
  "alpha": 1,
  "albedoTexture": "metal_albedo.png",
  "metallicTexture": "metal_metalness.png",
  "microSurfaceTexture": "metal_roughness.png",
  "bumpTexture": "metal_normal.png",
  "bumpTextureIntensity": 2.0
}
```

### **Exemple 2 : Matériau Enfant (Cuivre)**
```json
"copper": {
  "type": "pbr",
  "parent": "metal_base",
  "baseColor": "#B87333"
}
```

### **Exemple 3 : Matériau Enfant (Or)**
```json
"gold": {
  "type": "pbr",
  "parent": "metal_base",
  "baseColor": "#FFD700",
  "roughness": 0.1
}
```

## 🚀 **Avantages du Système**

### **1. Gestion Efficace**
- Réduction de la duplication de code
- Maintenance simplifiée des familles de matériaux
- Configuration centralisée des propriétés communes

### **2. Interface Intuitive**
- Visualisation claire de l'héritage (opacité)
- Toggle facile entre hérité et indépendant
- Feedback visuel immédiat

### **3. Export Intelligent**
- Seules les propriétés modifiées sont sauvegardées
- Structure JSON optimisée
- Évite la redondance des données

### **4. Flexibilité**
- Ajout facile de nouveaux matériaux enfants
- Modification des parents sans affecter les enfants
- Support complet des textures et transformations

## 🔧 **Bonnes Pratiques**

### **1. Structure des Matériaux**
- Créer des matériaux de base avec `parent: "none"`
- Utiliser des noms descriptifs pour les matériaux
- Organiser par familles (métaux, plastiques, tissus)

### **2. Gestion de l'Héritage**
- Ne surcharger que les propriétés nécessaires
- Documenter les relations parent-enfant
- Tester les modifications sur les enfants

### **3. Interface Utilisateur**
- Utiliser les tooltips pour expliquer l'héritage
- Maintenir la cohérence visuelle
- Fournir un feedback clair sur les actions

### **4. Performance**
- Éviter les chaînes d'héritage trop profondes
- Optimiser les textures partagées
- Gérer efficacement la mémoire

---

**Version** : 1.0.0  
**Dernière mise à jour** : Décembre 2024  
**Statut** : Production Ready ✅
