// encodeFlow adapted from Ardia apps/site/src/scripts/meadow/shaders.ts.
// https://github.com/mantrakp04/ardia — Copyright 2026 Mantra Patel, Apache-2.0.
// SPDX-License-Identifier: Apache-2.0
// Modified: pond regions, lighting and underwater shading.
import * as THREE from "three";
import { palette } from "../palette";

export const REGION = { water: 0.15, reflection: 0.24, bank: 0.9, lily: 0.8, flowers: 0.84, algae: 0.74, food: 0.96, koi: 0.4, koiStep: 0.035 } as const;
export const GL_COMMON = `
precision highp float;
precision highp int;
uniform vec3 uLight;
uniform vec3 uLightColor;
uniform vec3 uWater;
uniform float uTime;
uniform float uMaxDepth;
uniform float uAmbient;
uniform float uShadowStrength;
uniform vec4 uPads[20];
float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123); }
float noise(vec2 p) {
 vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);
 return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);
}
vec4 encodeFlow(vec2 dir,float scale,float region) {
 float angle=atan(dir.y,dir.x);
 return vec4(cos(2.0*angle)*0.5+0.5,sin(2.0*angle)*0.5+0.5,scale,region);
}
float leafShadow(vec3 p) {
 float shade=0.0;
 for(int i=0;i<20;i++) {
  vec2 offset=uPads[i].xy + uLight.xz/max(uLight.y,0.25)*(p.y-0.03);
  vec2 d=(p.xz-offset)/max(uPads[i].z,0.001);
  float a=uPads[i].w;d=mat2(cos(a),sin(a),-sin(a),cos(a))*d;
  float softness=0.04+max(-p.y,0.0)*0.11;
  float notch=step(0.0,d.x)*(1.0-smoothstep(0.10,0.22+softness,abs(atan(d.y,d.x))));
  float mask=(1.0-smoothstep(1.0-softness,1.0+softness,length(d)))*(1.0-notch);
  shade=max(shade,mask*0.48*(1.0-smoothstep(-0.04,0.01,p.y)));
 }
 return 1.0-shade*uShadowStrength;
}
vec3 litColor(vec3 albedo,vec3 n,vec3 p) {
 float diffuse=0.55+0.45*max(dot(normalize(n),uLight),0.0);
 vec3 color=albedo*(vec3(uAmbient)+uLightColor*diffuse*0.7);
 float fog=1.0-exp(-max(-p.y,0.0)*1.2);
 return mix(color,uWater,fog*0.72)*leafShadow(p);
}
`;

export const SCENE_VS = `precision highp float;
in vec3 position; in vec3 normal; in vec2 uv;
uniform mat4 modelMatrix; uniform mat4 viewMatrix; uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;
out vec3 vWorld; out vec3 vNormal; out vec2 vUv;
void main(){ vWorld=(modelMatrix*vec4(position,1)).xyz; vNormal=mat3(modelMatrix)*normal; vUv=uv;
 gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1); }`;

export function sharedUniforms() {
  return {
    uTime: { value: 0 }, uLight: { value: new THREE.Vector3(-0.5, 0.8, 0.3).normalize() },
    uLightColor: { value: new THREE.Color(palette.light.day) }, uWater: { value: new THREE.Color(palette.water.middle) },
    uMaxDepth: { value: 1.5 }, uPads: { value: new Float32Array(20 * 4) },
    uAmbient: { value: 0.38 }, uShadowStrength: { value: 1 },
    uTargetSize: { value: new THREE.Vector2(1, 1) },
  };
}
export type SceneUniforms = ReturnType<typeof sharedUniforms>;

export function flatMaterial(color: string, region: number, uniforms: SceneUniforms, strokeScale = 0.55) {
  return new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3, vertexShader: SCENE_VS, side: THREE.DoubleSide,
    uniforms: { ...uniforms, uColor: { value: new THREE.Color(color) }, uRegion: { value: region }, uStrokeScale: { value: strokeScale } },
    fragmentShader: `${GL_COMMON}
     uniform vec3 uColor; uniform float uRegion,uStrokeScale;
     in vec3 vWorld; in vec3 vNormal; in vec2 vUv;
     layout(location=0) out vec4 outColor; layout(location=1) out vec4 outFlow;
     void main(){outColor=vec4(litColor(uColor*(0.96+0.08*noise(vWorld.xz*8.0)),vNormal,vWorld),1);
      vec2 d=vec2(dFdx(vWorld.x),dFdy(vWorld.x));outFlow=encodeFlow(d,uStrokeScale,uRegion);}`,
  });
}
