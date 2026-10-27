import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { test } from "node:test";

const url = path => `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(readFileSync(path, "utf8"), { mode: "transform" })).toString("base64")}`;
const { WetPaint } = await import(url("src/pond/paint/wetPaint.ts"));
const { Scaler, GpuClock } = await import(url("src/pond/paint/budget.ts"));

test("wet paint uses one bounded field, follows the pointer and heals", () => {
  const wet = new WetPaint(64, 40), field = wet.field;
  const p = { x: 300, y: 200, active: true };
  wet.step(1 / 60, p, 1000, 600, 90);
  p.x += 20;
  wet.step(1 / 60, p, 1000, 600, 90);
  const peak = Math.max(...field.map(Math.abs));
  assert.ok(peak > 0 && peak <= 0.045);
  p.active = false;
  for (let i = 0; i < 27; i++) wet.step(1 / 60, p, 1000, 600, 90);
  assert.ok(Math.abs(Math.max(...field.map(Math.abs)) / peak - Math.exp(-1)) < 1e-5);
  for (let i = 0; i < 240; i++) wet.step(1 / 60, p, 1000, 600, 90);
  assert.equal(wet.field, field);
  assert.ok(wet.settled);
});

const budgetPath = "references/ardia/apps/site/src/scripts/meadow/budget.ts";
test("allocation-free scaler preserves every original decision", { skip: !existsSync(budgetPath) }, async () => {
  const { Scaler: Original } = await import(url(budgetPath));
  const a = new Scaler(), b = new Original();
  for (let i = 0; i < 1200; i++) {
    const ms = i < 200 ? 20 : i < 600 ? 2 : 10;
    assert.equal(a.gpu(ms, i * 20), b.gpu(ms, i * 20));
    assert.equal(a.scale, b.scale);
    assert.equal(a.frame(i % 3 ? 28 : 16, 3, i * 20), b.frame(i % 3 ? 28 : 16, 3, i * 20));
    assert.equal(a.scale, b.scale);
  }
});

test("GPU clock reuses four queries and releases them all", () => {
  let created = 0, deleted = 0, samples = 0;
  const gl = {
    drawArrays: Array.prototype.push, drawElements: Array.prototype.push, drawArraysInstanced: Array.prototype.push,
    CURRENT_QUERY: 1, QUERY_RESULT_AVAILABLE: 2, QUERY_RESULT: 3,
    getExtension: () => ({ TIME_ELAPSED_EXT: 4, GPU_DISJOINT_EXT: 5 }),
    createQuery: () => ({ id: ++created }), getQuery: () => null,
    beginQuery() {}, endQuery() {}, getParameter: () => false,
    getQueryParameter: (_query, parameter) => parameter === 2 ? true : 2e6,
    deleteQuery() { deleted++; },
  };
  const clock = new GpuClock(gl);
  for (let i = 0; i < 100; i++) {
    clock.start(true); clock.stop(); clock.collect(ms => { assert.equal(ms, 2); samples++; });
  }
  assert.equal(created, 4); assert.equal(samples, 100);
  clock.dispose(); assert.equal(deleted, 4);
});

const shaderPath = "references/ardia/apps/site/src/scripts/meadow/shaders.ts";
test("Kuwahara body is preserved verbatim from Ardia", { skip: !existsSync(shaderPath) }, () => {
  const body = source => source.match(/const PAINT_FS = `([\s\S]*?)`;/)[1].replaceAll("\r\n", "\n");
  assert.equal(body(readFileSync("src/pond/paint/paintPass.ts", "utf8")), body(readFileSync(shaderPath, "utf8")));
});
