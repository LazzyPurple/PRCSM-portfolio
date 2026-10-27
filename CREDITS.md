# Crédits

## Koï — Dao Ho

Simulation à adapter de [Dao Ho](https://www.daoho.dev/),
[Twitter / X : @daoho04](https://x.com/daoho04),
[dépôt Dao-Ho/portfolio](https://github.com/Dao-Ho/portfolio).

Référence : commit `43a0ae45ae9b0cd1e1a00f322a02fac8fbb8fbf5`.
Le compte X est celui lié par `src/app/components/front-page.tsx` dans ce dépôt.

L'autorisation publique de reproduction est rapportée par le commanditaire.
Le lien du tweet n'a pas été retrouvé et n'est pas disponible auprès du commanditaire.
Cette mention ne constitue pas une vérification indépendante de cette autorisation.
Le dépôt consulté ne contient pas de licence générale explicite pour ces fichiers.

Portages Dao : `world.ts`, `shape.ts`, `markings.ts` et les règles de moteur sont présents depuis la phase 1. Le maillage reste prévu pour la phase 2.

| Source dans `src/app/components/koi-pond/` | Destination |
| --- | --- |
| `world.ts` | `src/pond/sim/world.ts` |
| `shape.ts` | `src/pond/sim/shape.ts` |
| `renderer.ts`, fonction `koiMarkings()` et types associés | `src/pond/sim/markings.ts` |
| `koi-pond.tsx`, règles de boucle et d'interaction | `src/pond/engine.ts` et `src/pond/KoiPond.tsx` |
| `renderer.ts`, onde corporelle et ouverture des nageoires | `src/pond/scene/koiMesh.ts` |

Le rendu ASCII, ses palettes, les images, les polices et les analytics ne seront pas repris.

## Peinture — Ardia

Passes de rendu, peinture fraîche et budget GPU à adapter de
[mantrakp04/ardia](https://github.com/mantrakp04/ardia),
Copyright 2026 Mantra Patel, sous Apache-2.0.

Référence : commit `0d16725fc0cc44ab0822d6f4719ea47b23cb76cf`.
Voir [licence Apache-2.0](licenses/ardia-APACHE-2.0.txt) et
[NOTICE original conservé](licenses/ardia-NOTICE.txt).

Le `NOTICE` à la racine couvre les propres sources d'Ardia sous Apache-2.0 ;
`apps/site` en fait partie et ne contient pas de licence contradictoire.
La GPL-3.0 de l'application distribuée avec son moteur ne doit pas être confondue
avec la licence de ces sources du site.

Portages prévus (aucun encore effectué à la phase 0) :

| Source dans `apps/site/src/scripts/meadow/` | Destination |
| --- | --- |
| `shaders.ts`, helpers de bruit et `encodeFlow()` | `src/pond/paint/common.glsl.ts` |
| `shaders.ts`, `PAINT_FS` | `src/pond/paint/paintPass.ts` |
| `shaders.ts`, `STROKE_CELLS`, `CELL_FS`, `FINAL_FS` | `src/pond/paint/strokePass.ts` |
| `smear.ts`, `WetPaint` | `src/pond/paint/wetPaint.ts` |
| `budget.ts`, `GpuClock`, `Scaler` | `src/pond/paint/budget.ts` |
| `scene.ts`, `pickTier()` et formule du budget de pixels | `src/pond/paint/budget.ts` |
| `boot.ts`, principe de démarrage après affichage | `src/pond/KoiPond.tsx` |

Chaque fichier effectivement porté recevra un en-tête avec le chemin d'origine,
le dépôt, le copyright, Apache-2.0 et une mention des modifications.
Les images, textures, palettes, modèles de terrain, personnages et analytics d'Ardia
ne seront pas repris. La palette de cette mare et ses éléments visuels sont propres au projet.
