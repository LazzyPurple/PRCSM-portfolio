# Vérifications par phase

## Phase 1 — simulation

World et shape copiés sans changement de logique. Motifs extraits de Dao.
Le test déterministe de 1 200 pas compare l'état final complet à la référence clonée.
Nourriture bornée/expiration et peur testées : 5 tests passent au total.
TypeScript strict et lint passent. Serveur dev actif.
Vue 2D observée dans le navigateur à `/?debug` : 8 koï, boîtes et ondes visibles.
Clic de nourrissage observé : compteur de 0 à 5 granulés.
Les valeurs proches de 240 FPS dans cette vue sont celles du navigateur local à rafraîchissement élevé,
pas une mesure du rendu GPU final. La comparaison manuelle exhaustive à daoho.dev reste limitée ;
la fidélité des règles est établie par comparaison déterministe au source.
Pas encore de rendu 3D ni de peinture.

## Phase 2 — scène 3D brute

Mare 3D procédurale : koï articulés avec motifs et nageoires, fond bruité,
caustiques, surface, 20 nénuphars (3 projectPads), galets/herbes, profondeur teintée,
ombres simulées et granulés. Raycast mathématique et boîtes projetées.
Captures paysage/portrait observées ; portrait initial : 3 koï selon Dao.
Typecheck/lint passent, 7 tests dont déformation sans renouvellement des buffers.
Erreur de mot réservé GLSL corrigée avant validation.
Le MRT est déjà employé pour assembler la couleur et préparer la phase 3.
Le rendu reste brut ; la peinture, la mesure GPU et l'audit d'allocations restent à faire.

## Phase 3 — flux

Deux attachments MRT observés complets dans le contexte WebGL2 réel du navigateur.
La vue Flux montre les silhouettes distinctes et des directions suivant les colonnes des koï.
Projection des tangentes corrigée par la taille du viewport, régions préservées par la surface.
Typecheck/lint passent. Aucune nécessité de repli en second rendu sur ce contexte.
Pas encore de validation sur un autre pilote/GPU ; les performances finales restent non mesurées.

## Phase 4 — peinture

PAINT_FS porté avec corps inchangé (test de comparaison au source), puis cellules MRT float,
FINAL_FS sans astres/horizon, touches à 55 %, relief, grain et dithering.
Régions de koï distinctes et protection bidirectionnelle des frontières.
WetPaint 64×40, déplacement atténué sur les koï, résorption 0.45 s vérifiée par test.
Gouache observée dans le navigateur : grandes touches d'eau et relief sur les poissons.
Typecheck/lint passent, 9 tests passent. Le budget GPU et l'audit de robustesse restent à effectuer.

## Phase 5 — robustesse livrée, qualification partielle

Tiers/pixel budgets et Scaler d'Ardia intégrés, requêtes GPU réutilisées, pauses,
reduced motion live, secours sans WebGL2, restauration de contexte et dispose.
Les 10 scénarios Chrome isolés passent sans erreur. 11 tests CPU passent,
dont comparaison fidèle de World et des décisions du Scaler aux références.
Build prod/typecheck/lint passent. Le panneau est absent du bundle de production.

Profil Chrome prod 1440×900, DPR 1, échelle 1, RTX 4070 SUPER :
GPU médian 2.736 ms, p95 3.674 ms ; 239.97 FPS ; callback CPU médian 0.315 ms, p95 0.505 ms.
Après précalcul du maillage et réutilisation des couleurs : 6 GC/10 s contre 59 initialement.
Les allocations résiduelles de World/JS/Three restent mesurables : l'absolu zéro allocation
n'est pas atteint. Portable moyen, mobile physique et autres navigateurs restent non qualifiés.
Voir PERFORMANCE.md pour les conditions, les preuves et les limites précises.

La phase 6 optionnelle (affiches WebP) n'est pas réalisée ; le secours actuel reste le dégradé CSS.

## Corrections visuelles — 27 octobre 2026

