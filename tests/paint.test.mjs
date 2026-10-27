import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { test } from "node:test";

const url = path => `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(readFileSync(path, "utf8"))).toString("base64")}`;
const { WetPaint } = await import(url("src/pond/paint/wetPaint.ts"));

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

const shaderPath = "references/ardia/apps/site/src/scripts/meadow/shaders.ts";
test("Kuwahara body is preserved verbatim from Ardia", { skip: !existsSync(shaderPath) }, () => {
  const body = source => source.match(/const PAINT_FS = `([\s\S]*?)`;/)[1].replaceAll("\r\n", "\n");
  assert.equal(body(readFileSync("src/pond/paint/paintPass.ts", "utf8")), body(readFileSync(shaderPath, "utf8")));
});
