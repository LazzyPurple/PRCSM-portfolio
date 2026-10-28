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
const { createLilyPads, randomSeed } = await import(moduleUrl("src/pond/scene/lilyPads.ts"));
const { POND_SWIM_RADIUS } = await import(moduleUrl("src/pond/sim/world.ts"));
const { pondWidth } = await import(moduleUrl("src/pond/scene/framing.ts"));
const { createKoiShadow } = await import(moduleUrl("src/pond/scene/shadows.ts"));
const { koiMarkings } = await import(moduleUrl("src/pond/sim/markings.ts"));
const { advanceHour, CYCLE_SECONDS, START_HOUR, phaseAt, formatHour } = await import(moduleUrl("src/pond/cycle.ts"));
const { Daylight } = await import(moduleUrl("src/pond/scene/daylight.ts"));
const { createFlowers, createAlgae } = await import(moduleUrl("src/pond/scene/vegetation.ts"));

function withSeed(seed, callback) {
  const original = Math.random;
  Math.random = randomSeed(seed);
  try { return callback(); } finally { Math.random = original; }
}

test("three-minute clock wraps continuously through dawn, day, dusk and night", () => {
  let hour = START_HOUR;
  for (let i = 0; i < CYCLE_SECONDS * 60; i++) hour = advanceHour(hour, 1 / 60);
  assert.ok(Math.abs(hour - START_HOUR) < 1e-8);
  assert.deepEqual([0, 6, 12, 18].map(phaseAt), ["Nuit", "Aube", "Jour", "Crépuscule"]);
  assert.equal(formatHour(24), "00:00"); assert.equal(formatHour(-1), "23:00");
  assert.equal(formatHour(6.5), "06:30");
});

test("lighting stays finite, continuous at midnight and reuses every color", () => {
  const light = new Daylight(), color = light.light, sky = light.sky[0];
  for (let hour = 0; hour <= 24; hour += 0.05) {
    light.update(hour);
    assert.equal(light.light, color); assert.equal(light.sky[0], sky);
    assert.ok(light.direction.toArray().every(Number.isFinite));
    assert.ok(light.direction.y > 0.25 && Math.abs(light.direction.length() - 1) < 1e-8);
    assert.ok(light.light.toArray().every(n => Number.isFinite(n) && n >= 0));
  }
  light.update(12); const day = light.light.r + light.light.g + light.light.b;
  light.update(0); const night = light.light.toArray();
  assert.ok(night.reduce((a, b) => a + b) < day * 0.45);
  light.update(24); assert.deepEqual(light.light.toArray(), night);
  light.update(23.999); assert.ok(light.light.toArray().every((value, i) => Math.abs(value - night[i]) < 0.0001));
});

test("flowers and algae are deterministic batches, rooted on shore and below water", () => {
  const uniforms = sharedUniforms();
  for (const create of [createFlowers, createAlgae]) {
    const a = create(14.4, 9, 90210, uniforms), b = create(14.4, 9, 90210, uniforms);
    assert.deepEqual(a.geometry.attributes.position.array, b.geometry.attributes.position.array);
    assert.deepEqual(a.geometry.attributes.color.array, b.geometry.attributes.color.array);
    assert.ok(a.geometry.attributes.position.count > 3000);
    assert.equal(a.material.uniforms.uTime, uniforms.uTime);
    for (const attribute of Object.values(a.geometry.attributes)) assert.ok(attribute.array.every(Number.isFinite));
    const positions = a.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      if (a.name === "pond-algae") assert.ok(positions.getY(i) < -0.7 && positions.getY(i) > -1.5);
      else assert.ok(positions.getY(i) >= 0);
    }
    a.geometry.dispose(); a.material.dispose(); b.geometry.dispose(); b.material.dispose();
  }
});

