# Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/lang/fr/).

## [2.2.0] - 2024-12-XX - Refactoring et Contrôles Avancés

### 🎉 Ajouté
- **Refactoring de l'Architecture**
  - Séparation complète de dat.GUI dans `datGUI.js`
  - Classe `DatGUIManager` pour gérer toute l'interface
  - Architecture modulaire et maintenable
  - Contrôle de visibilité de dat.GUI via variable `datGUIVisible`

- **Contrôles de Caméra Personnalisés**
  - Désactivation des contrôles par défaut de la caméra
  - Mouvement horizontal : contrôle uniquement l'alpha (yaw) de la caméra
  - Mouvement vertical : rotation des objets 3D sur l'axe X
  - Limites de rotation des objets (-90° à +90°)
  - Élasticité de rotation des objets (retour à 0° au relâchement)
  - Désactivation complète du pan avec clic droit

- **Contrôle "Initial Pitch"**
  - Nouveau contrôle dat.GUI pour l'angle initial de la caméra
  - Plage de -90° à +90° pour un contrôle naturel
  - Synchronisation automatique avec `studio.json`
  - Mise à jour des limites beta (lowerBetaLimit/upperBetaLimit)

- **Système de Visibilité par Mesh**
  - Contrôle individuel de la visibilité des meshes
  - Configuration via `Assets/asset.js` avec propriété `visible`
  - Support des primitives Babylon.js
  - Application automatique lors du chargement

- **Conversion asset.json vers asset.js**
  - Support des commentaires dans la configuration
  - Structure JavaScript plus flexible
  - Compatibilité maintenue avec l'ancien système

### 🔧 Modifié
- **Architecture du Code**
  - `scene.js` : Logique 3D et contrôles personnalisés uniquement
  - `datGUI.js` : Toute l'interface utilisateur et ses contrôles
  - Séparation claire des responsabilités

- **Contrôles de Caméra**
  - Beta (pitch) maintenant fixe via `studio.json`
  - Alpha (yaw) contrôlé uniquement par mouvement horizontal
  - Zoom avec inertie et lissage
  - Suppression de l'élasticité de pitch (obsolète)

- **Interface dat.GUI**
  - Suppression du contrôle "Pitch Elasticity"
  - Remplacement par "Initial Pitch" (-90° à +90°)
  - Interface plus claire et logique

### 🐛 Corrigé
- **Gestion des Erreurs**
  - Correction des erreurs de déclaration de variables dans `asset.js`
  - Gestion sécurisée des dossiers dat.GUI
  - Vérifications de sécurité pour les contrôles

- **Contrôles de Rotation**
  - Inversion des contrôles pour un comportement naturel
  - Correction de la rotation initiale des objets (démarrage à 0°)
  - Limites correctes de rotation (-90° à +90°)

- **Interface Utilisateur**
  - Suppression des console.log de debug
  - Interface plus propre et responsive

### 🗑️ Supprimé
- **Fonctionnalités Obsolètes**
  - Contrôle "Pitch Elasticity" de dat.GUI
  - Variables et fonctions liées à l'élasticité de pitch
  - Console.log de debug

- **Contrôles Redondants**
  - Ancien contrôle "Camera Pitch" (remplacé par "Initial Pitch")
  - Contrôles de mode pitch (obsolète)

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
