# Create Viewer

Ce dépôt sert de plateforme. Le bouton **Create Viewer**, dans le pied de l’éditeur à côté d’Enregistrer, produit un zip qui ne contient que les données d’un projet. Le moteur du viewer est chargé depuis une version figée de ce dépôt, hébergée en ligne (GitHub, via jsDelivr).

## Contenu du zip

```text
index.html
studio.json
Assets/asset.js
Assets/part.bin
Textures/materials.json
Textures/…            uniquement les images et le .env réellement utilisés
fonts/…               uniquement les polices choisies pour la gravure
```

Ne pas y mettre `scene.js`, `engravingManager.js`, `viewerApi.js`, `styles.css`, l’éditeur, ni Tweakpane. Babylon reste sur son CDN.

Le dossier Textures du template n’est pas recopié en entier. Le zip ne prend que les fichiers référencés par `asset.js`, `materials.json`, `studio.json` (modèle `.bin`, textures, environnement `.env`) et les polices de gravure réellement choisies.

## Index généré

`scene.js` charge déjà `studio.json`, `Assets/asset.js` et `Textures/materials.json` en chemins relatifs. Ces fichiers restent à côté de l’`index.html`. Le code distant les trouve sans changement de chemin.

L’`index.html` généré pointe le moteur vers une adresse versionnée, par exemple :

```text
https://cdn.jsdelivr.net/gh/<compte>/3D-Viewer@v1.2.0/scene.js
```

Même schéma pour `engravingManager.js`, `viewerApi.js` et `styles.css`.

Le numéro de version est obligatoire. Un viewer déjà livré continue d’utiliser `v1.2.0` si la plateforme évolue. Un nouveau clic sur Create Viewer prend la version du moment.

## Polices

`styles.css` contient aujourd’hui des `@font-face` vers `fonts/stencil.ttf`. Si cette feuille est hébergée sur GitHub, le navigateur cherche les polices à côté du CSS, pas dans le zip. Sortir ces `@font-face` de la feuille partagée et les écrire dans l’`index.html` généré, uniquement pour les polices utilisées.

## Bouton

Create Viewer construit le zip dans le navigateur :

1. Prendre les réglages en cours : `studio.json`, `materials.json`, `asset.js`.
2. En déduire la liste exacte des fichiers : modèle, textures citées, `.env`, polices citées.
3. Récupérer ces fichiers depuis le serveur local et les ranger dans le zip.
4. Écrire un `index.html` minimal avec l’adresse de la version du moteur.
5. Proposer le téléchargement.

Le zip est un site statique. Il se sert comme le viewer actuel, pas en ouvrant `index.html` directement depuis le disque.

## Ordre de réalisation

1. Rendre l’`index.html` actuel capable de charger le moteur depuis une adresse externe, tout en lisant les données en local. Le vérifier avec ce projet.
2. Déplacer les `@font-face` pour qu’ils restent locaux au projet généré.
3. Retirer Tweakpane du viewer généré. Il ne sert que pendant la mise au point.
4. Ajouter le bouton et la fabrication du zip.
5. Publier ce dépôt avec un tag de version, qui devient l’adresse écrite dans chaque viewer.
