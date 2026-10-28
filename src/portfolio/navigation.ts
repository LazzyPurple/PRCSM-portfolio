// Adapted from Dao-Ho/portfolio src/lib/view-transition.ts. See CREDITS.md.
let finish: (() => void) | null = null;
export const LAST_PROJECT_KEY = "pond-last-project";

export function pushWithTransition(router: { push: (href: string) => void }, href: string, direction: "forward" | "back" = "forward") {
  if (!document.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    router.push(href);
    return;
  }
  const root = document.documentElement;
  root.dataset.transition = direction;
  const transition = document.startViewTransition(() => new Promise<void>(resolve => {
    finish = resolve;
    router.push(href);
    setTimeout(resolve, 1500);
  }));
  void transition.finished.finally(() => delete root.dataset.transition).catch(() => {});
}

export function finishTransition() { finish?.(); finish = null; }
