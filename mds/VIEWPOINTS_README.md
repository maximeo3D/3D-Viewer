# Système de Points de Vue (Viewpoints) - Documentation

## 🎯 **Vue d'ensemble**

Le système de viewpoints permet de définir des positions de caméra prédéfinies et de naviguer entre elles avec des transitions fluides. Il offre un contrôle précis de la caméra avec synchronisation temps réel entre l'interface Tweakpane et la scène 3D.

## 📋 **Fonctionnalités**

### **Points de Vue Prédéfinis**
- Définition de viewpoints dans `studio.json`
- Paramètres complets : position, rotation, distance, FOV, limites
- Interface HTML avec boutons de sélection
- Transitions fluides avec animation étape par étape

### **Contrôles Avancés**
- Synchronisation bidirectionnelle Tweakpane ↔ Scène 3D
- Export des paramètres de caméra actuels vers viewpoints
- Gestion des angles circulaires (0-360°)
- Conversion automatique degrés/radians

### **Animation Intelligente**
- Ordre d'animation optimisé pour éviter les conflits
- Gestion des limites de distance
- Transitions sans "saut" visuel
- Durées configurables par étape

## 🔧 **Configuration**

### **Structure studio.json**
```json
{
  "viewpoints": {
    "Viewpoint1": {
      "alpha": 0,
      "beta": 1.2,
      "radius": 10.0,
      "fov": 50,
      "targetX": 0,
      "targetY": 0,
      "targetZ": 0,
      "minDistance": 1.0,
      "maxDistance": 100.0
    },
    "Viewpoint2": {
      "alpha": 180,
      "beta": 1.2,
      "radius": 15.0,
      "fov": 75,
      "targetX": 2,
      "targetY": 1,
      "targetZ": 0,
      "minDistance": 2.0,
      "maxDistance": 50.0
    }
  }
}
```

### **Paramètres des Viewpoints**
- **`alpha`** : Angle de rotation horizontal (yaw) en degrés (0-360°)
- **`beta`** : Angle de rotation vertical (pitch) en radians
- **`radius`** : Distance de la caméra à la cible
- **`fov`** : Champ de vision en degrés (10-120°)
- **`targetX/Y/Z`** : Position de la cible de la caméra
- **`minDistance`** : Distance minimale autorisée
- **`maxDistance`** : Distance maximale autorisée

## 🎬 **Animation Étape par Étape**

### **Ordre d'Animation Optimisé**
1. **Alpha** (25% de la durée) - Rotation horizontale
2. **FOV** (15% de la durée) - Champ de vision
3. **Target** (25% de la durée) - Position de la cible
4. **MinDistance** (5% de la durée) - Limite inférieure
5. **Radius** (20% de la durée) - Distance actuelle
6. **MaxDistance** (10% de la durée) - Limite supérieure

### **Fonctions d'Animation**
```javascript
// Animation d'une valeur scalaire
function animateScalar(from, to, setter, durationMs, easing)

// Animation d'un angle avec gestion circulaire
function animateAlphaCircular(fromRad, toRad, durationMs)

// Animation d'un vecteur 3D
function animateVector3(from, to, setter, durationMs, easing)
```

### **Gestion des Angles Circulaires**
```javascript
// Normalisation vers [0, 2π)
function normalizeRadTau(rad)

// Calcul du plus court chemin
function shortestAnglePositive(a, b)

// Clamping des valeurs
function clamp(val, min, max)
```

## 🎮 **Interface Utilisateur**

### **Boutons HTML**
```html
<div class="category">
    <h3>Camera Viewpoints</h3>
    <div class="buttons">
        <button class="sidebar-btn active" id="viewpoint1-btn">Viewpoint 1</button>
        <button class="sidebar-btn" id="viewpoint2-btn">Viewpoint 2</button>
    </div>
</div>
```

### **Contrôles Tweakpane**
- **Sélecteur de Viewpoint** : Dropdown dynamique listant tous les viewpoints
- **Contrôles de Caméra** : Alpha, Distance, FOV avec synchronisation temps réel
- **Bouton Export** : Sauvegarde des paramètres actuels vers le viewpoint sélectionné