La simulation de la mare utilise désormais une rive elliptique : anticipation du virage,
garde pour les nageoires et translation de la colonne entière en cas de contact.
Le mode original sans rive reste identique à Dao selon l'oracle. Le nourrissage sur la terre
est rejeté. Un test de 3 600 pas vérifie tous les sommets animés, les segments de colonne,
les poursuites, la fuite et les passages paysage → portrait → paysage.

Le portrait recadre une mare large (rapport minimal 1.35), avec les mêmes FOV 40°,
inclinaison 55° et cadrage que le paysage. Les tailles et effectifs initiaux restent calculés
à partir du viewport CSS ; les poissons se redimensionnent lors d'un changement de format.
Ce choix remplace la vue de l'ovale entier initialement prévue, suivant le retour utilisateur.
Les projections du pointeur et des boîtes de texte suivent les nouvelles dimensions du monde.

Granulés dorés plus gros, touches plus fines, taille minimale de 7 px CSS de diamètre
avant immersion. Mesure Chrome portrait 390×844 : rayons observés 5.59–5.74 px.
Captures observées en paysage et portrait ; style peinture conservé.

13 tests CPU, 11 scénarios Chrome, typecheck, lint et build passent, sans erreur navigateur.
Profil production 1440×900/DPR 1 sur RTX 4070 SUPER : GPU médian 2.607 ms,
p95 4.259 ms, 239.77 FPS. Preuves : `docs/validation/chrome-fixes-{dev,prod}.json`.
Le mobile physique et le portable moyen restent non qualifiés.

## Espacement, diversité et ombrage — 27 octobre 2026

La mare anticipe désormais les contacts avec le corps entier, freine à l'approche
et écarte doucement les colonnes lors d'un contact. L'alignement du banc est moins fort,
y compris pendant le nourrissage. Le placement initial est réparti autour du centre.
Les gabarits sont moins encombrants et couvrent plus d'un facteur 2 entre petits et grands.
Sept robes sont présentes en paysage : kohaku, yamabuki doré, shiro blanc/noir,
asagi bleu ardoise, sanke, karasu charbon et tancho. Les nouvelles couleurs sont dans palette.ts.
Les règles d'origine restent vérifiées par l'oracle dans World sans rive physique.

Les nénuphars projettent une ombre orientée, échancrée et adoucie selon la profondeur,
appliquée après le brouillard pour rester visible. Les koï projettent leur silhouette animée
sur le fond en réutilisant leurs buffers : aucun second calcul CPU du maillage ni shadow map.
Cette approximation ne produit pas d'ombres d'un koï sur un autre.

16 tests CPU, 12 scénarios Chrome, typecheck/lint/build passent. La comparaison des pixels
GPU avec/sans ombres de poissons confirme 26 192 pixels assombris dans la capture de test.
Profil prod 1440×900, DPR 1, RTX 4070 SUPER : médiane GPU 2.748 ms, p95 3.658 ms,
239.97 FPS sur 10 secondes. Preuves : docs/validation/chrome-school-{dev,prod}.json.
Le panneau est de nouveau affiché dans l'aperçu de développement : http://127.0.0.1:3000/?debug.
Les limites de qualification sur mobile physique et portable moyen restent inchangées.

## Robe sombre tricolore — 27 octobre 2026

La robe karasu unie est remplacée par une robe showa : base charbon, deux larges
taches vermillon et deux taches blanc cassé. Les motifs blancs disposent de leurs
propres uniformes ; les autres robes gardent leur rendu. Le panneau de debug reste affiché.
16 tests CPU, 12 scénarios Chrome, typecheck/lint/build passent ; capture paysage observée.
Le budget GPU de production n'a pas été remesuré pour cette modification de motifs.

## Phase 6 — affiches livrées, 28 octobre 2026

13 WebP, cinq cadrages (ultralarge, paysage, intermédiaire, tablette, téléphone),
capturés à la première image prête de notre canvas. Les images ne contiennent ni HTML,
ni texte, ni debug. Le manifeste src/pond/posters.json conserve viewport, taille réelle,
graine de capture, navigateur, révision de base, empreinte PNG, qualité et poids.

