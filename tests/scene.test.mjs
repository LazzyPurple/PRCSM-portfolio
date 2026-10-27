import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { resolve, dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";

const cache = new Map();
function moduleUrl(file) {
  file = resolve(file);
  if (cache.has(file)) return cache.get(file);
  const source = stripTypeScriptTypes(readFileSync(file, "utf8"));
  const js = source.replace(/from ["']([^"']+)["']/g, (match, name) => {
    if (name === "three") return `from "${pathToFileURL(resolve("node_modules/three/build/three.module.js"))}"`;
    if (name.startsWith(".")) return `from "${moduleUrl(resolve(dirname(file), `${name}.ts`))}"`;
    return match;
  });
  const url = `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`;
  cache.set(file, url);
  return url;
}
const { World } = await import(moduleUrl("src/pond/sim/world.ts"));
const { sharedUniforms } = await import(moduleUrl("src/pond/scene/flow.ts"));
const { createKoi } = await import(moduleUrl("src/pond/scene/koiMesh.ts"));
const { createLilyPads } = await import(moduleUrl("src/pond/scene/lilyPads.ts"));

test("koi deformation reuses buffers and keeps all positions and normals finite", () => {
  const world = new World(); world.resize(1440, 900);
  const koi = world.koi[0], uniforms = sharedUniforms();
  const model = createKoi(koi, uniforms);
  const position = model.mesh.geometry.attributes.position.array;
  for (let i = 0; i < 240; i++) {
    world.step(1 / 60); model.update(0.01, -7.2, -4.5);
    assert.equal(model.mesh.geometry.attributes.position.array, position);
    assert.ok(position.every(Number.isFinite));
    assert.ok(model.mesh.geometry.attributes.normal.array.every(Number.isFinite));
  }
  assert.ok(model.mesh.geometry.index.count > 1000);
  model.mesh.geometry.dispose(); model.mesh.material.dispose();
});

test("lily layout is repeatable with three separate project pads", () => {
  const a = createLilyPads(14.4, 9, 90210, sharedUniforms());
  const b = createLilyPads(14.4, 9, 90210, sharedUniforms());
  assert.equal(a.group.children.length, 20);
  assert.equal(a.projectPads.length, 3);
  a.update(4); b.update(4);
  assert.deepEqual(a.group.children.map(p => p.position.toArray()), b.group.children.map(p => p.position.toArray()));
});
