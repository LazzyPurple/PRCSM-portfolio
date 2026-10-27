import * as THREE from "three";
import { palette } from "../palette";
import { REGION, type SceneUniforms } from "./flow";

const FLOOR_OFFSET = 0.012;
const SHADOW_OPACITY = 0.42;

export function createKoiShadow(geometry: THREE.BufferGeometry, uniforms: SceneUniforms) {
  // Reuse the animated silhouette; projecting it costs no CPU deformation or shadow map.
  // shortcut: floor-only projection; use a shadow map for shadows between koi.
  const material = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3, transparent: true, depthWrite: false,
    uniforms: { uLight: uniforms.uLight, uMaxDepth: uniforms.uMaxDepth, uColor: { value: new THREE.Color(palette.shadow) } },
    vertexShader: `precision highp float;
      in vec3 position,body;uniform mat4 modelViewMatrix,projectionMatrix;
      uniform vec3 uLight;uniform float uMaxDepth;out float vOpacity;
      void main(){
        float drop=max(0.0,position.y+uMaxDepth-${FLOOR_OFFSET});
        vec3 p=position-uLight/max(uLight.y,0.25)*drop;p.y=-uMaxDepth+${FLOOR_OFFSET};
        vOpacity=${SHADOW_OPACITY}*(1.0-0.25*drop/uMaxDepth)*(body.z>0.5?0.55:1.0);
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1);
      }`,
    fragmentShader: `precision highp float;uniform vec3 uColor;in float vOpacity;
      layout(location=0)out vec4 outColor;layout(location=1)out vec4 outFlow;
      void main(){outColor=vec4(uColor,vOpacity);outFlow=vec4(1,0.5,0.95,${REGION.water});}`,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "koi-shadow";
  mesh.frustumCulled = false;
  return mesh;
}