Le picture est présent dans le HTML initial, décoratif et sans interaction ; un seul fichier
adapté au ratio et à la densité d'écran est téléchargé. L'affiche reste derrière le canvas,
qui apparaît en 600 ms, et sert au secours sans WebGL2, sans JavaScript ou après perte
de contexte. La transition est désactivée en reduced motion ; le dégradé reste sous l'image.
La graine fixe ne concerne que l'outil de capture, la simulation du site reste vivante.

Génération : npm run posters (serveur dev 3000 lancé), ou URL explicite après --.
Sharp 0.35.5, déjà installé par Next, est déclaré en dev pour l'encodage hors navigateur.
Le transport Chrome est partagé avec la validation. Le nettoyage des anciennes affiches
a été vérifié : il supprime les fichiers générés obsolètes et préserve les autres fichiers.

17 tests CPU/actifs, 14 scénarios Chrome dev et la matrice production sans JavaScript
passent, ainsi que typecheck/lint/build, sans erreur navigateur. Réseau ralenti : affiche
visible avant le moteur, une seule requête WebP et CLS < 0.001. Captures observées.
Poids téléphone 10.6–33.9 Kio ; paysage 27.4–103.6 Kio ; maximum 129.2 Kio.
Profil prod 1440×900/DPR 1 sur RTX 4070 SUPER : GPU médian 3.265 ms, p95 4.483 ms,
239.97 FPS sur 10 secondes. Preuves : docs/validation/chrome-posters-{dev,prod}.json.
Safari, téléphone réel et portable moyen restent à qualifier.

## Cycle complet et végétation — 28 octobre 2026

Un tour aube → jour → crépuscule → nuit dure 180 secondes de simulation active,
comme demandé. Démarrage à 10 h ; l'heure est désormais exprimée sur 24 h.
La direction de lumière, son intensité/couleur, l'ambiante, l'eau, le ciel reflété
et les ombres suivent des transitions lissées, continues au passage de minuit.
La nuit reste bleutée et lisible. Pas de rattrapage pendant la pause, l'onglet caché,
le canvas hors écran ou le mouvement réduit. Le debug affiche HH:MM et la phase ;
le curseur arrête le cycle automatique, le bouton le reprend depuis l'heure choisie.
La durée se règle dans CYCLE_SECONDS de src/pond/cycle.ts.

90 fleurs en 30 petits groupes sur les berges, cinq couleurs de pétales ;
14 massifs d'algues et 98 rubans colorés sous l'eau. Graine fixe, deux maillages
regroupés avec couleurs par sommet ; leur oscillation se fait dans le vertex shader.
Les couleurs sont dans palette.ts ; aucun asset externe ni dépendance de rendu ajoutée.
Les 13 affiches ont été régénérées à l'état initial de jour avec les nouvelles plantes.

Un test a révélé un débordement ancien de nageoires pectorales entièrement ouvertes
après redimensionnement : la garde autour de la colonne passe de 0.31 à 0.4 longueur.
Régression reproductible avec la graine 1, 3 600 pas et deux changements de format ;
huit scénarios à graines différentes passent aussi. Le comportement Dao sans rive
physique reste conforme à l'oracle.

20 tests CPU/actifs, 15 scénarios Chrome dev, matrice prod sans JS, typecheck/lint/build
passent sans erreur navigateur. Captures des quatre phases observées. Luminance moyenne
du rendu scène : jour 120.98/255, nuit 55.25/255, soit 46 % environ.
Profil production 1440×900/DPR 1 sur RTX 4070 SUPER : GPU médian 2.826 ms,
p95 3.678 ms, 239.87 FPS sur 10 s. Preuves : docs/validation/chrome-cycle-{dev,prod}.json.
Safari, téléphone physique et portable moyen restent non qualifiés.

## Adaptations ciblées aux petits écrans — 28 octobre 2026

