// Configuration des modèles 3D
// Ce fichier définit les modèles à charger, leurs matériaux et leurs propriétés
// Format: module JavaScript avec export par défaut

// Utiliser un nom unique pour éviter les conflits
const assetConfiguration = {
  models: [
    {
      name: "cube-sphere",           // Nom unique du modèle
      file: "cube-sphere.glb",       // Fichier 3D à charger (GLB/GLTF)
      meshes: [
        {
          name: "Cube",              // Nom du mesh dans le fichier 3D
          visible: true,             // Visibilité du mesh individuel (true = visible, false = caché)
          materialSlot1: "red",      // Matériau pour le slot 1 (primitive0)
          materialSlot2: "blue"      // Matériau pour le slot 2 (primitive1)
        },
        {
          name: "Sphere",            // Nom du mesh dans le fichier 3D
          visible: false,            // Visibilité du mesh individuel (true = visible, false = caché)
          materialSlot1: "red",      // Matériau pour le slot 1 (primitive0)
          materialSlot2: "blue",     // Matériau pour le slot 2 (primitive1)
          materialSlot3: "yellow"    // Matériau pour le slot 3 (primitive2)
        }
      ],
      position: [0, 0, 0],           // Position [X, Y, Z] dans la scène
      rotation: [0, 0, 0],           // Rotation [X, Y, Z] en radians
      scale: [1, 1, 1]              // Échelle [X, Y, Z]
    }
  ]
};

// Exporter la configuration pour utilisation dans scene.js
if (typeof module !== 'undefined' && module.exports) {
  // Node.js
  module.exports = assetConfiguration;
} else {
  // Browser - rendre disponible globalement
  window.assetConfig = assetConfiguration;
}
