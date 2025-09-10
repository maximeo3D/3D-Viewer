# Contrôles Personnalisés - Guide Utilisateur

Documentation des contrôles personnalisés de caméra et d'objets 3D dans le 3D Viewer.

## 🎮 **Contrôles de Caméra Personnalisés**

### **Comportement Général**
- **Contrôles par défaut désactivés** : Les contrôles automatiques de Babylon.js sont désactivés
- **Contrôles personnalisés** : Implémentation manuelle des interactions souris
- **Pan désactivé** : Le clic droit ne permet plus de déplacer la caméra

### **Mouvement Horizontal (X)**
- **Action** : Contrôle l'angle horizontal de la caméra (Yaw/Alpha)
- **Comportement** : Rotation de la caméra autour de l'axe vertical
- **Sensibilité** : Ajustable via `window.cameraHorizontalSensitivity` (100-10000)
- **Contrôle Tweakpane** : "Horizontal Sensitivity" dans le menu Camera
- **Direction** : Inversée pour un comportement naturel

### **Mouvement Vertical (Y)**
- **Action** : Rotation des objets 3D sur leur axe X
- **Comportement** : Les objets se penchent/rotent verticalement
- **Limites** : -90° à +90° de rotation
- **Élasticité** : Retour automatique à 0° au relâchement de la souris

### **Zoom**
- **Action** : Contrôle de la distance de la caméra
- **Comportement** : Zoom fluide avec interpolation et lissage
- **Limites** : Définies dans `studio.json` (minDistance/maxDistance)
- **Sensibilité** : Réduite de 50% par défaut
- **Interpolation** : Zoom fluide avec `zoomSmoothness = 0.15`

## 🎯 **Contrôle "Initial Pitch"**

### **Fonction**
- **Objectif** : Définir l'angle vertical initial de la caméra
- **Plage** : -90° à +90° (plus naturel que 0° à 180°)
- **Persistance** : Sauvegardé dans `studio.json`

### **Utilisation**
1. **Ouvrir** le menu "Camera" dans Tweakpane
2. **Ajuster** le slider "Initial Pitch" (-90 à +90)
3. **Observer** la caméra se repositionner automatiquement
4. **Vérifier** que les limites beta sont synchronisées

### **Configuration**
```json
{
  "camera": {
    "initialPitch": 68.75,
    "beta": 1.20,
    "lowerBetaLimit": 1.20,
    "upperBetaLimit": 1.20
  }
}
```

## 🔄 **Élasticité de Rotation des Objets**

### **Comportement**
- **Pendant le mouvement** : L'élasticité est désactivée
- **Au relâchement** : L'élasticité se réactive
- **Retour** : Animation fluide vers 0° de rotation
- **Vitesse** : Contrôlée par `elasticityFactor = 0.1`

### **Variables de Contrôle**
```javascript
let currentObjectRotationX = 0;           // Rotation actuelle
let targetObjectRotationX = 0;            // Rotation cible (toujours 0°)
let objectRotationElasticityEnabled = true; // État de l'élasticité
```

## 🎨 **Système de Tags**

### **Configuration dans asset.js**
```javascript
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
```

### **Application Automatique**
- **Au chargement** : Les tags sont appliqués selon la configuration
- **En temps réel** : Les changements sont immédiatement visibles
- **Persistance** : La configuration est centralisée dans `asset.js`
- **Flexibilité** : Système modulaire permettant d'ajouter facilement de nouveaux tags

## 🎛️ **Contrôle de Visibilité de Tweakpane**

### **Variable de Contrôle**
Dans `scene.js`, ligne ~35 :
```javascript
// Contrôle de visibilité de Tweakpane - Changez true/false ici
let tweakpaneVisible = true;
```

### **Utilisation**
- **`true`** : Tweakpane est visible
- **`false`** : Tweakpane est caché
- **Application** : Au démarrage de l'application

### **Cas d'Usage**
- **Développement** : `tweakpaneVisible = true` pour accéder aux contrôles
- **Production** : `tweakpaneVisible = false` pour une interface propre
- **Intégration** : Cacher Tweakpane lors de l'intégration dans d'autres applications

## 🔧 **Paramètres de Sensibilité**

### **Caméra Alpha (Yaw)**
```javascript
// Sensibilité horizontale ajustable via Tweakpane
window.cameraHorizontalSensitivity = 1000; // Plus élevé = moins sensible
const cameraSensitivity = 5 / window.cameraHorizontalSensitivity;
```

### **Rotation des Objets**
```javascript
const objectRotationSensitivity = 0.006; // Sensibilité de rotation des objets
```

### **Élasticité**
```javascript
const elasticityFactor = 0.1; // Vitesse de retour à 0°
```

### **Zoom**
```javascript
const zoomSmoothness = 0.15; // Facteur de lissage du zoom (plus élevé = plus fluide)
```

## 🎯 **Limites et Contraintes**

### **Rotation des Objets**
- **Minimum** : -90° (-π/2 radians)
- **Maximum** : +90° (+π/2 radians)
- **Démarrage** : Toujours à 0°

### **Caméra Beta (Pitch)**
- **Contrôle** : Uniquement via "Initial Pitch" dans Tweakpane
- **Limites** : Synchronisées avec la valeur d'Initial Pitch
- **Mouvement** : Désactivé via les contrôles souris

### **Pan de Caméra**
- **Clic droit** : Complètement désactivé
- **Menu contextuel** : Désactivé pour éviter les conflits
- **Contrôles par défaut** : Désactivés avec `camera.detachControl(canvas)`

## 🚀 **Optimisations de Performance**

### **Gestion des Événements**
- **Observables** : Utilisation d'observables Babylon.js pour les performances
- **Throttling** : Limitation des calculs de rotation
- **Culling** : Optimisation du rendu des objets

### **Mémoire**
- **Réutilisation** : Des variables pour éviter les allocations
- **Nettoyage** : Gestion propre des événements
- **Optimisation** : Code optimisé pour les performances

## 🔍 **Débogage et Maintenance**

### **Console Logs**
- **Supprimés** : Tous les console.log de debug ont été retirés
- **Propre** : Code de production sans logs

### **Gestion d'Erreurs**
- **Validation** : Vérifications de sécurité pour les contrôles
- **Fallbacks** : Valeurs par défaut en cas d'erreur
- **Robustesse** : Code résistant aux erreurs

---

**Version** : 2.5.0  
**Dernière mise à jour** : Décembre 2024  
**Statut** : Production Ready ✅