Les changements visuels sont limités au breakpoint mobile (<1024px). Au premier rendu,
la colonne de chaque koï est placée dans le viewport réellement visible, par projection
caméra sur son plan de profondeur. Les nageoires entières sont testées dans le cadrage.
Ce placement ne s'exécute qu'à l'ouverture ou à une relance de la mare, après la préparation
du mouvement réduit si nécessaire ; la simulation continue ensuite librement. Ni l'angle
de caméra, ni les dimensions du monde, ni le comportement normal ne sont modifiés.
Le seuil utilise la largeur du viewport pour préserver aussi le desktop à 1024px avec
une barre de défilement. Le placement desktop reste inchangé.

Le titre Mes projets était extérieur à un conteneur mobile défilant, ce qui le faisait
paraître sticky. Le mobile utilise maintenant le défilement de la page : son titre est
dans le flux du premier projet et chaque article a son propre arrêt obligatoire de scroll.
Les articles font au moins un viewport, en laissant le contenu dépasser en paysage court
pour éviter de le couper. Les grandes impulsions tactiles passent successivement par les
trois projets avant d'atteindre le footer. La bande desktop et sa navigation sont conservées.

Le menu mobile utilise un dialog HTML natif : capsule translucide avec flou de fond,
grands liens inspirés de la référence fournie, liens sociaux et thème en bas. Il bloque
le défilement de fond, contient le focus, se ferme avec Échap ou un lien et rend le focus
au bouton. Un passage au desktop ferme le menu et restaure la navbar existante. Le fond
du menu et son contraste suivent le thème ; les commandes restent visibles en paysage.
Aucune dépendance supplémentaire. Sans JavaScript, une navigation simple est conservée.

Les affiches téléphone et tablette sont actualisées avec les nouveaux placements ; les
fichiers desktop restent identiques. Commande ciblée :
`node scripts/posters.mjs http://127.0.0.1:3000/ --mobile-only`.
Les métadonnées par capture distinguent les affiches réactualisées.

Validation : 23 tests CPU/actifs, typecheck, lint et build passent. Test de tous les sommets
des poissons sur cinq formats et trois graines, plus vérification que le desktop n'est pas
repositionné. Chrome tactile émulé : 390×844, 320×740, 768×1024, 844×390. Tous les poissons
sont cadrés et apparaissent effectivement dans les pixels GPU dès la première image
(3, 3, 4 et 3 koï respectivement). Les flicks s'arrêtent sur chaque projet ; le titre remonte
avec le contenu. Menu, thème, focus, Échap, liens et changement de breakpoint vérifiés.
Les contrôles desktop à 1440×900 et 1024×900, les routes projet et les pages sans JS passent.
Les 16 scénarios de régression de la mare passent également, sans erreur navigateur.
Rapports : docs/validation/chrome-mobile*.json ; captures : artifacts/mobile/.
Safari et appareil tactile physique restent à qualifier.

## Identité et ouverture animée du menu mobile — 28 octobre 2026

La capsule fermée et celle du menu affichent Nathan TOTO. Le bouton d'ouverture utilise
le SVG squares-four fourni, copié sans modification dans public/icons/ ; son masque CSS
hérite de la couleur du thème. La croix reste le bouton de fermeture.
L'entrée combine descente de 36px et fondu sur 380ms ; les liens descendent à leur tour
avec des départs à 80, 140 et 200ms, sur 280ms chacun. Le verre reste constant, sans animer
le flou ni ajouter de boucle JavaScript. La capsule fermée est masquée pendant l'entrée
de son équivalent modal pour éviter le dédoublement du nom. Le mouvement réduit annule
l'ensemble des animations et des délais. Desktop inchangé.

Typecheck, lint et build passent. Les contrôles Chrome mobile passent aux quatre formats
existants, avec vérification du SVG, du label, des keyframes et délais, du focus, d'Échap,
des liens et du mode mouvement réduit. Captures intermédiaires observées à 120 et 260ms.
Rapport : docs/validation/chrome-mobile-menu-motion.json ; captures : artifacts/mobile/.
Safari et téléphone physique non testés.

