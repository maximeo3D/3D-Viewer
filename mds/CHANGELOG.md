# Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/lang/fr/).

## [2.7.0] - 2024-12-XX - Système de Points de Vue et Améliorations Caméra

### 🎉 Ajouté
- **Système de Points de Vue (Viewpoints)**
  - Définition de points de vue prédéfinis dans `studio.json`
  - Transitions fluides entre viewpoints avec animation étape par étape
  - Ordre d'animation optimisé : alpha → fov → target → minDistance → radius → maxDistance
  - Interface HTML avec boutons de sélection de viewpoints
  - Synchronisation temps réel des contrôles de caméra avec Tweakpane

- **Contrôles de Caméra Avancés**
  - Export des paramètres de caméra actuels vers les viewpoints
  - Support complet des limites de distance (minDistance/maxDistance)
  - Synchronisation bidirectionnelle entre Tweakpane et scène 3D
  - Gestion des angles alpha en mode 0-360° avec bouclage
  - Conversion automatique degrés/radians pour FOV et alpha

- **Améliorations de l'Interface Tweakpane**
  - Menu Camera avec sélecteur de viewpoints dynamique
  - Bouton "Export Camera Params" pour sauvegarder les paramètres actuels
  - Contrôles de distance renommés (Radius → Distance)
  - Suppression des contrôles obsolètes (beta, horizontalSensitivity)
  - Synchronisation temps réel des valeurs de caméra

### 🔧 Modifié
- **Architecture des Animations**
  - Refactoring complet du système d'animation des viewpoints
  - Fonctions d'animation modulaires (`animateScalar`, `animateAlphaCircular`, `animateVector3`)
  - Gestion des angles circulaires avec normalisation 0-360°
  - Durées d'animation configurables par étape
  - Clamping automatique des valeurs de distance

- **Système de Caméra**
  - Application des limites min/max avant l'animation de distance
  - Gestion des transitions sans "saut" visuel
  - Normalisation des angles pour éviter les discontinuités
  - Support des viewpoints par défaut à l'initialisation

- **Configuration studio.json**
  - Structure étendue pour supporter les viewpoints
  - Paramètres de caméra en degrés pour l'interface utilisateur
  - Support des limites de distance dans les viewpoints
  - Export automatique des paramètres modifiés

### 🐛 Corrigé
- **Transitions de Viewpoints**
  - Résolution des problèmes de lecture des valeurs incorrectes
  - Correction de l'export des minDistance/maxDistance
  - Amélioration de la stabilité des transitions
  - Gestion des cas limites (valeurs undefined/null)

- **Synchronisation Tweakpane**
  - Correction de la synchronisation FOV (degrés vs radians)
  - Résolution des problèmes de sliders minDistance/maxDistance non fonctionnels
  - Amélioration de la réactivité des contrôles
  - Correction des valeurs alpha "bloquées" à 180°

- **Interface Utilisateur**
  - Correction de l'état actif des boutons de viewpoints
  - Amélioration de la cohérence des contrôles
  - Résolution des problèmes d'affichage des valeurs
  - Synchronisation correcte entre interface et moteur 3D

### 🗑️ Supprimé
- **Contrôles Obsolètes**
  - Suppression des contrôles beta et horizontalSensitivity de Tweakpane
  - Nettoyage du code de synchronisation obsolète
  - Suppression des références aux anciens systèmes de caméra

## [2.6.0] - 2024-12-XX - Système de Gravure Dynamique et Polices Personnalisées

### 🎉 Ajouté
- **Système de Gravure Dynamique**
  - Gravure de texte dynamique sur les objets avec tag "engraving"
  - Génération automatique de textures alpha, ambient occlusion et normal maps
  - Classe `EngravingManager` pour la gestion centralisée
  - Calcul automatique du ratio d'aspect pour éviter l'étirement du texte
  - Visibilité intelligente : objet visible uniquement avec du texte
  - Synchronisation automatique des couleurs avec les matériaux de bloc

- **Polices Personnalisées**
  - Support de 3 polices personnalisées : Stencil (défaut), Futuristic, Western
  - Configuration individuelle des propriétés par police (poids, style, espacement, taille)
  - Chargement asynchrone des polices avec `document.fonts.load()`
  - Interface HTML avec boutons de sélection de police
  - Styles CSS avec `@font-face` pour les polices personnalisées

- **Améliorations des Matériaux**
  - Filtrage anisotrope (`ANISOTROPIC_SAMPLINGMODE`) pour réduire l'effet moiré
  - Support des normal maps avec `anisotropicFilteringLevel`
  - Optimisation du rendu des surfaces inclinées

- **Interface Utilisateur Améliorée**
  - Paramètre `tweakpaneOpenByDefault` dans `tweakpaneManager.js`
  - Contrôle de l'état d'ouverture par défaut de Tweakpane
  - Interface plus intuitive pour la gravure

