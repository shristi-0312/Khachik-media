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
  uniform float uTileAspect;
  uniform float uVideoAspect; // 0 until metadata — then object-fit: cover
  varying vec2 vUv;
  varying float vFacing;

  vec2 coverUv(vec2 uv) {
    if (uVideoAspect < 0.01 || uTileAspect < 0.01) return uv;
    float sx = 1.0;
    float sy = 1.0;
    if (uVideoAspect > uTileAspect) {
      sx = uTileAspect / uVideoAspect;
    } else {
      sy = uVideoAspect / uTileAspect;
    }
    return vec2(uv.x * sx + (1.0 - sx) * 0.5, uv.y * sy + (1.0 - sy) * 0.5);
  }

  void main() {
    vec4 c = texture2D(uMap, coverUv(vUv));
    // Gentle limb darkening — keep footage bright and crisp on-face.
    float shade = mix(0.62, 1.0, smoothstep(-0.05, 0.72, vFacing));
    c.rgb *= shade;
    c.rgb = mix(c.rgb, c.rgb * 0.48, uDim);
    c.rgb *= 1.0 + 0.08 * uHover;
    gl_FragColor = c;
  }
`

/**
 * Cream lattice + Griflan-style cursor scan:
 * every meridian/parallel near the pointer tints toward brand red with a
 * soft gaussian falloff — not a single hard crosshair.
 */
export const latticeVertex = /* glsl */ `
  varying float vFacing;
  varying float vLat;
  varying float vLon;
  void main() {
    vec3 p = normalize(position);
    vLat = asin(clamp(p.y, -1.0, 1.0));
    vLon = atan(p.x, p.z);
    vec3 n = normalize(normalMatrix * p);
    vFacing = n.z;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const latticeFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uHoverColor;
  uniform float uAlpha;
  uniform float uHoverAlpha;
  uniform float uHoverLat;
  uniform float uHoverLon;
  uniform float uHoverOn;   // 0..1
  uniform float uFalloff;   // radians
  varying float vFacing;
  varying float vLat;
  varying float vLon;

  float angDist(float lat0, float lon0, float lat1, float lon1) {
    float dLon = abs(atan(sin(lon1 - lon0), cos(lon1 - lon0)));
    float dLat = abs(lat1 - lat0);
    // Local surface distance ≈ √((R·dLat)² + (R·cos(lat)·dLon)²) / R
    float x = dLon * max(cos(lat0), 0.25);
    return sqrt(dLat * dLat + x * x);
  }

  void main() {
    float face = smoothstep(-0.05, 0.5, vFacing);
    float d = angDist(uHoverLat, uHoverLon, vLat, vLon);
    // Soft red Griflan scan — wide, luminous falloff under the cursor.
    float glow = uHoverOn * exp(-(d * d) / (uFalloff * uFalloff));
    glow = pow(glow, 0.78);
    vec3 col = mix(uColor, uHoverColor, clamp(glow * 1.15, 0.0, 1.0));
    float a = mix(uAlpha, uHoverAlpha, glow) * face;
    a = min(1.0, a * (1.0 + glow * 0.85));
    if (a < 0.01) discard;
    gl_FragColor = vec4(col, a);
  }
`
