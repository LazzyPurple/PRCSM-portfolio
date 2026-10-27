import * as THREE from "three";
import { palette } from "../palette";
import { GL_COMMON, REGION, type SceneUniforms } from "./flow";

export const FULLSCREEN_VS = `precision highp float;
in vec3 position; out vec2 vUv;
void main(){vUv=position.xy*0.5+0.5;gl_Position=vec4(position.xy,0,1);}`;

export function createWater(uniforms: SceneUniforms) {
  const material = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3, vertexShader: FULLSCREEN_VS, depthTest: false, depthWrite: false,
    uniforms: { ...uniforms, uColor: { value: null }, uFlow: { value: null },
      uInverse: { value: new THREE.Matrix4() }, uCamera: { value: new THREE.Vector3() },
      uRipples: { value: new Float32Array(32 * 4) }, uRippleCount: { value: 0 },
      uRippleSpeed: { value: 0.52 }, uSky: { value: [new THREE.Color(palette.sky.day[0]), new THREE.Color(palette.sky.day[1]), new THREE.Color(palette.sky.day[2])] } },
    fragmentShader: `${GL_COMMON}
    uniform sampler2D uColor,uFlow;uniform mat4 uInverse;uniform vec3 uCamera;
    uniform vec4 uRipples[32];uniform int uRippleCount;uniform float uRippleSpeed;uniform vec3 uSky[3];
    in vec2 vUv;layout(location=0)out vec4 outColor;layout(location=1)out vec4 outFlow;
    void main(){
     vec4 farPoint=uInverse*vec4(vUv*2.0-1.0,1,1);
     vec3 ray=normalize(farPoint.xyz/farPoint.w-uCamera);
     vec3 point=uCamera+ray*(-uCamera.y/ray.y);
     vec2 gradient=vec2(noise(point.xz*2.0+uTime*0.06)-0.5,noise(point.xz*2.0+5.0-uTime*0.04)-0.5)*0.12;
     float rippleLight=0.0;
     for(int i=0;i<32;i++){
      if(i>=uRippleCount)break;vec4 rp=uRipples[i];vec2 delta=point.xz-rp.xy;
      float dist=length(delta),radius=rp.z*uRippleSpeed*(0.7+0.5*rp.w);
      float ring=exp(-pow((dist-radius)/0.055,2.0))*exp(-rp.z*0.8)*rp.w;
      gradient+=delta/max(dist,0.001)*ring*0.12;rippleLight+=ring*0.045;
     }
     vec4 flow=texture(uFlow,vUv);vec3 color=texture(uColor,vUv).rgb;
     if(flow.a<0.75){
      vec3 normal=normalize(vec3(gradient.x,1,gradient.y));vec3 reflected=reflect(ray,normal);
      float h=clamp(reflected.y,0.0,1.0);
      float band=(floor(h*7.0)+0.5)/7.0;
      vec3 sky=mix(uSky[0],uSky[1],smoothstep(0.0,0.65,band));sky=mix(sky,uSky[2],smoothstep(0.4,1.0,band));
      float fresnel=0.035+0.09*pow(1.0-abs(dot(-ray,normal)),3.0);
      color=mix(color,sky,fresnel)+uLightColor*rippleLight;
      if(flow.a<0.3)flow=encodeFlow(vec2(1.0,gradient.y*3.0+0.2*sin(point.z)),0.95,${REGION.water});
     }
     outColor=vec4(pow(max(color,0.0),vec3(1.0/2.2)),1);outFlow=flow;
    }`,
  });
  return material;
}

export function fullscreenScene(material: THREE.RawShaderMaterial) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const scene = new THREE.Scene();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  scene.add(mesh);
  return { scene, mesh, camera: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), geometry };
}
