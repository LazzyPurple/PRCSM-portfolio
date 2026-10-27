// Adapted from Ardia apps/site/src/scripts/meadow/shaders.ts (0d16725).
// https://github.com/mantrakp04/ardia — Copyright 2026 Mantra Patel, Apache-2.0.
// SPDX-License-Identifier: Apache-2.0
// Modified for Three.js GLSL3 and pond regions; see CREDITS.md.
import { HEADER } from './common.glsl';
export const PAINT_FS = `${HEADER}
uniform sampler2D uScene;
uniform sampler2D uFlow;
uniform vec2 uTexel;
uniform float uRadius;
in vec2 vUv;
out vec4 outColor;

void main() {
  vec4 flow = texture(uFlow, vUv);
  vec2 orientation = flow.xy * 2.0 - 1.0;
  float coherence = clamp(length(orientation), 0.0, 1.0);
  float angle = 0.5 * atan(orientation.y, orientation.x);
  vec2 along = vec2(cos(angle), sin(angle));
  vec2 across = vec2(-along.y, along.x);
  float radius = uRadius * mix(0.7, 1.6, flow.z);
  float stretch = mix(1.0, 2.3, coherence);
  vec2 axisA = along * radius * stretch * uTexel;
  vec2 axisB = across * radius / stretch * uTexel;
  vec3 sum0 = vec3(0.0), sum1 = vec3(0.0), sum2 = vec3(0.0), sum3 = vec3(0.0);
  vec3 sq0 = vec3(0.0), sq1 = vec3(0.0), sq2 = vec3(0.0), sq3 = vec3(0.0);
  float w0 = 0.0, w1 = 0.0, w2 = 0.0, w3 = 0.0;
  for (int j = -3; j <= 3; j++) {
    for (int i = -3; i <= 3; i++) {
      vec2 q = vec2(float(i), float(j)) / 3.0;
      float d2 = dot(q, q);
      if (d2 > 1.05) continue;
      vec3 c = texture(uScene, vUv + axisA * q.x + axisB * q.y).rgb;
      float w = exp(-d2 * 1.6);
      vec3 cw = c * w;
      vec3 c2w = c * c * w;
      if (q.x >= 0.0 && q.y >= 0.0) { sum0 += cw; sq0 += c2w; w0 += w; }
      if (q.x <= 0.0 && q.y >= 0.0) { sum1 += cw; sq1 += c2w; w1 += w; }
      if (q.x <= 0.0 && q.y <= 0.0) { sum2 += cw; sq2 += c2w; w2 += w; }
      if (q.x >= 0.0 && q.y <= 0.0) { sum3 += cw; sq3 += c2w; w3 += w; }
    }
  }
  vec3 m0 = sum0 / w0, m1 = sum1 / w1, m2 = sum2 / w2, m3 = sum3 / w3;
  float v0 = dot(abs(sq0 / w0 - m0 * m0), vec3(1.0));
  float v1 = dot(abs(sq1 / w1 - m1 * m1), vec3(1.0));
  float v2 = dot(abs(sq2 / w2 - m2 * m2), vec3(1.0));
  float v3 = dot(abs(sq3 / w3 - m3 * m3), vec3(1.0));
  float k0 = 1.0 / (1.0 + pow(v0 * 900.0, 2.0));
  float k1 = 1.0 / (1.0 + pow(v1 * 900.0, 2.0));
  float k2 = 1.0 / (1.0 + pow(v2 * 900.0, 2.0));
  float k3 = 1.0 / (1.0 + pow(v3 * 900.0, 2.0));
  vec3 color = (m0 * k0 + m1 * k1 + m2 * k2 + m3 * k3) / (k0 + k1 + k2 + k3);
  float levels = mix(26.0, 18.0, step(flow.a, 0.25));
  color = mix(color, floor(color * levels + 0.5) / levels, 0.35);
  outColor = vec4(color, 1.0);
}
`;
