const assetConfiguration = {
  models: {
    "part_model": {
      name: "Modèle Part",
      file: "part.glb",
      format: "bin",
      dataOffset: 66,
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
        "slot1": "red"
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
if (typeof module !== 'undefined' && module.exports) {
  module.exports = assetConfiguration;
} else {
  window.assetConfig = assetConfiguration;
}
