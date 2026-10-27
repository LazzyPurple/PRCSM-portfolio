// Body wave and fin flare adapted from Dao-Ho/portfolio koi-pond/renderer.ts. See CREDITS.md.
import * as THREE from "three";
import { palette } from "../palette";
import { bodyHalfWidth } from "../sim/shape";
import { koiMarkings } from "../sim/markings";
import { clamp, KOI_NODES, type Koi } from "../sim/world";
import { GL_COMMON, REGION, type SceneUniforms } from "./flow";

const RINGS = 20;
const SIDES = 12;
const BODY_END = 0.74;
const FIN_STEPS = 12;
const MAX_RED = 4;
const MAX_BLACK = 6;
const VS = `precision highp float;
in vec3 position,normal,tangent; in vec3 body;
uniform mat4 modelViewMatrix,projectionMatrix;
uniform vec2 uTargetSize;
out vec3 vWorld,vNormal; out vec3 vBody; out vec2 vDirection;
void main(){vWorld=position;vNormal=normal;vBody=body;
 vec4 clip=projectionMatrix*modelViewMatrix*vec4(position,1);
 vec4 ahead=projectionMatrix*modelViewMatrix*vec4(position+tangent*0.05,1);
 vDirection=(ahead.xy/ahead.w-clip.xy/clip.w)*uTargetSize;
 gl_Position=clip;}`;

