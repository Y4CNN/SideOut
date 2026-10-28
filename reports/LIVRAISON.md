# Refonte mobile Arbitre Volley — 28 octobre 2026

Les dix fichiers de `public/images/source/` sont conservés intacts. Les changements locaux déjà présents dans sept fichiers ont été enregistrés séparément dans le commit `f903e11` avant la refonte.

Commits thématiques : `c722191` (images/PWA), `e1ace4c` (joueurs/migration), `c89fc1b` (visuel/onboarding), `2340a2a` (accessibilité). Un dernier commit rassemble les scripts de vérification et les rapports.

## Fonctionnalités livrées

- Accueil avec l'illustration fournie, logo transparent, états vides et illustration de fin de match. Aucun bitmap sur le match en cours. Texture de terrain limitée au panneau des positions, à 3,5 % d'opacité.
- Modes sombre, clair et haute visibilité ; polices Inter et Barlow Condensed embarquées, chiffres tabulaires, transitions réduites avec `prefers-reduced-motion`.
- Présentation de trois écrans, passable, mémorisée et rejouable depuis les réglages.
- Saisie numérique en série de 1 à 99, refus immédiat des doublons. Toucher un numéro ouvre les rôles C/L et le retrait du joueur. Un seul capitaine ; limite des libéros tirée du format existant.
- Favoris d'équipe enregistrables, rechargeables et supprimables. Rejouer avec les mêmes équipes depuis l'accueil. Préparation en trois étapes.
- Migration des brouillons, bases de match, archives et favoris : numéros et rôles conservés, noms/prénoms retirés, anciens libellés de journal nettoyés. Réécriture du stockage et export JSON sans identités de joueurs.
- À la demande de l'utilisateur, aucune notification de confirmation pour les actions courantes du match (point, retrait/annulation, remplacement, etc.). Le bouton « Annuler » de la barre du match utilise toujours l'historique existant. Les erreurs et les alertes du moteur de règles sont conservées.
- Contraste automatique noir/blanc pour les couleurs libres ; palette adaptée et avertissement de couleurs proches selon plusieurs approximations de déficiences de vision des couleurs. Les noms restent l'identifiant des équipes.
- Cibles d'au moins 48 px, zoom autorisé, focus visible, focus retenu dans les dialogues puis rendu au déclencheur. Annonces du score, du serveur, des fins de temps mort et de set. Le chrono ne lit pas chaque seconde à haute voix.

## Moteur de règles

Aucun changement dans le reducer, la rotation, les remplacements, les libéros, les sanctions, les temps morts, les critères de fin de set ou l'algorithme d'annulation. Les 68 tests initiaux passent.

Les seuls changements dans `src/engine/` concernent le champ `Player.name`, le libellé d'un joueur et le nettoyage de l'export. Ce sont les changements de représentation nécessaires au volet « numéros uniquement » annoncés dans le plan.

## Images et hors ligne

`npm run images` utilise Sharp et bloque si le budget dépasse 1 500 000 octets. Il ne réécrit jamais les originaux. Le build exclut le dossier des sources ainsi que les anciens fichiers d'icônes inutilisés.

**92 images générées, 1 067 260 octets (1,07 Mo). Aucun fichier source manquant.**

| Famille | Fichiers |
| --- | --- |
| Illustrations | `logo`, `welcome`, `onboarding-score`, `onboarding-rotation`, `onboarding-timeout`, `empty-players`, `empty-matches`, `match-end`, `court-pattern` : chacune en AVIF et WebP à 320/480/768 px, plus PNG de repli à 320 px, soit 63 fichiers |
| Icônes | `icon-16.png`, `icon-32.png`, `icon-180.png`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `favicon.ico`, soit 7 fichiers |
| Démarrage iOS | 11 tailles d'iPhone, chacune en portrait et paysage, soit 22 fichiers |

La liste exhaustive figure dans [images.json](images.json). Les dimensions et largeurs des illustrations sont dans [le manifest d'images](../public/images/manifest.json). Les `<picture>` proposent AVIF, WebP puis PNG, avec dimensions explicites et chargement différé hors illustrations d'accueil et d'onboarding visibles au démarrage.

Le pictogramme maskable complet est centré dans un carré de 280 px sur 512 px : ses coins restent dans le cercle de sécurité central de 80 %. Les écrans iOS sont composés du logo sur fond `#0A2A66`, avec balises media adaptées et chemins compatibles avec `BASE_PATH`.

Le test navigateur retrouve les 92 images et les 4 polices dans Cache Storage, sans fichier source, puis recharge et ajoute un point avec le réseau coupé. Voir [verification.json](verification.json).

## Mesures

Lighthouse mobile, build de production, accueil sans match enregistré :

| Catégorie | Avant | Après |
| --- | ---: | ---: |
| Performance | 100 | 98 |
| Accessibilité | 90 | 100 |
| Bonnes pratiques | 100 | 100 |
| PWA | Pas de catégorie dans cette version | Manifest et fonctionnement hors ligne vérifiés séparément |

Rapports bruts : [avant](lighthouse-before.json), [après](lighthouse-after.json). Lighthouse ne mesure pas une conformité WCAG complète. La suppression de sa catégorie PWA est documentée par [Chrome](https://developer.chrome.com/docs/lighthouse/pwa/load-fast-enough-for-pwa).

Le script de mesure après conserve seulement les préférences nécessaires pour afficher le même accueil que la référence (présentation déjà passée), et efface le cache HTTP, le cache applicatif et l'enregistrement du service worker avant la navigation mesurée. Les performances peuvent varier légèrement d'une exécution à l'autre.

## Vérifications reproductibles

- `npm test` : **84 tests**, dont 68 initiaux et 16 nouveaux. Migration, stockage en lecture seule, export sans noms, saisie en série, bornes, doublons, rôles et contraste sur plus de 4 000 couleurs échantillonnées.
- `npm run build` : compilation TypeScript et build PWA réussis.
- `npm run verify:mobile` : parcours complet d'onboarding, saisie et doublon, capitaine, favori, préparation/tirage/positions, point et annulation, temps mort et annulation, remplacement, focus, hors ligne.
- `npm run audit:ui` : 168 combinaisons de sept écrans, six tailles de téléphone, deux orientations et deux thèmes ; sept contrôles supplémentaires à 200 % sur le petit SE, soit **175 contrôles de mise en page**. Contrôle axe des écrans, puis des dialogues et d'une couleur libre proche du seuil noir/blanc. Rapport : [ui-audit.json](ui-audit.json).
- `npm run audit:lighthouse` : régénère la mesure de l'accueil après refonte.

Lancer le preview sur le port 4173 avant les scripts navigateur ; Google Chrome doit être installé. Le script UI utilise le moteur existant pour préparer des données de démonstration, sans modifier ses fichiers.

Les captures sont dans [screenshots/](screenshots/), notamment [accueil sombre](screenshots/home-dark.png), [accueil clair](screenshots/home-light.png), [match paysage](screenshots/match-landscape-dark.png), [match portrait](screenshots/match-portrait-light.png) et [haute visibilité](screenshots/match-high-visibility.png).

Les vérifications sont effectuées dans Chrome avec dimensions mobiles simulées. La lecture réelle avec VoiceOver/TalkBack, le ressenti des vibrations et les splash screens d'une installation iOS restent à vérifier sur des appareils physiques. Les matrices de couleur sont une aide ; elles ne garantissent pas une perception identique pour toutes les personnes daltoniennes.
