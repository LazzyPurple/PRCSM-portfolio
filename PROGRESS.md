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
