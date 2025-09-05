# Système SKU - Documentation Complète

Documentation du système de gestion des SKU (Stock Keeping Unit) pour la configuration de produits 3D.

## 🎯 **Vue d'Ensemble**

Le système SKU permet de gérer différentes configurations de produits en contrôlant :
- **Sélection de modèles** : Choisir entre différents modèles 3D
- **Schémas de couleurs** : Appliquer des configurations de matériaux prédéfinies
- **Visibilité des meshes** : Afficher/masquer des parties spécifiques du produit
- **Assignation de matériaux** : Appliquer des matériaux différents selon la configuration

## 🏗️ **Architecture du Système**

### **Structure des Fichiers**
```
3D-Viewer/
├── SKUconfigs.json          # Configuration des SKUs
├── Assets/
│   └── asset.js            # Données techniques des assets
├── scene.js                # Classe SKUManager
└── index.html              # Boutons de contrôle HTML
```

### **Classe SKUManager**
```javascript
class SKUManager {
    constructor(scene, materialsConfig) {
        this.scene = scene;
        this.materialsConfig = materialsConfig;
        this.skuConfig = null;
        this.currentSKU = null;
        this.currentModel = 'model1';
        this.currentColorScheme = 'color1';
    }
    
    async loadSKUConfiguration() {
        // Chargement de SKUconfigs.json
    }
    
    setModel(model) {
        // Changement de modèle
    }
    
    setColorScheme(colorScheme) {
        // Changement de schéma de couleurs
    }
    
    applySKUConfiguration(skuKey) {
        // Application de la configuration SKU
    }
}
```

## 📋 **Configuration des SKUs**

### **Structure de SKUconfigs.json**
```json
{
  "models": {
    "model1": "Cube 1",
    "model2": "Cube 2"
  },
  "colorSchemes": {
    "color1": "Red",
    "color2": "Green/Blue"
  },
  "skus": {
    "001-001-001": {
      "model": "model1",
      "colorScheme": "color1",
      "configuration": {
        "cube1": {
          "visible": true,
          "materialSlots": {
            "slot1": "red",
            "slot2": "red"
          }
        },
        "cube2": {
          "visible": false
        }
      }
    }
  }
}
```

### **Composants de Configuration**

#### **1. Models**
- **Clé** : Identifiant technique (`model1`, `model2`)
- **Valeur** : Nom d'affichage (`Cube 1`, `Cube 2`)

#### **2. ColorSchemes**
- **Clé** : Identifiant technique (`color1`, `color2`)
- **Valeur** : Description (`Red`, `Green/Blue`)

#### **3. SKUs**
- **Clé** : Code SKU (`001-001-001`)
- **Structure** :
  - `model` : Référence au modèle
  - `colorScheme` : Référence au schéma de couleurs
  - `configuration` : Configuration des meshes

#### **4. Configuration des Meshes**
```json
"cube1": {
  "visible": true,                    // Visibilité du mesh
  "materialSlots": {                  // Slots de matériaux
    "slot1": "red",                   // Slot 1 → matériau rouge
    "slot2": "blue"                   // Slot 2 → matériau bleu
  }
}
```

## 🔧 **Implémentation Technique**

### **1. Chargement de la Configuration**
```javascript
async loadSKUConfiguration() {
    try {
        const response = await fetch('SKUconfigs.json');
        this.skuConfig = await response.json();
        this.updateSKUFromSelection();
    } catch (error) {
        console.error('❌ Erreur lors du chargement de SKUconfigs.json:', error);
    }
}
```

### **2. Sélection de Modèle**
```javascript
setModel(model) {
    this.currentModel = model;
    this.updateSKUFromSelection();
}
```

### **3. Sélection de Schéma de Couleurs**
```javascript
setColorScheme(colorScheme) {
    this.currentColorScheme = colorScheme;
    this.updateSKUFromSelection();
}
```

### **4. Mise à Jour Automatique**
```javascript
updateSKUFromSelection() {
    if (!this.skuConfig) return;
    
    // Trouver le SKU correspondant
    const skuKey = Object.keys(this.skuConfig.skus).find(skuKey => {
        const sku = this.skuConfig.skus[skuKey];
        return sku.model === this.currentModel && 
               sku.colorScheme === this.currentColorScheme;
    });
    
    if (skuKey) {
        this.currentSKU = skuKey;
        this.applySKUConfiguration(skuKey);
    }
}
```

### **5. Application de la Configuration**
```javascript
applySKUConfiguration(skuKey) {
    const skuConfig = this.skuConfig.skus[skuKey];
    const configuration = skuConfig.configuration;
    
    Object.keys(configuration).forEach(meshName => {
        const meshConfig = configuration[meshName];
        
        // Trouver les meshes correspondants
        const meshes = this.scene.meshes.filter(mesh => 
            mesh.name.startsWith(meshName + '_primitive')
        );
        
        meshes.forEach(mesh => {
            // Gérer la visibilité
            mesh.setEnabled(meshConfig.visible);
            
            // Gérer les matériaux
            if (meshConfig.visible && meshConfig.materialSlots) {
                const primitiveMatch = mesh.name.match(/^(.+)_primitive(\d+)$/);
                if (primitiveMatch) {
                    const primitiveIndex = parseInt(primitiveMatch[2]);
                    const slotName = `slot${primitiveIndex + 1}`;
                    
                    if (meshConfig.materialSlots[slotName]) {
                        const materialName = meshConfig.materialSlots[slotName];
                        applyMaterial(mesh, this.materialsConfig.materials[materialName]);
                    }
                }
            }
        });
    });
}
```

## 🎮 **Interface Utilisateur**

