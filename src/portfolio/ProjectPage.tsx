"use client";

// Ported from Dao-Ho/portfolio src/app/projects/[slug]/project-page.tsx. See CREDITS.md.
// Modified: local case studies, local assets and native transitions instead of Motion.
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Header from "./Header";
import { projects, type Project } from "./content";
import { finishTransition, pushWithTransition, LAST_PROJECT_KEY } from "./navigation";

const FRAME = "mx-auto w-full max-w-[56rem]";
const BODY = "text-[16px] leading-[1.7] [text-wrap:pretty]";
const MUTED = "text-[var(--muted-color)]";
const GLIDE = 0.18;
const CARD_GAP = 18;
const CARD_FOLLOW = 0.25;

export default function ProjectPage({ project, children }: { project: Project; children?: ReactNode }) {
  const router = useRouter();
  const coverRef = useRef<HTMLDivElement>(null);
  const [overCover, setOverCover] = useState(true);
  useEffect(() => {
    finishTransition();
    try { sessionStorage.setItem(LAST_PROJECT_KEY, project.slug); } catch { /* Navigation works without storage. */ }
  }, [project.slug]);

  useEffect(() => {
    const update = () => setOverCover((coverRef.current?.getBoundingClientRect().bottom ?? 0) > 56);
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => { window.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, []);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let target = window.scrollY;
    let raf = 0;
    const to = (top: number) => window.scrollTo({ top, behavior: "instant" });
    const glide = () => {
      const gap = target - window.scrollY;
      if (Math.abs(gap) < 1) { to(target); raf = 0; return; }
      to(window.scrollY + Math.sign(gap) * Math.max(1, Math.abs(gap) * GLIDE));
      raf = requestAnimationFrame(glide);
    };
    const onWheel = (event: WheelEvent) => {
      if (reduced.matches || event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      event.preventDefault();
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (!raf) target = window.scrollY;
      target = Math.max(0, Math.min(max, target + event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1)));
      if (!raf) raf = requestAnimationFrame(glide);
    };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };
    reduced.addEventListener("change", stop);
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => { stop(); window.removeEventListener("wheel", onWheel); reduced.removeEventListener("change", stop); };
  }, []);

  const at = projects.findIndex(item => item.slug === project.slug);
  const prev = projects[(at - 1 + projects.length) % projects.length];
  const next = projects[(at + 1) % projects.length];
  return (
    <div className="project-page min-h-screen w-full">
      <Header overCover={overCover} />
      <a className="skip-link" href="#project-content">Aller au projet</a>
      <div className="pt-20 lg:pt-0">
        <div ref={coverRef} className="relative h-[clamp(180px,26vw,440px)] w-full overflow-hidden">
          <Image src={project.cover.src} alt="" fill preload sizes="100vw" className="object-cover" style={{ objectPosition: project.cover.position }} />
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-[linear-gradient(to_bottom,transparent,var(--background-color))]" />
        </div>
      </div>
      <main id="project-content" className={`${FRAME} px-6 pb-40 pt-10 lg:box-content lg:pt-14`}>
        <header>
          <Link href="/#projets" className={`text-[14px] ${MUTED} hover:text-[var(--foreground-color)]`} onClick={event => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
            event.preventDefault(); pushWithTransition(router, "/#projets", "back");
          }}>← Mes projets</Link>
          <h1 className="mt-10 text-[28px] font-medium leading-[1.2] tracking-[-0.015em]">{project.name}</h1>
          <p className={`mt-1 text-[16px] ${MUTED}`}>{project.description}</p>
          <p className={`${BODY} mt-8`}>{project.problem}</p>
          <p className={`mt-4 text-[13px] ${MUTED}`}>{project.note}</p>
        </header>
        <div className="mt-16">
          <Image src={project.cover.src} alt={project.alt} width={project.cover.width} height={project.cover.height} sizes="(min-width: 1024px) 56rem, 100vw" className="block h-auto w-full rounded-[6px]" />
        </div>
        {children ?? ("approach" in project && <div className="mt-24 flex flex-col">
          <h2 className="mb-3 text-[16px] font-medium leading-[1.6]">Le parti pris</h2>
          <p className={`${BODY} ${MUTED}`}>{project.approach}</p>
          <h2 className="mt-16 mb-3 text-[16px] font-medium leading-[1.6]">Ce qu’on chercherait à valider</h2>
          <p className={`${BODY} ${MUTED}`}>{project.validation}</p>
        </div>)}
        <nav aria-label="Autres projets" className="project-pager mt-24 flex items-start justify-between gap-6 pt-6">
          <PagerLink project={prev} direction="back" />
          <PagerLink project={next} direction="forward" />
        </nav>
      </main>
    </div>
  );
}

