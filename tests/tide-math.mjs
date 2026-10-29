import assert from 'node:assert/strict';
import { Vector3, Raycaster } from '../vendor/three.module.js';
import { TideOcean, tidalField, SOLAR_TIDE_RATIO } from '../tides.js';
import { CLOSE_MOON_DISTANCE_RATIO, MAX_LUNAR_WEIGHT, MAX_TIDE_RANGE } from '../tide-constants.js';

const close = (actual, expected, message, tolerance = 1e-10) =>
  assert.ok(Math.abs(actual - expected) < tolerance, `${message}: ${actual} versus ${expected}`);
const moon = new Vector3(1, 0, 0), sun = new Vector3(0, 0, 1), north = new Vector3(0, 1, 0);
const ocean = new TideOcean({ sunDirection: sun, orbitNormal: north });

for (let degree = 0; degree < 360; degree += 3) {
  const angle = degree * Math.PI / 180;
  const direction = new Vector3(Math.cos(angle), 0, Math.sin(angle));
  const state = ocean.setState({ moonDirection: direction });
  close(state.range, 1, 'Moon-only planar range');
  close(state.highDirections[0].dot(direction), 1, 'Near bulge follows the actual Moon');
  close(state.highDirections[1].dot(direction), -1, 'Far bulge is exactly opposite');
  close(ocean.sample(direction).potential, 1, 'P2 maximum');
  close(ocean.sample(state.lowDirections[0]).potential, -.5, 'Moon-only low tide');
  assert.ok(state.minimumRadius > ocean.radius, 'Display shell remains above source Earth');
}
console.log('PASS both lunar bulges track every Moon direction, with the source Earth inside');

const spring = ocean.setState({ moonDirection: moon, sunDirection: moon, solarEnabled: true });
close(spring.range, 1 + SOLAR_TIDE_RATIO, 'Aligned spring range');
close(spring.strength, 1, 'Maximum normalized strength');
const opposite = ocean.setState({ moonDirection: moon, sunDirection: moon.clone().negate(), solarEnabled: true });
close(opposite.range, spring.range, 'Opposite alignment is the same spring range');
close(opposite.highRadius, spring.highRadius, 'Full and new alignments have matching ideal bulges');
const neap = ocean.setState({ moonDirection: moon, sunDirection: sun, solarEnabled: true });
close(neap.range, 1 - SOLAR_TIDE_RATIO, 'Quadrature planar range');
close(neap.globalRange, 1.5, 'Global range differs from spring-neap planar range');
assert.ok(neap.range < 1 && neap.globalRange === 1.5);
console.log('PASS aligned1.46× versus quadrature.54× planar range; global range remains distinct');

const baseline = ocean.baseline;
for (const mix of [0, .25, .5, .75, 1]) {
  const q = SOLAR_TIDE_RATIO * mix;
  for (const degree of [0, 27, 45, 90, 180]) {
    const a = degree * Math.PI / 180, direction = new Vector3(Math.cos(a), 0, Math.sin(a));
    const state = ocean.setState({ moonDirection: direction, sunDirection: moon, solarMix: mix });
    const expectedRange = Math.sqrt((1 - q) ** 2 + 4 * q * Math.cos(a) ** 2);
    close(state.range, expectedRange, 'Fractional solar forcing has the matching planar range');
    close(state.solarMix, mix, 'State exposes the actual solar contribution');
    close(ocean.uniforms.solarWeight.value, q, 'Shader uses the same solar forcing');
    close(ocean.uniforms.highDirection.value.dot(state.highDirections[0]), 1,
      'Both optical cap accents use the combined-field maximum axis');
    close(ocean.baseline, baseline, 'Solar transitions do not inflate the display baseline');
    const high = ocean.sample(state.highDirections[0]), low = ocean.sample(state.lowDirections[0]);
    close((high.potential - low.potential) / 1.5, state.range, 'Fractional cue extrema match sampled surface');
    close(high.radius, state.highRadius, 'High cue touches the fractional surface');
    close(low.radius, state.lowRadius, 'Low cue touches the fractional surface');
    const point = new Vector3(.2, .6, .7).normalize();
    const lunarField = tidalField(point, direction, moon);
    const fullField = tidalField(point, direction, moon, true);
    const blendedField = tidalField(point, direction, moon, false, mix);
    close(blendedField.potential, lunarField.potential + mix * (fullField.potential - lunarField.potential),
      'Potential interpolates the physical solar contribution');
    close(ocean.sample(point).potential, blendedField.potential, 'sample uses fractional forcing instead of a boolean');
    close(blendedField.gradient.distanceTo(lunarField.gradient.clone().lerp(fullField.gradient, mix)), 0,
      'Spherical gradient interpolates the same forcing');
  }
}
close(ocean.setState({ moonDirection: moon, sunDirection: moon, solarEnabled: true, solarMix: 0 }).range, 1,
  'Explicit zero overrides the boolean target during a transition');
close(ocean.setState({ moonDirection: moon, sunDirection: moon, solarEnabled: false, solarMix: 1 }).range, 1.46,
  'Explicit one overrides the boolean target during a transition');
