# Crédits

## Koï — Dao Ho

Simulation adaptée de [Dao Ho](https://www.daoho.dev/),
[Twitter / X : @daoho04](https://x.com/daoho04),
[dépôt Dao-Ho/portfolio](https://github.com/Dao-Ho/portfolio).

Référence : commit `43a0ae45ae9b0cd1e1a00f322a02fac8fbb8fbf5`.
Le compte X est celui lié par `src/app/components/front-page.tsx` dans ce dépôt.

L'autorisation publique de reproduction est rapportée par le commanditaire.
Le lien du tweet n'a pas été retrouvé et n'est pas disponible auprès du commanditaire.
Cette mention ne constitue pas une vérification indépendante de cette autorisation.
Le dépôt consulté ne contient pas de licence générale explicite pour ces fichiers.

Portages Dao : simulation, formes, motifs, règles de moteur et déformation du maillage.

| Source dans `src/app/components/koi-pond/` | Destination |
| --- | --- |
| `world.ts` | `src/pond/sim/world.ts` |
| `shape.ts` | `src/pond/sim/shape.ts` |
| `renderer.ts`, fonction `koiMarkings()` et types associés | `src/pond/sim/markings.ts` |
| `koi-pond.tsx`, règles de boucle et d'interaction | `src/pond/engine.ts` et `src/pond/KoiPond.tsx` |
| `renderer.ts`, onde corporelle et ouverture des nageoires | `src/pond/scene/koiMesh.ts` |

Le rendu ASCII, ses palettes, les images et les analytics ne sont pas repris.

## Peinture — Ardia

Passes de rendu, peinture fraîche et budget GPU adaptés de
[mantrakp04/ardia](https://github.com/mantrakp04/ardia),
Copyright 2026 Mantra Patel, sous Apache-2.0.

Référence : commit `0d16725fc0cc44ab0822d6f4719ea47b23cb76cf`.
Voir [licence Apache-2.0](licenses/ardia-APACHE-2.0.txt) et
[NOTICE original conservé](licenses/ardia-NOTICE.txt).

Le `NOTICE` à la racine couvre les propres sources d'Ardia sous Apache-2.0 ;
`apps/site` en fait partie et ne contient pas de licence contradictoire.
La GPL-3.0 de l'application distribuée avec son moteur ne doit pas être confondue
avec la licence de ces sources du site.

Portages peinture présents depuis la phase 4 :

| Source dans `apps/site/src/scripts/meadow/` | Destination |
| --- | --- |
| `shaders.ts`, helpers de bruit et `encodeFlow()` | `src/pond/paint/common.glsl.ts` |
| `shaders.ts`, `PAINT_FS` | `src/pond/paint/paintPass.ts` |
| `shaders.ts`, `STROKE_CELLS`, `CELL_FS`, `FINAL_FS` | `src/pond/paint/strokePass.ts` |
| `smear.ts`, `WetPaint` | `src/pond/paint/wetPaint.ts` |
| `budget.ts`, `GpuClock`, `Scaler` | `src/pond/paint/budget.ts` |
| `scene.ts`, `pickTier()` et formule du budget de pixels | `src/pond/paint/budget.ts` |
| `boot.ts`, principe de démarrage après affichage | `src/pond/KoiPond.tsx` |
| `shaders.ts`, `encodeFlow()` | `src/pond/scene/flow.ts` |

Chaque fichier effectivement porté conserve un en-tête avec le chemin d'origine,
le dépôt, le copyright, Apache-2.0 et une mention des modifications.
Le transport de capture Chrome partagé dans `scripts/chrome.mjs`, son usage dans
`scripts/validate.mjs` et le générateur `scripts/posters.mjs` sont adaptés de
`apps/site/scripts/hero-posters.mjs`, sous la même licence Apache-2.0.
Les affiches WebP dans `public/pond/` sont des captures de notre propre canvas,
sans texte ni panneau de debug ; `src/pond/posters.json` consigne leur provenance.

Les images, textures, palettes, modèles de terrain, personnages et analytics d'Ardia
ne sont pas repris. La palette de cette mare et ses éléments visuels sont propres au projet.

## Composition du portfolio

La galerie et les pages dédiées sont désormais portées depuis le portfolio de Dao Ho,
avec ses dimensions, ses espacements, son glissement horizontal et sa navigation.

| Source Dao | Destination |
| --- | --- |
| `src/app/projects/page.tsx`, `DesktopStrip`, `StripTile`, `MobileLayout` | `src/portfolio/Projects.tsx` |
| `src/app/projects/[slug]/page.tsx` | `src/app/projects/[slug]/page.tsx` |
| `src/app/projects/[slug]/project-page.tsx`, cadre, récit, couverture, glide, `PagerLink` | `src/portfolio/ProjectPage.tsx` |
| `src/lib/view-transition.ts` et animations de `src/app/globals.css` | `src/portfolio/navigation.ts`, `src/app/globals.css` |

Adaptations : section de landing aimantée, sortie de la galerie vers les sections voisines,
correction de l'arrondi de `scrollLeft` pour terminer le RAF, liens et contenus propres au
portfolio. Les vidéos et galeries de captures ne sont pas incluses dans ces cas fictifs.
Les transitions natives et CSS remplacent Motion ; aucun paquet de rendu supplémentaire.

Les trois fichiers Geist Sans 400/500 et Geist Mono 400 sont repris sans modification
depuis `src/app/fonts/` de cette référence. Copyright 2024 The Geist Project Authors,
[vercel/geist-font](https://github.com/vercel/geist-font), SIL Open Font License 1.1.
La licence originale est conservée dans [licenses/GEIST-OFL.txt](licenses/GEIST-OFL.txt).
Ils sont servis localement par Next.js, sans requête à Google Fonts.

Le menu mobile actuel est une implémentation propre en dialog HTML/CSS, inspirée de
la capture fournie par Nathan ; il ne reprend pas les dépendances Motion ou next-themes
du menu mobile Dao. Le placement initial des koï dans le viewport et l'aimantation des
articles mobiles sont propres à cette adaptation.

L'icône `public/icons/squares-four.svg` est le fichier fourni par Nathan, conservé sans
modification et utilisé comme masque CSS pour suivre la couleur du thème.

Les trois projets Lisière, Intervalle et Boussole sont entièrement fictifs.
Leurs visuels ont été générés avec l'outil intégré `image_gen`, puis encodés en WebP.
Les prompts et les chemins des fichiers sont consignés dans
[docs/portfolio-assets.md](docs/portfolio-assets.md).
