/**
 * Random helpers.
 *
 * @module utils/rand
 */

/**
 * Generate a random integer between min and max (inclusive).
 *
 * @param {number} min - Minimum integer (inclusive).
 * @param {number} max - Maximum integer (inclusive).
 * @returns {number} Random integer in [min, max].
 */
export function randomInt(min, max) {
  const mn = Math.ceil(min);
  const mx = Math.floor(max);
  return Math.floor(Math.random() * (mx - mn + 1)) + mn;
}

/**
 * Generate a random float between min and max.
 *
 * @param {number} min - Minimum value.
 * @param {number} max - Maximum value.
 * @returns {number} Random float in [min, max).
 */
export function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}


