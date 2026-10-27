# Pond

Portfolio : mare de koï procédurale, Next.js App Router et Three.js vanilla.

```powershell
npm install
npm run dev
```

Ouvrir http://127.0.0.1:3000.

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

Node 24+. Le compilateur TypeScript 7 et l'API TypeScript 6 utilisée par ESLint
cohabitent via les alias officiels npm. `tsc --version` doit afficher 7.0.2.

État actuel : phase 0, socle et dégradé de secours. La simulation et la mare 3D
ne sont pas encore portées. Voir [PLAN.md](PLAN.md) et [CREDITS.md](CREDITS.md).

Références locales, exclues de Git :

```powershell
git clone https://github.com/Dao-Ho/portfolio.git references/dao-portfolio
git -C references/dao-portfolio checkout 43a0ae45ae9b0cd1e1a00f322a02fac8fbb8fbf5
git clone https://github.com/mantrakp04/ardia.git references/ardia
git -C references/ardia checkout 0d16725fc0cc44ab0822d6f4719ea47b23cb76cf
```
