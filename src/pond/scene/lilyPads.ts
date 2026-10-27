import * as THREE from "three";
import { palette } from "../palette";
import { flatMaterial, REGION, type SceneUniforms } from "./flow";

const PAD_COUNT = 20;
const SEGMENTS = 36;
export function randomSeed(seed: number) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}
export function createLilyPads(width: number, height: number, seed: number, uniforms: SceneUniforms) {
  const random = randomSeed(seed);
  const group = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  for (let i = 0; i <= SEGMENTS; i++) {
    const angle = 0.16 + i / SEGMENTS * (Math.PI * 2 - 0.32);
    shape.lineTo(Math.cos(angle), Math.sin(angle));
  }
  shape.lineTo(0, 0);
  const geometry = new THREE.ShapeGeometry(shape);
  geometry.rotateX(-Math.PI / 2);
  const material = flatMaterial(palette.lily.light, REGION.lily, uniforms);
  const dark = flatMaterial(palette.lily.dark, REGION.lily, uniforms);
  const pads: { mesh: THREE.Mesh; x: number; z: number; radius: number; phase: number }[] = [];
  const projectPads: THREE.Mesh[] = [];
  for (let i = 0; i < PAD_COUNT; i++) {
    const project = i < 3;
    const radius = Math.min(width, height) * (project ? 0.065 : 0.023 + random() * 0.019);
    const x = project ? width * (0.26 + (i % 2) * 0.12) : (random() - 0.5) * width * 0.87;
    const z = project ? height * (-0.22 + i * 0.11) : -height * (0.18 + random() * 0.29);
    const mesh = new THREE.Mesh(geometry, i % 4 === 0 ? dark : material);
    mesh.scale.setScalar(radius);
    mesh.rotation.y = random() * Math.PI * 2;
    mesh.position.set(x, 0.025 + i * 0.0005, z);
    group.add(mesh);
    pads.push({ mesh, x, z, radius, phase: random() * Math.PI * 2 });
    if (project) projectPads.push(mesh);
  }
  return { group, projectPads, update(time: number) {
    for (let i = 0; i < pads.length; i++) {
      const p = pads[i];
      p.mesh.position.x = p.x + Math.sin(time * 0.12 + p.phase) * 0.035;
      p.mesh.position.z = p.z + Math.cos(time * 0.1 + p.phase) * 0.025;
      p.mesh.rotation.z = Math.sin(time * 0.4 + p.phase) * 0.018;
      const field = uniforms.uPads.value;
      field[i * 4] = p.mesh.position.x; field[i * 4 + 1] = p.mesh.position.z; field[i * 4 + 2] = p.radius;
      field[i * 4 + 3] = p.mesh.rotation.y;
    }
  } };
}
