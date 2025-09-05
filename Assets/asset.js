// Configuration des modèles 3D - Données techniques
// Ce fichier définit les modèles à charger et leurs paramètres techniques
// Les configurations SKU sont gérées par SKUconfigs.json

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
      },
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1]
    },
    "model2": {
      name: "Cube 2", 
      file: "cubes.glb",
      meshes: {
        "cube1": {
          materialSlots: ["slot1", "slot2"]
        },
        "cube2": {
          materialSlots: ["slot1", "slot2"]
        }
      },
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1]
    }
  },
  defaultMaterials: {
    "cube1": {
      "slot1": "red",
      "slot2": "red"
    },
    "cube2": {
      "slot1": "green", 
      "slot2": "blue"
    }
  }
};

// Exporter la configuration pour utilisation dans scene.js
if (typeof module !== 'undefined' && module.exports) {
  // Node.js
  module.exports = assetConfiguration;
} else {
  // Browser - rendre disponible globalement
  window.assetConfig = assetConfiguration;
}
