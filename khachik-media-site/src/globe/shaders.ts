import { FIELD } from './config'

/**
 * Three passes, back to front: the lattice, the boards, the grain.
 *
 * The lattice and the boards evaluate ONE function — `sphere()` below, the
 * projection described in projection.ts — so a board's edge and the gridline
 * under it are the same curve rather than two opinions about it. Nothing here
 * uses a camera: vertices go straight from stage px to clip space.
 *
 * Colours are written as display (sRGB) values and textures are sampled
 * unconverted, so no colour-space chunk is included.
 */
const SPHERE = /* glsl */ `
  #define HALF_PI 1.5707963267948966

  uniform vec3 uSphere; // cx, cy, R — stage px
  uniform vec2 uView;   // stage w, h — px

  /* surface angles → stage px (xy) and facing (z) */
  vec3 sphere(vec2 a) {
    vec2 c = clamp(a, -HALF_PI, HALF_PI);
    float cv = cos(c.y);
    return vec3(
      uSphere.x + uSphere.z * cv * sin(c.x),
      uSphere.y + uSphere.z * sin(c.y),
      cv * cos(a.x)
    );
  }

  vec4 toClip(vec2 px) {
    return vec4(px.x / uView.x * 2.0 - 1.0, 1.0 - px.y / uView.y * 2.0, 0.0, 1.0);
  }

  /* the flanks' light — the surface darkens as it turns sideways */
  float flank(float u) {
    return mix(1.0 - ${FIELD.flankDepth.toFixed(3)}, 1.0, smoothstep(0.0, 1.0, cos(u)));
  }
`

/* --------------------------------- lattice -------------------------------- */

export const latticeVertex = /* glsl */ `
  ${SPHERE}

  uniform vec2 uLat;   // latitude drawn: from, to — radians
  uniform vec2 uPhase; // the content's offset under the mesh, cells (fractional part)
  uniform float uCell; // lattice step, px

  varying vec2 vLine;  // FLAT position in cells — the fragment rules it square
  varying float vFace;
  varying float vShade;

  void main() {
    vec2 a = vec2((uv.x - 0.5) * 2.0 * HALF_PI, mix(uLat.x, uLat.y, uv.y));
    vec3 s = sphere(a);

    vLine = a * uSphere.z / uCell + uPhase;
    vFace = s.z;
    vShade = flank(a.x);
    gl_Position = toClip(s.xy);
  }
`

export const latticeFragment = /* glsl */ `
  #define TRAIL ${FIELD.trailSamples}

  uniform vec3 uInk;
  uniform vec3 uAccent;
  uniform float uAlpha;
  uniform float uRing;
  uniform float uHalf;         // line half-width, device px
  uniform vec4 uTrail[TRAIL];  // xy device px (gl_FragCoord space), z strength
  uniform float uReach;        // device px

  varying vec2 vLine;
  varying float vFace;
  varying float vShade;

  /*
   * One family of lines, as COVERAGE against its own screen-space derivative:
   * d / fwidth is the distance to the line in pixels, so the stroke is a solid
   * core with one pixel of ramp however hard the projection squeezes it. Where
   * the cells fall under a pixel or so the family fades out instead of
   * washing to a solid.
   */
  float lines(float x, float w) {
    float d = abs(fract(x - 0.5) - 0.5);
    float width = fwidth(x);
    float a = clamp(w - d / width + 0.5, 0.0, 1.0);
    return a * (1.0 - smoothstep(0.6, 1.8, width));
  }

  void main() {
    float meridian = lines(vLine.x, uHalf);
    float ring = lines(vLine.y, uHalf) * uRing;

    /* two crossing strokes, combined as coverage rather than max() */
    float cover = (1.0 - (1.0 - meridian) * (1.0 - ring)) * vShade;
    float face = smoothstep(0.0, 0.05, vFace);
    float alpha = cover * uAlpha * face;

    /* the pointer's wake: lines it has passed run to the accent and lift
       toward full strength. Nothing is tinted where the pointer has not been. */
    float amt = 0.0;
    for (int i = 0; i < TRAIL; i++) {
      vec2 d = gl_FragCoord.xy - uTrail[i].xy;
      amt += uTrail[i].z * exp(-dot(d, d) / (uReach * uReach));
    }
    amt = smoothstep(0.0, 1.0, clamp(amt, 0.0, 1.0));

    vec3 rgb = mix(uInk, uAccent, amt);
    alpha = mix(alpha, cover * face, amt * 0.85);

    gl_FragColor = vec4(rgb, alpha);
  }
`

/* ---------------------------------- boards -------------------------------- */

export const boardVertex = /* glsl */ `
  ${SPHERE}

  uniform vec4 uRect; // left, top, width, height — surface px from the centre meridian / equator

  varying vec2 vUv;   // top-left origin
  varying float vFade;
  varying float vShade;

  void main() {
    vUv = vec2(uv.x, 1.0 - uv.y);

    /* every vertex is plastered: it lands where the projection says, so the
       board's edges hug the meridians and rings they were laid out on */
    vec2 a = (uRect.xy + vUv * uRect.zw) / uSphere.z;
    vec3 s = sphere(a);

    vFade = smoothstep(${FIELD.fadeFrom.toFixed(3)}, ${FIELD.fadeTo.toFixed(3)}, s.z);
    vShade = flank(a.x);
    gl_Position = toClip(s.xy);
  }
`

export const boardFragment = /* glsl */ `
  uniform sampler2D uMap;     // the still — or a reel's poster frame
  uniform sampler2D uOver;    // the reel itself, dissolved in over it
  uniform float uMapAspect;   // picture w / h — 0 until known
  uniform float uOverAspect;
  uniform float uMix;         // 0 = uMap, 1 = uOver
  uniform float uBoardAspect; // board w / h on the flat grid
  uniform float uOpacity;
  uniform float uDim;         // 0..1 — sunk toward the ground
  uniform float uLift;        // 0..1 — hovered
  uniform vec3 uGround;

  varying vec2 vUv;
  varying float vFade;
  varying float vShade;

  /* object-fit: cover, centre-cropped */
  vec2 coverUv(vec2 uv, float aspect) {
    if (aspect <= 0.0) return uv;
    float k = uBoardAspect / aspect;
    return k < 1.0
      ? vec2((uv.x - 0.5) * k + 0.5, uv.y)
      : vec2(uv.x, (uv.y - 0.5) / k + 0.5);
  }

  void main() {
    vec3 rgb = texture2D(uMap, coverUv(vUv, uMapAspect)).rgb;
    if (uMix > 0.001) {
      rgb = mix(rgb, texture2D(uOver, coverUv(vUv, uOverAspect)).rgb, uMix);
    }

    rgb *= vShade;
    rgb *= 1.0 + ${FIELD.hoverLift.toFixed(3)} * uLift;
    rgb = mix(rgb, uGround, uDim);

    gl_FragColor = vec4(rgb, uOpacity * vFade);
  }
`

/* ---------------------------------- grain --------------------------------- */

export const grainVertex = /* glsl */ `
  void main() {
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

export const grainFragment = /* glsl */ `
  uniform float uSeed;
  uniform float uAmount;
  uniform float uScale; // device px per grain

  float hash(vec2 p) {
    vec3 q = fract(vec3(p.xyx) * 0.1031);
    q += dot(q, q.yzx + 33.33);
    return fract((q.x + q.y) * q.z);
  }

  void main() {
    vec2 p = floor(gl_FragCoord.xy / uScale);
    float n = hash(p + uSeed * vec2(37.0, 17.0));
    gl_FragColor = vec4(vec3(n), uAmount);
  }
`
