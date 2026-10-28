import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { test } from "node:test";
import sharp from "sharp";

const load = file => import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(readFileSync(file, "utf8"))).toString("base64")}`);
const { heroTone } = await load("src/portfolio/tone.ts");
const { contact, projects } = await load("src/portfolio/content.ts");

test("hero has dark text by day and cream text during night and dawn", () => {
  for (const hour of [0, 6, 6.999, 19, 23.999]) assert.equal(heroTone(hour), "night");
  for (const hour of [7, 12, 18.999]) assert.equal(heroTone(hour), "day");
});

test("fictional cases have readable local covers and the requested profile links", async () => {
  assert.equal(contact.linkedin, "https://www.linkedin.com/in/nathan-toto/");
  assert.equal(contact.github, "https://github.com/LazzyPurple");
  assert.equal(new Set(projects.map(p => p.slug)).size, 3);
  for (const project of projects) {
    const cover = await sharp(`public/projects/${project.slug}.webp`).metadata();
    assert.equal(cover.format, "webp");
    assert.equal(cover.width / cover.height, 1.5);
    assert.ok(project.alt.length > 30);
  }
});
