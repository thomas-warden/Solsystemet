import * as THREE from './vendor/three.module.js';

// Equilibrium forcing on an ideal global ocean: P2(n·Moon) + q P2(n·Sun).
// Displacement, ripple scale and optical appearance are deliberately exaggerated.
// This is neither a coastal forecast nor a volume-conserving fluid simulation.
export const SOLAR_TIDE_RATIO = 0.46;

function unit(vector, name) {
  if (!vector || ![vector.x, vector.y, vector.z].every(Number.isFinite)) {
    throw new TypeError(`${name} must be a finite Vector3-like direction.`);
  }
  const result = new THREE.Vector3(vector.x, vector.y, vector.z);
  if (result.lengthSq() < 1e-18) throw new RangeError(`${name} cannot be zero.`);
  return result.normalize();
}

function p2(value) { return (3 * value * value - 1) / 2; }

// Directions are unit vectors. Returned gradient is tangent to the unit sphere.
export function tidalField(direction, moonDirection, sunDirection, solarEnabled = false) {
  const n = unit(direction, 'direction'), moon = unit(moonDirection, 'moonDirection');
  const sun = unit(sunDirection, 'sunDirection'), q = solarEnabled ? SOLAR_TIDE_RATIO : 0;
  const m = n.dot(moon), s = n.dot(sun);
  const gradient = moon.multiplyScalar(3 * m).addScaledVector(sun, 3 * q * s)
    .addScaledVector(n, -3 * (m * m + q * s * s));
  return { potential: p2(m) + q * p2(s), gradient };
}