### 🔧 Modifié
- **Architecture du Code**
  - Refactoring du système de gravure dans `engravingManager.js`
  - Séparation des responsabilités entre `scene.js` et `engravingManager.js`
  - Amélioration de la gestion des textures dynamiques
  - Optimisation des performances avec `willReadFrequently: true`

- **Système de Textures**
  - Génération automatique des normal maps à partir des ambient maps
  - Application du flou gaussien centralisé avec contrôle par pourcentage
  - Amélioration de la qualité des textures alpha et ambient occlusion
  - Support des transformations de texture avancées

- **Gestion des Polices**
  - Chargement explicite des polices avec vérification Canvas
  - Gestion des erreurs de chargement de polices
  - Logs détaillés pour le débogage des polices
  - Fallback vers les polices système en cas d'erreur

### 🐛 Corrigé
- **Système de Gravure**
  - Résolution des erreurs `clearRect` et `createImageData` sur contexte null
  - Correction de la disparition de la gravure lors des changements de couleur
  - Amélioration de la stabilité des textures dynamiques
  - Prévention des duplications de textures dans le cache Babylon.js

- **Chargement des Polices**
  - Correction du problème de police Arial par défaut
  - Résolution du problème de double-clic pour changer de police
  - Amélioration de la synchronisation entre interface et moteur de rendu
  - Correction des erreurs de format de fichier (.ttf vs .otf)

- **Interface Utilisateur**
  - Correction de la désélection automatique des boutons de police
  - Amélioration de la gestion des états actifs des boutons
  - Synchronisation correcte des couleurs entre bloc et gravure
  - Résolution des problèmes d'initialisation des polices

### 🗑️ Supprimé
- **Code Obsolète**
  - Suppression des contrôles HTML redondants pour les propriétés de police
  - Nettoyage des variables CSS non utilisées
  - Suppression des logs de débogage temporaires
  - Code de compatibilité obsolète pour les polices

## [2.5.0] - 2024-12-XX - Migration vers Tweakpane et Interface Moderne

### 🎉 Ajouté
- **Migration vers Tweakpane v4**
  - Remplacement complet de dat.GUI par Tweakpane moderne
  - Interface utilisateur plus moderne et responsive
  - Support des color pickers avec valeurs hexadécimales
  - Chargement dynamique des textures depuis le serveur
  - Interface personnalisable avec CSS (police Arial, couleur blanche)

- **Système d'Export Amélioré**
  - Export direct vers `materials.json` via serveur PowerShell
  - Suppression des dialogues de téléchargement navigateur
  - Formatage JSON avec indentation pour lisibilité
  - Synchronisation temps réel des modifications

- **Gestion des Matériaux Optimisée**
  - Mise à jour temps réel uniquement des matériaux concernés
  - Système de tracking des instances de matériaux
  - Prévention des applications globales non désirées
  - Support complet des transformations de texture (UV offset, scale, rotation)

- **Interface Utilisateur Réorganisée**
  - Menu "Create Material" en première position
  - Menu "Export Material" en dernière position
  - Menu "Target" intégré dans "Camera"
  - Menu "Textures" ouvert par défaut
  - Chargement automatique des images depuis le dossier Textures

### 🔧 Modifié
- **Architecture de l'Interface**
  - Classe `TweakpaneManager` remplace `DatGUIManager`
  - Chargement asynchrone des configurations de matériaux
  - Gestion des erreurs améliorée avec flags de chargement
  - Support des modules ES6 et IIFE pour compatibilité CDN

- **Système de Matériaux**
  - Noms de matériaux cohérents entre configuration et instances Babylon.js
  - Tracking des instances via `window.materialInstances`
  - Mise à jour sélective par nom de matériau
  - Support des valeurs hexadécimales pour les couleurs

- **Serveur PowerShell**
  - Nouvelle route `/api/textures` pour listing dynamique des images
  - Support POST pour `/materials.json` avec écriture directe
  - Gestion des erreurs HTTP améliorée

### 🐛 Corrigé
- **Synchronisation des Données**
  - Résolution des problèmes de chargement des valeurs depuis `materials.json`
  - Correction de l'affichage des textures "None" dans les dropdowns
  - Synchronisation temps réel des modifications de matériaux
  - Prévention des mises à jour pendant le chargement des propriétés

- **Interface Utilisateur**
  - Correction des erreurs de référence Tweakpane non défini
  - Résolution des problèmes de syntaxe ES6 vs IIFE
  - Amélioration de la lisibilité avec police Arial et couleur blanche
  - Correction des contrôles de texture dynamiques

- **Gestion des Matériaux**
  - Résolution des applications globales non désirées
  - Correction du système de mise à jour temps réel
  - Amélioration de la stabilité des modifications de propriétés
  - Support correct des transformations de texture

