// Adapted from Ardia apps/site/src/scripts/meadow/budget.ts and scene.ts (pickTier).
// https://github.com/mantrakp04/ardia — Copyright 2026 Mantra Patel, Apache-2.0.
// SPDX-License-Identifier: Apache-2.0
// Modified for pond rendering and complete resource disposal.
const MAX_PENDING_QUERIES = 4;
const GPU_WINDOW = 16;
const SLOW_GPU_MS = 12;
const TARGET_GPU_MS = 9;
const FAST_GPU_MS = 4.5;
const RISE_AFTER_MS = 4000;
const LARGEST_DROP = 0.6;
const SMALLEST_DROP = 0.92;
const LARGEST_RISE = 1.25;
const MIN_SCALE = 0.5;
const FALLBACK_WINDOW = 40;
const FALLBACK_SLOW_FRAME_MS = 24;
const FALLBACK_CPU_CEILING_MS = 8;
const FALLBACK_DROP = 0.85;
const FALLBACK_MIN_SCALE = 0.6;

interface TimerQuery {
  TIME_ELAPSED_EXT: number;
  GPU_DISJOINT_EXT: number;
}

const isNative = (fn: unknown) => typeof fn === "function" && /\[native code\]\s*\}\s*$/.test(Function.prototype.toString.call(fn));

const median = (values: Float64Array) => values.sort()[values.length >> 1];

export function pickTier() {
  const coarse = matchMedia("(pointer: coarse)").matches;
  const phone = coarse && Math.min(screen.width, screen.height) < 700;
  return phone ? { phone, dprCap: 2, pixelBudget: 1.1e6 } : { phone, dprCap: 1.6, pixelBudget: 2.4e6 };
}

export class GpuClock {
  private readonly ext: TimerQuery | null;
  private readonly slots: { query: WebGLQuery; busy: boolean }[] = [];
  private pending = 0;
  private read = 0;
  private write = 0;
  private running = false;

  constructor(private readonly gl: WebGL2RenderingContext) {
    const instrumented = !isNative(gl.drawArrays) || !isNative(gl.drawElements) || !isNative(gl.drawArraysInstanced);
    this.ext = instrumented ? null : (gl.getExtension("EXT_disjoint_timer_query_webgl2") as TimerQuery | null);
    if (this.ext) for (let i = 0; i < MAX_PENDING_QUERIES; i++) {
      const query = gl.createQuery();
      if (query) this.slots.push({ query, busy: false });
    }
  }

  get available() {
    return this.ext !== null && this.slots.length === MAX_PENDING_QUERIES;
  }

  start(busy: boolean) {
    const { gl, ext } = this;
    if (!ext || !this.available || this.running || this.pending >= MAX_PENDING_QUERIES) return;
    if (gl.getQuery(ext.TIME_ELAPSED_EXT, gl.CURRENT_QUERY)) return;
    const slot = this.slots[this.write];
    slot.busy = busy;
    gl.beginQuery(ext.TIME_ELAPSED_EXT, slot.query);
    this.running = true;
  }

  stop() {
    if (!this.ext || !this.running) return;
    this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
    this.pending++;
    this.write = (this.write + 1) % MAX_PENDING_QUERIES;
    this.running = false;
  }

  collect(onSample: (ms: number, busy: boolean) => void) {
    const { gl, ext } = this;
    if (!ext) return;
    while (this.pending) {
      const { query, busy } = this.slots[this.read];
      if (!gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE)) return;
      const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT);
      const nanoseconds = gl.getQueryParameter(query, gl.QUERY_RESULT) as number;
      this.read = (this.read + 1) % MAX_PENDING_QUERIES;
      this.pending--;
      if (!disjoint) onSample(nanoseconds / 1e6, busy);
    }
  }

  dispose() {
    if (this.running && this.ext) this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
    for (const slot of this.slots) this.gl.deleteQuery(slot.query);
    this.slots.length = 0;
    this.pending = 0;
    this.running = false;
  }
}

export class Scaler {
  scale = 1;
  private ceiling = 1;
  private samples = new Float64Array(GPU_WINDOW);
  private frames = new Float64Array(FALLBACK_WINDOW);
  private cpu = new Float64Array(FALLBACK_WINDOW);
  private sampleCount = 0;
  private frameCount = 0;
  private changedAt = 0;
  private lastRose = false;

  gpu(ms: number, now: number) {
    this.samples[this.sampleCount++] = ms;
    if (this.sampleCount < GPU_WINDOW) return false;
    const typical = median(this.samples);
    this.sampleCount = 0;
    if (typical > SLOW_GPU_MS && this.scale > MIN_SCALE) {
      const drop = Math.min(SMALLEST_DROP, Math.max(LARGEST_DROP, Math.sqrt(TARGET_GPU_MS / typical)));
      const next = Math.max(MIN_SCALE, this.scale * drop);
      if (this.lastRose) this.ceiling = next;
      return this.change(next, false, now);
    }
    if (typical < FAST_GPU_MS && this.scale < this.ceiling && now - this.changedAt > RISE_AFTER_MS) {
      const rise = Math.min(LARGEST_RISE, Math.sqrt(TARGET_GPU_MS / typical));
      return this.change(Math.min(this.ceiling, this.scale * rise), true, now);
    }
    return false;
  }

  frame(frameMs: number, cpuMs: number, now: number) {
    this.frames[this.frameCount] = frameMs;
    this.cpu[this.frameCount++] = cpuMs;
    if (this.frameCount < FALLBACK_WINDOW) return false;
    const slow = median(this.frames) > FALLBACK_SLOW_FRAME_MS && median(this.cpu) < FALLBACK_CPU_CEILING_MS;
    this.frameCount = 0;
    if (!slow || this.scale <= FALLBACK_MIN_SCALE) return false;
    return this.change(Math.max(FALLBACK_MIN_SCALE, this.scale * FALLBACK_DROP), false, now);
  }

  private change(next: number, rose: boolean, now: number) {
    if (Math.abs(next - this.scale) < 0.01) return false;
    this.scale = next;
    this.lastRose = rose;
    this.changedAt = now;
    this.sampleCount = 0;
    this.frameCount = 0;
    return true;
  }
}
