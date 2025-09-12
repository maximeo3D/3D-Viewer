# Système de Gravure Dynamique - Documentation

Le système de gravure dynamique permet de créer des textures de texte en temps réel sur les objets 3D avec tag "engraving".

## 🎯 **Vue d'ensemble**

### **Fonctionnalités Principales**
- **Gravure de texte dynamique** : Génération automatique de textures alpha, ambient occlusion et normal maps
- **Polices personnalisées** : Support de 3 polices (Stencil, Futuristic, Western) avec configuration individuelle
- **Visibilité intelligente** : Objet visible uniquement quand du texte est présent
- **Synchronisation des couleurs** : Couleur automatiquement synchronisée avec les matériaux de bloc
- **Calcul automatique** : Ratio d'aspect et ajustement de taille pour éviter l'étirement

### **Architecture**
- **`EngravingManager`** : Classe principale pour la gestion de la gravure
- **Textures dynamiques** : Alpha map, Ambient Occlusion, Normal map
- **Polices personnalisées** : Chargement asynchrone avec vérification Canvas
- **Interface HTML** : Boutons de sélection de police et champ de texte

## 🔧 **Configuration**

### **Polices Personnalisées**
```javascript
// Dans engravingManager.js
this.fontConfigs = {
    'Stencil': {
        fontWeight: 'normal',
        fontStyle: 'normal',
        letterSpacing: 0,
        fontSizeScale: 1
    },
    'Futuristic': {
        fontWeight: 'normal',
        fontStyle: 'normal',
        letterSpacing: 2,
        fontSizeScale: 1
    },
    'Western': {
        fontWeight: 'normal',
        fontStyle: 'normal',
        letterSpacing: 15,
        fontSizeScale: 1
    }
};
```

### **Fichiers de Polices**
```
Fonts/
├── stencil.ttf            # Police Stencil (défaut)
├── futuristic.otf         # Police Futuristic
└── western.ttf            # Police Western
```

### **Styles CSS**
```css
@font-face {
    font-family: 'Stencil';
    src: url('../Fonts/stencil.ttf') format('truetype');
    font-weight: normal;
    font-style: normal;
}

@font-face {
    font-family: 'Futuristic';
    src: url('../Fonts/futuristic.otf') format('opentype');
    font-weight: normal;
    font-style: normal;
}

@font-face {
    font-family: 'Western';
    src: url('../Fonts/western.ttf') format('truetype');
    font-weight: normal;
    font-style: normal;
}
```

## 🎨 **Génération de Textures**

### **Pipeline de Génération**
1. **Alpha Map** : Texte blanc sur fond transparent
2. **Ambient Occlusion** : Alpha map avec flou gaussien
3. **Normal Map** : Générée à partir de l'ambient occlusion via opérateur Sobel

### **Méthode `update()`**
```javascript
update() {
    if (!this.text || this.text.trim() === '') {
        this.applyOpacity(null);
        this.applyNormal(null);
        this.applyAmbient(null);
        return;
    }
    
    // Disposer et recréer les textures pour éviter les contextes null
    if (this.alphaDT) this.alphaDT.dispose();
    if (this.aoDT) this.aoDT.dispose();
    if (this.normalDT) this.normalDT.dispose();
    
    const aspect = this.getAspect();
    const size = Math.max(512, Math.min(2048, Math.round(512 * aspect)));
    
    // Créer les textures avec contexte optimisé
    this.alphaDT = new BABYLON.DynamicTexture('engraving_alpha', { width: size, height: size }, this.scene, false, BABYLON.Texture.TRILINEAR_SAMPLINGMODE, false);
    this.aoDT = new BABYLON.DynamicTexture('engraving_ao', { width: size, height: size }, this.scene, false, BABYLON.Texture.TRILINEAR_SAMPLINGMODE, false);
    this.normalDT = new BABYLON.DynamicTexture('engraving_normal', { width: size, height: size }, this.scene, false, BABYLON.Texture.TRILINEAR_SAMPLINGMODE, false);
    
    // Obtenir les contextes avec willReadFrequently
    const aCtx = this.alphaDT.getContext('2d', { willReadFrequently: true });
    const aoCtx = this.aoDT.getContext('2d', { willReadFrequently: true });
    
    // Configuration de la police
    const config = this.fontConfigs[this.currentFont];
    const fontPx = Math.max(16, Math.min(128, Math.round(size * 0.15)));
    const font = `${config.fontStyle} ${config.fontWeight} ${fontPx}px ${this.currentFont}`;
    
    // Dessiner le texte
    aCtx.font = font;
    aCtx.letterSpacing = `${config.letterSpacing}px`;
    aCtx.textAlign = 'center';
    aCtx.textBaseline = 'middle';
    aCtx.fillStyle = 'white';
    aCtx.fillText(this.text, size / 2, size / 2);
    
    // Générer l'ambient occlusion avec flou
    const imageData = aCtx.getImageData(0, 0, size, size);
    const blurredData = this.applyGaussianBlur(imageData, this.blurPercent);
    aoCtx.putImageData(blurredData, 0, 0);
    
    // Générer la normal map
    this.buildNormalFromAO(this.aoDT);
    
    // Appliquer les textures
    this.applyOpacity(this.alphaDT);
    this.applyNormal(this.normalDT);
    this.applyAmbient(this.aoDT);
}
```