test("pond schools include gold, black-white, slate and young koi on every seed", () => {
  const world = new World(); world.shore = POND_SWIM_RADIUS; world.resize(1440, 900);
  assert.equal(new Set(world.koi.map(k => k.variety)).size, 7);
  const lengths = world.koi.map(k => k.length);
  assert.ok(Math.max(...lengths) / Math.min(...lengths) > 2);
  for (const koi of world.koi) {
    const markings = koiMarkings(koi);
    assert.ok(markings.red.length <= 4 && markings.black.length <= 6 && (markings.white?.length ?? 0) <= 3);
    if (koi.variety === "shiro") assert.ok(markings.black.length > 0 && markings.red.length === 0);
    if (koi.variety === "yamabuki") assert.deepEqual(markings, { red: [], black: [] });
    if (koi.variety === "showa") {
      assert.ok(markings.red.length >= 2 && markings.white.length >= 2);
      const model = createKoi(koi, sharedUniforms()), uniforms = model.mesh.material.uniforms;
      assert.equal(uniforms.uWhiteCount.value, markings.white.length);
      assert.notEqual(uniforms.uBase.value.getHex(), uniforms.uWhite.value.getHex());
      model.mesh.geometry.dispose(); model.mesh.material.dispose();
    }
  }
});

test("koi shadows share animated buffers and the moving light", () => {
  const world = new World(); world.shore = POND_SWIM_RADIUS; world.resize(1440, 900);
  const uniforms = sharedUniforms(), koi = createKoi(world.koi[0], uniforms);
  const shadow = createKoiShadow(koi.mesh.geometry, uniforms);
  assert.equal(shadow.geometry, koi.mesh.geometry);
  assert.equal(shadow.material.uniforms.uLight, uniforms.uLight);
  assert.equal(shadow.material.uniforms.uMaxDepth, uniforms.uMaxDepth);
  assert.ok(shadow.material.transparent && !shadow.material.depthWrite);
  const positions = shadow.geometry.attributes.position.array;
  world.step(1 / 60); koi.update(0.01, -7.2, -4.5);
  assert.equal(shadow.geometry.attributes.position.array, positions);
  assert.ok(positions.every(Number.isFinite));
  shadow.material.dispose(); koi.mesh.material.dispose(); koi.mesh.geometry.dispose();
});

test("portrait crops a broad pond while fish sizes and population follow the viewport", () => {
  assert.equal(pondWidth(1440, 900), 1440);
  const world = new World(); world.shore = POND_SWIM_RADIUS;
  world.resize(pondWidth(390, 844), 844, 390, 844);
  assert.equal(world.width / world.height, 1.35);
  assert.equal(world.koi.length, 3);
  assert.ok(world.koi.every(k => k.length <= 195));
  assert.ok(!world.contains(0, 0));
  world.feed(0, 0);
  assert.equal(world.pellets.length, 0);
  world.feed(world.width / 2, world.height / 2);
  assert.ok(world.pellets.length >= 5);
});

test("shore contains fully flared fins during feeding, flight and resize", () => withSeed(1, () => {
  const world = new World(); world.shore = POND_SWIM_RADIUS;
  world.resize(1440, 900);
  const uniforms = sharedUniforms();
  let models = world.koi.map(k => createKoi(k, uniforms));
  const dispose = () => { for (const model of models) { model.mesh.geometry.dispose(); model.mesh.material.dispose(); } };
  for (let frame = 0; frame < 3600; frame++) {
    if (frame === 1200 || frame === 2400) {
      const [w, h] = frame === 1200 ? [390, 844] : [844, 390];
      world.resize(pondWidth(w, h), h, w, h);
      dispose(); models = world.koi.map(k => createKoi(k, uniforms));
    }
    const angle = frame * 0.006;
    Object.assign(world.pointer, { active: true, speed: frame % 180 < 20 ? 2000 : 10,
      x: world.width * (0.5 + Math.cos(angle) * 0.4), y: world.height * (0.5 + Math.sin(angle) * 0.4) });
    if (frame % 120 === 0) world.feed(world.pointer.x, world.pointer.y);
    world.step(1 / 60);
    for (let i = 0; i < models.length; i++) {
      models[i].update(1, -world.width / 2, -world.height / 2);
      const positions = models[i].mesh.geometry.attributes.position.array;
      for (let v = 0; v < positions.length; v += 3) {
        assert.ok((positions[v] / (world.width * POND_SWIM_RADIUS)) ** 2
          + (positions[v + 2] / (world.height * POND_SWIM_RADIUS)) ** 2 <= 1.0001, `mesh outside water at frame ${frame}`);
      }
      const nodes = world.koi[i].nodes, segment = world.koi[i].length / 19;
      for (let n = 2; n < nodes.length; n += 2) assert.ok(Math.abs(Math.hypot(nodes[n] - nodes[n - 2], nodes[n + 1] - nodes[n - 1]) - segment) < 0.002);
    }
  }
  dispose();
}));

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
