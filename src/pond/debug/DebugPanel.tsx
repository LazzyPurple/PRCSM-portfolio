"use client";

import { useEffect, useReducer } from "react";
import type { PondEngine, PondView } from "../engine";

export default function DebugPanel({ engine }: { engine: PondEngine }) {
  const [, refresh] = useReducer(n => n + 1, 0);
  useEffect(() => {
    const timer = setInterval(refresh, 400);
    return () => clearInterval(timer);
  }, []);
  return (
    <aside data-koi-ignore className="debug-panel" aria-label="Debug de la mare">
      <strong>Mare · debug</strong>
      <label>Vue
        <select value={engine.view} onChange={e => { engine.setView(e.target.value as PondView); refresh(); }}>
          <option value="scene">Scène brute</option><option value="flow">Flux</option>
          <option value="paint">Kuwahara</option><option value="final">Gouache</option>
          <option value="simulation">Simulation 2D</option>
        </select>
      </label>
      <output>{engine.fps.toFixed(0)} FPS · GPU {engine.gpuMs === null ? "n/d" : `${engine.gpuMs.toFixed(2)} ms`} · ×{engine.scale.toFixed(2)}</output>
      <output>{engine.world.koi.length} koï · {engine.world.pellets.length} granulés · {engine.world.time.toFixed(1)} s</output>
      <label>Heure · jour → crépuscule
        <input type="range" min="0" max="1" step="0.01" value={engine.hour} onChange={e => { engine.setHour(e.target.valueAsNumber); refresh(); }} />
      </label>
      <div><button onClick={() => { engine.togglePause(); refresh(); }}>{engine.paused ? "Reprendre" : "Pause"}</button>
        <button onClick={() => { engine.restart(); refresh(); }}>Relancer la mare</button></div>
    </aside>
  );
}
