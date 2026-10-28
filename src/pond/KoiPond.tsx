"use client";

// Boot timing adapted from Ardia apps/site/src/scripts/meadow/boot.ts.
// https://github.com/mantrakp04/ardia — Copyright 2026 Mantra Patel, Apache-2.0.
// SPDX-License-Identifier: Apache-2.0
// Modified for React lifetime, WebGL2 capability checks and generated posters.
import { useEffect, useRef, useState } from "react";
import type { PondEngine } from "./engine";
import type { ComponentType } from "react";
import posters from "./posters.json";

const posterSources = posters.frames.map(frame => ({ ...frame, srcSet: frame.files.map(file => `${file.file} ${file.width}w`).join(", ") }));
const phonePoster = posterSources[posterSources.length - 1];

export default function KoiPond() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [debug, setDebug] = useState<{ Panel: ComponentType<{ engine: PondEngine }>; engine: PondEngine } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    let engine: PondEngine | undefined;
    let idle = 0;
    let timer = 0;
    const start = async () => {
      const probe = document.createElement("canvas");
      const context = probe.getContext("webgl2");
      if (!context || cancelled) return;
      context.getExtension("WEBGL_lose_context")?.loseContext();
      try {
        const { PondEngine } = await import("./engine");
        if (cancelled) return;
        const isDebug = process.env.NODE_ENV === "development" && new URLSearchParams(location.search).has("debug");
        engine = new PondEngine(canvas, isDebug);
        if (isDebug) {
          const { default: Panel } = await import("./debug/DebugPanel");
          if (!cancelled && engine) setDebug({ Panel, engine });
        }
      } catch (error) {
        engine?.destroy();
        if (!cancelled) console.error("Pond could not start", error);
      }
    };
    const raf = requestAnimationFrame(() => {
      if (typeof window.requestIdleCallback === "function") idle = window.requestIdleCallback(() => void start(), { timeout: 500 });
      else timer = window.setTimeout(() => void start(), 60);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      if (idle) window.cancelIdleCallback(idle);
      clearTimeout(timer);
      engine?.destroy();
    };
  }, []);

  return (
    <>
      <picture className="pond-poster">
        {posterSources.filter(frame => frame.media).map(frame => (
          <source key={frame.name} media={frame.media} srcSet={frame.srcSet} sizes="100vw" />
        ))}
        {/* Already encoded with responsive crops; keep the browser's native picture selection. */}
        <img src={phonePoster.files[0].file} srcSet={phonePoster.srcSet} sizes="100vw"
          width={phonePoster.width} height={phonePoster.height} alt="" loading="eager" fetchPriority="high" decoding="async"
          onError={event => { event.currentTarget.style.visibility = "hidden"; }} />
      </picture>
      <canvas ref={canvasRef} aria-hidden="true" className="pond-canvas" />
      {debug && <debug.Panel engine={debug.engine} />}
    </>
  );
}
