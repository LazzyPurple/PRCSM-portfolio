# Pond

Portfolio : mare de koï procédurale, Next.js App Router et Three.js vanilla.

```powershell
npm ci
npm run dev
```

Ouvrir http://127.0.0.1:3000.

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

Node 24 (voir `.node-version`). Le compilateur TypeScript 7 et l'API TypeScript 6 utilisée par ESLint
cohabitent via les alias officiels npm. `tsc --version` doit afficher 7.0.2.

La page affiche la mare en gouache. Bouger lentement le pointeur attire les koï ;
un geste brusque les effraie ; cliquer ou toucher l'eau lance des granulés.
Le contenu HTML superposé peut porter `data-koi-avoid`.
Toutes les couleurs sont dans `src/pond/palette.ts`.

En développement, ouvrir `http://127.0.0.1:3000/?debug` pour les vues intermédiaires,
la simulation 2D, les statistiques, l'heure et la pause. Le panneau et sa référence de
diagnostic sont retirés du bundle de production.

Validation Chrome isolée (Chrome Windows installé, aucun profil personnel utilisé) :

```powershell
node scripts/validate.mjs http://127.0.0.1:3000 dev
npm run build
npm run start -- --port 3001
node scripts/validate.mjs http://127.0.0.1:3001 prod
```

Les captures, la trace Chrome Performance et le profil d'allocations sont écrits sous
`artifacts/` (ignoré par Git). Les chiffres et limites sont dans [PERFORMANCE.md](PERFORMANCE.md).
Le script suppose Chrome Windows ; la variable `CHROME` permet un autre chemin.

Voir [PLAN.md](PLAN.md), [PROGRESS.md](PROGRESS.md) et [CREDITS.md](CREDITS.md).

## Hébergement Netlify

Le projet contient `netlify.toml` : commande `npm run build`, répertoire publié
`.next`, Node 24 via `.node-version`. Netlify détecte Next.js et installe son
adaptateur automatiquement. Aucune variable d'environnement n'est nécessaire pour
le portfolio actuel. Les images restent optimisées par `next/image`.

Pour relier le dépôt Git et lancer le premier déploiement, suivre
[le guide Netlify](docs/deploy-netlify.md).

Références locales, exclues de Git :

```powershell
git clone https://github.com/Dao-Ho/portfolio.git references/dao-portfolio
git -C references/dao-portfolio checkout 43a0ae45ae9b0cd1e1a00f322a02fac8fbb8fbf5
git clone https://github.com/mantrakp04/ardia.git references/ardia
git -C references/ardia checkout 0d16725fc0cc44ab0822d6f4719ea47b23cb76cf
```
