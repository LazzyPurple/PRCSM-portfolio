import KoiPond from "@/pond/KoiPond";
import Header from "@/portfolio/Header";
import Projects from "@/portfolio/Projects";
import { contact } from "@/portfolio/content";

export default function Home() {
  return (
    <main className="snap-page">
      <a className="skip-link" href="#projets">Aller aux projets</a>
      <Header overPond />
      <section id="mare" className="hero snap-section" aria-labelledby="intro-title">
        <div className="pond pond-stage"><KoiPond /></div>
        <div className="hero-copy" data-koi-avoid>
          <p className="eyebrow">Product Owner · imagination &amp; intention</p>
          <h1 id="intro-title">Hi, I’m<br /><strong>Nathan TOTO</strong></h1>
          <p className="hero-description">Product Owner, je laisse la créativité faire des ricochets, puis je donne aux idées un cap.</p>
          <a className="text-link" href="#projets">Mes projets <span aria-hidden="true">↓</span></a>
        </div>
      </section>

      <section id="projets" className="projects-section snap-section" aria-label="Mes projets">
        <div className="project-surface" aria-hidden="true" />
        <svg className="paper-edge" viewBox="0 0 1440 100" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 43 C28 38 42 49 74 42 C108 36 120 45 157 40 C202 35 224 48 265 43 C299 39 319 47 358 41 C398 35 420 44 460 39 C501 34 522 46 558 41 C601 36 623 48 666 42 C706 37 731 44 771 39 C810 34 839 45 875 41 C918 36 946 47 987 42 C1027 37 1053 43 1094 38 C1134 34 1161 45 1204 40 C1246 35 1272 47 1312 42 C1356 37 1397 46 1440 40 V100 H0Z" />
          <path className="edge-wisp" d="M0 36 C60 33 94 42 145 34 C195 30 245 41 290 35 C350 31 385 41 435 36 C490 29 533 39 580 33 C640 29 680 40 725 34 C785 31 820 42 870 35 C925 29 970 40 1015 32 C1070 29 1120 39 1160 34 C1220 30 1265 39 1305 33 C1360 29 1400 39 1440 34 V49 H0Z" />
        </svg>
        <Projects />
      </section>

      <footer id="contact" className="contact-section snap-section">
        <div className="contact-copy">
          <p className="eyebrow">La suite se construit ensemble</p>
          <h2>On en parle ?</h2>
          <p>Une opportunité, une question,<br />ou simplement envie d’échanger.</p>
          <a className="text-link" href={`mailto:${contact.email}`}>Écrivez-moi <span aria-hidden="true">↗</span></a>
        </div>
        <div className="footer-bottom"><span>Nathan Toto · Product Owner</span><a href="#mare">Retour à la mare ↑</a></div>
      </footer>
    </main>
  );
}
