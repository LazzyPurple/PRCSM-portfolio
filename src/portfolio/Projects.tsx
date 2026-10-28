"use client";

// Ported from Dao-Ho/portfolio src/app/projects/page.tsx. See CREDITS.md.
// Modified: scoped wheel handling releases the onepage at either end of the strip.
import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { projects, type Project } from "./content";
import { finishTransition, pushWithTransition, LAST_PROJECT_KEY } from "./navigation";

const GLIDE = 0.18;
const DESKTOP_QUERY = "(min-width: 1024px)";

export default function Projects() {
  useEffect(() => { finishTransition(); }, []);
  return (
    <>
      <div className="projects-mobile">
        <div>
          {projects.map((project, index) => (
            <article key={project.slug} className="mobile-project" data-project={project.slug}>
              {index === 0 && <ProjectHeading className="projects-mobile-heading" />}
              <Link href={`/projects/${project.slug}`} className="mobile-project-image relative w-full overflow-hidden rounded-2xl" aria-label={`Voir ${project.name}`}>
                <Image src={project.cover.src} alt={project.alt} fill sizes="100vw" className="object-cover" />
              </Link>
              <h3 className="mt-[5vw] mb-2 text-[21px]">{project.name}</h3>
              <p className="text-[17px] text-[var(--muted-color)]">{project.description}</p>
              <p className="mt-5 text-[14px] text-[var(--muted-color)]">{project.label}</p>
              <Link href={`/projects/${project.slug}`} className="mt-5 self-start rounded-full px-4 py-1 text-[15px]" style={{ background: "color-mix(in srgb, var(--foreground-color) 8%, transparent)" }}>Voir le projet →</Link>
            </article>
          ))}
        </div>
      </div>
      <DesktopStrip />
    </>
  );
}

function DesktopStrip() {
  const stripRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const desktop = window.matchMedia(DESKTOP_QUERY);
    try {
      const slug = sessionStorage.getItem(LAST_PROJECT_KEY);
      const last = [...strip.querySelectorAll<HTMLElement>("[data-slug]")].find(tile => tile.dataset.slug === slug);
      if (last) strip.scrollLeft += last.getBoundingClientRect().left - strip.getBoundingClientRect().left - parseFloat(getComputedStyle(strip).paddingLeft);
    } catch { /* Storage is optional for navigation. */ }
    let target = strip.scrollLeft;
    let raf = 0;
    const glide = () => {
      const gap = target - strip.scrollLeft;
      if (Math.abs(gap) <= 1) { strip.scrollLeft = target; raf = 0; return; }
      // Chrome rounds scrollLeft: a minimum pixel prevents an endless RAF near the target.
      strip.scrollLeft += Math.sign(gap) * Math.max(1, Math.abs(gap) * GLIDE);
      raf = requestAnimationFrame(glide);
    };
    const onWheel = (event: WheelEvent) => {
      if (!desktop.matches || event.ctrlKey) return;
      const section = strip.closest("section");
      if (!section || Math.abs(section.getBoundingClientRect().top) > 2) return;
      const sideways = Math.abs(event.deltaX) > Math.abs(event.deltaY);
      if (sideways && strip.contains(event.target as Node)) return;
      const delta = (sideways ? event.deltaX : event.deltaY) * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
      const max = strip.scrollWidth - strip.clientWidth;
      // Snap out of the strip explicitly; wheel latching can otherwise trap the page.
      if (!raf && (delta < 0 && strip.scrollLeft <= 1 || delta > 0 && strip.scrollLeft >= max - 1)) {
        const next = delta > 0 ? section.nextElementSibling : section.previousElementSibling;
        if (next instanceof HTMLElement) {
          event.preventDefault();
          next.scrollIntoView({ behavior: reduced.matches ? "instant" : "smooth" });
        }
        return;
      }
      event.preventDefault();
      if (!raf) target = strip.scrollLeft;
      target = Math.max(0, Math.min(max, target + delta));
      if (reduced.matches) { cancelAnimationFrame(raf); raf = 0; strip.scrollLeft = target; }
      else if (!raf) raf = requestAnimationFrame(glide);
    };
    const stopMotion = () => { if (reduced.matches) { cancelAnimationFrame(raf); raf = 0; strip.scrollLeft = target; } };
    reduced.addEventListener("change", stopMotion);
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => { cancelAnimationFrame(raf); window.removeEventListener("wheel", onWheel); reduced.removeEventListener("change", stopMotion); };
  }, []);
  return (
    <div className="projects-desktop">
      <ProjectHeading className="projects-heading" />
      <div ref={stripRef} className="dao-strip" tabIndex={0} role="region" aria-label="Projets, défilement horizontal">
        {projects.map(project => <StripTile key={project.slug} project={project} />)}
      </div>
    </div>
  );
}

function ProjectHeading({ className }: { className: string }) {
  return <div className={className}><h2>Mes projets</h2><p>Du besoin aux choix produit.</p></div>;
}

function StripTile({ project }: { project: Project }) {
  const router = useRouter();
  const href = `/projects/${project.slug}`;
  return (
    <Link href={href} aria-label={`Voir ${project.name}`} className="group block w-min shrink-0" onClick={event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
      event.preventDefault();
      pushWithTransition(router, href);
    }}>
      <div data-slug={project.slug} className="relative aspect-[3/2] h-[min(62svh,42rem)] overflow-hidden">
        <Image src={project.cover.src} alt={project.alt} fill sizes="(min-height: 1100px) 63rem, 93vh" className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]" />
        <span className="project-hover pointer-events-none absolute bottom-4 left-4 translate-y-1 rounded-full px-3 py-1.5 text-[12px] opacity-0 transition-[opacity,transform] duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:opacity-100">Voir le projet</span>
      </div>
      <div className="mt-3 flex items-baseline gap-3"><h3 className="whitespace-nowrap text-[15px]">{project.name}</h3><span className="whitespace-nowrap font-mono text-[12px] text-[var(--muted-color)]">{project.label}</span></div>
      <p className="mt-1 text-[14px] leading-[1.5] text-[var(--muted-color)]">{project.description}</p>
    </Link>
  );
}
