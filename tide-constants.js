// Ideal equilibrium forcing at fixed mean solar distance. The closer-Moon
// example is illustrative, not an ephemeris or a prediction of a local tide.
export const SOLAR_TIDE_RATIO = .46;
export const CLOSE_MOON_DISTANCE_RATIO = .95;
export const MAX_LUNAR_WEIGHT = 1 / CLOSE_MOON_DISTANCE_RATIO ** 3;
export const MAX_TIDE_RANGE = MAX_LUNAR_WEIGHT + SOLAR_TIDE_RATIO;
