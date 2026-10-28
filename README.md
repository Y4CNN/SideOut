# Arbitre Volley 🏐

Application web mobile (PWA) pour **l'arbitre de volley-ball en salle (6x6)** : gestion d'un match en direct depuis un smartphone, d'une seule main, même sans réseau.

Elle s'appuie sur les **Règles officielles FIVB 2025-2028** telles qu'appliquées par la FFVB. Tous les paramètres sont modifiables dans « Réglages » (préréglage « FFVB standard 6x6 » ou « Personnalisé »).

> Application indépendante, sans lien avec la FFVB ni la FIVB. Elle reprend la palette bleu marine / rouge / blanc, mais pas le logo officiel.

---

## Fonctionnalités

| Domaine | Ce que fait l'application |
| --- | --- |
| **Préparation** | Équipes (nom, couleurs, contraste automatique), joueurs (n° 1–99 uniquement, capitaine, libéros), favoris réutilisables, tirage au sort, feuille de position I–VI validée (6 joueurs distincts, pas de libéro). |
| **Score** | Un tap sur la zone d'une équipe = un point. Indicateur du service et du n° du serveur. Rotation automatique au side-out. Fin de set et de match automatiques (24-24, 14-14…). Changement de côté entre les sets et à 8 points au set décisif (alerte plein écran + son). |
| **Annulation** | Bouton « Annuler » multi-niveaux sur toute action : point, rotation, remplacement, temps mort, sanction, fin de set… |
| **Positions** | Demi-terrains vus depuis la chaise d'arbitre, avant/arrière distincts, serveur et libéro mis en évidence. Aide visuelle des contraintes de placement de l'équipe en réception (règle 2025-2028, ancienne règle activable). Fautes de position et de rotation (avec rectification de l'ordre), correction manuelle de la rotation. |
| **Remplacements** | Compteur « X / 6 », validation FIVB (aller-retour unique, même position, remplaçant lié à son joueur de départ). Les joueurs non autorisés sont grisés et la raison est expliquée en français. Remplacement exceptionnel (blessure) non décompté. Historique avec le score. |
| **Libéro** | Remplacements non décomptés, ligne arrière uniquement, pas au service, échange obligatoire entre deux remplacements libéro, alerte « le libéro doit sortir » en position IV, échange libéro/libéro, libéro inapte et re-désignation. |
| **Temps morts** | « X / 2 » par set, chrono plein écran (30 s), avertissement à 10 ou 15 s, son + vibration à la fin. Le chrono reste juste après un verrouillage d'écran. Temps morts techniques optionnels. |
| **Sanctions** | Avertissement, pénalité, expulsion, disqualification (joueur ou encadrement), retards (avertissement puis pénalité), demande irrégulière. Remplacement obligatoire du joueur sanctionné, équipe incomplète. |
| **Fin de match** | Récapitulatif : scores et durées des sets, durée du match, temps morts, remplacements, sanctions. Partage (Web Share), copie, export JSON. Historique des 20 derniers matchs. |
| **Technique** | 100 % hors ligne après le premier chargement, sauvegarde après chaque action (reprise exacte après fermeture), écran maintenu allumé (Wake Lock), mode sombre par défaut et mode clair. |

---

## Installation et développement

Prérequis : **Node.js 20 ou plus récent**.

```bash
npm install
npm run dev        # serveur de développement (http://localhost:5173, accessible sur le réseau local)
npm test           # tests unitaires du moteur de règles (Vitest)
npm run build      # build de production dans dist/
npm run preview    # sert le build de production localement
```

> 💡 Pour tester sur téléphone pendant le développement, ouvrez l'adresse « Network » affichée par `npm run dev`. Le service worker (hors ligne) et le maintien de l'écran allumé exigent **HTTPS** : ils ne fonctionnent pas sur une adresse IP locale en HTTP. Pour un essai réaliste, déployez l'application (voir ci-dessous), c'est gratuit.

---

## Déploiement gratuit

Le build est un site statique (`dist/`), sans backend.

### Vercel

1. Poussez le projet sur GitHub.
2. Sur [vercel.com](https://vercel.com) : **Add New → Project**, importez le dépôt.
3. Vercel détecte Vite. Vérifiez « Build Command » = `npm run build` et « Output Directory » = `dist`, puis **Deploy**.

### Netlify

1. Sur [app.netlify.com](https://app.netlify.com) : **Add new site → Import an existing project**, choisissez le dépôt.
2. Build command : `npm run build` ; Publish directory : `dist`, puis **Deploy**.
   (Ou sans Git : `npm run build`, puis glissez-déposez le dossier `dist/` sur la page « Deploys ».)

### GitHub Pages

Le site est servi sous `https://<utilisateur>.github.io/<depot>/`. Le chemin de base se règle avec la variable `BASE_PATH`.

1. Dans le dépôt : **Settings → Pages → Source : GitHub Actions**.
2. Le workflow [.github/workflows/deploy.yml](.github/workflows/deploy.yml) fourni build et publie à chaque push sur `main` (il définit `BASE_PATH=/<nom-du-depot>/` automatiquement).

Pour builder à la main : `BASE_PATH=/mon-depot/ npm run build`.

---

## Installer l'application sur l'écran d'accueil

Une fois installée, l'application s'ouvre en plein écran et fonctionne sans réseau. Ouvrez-la **une première fois avec du réseau** pour qu'elle se mette en cache.

### iPhone (Safari)

1. Ouvrez l'adresse du site dans **Safari** (pas dans un autre navigateur).
2. Touchez le bouton **Partager** (carré avec une flèche vers le haut).
3. Choisissez **Sur l'écran d'accueil**, puis **Ajouter**.

### Android (Chrome)

1. Ouvrez l'adresse du site dans **Chrome**.
2. Touchez le menu **⋮**, puis **Installer l'application** (ou « Ajouter à l'écran d'accueil »).
3. Confirmez avec **Installer**.

---

## Utilisation en match (guide rapide)

1. **Nouveau match** : saisissez les deux équipes (« Créer les n° 1 à 12 » remplit l'effectif d'un coup, puis marquez C et L), vérifiez les **Réglages**, puis **Valider**.
2. **Tirage au sort** : équipe au service et équipe à gauche vue depuis la chaise. Un bouton « Pile ou face » est disponible.
3. **Feuilles de position** : touchez une position, puis un numéro. Au set suivant, « Reprendre le set N » recopie la composition précédente.
4. **Pendant le set** (téléphone en paysage) :
   - un tap sur la zone d'une équipe donne le point, et **Annuler** corrige toute erreur ;
   - **TM / Rempl. / Libéro** : boutons en bas de chaque zone ;
   - **Positions** affiche la rotation dans chaque zone ; **Terrain** ouvre le contrôle détaillé (contraintes, fautes, correction) ;
   - **Sanctions** (cartons) et **Plus** (journal, fin de set forcée, équipe incomplète, préférences).
5. **Entre les sets** : chrono d'intervalle, nouvelles feuilles de position, nouveau tirage avant le set décisif.
6. **Fin du match** : récapitulatif à partager, puis **Nouveau match** (le match est archivé dans l'historique).

---

## Architecture

```
src/
  engine/                moteur de règles PUR (aucune dépendance à React)
    types.ts             état du match, actions, journal
    config.ts            paramètres et préréglages (extensible : jeunes, 4x4…)
    rotation.ts          positions I–VI, rotation, contraintes de placement
    roster.ts            effectifs, indisponibilités, validation des compositions
    substitutions.ts     règles de remplacement FIVB + messages d'explication
    libero.ts            règles du libéro
    selectors.ts         service, côtés, sets gagnés, chronos
    reducer.ts           applyAction(état, action) → { état, alertes } | { erreur }
    summary.ts           récapitulatif texte / JSON
    __tests__/           tests Vitest
  store/
    history.ts           pile d'états (annulation) + rejeu des actions
    useApp.ts            store Zustand, persistance localStorage, retours son/vibration
  lib/                   audio (Web Audio, déverrouillage iOS), vibrations, wake lock, partage, contraste
  ui/                    écrans, panneaux (bottom sheets) et composants
```

- **Moteur pur** : chaque action est horodatée par l'appelant. Le moteur est donc déterministe, et l'annulation se réduit à revenir à l'état précédent de la pile.
- **Persistance** : on enregistre l'état initial et la liste des actions après chaque action, puis on rejoue cette liste au démarrage.
- **Chronos** : on stocke l'horodatage de début et la durée. L'affichage se recalcule à partir de `Date.now()`, ce qui garde le chrono juste en arrière-plan ou écran verrouillé.
- **Ajouter un format** : nouveau préréglage dans `engine/config.ts`. `courtSize` est prévu pour d'autres formats, mais l'interface actuelle cible le 6x6.

---

## Interprétation des règles (points à connaître)

- **Remplacement exceptionnel** : autorisé pour tout joueur hors du terrain sauf les libéros et le joueur remplacé par le libéro. Il n'est pas décompté dans la limite et le joueur blessé ne peut plus rentrer dans le match. L'application le permet même quand un remplacement régulier reste possible ; c'est à l'arbitre d'en juger.
- **Joueur entré par remplacement exceptionnel** : il ne peut ensuite être remplacé que par un nouveau remplacement exceptionnel (choix prudent).
- **Re-désignation du libéro** : possible seulement quand l'équipe n'a plus aucun libéro apte. Le nouveau libéro doit être hors du terrain.
- **Demande irrégulière** : la première est notée sans conséquence, toute répétition dans le match devient une sanction pour retard.
- **Sanctions entre deux sets** : seul l'avertissement peut être saisi. Les sanctions qui ont une conséquence se saisissent après le début du set.
- **Équipe incomplète** : l'adversaire reçoit les points nécessaires pour gagner le set (et les sets nécessaires si le match est concerné). L'équipe incomplète garde ses points.
- **Fautes de position** : avec la règle 2025-2028, seule l'équipe en réception est contrôlée. Le réglage « Les deux équipes » rétablit l'ancienne règle.

---

## Compatibilité et limites connues

- **Vibrations** : Android (Chrome) uniquement ; Safari iOS ne prend pas en charge l'API de vibration.
- **Son sur iOS** : lorsque les sons sont activés dans les réglages, un premier toucher de l'écran est nécessaire pour autoriser l'audio. Vérifiez aussi que le téléphone n'est pas en mode silencieux.
- **Écran allumé** : l'API Wake Lock dépend de la version du navigateur ; sur les versions anciennes, l'app continue sans bloquer la veille. En cas de doute, réglez le verrouillage automatique du téléphone sur « Jamais » pendant le match.
- **Orientation** : un site web ne peut pas forcer le paysage sur iPhone. L'écran de match fonctionne aussi en portrait.
- **Données** : tout reste sur l'appareil (localStorage). Vider les données du navigateur efface le match en cours et l'historique ; pensez à exporter les récapitulatifs importants.

---

## Qualité

- `npm test` : 84 tests, dont les 68 tests initiaux du moteur et de l'annulation. Les nouveaux tests couvrent les numéros, doublons, rôles, migrations, export sans noms et contrastes des couleurs libres.
- Vérifications sous Chrome sur les dimensions iPhone SE (320/375 px), iPhone 15/16, iPhone 16 Pro, Pixel et petit Android : sombre et clair, paysage et portrait, avec un contrôle supplémentaire à 200 % de texte. Voir [le rapport de livraison](reports/LIVRAISON.md).
- Lighthouse mobile sur l'accueil : performance **100 → 98**, accessibilité **90 → 100**, bonnes pratiques **100 → 100**. Rapports JSON avant/après dans `reports/`. La catégorie PWA n'existe plus dans Lighthouse ; manifest, pré-cache et rechargement hors ligne sont contrôlés séparément.

### Images, polices et vérifications mobiles

```bash
npm run images           # Sharp : variantes, icônes, écrans iOS, polices locales
npm run build
npm run preview -- --port 4173
# Dans un second terminal, avec Google Chrome installé :
npm run verify:mobile    # parcours réel : joueurs, match, annulation, cache hors ligne
npm run audit:ui         # mises en page et axe sur les sept écrans
npm run audit:lighthouse # mesure mobile de l'accueil
```

Les dix originaux dans `public/images/source/` sont conservés intacts et exclus du build. Le script produit 92 images (1 067 260 octets) avec un budget bloquant à 1 500 000 octets. Il utilise un SVG simple si une source manque et écrit la liste des fichiers manquants dans `reports/images.json`. Aucune source ne manque actuellement. Les AVIF/WebP sont proposés en 320, 480 et 768 px ; le PNG de repli est en 320 px. Le service worker précharge toutes ces images et les quatre fichiers WOFF2. Les licences des polices accompagnent les fichiers locaux.

La présentation du premier lancement est passable et rejouable depuis les réglages. Les noms/prénoms des anciens joueurs sont retirés lors du chargement puis réécrits dans le stockage local, sans modifier leurs numéros ou rôles. Les équipes favorites sont sauvegardées sur cet appareil. Le mode haute visibilité et les sons se règlent depuis l'accueil ou le menu du match ; les sons sont désactivés par défaut pour une nouvelle installation.

Les tests automatisés ne remplacent pas une validation sur iPhone/Android physiques avec VoiceOver et TalkBack, ni la vérification des écrans de démarrage iOS sur un appareil installé.