const vertexShader = `
  uniform float radius, exaggeration, baseline, solarWeight;
  uniform vec3 moonDirection, sunDirection;
  varying vec3 sphereDirection, worldPosition;
  varying float forcing;
  void main() {
    vec3 n = normalize(position);
    sphereDirection = normalize(mat3(modelMatrix) * n);
    float m = dot(sphereDirection, moonDirection), s = dot(sphereDirection, sunDirection);
    forcing = .5 * (3. * m * m - 1.) + solarWeight * .5 * (3. * s * s - 1.);
    float distance = radius * (baseline + exaggeration * forcing);
    vec4 world = modelMatrix * vec4(n * distance, 1.);
    worldPosition = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = `
  uniform float radius, exaggeration, baseline, solarWeight, time, opacity, rimPass;
  uniform vec3 moonDirection, sunDirection;
  varying vec3 sphereDirection, worldPosition;
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
    float height = .5 * (3. * m * m - 1.) + solarWeight * .5 * (3. * s * s - 1.);
    float distance = baseline + exaggeration * height;
    vec3 gradient = 3. * (m * moonDirection + solarWeight * s * sunDirection
      - (m * m + solarWeight * s * s) * n);
    // Exact normal of the radial quadrupole surface, before tiny optical ripples.
    vec3 normal = normalize(distance * n - exaggeration * gradient);
    vec3 fine = ripple(n, normalize(vec3(.73,.31,.61)), 94., time * .72, .023)
      + ripple(n, normalize(vec3(-.29,.87,.39)), 153., -time * .91, .014)
      + ripple(n, normalize(vec3(.42,-.48,.77)), 231., time * .51, .008);
    normal = normalize(normal - fine);
    vec3 view = normalize(cameraPosition - worldPosition);
    float facing = max(dot(normal, view), 0.);
    float sunlight = max(dot(normal, sunDirection), 0.);
    float fresnel = .0204 + .9796 * pow(1. - facing, 5.);
    float edge = pow(1. - facing, 3.);
    float opticalDepth = pow(1. - facing, 1.7);
    float sunEdge = smoothstep(-.16, .45, dot(normal, sunDirection));
    vec3 halfDirection = normalize(view + sunDirection);
    float specular = pow(max(dot(normal, halfDirection), 0.), 210.) * sunlight;

    if (rimPass > .5) {
      // Mostly sunlit, with a faint illustrative sky fill so both bulges remain
      // legible against space. This is an optical cue, not measured radiance.
      float rim = pow(1. - facing, 5.5) * (.065 + .935 * sunEdge);
      gl_FragColor = vec4(vec3(.018,.32,.72), rim * .34);
    } else {
      float crest = clamp((height + .73) / 2.19, 0., 1.);
      // Longer grazing paths reveal blue water; the almost transparent front
      // still carries the real land and cloud detail underneath this ideal ocean.
      vec3 water = mix(vec3(.003,.035,.095), vec3(.016,.25,.58), opticalDepth);
      vec3 color = water * (.16 + sunlight * 1.25);
      color += vec3(.012,.18,.42) * opticalDepth * (.10 + .90 * sunEdge);
      color += vec3(1.05,1.35,1.55) * specular * (1. + fresnel * 2.);
      color += vec3(.01,.10,.20) * edge * sunEdge;
      float alpha = opacity + opticalDepth * .26 + fresnel * .20 + crest * .025 + specular * .35;
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
    // Keep even the strongest low tide just above the source globe. This offset
    // is a display convention; the surrounding shell is not the real ocean depth.
    this.baseline = 1.012 + exaggeration * (1 + SOLAR_TIDE_RATIO) / 2;
    this.uniforms = {
      radius: { value: radius }, exaggeration: { value: exaggeration }, baseline: { value: this.baseline },
      moonDirection: { value: this.moonDirection }, sunDirection: { value: this.sunDirection },
      solarWeight: { value: 0 }, time: { value: 0 }, opacity: { value: opacity },
    };
    this.object = new THREE.Group();
    this.object.name = 'tide-ocean';
    this.object.raycast = () => {};
    this.geometry = new THREE.SphereGeometry(1, 128, 80);
    this.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), radius * (this.baseline + exaggeration * 1.46) * 1.003);
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

  setState({ moonDirection = this.moonDirection, sunDirection = this.sunDirection,
    solarEnabled = false, time = 0, animated = false } = {}) {
    if (this.disposed) throw new Error('Cannot update a disposed TideOcean.');
    if (!Number.isFinite(time)) throw new TypeError('time must be finite seconds.');
    const moon = unit(moonDirection, 'moonDirection'), sun = unit(sunDirection, 'sunDirection');
    const q = solarEnabled ? SOLAR_TIDE_RATIO : 0;
    const nextTime = animated ? time : this.uniforms.time.value;
    const changed = !this.state || this.moonDirection.distanceToSquared(moon) > 1e-20
      || this.sunDirection.distanceToSquared(sun) > 1e-20 || q !== this.uniforms.solarWeight.value
      || nextTime !== this.uniforms.time.value;
    this.moonDirection.copy(moon); this.sunDirection.copy(sun);
    this.uniforms.solarWeight.value = q; this.uniforms.time.value = nextTime;

    // Eigenvalues of mmᵀ + q ssᵀ. q<1 keeps the major axis unique, even at neap.
    const cosine = THREE.MathUtils.clamp(moon.dot(sun), -1, 1);
    const range = Math.sqrt((1 - q) ** 2 + 4 * q * cosine * cosine);
    const major = (1 + q + range) / 2, minor = (1 + q - range) / 2;
    const high = moon.clone().multiplyScalar(major - q).addScaledVector(sun, q * cosine).normalize();
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
    const maximum = 1.5 * major - .5 * (1 + q), minimum = -.5 * (1 + q);
    const planeMinimum = 1.5 * minor - .5 * (1 + q);
    this.state = {
      changed,
      // In-plane range relative to Moon alone: 1 / 1.46 / .54. This is the
      // spring-neap display value, not global max-minus-min across the sphere.
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
    const field = tidalField(n, this.moonDirection, this.sunDirection, this.uniforms.solarWeight.value > 0);
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
