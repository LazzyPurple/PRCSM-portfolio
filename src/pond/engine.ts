// Loop and interaction rules adapted from Dao-Ho/portfolio koi-pond.tsx. See CREDITS.md.
import { World, type Box } from "./sim/world";
import { drawSimulation } from "./debug/simulation2d";
import { PondScene } from "./scene/PondScene";

const STEP = 1 / 60;
const MAX_STEPS = 4;
const MEASURE_INTERVAL_MS = 500;
const MERGE_GAP = 160;
const TAP_DISTANCE = 10;
const TAP_DURATION_MS = 400;
const INTERACTIVE = "a,button,input,textarea,select,label,summary,[role='button'],[data-koi-ignore]";

export type PondView = "scene" | "flow" | "paint" | "final" | "simulation";

export class PondEngine {
  world = new World();
  view: PondView = "scene";
  hour = 0;
  paused = false;
  fps = 0;
  gpuMs: number | null = null;
  scale = 1;
  get mrtReady() { return this.scene.mrtReady; }
  private ctx: CanvasRenderingContext2D | null;
  private scene: PondScene;
  private debugCanvas: HTMLCanvasElement | null = null;
  private lost = false;
  private raf = 0;
  private last = 0;
  private acc = 0;
  private visible = true;
  private disposed = false;
  private measuredAt = -Infinity;
  private pointerAt = 0;
  private down = { x: 0, y: 0, time: 0, touch: false };
  private width = 1;
  private height = 1;
  private originX = 0;
  private originY = 0;
  private reduced = matchMedia("(prefers-reduced-motion: reduce)");
  private resizeObserver = new ResizeObserver(() => this.resize());
  private intersectionObserver = new IntersectionObserver(([entry]) => {
    this.visible = entry.isIntersecting;
    this.schedule();
  });

  constructor(private canvas: HTMLCanvasElement, readonly debug: boolean) {
    this.scene = new PondScene(canvas);
    if (debug) {
      this.debugCanvas = document.createElement("canvas");
      this.debugCanvas.className = "pond-canvas";
      this.debugCanvas.setAttribute("aria-hidden", "true");
      canvas.after(this.debugCanvas);
    }
    this.ctx = this.debugCanvas?.getContext("2d") ?? null;
    this.resizeObserver.observe(canvas);
    this.intersectionObserver.observe(canvas);
    this.reduced.addEventListener("change", this.schedule);
    document.addEventListener("visibilitychange", this.schedule);
    window.addEventListener("pointermove", this.onMove, { passive: true });
    window.addEventListener("pointerdown", this.onDown, { passive: true });
    window.addEventListener("click", this.onClick);
    window.addEventListener("blur", this.onLeave);
    window.addEventListener("scroll", this.onLayout, { passive: true });
    document.documentElement.addEventListener("pointerleave", this.onLeave);
    canvas.addEventListener("webglcontextlost", this.onLost);
    canvas.addEventListener("webglcontextrestored", this.onRestored);
    this.resize();
    this.schedule();
  }

  setView(view: PondView) { this.view = view; this.measure(); this.draw(); }
  setHour(hour: number) { this.hour = hour; this.draw(); }
  togglePause() { this.paused = !this.paused; this.schedule(); }
  restart() {
    this.world = new World();
    this.world.resize(this.width, this.height);
    this.scene.rebuild(this.world, (Math.random() * 4294967296) >>> 0);
    this.measure();
    this.schedule();
  }

  private resize() {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    this.width = rect.width;
    this.height = rect.height;
    this.originX = rect.left;
    this.originY = rect.top;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    if (this.debugCanvas) {
      this.debugCanvas.width = Math.round(rect.width * dpr);
      this.debugCanvas.height = Math.round(rect.height * dpr);
    }
    this.world.resize(rect.width, rect.height);
    this.scene.resize(rect.width, rect.height, this.scale);
    this.scene.rebuild(this.world);
    this.measure();
    this.schedule();
  }

  private measure() {
    const rect = this.canvas.getBoundingClientRect();
    this.originX = rect.left;
    this.originY = rect.top;
    const boxes: Box[] = [];
    for (const element of document.querySelectorAll("[data-koi-avoid]")) {
      const b = element.getBoundingClientRect();
      if (!b.width || !b.height) continue;
      let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
      for (let i = 0; i < 4; i++) {
        const x = (i % 2 ? b.right : b.left) - rect.left;
        const y = (i < 2 ? b.top : b.bottom) - rect.top;
        const point = this.view === "simulation" ? { x, y } : this.scene.project(x, y);
        if (!point) continue;
        left = Math.min(left, point.x); right = Math.max(right, point.x);
        top = Math.min(top, point.y); bottom = Math.max(bottom, point.y);
      }
      if (Number.isFinite(left)) boxes.push({ left, right, top, bottom });
    }
    boxes.sort((a, b) => a.top - b.top);
    const merged: Box[] = [];
    for (const b of boxes) {
      const near = merged.find(m => b.top - m.bottom < MERGE_GAP && b.left - m.right < MERGE_GAP && m.left - b.right < MERGE_GAP);
      if (!near) merged.push(b);
      else {
        near.left = Math.min(near.left, b.left);
        near.right = Math.max(near.right, b.right);
        near.bottom = Math.max(near.bottom, b.bottom);
      }
    }
    this.world.avoid = merged;
    this.measuredAt = performance.now();
  }