### 🗑️ Supprimé
- **Système dat.GUI Obsolète**
  - Suppression complète de `datGUI.js`
  - Suppression des références à dat.GUI dans `scene.js`
  - Nettoyage des imports et dépendances dat.GUI
  - Suppression des contrôles obsolètes

- **Fonctionnalités Obsolètes**
  - Ancien système de téléchargement de fichiers
  - Notifications navigateur lors de l'export
  - Liste hardcodée des textures
  - Système de synchronisation dat.GUI

## [2.4.0] - 2024-12-XX - Système de Tags et Contrôles Avancés

### 🎉 Ajouté
- **Système de Tags**
  - Remplacement du système SKU par un système de tags plus flexible
  - Gestion des configurations de produits via tags de visibilité et matériaux
  - Boutons HTML pour contrôle de visibilité des meshes
  - Assignation automatique de matériaux selon les configurations
  - Classe `TagManager` pour la gestion centralisée
  - Support des meshes avec un seul slot de matériau (fallback vers slot1)

- **Système de Matériaux Parent-Enfant**
  - Héritage de propriétés entre matériaux
  - Interface dat.GUI avec paramètres grisés pour les propriétés héritées
  - Toggle d'indépendance par clic sur le nom du paramètre
  - Export intelligent (seules les propriétés modifiées sont sauvegardées)
  - Support complet des textures et transformations

- **Création de Matériaux depuis dat.GUI**
  - Sous-menu "Create Material" dans l'interface Materials
  - Champ "Name" pour le nom du nouveau matériau
  - Sélection du matériau parent via dropdown
  - Export automatique vers `materials.json`
  - Interface intuitive et cohérente

- **Gestion des Meshes Primitifs**
  - Support automatique des meshes `*_primitive0`, `*_primitive1`
  - Support des meshes avec un seul slot de matériau (fallback vers slot1)
  - Mapping intelligent des slots de matériaux
  - Application sélective des matériaux par slot
  - Gestion de la visibilité par mesh individuel

- **Contrôles de Caméra Avancés**
  - Sensibilité horizontale ajustable via dat.GUI
  - Zoom fluide avec interpolation
  - Pan désactivé (clic droit)
  - Contrôles personnalisés pour rotation des objets

### 🔧 Modifié
- **Architecture des Assets**
  - Configuration centralisée dans `asset.js` (modèles, tags, configurations de matériaux)
  - Suppression du système SKU et de `SKUconfigs.json`
  - Simplification de la structure des modèles
  - Chargement unique des modèles GLB
  - Optimisation des performances de chargement

- **Interface dat.GUI**
  - Ajout du contrôle "Parent" dans le menu Materials
  - Ajout du contrôle "Horizontal Sensitivity" pour la caméra
  - Réorganisation des contrôles de matériaux
  - Amélioration de la gestion des textures
  - Interface plus intuitive pour la création de matériaux
  - Synchronisation temps réel des paramètres de texture

- **Système de Rotation**
  - Correction de la référence aux groupes de modèles
  - Utilisation du groupe `part_model_group` pour la rotation
  - Maintien de l'élasticité et des limites de rotation
  - Sensibilité ajustable pour les contrôles horizontaux

### 🐛 Corrigé
- **Gestion des Matériaux**
  - Correction de l'application des matériaux via `applyMaterial()`
  - Résolution des problèmes de chargement des textures
  - Gestion sécurisée des observables de texture
  - Correction des erreurs de référence aux meshes
  - Synchronisation temps réel des paramètres de texture (bumpTextureIntensity, uOffset, vOffset, etc.)

- **Système de Tags**
  - Résolution des conflits de noms de variables
  - Correction de la logique de recherche des meshes primitifs
  - Gestion des erreurs de configuration
  - Optimisation des performances
  - Support des meshes avec un seul slot de matériau

- **Contrôles de Caméra**
  - Correction de la sensibilité horizontale de la caméra
  - Résolution des problèmes de pan (clic droit désactivé)
  - Amélioration du zoom fluide
  - Correction des variables manquantes (isMouseDown, isRightClick)

- **Interface Utilisateur**
  - Correction des logs de débogage
  - Amélioration de la stabilité de l'interface
  - Résolution des problèmes de réorganisation des contrôles
  - Tri alphabétique des listes de textures

### 🗑️ Supprimé
- **Système SKU Obsolète**
  - Suppression complète du système SKU et de `SKUconfigs.json`
  - Suppression de la classe `SKUManager`
  - Nettoyage des références aux SKUs dans le code
  - Suppression des boutons HTML liés aux SKUs

- **Code Obsolète**
  - Suppression de la boucle de chargement redondante des modèles
  - Nettoyage des références à `window.loadedModels`
  - Suppression des logs de débogage temporaires
  - Code de compatibilité obsolète
  - Suppression des contrôles de pan de la caméra

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