ocean.setState({ moonDirection: moon, sunDirection: sun, solarMix: .5 });
assert.equal(ocean.setState({ moonDirection: moon, sunDirection: sun, solarMix: .5 }).changed, false);
assert.equal(ocean.setState({ moonDirection: moon, sunDirection: sun, solarMix: .51 }).changed, true);
for (const mix of [NaN, Infinity, -Infinity, -.01, 1.01, null, '0.5']) {
  assert.throws(() => ocean.setState({ solarMix: mix }), /solarMix.*finite.*between 0 and 1/);
  assert.throws(() => tidalField(moon, moon, sun, false, mix), /solarMix.*finite.*between 0 and 1/);
}
console.log('PASS fractional Sun endpoints, intermediate surface/readout agreement and input validation');

const closeSpring = ocean.setState({ moonDirection: moon, sunDirection: moon,
  solarEnabled: true, moonDistanceRatio: CLOSE_MOON_DISTANCE_RATIO });
close(closeSpring.lunarWeight, 1 / CLOSE_MOON_DISTANCE_RATIO ** 3, 'Closer lunar forcing follows inverse-cube distance');
close(closeSpring.range, MAX_TIDE_RANGE, 'Closer-Moon aligned range adds fixed solar forcing');
assert(closeSpring.range > spring.range && closeSpring.highRadius > spring.highRadius,
  'The closer Moon raises the actual aligned water surface, not only its label');
close(ocean.uniforms.solarWeight.value, SOLAR_TIDE_RATIO, 'Moving the Moon does not strengthen the Sun');
close(ocean.setState({ moonDirection: moon, sunDirection: moon.clone().negate(),
  solarEnabled: true, moonDistanceRatio: CLOSE_MOON_DISTANCE_RATIO }).range, closeSpring.range,
  'Both closer-Moon alignments reinforce the ideal tide equally');
close(ocean.setState({ moonDirection: moon, sunDirection: sun,
  solarEnabled: true, moonDistanceRatio: CLOSE_MOON_DISTANCE_RATIO }).range,
  MAX_LUNAR_WEIGHT - SOLAR_TIDE_RATIO, 'Closer-Moon quadrature still subtracts the fixed solar contribution');

let previousCloseRange = 0;
for (let step = 0; step <= 20; step++) {
  const moonDistanceRatio = 1 - step / 20 * (1 - CLOSE_MOON_DISTANCE_RATIO), w = 1 / moonDistanceRatio ** 3;
  for (const solarMix of [0, .5, 1]) {
    const q = SOLAR_TIDE_RATIO * solarMix;
    for (const degree of [0, 30, 65, 90, 180]) {
      const angle = degree * Math.PI / 180, direction = new Vector3(Math.cos(angle), 0, Math.sin(angle));
      const state = ocean.setState({ moonDirection: direction, sunDirection: moon, solarMix, moonDistanceRatio });
      close(state.range, Math.sqrt((w - q) ** 2 + 4 * w * q * Math.cos(angle) ** 2),
        'Distance transitions use the weighted tidal eigenvalue range');
      close(state.moonDistanceRatio, moonDistanceRatio, 'State retains the selected distance');
      close(state.lunarWeight, w, 'State retains the actual lunar forcing');
      close(ocean.uniforms.lunarWeight.value, w, 'Shader receives that same forcing');
      close(ocean.baseline, baseline, 'Closer-Moon transitions preserve the fixed display baseline');
      close(ocean.uniforms.baseline.value, baseline, 'Shader baseline also remains fixed');
      assert(state.minimumRadius > ocean.radius, 'Earth stays inside even the strongest low-tide surface');
      assert(state.highRadius < ocean.geometry.boundingSphere.radius,
        'The enlarged high-water surface stays inside its culling bounds');
      const high = ocean.sample(state.highDirections[0]), low = ocean.sample(state.lowDirections[0]);
      close((high.potential - low.potential) / 1.5, state.range, 'Weighted extrema match the actual surface');
      close(high.radius, state.highRadius, 'Weighted high cue touches the actual water');
      close(low.radius, state.lowRadius, 'Weighted low cue touches the actual water');
      const testDirection = new Vector3(.2, .6, .7).normalize();
      const lunar = tidalField(testDirection, direction, moon);
      const solar = tidalField(testDirection, moon, direction);
      const combined = tidalField(testDirection, direction, moon, false, solarMix, w);
      close(combined.potential, w * lunar.potential + q * solar.potential,
        'Sampled potential is the sum of separately weighted Moon and Sun terms');
      close(ocean.sample(testDirection).potential, combined.potential, 'CPU sample uses current distance forcing');
    }
  }
  const state = ocean.setState({ moonDirection: moon, sunDirection: moon, solarMix: 1, moonDistanceRatio });
  assert(state.range > previousCloseRange, 'Approaching Moon increases the aligned range continuously');
  previousCloseRange = state.range;
}
ocean.setState({ moonDirection: moon, sunDirection: sun, moonDistanceRatio: CLOSE_MOON_DISTANCE_RATIO });
assert.equal(ocean.setState({ moonDirection: moon, sunDirection: sun, moonDistanceRatio: CLOSE_MOON_DISTANCE_RATIO }).changed, false);
assert.equal(ocean.setState({ moonDirection: moon, sunDirection: sun, moonDistanceRatio: 1 }).changed, true);
close(ocean.setState({ moonDirection: moon, sunDirection: moon, solarMix: 1 }).range, 1.46,
  'Mean-distance default restores the existing spring reference');
