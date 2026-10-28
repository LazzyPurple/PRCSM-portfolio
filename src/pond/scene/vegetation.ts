import * as THREE from "three";
import { palette } from "../palette";
import { GL_COMMON, REGION, type SceneUniforms } from "./flow";
import { randomSeed } from "./lilyPads";

const FLOWER_CLUSTERS = 30;
const FLOWERS_PER_CLUSTER = 3;
const PETALS = 5;
const ALGAE_BEDS = 14;
const BLADES_PER_BED = 7;
const BLADE_SEGMENTS = 6;
const TAU = Math.PI * 2;
type Point = [number, number, number];

class PlantBatch {
  private positions: number[] = [];
  private colors: number[] = [];
  private motion: number[] = [];
  root = 0;
  phase = 0;
  wind = 0.05;

  triangle(a: Point, b: Point, c: Point, color: THREE.Color) {
    for (const p of [a, b, c]) {
      this.positions.push(...p); this.colors.push(color.r, color.g, color.b);
      this.motion.push(Math.max(0, p[1] - this.root) * this.wind, this.phase);
    }
  }

  mesh(name: string, region: number, uniforms: SceneUniforms) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(this.colors, 3));
    geometry.setAttribute("motion", new THREE.Float32BufferAttribute(this.motion, 2));
    geometry.computeVertexNormals();
    const material = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3, side: THREE.DoubleSide,
      uniforms: { ...uniforms, uRegion: { value: region } },
      vertexShader: `precision highp float;
        in vec3 position,normal,color;in vec2 motion;
        uniform mat4 modelViewMatrix,projectionMatrix;uniform float uTime;
        out vec3 vWorld,vNormal,vColor;
        void main(){
          vec3 p=position;p.x+=sin(uTime*0.65+motion.y+p.y*0.8)*motion.x;
          p.z+=cos(uTime*0.45+motion.y)*motion.x*0.4;
          vWorld=p;vNormal=normal;vColor=color;
          gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1);
        }`,
      fragmentShader: `${GL_COMMON}
        uniform float uRegion;in vec3 vWorld,vNormal,vColor;
        layout(location=0)out vec4 outColor;layout(location=1)out vec4 outFlow;
        void main(){
          outColor=vec4(litColor(vColor,gl_FrontFacing?vNormal:-vNormal,vWorld),1);
          vec2 d=vec2(dFdx(vWorld.y),dFdy(vWorld.y));
          if(dot(d,d)<0.00000001)d=vec2(dFdx(vWorld.x),dFdy(vWorld.x));
          if(dot(d,d)<0.00000001)d=vec2(1,0);
          outFlow=encodeFlow(d,0.12,uRegion);
        }`,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    // Vertex sway stays inside this small margin without rebuilding geometry each frame.
    geometry.computeBoundingSphere();
    geometry.boundingSphere!.radius += 0.2;
    return mesh;
  }
}

export function createFlowers(width: number, height: number, seed: number, uniforms: SceneUniforms) {
  const random = randomSeed(seed + 730), batch = new PlantBatch();
  const petals = palette.flowers.petals.map(color => new THREE.Color(color));
  const stem = new THREE.Color(palette.flowers.stem), leaf = new THREE.Color(palette.flowers.leaf), center = new THREE.Color(palette.flowers.center);
  const size = Math.min(width, height);
  for (let i = 0; i < FLOWER_CLUSTERS; i++) {
    const angle = i / FLOWER_CLUSTERS * TAU + (random() - 0.5) * 0.1;
    const radius = 0.52 + random() * 0.035;
    for (let j = 0; j < FLOWERS_PER_CLUSTER; j++) {
      const x = Math.cos(angle) * width * radius + (random() - 0.5) * size * 0.035;
      const z = Math.sin(angle) * height * radius + (random() - 0.5) * size * 0.035;
      const h = size * (0.045 + random() * 0.03), r = size * (0.008 + random() * 0.004);
      const bend = (random() - 0.5) * h * 0.4, hx = x + bend, hz = z + bend * 0.3;
      batch.phase = random() * TAU;
      const root: Point = [x, 0, z], head: Point = [hx, h, hz];
      batch.triangle(root, [x + r * 0.14, 0, z], head, stem);
      batch.triangle(root, [x, 0, z + r * 0.14], head, stem);
      for (const side of [-1, 1]) batch.triangle([x, h * 0.4, z], [x + side * r * 1.5, h * 0.65, z], [x + side * r * 0.5, h * 0.4, z + r * 0.6], leaf);
      const color = petals[(i + j) % petals.length], twist = random() * TAU;
      for (let p = 0; p < PETALS; p++) {
        const a = twist + p / PETALS * TAU;
        const left: Point = [hx + Math.cos(a - 0.45) * r * 0.8, h + r * 0.1, hz + Math.sin(a - 0.45) * r * 0.8];
        const tip: Point = [hx + Math.cos(a) * r * 1.4, h - r * 0.1, hz + Math.sin(a) * r * 1.4];
        const right: Point = [hx + Math.cos(a + 0.45) * r * 0.8, h + r * 0.1, hz + Math.sin(a + 0.45) * r * 0.8];
        batch.triangle(head, left, tip, color); batch.triangle(head, tip, right, color);
      }
      for (let p = 0; p < 8; p++) {
        const a = p / 8 * TAU, b = (p + 1) / 8 * TAU;
        batch.triangle([hx, h + r * 0.15, hz], [hx + Math.cos(a) * r * 0.3, h + r * 0.15, hz + Math.sin(a) * r * 0.3],
          [hx + Math.cos(b) * r * 0.3, h + r * 0.15, hz + Math.sin(b) * r * 0.3], center);
      }
    }
  }
  return batch.mesh("shore-flowers", REGION.flowers, uniforms);
}

export function createAlgae(width: number, height: number, seed: number, uniforms: SceneUniforms) {
  const random = randomSeed(seed + 848), batch = new PlantBatch();
  const colors = palette.algae.map(color => new THREE.Color(color)), size = Math.min(width, height);
  batch.root = -uniforms.uMaxDepth.value + 0.025; batch.wind = 0.16;
  for (let i = 0; i < ALGAE_BEDS; i++) {
    const angle = i / ALGAE_BEDS * TAU + random() * 0.2, radius = 0.26 + random() * 0.15;
    const cx = Math.cos(angle) * width * radius, cz = Math.sin(angle) * height * radius;
    for (let j = 0; j < BLADES_PER_BED; j++) {
      const x = cx + (random() - 0.5) * size * 0.06, z = cz + (random() - 0.5) * size * 0.06;
      const h = Math.min(0.72, size * (0.035 + random() * 0.04)), w = size * (0.006 + random() * 0.004);
      const a = random() * TAU, bend = (random() - 0.5) * h * 0.65, color = colors[i % colors.length];
      batch.phase = random() * TAU;
      const point = (t: number, side: number): Point => [x + Math.cos(a) * w * side * (1 - t * 0.9) + bend * t * t,
        batch.root + h * t, z + Math.sin(a) * w * side * (1 - t * 0.9) + Math.sin(t * Math.PI) * h * 0.12];
      for (let s = 0; s < BLADE_SEGMENTS; s++) {
        const t = s / BLADE_SEGMENTS, next = (s + 1) / BLADE_SEGMENTS;
        const a = point(t, -1), b = point(t, 1), c = point(next, -1), d = point(next, 1);
        batch.triangle(a, b, c, color); batch.triangle(b, d, c, color);
      }
    }
  }
  return batch.mesh("pond-algae", REGION.algae, uniforms);
}