## 🔤 **Gestion des Polices**

### **Chargement Asynchrone**
```javascript
async setFont(fontName) {
    if (this.fontConfigs[fontName]) {
        this.currentFont = fontName;
        console.log(`EngravingManager: Switching to font: ${fontName}`);
        
        // Forcer le chargement de la police spécifique
        if (document.fonts && document.fonts.load) {
            try {
                await document.fonts.load(`bold 16px ${fontName}`);
                console.log(`EngravingManager: Font ${fontName} loaded successfully`);
                
                // Vérifier si la police est vraiment disponible
                const testCanvas = document.createElement('canvas');
                const testCtx = testCanvas.getContext('2d');
                testCtx.font = `bold 16px ${fontName}`;
                const actualFont = testCtx.font;
                
                if (actualFont.includes(fontName)) {
                    console.log(`EngravingManager: Font ${fontName} is working in canvas`);
                } else {
                    console.warn(`EngravingManager: Font ${fontName} fallback to system font`);
                }
            } catch (error) {
                console.warn(`EngravingManager: Error loading font ${fontName}:`, error);
            }
        }
        
        this.update();
    }
}
```

### **Configuration des Propriétés**
Chaque police peut avoir ses propres propriétés :
- **`fontWeight`** : Poids de la police (normal, bold, etc.)
- **`fontStyle`** : Style de la police (normal, italic, etc.)
- **`letterSpacing`** : Espacement entre les lettres en pixels
- **`fontSizeScale`** : Facteur de mise à l'échelle de la taille

## 🎭 **Génération de Normal Map**

### **Opérateur Sobel**
```javascript
buildNormalFromAO(aoDT) {
    const size = aoDT.getSize().width;
    const aoCtx = aoDT.getContext('2d', { willReadFrequently: true });
    const imageData = aoCtx.getImageData(0, 0, size, size);
    const data = imageData.data;
    
    const normalData = new ImageData(size, size);
    const normalArray = normalData.data;
    
    // Appliquer l'opérateur Sobel pour générer la normal map
    for (let y = 1; y < size - 1; y++) {
        for (let x = 1; x < size - 1; x++) {
            const idx = (y * size + x) * 4;
            
            // Sobel X
            const sobelX = 
                -1 * this.getGray(data, x-1, y-1, size) +
                 1 * this.getGray(data, x+1, y-1, size) +
                -2 * this.getGray(data, x-1, y,   size) +
                 2 * this.getGray(data, x+1, y,   size) +
                -1 * this.getGray(data, x-1, y+1, size) +
                 1 * this.getGray(data, x+1, y+1, size);
            
            // Sobel Y
            const sobelY = 
                -1 * this.getGray(data, x-1, y-1, size) +
                -2 * this.getGray(data, x,   y-1, size) +
                -1 * this.getGray(data, x+1, y-1, size) +
                 1 * this.getGray(data, x-1, y+1, size) +
                 2 * this.getGray(data, x,   y+1, size) +
                 1 * this.getGray(data, x+1, y+1, size);
            
            // Normaliser et convertir en RGB
            const length = Math.sqrt(sobelX * sobelX + sobelY * sobelY + 1);
            const nx = (sobelX / length + 1) * 0.5;
            const ny = (sobelY / length + 1) * 0.5;
            const nz = (1 / length + 1) * 0.5;
            
            normalArray[idx]     = Math.round(nx * 255); // R
            normalArray[idx + 1] = Math.round(ny * 255); // G
            normalArray[idx + 2] = Math.round(nz * 255); // B
            normalArray[idx + 3] = 255; // A
        }
    }
    
    const normalCtx = this.normalDT.getContext('2d', { willReadFrequently: true });
    normalCtx.putImageData(normalData, 0, 0);
}
```

## 🎨 **Flou Gaussien**

### **Contrôle Centralisé**
```javascript
// Contrôle centralisé du flou via pourcentage
this.blurPercent = 10; // 10% de flou pour alpha et ambient
```

### **Application du Flou**
```javascript
applyGaussianBlur(imageData, blurPercent) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const blurRadius = Math.max(1, Math.round(width * blurPercent / 100));
    
    // Algorithme de flou gaussien
    // ... implémentation du flou gaussien
    
    return blurredImageData;
}
```

## 🔄 **Synchronisation des Couleurs**

