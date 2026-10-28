import Image from "next/image";
import KoiPond from "@/pond/KoiPond";
import { contact, projects } from "@/portfolio/content";

export default function Home() {
  return (
    <main>
      <a className="skip-link" href="#projets">Aller aux projets</a>
      <section id="mare" className="pond hero" data-pond-hero data-tone="day" aria-labelledby="intro-title">
        <KoiPond />
        <div className="hero-veil" aria-hidden="true" />
        <header className="site-header page-gutter">
          <a href="#mare" className="wordmark" aria-label="Nathan Toto, accueil">Nathan Toto<span>Product Owner</span></a>
          <nav aria-label="Navigation principale">
            <a href="#mare">La mare</a>
            <a href="#projets">Mes projets</a>
            <a href={contact.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn <span aria-hidden="true">↗</span><span className="sr-only"> (nouvel onglet)</span></a>
            <a href={contact.github} target="_blank" rel="noopener noreferrer">GitHub <span aria-hidden="true">↗</span><span className="sr-only"> (nouvel onglet)</span></a>
            <a className="contact-button" href={contact.email ? `mailto:${contact.email}` : "#contact"}>Contact <span aria-hidden="true">↗</span></a>
          </nav>
        </header>
        <div className="hero-copy page-gutter">
          <p className="eyebrow">Du besoin au produit</p>
          <h1 id="intro-title" className="display-title"><span>De l’idée</span><span>à l’usage.</span></h1>
          <div className="hero-description" data-koi-avoid>
            <p>Product Owner, je relie les besoins, les décisions et les équipes pour faire avancer des produits utiles.</p>
            <a className="text-link" href="#projets">Découvrir mes projets <span aria-hidden="true">↓</span></a>
          </div>
        </div>
        <div className="hero-bottom page-gutter" aria-hidden="true"><span>Les idées font leur chemin.</span><span>Au fil de l’eau ↓</span></div>
        <svg className="paper-edge" viewBox="0 0 1440 100" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 43 C28 38 42 49 74 42 C108 36 120 45 157 40 C202 35 224 48 265 43 C299 39 319 47 358 41 C398 35 420 44 460 39 C501 34 522 46 558 41 C601 36 623 48 666 42 C706 37 731 44 771 39 C810 34 839 45 875 41 C918 36 946 47 987 42 C1027 37 1053 43 1094 38 C1134 34 1161 45 1204 40 C1246 35 1272 47 1312 42 C1356 37 1397 46 1440 40 V100 H0Z" />
          <path className="edge-wisp" d="M0 36 C60 33 94 42 145 34 C195 30 245 41 290 35 C350 31 385 41 435 36 C490 29 533 39 580 33 C640 29 680 40 725 34 C785 31 820 42 870 35 C925 29 970 40 1015 32 C1070 29 1120 39 1160 34 C1220 30 1265 39 1305 33 C1360 29 1400 39 1440 34 V49 H0Z" />
        </svg>
      </section>

      <section id="projets" className="projects-section" aria-labelledby="projects-title">
        <div className="section-heading page-gutter">
          <div><p className="eyebrow">Une sélection à explorer</p><h2 id="projects-title">Mes projets<span className="project-count"> / 03</span></h2></div>
          <p className="demo-note">Pour l’instant, trois cas fictifs.<br />Des idées pour donner forme à cette page.</p>
        </div>
        <div className="project-gallery" tabIndex={0} role="region" aria-label="Galerie des projets, défilement horizontal sur grand écran">
          {projects.map((project, index) => (
            <article key={project.slug} id={project.slug} className="project">
              <div className={`project-image project-image-${project.slug}`}>
                <Image src={`/projects/${project.slug}.webp`} alt={project.alt} width={1536} height={1024}
                  sizes="(max-width: 800px) calc(100vw - 40px), (min-width: 1500px) 960px, 72vw" />
                <span className="image-caption">Concept fictif · {String(index + 1).padStart(2, "0")}</span>
              </div>
              <div className="project-heading"><h3>{project.name}</h3><span>{project.category}</span></div>
              <p className="project-description">{project.description}</p>
              <details name="project-case">
                <summary>Explorer le cas <span aria-hidden="true">+</span></summary>
                <div className="case-body">
                  <p className="case-note">Scénario de démonstration, sans résultat réel revendiqué.</p>
                  <h4>Le point de départ</h4><p>{project.problem}</p>
                  <h4>Le parti pris</h4><p>{project.approach}</p>
                  <h4>Ce qu’on chercherait à valider</h4><p>{project.validation}</p>
                </div>
              </details>
            </article>
          ))}
        </div>
        <p className="gallery-hint page-gutter">Trois pistes, trois façons d’aborder un besoin.<span>Faire défiler les projets <span aria-hidden="true">⟷</span></span></p>
      </section>

      <footer id="contact" className="contact-section page-gutter">
        <p className="eyebrow">La suite se construit ensemble</p>
        <h2>On en parle ?</h2>
        <div className="contact-row"><p>Une opportunité, une question,<br />ou simplement envie d’échanger.</p>
          {contact.email ? <a className="text-link" href={`mailto:${contact.email}`}>Écrivez-moi <span aria-hidden="true">↗</span></a> : <a className="text-link" href={contact.linkedin} target="_blank" rel="noopener noreferrer">Échangeons sur LinkedIn <span aria-hidden="true">↗</span><span className="sr-only"> (nouvel onglet)</span></a>}
        </div>
        <div className="footer-bottom"><span>Nathan Toto · Product Owner</span><a href="#mare">Retour à la mare ↑</a></div>
      </footer>
    </main>
  );
}
