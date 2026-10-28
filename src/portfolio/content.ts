export const contact = {
  linkedin: "https://www.linkedin.com/in/nathan-toto/",
  github: "https://github.com/LazzyPurple",
  email: "nathan.toto@proton.me",
};

// The remaining fictional case will be replaced with CareerOS.
export const projects = [
  {
    slug: "cephalee", name: "Céphalée", category: "Santé · Application mobile & interface praticien",
    cover: { src: "/projects/cephalee/cover.webp", width: 1600, height: 1067, position: "78% 35%" },
    label: "Cadrage & conception",
    note: "Recherche utilisateur · Benchmark · Périmètre produit · Parcours & écrans",
    alt: "Céphalée : un téléphone posé sur un bureau ensoleillé présente l’accueil de l’application et sa mascotte violette.",
    description: "Du journal de crises au dialogue avec le praticien.",
    problem: "Céphalée permet de consigner ses maux de tête pour en partager le suivi avec son praticien. J’ai travaillé sur la recherche utilisateur, le cadrage fonctionnel et la conception des parcours, avec une décision centrale : penser ensemble l’expérience du patient et celle du professionnel de santé.",
  },
  {
    slug: "mousse", name: "Mousse", category: "Projet personnel · Assistant IA sur Mac",
    cover: { src: "/projects/mousse/encoche.webp", width: 3840, height: 2880, position: "50% 40%" },
    label: "Projet personnel",
    note: "IA locale · Compagnon dans l’encoche · Utilisé au quotidien",
    alt: "Composition des trois formats de Mousse dans l’encoche : mascotte, commandes musicales et tableau de bord sur un fond abstrait.",
    description: "Un compagnon IA local, à portée d’encoche.",
    problem: "Mousse est un projet personnel que j’utilise au quotidien comme assistant IA sur Mac. Il vit dans l’encoche de l’écran et rassemble la conversation, la navigation web, les actions sur l’ordinateur et les outils qui m’aident à organiser ma journée.",
  },
  {
    slug: "boussole", name: "Boussole", category: "Équipes produit · Outil collaboratif",
    cover: { src: "/projects/boussole.webp", width: 1536, height: 1024, position: "78% 35%" },
    label: "Concept fictif",
    note: "Concept fictif · scénario de démonstration, sans résultat réel revendiqué.",
    alt: "Concept d’une feuille de route produit, avec des cartes crème, corail et ambre sur un fond vert profond.",
    description: "Partager les raisons d’une priorité, pas seulement sa place dans le backlog.",
    problem: "Une liste ordonnée ne raconte pas les arbitrages qui l’ont construite. Ce scénario explore un espace commun pour rendre les décisions produit compréhensibles.",
    approach: "Relier chaque sujet à un besoin, une hypothèse et une décision. Tester d’abord un rituel de priorisation avec une équipe avant d’en faire un outil plus ambitieux.",
    validation: "Vérifier que l’équipe peut expliquer les priorités et leurs compromis, puis ajuster les informations affichées pour éviter de créer une nouvelle charge de documentation.",
  },
] as const;

export type Project = (typeof projects)[number];
