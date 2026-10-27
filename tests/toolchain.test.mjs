import assert from "node:assert/strict";
import { test } from "node:test";
import { GLSL3, RawShaderMaterial, WebGLRenderTarget } from "three";

test("installed Three.js exposes two independent MRT attachments", () => {
  const target = new WebGLRenderTarget(16, 9, { count: 2 });
  assert.equal(target.textures.length, 2);
  assert.notEqual(target.textures[0], target.textures[1]);
  assert.equal(target.texture, target.textures[0]);
  target.setSize(32, 18);
  for (const texture of target.textures) {
    assert.equal(texture.image.width, 32);
    assert.equal(texture.image.height, 18);
  }
  target.dispose();
});

test("GLSL3 raw materials preserve explicit output locations", () => {
  const fragmentShader = `precision highp float;
    layout(location = 0) out vec4 sceneColor;
    layout(location = 1) out vec4 sceneFlow;
    void main() { sceneColor = vec4(1.0); sceneFlow = vec4(0.5); }`;
  const material = new RawShaderMaterial({ glslVersion: GLSL3, fragmentShader });
  assert.equal(material.glslVersion, "300 es");
  assert.equal(material.fragmentShader, fragmentShader);
  material.dispose();
});
