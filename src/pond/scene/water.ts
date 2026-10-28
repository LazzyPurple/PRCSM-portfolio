import * as THREE from "three";
import { palette } from "../palette";
import { GL_COMMON, REGION, type SceneUniforms } from "./flow";

const SUN_RADIUS = 0.05;
const MOON_RADIUS = 0.042;
const DISC_DISTORTION = 0.14;
const SUN_GAIN = 0.75;
const MOON_GAIN = 0.55;
const GLINT_SHARPNESS = 1100;
const GLOW_SHARPNESS = 85;

export const FULLSCREEN_VS = `precision highp float;
in vec3 position; out vec2 vUv;
void main(){vUv=position.xy*0.5+0.5;gl_Position=vec4(position.xy,0,1);}`;

export function createWater(uniforms: SceneUniforms) {
  const material = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3, vertexShader: FULLSCREEN_VS, depthTest: false, depthWrite: false,
    uniforms: { ...uniforms, uColor: { value: null }, uFlow: { value: null },
      uReflectionStrength: { value: 1 }, uSunVisibility: { value: 1 }, uMoonVisibility: { value: 0 },
      uSun: { value: new THREE.Color(palette.reflection.sun) }, uSunCore: { value: new THREE.Color(palette.reflection.sunCore) },
      uMoon: { value: new THREE.Color(palette.reflection.moon) }, uMoonShade: { value: new THREE.Color(palette.reflection.moonShade) },
      uInverse: { value: new THREE.Matrix4() }, uCamera: { value: new THREE.Vector3() },
      uRipples: { value: new Float32Array(32 * 4) }, uRippleCount: { value: 0 },
      uRippleSpeed: { value: 0.52 }, uSky: { value: [new THREE.Color(palette.sky.day[0]), new THREE.Color(palette.sky.day[1]), new THREE.Color(palette.sky.day[2])] } },
    fragmentShader: `${GL_COMMON}
    uniform sampler2D uColor,uFlow;uniform mat4 uInverse;uniform vec3 uCamera;
    uniform vec4 uRipples[32];uniform int uRippleCount;uniform float uRippleSpeed;uniform vec3 uSky[3];
    uniform float uReflectionStrength,uSunVisibility,uMoonVisibility;
    uniform vec3 uSun,uSunCore,uMoon,uMoonShade;
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
      if(flow.a<0.3){
       // The main disc uses gentler distortion so the celestial body remains recognizable.
       vec3 discRay=reflect(ray,normalize(vec3(gradient.x*${DISC_DISTORTION},1,gradient.y*${DISC_DISTORTION})));
       vec3 right=normalize(cross(vec3(0,1,0),uLight)),up=cross(uLight,right);
       vec2 angular=vec2(dot(discRay,right),dot(discRay,up));
       float front=step(0.0,dot(discRay,uLight));
       vec2 sunUv=angular/${SUN_RADIUS},moonUv=angular/${MOON_RADIUS};
       float sunDisc=(1.0-smoothstep(0.92,1.08,length(sunUv)))*uSunVisibility*front;
       float moonDisc=(1.0-smoothstep(0.92,1.08,length(moonUv)))*uMoonVisibility*front;
       float bands=0.68+0.32*smoothstep(-0.5,0.7,sin(point.z*48.0+gradient.x*35.0+uTime*1.2));
       vec3 sun=mix(uSunCore,uSun,smoothstep(0.15,1.0,length(sunUv)));
       vec3 moon=uMoon;
       if(moonDisc>0.0){
        float maria=1.0-smoothstep(0.16,0.32,length(moonUv-vec2(-0.28,0.22)));
        maria=max(maria,1.0-smoothstep(0.12,0.25,length(moonUv-vec2(0.3,-0.3))));
        maria=max(maria,1.0-smoothstep(0.07,0.17,length(moonUv-vec2(-0.18,-0.48))));
        float dust=noise(moonUv*17.0)*0.12;
        moon=mix(uMoon,uMoonShade,maria*0.65+dust)*(0.94+0.06*moonUv.y);
       }
       float alignment=max(dot(reflected,uLight),0.0);
       float glints=pow(alignment,${GLINT_SHARPNESS}.0)*0.2+pow(alignment,${GLOW_SHARPNESS}.0)*0.045;
       float visible=uSunVisibility+uMoonVisibility;
       color+=uReflectionStrength*(bands*(sun*sunDisc*${SUN_GAIN}+moon*moonDisc*${MOON_GAIN})+uLightColor*glints*visible);
       flow=encodeFlow(vec2(1.0,gradient.y*3.0+0.2*sin(point.z)),0.95,${REGION.water});
       // Separate brush cells preserve the disc's outline without washing over fish markings.
       if((sunDisc+moonDisc)*uReflectionStrength>0.08)flow=encodeFlow(vec2(1,0),0.06,${REGION.reflection});
      }
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
