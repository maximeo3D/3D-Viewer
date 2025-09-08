// Configuration des modèles 3D - Données techniques avec système de tags
// Ce fichier définit les modèles à charger et leurs paramètres techniques
// Les configurations de tags sont générées automatiquement depuis ce fichier


//Declaration des modèles
const assetConfiguration = {
  models: {
    "main_model": {
      name: "Modèle Principal",
      file: "cubes.glb",
      meshes: {
        "cube1": {
          materialSlots: ["slot1", "slot2"],
          tags: ["option1", "option3"]
        },
        "cube2": {
          materialSlots: ["slot1", "slot2"],
          tags: ["option2", "option3"]
        }
      }
    }
  },
  // Configuration des matériaux par objet (définie manuellement)
  materialConfigs: {
    "object1": {
      "config1": {
        "slot1": "red",
        "slot2": "blue"
      },
      "config2": {
        "slot1": "blue",
        "slot2": "red"
      }
    },
    "object2": {
      "config1": {
        "slot1": "yellow",
        "slot2": "green"
      },
      "config2": {
        "slot1": "blue",
        "slot2": "red"
      }
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
