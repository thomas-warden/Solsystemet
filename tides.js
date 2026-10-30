import * as THREE from './vendor/three.module.js';
import { SOLAR_TIDE_RATIO, CLOSE_MOON_DISTANCE_RATIO, MAX_LUNAR_WEIGHT, MAX_TIDE_RANGE } from './tide-constants.js?v=e6305f546a8d.9df63c26d4';
export { SOLAR_TIDE_RATIO } from './tide-constants.js?v=e6305f546a8d.9df63c26d4';

// Equilibrium forcing on an ideal global ocean: w P2(n·Moon) + q P2(n·Sun).
// Displacement, ripple scale and optical appearance are deliberately exaggerated.
// This is neither a coastal forecast nor a volume-conserving fluid simulation.

function unit(vector, name) {
  if (!vector || ![vector.x, vector.y, vector.z].every(Number.isFinite)) {
    throw new TypeError(`${name} must be a finite Vector3-like direction.`);
  }
  const result = new THREE.Vector3(vector.x, vector.y, vector.z);
  if (result.lengthSq() < 1e-18) throw new RangeError(`${name} cannot be zero.`);
  return result.normalize();
}

function p2(value) { return (3 * value * value - 1) / 2; }

function solarWeight(mix) {
  if (!Number.isFinite(mix) || mix < 0 || mix > 1) {
    throw new RangeError('solarMix must be a finite number between 0 and 1.');
  }
  return SOLAR_TIDE_RATIO * mix;
}

function validateLunarWeight(weight) {
  if (!Number.isFinite(weight) || weight < 1 || weight > MAX_LUNAR_WEIGHT) {
    throw new RangeError(`lunarWeight must be finite and between 1 and ${MAX_LUNAR_WEIGHT}.`);
  }
  return weight;
}

function lunarWeightAtDistance(ratio) {
  if (!Number.isFinite(ratio) || ratio < CLOSE_MOON_DISTANCE_RATIO || ratio > 1) {
    throw new RangeError(`moonDistanceRatio must be finite and between ${CLOSE_MOON_DISTANCE_RATIO} and 1.`);
  }
  return 1 / ratio ** 3;
}

// Directions are unit vectors. Returned gradient is tangent to the unit sphere.
export function tidalField(direction, moonDirection, sunDirection, solarEnabled = false,
  solarMix = solarEnabled ? 1 : 0, lunarWeight = 1) {
  const n = unit(direction, 'direction'), moon = unit(moonDirection, 'moonDirection');
  const sun = unit(sunDirection, 'sunDirection'), q = solarWeight(solarMix), w = validateLunarWeight(lunarWeight);
  const m = n.dot(moon), s = n.dot(sun);
  const gradient = moon.multiplyScalar(3 * w * m).addScaledVector(sun, 3 * q * s)
    .addScaledVector(n, -3 * (w * m * m + q * s * s));
  return { potential: w * p2(m) + q * p2(s), gradient };
}

