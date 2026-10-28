import Image from "next/image";

const HEADING = "mb-4 text-[20px] font-medium leading-[1.4] tracking-[-0.015em]";
const BODY = "text-[16px] leading-[1.7] text-[var(--muted-color)] [text-wrap:pretty]";
const uses = [
  {
    file: "journee", title: "Organiser ma journée",
    alt: "Mousse déployé depuis l’encoche d’un MacBook : météo, semaine, concentration, rappels et habitudes dans la vue Aujourd’hui.",
    caption: "Rappels, habitudes et widgets se retrouvent dans une interface complète. La vue Aujourd’hui rassemble les informations utiles pour garder le fil de ma journée.",
  },
  {
    file: "conversation", title: "Passer de la conversation à l’action",
    alt: "Mousse en mode discret sur un écran de bureau, avec sa mascotte dans l’encoche et un échange demandant le résumé de la journée.",
    caption: "Je peux demander à Mousse de résumer ma journée, de naviguer sur Internet ou de réaliser des actions sur l’ordinateur. L’assistant reste accessible depuis le bureau.",
  },
  {
    file: "second-brain", title: "Garder un fil entre mes idées",
    alt: "Espace Second brain de Mousse sur un MacBook : idées reliées dans un graphe et note ouverte à côté.",
    caption: "Mousse me sert aussi de second brain : un espace pour rassembler mes idées, garder leurs liens et retrouver le contexte d’une note.",
  },
] as const;

export default function MousseCase() {
  return (
    <div className="mt-24 space-y-24">
      <section aria-labelledby="mousse-personal">
        <h2 id="mousse-personal" className={HEADING}>Un projet qui part de mon quotidien</h2>
        <p className={BODY}>Mousse est d’abord un compagnon que je construis pour moi et dont je me sers chaque jour. Il me permet de réunir l’aide d’une IA, mes rappels, mes habitudes et mes idées dans un même endroit, directement sur mon ordinateur.</p>
        <p className={`${BODY} mt-5`}>L’encoche devient son point d’attache : une présence discrète lorsque je travaille, qui peut s’ouvrir sur un contrôle rapide ou une interface plus complète selon ce dont j’ai besoin.</p>
      </section>

      <section aria-labelledby="mousse-notch">
        <h2 id="mousse-notch" className={HEADING}>Une présence qui s’adapte au moment</h2>
        <p className={BODY}>La mascotte, les commandes musicales et le tableau de bord occupent différents formats autour de l’encoche. L’idée est de garder Mousse à portée de main, tout en laissant de la place à ce que je suis en train de faire.</p>
        <figure className="mt-8">
          <a href="/projects/mousse/encoche.webp" target="_blank" rel="noreferrer" aria-label="Les formats de Mousse : ouvrir le visuel en grand (nouvel onglet)" className="block rounded-[6px] focus-visible:outline-2 focus-visible:outline-offset-4">
            <Image src="/projects/mousse/encoche.webp" alt="Trois formats de Mousse autour de l’encoche : mascotte compacte, commandes musicales et tableau de bord étendu." width={3840} height={2880} sizes="(min-width: 1024px) 56rem, 100vw" className="block h-auto w-full rounded-[6px]" />
          </a>
          <figcaption className={`${BODY} mt-4 text-[14px]`}>D’une petite présence dans l’encoche à un espace complet pour le quotidien.</figcaption>
        </figure>
      </section>

      <section aria-labelledby="mousse-local">
        <h2 id="mousse-local" className={HEADING}>Une IA qui tourne sur mon ordinateur</h2>
        <p className={BODY}>Mousse embarque un modèle Gemma exécuté localement. Selon la configuration, il peut aller de Gemma E4B pour les machines les plus modestes à Gemma 12B pour les plus puissantes.</p>
        <p className={`${BODY} mt-5`}>Ce compagnon polyvalent fait le lien entre la conversation et les outils du quotidien : chercher une information sur le Web, agir sur l’ordinateur ou retrouver ce que j’ai prévu dans ma journée.</p>
      </section>

      <section aria-labelledby="mousse-uses">
        <h2 id="mousse-uses" className={HEADING}>Trois façons de l’utiliser au quotidien</h2>
        <p className={BODY}>Organiser, échanger et garder une trace. Les visuels s’ouvrent en grand pour explorer les interfaces.</p>
        <div className="mt-8 space-y-16">
          {uses.map(use => (
            <figure key={use.file}>
              <a href={`/projects/mousse/${use.file}.webp`} target="_blank" rel="noreferrer" aria-label={`${use.title} : ouvrir le visuel en grand (nouvel onglet)`} className="block rounded-[6px] focus-visible:outline-2 focus-visible:outline-offset-4">
                <Image src={`/projects/mousse/${use.file}.webp`} alt={use.alt} width={1600} height={1067} sizes="(min-width: 1024px) 56rem, 100vw" className="block h-auto w-full rounded-[6px]" />
              </a>
              <figcaption className="mt-5"><h3 className="mb-2 text-[16px] font-medium">{use.title}</h3><p className={BODY}>{use.caption}</p></figcaption>
            </figure>
          ))}
        </div>
      </section>
    </div>
  );
}
