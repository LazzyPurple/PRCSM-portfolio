"use client";

export default function ThemeToggle() {
  const toggle = () => {
    const theme = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("pond-theme", theme); } catch { /* Private browsing can block storage. */ }
  };
  return (
    <button type="button" className="theme-toggle" onClick={toggle} data-koi-ignore>
      <span className="theme-to-light"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></svg><span className="sr-only">Activer le thème clair</span></span>
      <span className="theme-to-dark"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 14A9 9 0 0 1 10 3.5 9 9 0 1 0 20.5 14Z" /></svg><span className="sr-only">Activer le thème sombre</span></span>
    </button>
  );
}
