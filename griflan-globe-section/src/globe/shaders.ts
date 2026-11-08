/**
 * Both materials share one idea: the geometry lives on a sphere centred at the
 * group origin, so the outward normal is just normalize(position). Its view-space
 * z tells us how squarely a fragment faces the camera, and that drives the fade
 * toward the silhouette.
 */

export const tileVertex = /* glsl */ `
  varying vec2 vUv;
  varying float vFacing;
  void main() {
    vUv = uv;
    vec3 n = normalize(normalMatrix * normalize(position));
    vFacing = n.z;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const tileFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uDim;   // 1 when another cluster is hovered
  uniform float uHover; // 1 when this cluster is hovered
  varying vec2 vUv;
  varying float vFacing;
  void main() {
    vec4 c = texture2D(uMap, vUv);
    float shade = smoothstep(-0.05, 0.8, vFacing);
    shade = mix(0.08, 1.0, shade);
    c.rgb *= shade;
    c.rgb = mix(c.rgb, c.rgb * 0.42, uDim);
    c.rgb *= 1.0 + 0.10 * uHover;
    gl_FragColor = c;
  }
`

export const latticeVertex = /* glsl */ `
  varying float vFacing;
  void main() {
    vec3 n = normalize(normalMatrix * normalize(position));
    vFacing = n.z;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const latticeFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uAlpha;
  varying float vFacing;
  void main() {
    float a = uAlpha * smoothstep(0.0, 0.45, vFacing);
    gl_FragColor = vec4(uColor, a);
  }
`
