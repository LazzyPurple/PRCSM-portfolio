import Image from "next/image";

const HEADING = "mb-4 text-[20px] font-medium leading-[1.4] tracking-[-0.015em]";
const BODY = "text-[16px] leading-[1.7] text-[var(--muted-color)] [text-wrap:pretty]";
const SOURCE = "underline decoration-[var(--muted-color)] underline-offset-4 hover:decoration-current";
const STUDY = "https://www.em-consulte.com/article/1553340/le-parcours-de-soins-des-patients-migraineux-impac";
const screens = [
  {
    file: "resume", title: "Retrouver son suivi",
    alt: "Écran Résumé de Céphalée : fréquence des crises de la semaine et symptômes du mois.",
    caption: "Un résumé rassemble l’historique des crises et les symptômes fréquents pour préparer l’échange avec le praticien.",
  },
  {
    file: "intensite", title: "Décrire ce que l’on ressent",
    alt: "Écran de saisie de l’intensité : illustration expressive, niveau Intense et curseur de douleur.",
    caption: "La saisie de l’intensité associe un curseur, un mot et une illustration pour aider à exprimer sa douleur.",
  },
  {
    file: "rapport", title: "Structurer le rapport de crise",
    alt: "Rapport de crise : durée, intensité, localisation, médicaments, symptômes, déclencheurs et soulagements.",
    caption: "Les éléments d’une crise sont réunis dans un rapport : durée, localisation, traitements, symptômes et contexte.",
  },
  {
    file: "partage", title: "Choisir de partager",
    alt: "Écran de partage du rapport avec un médecin : période concernée, usages prévus et choix explicite du consentement.",
    caption: "Le partage identifie le destinataire, la période et l’usage prévu du rapport, puis demande un choix explicite au patient.",
  },
] as const;

