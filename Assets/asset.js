// Configuration des modèles 3D - Données techniques avec système de tags
// Ce fichier définit les modèles à charger et leurs paramètres techniques
// Les configurations de tags sont générées automatiquement depuis ce fichier


//Declaration des modèles
const assetConfiguration = {
  models: {
    "part_model": {
      name: "Modèle Part",
      file: "part.glb",
      meshes: {
        "bloc": {
          materialSlots: ["slot1"],
          tags: ["base"]
        },
        "flag": {
          materialSlots: ["slot1"],
          tags: ["flag"]
        },
        "engraving": {
          materialSlots: ["slot1"],
          tags: ["engraving"]
        }
      }
    }
  },
  // Configuration des matériaux par objet (définie manuellement)
  materialConfigs: {
    "bloc": {
      "red": {
        "slot1": "red"
      },
      "blue": {
        "slot1": "blue"
      },
      "green": {
        "slot1": "green"
      }
    },
    "flag": {
      "none": {
        "slot1": "red" // Matériau par défaut, mais sera caché
      },
      "france": {
        "slot1": "flag_fr"
      },
      "unitedstates": {
        "slot1": "flag_us"
      },
      "germany": {
        "slot1": "flag_ger"
      }
    },
    "engraving": {
      "red": {
        "slot1": "engraving_red"
      },
      "blue": {
        "slot1": "engraving_blue"
      },
      "green": {
        "slot1": "engraving_green"
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
