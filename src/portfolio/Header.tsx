import Link from "next/link";
import { contact } from "./content";
import ThemeToggle from "./ThemeToggle";

export default function Header({ overPond = false, overCover = false }: { overPond?: boolean; overCover?: boolean }) {
  return (
    <header className={`site-header ${overPond ? "over-pond" : ""} ${overCover ? "over-cover" : ""}`}>
      <nav aria-label="Navigation principale">
        <Link href="/#mare">La mare</Link>
        <Link href="/#projets">Mes projets</Link>
        <a href={contact.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn<span className="sr-only"> (nouvel onglet)</span></a>
        <a href={contact.github} target="_blank" rel="noopener noreferrer">GitHub<span className="sr-only"> (nouvel onglet)</span></a>
        <a className="contact-button" href={`mailto:${contact.email}`}>Contact</a>
        <ThemeToggle />
      </nav>
    </header>
  );
}
