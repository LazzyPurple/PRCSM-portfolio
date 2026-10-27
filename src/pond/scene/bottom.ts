import * as THREE from "three";
import { palette } from "../palette";
import { GL_COMMON, REGION, SCENE_VS, type SceneUniforms } from "./flow";

export function createBottom(width: number, height: number, uniforms: SceneUniforms) {
  const geometry = new THREE.PlaneGeometry(width * 4, height * 4, 1, 1);
  geometry.rotateX(-Math.PI / 2);
  const material = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3, vertexShader: SCENE_VS,
    uniforms: { ...uniforms, uSilt: { value: new THREE.Color(palette.bottom.silt) },
      uPebble: { value: new THREE.Color(palette.bottom.pebble) }, uAlgae: { value: new THREE.Color(palette.bottom.algae) },
      uSize: { value: new THREE.Vector2(width, height) } },
    fragmentShader: `${GL_COMMON}
    uniform vec3 uSilt,uPebble,uAlgae; uniform vec2 uSize;
    in vec3 vWorld; in vec3 vNormal; in vec2 vUv;
    layout(location=0) out vec4 outColor; layout(location=1) out vec4 outFlow;
    void main(){
     vec2 p=vWorld.xz;
     float cloud=noise(p*0.7)*0.6+noise(p*2.2)*0.4;
     float pebbles=smoothstep(0.6,0.83,noise(p*15.0));
     vec3 albedo=mix(uSilt,uPebble,pebbles*0.46);
     albedo=mix(albedo,uAlgae,smoothstep(0.57,0.8,cloud)*0.8);
     float center=1.0-smoothstep(0.12,0.7,length(p/uSize));
     albedo*=1.0-center*0.28;
     float caustic=pow(1.0-abs(noise(p*3.0+uTime*0.08)-noise(p*3.2-uTime*0.05)),32.0);
     outColor=vec4(litColor(albedo,vNormal,vWorld)+uLightColor*caustic*0.025,1);
     outFlow=encodeFlow(vec2(1,0.18*sin(p.y)),0.95,${REGION.water});
    }`,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = -uniforms.uMaxDepth.value;
  return mesh;
}
