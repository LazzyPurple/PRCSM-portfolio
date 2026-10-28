export const contact = {
  linkedin: "https://www.linkedin.com/in/nathan-toto/",
  github: "https://github.com/LazzyPurple",
  email: "nathan.toto@proton.me",
};

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
    slug: "groovenomad", name: "GrooveNomad", category: "Projet d’école · Voyage & musique",
    cover: { src: "/projects/groovenomad/cover.webp", width: 3840, height: 2880, position: "50% 40%" },
    label: "Projet d’école",
    note: "Projet collectif · Analyse de marché · Personas · Roadmap & KPI",
    alt: "Interface GrooveNomad : assistant de voyage personnalisé, navigation violette et illustration de festival sur un fond coloré.",
    description: "Imaginer un voyage au rythme de ses goûts musicaux.",
    problem: "GrooveNomad est un projet d’école mené en équipe. Nous avons imaginé un site de voyage pour les jeunes, qui combine musique, découverte et recommandations personnalisées par IA. Le travail relie analyse de marché, conception du service, automatisation et pilotage.",
  },
] as const;

export type Project = (typeof projects)[number];
