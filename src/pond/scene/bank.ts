import * as THREE from "three";
import { palette } from "../palette";
import { flatMaterial, REGION, type SceneUniforms } from "./flow";
import { randomSeed } from "./lilyPads";

const STONES = 180;
const GRASSES = 210;
export function createBank(width: number, height: number, seed: number, uniforms: SceneUniforms) {
  const random = randomSeed(seed + 19);
  const group = new THREE.Group();
  const ground = new THREE.Shape();
  ground.moveTo(-width * 3, -height * 3);
  ground.lineTo(width * 3, -height * 3); ground.lineTo(width * 3, height * 3);
  ground.lineTo(-width * 3, height * 3); ground.closePath();
  const hole = new THREE.Path();
  hole.absellipse(0, 0, width * 0.49, height * 0.49, 0, Math.PI * 2, true);
  ground.holes.push(hole);
  const groundGeometry = new THREE.ShapeGeometry(ground, 64);
  groundGeometry.rotateX(-Math.PI / 2);
  const groundMesh = new THREE.Mesh(groundGeometry, flatMaterial(palette.bank.dark, REGION.bank, uniforms));
  groundMesh.position.y = -0.05;
  group.add(groundMesh);
  const stoneGeometry = new THREE.IcosahedronGeometry(1, 1);
  const stoneMaterial = flatMaterial(palette.bank.light, REGION.bank, uniforms);
  // Bake the small static bank once to keep its draw calls bounded.
  const vertices: number[] = [], normals: number[] = [];
  const matrix = new THREE.Matrix4();
  const rotation = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const point = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const normalMatrix = new THREE.Matrix3();
  for (let i = 0; i < STONES; i++) {
    const a = i / STONES * Math.PI * 2;
    const x = Math.cos(a) * width * (0.49 + random() * 0.04);
    const z = Math.sin(a) * height * (0.49 + random() * 0.04);
    const radius = Math.min(width, height) * (0.024 + random() * 0.019);
    position.set(x, -radius * 0.12, z);
    scale.set(radius * (1.1 + random()), radius * 0.55, radius);
    rotation.setFromEuler(new THREE.Euler(random(), random() * Math.PI, random()));
    matrix.compose(position, rotation, scale);
    normalMatrix.getNormalMatrix(matrix);
    const pos = stoneGeometry.attributes.position;
    const norm = stoneGeometry.attributes.normal;
    for (let j = 0; j < pos.count; j++) {
      point.fromBufferAttribute(pos, j).applyMatrix4(matrix);
      normal.fromBufferAttribute(norm, j).applyNormalMatrix(normalMatrix);
      vertices.push(point.x, point.y, point.z); normals.push(normal.x, normal.y, normal.z);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(vertices.length / 3 * 2), 2));
  group.add(new THREE.Mesh(geometry, stoneMaterial));
  stoneGeometry.dispose();
  const grassPositions: number[] = [];
  for (let i = 0; i < GRASSES; i++) {
    const a = random() * Math.PI * 2;
    const x = Math.cos(a) * width * 0.53, z = Math.sin(a) * height * 0.53;
    const h = Math.min(width, height) * (0.025 + random() * 0.04);
    const w = h * 0.08, bend = (random() - 0.5) * h;
    grassPositions.push(x - w, 0, z, x + w, 0, z, x + bend, h, z + h * 0.2);
  }
  const grass = new THREE.BufferGeometry();
  grass.setAttribute("position", new THREE.Float32BufferAttribute(grassPositions, 3));
  grass.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(grassPositions.length / 3 * 2), 2));
  grass.computeVertexNormals();
  group.add(new THREE.Mesh(grass, flatMaterial(palette.bank.grass, REGION.bank, uniforms)));
  return group;
}
