# 🌞 Lightmap System - 3D Viewer

Ce document explique comment utiliser le système de lightmap intégré dans le 3D Viewer avec éditeur de matériaux PBR.

## 🎯 **Fonctionnalités Lightmap**

### **1. Texture Lightmap**
- **Format** : PNG, JPG, ou autres formats d'image supportés
- **Usage** : Texture de lumière pré-calculée (baked lighting)
- **Emplacement** : Dossier `Textures/`
- **Avantages** : Performance optimisée, éclairage réaliste

### **2. Lightmap as Shadowmap**
- **Propriété** : `useLightmapAsShadowmap`
- **Valeur par défaut** : `true` (activé)
- **Fonction** : Utilise le lightmap comme shadowmap pour les ombres
- **Performance** : Améliore les performances en évitant le calcul des ombres en temps réel

## 🔧 **Configuration des Matériaux**

### **Format JSON dans materials.json**
```json
{
  "materials": {
    "mon_materiau": {
      "type": "pbr",
      "baseColor": "#ffffff",
      "metallic": 0.5,
      "roughness": 0.3,
      "alpha": 1.0,
      "albedoTexture": "texture_albedo.png",
      "metallicTexture": "texture_metallic.png",
      "microSurfaceTexture": "texture_roughness.png",
      "ambientTexture": "texture_ao.png",
      "opacityTexture": "texture_alpha.png",
      "bumpTexture": "texture_normal.png",
      "bumpTextureIntensity": 1.0,
      "lightmapTexture": "texture_lightmap.png",
      "useLightmapAsShadowmap": true, // Automatically managed - always true
      "backFaceCulling": true
    }
  }
}
```

### **Propriétés Lightmap**
- **`lightmapTexture`** : Nom du fichier de texture lightmap
  - `""` ou `null` : Pas de lightmap
  - `"texture.png"` : Utilise la texture spécifiée
- **`useLightmapAsShadowmap`** : *Automatiquement activé* pour des performances optimales
  - **Toujours `true`** : Utilise le lightmap pour les ombres (optimisé)
  - **Non configurable** : Simplifie l'interface tout en maximisant les performances

## 🎨 **Interface dat.GUI**

### **Contrôles Disponibles**
1. **Lightmap Texture** : Dropdown pour sélectionner la texture lightmap
2. **Use Lightmap as Shadowmap** : *Caché - Toujours activé pour des performances optimales*

### **Ordre des Contrôles**
1. Albedo Color
2. Metallic
3. Roughness
4. Alpha
5. Albedo Texture
6. Metallic Texture
7. Microsurface Texture
8. Ambient Texture
9. Opacity Texture
10. Normal Map
11. **🌞 Lightmap Texture** ← **NOUVEAU**
12. **🌞 Use Lightmap as Shadowmap** ← **CACHÉ (toujours activé)**
13. Back Face Culling
14. Show Inspector
15. Refresh Images
16. Export Materials

## 🚀 **Utilisation Pratique**

### **1. Créer un Lightmap**
- Utilisez un logiciel 3D (Blender, Maya, 3ds Max)
- Bake l'éclairage sur une texture UV
- Exportez en PNG ou JPG
- Placez dans le dossier `Textures/`

### **2. Configurer le Matériau**
- Sélectionnez le matériau dans dat.GUI
- Choisissez la texture lightmap dans le dropdown
- **Note** : "Use Lightmap as Shadowmap" est automatiquement activé pour des performances optimales
- Ajustez les autres propriétés PBR selon vos besoins

### **3. Tester et Ajuster**
- Vérifiez le rendu en temps réel
- Ajustez l'intensité via les propriétés PBR
- Exportez la configuration via "Export Materials"

## 💡 **Conseils d'Optimisation**

### **Performance**
- **Lightmap + Shadowmap** : Meilleure performance, ombres pré-calculées
- **Lightmap seul** : Performance intermédiaire, ombres en temps réel
- **Pas de lightmap** : Performance maximale, éclairage en temps réel

### **Qualité**
- **Résolution** : Utilisez des textures 1024x1024 ou 2048x2048 pour de bons résultats
- **Compression** : PNG pour la qualité, JPG pour la taille
- **UV Mapping** : Assurez-vous que les UVs sont bien dépliés

### **Compatibilité**
- **Formats supportés** : PNG, JPG, TGA, BMP
- **Moteur** : Babylon.js 6.x avec PBR materials
- **Navigateurs** : Tous les navigateurs modernes avec WebGL 2.0

## 🔍 **Dépannage**

### **Problèmes Courants**

#### **Lightmap non visible**
- Vérifiez que la texture est dans le dossier `Textures/`
- Contrôlez le nom du fichier dans `materials.json`
- Utilisez le bouton "Refresh Images" puis rechargez la page

#### **Performance dégradée**
- Désactivez "Use Lightmap as Shadowmap" si nécessaire
- Réduisez la résolution des textures lightmap
- Vérifiez que les UVs ne se chevauchent pas

#### **Ombres incorrectes**
- Vérifiez que `useLightmapAsShadowmap` est activé
- Assurez-vous que le lightmap contient des informations d'ombre
- Ajustez l'exposition HDR si nécessaire

## 📚 **Références Techniques**

### **Babylon.js PBR Materials**
- **Documentation** : [PBR Material](https://doc.babylonjs.com/typedoc/classes/BABYLON.PBRMaterial)
- **Lightmap** : [Texture Properties](https://doc.babylonjs.com/features/featuresDeepDive/materials/using/textures)
- **Shadowmap** : [Shadow System](https://doc.babylonjs.com/features/featuresDeepDive/lights/shadows)

### **Standards PBR**
- **Physically Based Rendering** : Modèle de rendu réaliste
- **Lightmap Baking** : Pré-calcul de l'éclairage
- **Shadow Mapping** : Technique d'ombrage avancée

---

**Version** : 1.0.0  
**Dernière mise à jour** : Décembre 2024  
**Statut** : Production Ready ✅

### **🆕 Nouvelles Fonctionnalités**
- **Système de lightmap complet** : Support des textures de lumière pré-calculées
- **Lightmap as Shadowmap** : *Automatiquement activé* pour des performances optimales
- **Interface dat.GUI simplifiée** : Contrôle lightmap uniquement (shadowmap caché)
- **Export automatique** : Sauvegarde dans `materials.json`