  private draw() {
    if (this.lost || this.disposed) return;
    if (this.debugCanvas) this.debugCanvas.style.display = this.view === "simulation" ? "block" : "none";
    if (this.ctx && this.view === "simulation") {
      drawSimulation(this.ctx, this.world, this.width, this.height);
      if (this.debugCanvas) this.debugCanvas.dataset.ready = "true";
    } else {
      this.scene.render(this.world, this.hour, this.view);
    }
    this.canvas.dataset.ready = "true";
  }

  private schedule = () => {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.acc = 0;
    if (this.disposed || this.lost || document.hidden || !this.visible) return;
    if (this.reduced.matches) {
      this.onLeave();
      if (this.world.time < 4) for (let i = 0; i < 240; i++) this.world.step(STEP);
      this.draw();
      return;
    }
    if (this.paused) { this.draw(); return; }
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  };

  private frame = (now: number) => {
    const elapsed = Math.max(0, Math.min(0.1, (now - this.last) / 1000));
    this.last = now;
    this.fps += ((elapsed ? 1 / elapsed : 60) - this.fps) * 0.05;
    this.acc += elapsed;
    let steps = 0;
    while (this.acc >= STEP && steps < MAX_STEPS) {
      this.world.step(STEP);
      this.acc -= STEP;
      steps++;
    }
    if (steps === MAX_STEPS) this.acc = 0;
    if (now - this.measuredAt > MEASURE_INTERVAL_MS) this.measure();
    this.draw();
    this.raf = requestAnimationFrame(this.frame);
  };

  private onMove = (e: PointerEvent) => {
    if (this.reduced.matches) return;
    const localX = e.clientX - this.originX, localY = e.clientY - this.originY;
    const point = this.view === "simulation" ? this.scene.simulationPoint : this.scene.project(localX, localY);
    if (this.view === "simulation" && point) { point.x = localX; point.y = localY; }
    if (!point) return this.onLeave();
    const { x, y } = point;
    const p = this.world.pointer;
    const elapsed = Math.max(1, e.timeStamp - this.pointerAt) / 1000;
    const speed = Math.hypot(x - p.x, y - p.y) / elapsed;
    p.speed += (Math.min(speed, 5000) - p.speed) * 0.5;
    this.pointerAt = e.timeStamp;
    p.x = x;
    p.y = y;
    p.active = x >= 0 && y >= 0 && x <= this.width && y <= this.height && e.pointerType !== "touch";
  };
  private onDown = (e: PointerEvent) => {
    this.down.x = e.clientX;
    this.down.y = e.clientY;
    this.down.time = performance.now();
    this.down.touch = e.pointerType === "touch";
  };
  private onClick = (e: MouseEvent) => {
    if (this.reduced.matches || this.paused || document.hidden || !this.visible) return;
    if (e.composedPath().some(n => n instanceof Element && n.matches(INTERACTIVE))) return;
    if (getSelection()?.toString()) return;
    if (this.down.touch && (Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y) > TAP_DISTANCE || performance.now() - this.down.time > TAP_DURATION_MS)) return;
    const localX = e.clientX - this.originX, localY = e.clientY - this.originY;
    const point = this.view === "simulation" ? this.scene.simulationPoint : this.scene.project(localX, localY);
    if (this.view === "simulation" && point) { point.x = localX; point.y = localY; }
    if (!point) return;
    const { x, y } = point;
    if (x >= 0 && y >= 0 && x <= this.width && y <= this.height) this.world.feed(x, y);
  };
  private onLeave = () => { this.world.pointer.active = false; this.world.pointer.speed = 0; };
  private onLayout = () => { this.measuredAt = -Infinity; };
  private onLost = (event: Event) => { event.preventDefault(); this.lost = true; this.canvas.dataset.ready = "false"; this.schedule(); };
  private onRestored = () => { this.lost = false; this.resize(); };

  destroy() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.resizeObserver.disconnect();
    this.intersectionObserver.disconnect();
    this.reduced.removeEventListener("change", this.schedule);
    document.removeEventListener("visibilitychange", this.schedule);
    window.removeEventListener("pointermove", this.onMove);
    window.removeEventListener("pointerdown", this.onDown);
    window.removeEventListener("click", this.onClick);
    window.removeEventListener("blur", this.onLeave);
    window.removeEventListener("scroll", this.onLayout);
    document.documentElement.removeEventListener("pointerleave", this.onLeave);
    this.canvas.removeEventListener("webglcontextlost", this.onLost);
    this.canvas.removeEventListener("webglcontextrestored", this.onRestored);
    this.debugCanvas?.remove();
    this.scene.dispose();
  }
}