### **Avec les Matériaux de Bloc**
```javascript
// Dans index.html
document.getElementById('bloc-red-btn').addEventListener('click', () => {
    window.tagManager.applyMaterialConfig('bloc', 'red');
    window.tagManager.applyMaterialConfig('engraving', 'red'); // Synchronisation
    const t = (document.getElementById('engraving-text')?.value || '').toString();
    requestAnimationFrame(() => {
        if (window.engravingManager) window.engravingManager.setText(t);
    });
    updateButtonStates();
});
```

### **Fonction de Détection**
```javascript
function getActiveBlocColor() {
    if (document.getElementById('bloc-red-btn').classList.contains('active')) return 'red';
    if (document.getElementById('bloc-blue-btn').classList.contains('active')) return 'blue';
    if (document.getElementById('bloc-green-btn').classList.contains('active')) return 'green';
    return 'green'; // défaut
}
```

## 🎯 **Interface Utilisateur**

### **HTML Structure**
```html
<div class="category">
    <h3>Engraving</h3>
    <div class="controls">
        <input type="text" id="engraving-text" placeholder="Enter engraving text...">
        <div class="button-group">
            <button class="sidebar-btn active" id="font-stencil-btn">Stencil</button>
            <button class="sidebar-btn" id="font-futuristic-btn">Futuristic</button>
            <button class="sidebar-btn" id="font-western-btn">Western</button>
        </div>
    </div>
</div>
```

### **Event Listeners**
```javascript
// Boutons de choix de police pour l'engraving
document.getElementById('font-stencil-btn').addEventListener('click', async () => {
    if (window.engravingManager) {
        await window.engravingManager.setFont('Stencil');
        // Mettre à jour les boutons actifs
        document.querySelectorAll('[id^="font-"]').forEach(btn => btn.classList.remove('active'));
        document.getElementById('font-stencil-btn').classList.add('active');
    }
});

// Champ de texte pour l'engraving
document.getElementById('engraving-text').addEventListener('input', (e) => {
    if (window.engravingManager) {
        // Synchroniser la couleur de l'engraving avec celle du bloc avant de définir le texte
        const activeColor = getActiveBlocColor();
        window.tagManager.applyMaterialConfig('engraving', activeColor);
        window.engravingManager.setText(e.target.value);
    }
});
```

## 🔧 **Optimisations**

### **Performance**
- **`willReadFrequently: true`** : Optimisation des contextes Canvas pour les lectures fréquentes
- **Disposal des textures** : Évite les fuites mémoire en disposant les anciennes textures
- **Taille dynamique** : Calcul automatique de la taille optimale selon le ratio d'aspect

### **Stabilité**
- **Gestion des erreurs** : Vérification des contextes null avant utilisation
- **Fallback des polices** : Retour vers les polices système en cas d'erreur
- **Chargement asynchrone** : Évite les blocages lors du chargement des polices

## 🐛 **Dépannage**

### **Problèmes Courants**

#### **Police Arial par défaut**
- **Cause** : Police personnalisée non chargée
- **Solution** : Vérifier le format de fichier (.ttf vs .otf) et le chemin dans CSS

#### **Erreurs `clearRect` ou `createImageData`**
- **Cause** : Contexte Canvas null
- **Solution** : Disposer et recréer les textures à chaque mise à jour

#### **Gravure qui disparaît**
- **Cause** : Conflit entre `TagManager` et `EngravingManager`
- **Solution** : Supprimer les appels `update()` redondants dans `TagManager`

#### **Double-clic requis**
- **Cause** : Chargement asynchrone des polices non géré
- **Solution** : Utiliser `await document.fonts.load()` dans `setFont()`

### **Logs de Débogage**
```javascript
console.log(`EngravingManager: Switching to font: ${fontName}`);
console.log(`EngravingManager: Font ${fontName} loaded successfully`);
console.log(`EngravingManager: Font ${fontName} is working in canvas`);
console.warn(`EngravingManager: Font ${fontName} fallback to system font`);
```

## 📚 **Références**

### **Babylon.js**
- **DynamicTexture** : [Documentation officielle](https://doc.babylonjs.com/typedoc/classes/BABYLON.DynamicTexture)
- **PBRMaterial** : [Documentation officielle](https://doc.babylonjs.com/typedoc/classes/BABYLON.PBRMaterial)

### **Canvas 2D API**
- **getContext('2d')** : [Documentation MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext)
- **willReadFrequently** : [Spécification HTML](https://html.spec.whatwg.org/multipage/canvas.html#concept-canvas-will-read-frequently)

### **Font Loading API**
- **document.fonts.load()** : [Documentation MDN](https://developer.mozilla.org/en-US/docs/Web/API/FontFaceSet/load)

---

**Version** : 2.6.0  
**Dernière mise à jour** : Décembre 2024  
**Statut** : Production Ready ✅
