# Mare de koï — plan de réalisation

Établi le 27 octobre 2026 après lecture des références. Phase 0 uniquement réalisée.
Ce document est présenté avant tout portage de la phase 1, conformément au jalon demandé.
Les phases suivantes s'enchaîneront sans nouvel accord pour les choix techniques ordinaires.
Un changement important du rendu sera présenté avant d'être appliqué.

## 1. État du projet et versions vérifiées

Le dossier était vide, sans dépôt Git ni instructions locales. Un dépôt `main` a été initialisé.
Les clones complets sont dans `references/dao-portfolio` et `references/ardia`.
`/references/` est exclu de Git, de TypeScript et d'ESLint ; Tailwind limite sa recherche à `src`.
Les références ne deviennent ni dépendances d'exécution, ni imports du produit.

Versions exactes issues des tags stables npm et installées :

| Outil | Version | Choix |
| --- | --- | --- |
| Node local | 24.21.0 | Projet prévu pour Node 24+ |
| Next.js / eslint-config-next | 16.4.3 | App Router, Turbopack, sans options expérimentales ajoutées |
| React / React DOM | 19.3.1 | Pas de React Three Fiber |
| Three.js | 0.186.1 | WebGLRenderer vanilla |
| Types Three.js | 0.186.0 | Derniers types publiés pour r186 |
| TypeScript natif | 7.0.2 | Alias npm `@typescript/native`, commande `tsc` |
| API TypeScript pour ESLint | 6.0.2 | Alias officiel `typescript = npm:@typescript/typescript6@6.0.2` |
| Tailwind / plugin PostCSS | 4.3.3 | Pas de configuration Tailwind v3 |
| ESLint | 10.13.0 | Lint exécuté et passant avec la configuration Next |

TypeScript 7 seul fait échouer `typescript-eslint`, qui réclame encore l'API JS 6.
La cohabitation officielle conserve le compilateur actuel sans désactiver le lint.
Le code installé de Next active déjà `useTypeScriptCli: true` par défaut.
Les plugins React/import/a11y transitifs de Next déclarent encore des peers jusqu'à ESLint 9 :
npm émet des avertissements, mais le lint réel passe avec ESLint 10.
ESLint 9.39.5 est signalé hors support par npm et n'a pas été retenu.
Le lockfile fixe les dépendances ; aucune utilisation de `--force` ou `--legacy-peer-deps`.

Documentation consultée :