### **Boutons HTML**
```html
<div class="sidebar">
    <h3>Models</h3>
    <button id="model1-btn" class="sidebar-btn">Model 1</button>
    <button id="model2-btn" class="sidebar-btn">Model 2</button>
    
    <h3>Colors</h3>
    <button id="color1-btn" class="sidebar-btn">Red</button>
    <button id="color2-btn" class="sidebar-btn">Green</button>
</div>
```

### **Script de Contrôle**
```javascript
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        if (window.skuManager) {
            // Boutons de modèles
            document.getElementById('model1-btn').addEventListener('click', () => {
                window.skuManager.setModel('model1');
                updateButtonStates();
            });
            
            document.getElementById('model2-btn').addEventListener('click', () => {
                window.skuManager.setModel('model2');
                updateButtonStates();
            });
            
            // Boutons de couleurs
            document.getElementById('color1-btn').addEventListener('click', () => {
                window.skuManager.setColorScheme('color1');
                updateButtonStates();
            });
            
            document.getElementById('color2-btn').addEventListener('click', () => {
                window.skuManager.setColorScheme('color2');
                updateButtonStates();
            });
            
            updateButtonStates();
        }
    }, 1000);
});
```

### **Styles CSS**
```css
.sidebar-btn.active {
    background-color: #4CAF50;
    color: white;
    border: 2px solid #45a049;
}

.sidebar-btn.active:hover {
    background-color: #45a049;
}
```

## 🔄 **Gestion des Meshes Primitifs**

### **Problème des Primitives**
Les modèles GLB avec plusieurs matériaux sont décomposés en meshes primitifs :
- `cube1_primitive0` → Slot 1
- `cube1_primitive1` → Slot 2
- `cube2_primitive0` → Slot 1
- `cube2_primitive1` → Slot 2

### **Solution de Mapping**
```javascript
// Déterminer le slot selon le nom du mesh
const primitiveMatch = mesh.name.match(/^(.+)_primitive(\d+)$/);
if (primitiveMatch) {
    const primitiveIndex = parseInt(primitiveMatch[2]);
    const slotName = `slot${primitiveIndex + 1}`;
    
    if (meshConfig.materialSlots[slotName]) {
        const materialName = meshConfig.materialSlots[slotName];
        applyMaterial(mesh, this.materialsConfig.materials[materialName]);
    }
}
```

## 📊 **Exemples de Configuration**

### **Exemple 1 : Modèle Simple**
```json
"001-001-001": {
  "model": "model1",
  "colorScheme": "color1",
  "configuration": {
    "cube1": {
      "visible": true,
      "materialSlots": {
        "slot1": "red",
        "slot2": "red"
      }
    },
    "cube2": {
      "visible": false
    }
  }
}
```

### **Exemple 2 : Modèle avec Matériaux Multiples**
```json
"001-001-002": {
  "model": "model1",
  "colorScheme": "color2",
  "configuration": {
    "cube1": {
      "visible": true,
      "materialSlots": {
        "slot1": "green",
        "slot2": "blue"
      }
    },
    "cube2": {
      "visible": false
    }
  }
}
```

### **Exemple 3 : Changement de Modèle**
```json
"001-002-001": {
  "model": "model2",
  "colorScheme": "color1",
  "configuration": {
    "cube1": {
      "visible": false
    },
    "cube2": {
      "visible": true,
      "materialSlots": {
        "slot1": "red",
        "slot2": "red"
      }
    }
  }
}
```

## 🚀 **Avantages du Système**

### **1. Séparation des Responsabilités**
- **SKUconfigs.json** : Configuration métier (produits, couleurs)
- **asset.js** : Données techniques (fichiers, slots)
- **materials.json** : Propriétés des matériaux

### **2. Flexibilité**
- Ajout facile de nouveaux modèles
- Configuration de nouveaux schémas de couleurs
- Gestion des produits complexes

### **3. Maintenabilité**
- Configuration centralisée
- Structure claire et documentée
- Séparation technique/métier

### **4. Performance**
- Chargement unique des modèles
- Application sélective des matériaux
- Gestion optimisée de la visibilité

## 🔧 **Configuration et Déploiement**

### **Initialisation dans scene.js**
```javascript
// Créer le gestionnaire SKU
const skuManager = new SKUManager(scene, materialsConfig);

// Charger la configuration
await skuManager.loadSKUConfiguration();

// Exposer globalement pour les boutons HTML
window.skuManager = skuManager;
```

### **Structure des Assets**
```javascript
// Assets/asset.js
const assetConfiguration = {
    models: {
        "model1": {
            name: "Cube 1",
            file: "cubes.glb",
            meshes: {
                "cube1": {
                    materialSlots: ["slot1", "slot2"]
                },
                "cube2": {
                    materialSlots: ["slot1", "slot2"]
                }
            }
        }
    }
};
```

## 📚 **Bonnes Pratiques**

### **1. Nommage des SKUs**
- Format : `XXX-XXX-XXX` (ex: `001-001-001`)
- Structure : `[famille]-[modèle]-[couleur]`
- Cohérence dans la numérotation

### **2. Configuration des Meshes**
- Toujours définir la visibilité
- Utiliser des noms cohérents
- Documenter les slots de matériaux

### **3. Gestion des Erreurs**
- Vérifier l'existence des matériaux
- Gérer les meshes manquants
- Logs de débogage appropriés

### **4. Performance**
- Éviter les rechargements inutiles
- Optimiser les recherches de meshes
- Gérer la mémoire efficacement

---

**Version** : 1.0.0  
**Dernière mise à jour** : Décembre 2024  
**Statut** : Production Ready ✅
