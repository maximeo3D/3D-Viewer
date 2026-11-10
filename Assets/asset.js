const assetConfiguration = {
  "models": {
    "part_model": {
      "name": "Modèle Part",
      "file": "model.bin",
      "format": "bin",
      "dataOffset": 66,
      "meshes": {
        "bloc": {
          "slots": [
            "Matériau 1"
          ],
          "engraving": false,
          "file": "part.bin"
        },
        "flag": {
          "slots": [
            "Matériau 1"
          ],
          "engraving": true,
          "file": "part.bin"
        },
        "engraving": {
          "slots": [
            "Matériau 1"
          ],
          "engraving": true,
          "file": "part.bin"
        },
        "Cube": {
          "slots": [
            "mat1",
            "mat2"
          ],
          "engraving": false,
          "file": "model.bin"
        }
      },
      "files": [
        {
          "file": "model.bin",
          "format": "bin"
        },
        {
          "file": "part.bin",
          "format": "bin"
        }
      ]
    }
  },
  "rules": [
    {
      "id": "option",
      "label": "Objects",
      "options": [
        {
          "id": "base",
          "label": "Rectangle",
          "meshes": {
            "bloc": {
              "visible": true
            },
            "flag": {
              "visible": true
            },
            "engraving": {
              "visible": true
            }
          }
        },
        {
          "id": "option",
          "label": "Cube",
          "meshes": {
            "Cube": {
              "visible": true
            }
          }
        }
      ]
    },
    {
      "id": "color",
      "label": "Couleur",
      "options": [
        {
          "id": "red",
          "label": "Red",
          "meshes": {
            "bloc": {
              "materials": {
                "Matériau 1": "red"
              }
            },
            "engraving": {
              "materials": {
                "Matériau 1": "engraving_red"
              }
            },
            "Cube": {
              "materials": {
                "mat1": "red",
                "mat2": "red"
              }
            }
          }
        },
        {
          "id": "blue",
          "label": "Blue",
          "meshes": {
            "bloc": {
              "materials": {
                "Matériau 1": "blue"
              }
            },
            "engraving": {
              "materials": {
                "Matériau 1": "engraving_blue"
              }
            },
            "Cube": {
              "materials": {
                "mat1": "blue",
                "mat2": "blue"
              }
            }
          }
        },
        {
          "id": "green",
          "label": "Green",
          "meshes": {
            "bloc": {
              "materials": {
                "Matériau 1": "green"
              }
            },
            "engraving": {
              "materials": {
                "Matériau 1": "engraving_green"
              }
            },
            "Cube": {
              "materials": {
                "mat1": "green",
                "mat2": "green"
              }
            }
          }
        }
      ]
    },
    {
      "id": "flag",
      "label": "Drapeau",
      "options": [
        {
          "id": "none",
          "label": "Aucun",
          "meshes": {
            "flag": {
              "visible": false,
              "materials": {
                "Matériau 1": "red"
              }
            }
          }
        },
        {
          "id": "france",
          "label": "France",
          "meshes": {
            "flag": {
              "materials": {
                "Matériau 1": "flag_fr"
              }
            }
          }
        },
        {
          "id": "unitedstates",
          "label": "United States",
          "meshes": {
            "flag": {
              "materials": {
                "Matériau 1": "flag_us"
              }
            }
          }
        },
        {
          "id": "germany",
          "label": "Germany",
          "meshes": {
            "flag": {
              "materials": {
                "Matériau 1": "flag_ger"
              }
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
  },
  "fonts": [
    {
      "name": "Stencil",
      "file": "stencil.ttf"
    },
    {
      "name": "Futuristic",
      "file": "futuristic.otf"
    },
    {
      "name": "Western",
      "file": "western.ttf"
    },
    {
      "name": "GODOFWAR",
      "file": "GODOFWAR.TTF"
    }
  ],
  "engravings": [
    {
      "id": "engraving",
      "label": "Gravure",
      "mesh": "engraving",
      "text": "Test",
      "font": "Futuristic",
      "fonts": [
        "Futuristic"
      ]
    },
    {
      "id": "gravure",
      "label": "Gravure 2",
      "mesh": "flag",
      "text": "Test",
      "font": "GODOFWAR",
      "fonts": [
        "Stencil",
        "GODOFWAR"
      ]
    }
  ]
};
if (typeof module !== 'undefined' && module.exports) {
  module.exports = assetConfiguration;
} else {
  window.assetConfig = assetConfiguration;
}
