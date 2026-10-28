# Héberger le portfolio sur Netlify

Configuration préparée pour Next.js 16.4.3, vérifiée dans la documentation officielle
le 28 octobre 2026. Le déploiement utilise l'adaptateur Next.js automatique de Netlify,
avec App Router et optimisation des images. Le moteur Three.js reste chargé dans le
navigateur après le premier affichage.

## Paramètres du dépôt

| Paramètre | Valeur |
| --- | --- |
| Répertoire de base | Racine du dépôt |
| Commande de build | `npm run build` |
| Répertoire publié | `.next` |
| Node.js | `24`, indiqué dans `.node-version` |
| Gestionnaire de dépendances | npm, avec `package-lock.json` versionné |
| Variables d'environnement requises | Aucune pour le site actuel |

`netlify.toml` porte les paramètres de build. Aucun plugin Netlify à installer ou
à figer manuellement : la plateforme ajoute son adaptateur à la détection de Next.js.
Conserver les dépendances de développement pendant l'installation : Tailwind et
TypeScript sont nécessaires au build. Ne pas forcer `NODE_ENV=production` dans les
paramètres d'installation.

## Premier déploiement

1. Depuis le tableau de bord Netlify, créer un projet en important un dépôt GitHub.
2. Sélectionner [LazzyPurple/PRCSM-portfolio](https://github.com/LazzyPurple/PRCSM-portfolio).
3. Choisir la branche `main`, puis vérifier les valeurs du tableau ci-dessus.
4. Lancer le déploiement. Le journal doit montrer le build Next.js et l'adaptateur Netlify.
5. Ouvrir l'URL attribuée au site, puis relier un domaine si souhaité.

Les mises à jour de la branche choisie déclencheront ensuite les builds Netlify.
L'import Git est le parcours prévu : ne pas déposer simplement `.next` dans un
upload de site statique. Le routage App Router et `next/image` utilisent l'adaptateur.
Ne pas ajouter de redirection SPA globale vers `index.html`.

## Vérification après le premier déploiement

- Ouvrir directement `/`, `/projects/cephalee`, `/projects/mousse` et `/projects/groovenomad`, puis recharger chaque URL.
- Vérifier la mare, le chargement des affiches, les images des projets, les grands formats et les liens précédent/suivant.
- Tester le menu mobile, le retour à la sélection, les liens LinkedIn/GitHub/contact et le choix du thème.
- Vérifier qu'une URL inconnue donne une 404. Le panneau `?debug` est réservé au développement.

Le build Next.js et son serveur de production sont contrôlés localement. La validation
sur l'infrastructure Netlify et son CDN reste à faire après connexion du dépôt et
premier déploiement. Aucun site n'est créé et aucun contenu n'est publié par cette préparation.

## Sources officielles

- [Next.js sur Netlify : adaptateur automatique, App Router et Image CDN](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/)
- [OpenNext pour Netlify : commande de build et répertoire publié](https://opennext.js.org/netlify)
- [Netlify : sélection de Node.js et installation des dépendances](https://docs.netlify.com/build/configure-builds/manage-dependencies/)