for (const ratio of [NaN, Infinity, CLOSE_MOON_DISTANCE_RATIO - .001, 1.001, null, '0.97']) {
  assert.throws(() => ocean.setState({ moonDistanceRatio: ratio }), /moonDistanceRatio.*finite.*between/);
}
for (const weight of [NaN, Infinity, .999, MAX_LUNAR_WEIGHT + .001, null, '1.1']) {
  assert.throws(() => tidalField(moon, moon, sun, false, 0, weight), /lunarWeight.*finite.*between/);
}
console.log('PASS closer-Moon inverse-cube forcing, weighted extrema, fixed baseline, bounds and transitions');

let worstNormal = 0, worstRange = 0;
for (const moonDistanceRatio of [1, (1 + CLOSE_MOON_DISTANCE_RATIO) / 2, CLOSE_MOON_DISTANCE_RATIO])
for (const solarMix of [0, .25, .5, 1]) for (let degree = 0; degree <= 360; degree += 5) {
  const a = degree * Math.PI / 180;
  const direction = new Vector3(Math.cos(a), 0, Math.sin(a));
  const state = ocean.setState({ moonDirection: direction, sunDirection: sun, solarMix, moonDistanceRatio });
  const high = ocean.sample(state.highDirections[0]), low = ocean.sample(state.lowDirections[0]);
  worstRange = Math.max(worstRange, Math.abs((high.potential - low.potential) / 1.5 - state.range));
  for (const n of [new Vector3(.2, .6, .7).normalize(), direction, north, state.highDirections[0]]) {
    const field = tidalField(n, direction, sun, true, solarMix, state.lunarWeight);
    close(field.gradient.dot(n), 0, 'Spherical gradient is tangent');
    const tangent = new Vector3().crossVectors(n, Math.abs(n.y) < .8 ? north : moon).normalize();
    const otherTangent = new Vector3().crossVectors(n, tangent).normalize();
    const epsilon = 1e-5;
    for (const t of [tangent, otherTangent]) {
      const plus = n.clone().addScaledVector(t, epsilon).normalize();
      const minus = n.clone().addScaledVector(t, -epsilon).normalize();
      const surfaceTangent = plus.clone().multiplyScalar(ocean.sample(plus).radius)
        .sub(minus.clone().multiplyScalar(ocean.sample(minus).radius)).normalize();
      worstNormal = Math.max(worstNormal, Math.abs(surfaceTangent.dot(ocean.sample(n).normal)));
    }
  }
}
assert.ok(worstRange < 1e-12, `Eigen-cue directions must match surface extrema: ${worstRange}`);
assert.ok(worstNormal < 1e-8, `Analytical normals must be perpendicular to finite-difference tangents: ${worstNormal}`);
console.log('PASS cue extrema and deformed-surface normals', { worstRange, worstNormal });

// Alignment makes the mathematical low ring non-unique. The supplied orbit
// normal keeps the chosen planar cue pair continuous instead of flipping lanes.
let previous;
for (const angle of [-1e-7, -1e-9, 0, 1e-9, 1e-7]) {
  const state = ocean.setState({ moonDirection: new Vector3(Math.cos(angle), 0, Math.sin(angle)),
    sunDirection: moon, solarEnabled: true });
  if (previous) assert.ok(previous.dot(state.lowDirections[0]) > .999999, 'Low cue stays continuous through exact alignment');
  previous = state.lowDirections[0];
}

ocean.setState({ moonDirection: moon, time: 5, animated: true });
const held = ocean.setState({ moonDirection: moon, time: 50, animated: false });
close(ocean.uniforms.time.value, 5, 'Paused/reduced detail keeps the last supplied visible phase');
assert.equal(held.changed, false, 'No hidden animation work is requested when only paused wall time changes');
assert.equal(ocean.setState({ moonDirection: moon, time: 50, animated: true }).changed, true);
ocean.object.updateMatrixWorld(true);
const hits = new Raycaster(new Vector3(0, 0, 6), new Vector3(0, 0, -1)).intersectObject(ocean.object, true);
assert.deepEqual(hits, [], 'Water and rim cannot intercept Earth/Moon interactions');
assert.equal(ocean.object.children.length, 2);
assert.equal(ocean.object.children[0].geometry, ocean.object.children[1].geometry);
assert.throws(() => ocean.setState({ moonDirection: new Vector3() }), /cannot be zero/);
assert.throws(() => ocean.setState({ time: NaN }), /finite/);
ocean.dispose(); ocean.dispose();
assert.equal(ocean.object.children.length, 0);
assert.throws(() => ocean.setState({}), /disposed/);
console.log('PASS alignment continuity, caller-owned time, inert picking, shared geometry and cleanup');