export function createKoi(koi: Koi, uniforms: SceneUniforms) {
  const params: number[] = [];
  const indices: number[] = [];
  // Parameters stay in body coordinates; only the preallocated GPU buffers move.
  for (let r = 0; r < RINGS; r++) for (let j = 0; j <= SIDES; j++) {
    params.push(r / (RINGS - 1) * BODY_END, j / SIDES * Math.PI * 2, 0, 0);
    if (r < RINGS - 1 && j < SIDES) {
      const n = r * (SIDES + 1) + j;
      indices.push(n, n + SIDES + 1, n + 1, n + 1, n + SIDES + 1, n + SIDES + 2);
    }
  }
  const fin = (root: number, reach: number, width: number, side: number, kind: number) => {
    const start = params.length / 4;
    for (let i = 0; i <= FIN_STEPS; i++) {
      const t = i / FIN_STEPS;
      const s = root + reach * t;
      params.push(s, side * bodyHalfWidth(root) * 0.7, kind, side);
      params.push(s + reach * 0.28 * Math.sin(t * Math.PI), side * (bodyHalfWidth(root) * 0.7 + Math.sin(t * Math.PI) * width), kind, side);
      if (i < FIN_STEPS) { const n = start + i * 2; indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2); }
    }
  };
  fin(0.19, 0.18, 0.15, -1, 1); fin(0.19, 0.18, 0.15, 1, 1);
  fin(0.47, 0.12, 0.065, -1, 1); fin(0.47, 0.12, 0.065, 1, 1);
  fin(0.28, 0.31, 0.07, 1, 2);
  const tailStart = params.length / 4;
  for (let r = 0; r <= FIN_STEPS; r++) for (let j = 0; j <= SIDES; j++) {
    const across = j / SIDES * 2 - 1;
    const t = r / FIN_STEPS;
    params.push(0.70 + t * (0.16 + 0.14 * Math.abs(across)), across * (0.03 + 0.15 * Math.pow(t, 0.8)), 3, across);
    if (r < FIN_STEPS && j < SIDES) {
      const n = tailStart + r * (SIDES + 1) + j;
      indices.push(n, n + 1, n + SIDES + 1, n + 1, n + SIDES + 2, n + SIDES + 1);
    }
  }
  const count = params.length / 4;
  const positions = new Float32Array(count * 3), normals = new Float32Array(count * 3);
  const body = new Float32Array(count * 3), tangents = new Float32Array(count * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(indices);
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute("tangent", new THREE.BufferAttribute(tangents, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute("body", new THREE.BufferAttribute(body, 3).setUsage(THREE.DynamicDrawUsage));
  const markings = koiMarkings(koi);
  const red = new Float32Array(MAX_RED * 4), black = new Float32Array(MAX_BLACK * 4);
  for (let i = 0; i < markings.red.length; i++) { const p = markings.red[i]; red.set([p.s, p.v, p.rs, p.rv], i * 4); }
  for (let i = 0; i < markings.black.length; i++) { const p = markings.black[i]; black.set([p.s, p.v, p.rs, p.rv], i * 4); }
  const material = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3, vertexShader: VS, side: THREE.DoubleSide,
    uniforms: { ...uniforms, uWhite: { value: new THREE.Color(palette.koi.white) }, uRed: { value: new THREE.Color(palette.koi.vermilion) },
      uInk: { value: new THREE.Color(palette.koi.ink) }, uRedPatches: { value: red }, uBlackPatches: { value: black },
      uRedCount: { value: markings.red.length }, uBlackCount: { value: markings.black.length },
      uRegion: { value: REGION.koi + (koi.id - 1) * REGION.koiStep }, uId: { value: koi.id } },
    fragmentShader: `${GL_COMMON}
    uniform vec3 uWhite,uRed,uInk; uniform vec4 uRedPatches[${MAX_RED}],uBlackPatches[${MAX_BLACK}];
    uniform int uRedCount,uBlackCount; uniform float uRegion,uId;
    in vec3 vWorld,vNormal,vBody; in vec2 vDirection;
    layout(location=0) out vec4 outColor; layout(location=1) out vec4 outFlow;
    bool inMarking(vec4 p,vec2 body,float wobble){vec2 d=(body-p.xy)/p.zw;return dot(d,d)<1.0+wobble;}
    void main(){
     float s=vBody.x,v=vBody.y,fin=vBody.z;
     float wobble=(noise(vec2(s*14.0+uId,v*30.0))-0.5)*0.6;
     vec3 color=uWhite;
     if(fin<0.5 && abs(v)<0.9*0.135 && s<0.74){
      for(int i=0;i<${MAX_RED};i++){if(i>=uRedCount)break;if(inMarking(uRedPatches[i],vec2(s,v),wobble))color=uRed;}
      for(int i=0;i<${MAX_BLACK};i++){if(i>=uBlackCount)break;if(inMarking(uBlackPatches[i],vec2(s,v),wobble))color=uInk;}
     }
     float eye=1.0-smoothstep(0.008,0.016,length(vec2((s-0.085)*1.1,abs(v)-0.067)));
     if(fin<0.5) color=mix(color,uInk,eye);
     if(fin>0.5){float rays=pow(abs(sin(v*380.0+s*160.0)),16.0);color*=0.85+0.15*rays;}
     float sheen=pow(max(dot(normalize(vNormal),normalize(uLight+vec3(0,1,0))),0.0),18.0)*0.12;
     color=litColor(color,vNormal,vWorld)+uLightColor*sheen*exp(vWorld.y);
     outColor=vec4(color,1);outFlow=encodeFlow(vDirection,0.08,uRegion);
    }`,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  const spine = new Float32Array(KOI_NODES * 2);
  return { mesh, update(scale: number, offsetX: number, offsetZ: number) {
    const L = koi.length;
    const swim = 0.2 + 1.1 * koi.beat;
    for (let n = 0; n < KOI_NODES; n++) {
      const s = n / (KOI_NODES - 1), a = Math.max(0, n - 1), b = Math.min(KOI_NODES - 1, n + 1);
      let tx = koi.nodes[a * 2] - koi.nodes[b * 2], ty = koi.nodes[a * 2 + 1] - koi.nodes[b * 2 + 1];
      const len = Math.hypot(tx, ty) || 1; tx /= len; ty /= len;
      const off = L * 0.04 * (0.05 + 0.95 * Math.pow(s, 2.2)) * swim * Math.sin(koi.phase - s * 4.6);
      spine[n * 2] = koi.nodes[n * 2] - ty * off; spine[n * 2 + 1] = koi.nodes[n * 2 + 1] + tx * off;
    }
    const bank = clamp(koi.turn * 0.6, -0.35, 0.35), spread = 1 - 0.25 * koi.beat;
    const scull = 0.18 * (1 - koi.beat) * Math.sin(koi.finPhase);
    for (let i = 0; i < count; i++) {
      const s = params[i * 4], param = params[i * 4 + 1], kind = params[i * 4 + 2], side = params[i * 4 + 3];
      const index = Math.min(KOI_NODES - 2, Math.floor(s * (KOI_NODES - 1))), f = s * (KOI_NODES - 1) - index;
      const ax = spine[index * 2], az = spine[index * 2 + 1];
      let tx = ax - spine[(index + 1) * 2], tz = az - spine[(index + 1) * 2 + 1];
      const len = Math.hypot(tx, tz) || 1; tx /= len; tz /= len;
      const x = ax - tx * len * f, z = az - tz * len * f;
      const width = bodyHalfWidth(s);
      const flare = spread + (side > 0 ? -scull + bank : scull - bank);
      const across = kind === 0 ? Math.cos(param) * width : kind === 2 ? 0 : param * flare;
      const up = kind === 0 ? Math.sin(param) * width * (Math.sin(param) > 0 ? 0.64 : 0.48)
        : kind === 2 ? Math.abs(param) : Math.sin(koi.finPhase + s * 9) * Math.abs(across) * 0.17;
      const o = i * 3;
      positions[o] = (x - tz * across * L) * scale + offsetX;
      positions[o + 1] = -(1 - koi.depth) * uniforms.uMaxDepth.value + up * L * scale;
      positions[o + 2] = (z + tx * across * L) * scale + offsetZ;
      normals[o] = kind === 0 ? -tz * Math.cos(param) : 0;
      normals[o + 1] = kind === 0 ? Math.sin(param) / 0.6 : 1;
      normals[o + 2] = kind === 0 ? tx * Math.cos(param) : 0;
      tangents[o] = tx; tangents[o + 1] = 0; tangents[o + 2] = tz;
      body[o] = s; body[o + 1] = across; body[o + 2] = kind;
    }
    geometry.attributes.position.needsUpdate = true; geometry.attributes.normal.needsUpdate = true;
    geometry.attributes.tangent.needsUpdate = true; geometry.attributes.body.needsUpdate = true;
  } };
}
