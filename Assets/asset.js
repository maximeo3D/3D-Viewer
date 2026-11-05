const assetConfiguration = {
  "models": {
    "part_model": {
      "name": "Modèle Part",
      "file": "part.glb",
      "format": "bin",
      "dataOffset": 66,
      "meshes": {
        "bloc": {
          "materialSlots": [
            "slot1"
          ],
          "tags": [
            "base"
          ]
        },
        "flag": {
          "materialSlots": [
            "slot1"
          ],
          "tags": [
            "flag"
          ]
        },
        "engraving": {
          "materialSlots": [
            "slot1"
          ],
          "tags": [
            "engraving"
          ]
        }
      }
    }
  },
  "materialConfigs": {
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
    }
  },
  "rules": [
    {
      "id": "option",
      "label": "Options",
      "type": "visibility",
      "options": [
        {
          "id": "base",
          "label": "Option 1",
          "tags": [
            "base"
          ]
        }
      ]
    },
    {
      "id": "color",
      "label": "Couleur",
      "type": "material",
      "options": [
        {
          "id": "red",
          "label": "Red",
          "assignments": {
            "bloc": {
              "slot1": "red"
            },
            "engraving": {
              "slot1": "engraving_red"
            }
          }
        },
        {
          "id": "blue",
          "label": "Blue",
          "assignments": {
            "bloc": {
              "slot1": "blue"
            },
            "engraving": {
              "slot1": "engraving_blue"
            }
          }
        },
        {
          "id": "green",
          "label": "Green",
          "assignments": {
            "bloc": {
              "slot1": "green"
            },
            "engraving": {
              "slot1": "engraving_green"
            }
          }
        }
      ]
    },
    {
      "id": "flag",
      "label": "Drapeau",
      "type": "material",
      "showTag": "flag",
      "hideWhen": "none",
      "options": [
        {
          "id": "none",
          "label": "Aucun",
          "assignments": {
            "flag": {
              "slot1": "red"
            }
          }
        },
        {
          "id": "france",
          "label": "France",
          "assignments": {
            "flag": {
              "slot1": "flag_fr"
            }
          }
        },
        {
          "id": "unitedstates",
          "label": "United States",
          "assignments": {
            "flag": {
              "slot1": "flag_us"
            }
          }
        },
        {
          "id": "germany",
          "label": "Germany",
          "assignments": {
            "flag": {
              "slot1": "flag_ger"
            }
          }
        }
      ]
    }
  ],
  "defaults": {
    "rules": {
      "option": "base",
      "color": "red",
      "flag": "france"
    },
    "engravingText": "Test",
    "engravingFont": "Stencil"
  }
};
if (typeof module !== 'undefined' && module.exports) {
  module.exports = assetConfiguration;
} else {
  window.assetConfig = assetConfiguration;
}
