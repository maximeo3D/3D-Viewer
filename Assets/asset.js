const assetConfiguration = {
  "models": {
    "part_model": {
      "name": "Nouveau projet",
      "file": "",
      "format": "bin",
      "dataOffset": 66,
      "meshes": {},
      "files": []
    }
  },
  "rules": [],
  "engravings": [],
  "fonts": [
    {
      "name": "ARIAL",
      "file": "ARIAL.TTF"
    }
  ],
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
