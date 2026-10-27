import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { test } from "node:test";

async function loadWorld(path) {
  const source = stripTypeScriptTypes(readFileSync(path, "utf8"));
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
}
const { World, POND_SWIM_RADIUS } = await loadWorld("src/pond/sim/world.ts");
const originalPath = "references/dao-portfolio/src/app/components/koi-pond/world.ts";

function withSeed(seed, callback) {
  const random = Math.random;
  Math.random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  try { return callback(); } finally { Math.random = random; }
}

function scenario(WorldType) {
  return withSeed(4217, () => {
    const world = new WorldType();
    world.resize(1440, 900);
    world.avoid = [{ left: 500, top: 300, right: 850, bottom: 550 }];
    for (let i = 0; i < 1200; i++) {
      if (i === 90 || i === 100) world.feed(400, 250);
      world.pointer.x = 400 + Math.sin(i / 30) * 120;
      world.pointer.y = 300;
      world.pointer.active = i < 700;
      world.pointer.speed = i > 500 && i < 520 ? 1800 : 10;
      world.step(1 / 60);
      if (i === 800) world.resize(390, 844);
      for (const koi of world.koi) assert.ok(koi.nodes.every(Number.isFinite));
    }
    return JSON.parse(JSON.stringify(world));
  });
}

test("simulation matches Dao exactly across feeding, pointer, avoidance and resize", { skip: !existsSync(originalPath) }, async () => {
  const Original = (await loadWorld(originalPath)).World;
  assert.deepEqual(scenario(World), scenario(Original));
});

test("food is bounded, lands before attraction and expires", () => withSeed(99, () => {
  const world = new World();
  world.resize(390, 844);
  for (let i = 0; i < 20; i++) world.feed(195, 400);
  assert.equal(world.pellets.length, 24);
  assert.ok(world.pellets.every(p => !p.landed));
  for (let i = 0; i < 60; i++) world.step(1 / 60);
  assert.ok(world.pellets.every(p => p.landed));
  for (let i = 0; i < 900; i++) world.step(1 / 60);
  assert.equal(world.pellets.length, 0);
}));

test("fast nearby motion startles koi, slow hover does not", () => withSeed(13, () => {
  const world = new World();
  world.resize(1440, 900);
  const koi = world.koi[0];
  Object.assign(world.pointer, { x: koi.nodes[0], y: koi.nodes[1], speed: 0, active: true });
  world.step(1 / 60);
  assert.equal(koi.startle, 0);
  world.pointer.speed = 2000;
  world.step(1 / 60);
  assert.ok(koi.startle > 0.9);
}));

test("parallel bodies steer apart before their heads collide", () => withSeed(42, () => {
  const world = new World(); world.shore = POND_SWIM_RADIUS; world.resize(1440, 900);
  world.koi.length = 2;
  for (let i = 0; i < 2; i++) {
    const k = world.koi[i]; k.length = 200; k.heading = 0; k.speed = 30; k.nextBurst = 100;
    for (let n = 0; n < 20; n++) { k.nodes[n * 2] = 760 - n * 200 / 19; k.nodes[n * 2 + 1] = 440 + i * 30; }
  }
  for (let i = 0; i < 120; i++) world.step(1 / 60);
  assert.ok(world.koi[0].nodes[1] < 440);
  assert.ok(world.koi[1].nodes[1] > 470);
  let nearest = Infinity;
  for (let a = 0; a < 20; a++) for (let b = 0; b < 20; b++) {
    nearest = Math.min(nearest, Math.hypot(world.koi[0].nodes[a * 2] - world.koi[1].nodes[b * 2], world.koi[0].nodes[a * 2 + 1] - world.koi[1].nodes[b * 2 + 1]));
  }
  assert.ok(nearest > 50, `body clearance was only ${nearest}`);
}));
