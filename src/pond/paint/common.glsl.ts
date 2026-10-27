// Adapted from Ardia apps/site/src/scripts/meadow/shaders.ts (0d16725).
// https://github.com/mantrakp04/ardia — Copyright 2026 Mantra Patel, Apache-2.0.
// Modified for Three.js GLSL3 and pond regions; see CREDITS.md.
export const HEADER = `precision highp float; precision highp int; precision highp sampler2D;
`;
export const COMMON = `uniform float uTime; const mat2 OCTAVE_TURN = mat2(0.8,-0.6,0.6,0.8);
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float valueNoise(vec2 x) {
  vec2 cell = floor(x);
  vec2 f = fract(x);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = hash12(cell);
  float b = hash12(cell + vec2(1.0, 0.0));
  float c = hash12(cell + vec2(0.0, 1.0));
  float d = hash12(cell + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y) * 2.0 - 1.0;
}

float fbm(vec2 p, int octaves) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < octaves; i++) {
    sum += amp * valueNoise(p);
    p = OCTAVE_TURN * p * 2.03 + vec2(4.1, 1.7);
    amp *= 0.5;
  }
  return sum;
}

const float CREATURE_REGION = 0.62;
vec4 encodeFlow(vec2 dir, float strokeScale, float region) {
  float angle = atan(dir.y, dir.x);
  return vec4(cos(2.0 * angle) * 0.5 + 0.5, sin(2.0 * angle) * 0.5 + 0.5, strokeScale, region);
}
`;
