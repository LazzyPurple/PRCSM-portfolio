import Image from "next/image";

const HEADING = "mb-4 text-[20px] font-medium leading-[1.4] tracking-[-0.015em]";
const BODY = "text-[16px] leading-[1.7] text-[var(--muted-color)] [text-wrap:pretty]";
const slides = [
  {
    file: "fonctionnalites", width: 1987, height: 1102,
    title: "Du goût musical à une proposition de séjour",
    alt: "Périmètre GrooveNomad : assistance IA, parcours bilingue, recommandations de festivals via Spotify et circuits personnalisés.",
    caption: "Le périmètre envisagé associe un chatbot de recommandation, des devis PDF, un catalogue de festivals et des séjours combinant festival, hébergement et activités. Le parcours est pensé pour le mobile, en français et en anglais.",
  },
  {
    file: "automatisation", width: 1980, height: 1110,
    title: "Relier les étapes du service",
    alt: "Scénario d’automatisation Make présenté pour GrooveNomad : webhook, création d’un enregistrement Airtable, e-mail Gmail et contact Brevo.",
    caption: "La présentation montre un scénario Make reliant un webhook à Airtable, Gmail et Brevo. L’objectif : faire circuler l’information entre la demande, son enregistrement et les échanges avec le voyageur.",
  },
  {
    file: "dashboard", width: 1991, height: 1117,
    title: "Prévoir comment lire la performance",
    alt: "Tableau de bord du projet scolaire GrooveNomad : conversion des réservations, séjours acceptés ou annulés, évolution et répartition par ville.",
    caption: "Le tableau de bord présenté rassemble conversion, réservations, annulations et répartition des séjours. Un support pour illustrer le pilotage prévu dans le cadre du projet scolaire.",
  },
] as const;

export default function GrooveNomadCase() {
  return (
    <div className="mt-24 space-y-24">
      <section aria-labelledby="groovenomad-intent">
        <h2 id="groovenomad-intent" className={HEADING}>Faire de la musique le point de départ du voyage</h2>
        <p className={BODY}>Partir d’un festival, d’un style ou d’une envie pour construire une aventure sur mesure : c’est la proposition de GrooveNomad. Le site imaginé accompagne les jeunes dans la découverte de destinations et d’expériences qui correspondent à leurs goûts musicaux.</p>
        <p className={`${BODY} mt-5`}>L’IA intervient dans la recommandation et la composition du séjour. L’enjeu du projet était de relier cette promesse à un parcours compréhensible, puis à une organisation capable de traiter les demandes et de suivre l’activité.</p>
      </section>

      <section aria-labelledby="groovenomad-research">
        <h2 id="groovenomad-research" className={HEADING}>Cadrer le service avant les fonctionnalités</h2>
        <p className={BODY}>Nous avons réalisé une analyse de marché et construit trois personas pour préciser la cible. L’analyse de l’environnement a notamment exploré les contraintes budgétaires des jeunes, le voyage collectif, les usages de l’IA et les attentes autour du tourisme responsable.</p>
        <p className={`${BODY} mt-5`}>Ce cadrage a nourri le périmètre fonctionnel : personnalisation selon les préférences musicales, assistance conversationnelle et offres combinant plusieurs composantes du voyage. L’intégration Spotify faisait partie de la personnalisation envisagée.</p>
        <p className={`${BODY} mt-5`}>La réflexion couvrait aussi l’authentification, le consentement, l’export et la suppression des données, les conditions d’utilisation et de vente, ainsi que l’hébergement.</p>
      </section>

      <section aria-labelledby="groovenomad-work">
        <h2 id="groovenomad-work" className={HEADING}>De l’expérience au fonctionnement du service</h2>
        <p className={BODY}>Trois extraits de notre présentation pour montrer le lien entre le périmètre, l’automatisation et le pilotage. Les slides s’ouvrent en grand.</p>
        <div className="mt-8 space-y-16">
          {slides.map(slide => (
            <figure key={slide.file}>
              <a href={`/projects/groovenomad/${slide.file}.webp`} target="_blank" rel="noreferrer" aria-label={`${slide.title} : ouvrir la slide en grand (nouvel onglet)`} className="block rounded-[6px] focus-visible:outline-2 focus-visible:outline-offset-4">
                <Image src={`/projects/groovenomad/${slide.file}.webp`} alt={slide.alt} width={slide.width} height={slide.height} sizes="(min-width: 1024px) 56rem, 100vw" className="block h-auto w-full rounded-[6px]" />
              </a>
              <figcaption className="mt-5"><h3 className="mb-2 text-[16px] font-medium">{slide.title}</h3><p className={BODY}>{slide.caption}</p></figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section aria-labelledby="groovenomad-roadmap">
        <h2 id="groovenomad-roadmap" className={HEADING}>Donner un cap au développement</h2>
        <p className={BODY}>Nous avons construit une roadmap en trois phases pour donner une trajectoire au projet :</p>
        <ol className="mt-6 divide-y divide-[var(--muted-color)]/25 border-y border-[var(--muted-color)]/25">
          <li className="flex gap-5 py-5"><span aria-hidden="true" className="font-mono text-[13px] text-[var(--muted-color)]">01</span><h3 className="text-[16px] font-medium">Lancement</h3></li>
          <li className="flex gap-5 py-5"><span aria-hidden="true" className="font-mono text-[13px] text-[var(--muted-color)]">02</span><h3 className="text-[16px] font-medium">Croissance et structuration</h3></li>
          <li className="flex gap-5 py-5"><span aria-hidden="true" className="font-mono text-[13px] text-[var(--muted-color)]">03</span><h3 className="text-[16px] font-medium">Expansion et leadership</h3></li>
        </ol>
        <p className={`${BODY} mt-6`}>Des KPI ont également été définis pour mesurer la performance. Avec la roadmap et les tableaux de bord, ils donnent une base au suivi et aux décisions, au-delà de la seule présentation de l’interface.</p>
      </section>
    </div>
  );
}
