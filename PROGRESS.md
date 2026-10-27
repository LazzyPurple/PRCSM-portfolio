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