- [Next.js 16.4.3, releases officielles](https://github.com/vercel/next.js/releases/tag/v16.4.3).
- [Next.js, TypeScript 7](https://nextjs.org/docs/app/api-reference/config/typescript).
- [Microsoft, cohabitation TypeScript 6 et 7](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6.0).
- Guides fournis par le Next installé : installation, CSS, lazy loading et TypeScript.

## 2. Lecture et licence des références

### Dao Ho

Commit `43a0ae45ae9b0cd1e1a00f322a02fac8fbb8fbf5`.
Fichiers lus en entier dans `src/app/components/koi-pond/` :

- `world.ts` (479 lignes) : règles, 20 nœuds, curiosité, peur, nourriture, profondeur et ondes.
- `shape.ts` (90 lignes) : profil corporel et classification des nageoires.
- `renderer.ts` (724 lignes) : extraction des motifs, onde corporelle et ouverture des nageoires ; ASCII exclu.
- `koi-pond.tsx` (228 lignes) : boucle fixe, interactions, protection des contrôles et contenu à éviter.

Le dépôt n'a pas de licence générale explicite. L'autorisation publique est rapportée par
le commanditaire, qui n'a plus le lien du tweet. Crédit au site, à `@daoho04` et au dépôt,
sans inventer de tweet ou de licence MIT. Aucun portage de Dao à ce stade.

### Ardia

Commit `0d16725fc0cc44ab0822d6f4719ea47b23cb76cf`.
Fichiers lus en entier :

- Racine : `LICENSE.Apache-2.0`, `NOTICE` et `AGENTS.md` ; section licence du README.
- `apps/site/README.md` et `package.json`.
- `apps/site/src/scripts/meadow/shaders.ts` (1080 lignes), `scene.ts` (1419 lignes),
  `budget.ts`, `smear.ts`, `boot.ts`, `gl.ts`, `layout.ts`, `matrix.ts`, `daylight.ts`, `clock.ts`, `cycle.ts`.
- `apps/site/src/components/Hero.astro` et `apps/site/scripts/hero-posters.mjs`.

Confirmation du périmètre Apache-2.0 : le `NOTICE` couvre les propres sources d'Ardia ;
aucune licence plus spécifique contradictoire n'existe dans `apps/site`.
Le README et la carte du dépôt concordent. La GPL du navigateur distribué concerne
sa combinaison avec le moteur ; aucun code du moteur n'est repris ici.
La licence est copiée à l'identique dans `licenses/ardia-APACHE-2.0.txt` (SHA-256 vérifié).
Le `NOTICE` original est conservé dans `licenses/ardia-NOTICE.txt`.

En-tête de chaque fichier adapté : origine exacte, URL du dépôt, copyright,
`SPDX-License-Identifier: Apache-2.0`, et indication du portage/modifications.
La liste des fichiers effectivement portés sera maintenue dans `CREDITS.md`.

## 3. Architecture retenue

Arborescence demandée conservée : `app`, `pond/sim`, `pond/scene`, `pond/paint`, `pond/debug`.
Les fichiers ne sont créés qu'au moment où leur phase leur donne un rôle réel.

- `page.tsx` reste serveur : mare plein écran + titre/phrase dans un bloc papier `data-koi-avoid`.
- `layout.tsx` : langue, métadonnées et variables CSS dérivées de `palette.ts`.
- `KoiPond.tsx` : seul point d'entrée client de la mare, canvas inaccessible aux pointeurs et aria-hidden.
  Après le premier affichage : détection effective WebGL2 sur canvas de test, puis import dynamique du moteur.
  Le moteur et Three ne sont pas importés si le contexte est indisponible.
  Annulation du démarrage différé et destruction si démontage pendant l'import.
- `engine.ts` possède World, boucle fixe, états pause/visibilité, événements, mesures et durée de vie.
  Il appelle directement la vue 2D ou `PondScene`, sans framework de rendu ni magasin global React.
- `PondScene.ts` possède caméra, renderer, assemblage et orchestration des passes.
  Les modules de décor construisent/disposent leurs géométries et matériaux.
- `flow.ts` fixe le contrat couleur/flux et les identifiants de région.
- `paint/*` possède les shaders, cibles et budget. Un triangle plein écran réutilisé,
  une caméra orthographique et des RawShaderMaterial GLSL3.
- `DebugPanel.tsx` chargé uniquement en développement et avec `?debug`.
  Import protégé par la constante de compilation `process.env.NODE_ENV` pour permettre son élimination en production.
  Stats rafraîchies à faible fréquence ; pas de setState à chaque image.
- `palette.ts` contient toutes les couleurs, y compris les futurs ciels jour/crépuscule,
  vase, galets, herbes, nénuphars, granulés et reflets. Aucun média externe.

La phase 1 ajoute une petite vue 2D propre au debug ; elle ne porte pas le renderer ASCII.
La page garde le secours CSS hors debug jusqu'à l'arrivée de la scène 3D en phase 2.

## 4. Ce qui est porté et ce qui est réécrit

| Élément | Traitement |
| --- | --- |
| `World`, constantes, règles de Dao | D'abord copie fidèle ; aucune simplification des interactions |
| `shape.ts` | Copie conservant `bodyHalfWidth()` et les proportions |
| `koiMarkings()` | Extraction fidèle avec ses types et `hash3()` |
| Onde corporelle et nageoires de Dao | Formules réutilisées ; rasterisation remplacée par géométrie 3D |
| Boucle/interactions de Dao | Adaptées au raycast, à la visibilité et au cycle de vie Next |
| `PAINT_FS` | Corps du shader porté tel quel avant réglage |
| `STROKE_CELLS`, `CELL_FS` | Portés, même grille et `CELL_MARGIN = 7` |
| `FINAL_FS` | Touches, mélange 0.55, relief, grain, lumière et dithering conservés ; soleil/lune/horizon supprimés |
| `WetPaint` | Même champ 64×40 et résorption 0.45 s ; transport par DataTexture |
| `pickTier`, `GpuClock`, `Scaler` | Logique et seuils conservés initialement ; nettoyage et allocations corrigés ensuite |
| Eau, fond, bord, nénuphars, maillage et éclairage | Écrits pour cette mare, visuels procéduraux et nouvelle palette |
| Astro, GL brut, terrain, animaux, analytics et médias d'Ardia | Non portés |

## 5. Espace de simulation et interactions

Un seul facteur isotrope convertit les pixels CSS virtuels vers les unités 3D.
La zone de mare visible est déterminée par les rayons des coins du viewport sur `Y = 0`.
Ses dimensions de simulation sont normalisées pour conserver un budget de surface cohérent
avec la surface CSS, sans étirement indépendant X/Z. Les tailles et effectifs continuent
de venir exclusivement de `World.resize()` et de son `seed()`.
Vérifier en paysage/portrait la densité, les tailles et le seuil des jeunes koï.

Conversion : `X = (x - width/2) * scale`, `Z = (y - height/2) * scale`,
`Y = -(1 - depth) * MAX_DEPTH`. L'origine et l'échelle sont partagées par décor,
debug, pointeur, granulés et ondes. `RIPPLE_SPEED = 52` reste en unités simulation/seconde.

Caméra perspective : FOV initial 40°, inclinaison 55° sous l'horizontale,
mare occupant l'image et bord supérieur/latéral visible. En portrait, monter/reculer
la caméra et adapter le FOV pour garder la mare lisible et entière.
Le cadrage exact sera jugé sur les captures de phase 2.

Pour chaque boîte `data-koi-avoid` : projeter les quatre coins écran sur le plan
mathématique de l'eau, convertir en simulation, puis prendre l'AABB.
Mesurer au resize, scroll, changement de taille des éléments et à cadence limitée
pour les changements de layout ; pas de lecture DOM à chaque image.
Conserver la fusion des boîtes proches de Dao en coordonnées virtuelles.

Événements sur window. Pointeur : `Raycaster.ray.intersectPlane()`, vecteurs réutilisés.
La vitesse est mesurée en coordonnées simulation pour conserver le seuil de peur.
Contrôles interactifs et sélections de texte exclus par `composedPath()` comme chez Dao.
Tactile : tap borné en déplacement/durée, un seul nourrissage, aucune curiosité de survol.

## 6. Scène et contrat MRT

Koï : 20 anneaux d'environ 12 sommets avec positions/normales préallouées.
Le corps s'arrête au pédoncule ; la portion terminale de la colonne guide la queue papillon.
Section elliptique, dos bombé, nageoires souples, yeux et bouche lisibles.
Attributs corps `(s, v)`, taches fixes en uniformes par individu,
contraste/couleur atténués selon la profondeur et ombres des feuilles.

Fond procédural, caustiques animées atténuées en profondeur, teinte de volume
partagée par fond/poissons. Surface légère avec bandes de ciel et normales
perturbées par bruit + maximum 32 ondes actives, choisies sans copier les tableaux.
20 nénuphars dont 3 grands `projectPads` regroupés et purement décoratifs.
Galets/herbes instanciés si utile, graine fixe par défaut ; relance debug avec nouvelle graine.
Une directionnelle et une hémisphérique, heure 0..1 pilotée par debug.
Première option d'ombre : empreinte douce calculée à partir des disques des feuilles
sur fond et koï, sans shadow map générale ; adopter une map ≤1024 seulement si nécessaire.

MRT vérifié dans la doc et le code de Three installé :

```ts
new THREE.WebGLRenderTarget(width, height, { count: 2 });
// textures[0] is color; textures[1] is flow.
```

RawShaderMaterial avec `glslVersion: THREE.GLSL3` ; sorties explicites
`layout(location = 0)` et `layout(location = 1)`.
Retirer `#version 300 es` des chaînes d'Ardia : Three ajoute lui-même cette ligne.
Ce contrat est couvert par deux tests CPU ; compilation GPU et pièces jointes
réellement complètes à valider en phase 3, pas déclarées testées à la phase 0.

La transparence de l'eau ne doit pas mélanger les identifiants de région des koï.
Prévoir une sous-passe opaque couleur/flux puis la composition de surface
échantillonnant ces cibles dans une cible différente, sans lecture/écriture de la même texture.
Sous un koï visible, préserver sa région et sa direction ; ailleurs, flux d'eau.
Régions distinctes : eau/fond, chaque koï, feuilles, bord et nourriture.
La sélection des touches doit rejeter les régions incompatibles dans les deux sens,
en étendant le garde-fou `CREATURE_REGION` d'Ardia.

Sans MRT utilisable : seconde passe de scène avec matériaux flux dédiés,
mêmes profondeurs/occlusions et même composition de surface. Sans cibles float
pour les cellules : calcul direct des cellules dans FINAL_FS, repli déjà prévu par Ardia.

Références : [RenderTarget](https://threejs.org/docs/pages/RenderTarget.html),
[exemple officiel r186 MRT](https://github.com/mrdoob/three.js/blob/r186/examples/webgl_multiple_rendertargets.html).

## 7. Chaîne de peinture et budget

1. Scène/composition eau → `sceneColor` + `sceneFlow` à la résolution de rendu.
2. `PAINT_FS` → cible à `PAINT_SCALE = 0.62`, rayon `2.3 × renderedWidth / cssWidth`.
3. `CELL_FS` → petite table MRT `shape` et `stroke` flottante, marge 7.
4. `FINAL_FS` → écran, mélange 55 %, relief et grain procédural, lumière de la scène
   projetée dans le repère écran. Une seule conversion de couleur vers l'affichage.
5. Champ WetPaint 64×40 → texture RG ; smear faible sur koï, récupération 0.45 s.

Différence constatée : Ardia rend aussi la scène à 0.62 de la résolution du canvas.
La chaîne demandée garde ici la scène à pleine résolution de rendu et réduit la cible paint.
Ce coût supplémentaire sera mesuré ; une réduction commune sera proposée si le budget l'exige.
Ni impasto, ni grain.webp : le relief et le grain de FINAL_FS sont déjà procéduraux.

Tiers conservés : mobile tactile petit écran → DPR ≤2 et 1.1 M pixels ;
autres → DPR ≤1.6 et 2.4 M pixels.
`effectiveDpr = min(deviceDpr, cap, sqrt(pixelBudget / cssArea)) × scaler.scale`.
Les cibles ne changent qu'au resize ou changement effectif d'échelle.
Le GpuClock entoure toute la chaîne et ignore les mesures disjointes.
Sans extension timer, afficher « GPU indisponible », sans assimiler temps CPU et GPU.

## 8. Robustesse et points à mesurer

- Accumulateur fixe 1/60 s, maximum 4 pas comme Dao ; pas de rattrapage après pause.
- Annuler réellement RAF quand document caché, canvas hors écran, pause debug ou contexte perdu.
- Reduced motion : 240 pas d'installation, une image, pas de nourrissage ; changement live.
  Resize/restauration peuvent demander une nouvelle image statique sans redémarrer la boucle.
- Fondu canvas 600 ms après première image valide ; secours CSS conservé au-dessous.
- Contexte perdu : preventDefault, arrêt, secours visible ; restauration contrôlée des ressources,
  sans dupliquer la simulation, les abonnements ou les boucles.
- Dispose complet : observateurs, écouteurs, tâches de démarrage, RAF, géométries, matériaux,
  textures, cibles, renderer, requêtes timer en attente et références de debug.
- Démontage/remontage testé, notamment le double cycle des effets React en développement.

Tension explicite : `world.ts` utilise des `filter()` par koï/pas, et `GpuClock` crée des requêtes
et objets ; `Scaler` trie des copies. Une copie littérale ne respecte pas « zéro allocation ».
Phase 1 : règles inchangées et oracle reproductible. Phase 5 : seulement si le profil le confirme,
compaction stable sur place et pools bornés, comparés pas à pas à l'original sous la même séquence
aléatoire. Aucune modification des forces, seuils, prises de nourriture ou ordre de traitement.
Ne pas promettre l'absence absolue d'allocations internes du navigateur/Three : distinguer
allocations évitables de notre boucle, événements ponctuels et GC observé.

Objectifs à qualifier sur le matériel réellement testé : 60 FPS et GPU <10 ms/image.
Rapport : navigateur, GPU identifié, viewport/DPR, mode prod, échelle, effectifs,
durée, médiane/p95 GPU et CPU, FPS, mémoire/GC. Les timings d'une machine puissante
ne qualifient pas automatiquement un portable moyen ; aucune estimation présentée comme mesure.
Chrome Performance pour les allocations, GPU timer pour le coût GPU, captures pour le rendu.

## 9. Phases et validation

| Phase | Livraison et critères | Contrôles ciblés |
| --- | --- | --- |
| 0 | Socle strict, clones lus, licences, crédits et ce plan | tsc, lint, build, deux tests API Three, page locale et capture |
| 1 | World/shape/motifs, moteur et simulation 2D debug | Tests déterministes de fidélité, nage, peur, curiosité, nourrissage, boîtes et tactile ; vérification visuelle |
| 2 | Mare 3D brute complète | Captures paysage/portrait, proportions et profondeur lisibles, raycast et ombres cohérents |
| 3 | MRT et vue flux | Compilation GPU, attachements, orientations le long des poissons et préservation des régions sous l'eau |
| 4 | Kuwahara, cellules, finale et WetPaint | Comparaison brute/finale, lisibilité des koï, épaisseur, grandes touches d'eau, smear/résorption |
| 5 | Budget, cycles de vie et mesures | Tests visibilité, reduced motion, absence WebGL2, pertes/restaurations, navigation ; profil prod et rapport chiffré |
| 6, option | Affiches de nos propres premières images | Script inspiré de hero-posters, WebP multi-largeurs et provenance des captures |

À chaque phase : serveur dev, inspection réelle, capture si possible, tsc et lint,
tests pertinents puis commit explicite et bilan court. Build au socle puis quand le
chargement/code splitting ou l'intégration des passes change ; mesures de performance en production.
Ne pas ajouter de backend, CMS, liens de projets, GUI externe, dépendance de postprocessing ou contenu portfolio.

## 10. Bilan de la phase 0

- Socle Next fonctionnel, seule image actuelle : dégradé + bloc HTML de test, aucun koï encore porté.
- `npm run typecheck` : passe, compilateur 7.0.2.
- `npm run lint` : passe, aucun avertissement de lint après correction PostCSS.
- `npm test` : 2/2 tests API Three passent, sans prétendre compiler des shaders sur GPU.
- `npm run build` : passe avec Turbopack, route `/` statique.
- Sandbox Windows : Turbopack ne connectait pas son worker PostCSS ; build/dev exécutés
  avec l'autorisation d'outil hors sandbox, sans changement de bundler ni de configuration produit.
- Page locale vérifiée à l'œil ; aucune erreur/warning console relevée dans la capture navigateur.
- Capture : `artifacts/phase-0-desktop.png` (artefact local exclu de Git).
- Restent non validés : simulation, scène, shaders GPU, mobile réel, cycles de vie et performance.
- Risques ouverts : source précise de l'autorisation Dao, peers ESLint transitifs, budget pleine résolution,
  allocations de l'original et lisibilité des régions avec l'eau.
