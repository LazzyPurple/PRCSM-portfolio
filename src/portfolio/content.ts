export const contact = {
  linkedin: "https://www.linkedin.com/in/nathan-toto/",
  github: "https://github.com/LazzyPurple",
  email: "nathan.toto@proton.me",
};

// The remaining fictional cases will be replaced with Mousse and CareerOS.
export const projects = [
  {
    slug: "cephalee", name: "Céphalée", category: "Santé · Application mobile & interface praticien",
    cover: { src: "/projects/cephalee/cover.webp", width: 1600, height: 1067 },
    label: "Cadrage & conception",
    note: "Recherche utilisateur · Benchmark · Périmètre produit · Parcours & écrans",
    alt: "Céphalée : un téléphone posé sur un bureau ensoleillé présente l’accueil de l’application et sa mascotte violette.",
    description: "Du journal de crises au dialogue avec le praticien.",
    problem: "Céphalée permet de consigner ses maux de tête pour en partager le suivi avec son praticien. J’ai travaillé sur la recherche utilisateur, le cadrage fonctionnel et la conception des parcours, avec une décision centrale : penser ensemble l’expérience du patient et celle du professionnel de santé.",
  },
  {
    slug: "intervalle", name: "Intervalle", category: "Services · Réservation",
    cover: { src: "/projects/intervalle.webp", width: 1536, height: 1024 },
    label: "Concept fictif",
    note: "Concept fictif · scénario de démonstration, sans résultat réel revendiqué.",
    alt: "Concept d’un calendrier de réservation d’ateliers, dans une composition lilas et terre cuite.",
    description: "Passer de « j’aimerais essayer » à son premier atelier créatif, sans détour.",
    problem: "Entre les horaires, les places disponibles et le niveau attendu, réserver un atelier peut devenir plus compliqué que prévu. Ce cas fictif part de cette hésitation.",
    approach: "Cartographier le parcours avec les participants et les animateurs, puis construire un premier périmètre centré sur la disponibilité, le bon niveau et une réservation explicite.",
    validation: "Observer des réservations sur prototype, vérifier la compréhension des conditions et confronter le parcours aux contraintes réelles des animateurs avant d’élargir le service.",
  },
  {
    slug: "boussole", name: "Boussole", category: "Équipes produit · Outil collaboratif",
    cover: { src: "/projects/boussole.webp", width: 1536, height: 1024 },
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
