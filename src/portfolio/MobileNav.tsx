"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { contact } from "./content";
import ThemeToggle from "./ThemeToggle";

const DESKTOP_QUERY = "(min-width: 1024px)";

export default function MobileNav() {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const close = () => dialog.current?.close();

  useEffect(() => {
    const desktop = matchMedia(DESKTOP_QUERY);
    const onResize = () => { if (desktop.matches) dialog.current?.close(); };
    desktop.addEventListener("change", onResize);
    return () => desktop.removeEventListener("change", onResize);
  }, []);

  useEffect(() => {
    if (!open) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = overflow; };
  }, [open]);

  return (
    <div className="mobile-nav" data-koi-ignore>
      <button ref={trigger} type="button" className="mobile-menu-bar" aria-label="Ouvrir le menu de navigation" aria-haspopup="dialog" aria-expanded={open} aria-controls="mobile-menu" onClick={() => { dialog.current?.showModal(); setOpen(true); }}>
        <span>Nathan TOTO</span>
        <span className="mobile-menu-grid" aria-hidden="true" />
      </button>
      <dialog ref={dialog} id="mobile-menu" className="mobile-menu" aria-label="Menu de navigation" onClose={() => { setOpen(false); trigger.current?.focus({ preventScroll: true }); }}>
        <div className="mobile-menu-bar mobile-menu-heading">
          <span>Nathan TOTO</span>
          <button type="button" onClick={close} aria-label="Fermer le menu"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 5 14 14M19 5 5 19" /></svg></button>
        </div>
        <nav className="mobile-menu-links" aria-label="Navigation mobile">
          <Link href="/#mare" onClick={close}>La mare</Link>
          <Link href="/#projets" onClick={close}>Mes projets</Link>
          <a href={`mailto:${contact.email}`} onClick={close}>Contact</a>
        </nav>
        <div className="mobile-menu-secondary">
          <a href={contact.linkedin} target="_blank" rel="noopener noreferrer" onClick={close}>LinkedIn ↗<span className="sr-only"> (nouvel onglet)</span></a>
          <a href={contact.github} target="_blank" rel="noopener noreferrer" onClick={close}>GitHub ↗<span className="sr-only"> (nouvel onglet)</span></a>
          <ThemeToggle />
        </div>
      </dialog>
    </div>
  );
}
