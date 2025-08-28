# Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/lang/fr/).

## [2.0.0] - 2024-12-XX - Éditeur PBR Complet

### 🎉 Ajouté
- **Éditeur de Matériaux PBR Avancé**
  - Contrôles pour Albedo, Metallic, Roughness, Alpha
  - Système de textures complet (Albedo, Surface ORM, Normal Map)
  - Options de canaux : Roughness from G, Metalness from B, AO from R
  - Paramètres avancés : Back Face Culling, Texture Intensity
  - Interface datGUI avec synchronisation temps réel

- **Système d'Assets et Modèles 3D**
  - Chargement de fichiers GLB/glTF
  - Configuration via `Assets/asset.json`
  - Support des primitives Babylon.js (primitive0, primitive1)
  - Assignation de matériaux par slots multiples

- **Contrôles de Caméra Avancés**
  - Renommage : Alpha → Yaw, Beta → Pitch, Radius → Distance
  - Contrôles Field of View, Min/Max Distance
  - Indicateur de cible 3D avec flèches directionnelles
  - Précision 0.01 pour le positionnement de la cible
  - Export des paramètres de caméra

- **Système d'Exportation Avancé**
  - Architecture client-serveur avec PowerShell
  - Export direct sans dialogue de fichier
  - Séparation des exports : Environment, Camera, Materials
  - Persistance dans `studio.json` et `materials.json`

- **Environnement et Éclairage**
  - Support HDR avec orientation et exposition
  - Rendu PBR physique réaliste
  - Background configurable

### 🔧 Modifié
- **Interface utilisateur**
  - Remplacement de "Status" par "Material List" dropdown
  - Réorganisation des contrôles de matériaux
  - Fermeture par défaut des menus Environment et Camera
  - Ouverture par défaut du menu Materials

- **Gestion des matériaux**
  - Application sélective des matériaux (pas de modification globale)
  - Synchronisation datGUI ↔ materials.json
  - Mise à jour temps réel des propriétés PBR

### 🐛 Corrigé
- **Gestion des textures**
  - Chargement correct des images depuis le dossier Textures
  - Application des textures aux matériaux PBR
  - Gestion des erreurs de chargement

- **Interface datGUI**
  - Ordre fixe des contrôles de texture
  - Position stable du bouton "Export Materials"
  - Gestion des erreurs de déclaration de variables

- **Système d'export**
  - Correction des chemins de fichiers
  - Gestion des erreurs 404 et 400
  - Validation des paramètres PowerShell

### 🗑️ Supprimé
- Menu "Assets" de datGUI (remplacé par système d'assets automatique)
- Ancien système de téléchargement de fichiers
- Contrôles de matériaux basiques

## [1.0.0] - 2024-12-XX - Version de Base

### 🎉 Ajouté
- **Visualiseur 3D Basique**
  - Scène 3D avec Babylon.js
  - Cube rotatif avec matériau standard
  - Contrôles de caméra basiques (rotation, zoom, pan)

- **Interface Simple**
  - Contrôles d'environnement (couleur de fond)
  - Interface HTML basique
  - Support WebGL

### 🔧 Modifié
- Structure de projet initiale
- Configuration Babylon.js de base

### 🐛 Corrigé
- Aucun correctif majeur

---

## Structure des Versions

### Version Majeure (X.0.0)
- Nouvelles fonctionnalités majeures
- Changements d'architecture
- Incompatibilités avec les versions précédentes

### Version Mineure (0.X.0)
- Nouvelles fonctionnalités
- Améliorations
- Compatibilité maintenue

### Version Corrective (0.0.X)
- Corrections de bugs
- Améliorations de sécurité
- Optimisations mineures

## Notes de Migration

### De 1.0.0 vers 2.0.0
- **Breaking Changes** :
  - Nouvelle structure de dossiers (Assets/, Textures/)
  - Nouveaux fichiers de configuration (asset.json, materials.json)
  - Serveur PowerShell requis (remplace serveur HTTP simple)

- **Migration** :
  1. Créer les dossiers `Assets/` et `Textures/`
  2. Configurer `asset.json` avec vos modèles
  3. Configurer `materials.json` avec vos matériaux
  4. Démarrer le serveur PowerShell avec `start-server.bat`

## Prochaines Versions

### [2.1.0] - Support Multi-Formats
- Support des formats 3D supplémentaires (.fbx, .obj)
- Système d'animations basique
- Gestion des LOD

### [2.2.0] - Éditeur Avancé
- Système de particules
- Éditeur de shaders
- Support multi-caméras

### [3.0.0] - Pipeline de Production
- Export en formats standards
- Système de physique
- Support VR/AR

---

**Dernière mise à jour** : Décembre 2024  
**Mainteneur** : Équipe de développement 3D Viewer  
**Contact** : [email] ou [issues GitHub]