### **Synchronisation Temps Réel**
- Les modifications dans Tweakpane sont immédiatement appliquées à la scène
- Les mouvements de caméra sont reflétés dans Tweakpane
- Conversion automatique entre degrés (UI) et radians (Babylon.js)

## 🔄 **Workflow d'Utilisation**

### **1. Définir un Viewpoint**
1. Positionner la caméra manuellement
2. Ouvrir le menu Camera dans Tweakpane
3. Cliquer sur "Export Camera Params"
4. Les paramètres sont sauvegardés dans `studio.json`

### **2. Naviguer entre Viewpoints**
1. Utiliser les boutons HTML pour un accès rapide
2. Ou utiliser le sélecteur dans Tweakpane
3. Les transitions sont automatiquement animées

### **3. Modifier un Viewpoint**
1. Sélectionner le viewpoint dans Tweakpane
2. Modifier les paramètres souhaités
3. Cliquer sur "Export Camera Params" pour sauvegarder

## 🛠️ **Implémentation Technique**

### **Classe TweakpaneManager**
```javascript
class TweakpaneManager {
    constructor(scene, config) {
        this.viewpoints = {};
        this.selectedViewpoint = 'Viewpoint1';
    }
    
    async loadStudioViewpoints() {
        // Chargement des viewpoints depuis studio.json
    }
    
    exportCameraParams() {
        // Export des paramètres actuels vers le viewpoint sélectionné
    }
    
    syncCameraToTweakpane() {
        // Synchronisation des valeurs de caméra vers l'interface
    }
}
```

### **Fonctions d'Animation dans scene.js**
```javascript
async function animateToViewpoint(vp, totalDurationMs = 1000) {
    // Animation étape par étape avec ordre optimisé
}

function normalizeRadTau(rad) {
    // Normalisation des angles en radians
}

function shortestAnglePositive(a, b) {
    // Calcul du plus court chemin pour l'interpolation circulaire
}
```

## 🐛 **Dépannage**

### **Problèmes Courants**

#### **Viewpoint ne se charge pas**
- Vérifier la structure JSON dans `studio.json`
- S'assurer que les viewpoints sont dans la section `viewpoints`
- Vérifier les noms des viewpoints (respecter la casse)

#### **Transitions saccadées**
- Vérifier que les valeurs alpha sont dans la plage 0-360°
- S'assurer que les limites min/max sont cohérentes
- Vérifier la durée totale d'animation

#### **Synchronisation Tweakpane incorrecte**
- Vérifier les conversions degrés/radians
- S'assurer que `syncCameraToTweakpane()` est appelée
- Vérifier que `pane.refresh()` est appelé après mise à jour

#### **Export ne fonctionne pas**
- Vérifier que le serveur PowerShell est démarré
- S'assurer que `studio.json` est accessible en écriture
- Vérifier les permissions de fichier

### **Logs de Débogage**
```javascript
// Activer les logs pour le débogage
console.log('Viewpoint data:', vp);
console.log('Animation progress:', t);
console.log('Camera values:', camera.alpha, camera.radius);
```

## 📈 **Optimisations**

### **Performance**
- Durées d'animation configurables par étape
- Utilisation de `requestAnimationFrame` pour fluidité
- Clamping automatique des valeurs pour éviter les erreurs

### **Expérience Utilisateur**
- Transitions fluides sans "saut" visuel
- Synchronisation temps réel entre interface et scène
- Boutons HTML pour accès rapide aux viewpoints

### **Maintenabilité**
- Code modulaire avec fonctions d'animation séparées
- Configuration centralisée dans `studio.json`
- Interface cohérente entre HTML et Tweakpane

## 🔮 **Évolutions Futures**

### **Fonctionnalités Prévues**
- Support de courbes d'animation personnalisées
- Sauvegarde automatique des viewpoints modifiés
- Interface de création de viewpoints visuelle
- Support des animations de caméra complexes

### **Améliorations Techniques**
- Cache des viewpoints pour performance
- Validation des paramètres de viewpoints
- Support des viewpoints conditionnels
- Intégration avec le système de tags

---

**Version** : 2.7.0  
**Dernière mise à jour** : Décembre 2024  
**Statut** : Production Ready ✅
