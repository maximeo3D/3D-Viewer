const assetConfiguration = {
  "models": {
    "part_model": {
      "name": "gympanion",
      "file": "gympanion.bin",
      "format": "bin",
      "dataOffset": 66,
      "meshes": {
        "gympanion": {
          "slots": [
            "case",
            "button",
            "screen"
          ],
          "engraving": false,
          "file": "gympanion.bin"
        }
      },
      "files": [
        {
          "file": "gympanion.bin",
          "format": "bin"
        }
      ]
    }
  },
  "rules": [
    {
      "id": "regle",
      "label": "Case",
      "options": [
        {
          "id": "option1",
          "label": "Aluminium",
          "meshes": {
            "gympanion": {
              "materials": {
                "case": "aluminium"
              }
            }
          }
        },
        {
          "id": "option12",
          "label": "Aluminium Red",
          "meshes": {
            "gympanion": {
              "materials": {
                "case": "aluminium_red"
              }
            }
          }
        },
        {
          "id": "option122",
          "label": "Aluminium Black",
          "meshes": {
            "gympanion": {
              "materials": {
                "case": "aluminium_black"
              }
            }
          }
        }
      ]
    },
    {
      "id": "regle2",
      "label": "Base",
      "options": [
        {
          "id": "option1",
          "label": "Base",
          "meshes": {
            "gympanion": {
              "materials": {
                "screen": "Base"
              }
            }
          }
        }
      ]
    },
    {
      "id": "regle3",
      "label": "Button",
      "options": [
        {
          "id": "option1",
          "label": "Aluminium",
          "meshes": {
            "gympanion": {
              "materials": {
                "button": "aluminium"
              }
            }
          }
        },
        {
          "id": "option12",
          "label": "Aluminium Red",
          "meshes": {
            "gympanion": {
              "materials": {
                "button": "aluminium_red"
              }
            }
          }
        },
        {
          "id": "option122",
          "label": "Aluminium Black",
          "meshes": {
            "gympanion": {
              "materials": {
                "button": "aluminium_black"
              }
            }
          }
        }
      ]
    }
  ],
  "engravings": [],
  "fonts": [],
  "defaults": {
    "rules": {},
    "engravingText": "",
    "engravingFont": ""
  }
};
if (typeof module !== 'undefined' && module.exports) {
  module.exports = assetConfiguration;
} else {
  window.assetConfig = assetConfiguration;
}
