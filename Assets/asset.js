// Configuration des modèles 3D
// Ce fichier définit les modèles à charger, leurs matériaux et leurs propriétés
// Format: module JavaScript avec export par défaut

// Utiliser un nom unique pour éviter les conflits
const assetConfiguration = {
  models: [
    {
      name: "Fleche",           // Nom unique du modèle
      file: "arrow.glb",       // Fichier 3D à charger (GLB/GLTF)
      meshes: [
        {
          name: "arrow",              // Nom du mesh dans le fichier 3D
          visible: true,             // Visibilité du mesh individuel (true = visible, false = caché)
          materialSlot1: "red",      // Matériau pour le slot 1 (primitive0)
        },
        {
          name: "link1",            // Nom du mesh dans le fichier 3D
          visible: true,            // Visibilité du mesh individuel (true = visible, false = caché)
          materialSlot1: "yellow",      // Matériau pour le slot 1 (primitive0)
        },
        {
          name: "link2",            // Nom du mesh dans le fichier 3D
          visible: true,            // Visibilité du mesh individuel (true = visible, false = caché)
          materialSlot1: "red",      // Matériau pour le slot 1 (primitive0)
        },
        {
          name: "link3",            // Nom du mesh dans le fichier 3D
          visible: true,            // Visibilité du mesh individuel (true = visible, false = caché)
          materialSlot1: "yellow",      // Matériau pour le slot 1 (primitive0)
        },
        {
          name: "link4",            // Nom du mesh dans le fichier 3D
          visible: true,            // Visibilité du mesh individuel (true = visible, false = caché)
          materialSlot1: "blue",      // Matériau pour le slot 1 (primitive0)
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