export default function CephaleeCase() {
  return (
    <div className="mt-24 space-y-24">
      <section aria-labelledby="cephalee-context">
        <h2 id="cephalee-context" className={HEADING}>Un suivi à reconstruire entre deux consultations</h2>
        <p className={BODY}>Le point de départ est un parcours de soins difficile pour les personnes migraineuses. Une recherche participative menée avec CEMKA et La Voix des Migraineux en donne un aperçu dans ses premiers résultats de 2022.</p>
        <dl className="mt-8 grid gap-8 border-y border-[var(--muted-color)]/25 py-8 sm:grid-cols-3">
          <div><dt className="text-[36px] font-medium tracking-[-0.04em]">77 %</dt><dd className={`${BODY} mt-2 text-[14px]`}>décrivent leur parcours de soins comme un parcours du combattant.</dd></div>
          <div><dt className="text-[36px] font-medium tracking-[-0.04em]">74 %</dt><dd className={`${BODY} mt-2 text-[14px]`}>estiment les médecins insuffisamment informés sur la migraine.</dd></div>
          <div><dt className="text-[36px] font-medium tracking-[-0.04em]">79 %</dt><dd className={`${BODY} mt-2 text-[14px]`}>ont rarement ou jamais reçu de conseils utiles pour gérer leur migraine.</dd></div>
        </dl>
        <p className="mt-4 text-[12px] leading-[1.6] text-[var(--muted-color)]">Source : <a href={STUDY} className={SOURCE}>Debremaeker et al., premiers résultats publiés en 2022</a>, 300 participants à fin mars 2022. Le chiffre de 77,3 % est arrondi à 77 %. Ces données sont externes au sondage mené pour Céphalée.</p>
      </section>

      <section aria-labelledby="cephalee-research">
        <h2 id="cephalee-research" className={HEADING}>Confronter le constat aux usages</h2>
        <p className={BODY}>J’ai conduit un sondage auprès de la cible pour confronter ces constats à nos propres utilisateurs : démographie, diagnostic et attentes vis-à-vis d’un outil de suivi. En parallèle, j’ai mené un benchmark fonctionnel de Migraine Buddy, Apo et Manage My Pain.</p>
        <p className={`${BODY} mt-5`}>Ce travail a servi à distinguer les besoins de deux publics — les patients et les professionnels de santé — et à cadrer un périmètre pour chacun. J’ai ensuite dessiné les parcours et les écrans des deux interfaces, du rapport de crise au tableau de bord praticien.</p>
      </section>

      <section aria-labelledby="cephalee-decision">
        <p className="mb-4 font-mono text-[12px] text-[var(--muted-color)]">LA DÉCISION PRODUIT</p>
        <h2 id="cephalee-decision" className="max-w-[36rem] text-[28px] font-medium leading-[1.3] tracking-[-0.025em]">Deux interfaces, un même fil de suivi.</h2>
        <p className={`${BODY} mt-6`}>Dans le benchmark réalisé pour ce projet, le lien avec le soignant apparaissait comme le manque à adresser : enregistrer les crises ne suffisait pas à faire circuler une information utile en consultation.</p>
        <p className={`${BODY} mt-5`}>Nous avons donc fait évoluer le périmètre d’une application unique vers deux interfaces distinctes. La collaboration avec le médecin et le rattachement aux services de santé publics sont devenus des axes centraux du cadrage.</p>
        <div className="mt-8 grid gap-8 sm:grid-cols-2">
          <div><h3 className="mb-2 text-[16px] font-medium">Côté patient</h3><p className={BODY}>Consigner les crises, retrouver son historique et choisir de transmettre un rapport au praticien.</p></div>
          <div><h3 className="mb-2 text-[16px] font-medium">Côté professionnel de santé</h3><p className={BODY}>Consulter un suivi structuré dans une interface dédiée, pour disposer d’un support commun lors de l’échange avec le patient.</p></div>
        </div>
      </section>

      <section aria-labelledby="cephalee-screens">
        <h2 id="cephalee-screens" className={HEADING}>Du ressenti au rapport partagé</h2>
        <p className={BODY}>Quatre écrans du parcours patient. Les captures s’ouvrent en grand pour explorer les détails.</p>
        <div className="mt-8 grid gap-x-8 gap-y-12 sm:grid-cols-2">
          {screens.map(screen => (
            <figure key={screen.file}>
              <a href={`/projects/cephalee/${screen.file}.webp`} target="_blank" rel="noreferrer" aria-label={`${screen.title} — ouvrir la capture en grand (nouvel onglet)`} className="block rounded-[6px] focus-visible:outline-2 focus-visible:outline-offset-4">
                <Image src={`/projects/cephalee/${screen.file}.webp`} alt={screen.alt} width={1067} height={1600} sizes="(min-width: 1024px) 27rem, (min-width: 640px) 50vw, 100vw" className="block h-auto w-full rounded-[6px]" />
              </a>
              <figcaption className="mt-5"><h3 className="mb-2 text-[16px] font-medium">{screen.title}</h3><p className={`${BODY} text-[14px]`}>{screen.caption}</p></figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section aria-labelledby="cephalee-privacy">
        <h2 id="cephalee-privacy" className={HEADING}>Intégrer les données de santé au cadrage</h2>
        <p className={BODY}>J’ai également étudié le cadre réglementaire : RGPD, obligations françaises, formalités CNIL applicables et conditions d’un hébergement certifié HDS. Ces contraintes ont été étudiées au stade de la conception.</p>
        <p className="mt-4 text-[12px] leading-[1.6] text-[var(--muted-color)]">Repères : <a className={SOURCE} href="https://www.cnil.fr/fr/quelles-formalites-pour-les-traitements-de-donnees-de-sante">CNIL — formalités selon le traitement</a> · <a className={SOURCE} href="https://esante.gouv.fr/labels-certifications/hebergement-des-donnees-de-sante">Agence du Numérique en Santé — hébergement HDS</a>.</p>
      </section>
    </div>
  );
}
