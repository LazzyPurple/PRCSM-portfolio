import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { test } from "node:test";
import sharp from "sharp";

const load = file => import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(readFileSync(file, "utf8"))).toString("base64")}`);
const { contact, projects } = await load("src/portfolio/content.ts");
const { palette } = await load("src/pond/palette.ts");

test("both UI themes and the pale violet footer meet AA text contrast", () => {
  const luminance = hex => hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
    .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
  const ui = palette.portfolio;
  for (const [text, background] of [[ui.cream, ui.dark], [ui.mutedDark, ui.dark], [ui.ink, palette.paper], [ui.muted, palette.paper], [ui.footerInk, ui.footer]]) {
    const a = luminance(text), b = luminance(background);
    assert.ok((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 4.5);
  }
});

test("project covers preserve their dimensions and distinguish the real case from placeholders", async () => {
  assert.equal(contact.linkedin, "https://www.linkedin.com/in/nathan-toto/");
  assert.equal(contact.github, "https://github.com/LazzyPurple");
  assert.equal(new Set(projects.map(p => p.slug)).size, 3);
  for (const project of projects) {
    const cover = await sharp(`public${project.cover.src}`).metadata();
    assert.equal(cover.format, "webp");
    assert.equal(cover.width, project.cover.width);
    assert.equal(cover.height, project.cover.height);
    assert.ok(project.alt.length > 30);
  }
  assert.equal(projects[0].slug, "cephalee");
  assert.equal(projects[0].label, "Cadrage & conception");
  assert.equal(projects[1].slug, "mousse");
  assert.equal(projects[1].label, "Projet personnel");
  assert.ok(projects[1].note.includes("Utilisé au quotidien"));
  assert.equal(projects[2].label, "Concept fictif");
  for (const screen of ["resume", "rapport", "intensite", "partage"]) {
    const image = await sharp(`public/projects/cephalee/${screen}.webp`).metadata();
    assert.equal(image.format, "webp");
    assert.equal(image.width, 1067);
    assert.equal(image.height, 1600);
    assert.equal(image.hasAlpha, true);
  }
  for (const screen of ["journee", "conversation", "encoche", "second-brain"]) {
    const image = await sharp(`public/projects/mousse/${screen}.webp`).metadata();
    assert.equal(image.format, "webp");
    assert.equal(image.width, screen === "encoche" ? 3840 : 1600);
    assert.equal(image.height, screen === "encoche" ? 2880 : 1067);
    assert.equal(image.hasAlpha, true);
  }
});