## Disques réfléchis du soleil et de la lune — 28 octobre 2026

Le soleil est reconnaissable comme un disque doré, la lune comme un disque pâle
avec des zones grises et du grain procédural. Leurs reflets suivent la direction lumineuse,
avec une déformation modérée par les ondes et des bandes mouvantes à la surface.
Les miroitements utilisent les normales complètes de l'eau autour du disque.
La trajectoire lumineuse passe du côté opposé de la mare pour rendre le reflet visible ;
les ombres suivent la même direction. Un remplissage frontal adoucit le relief de peinture.

Le disque a sa propre région de touches pour rester lisible dans la gouache.
L'effet est limité à l'eau libre : il ne recouvre ni les motifs des koï, ni les nénuphars,
ni les berges. Disques et miroitements sont calculés dans la passe d'eau existante,
sans image de ciel, texture lunaire externe, nouveau maillage ni cible GPU.
Les apparitions/disparitions suivent le cycle de 180 s ; le cadrage peut masquer l'astre
quand il est bas. Les 13 affiches ont été actualisées.

20 tests CPU/actifs et 16 scénarios Chrome dev passent, ainsi que typecheck/lint/build.
Comparaison GPU avec/sans effet : 8 353 pixels de disque solaire et 6 338 lunaires,
zéro pixel de poisson/nénuphar/berge modifié par le reflet. Le centre du reflet solaire
se déplace de x=302 à x=1 147 entre 9 h et 15 h sur un viewport 1440×900.
Profil prod RTX 4070 SUPER : médiane GPU 2.609 ms, p95 4.344 ms, 239.97 FPS.
Preuves : docs/validation/chrome-reflections-{dev,prod}.json ; captures cycle-day/night.
Safari, mobile physique et portable moyen restent non qualifiés.

## Portfolio onepage — 28 octobre 2026

Public prioritaire : recruteurs, avec une lecture accessible aux autres équipes produit.
Le hero présente Nathan Toto, Product Owner, avec un grand titre sombre le jour et crème
la nuit, synchronisé au cycle existant de 180 s sans rendu React à chaque image.
Un voile discret assure la lisibilité devant les poissons et la végétation.
La transition vers les projets utilise une bordure SVG originale de papier peint.

Le header comporte La mare, Mes projets, LinkedIn, GitHub et Contact. Les profils fournis
sont branchés ; Contact et Écrivez-moi ouvrent la messagerie vers
nathan.toto@proton.me, adresse fournie par Nathan.
Pas de page À propos. Les liens internes défilent doucement, sauf mouvement réduit.

La galerie reprend la disposition de Dao : grandes images côte à côte sur ordinateur,
puis liste sur mobile. Le défilement horizontal reste local et natif ; aucune capture
globale de la molette. Les cas se lisent dans des détails HTML accessibles, sans changer
de page et même sans JavaScript. Les trois cas Lisière, Intervalle et Boussole et leurs
visuels sont explicitement fictifs ; Mousse, Céphalée et CareerOS ne reçoivent aucun faux
résultat. Les contenus sont regroupés dans src/portfolio/content.ts et les prompts dans
docs/portfolio-assets.md. Les trois WebP totalisent 310 306 octets.

22 tests, typecheck, lint et compilation production passent. Contrôles Chrome aux formats
1440×900, 390×844, 320×740 et 844×390 : aucun débordement horizontal, navigation, cas,
galerie mobile/desktop, pause réelle hors écran, reprise et mouvement réduit vérifiés.
108 contrôles de contraste sur captures : minimum 5,36:1 pour le titre, 7,23:1 pour les
petits textes du hero, aux phases testées (0, 6, 12 et 18 h sur desktop et mobile).
Ces mesures couvrent les images capturées, pas chaque état possible de la simulation.
Les 16 scénarios de régression de la mare et les cinq cadrages sans JavaScript passent.
Production : médiane GPU 2,670 ms, p95 3,606 ms, 239,97 FPS sur RTX 4070 SUPER,
viewport 1440×900, canvas 1425×900, DPR 1 ; téléphone physique et portable moyen non testés.
Rapports : docs/validation/chrome-portfolio*.json. Captures : artifacts/portfolio/.