const vertexShader = `
  uniform float radius, exaggeration, baseline, solarWeight, lunarWeight;
  uniform vec3 moonDirection, sunDirection;
  varying vec3 sphereDirection, worldPosition, oceanCenter;
  varying float forcing;
  void main() {
    vec3 n = normalize(position);
    sphereDirection = normalize(mat3(modelMatrix) * n);
    float m = dot(sphereDirection, moonDirection), s = dot(sphereDirection, sunDirection);
    forcing = lunarWeight * .5 * (3. * m * m - 1.) + solarWeight * .5 * (3. * s * s - 1.);
    float distance = radius * (baseline + exaggeration * forcing);
    vec4 world = modelMatrix * vec4(n * distance, 1.);
    worldPosition = world.xyz;
    oceanCenter = (modelMatrix * vec4(0., 0., 0., 1.)).xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = `
  uniform float radius, exaggeration, baseline, solarWeight, lunarWeight, time, opacity, rimPass;
  uniform vec3 moonDirection, sunDirection, highDirection;
  varying vec3 sphereDirection, worldPosition, oceanCenter;
  varying float forcing;

  // Fine normal detail, not extra silhouette displacement. Derivative filtering
  // keeps the waves quiet when the whole Earth occupies only a few phone pixels.
  vec3 ripple(vec3 n, vec3 axis, float frequency, float phase, float slope) {
    float a = dot(n, axis) * frequency + phase;
    float visible = 1. - smoothstep(.6, 2., fwidth(a));
    return (axis - n * dot(n, axis)) * cos(a) * slope * visible;
  }

  void main() {
    vec3 n = normalize(sphereDirection);
    float m = dot(n, moonDirection), s = dot(n, sunDirection);
    float height = lunarWeight * .5 * (3. * m * m - 1.) + solarWeight * .5 * (3. * s * s - 1.);
    float distance = baseline + exaggeration * height;
    vec3 gradient = 3. * (lunarWeight * m * moonDirection + solarWeight * s * sunDirection
      - (lunarWeight * m * m + solarWeight * s * s) * n);
    // Exact normal of the radial quadrupole surface, before tiny optical ripples.
    vec3 normal = normalize(distance * n - exaggeration * gradient);
    // The broad outline follows the analytical surface. Only the water pass
    // needs fine normal detail; repeating it on the rim made a noisy glass edge.
    if (rimPass < .5) {
      vec3 fine = ripple(n, normalize(vec3(.73,.31,.61)), 94., time * .72, .014)
        + ripple(n, normalize(vec3(-.29,.87,.39)), 153., -time * .91, .009)
        + ripple(n, normalize(vec3(.42,-.48,.77)), 231., time * .51, .005);
      normal = normalize(normal - fine);
    }
    vec3 view = normalize(cameraPosition - worldPosition);
    float facing = max(dot(normal, view), 0.);
    float sunlight = max(dot(normal, sunDirection), 0.);
    float fresnel = .0204 + .9796 * pow(1. - facing, 5.);
    float grazing = pow(1. - facing, 2.2);
    float sunEdge = smoothstep(-.16, .45, dot(normal, sunDirection));
    vec3 halfVector = view + sunDirection;
    vec3 halfDirection = halfVector / max(length(halfVector), .0001);
    float specular = pow(max(dot(normal, halfDirection), 0.), 350.) * sunlight;

    if (rimPass > .5) {
      // A continuous reflected-sky edge keeps the far-side bulge readable too.
      // This is an illustrative optical cue, not measured space illumination.
      float cap = pow(abs(dot(n, highDirection)), 12.);
      float rim = pow(1. - facing, 7.) * (.65 + .35 * sunEdge);
      // Matching soft accents identify the two actual combined-field maxima.
      // Their directions come from the same eigenproblem as the range reading.
      vec3 rimColor = mix(vec3(.09,.43,.55), vec3(.22,.64,.70), cap);
      gl_FragColor = vec4(rimColor, rim * (.44 + cap * .13));
    } else {
      float crest = clamp((height + ${(MAX_TIDE_RANGE / 2).toFixed(12)}) / ${(MAX_TIDE_RANGE * 1.5).toFixed(12)}, 0., 1.);
      // One angular transmission tint keeps the front clear and the grazing
      // water blue. This is an illustrative material, not measured path length.
      float projectedRadius = length(cross(worldPosition - oceanCenter, view));
      float pixel = max(fwidth(projectedRadius), .0001);
      // Preserve the globe's detail while giving the exposed water a visible
      // body. The narrow transition is locked to the solid Earth, so changing
      // the tide never reads as a changing glow or a second opaque planet.
      float exposed = smoothstep(radius * 1.004, radius * 1.004 + pixel * 2., projectedRadius);
      vec3 water = mix(vec3(.003,.025,.065), vec3(.028,.28,.39), grazing);
      water += exposed * vec3(.008,.065,.095);
      vec3 color = water * (.55 + sunlight * .90);
      color += vec3(1.,.98,.94) * specular * (.18 + fresnel * .7);
      // A quiet, fixed surface reference distinguishes the solid globe from
      // the exaggerated water. It is the projected Earth limb, not another
      // inflated sphere or a second ocean. Derivatives keep it one pixel wide.
      float reference = 1. - smoothstep(pixel * .15, pixel * .70,
        abs(projectedRadius - radius * 1.009));
      color = mix(color, vec3(.26,.36,.37) * (.65 + .35 * sunEdge), reference * .72);
      float alpha = opacity * .55 + exposed * .24 + grazing * .30 + fresnel * .13 + crest * .015 + specular * .12;
      alpha += reference * (.12 + .13 * sunEdge);
      gl_FragColor = vec4(color, clamp(alpha, 0., .72));
    }
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/**
 * Add .object beside the Earth's mesh, centered on the same world position.
 * Radius is the already displayed Earth radius; do not inherit its scale.
 * Call setState only when the caller's model or supplied animation time changes.
 * No textures, scene lights, DOM, timers, or render loop are owned here.
 */
export class TideOcean {
  constructor({ radius = 1.3, sunDirection = new THREE.Vector3(-8, 5, 7),
    orbitNormal = new THREE.Vector3(0, 1, 0), exaggeration = .20, opacity = .085 } = {}) {
    if (!Number.isFinite(radius) || radius <= 0) throw new RangeError('radius must be positive.');
    if (!Number.isFinite(exaggeration) || exaggeration < 0 || exaggeration > .35) throw new RangeError('exaggeration must be between 0 and .35.');
    if (!Number.isFinite(opacity) || opacity < 0 || opacity > .3) throw new RangeError('opacity must be between 0 and .3.');
    this.radius = radius;
    this.exaggeration = exaggeration;
    this.orbitNormal = unit(orbitNormal, 'orbitNormal');
    this.moonDirection = new THREE.Vector3(1, 0, 0);
    this.sunDirection = unit(sunDirection, 'sunDirection');
    this.planeNormal = this.orbitNormal.clone();
    // Keep even the strongest supported low tide above the source globe. This
    // fixed display offset never changes during a distance or Sun transition.
    // The surrounding shell is not the real ocean depth.
    this.baseline = 1.012 + exaggeration * MAX_TIDE_RANGE / 2;
    this.uniforms = {
      radius: { value: radius }, exaggeration: { value: exaggeration }, baseline: { value: this.baseline },
      moonDirection: { value: this.moonDirection }, sunDirection: { value: this.sunDirection },
      highDirection: { value: new THREE.Vector3(1, 0, 0) },
      solarWeight: { value: 0 }, lunarWeight: { value: 1 }, time: { value: 0 }, opacity: { value: opacity },
    };
    this.object = new THREE.Group();
    this.object.name = 'tide-ocean';
    this.object.raycast = () => {};
    this.geometry = new THREE.SphereGeometry(1, 128, 80);
    this.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), radius * (this.baseline + exaggeration * MAX_TIDE_RANGE) * 1.003);
    this.materials = [0, 1].map(rimPass => new THREE.ShaderMaterial({
      vertexShader, fragmentShader, uniforms: { ...this.uniforms, rimPass: { value: rimPass } },
      transparent: true, depthWrite: false, side: THREE.FrontSide,
      blending: rimPass ? THREE.AdditiveBlending : THREE.NormalBlending,
    }));
    this.materials.forEach((material, index) => {
      const mesh = new THREE.Mesh(this.geometry, material);
      mesh.name = index ? 'tide-rim' : 'tide-water';
      mesh.renderOrder = 20 + index;
      mesh.raycast = () => {};
      this.object.add(mesh);
    });
    this.disposed = false;
    this.state = null;
    this.setState({ moonDirection: this.moonDirection, sunDirection: this.sunDirection });
  }

  // solarMix optionally overrides the boolean target while the caller eases it;
  // it is a normalized fraction of solar forcing relative to the mean-distance
  // Moon. The closer Moon strengthens lunar forcing by the inverse cube law.
  setState({ moonDirection = this.moonDirection, sunDirection = this.sunDirection,
    solarEnabled = false, solarMix = solarEnabled ? 1 : 0, moonDistanceRatio = 1,
    time = 0, animated = false } = {}) {
    if (this.disposed) throw new Error('Cannot update a disposed TideOcean.');
    if (!Number.isFinite(time)) throw new TypeError('time must be finite seconds.');
    const moon = unit(moonDirection, 'moonDirection'), sun = unit(sunDirection, 'sunDirection');
    // The caller may ease the Sun's contribution. The same coefficient drives
    // displacement, normals, extrema and the range reading throughout the fade.
    const q = solarWeight(solarMix), w = lunarWeightAtDistance(moonDistanceRatio);
    const nextTime = animated ? time : this.uniforms.time.value;
    const changed = !this.state || this.moonDirection.distanceToSquared(moon) > 1e-20
      || this.sunDirection.distanceToSquared(sun) > 1e-20 || q !== this.uniforms.solarWeight.value
      || w !== this.uniforms.lunarWeight.value
      || nextTime !== this.uniforms.time.value;
    this.moonDirection.copy(moon); this.sunDirection.copy(sun);
    this.uniforms.solarWeight.value = q; this.uniforms.lunarWeight.value = w; this.uniforms.time.value = nextTime;

    // Eigenvalues of w mmᵀ + q ssᵀ. w>q keeps the major axis unique at neap.
    const cosine = THREE.MathUtils.clamp(moon.dot(sun), -1, 1);
    const range = Math.sqrt((w - q) ** 2 + 4 * w * q * cosine * cosine);
    const major = (w + q + range) / 2, minor = (w + q - range) / 2;
    const high = moon.clone().multiplyScalar(major - q).addScaledVector(sun, q * cosine).normalize();
    this.uniforms.highDirection.value.copy(high);
    const plane = new THREE.Vector3().crossVectors(moon, sun);
    if (q && plane.lengthSq() > 1e-12) {
      plane.normalize();
      if (plane.dot(this.planeNormal) < 0) plane.negate();
    } else {
      plane.copy(this.orbitNormal).addScaledVector(moon, -this.orbitNormal.dot(moon));
      if (plane.lengthSq() < 1e-12) {
        plane.set(Math.abs(moon.x) < .8 ? 1 : 0, Math.abs(moon.x) < .8 ? 0 : 1, 0);
        plane.addScaledVector(moon, -plane.dot(moon));
      }
      plane.normalize();
      if (plane.dot(this.planeNormal) < 0) plane.negate();
    }
    this.planeNormal.copy(plane);
    const low = new THREE.Vector3().crossVectors(plane, high).normalize();
    const maximum = 1.5 * major - .5 * (w + q), minimum = -.5 * (w + q);
    const planeMinimum = 1.5 * minor - .5 * (w + q);
    this.state = {
      changed, solarMix, moonDistanceRatio, lunarWeight: w,
      // In-plane range relative to the mean-distance Moon alone. This is the
      // spring-neap display value, not global max-minus-min across the sphere.
      // Strength preserves the mean-distance spring reference (1.46), so the
      // illustrative closer-Moon example can have strength greater than one.
      range, strength: range / (1 + SOLAR_TIDE_RATIO),
      globalRange: maximum - minimum, maximum, minimum, planeMinimum,
      highDirections: [high, high.clone().negate()],
      lowDirections: [low, low.clone().negate()],
      globalLowDirections: [plane.clone(), plane.clone().negate()],
      lunarDirection: moon.clone(), solarDirection: sun.clone(), orbitNormal: plane.clone(),
      highRadius: this.radius * (this.baseline + this.exaggeration * maximum),
      lowRadius: this.radius * (this.baseline + this.exaggeration * planeMinimum),
      minimumRadius: this.radius * (this.baseline + this.exaggeration * minimum),
    };
    return this.state;
  }

  // Useful for projected cues and numerical checks. The returned direction and
  // normal are in world axes when .object has its documented unscaled pose.
  sample(direction) {
    const n = unit(direction, 'direction');
    const field = tidalField(n, this.moonDirection, this.sunDirection, true,
      this.uniforms.solarWeight.value / SOLAR_TIDE_RATIO, this.uniforms.lunarWeight.value);
    const scale = this.baseline + this.exaggeration * field.potential;
    return { potential: field.potential, radius: this.radius * scale,
      normal: n.multiplyScalar(scale).addScaledVector(field.gradient, -this.exaggeration).normalize() };
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.object.removeFromParent();
    this.geometry.dispose();
    this.materials.forEach(material => material.dispose());
    this.object.clear();
  }
}
