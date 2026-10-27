import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { test } from "node:test";
import sharp from "sharp";

test("posters are real WebPs with correct sizes, aspect ratios and bounded bytes", async () => {
  const manifest = JSON.parse(await readFile("src/pond/posters.json", "utf8"));
  assert.equal(manifest.frames.length, 5);
  assert.equal(manifest.frames.at(-1).media, "");
  const files = [];
  for (const frame of manifest.frames) {
    assert.match(frame.captureSha256, /^[a-f0-9]{64}$/);
    assert.ok(frame.files.length >= 2);
    for (const file of frame.files) {
      assert.match(file.file, /^\/pond\/[a-z]+-\d+\.webp$/);
      const bytes = await readFile(`public${file.file}`), meta = await sharp(bytes).metadata();
      assert.equal(meta.format, "webp");
      assert.equal(meta.width, file.width); assert.equal(meta.height, file.height);
      assert.equal(bytes.length, file.bytes); assert.ok(bytes.length <= frame.budget);
      assert.ok(meta.width <= frame.captureWidth);
      assert.ok(Math.abs(meta.height - meta.width * frame.height / frame.width) <= 1);
      files.push(file.file.split("/").pop());
    }
  }
  assert.deepEqual((await readdir("public/pond")).sort(), files.sort());
});