## Correction de la composition et portage des pages Dao — 28 octobre 2026

Cette version remplace la première interprétation de la galerie. DesktopStrip, StripTile,
MobileLayout, la page dédiée, son cadre 56rem, sa couverture, son récit et ses liens
précédent/suivant sont portés du code Dao. Les fichiers et adaptations sont listés dans
CREDITS.md ; Geist Sans/Mono sont servis localement avec leur licence OFL conservée.
Les trois routes /projects/lisiere, /projects/intervalle et /projects/boussole sont
prérendues. Plus de cas dépliants sur la landing ni de compteur à côté de Mes projets.

Après la dernière précision de Nathan, le titre « Hi, I’m Nathan TOTO » est réduit et
placé en bas à gauche. Aucun fond, voile ou pseudo-élément ne couvre le texte : seules
les lettres ont une ombre fine. Sous-titre : « Product Owner, je laisse la créativité
faire des ricochets, puis je donne aux idées un cap. » Le header n'a plus de nom ni
de fond. La mare reste le centre visuel, dans une section exactement égale au viewport,
avec un léger débord et une bordure peinte visibles en haut de la section projets.

Les trois sections font chacune 100svh et s'aimantent au scroll. Sur desktop, le glide
de Dao fait défiler la galerie à la molette avant de passer au footer ; sur mobile,
sa liste défile à l'intérieur du même viewport. La correction d'un arrondi scrollLeft
évite de laisser tourner un RAF à l'extrémité de la galerie. Les transitions natives
remplacent Motion sans nouvelle dépendance. Le thème sombre est la valeur initiale,
le bouton soleil/lune conserve le choix clair/sombre en local, indépendamment de
l'heure de la mare. Le footer est violet pâle opaque dans les deux thèmes.
Le cycle complet de lumière passe de 180 à 480 secondes (8 minutes).

Vérification : 22 tests CPU/actifs, typecheck, lint et build passent. Contrôles Chrome
1440×900, 390×844, 320×740 et 844×390 : sections de la bonne hauteur, absence de débordement,
texte sans fond à gauche, navigation réelle, sortie de galerie, footer, thème persistant,
précédent/suivant, retour à la galerie, libération du moteur et pages sans JavaScript.
Huit captures de thème/heure (jour/nuit, clair/sombre, desktop/mobile) ont été observées.
Les anciens chiffres de contraste du hero avec voile ne s'appliquent plus à cette version.
Les couleurs des deux thèmes et du footer respectent 4,5:1 pour le texte ; les ombres des
lettres aident la lecture sur l'eau, sans garantie chiffrée pour chaque fond animé possible.
Les 16 scénarios de régression de la mare passent, ainsi que les cinq affiches sans JS.
Profil production RTX 4070 SUPER, viewport 1440×900/DPR 1, canvas 1425×980 avec débord :
GPU médian 2,758 ms, p95 3,642 ms, 239,97 FPS sur 10 secondes. Aucun log d'erreur navigateur.
Rapports : docs/validation/chrome-portfolio-v2*.json. Captures : artifacts/portfolio-v2/.
Safari, téléphone physique et portable moyen restent non qualifiés.

## 2026-10-28 — Céphalée, premier cas réel

Lisière est remplacé dans la sélection, les aperçus et la navigation par Céphalée,
route /projects/cephalee. Le cadre et les interactions de la page Dao sont conservés.
Le récit statique est composé côté serveur dans le shell client existant : contexte,
sondage et benchmark, décision de deux interfaces, parcours patient et cadrage des
données de santé. Aucun résultat du sondage propre au projet, déploiement ou effet
clinique n'est inventé. Intervalle et Boussole restent explicitement fictifs.

