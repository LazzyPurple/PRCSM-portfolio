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
