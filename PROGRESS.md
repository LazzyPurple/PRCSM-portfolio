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