Les cinq images fournies sont encodées en WebP à leurs dimensions originales avec
transparence conservée : environ 500 Ko au total. Les quatre écrans patient sont
intégraux, responsifs et ouvrables en grand. Aucun écran praticien n'a été fabriqué.
La source de 2022 est vérifiée : résultats préliminaires, n=300, 77,3 % arrondi à
77 %, 74 %, 79 % « rarement ou jamais ». Les formalités CNIL sont présentées selon
le traitement, HDS comme sujet d'hébergement étudié au cadrage. Provenance détaillée
dans docs/cephalee-sources.md ; liens accessibles depuis la page.

Vérification : tsc, lint, 23 tests et build standard Turbopack passent. Le cache
Turbopack de production initial empêchait le lancement du worker PostCSS ; le déplacer
dans artifacts/turbopack-before-cephalee a suffi, sans changement de configuration.
Un build Webpack de repli a également passé. La nouvelle route a d'abord été mise en
cache en 404 par le serveur dev, puis a correctement été recompilée sans redémarrage.
Chrome : 1440/1024 desktop, Céphalée à 1440/390/320, thèmes sombre/clair, quatre
captures chargées sans recadrage, sources, aucune largeur débordante, précédent/
suivant et retour, HTML prérendu. Régression mobile 390×844, 320×740, 768×1024,
844×390 : aimantation par projet, menu animé, clavier et reduced motion passent.
Aucun log d'erreur navigateur. Rapports : docs/validation/chrome-cephalee*.json.
Les contrôles portent sur Chrome Windows ; Safari et téléphone physique non vérifiés.

## 2026-10-28 — Mousse, projet personnel du quotidien

Intervalle est remplacé par Mousse dans la sélection, la route /projects/mousse et
les liens précédent/suivant. La dernière précision de Nathan guide le récit : projet
personnel utilisé quotidiennement comme assistant IA sur Mac, plutôt que cas de
produit commercial. La page décrit l'encoche, l'IA locale Gemma E4B à 12B selon la
configuration, les actions et la navigation web, les rappels/habitudes/widgets et le
second brain. Aucun entretien, résultat d'adoption ou benchmark matériel n'est inventé.
Le récit reprend les indications actuelles de Nathan ; ce travail ne modifie pas
l'application Mousse elle-même.

Les cinq visuels fournis sont conservés sans recadrage dans le récit, encodés en
WebP à leurs dimensions originales (2 005 238 octets au total). Le visuel des trois
formats de l'encoche reste en 3840×2880 ; Next Image sert des tailles responsives.
Les quatre figures s'ouvrent en grand. Le bandeau utilise un point de cadrage propre
à la photo de Mousse pour garder l'encoche visible ; les cadrages des autres cas sont
conservés. Aucun changement du moteur de la mare ni nouvelle dépendance.

Les tirets cadratins du paragraphe signalé de Céphalée sont retirés, ainsi que ceux
des liens et libellés du récit. Boussole reste le seul placeholder fictif.

Vérification : typecheck, lint, 23 tests et build standard Turbopack passent. Chrome :
Mousse et Céphalée à 1440/390/320 px, clair et sombre, images intégrales chargées,
ouverture en grand, aucun débordement, navigation précédent/suivant et retour à la
landing, prérendu des trois routes et 404 inconnu. Version de production de Mousse
contrôlée avec et sans JavaScript, thème sombre initial et aucune erreur navigateur.
Rapport : docs/validation/chrome-mousse.json. Captures : artifacts/portfolio-v2/mousse*
et artifacts/mousse-production/. Safari et téléphone physique non vérifiés.

## 2026-10-28 — Couverture Mousse choisie par Nathan

La composition des trois formats autour de l'encoche remplace la photo du café en
couverture de Mousse : sélection, bandeau, image d'introduction et aperçus des liens.
L'encodage WebP existant est réutilisé ; dimensions 3840×2880 et texte alternatif
corrigés dans les données partagées. La photo du café prend sa place dans le récit
avec une légende adaptée, ce qui conserve les cinq visuels sans répétition supplémentaire.
Typecheck, lint, 23 tests et build passent. Contrôle Chrome à 1440×900 et 390×844 :
nouvelle source chargée dans la sélection, page dédiée avec ratio 4:3, aucun
débordement ni erreur navigateur. Captures : artifacts/mousse-cover/projects-*.png.

