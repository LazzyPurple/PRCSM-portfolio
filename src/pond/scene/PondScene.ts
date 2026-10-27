import * as THREE from "three";
import { palette } from "../palette";
import { PELLET_LIFE, PELLET_SINK, BITE_LIFE, RIPPLE_SPEED, smoothstep, type World } from "../sim/world";
import { createKoi } from "./koiMesh";
import { createBottom } from "./bottom";
import { createLilyPads } from "./lilyPads";
import { createBank } from "./bank";
import { createWater, fullscreenScene, FULLSCREEN_VS } from "./water";
import { flatMaterial, REGION, sharedUniforms } from "./flow";
import { PaintPipeline } from "../paint/strokePass";
import { GpuClock, Scaler, pickTier } from "../paint/budget";

const SCALE = 0.01;
const MAX_DEPTH = 1.5;
const FOV = 40;
const PORTRAIT_FOV = 50;
const LANDSCAPE_FRAMING = 0.73;
const PORTRAIT_FRAMING = 1;
const INCLINATION = 55 * Math.PI / 180;
const MAX_PELLETS = 24;
const MAX_BITES = 24;

export class PondScene {
  mrtReady = false;
  gpuMs: number | null = null;
  cpuMs = 0;
  readonly scaler = new Scaler();
  private tier = pickTier();
  private clock: GpuClock;
  private gl: WebGL2RenderingContext;
  private gpuSamples = new Float64Array(512);
  private gpuCount = 0;
  private cpuSamples = new Float64Array(512);
  private cpuCount = 0;
  readonly renderer: THREE.WebGLRenderer;
  readonly camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 200);
  readonly scene = new THREE.Scene();
  readonly uniforms = sharedUniforms();
  readonly raycaster = new THREE.Raycaster();
  readonly plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  readonly hit = new THREE.Vector3();
  private ndc = new THREE.Vector2();
  private water = createWater(this.uniforms);
  private composite = fullscreenScene(this.water);
  private displayMaterial = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3, vertexShader: FULLSCREEN_VS, depthTest: false, depthWrite: false,
    uniforms: { uSource: { value: null } },
    fragmentShader: `precision highp float;uniform sampler2D uSource;in vec2 vUv;out vec4 outColor;void main(){outColor=vec4(texture(uSource,vUv).rgb,1);}`,
  });
  private display = fullscreenScene(this.displayMaterial);
  private opaque = new THREE.WebGLRenderTarget(1, 1, { count: 2 });
  readonly target = new THREE.WebGLRenderTarget(1, 1, { count: 2, depthBuffer: false });
  private koi: ReturnType<typeof createKoi>[] = [];
  private lilies: ReturnType<typeof createLilyPads> | null = null;
  private pellets: THREE.Mesh[] = [];
  private bites: THREE.Mesh[] = [];
  private decoration = new THREE.Group();
  private width = 1;
  private height = 1;
  private worldWidth = 1;
  private worldHeight = 1;
  private seed = 90210;
  private daylight = new THREE.Color(palette.light.day);
  private dusk = new THREE.Color(palette.light.dusk);
  private duskSky = palette.sky.dusk.map(color => new THREE.Color(color));
  private daySky = palette.sky.day.map(color => new THREE.Color(color));
  private sun = new THREE.DirectionalLight(palette.light.day, 2);
  private hemisphere = new THREE.HemisphereLight(palette.light.hemisphere, palette.light.ground, 1);
  private paint: PaintPipeline;
  private screenLight = new THREE.Vector3();
  readonly simulationPoint = { x: 0, y: 0 };

  constructor(readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.sortObjects = false;
    this.renderer.setClearColor(palette.water.deep, 1);
    this.paint = new PaintPipeline(this.renderer);
    const gl = this.renderer.getContext();
    if (!(gl instanceof WebGL2RenderingContext)) throw new Error("WebGL2 is required");
    this.gl = gl;
    this.clock = new GpuClock(gl);
    this.renderer.debug.onShaderError = () => { throw new Error("Pond shader compilation failed"); };
    this.uniforms.uMaxDepth.value = MAX_DEPTH;
    this.scene.add(this.decoration, this.sun, this.hemisphere);
    this.water.uniforms.uColor.value = this.opaque.textures[0];
    this.water.uniforms.uFlow.value = this.opaque.textures[1];
  }

  resize(width: number, height: number, scale = 1) {
    this.width = width; this.height = height;
    const dpr = Math.min(devicePixelRatio || 1, this.tier.dprCap, Math.sqrt(this.tier.pixelBudget / (width * height))) * scale;
    const w = Math.max(1, Math.round(width * dpr)), h = Math.max(1, Math.round(height * dpr));
    this.renderer.setSize(w, h, false);
    this.uniforms.uTargetSize.value.set(w, h);
    this.opaque.setSize(w, h); this.target.setSize(w, h);
    this.paint.resize(w, h, width);
    this.camera.aspect = width / height;
    this.camera.fov = width < height ? PORTRAIT_FOV : FOV;
    const tangent = Math.tan(this.camera.fov * Math.PI / 360);
    const framing = width < height ? PORTRAIT_FRAMING : LANDSCAPE_FRAMING;
    const distance = Math.max(height * SCALE / Math.sin(INCLINATION), width * SCALE / this.camera.aspect) / (2 * tangent) * framing;
    this.camera.position.set(0, distance * Math.sin(INCLINATION), distance * Math.cos(INCLINATION));
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix(); this.camera.updateMatrixWorld();
    this.water.uniforms.uInverse.value.multiplyMatrices(this.camera.matrixWorld, this.camera.projectionMatrixInverse);
    this.water.uniforms.uCamera.value.copy(this.camera.position);
    this.worldWidth = width; this.worldHeight = height;
  }

  rebuild(world: World, seed = this.seed) {
    this.seed = seed;
    this.disposeGroup(this.decoration);
    this.decoration.clear(); this.koi.length = 0; this.pellets.length = 0; this.bites.length = 0;
    const w = world.width * SCALE, h = world.height * SCALE;
    this.worldWidth = world.width; this.worldHeight = world.height;
    this.decoration.add(createBottom(w, h, this.uniforms), createBank(w, h, seed, this.uniforms));
    this.lilies = createLilyPads(w, h, seed, this.uniforms);
    this.decoration.add(this.lilies.group);
    for (const fish of world.koi) { const koi = createKoi(fish, this.uniforms); this.koi.push(koi); this.decoration.add(koi.mesh); }
    const sphere = new THREE.SphereGeometry(1, 6, 4);
    const foodMaterial = flatMaterial(palette.food, REGION.food, this.uniforms);
    const biteMaterial = flatMaterial(palette.koi.white, REGION.food, this.uniforms);
    for (let i = 0; i < MAX_PELLETS + MAX_BITES; i++) {
      const mesh = new THREE.Mesh(sphere, i < MAX_PELLETS ? foodMaterial : biteMaterial);
      mesh.visible = false;
      this.decoration.add(mesh);
      (i < MAX_PELLETS ? this.pellets : this.bites).push(mesh);
    }
  }

  project(screenX: number, screenY: number) {
    this.ndc.set(screenX / this.width * 2 - 1, 1 - screenY / this.height * 2);
    this.raycaster.setFromCamera(this.ndc, this.camera);
    if (!this.raycaster.ray.intersectPlane(this.plane, this.hit)) return null;
    this.simulationPoint.x = this.hit.x / SCALE + this.worldWidth / 2;
    this.simulationPoint.y = this.hit.z / SCALE + this.worldHeight / 2;
    return this.simulationPoint;
  }

  private receiveGpu = (ms: number) => {
    this.gpuMs = ms;
    this.gpuSamples[this.gpuCount++ % this.gpuSamples.length] = ms;
    this.scaler.gpu(ms, performance.now());
  };

  render(world: World, hour: number, view: string, dt: number, pointer: { x: number; y: number; active: boolean }) {
    const previous = this.scaler.scale;
    this.clock.collect(this.receiveGpu);
    const start = performance.now();
    this.clock.start(true);
    try { this.renderFrame(world, hour, view, dt, pointer); } finally { this.clock.stop(); }
    this.cpuMs = performance.now() - start;
    this.cpuSamples[this.cpuCount++ % this.cpuSamples.length] = this.cpuMs;
    if (!this.clock.available && dt > 0) this.scaler.frame(dt * 1000, this.cpuMs, start);
    if (previous !== this.scaler.scale) this.resize(this.width, this.height, this.scaler.scale);
  }

  private renderFrame(world: World, hour: number, view: string, dt: number, pointer: { x: number; y: number; active: boolean }) {
    this.uniforms.uTime.value = world.time;
    this.uniforms.uLight.value.set(-0.5 + hour * 0.85, 0.9 - hour * 0.55, 0.3).normalize();
    this.uniforms.uLightColor.value.copy(this.daylight).lerp(this.dusk, hour);
    this.sun.position.copy(this.uniforms.uLight.value).multiplyScalar(20);
    this.sun.color.copy(this.uniforms.uLightColor.value);
    for (let i = 0; i < 3; i++) this.water.uniforms.uSky.value[i].copy(this.daySky[i]).lerp(this.duskSky[i], hour);
    const ox = -world.width * SCALE / 2, oz = -world.height * SCALE / 2;
    for (const k of this.koi) k.update(SCALE, ox, oz);
    this.lilies?.update(world.time);
    for (let i = 0; i < this.pellets.length; i++) {
      const mesh = this.pellets[i], p = world.pellets[i]; mesh.visible = !!p;
      if (!p) continue;
      const age = world.time - p.born, sink = smoothstep(PELLET_SINK, PELLET_LIFE, age);
      mesh.position.set(p.x * SCALE + ox, p.landed ? -sink * MAX_DEPTH : (1 - age / p.landAt) * 0.3, p.y * SCALE + oz);
      mesh.scale.set(0.027 * (1 - sink * 0.8), 0.012, 0.027 * (1 - sink * 0.8));
    }
    for (let i = 0; i < this.bites.length; i++) {
      const mesh = this.bites[i], b = world.bites[i]; mesh.visible = !!b;
      if (!b) continue;
      const fade = 1 - (world.time - b.born) / BITE_LIFE;
      mesh.position.set(b.x * SCALE + ox, 0.035, b.y * SCALE + oz); mesh.scale.set(0.07 * fade, 0.01, 0.07 * fade);
    }
    const count = Math.min(32, world.ripples.length), rippleData = this.water.uniforms.uRipples.value;
    this.water.uniforms.uRippleCount.value = count;
    this.water.uniforms.uRippleSpeed.value = RIPPLE_SPEED * SCALE;
    for (let i = 0; i < count; i++) {
      const r = world.ripples[world.ripples.length - count + i];
      const at = i * 4; rippleData[at] = r.x * SCALE + ox; rippleData[at + 1] = r.y * SCALE + oz;
      rippleData[at + 2] = world.time - r.born; rippleData[at + 3] = r.strength;
    }
    this.renderer.setRenderTarget(this.opaque);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(this.target);
    this.renderer.render(this.composite.scene, this.composite.camera);
    if (!this.mrtReady) {
      const gl = this.renderer.getContext();
      this.mrtReady = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
      if (!this.mrtReady) throw new Error("Pond MRT framebuffer is incomplete");
    }
    if (view === "final" || view === "paint") {
      this.screenLight.copy(this.uniforms.uLight.value).transformDirection(this.camera.matrixWorldInverse);
      this.screenLight.z = Math.abs(this.screenLight.z);
      this.screenLight.normalize();
      const result = this.paint.render(this.target.textures[0], this.target.textures[1], this.width, this.height, dt,
        world.time, pointer, this.screenLight, this.uniforms.uLightColor.value, view);
      if (!result) return;
      this.displayMaterial.uniforms.uSource.value = result;
    } else this.displayMaterial.uniforms.uSource.value = this.target.textures[view === "flow" ? 1 : 0];
    this.renderer.setRenderTarget(null); this.renderer.render(this.display.scene, this.display.camera);
  }

  restore() {
    this.clock = new GpuClock(this.gl);
    this.mrtReady = false;
  }

  stats() {
    const summary = (samples: Float64Array, count: number) => {
      const values = Array.from(samples.subarray(0, Math.min(count, samples.length))).sort((a, b) => a - b);
      return values.length ? { count, median: values[values.length >> 1], p95: values[Math.min(values.length - 1, Math.floor(values.length * 0.95))] } : null;
    };
    const gl = this.renderer.getContext(), info = gl.getExtension("WEBGL_debug_renderer_info");
    return { gpu: summary(this.gpuSamples, this.gpuCount), cpu: summary(this.cpuSamples, this.cpuCount),
      gpuName: info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
      timerAvailable: this.clock.available, scale: this.scaler.scale,
      width: this.canvas.width, height: this.canvas.height, cssWidth: this.width, cssHeight: this.height,
      memory: { ...this.renderer.info.memory }, calls: this.renderer.info.render.calls };
  }

  private disposeGroup(group: THREE.Object3D) {
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
    group.traverse(object => { if (object instanceof THREE.Mesh) {
      geometries.add(object.geometry);
      if (Array.isArray(object.material)) for (const m of object.material) materials.add(m); else materials.add(object.material);
    } });
    for (const g of geometries) g.dispose(); for (const m of materials) m.dispose();
  }

  dispose() {
    this.clock.dispose();
    this.disposeGroup(this.decoration);
    this.opaque.dispose(); this.target.dispose();
    this.water.dispose(); this.composite.geometry.dispose();
    this.displayMaterial.dispose(); this.display.geometry.dispose();
    this.paint.dispose();
    this.renderer.dispose();
  }
}
