// Adapted from Ardia apps/site/src/scripts/meadow/shaders.ts (0d16725).
// https://github.com/mantrakp04/ardia — Copyright 2026 Mantra Patel, Apache-2.0.
// SPDX-License-Identifier: Apache-2.0
// Modified for Three.js GLSL3 and pond regions; see CREDITS.md.
import { HEADER, COMMON } from './common.glsl';
import * as THREE from "three";
import { PAINT_FS } from "./paintPass";
import { WetPaint } from "./wetPaint";
import { FULLSCREEN_VS, fullscreenScene } from "../scene/water";

const PAINT_SCALE = 0.62;
const CELL_MARGIN = 7;
const CELL_SIZE = 16;
const SMEAR_COLUMNS = 64;
const SMEAR_ROWS = 40;

export class PaintPipeline {
  private paintTarget = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false });
  private cells: THREE.WebGLRenderTarget | null;
  private wet = new WetPaint(SMEAR_COLUMNS, SMEAR_ROWS);
  private smear = new THREE.DataTexture(this.wet.field, SMEAR_COLUMNS, SMEAR_ROWS, THREE.RGFormat, THREE.FloatType);
  private paint: THREE.RawShaderMaterial;
  private cellMaterial: THREE.RawShaderMaterial;
  private final: THREE.RawShaderMaterial;
  private fullscreen;
  private width = 0;
  private height = 0;
  private dpr = 0;
  private smearUploaded = false;
  private cellsChecked = false;

  constructor(private renderer: THREE.WebGLRenderer) {
    this.cells = renderer.extensions.has("EXT_color_buffer_float")
      ? new THREE.WebGLRenderTarget(1, 1, { count: 2, type: THREE.FloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: false }) : null;
    this.smear.minFilter = this.smear.magFilter = renderer.extensions.has("OES_texture_float_linear") ? THREE.LinearFilter : THREE.NearestFilter;
    this.smear.needsUpdate = true;
    const shader = (fragmentShader: string, uniforms: Record<string, THREE.IUniform>) => new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3, vertexShader: FULLSCREEN_VS, fragmentShader, uniforms, depthTest: false, depthWrite: false,
    });
    this.paint = shader(PAINT_FS, { uScene: { value: null }, uFlow: { value: null }, uTexel: { value: new THREE.Vector2() }, uRadius: { value: 2.3 } });
    const shared = { uFlow: { value: null }, uResolution: { value: new THREE.Vector2() }, uDpr: { value: 1 }, uCellOrigin: { value: new THREE.Vector2(-CELL_MARGIN, -CELL_MARGIN) } };
    this.cellMaterial = shader(CELL_FS, { ...shared });
    this.final = shader(FINAL_FS, { ...shared, uPaint: { value: this.paintTarget.texture }, uSmear: { value: this.smear },
      uCellShape: { value: this.cells?.textures[0] ?? null }, uCellStroke: { value: this.cells?.textures[1] ?? null },
      uCellTable: { value: !!this.cells }, uCellCount: { value: new THREE.Vector2() }, uLight: { value: new THREE.Vector3() },
      uSpecColor: { value: new THREE.Color() }, uTime: { value: 0 }, uRelief: { value: 1.5 } });
    this.fullscreen = fullscreenScene(this.paint);
  }

  resize(width: number, height: number, cssWidth: number) {
    const dpr = width / cssWidth;
    if (width === this.width && height === this.height && dpr === this.dpr) return;
    this.width = width; this.height = height; this.dpr = dpr;
    this.paintTarget.setSize(Math.max(1, Math.round(width * PAINT_SCALE)), Math.max(1, Math.round(height * PAINT_SCALE)));
    const columns = Math.ceil(width / (CELL_SIZE * dpr)) + CELL_MARGIN * 2 + 1;
    const rows = Math.ceil(height / (CELL_SIZE * dpr)) + CELL_MARGIN * 2 + 1;
    this.cells?.setSize(columns, rows);
    this.cellsChecked = false;
    this.final.uniforms.uCellCount.value.set(columns, rows);
    this.final.uniforms.uResolution.value.set(width, height);
    this.final.uniforms.uDpr.value = dpr;
    this.final.uniforms.uRelief.value = 1.5 * Math.min(1, Math.max(0.55, dpr / 2));
  }

  render(color: THREE.Texture, flow: THREE.Texture, cssWidth: number, cssHeight: number, dt: number,
    time: number, pointer: { x: number; y: number; active: boolean }, light: THREE.Vector3, spec: THREE.Color, view: string) {
    this.wet.step(dt, pointer, cssWidth, cssHeight, cssWidth < 700 ? 70 : 90);
    if (!this.wet.settled || !this.smearUploaded) {
      this.smear.needsUpdate = true;
      this.smearUploaded = this.wet.settled;
    }
    this.paint.uniforms.uScene.value = color; this.paint.uniforms.uFlow.value = flow;
    this.paint.uniforms.uTexel.value.set(1 / this.width, 1 / this.height);
    this.paint.uniforms.uRadius.value = 2.3 * this.dpr;
    this.renderer.setRenderTarget(this.paintTarget);
    this.fullscreen.mesh.material = this.paint;
    this.renderer.render(this.fullscreen.scene, this.fullscreen.camera);
    if (view === "paint") return this.paintTarget.texture;
    this.final.uniforms.uFlow.value = flow;
    if (this.cells) {
      this.renderer.setRenderTarget(this.cells);
      this.fullscreen.mesh.material = this.cellMaterial;
      this.renderer.render(this.fullscreen.scene, this.fullscreen.camera);
      if (!this.cellsChecked) {
        const gl = this.renderer.getContext();
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
          this.cells.dispose(); this.cells = null;
          this.final.uniforms.uCellTable.value = false;
          this.final.uniforms.uCellShape.value = null; this.final.uniforms.uCellStroke.value = null;
        }
        this.cellsChecked = true;
      }
    }
    this.final.uniforms.uTime.value = time;
    this.final.uniforms.uLight.value.copy(light);
    this.final.uniforms.uSpecColor.value.copy(spec);
    this.fullscreen.mesh.material = this.final;
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.fullscreen.scene, this.fullscreen.camera);
    return null;
  }

  dispose() {
    this.paintTarget.dispose(); this.cells?.dispose(); this.smear.dispose();
    this.paint.dispose(); this.cellMaterial.dispose(); this.final.dispose(); this.fullscreen.geometry.dispose();
  }
}
export const STROKE_CELLS = `
uniform sampler2D uFlow;
uniform vec2 uResolution;
uniform float uDpr;

vec2 hash22(vec2 p) {
  return vec2(hash12(p), hash12(p + 19.19));
}

vec2 strokeCenter(vec2 id, float cellSize) {
  return (id + hash22(id)) * cellSize;
}

vec4 strokeShape(vec2 id, vec2 center, out vec2 along) {
  vec2 jitter = hash22(id);
  vec4 flow = texture(uFlow, center / uResolution);
  vec2 orientation = flow.xy * 2.0 - 1.0;
  float angle = 0.5 * atan(orientation.y, orientation.x) + (jitter.x - 0.5) * 0.28;
  along = vec2(cos(angle), sin(angle));
  float size = mix(0.4, 1.0, flow.z);
  float halfLength = mix(11.0, 27.0, size) * uDpr * (0.85 + jitter.y * 0.3);
  float halfWidth = mix(3.4, 7.5, size) * uDpr * (0.85 + jitter.x * 0.3);
  return vec4(halfLength, halfWidth, flow.a, hash12(id + 7.13));
}
`;
export const CELL_FS = `${HEADER}${COMMON}${STROKE_CELLS}
uniform vec2 uCellOrigin;
layout(location = 0) out vec4 outShape;
layout(location = 1) out vec4 outStroke;

void main() {
  vec2 id = floor(gl_FragCoord.xy) + uCellOrigin;
  vec2 center = strokeCenter(id, 16.0 * uDpr);
  vec2 along;
  outStroke = strokeShape(id, center, along);
  outShape = vec4(center, along);
}
`;
export const FINAL_FS = `${HEADER}${COMMON}${STROKE_CELLS}
uniform sampler2D uPaint;
uniform sampler2D uSmear;
uniform highp sampler2D uCellShape;
uniform highp sampler2D uCellStroke;
uniform bool uCellTable;
uniform vec2 uCellOrigin;
uniform ivec2 uCellCount;
uniform vec3 uLight;
uniform vec3 uSpecColor;
uniform float uRelief;
in vec2 vUv;
out vec4 outColor;

void main() {
  vec2 pixel = gl_FragCoord.xy;
  vec2 smear = texture(uSmear, pixel / uResolution).xy;
  float regionAtPixel = texture(uFlow, pixel / uResolution).a;
  vec2 painted = pixel - smear * uResolution * mix(1.0, 0.35, step(0.32, regionAtPixel) * (1.0 - step(0.72, regionAtPixel)));
  vec2 uv = painted / uResolution;
  vec3 base = texture(uPaint, uv).rgb;

  float cellSize = 16.0 * uDpr;
  float reach = 32.3 * uDpr;
  float reach2 = reach * reach;
  vec2 cell = floor(painted / cellSize);
  float bestOrder = -1.0;
  vec2 bestLocal = vec2(0.0);
  vec2 bestCenter = vec2(0.0);
  float bestSeed = 0.0;
  float bestRegion = 0.0;
  for (int j = -2; j <= 2; j++) {
    for (int i = -2; i <= 2; i++) {
      vec2 id = cell + vec2(float(i), float(j));
      ivec2 slot = ivec2(id - uCellOrigin);
      bool cached = uCellTable && all(greaterThanEqual(slot, ivec2(0))) && all(lessThan(slot, uCellCount));
      vec2 center;
      vec2 along;
      vec4 shape;
      if (cached) {
        shape = texelFetch(uCellShape, slot, 0);
        center = shape.xy;
      } else {
        center = strokeCenter(id, cellSize);
      }
      vec2 d = painted - center;
      if (dot(d, d) > reach2) continue;
      vec4 stroke;
      if (cached) {
        along = shape.zw;
        stroke = texelFetch(uCellStroke, slot, 0);
      } else {
        stroke = strokeShape(id, center, along);
      }
      float a = dot(d, along) / stroke.x;
      float b = dot(d, vec2(-along.y, along.x)) / (stroke.y * (1.0 - 0.35 * smoothstep(0.1, 1.0, a)));
      if (pow(abs(a), 2.6) + b * b < 1.0 && abs(stroke.z - regionAtPixel) < 0.012) {
        if (stroke.w > bestOrder) {
          bestOrder = stroke.w;
          bestLocal = vec2(a, b);
          bestCenter = center;
          bestSeed = hash12(id + 19.19);
          bestRegion = stroke.z;
        }
      }
    }
  }

  float height = 0.0;
  vec3 color = base;
  if (bestOrder >= 0.0) {
    float across = abs(bestLocal.y);
    float body = sqrt(max(1.0 - across * across, 0.0)) * (1.0 - smoothstep(0.8, 1.0, abs(bestLocal.x)));
    float groove = 1.0 - abs(valueNoise(vec2(bestLocal.x * 0.8, bestLocal.y * 4.2) + bestSeed * 61.0));
    float lip = exp(-pow((bestLocal.x - 0.8) / 0.12, 2.0)) * (1.0 - across * 0.7);
    float banks = smoothstep(0.6, 0.86, across) * (1.0 - smoothstep(0.86, 1.0, across));
    float gain = bestRegion < 0.25 ? 0.78 : bestRegion < 0.75 ? 1.0 : 0.7;
    height = (0.4 * body + 0.3 * groove * groove * body + 0.34 * lip + 0.2 * banks + bestOrder * 0.16) * gain;
    vec3 dab = texture(uPaint, bestCenter / uResolution).rgb * (0.96 + bestSeed * 0.08);
    color = mix(base, dab, 0.55) * (1.0 - 0.05 * bestLocal.x);
  }
  vec2 weave = sin(pixel / uDpr * vec2(1.05, 1.15));
  float grain = weave.x * weave.y * 0.5 + valueNoise(pixel / uDpr * 0.7) * 0.5;
  height += grain * 0.012;

  vec3 normal = normalize(vec3(-dFdx(height) * uRelief / uDpr, -dFdy(height) * uRelief / uDpr, 1.0));
  float diffuse = dot(normal, uLight) - uLight.z;
  vec3 halfway = normalize(uLight + vec3(0.0, 0.0, 1.0));
  float spec = max(pow(max(dot(normal, halfway), 0.0), 18.0) - pow(halfway.z, 18.0), 0.0);
  color = color * (1.0 + diffuse * 0.8) * (1.0 + grain * 0.03) + uSpecColor * spec * mix(0.1, 0.22, bestRegion);

  color += (hash12(pixel + fract(uTime * 3.7) * 97.0) - 0.5) / 255.0;
  outColor = vec4(color, 1.0);
}
`;
