export const contact = {
  linkedin: "https://www.linkedin.com/in/nathan-toto/",
  github: "https://github.com/LazzyPurple",
  email: "nathan.toto@proton.me",
};

// Fictional cases only; the real selection will be Mousse, Céphalée and CareerOS.
export const projects = [
  {
    slug: "lisiere", name: "Lisière", category: "Mobilité · Application mobile",
    alt: "Concept d’une application de trajets à vélo, sur un téléphone sauge avec une carte épurée.",
    description: "Trouver un trajet à vélo qui donne envie de laisser la voiture au garage.",
    problem: "Le chemin le plus court n’est pas toujours celui que l’on a envie de prendre. Ce scénario imagine un service pour les cyclistes du quotidien qui privilégient le calme et la simplicité.",
    approach: "Commencer par les critères de choix d’un trajet, puis tester un parcours réduit à trois décisions : la destination, le niveau de confort et le départ. Prioriser la confiance plutôt que multiplier les options.",
    validation: "Des entretiens et un prototype permettraient de vérifier si les critères proposés aident vraiment à choisir un trajet, et où l’information manque encore.",
  },
  {
    slug: "intervalle", name: "Intervalle", category: "Services · Réservation",
    alt: "Concept d’un calendrier de réservation d’ateliers, dans une composition lilas et terre cuite.",
    description: "Passer de « j’aimerais essayer » à son premier atelier créatif, sans détour.",
    problem: "Entre les horaires, les places disponibles et le niveau attendu, réserver un atelier peut devenir plus compliqué que prévu. Ce cas fictif part de cette hésitation.",
    approach: "Cartographier le parcours avec les participants et les animateurs, puis construire un premier périmètre centré sur la disponibilité, le bon niveau et une réservation explicite.",
    validation: "Observer des réservations sur prototype, vérifier la compréhension des conditions et confronter le parcours aux contraintes réelles des animateurs avant d’élargir le service.",
  },
  {
    slug: "boussole", name: "Boussole", category: "Équipes produit · Outil collaboratif",
    alt: "Concept d’une feuille de route produit, avec des cartes crème, corail et ambre sur un fond vert profond.",
    description: "Partager les raisons d’une priorité, pas seulement sa place dans le backlog.",
    problem: "Une liste ordonnée ne raconte pas les arbitrages qui l’ont construite. Ce scénario explore un espace commun pour rendre les décisions produit compréhensibles.",
    approach: "Relier chaque sujet à un besoin, une hypothèse et une décision. Tester d’abord un rituel de priorisation avec une équipe avant d’en faire un outil plus ambitieux.",
    validation: "Vérifier que l’équipe peut expliquer les priorités et leurs compromis, puis ajuster les informations affichées pour éviter de créer une nouvelle charge de documentation.",
  },
] as const;