## 2026-10-28 — GrooveNomad, troisième projet réel

Boussole est remplacé par GrooveNomad, projet d'école collectif, à la route
/projects/groovenomad. Le récit emploie « nous » et reprend les éléments fournis :
positionnement voyage/musique/IA, analyse de marché, trois personas, périmètre,
automatisation, tableaux de bord, KPI et roadmap. La précision directe de Nathan
sur trois phases (lancement ; croissance et structuration ; expansion et leadership)
prime sur la slide produit en quatre étapes, non affichée. Pas de détail inventé
sur les personas, le rôle individuel, les cibles de KPI ou les résultats commerciaux.

Quatre visuels sélectionnés parmi les neuf fournis : couverture, fonctionnalités,
scénario Make et dashboard décisionnel. Encodage WebP aux dimensions originales,
sans retouche ni recadrage des slides, avec liens vers les grands formats. Les autres
slides ont servi de contexte. Provenance : docs/groovenomad-assets.md. Les trois
projets actifs sont désormais Céphalée, Mousse et GrooveNomad ; le rendu générique
des placeholders est supprimé de ProjectPage, qui reçoit toujours son récit serveur.

Validation : typecheck, lint, 23 tests et build Turbopack passent. Chrome vérifie les
trois cas à 1440/390/320 px en clair/sombre, les slides complètes, les trois phases,
la navigation, le retour à la sélection et l'absence de débordement. Production
GrooveNomad vérifiée avec et sans JavaScript, thème sombre initial et aucune erreur
navigateur. Les ratios sont mesurés via DOMRect pour éviter les arrondis entiers des
attributs DOM width/height sur les petites slides. Rapport :
docs/validation/chrome-groovenomad.json. Captures : artifacts/portfolio-v2/groovenomad*
et artifacts/groovenomad-production/. Safari et téléphone physique non vérifiés.

## 2026-10-28 — Parcours GrooveNomad et préparation Netlify

La slide des fonctionnalités comportant une faute est supprimée du récit et de
public/. Les fonctionnalités sont reformulées avec les trois nouveaux écrans :
itinéraire en premier (conversation IA, étapes modifiables et devis PDF envisagé),
exploration (destination, festivals, préférences musicales, fiche de séjour), puis
carte (lieux et hébergements dans leur contexte géographique). Chaque figure associe
son titre et son texte à l'écran correspondant. Images intégrales WebP 3840×2880,
avec lien grand format. Automatisation et dashboard sont conservés plus bas.

Préparation Netlify : netlify.toml indique npm run build et .next ; .node-version
sélectionne Node 24 ; .netlify/ est ignoré. Pas de dépendance d'adaptateur ajoutée :
Netlify installe automatiquement son adaptateur Next.js. Les variantes natives
Linux x64 de Next, Sharp et Tailwind sont présentes dans le lockfile. Aucun secret
ou variable d'environnement requis pour le portfolio actuel. Le guide
/docs/deploy-netlify.md décrit l'import Git, les réglages et les vérifications après
publication. Aucun dépôt distant n'est configuré ; aucun site n'a été créé ou publié.
Documentation Netlify/OpenNext actuelle consultée, sans export statique ni redirection SPA.

Validation : typecheck, lint, 23 tests et build standard passent. Chrome à
1440/390/320 px, clair/sombre : ordre des trois écrans, présence du texte associé,
cinq figures du récit, absence de la slide fautive, images complètes, navigation et
absence de débordement. Production locale : les quatre pages répondent 200, l'URL
inconnue et l'ancienne image répondent 404, récit disponible sans JavaScript.
Aucune erreur navigateur. Rapport : docs/validation/chrome-netlify-preparation.json.
Captures : artifacts/netlify-preparation/. Le build cloud Netlify, son CDN, Safari et
un téléphone physique restent à vérifier après le premier déploiement.