function PagerLink({ project, direction }: { project: Project; direction: "back" | "forward" }) {
  const router = useRouter();
  const cardRef = useRef<HTMLSpanElement>(null);
  const follow = useRef({ x: 0, y: 0, tx: 0, ty: 0, raf: 0 });
  const back = direction === "back";
  useEffect(() => {
    const position = follow.current;
    return () => cancelAnimationFrame(position.raf);
  }, []);
  const aim = (x: number, y: number) => {
    const card = cardRef.current;
    if (!card) return;
    const f = follow.current;
    f.tx = Math.max(12, Math.min(innerWidth - card.offsetWidth - 12, x - card.offsetWidth / 2));
    f.ty = Math.max(12, Math.min(innerHeight - card.offsetHeight - 12, y - card.offsetHeight - CARD_GAP < 12 ? y + CARD_GAP : y - card.offsetHeight - CARD_GAP));
  };
  const place = () => { const f = follow.current; cardRef.current?.style.setProperty("transform", `translate3d(${f.x}px,${f.y}px,0)`); };
  const step = () => {
    const f = follow.current;
    f.x += (f.tx - f.x) * CARD_FOLLOW; f.y += (f.ty - f.y) * CARD_FOLLOW;
    place();
    f.raf = Math.abs(f.tx - f.x) + Math.abs(f.ty - f.y) > 0.5 ? requestAnimationFrame(step) : 0;
  };
  const settle = (x: number, y: number) => {
    aim(x, y); const f = follow.current;
    cancelAnimationFrame(f.raf); f.raf = 0;
    f.x = f.tx; f.y = f.ty; place();
  };
  return (
    <Link href={`/projects/${project.slug}`} className={`group relative flex flex-col gap-1 ${back ? "items-start" : "items-end text-right"}`}
      onClick={event => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
        event.preventDefault(); pushWithTransition(router, `/projects/${project.slug}`, direction);
      }}
      onPointerEnter={event => { if (event.pointerType !== "touch") settle(event.clientX, event.clientY); }}
      onPointerMove={event => {
        if (event.pointerType === "touch") return;
        aim(event.clientX, event.clientY);
        if (matchMedia("(prefers-reduced-motion: reduce)").matches) settle(event.clientX, event.clientY);
        else if (!follow.current.raf) follow.current.raf = requestAnimationFrame(step);
      }}
      onFocus={event => { const rect = event.currentTarget.getBoundingClientRect(); settle(rect.left + rect.width / 2, rect.top); }}>
      <span className={`font-mono text-[12px] ${MUTED}`}>{back ? "précédent" : "suivant"}</span>
      <span className="text-[16px] underline-offset-4 group-hover:underline group-focus-visible:underline">{back ? `← ${project.name}` : `${project.name} →`}</span>
      <span ref={cardRef} aria-hidden="true" className="pager-preview pointer-events-none fixed left-0 top-0 z-50 w-[17rem] rounded-[8px] p-2 text-left opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
        <span className="relative block aspect-[3/2] overflow-hidden rounded-[4px]"><Image src={project.cover.src} alt="" fill sizes="17rem" className="object-cover" /></span>
        <span className="mt-2 block px-1 text-[14px]">{project.name}</span>
        <span className={`mt-0.5 block px-1 pb-1 text-[13px] leading-[1.45] ${MUTED}`}>{project.description}</span>
      </span>
    </Link>
  );
}
