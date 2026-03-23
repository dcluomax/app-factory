/**
 * thresholds.js — Noise level constants and ordinance references
 * 
 * Defines dB categories, colors, and common residential noise ordinance limits.
 */

// dB SPL level categories with color coding
export const LEVELS = {
  QUIET: {
    min: 0,
    max: 40,
    label: 'Quiet',
    color: '#4CAF50',
    description: 'Library, whisper',
    emoji: '🟢',
  },
  MODERATE: {
    min: 40,
    max: 55,
    label: 'Moderate',
    color: '#8BC34A',
    description: 'Normal conversation',
    emoji: '🟡',
  },
  LOUD: {
    min: 55,
    max: 70,
    label: 'Loud',
    color: '#FF9800',
    description: 'Vacuum cleaner, busy street',
    emoji: '🟠',
  },
  VERY_LOUD: {
    min: 70,
    max: 85,
    label: 'Very Loud',
    color: '#F44336',
    description: 'Heavy traffic, restaurant',
    emoji: '🔴',
  },
  HARMFUL: {
    min: 85,
    max: 200,
    label: 'Harmful',
    color: '#B71C1C',
    description: 'Concert, power tools',
    emoji: '🔴',
  },
};

// Common residential noise ordinance limits
export const ORDINANCE = {
  daytime: {
    start: 7,   // 7:00 AM
    end: 22,     // 10:00 PM
    limit: 55,   // dB SPL
    label: 'Daytime (7am–10pm): 55 dB',
  },
  nighttime: {
    start: 22,   // 10:00 PM
    end: 7,      // 7:00 AM
    limit: 45,   // dB SPL
    label: 'Nighttime (10pm–7am): 45 dB',
  },
};

/**
 * Get the level category for a given dB value.
 * @param {number} db - Sound level in dB SPL
 * @returns {object} Level category object
 */
export function getLevelForDb(db) {
  if (db < LEVELS.QUIET.max) return LEVELS.QUIET;
  if (db < LEVELS.MODERATE.max) return LEVELS.MODERATE;
  if (db < LEVELS.LOUD.max) return LEVELS.LOUD;
  if (db < LEVELS.VERY_LOUD.max) return LEVELS.VERY_LOUD;
  return LEVELS.HARMFUL;
}

/**
 * Get the interpolated color for a dB value (smooth gradient).
 * @param {number} db - Sound level in dB SPL
 * @returns {string} Hex color string
 */
export function getColorForDb(db) {
  const level = getLevelForDb(db);
  return level.color;
}

/**
 * Check if current time is during nighttime hours.
 * @returns {boolean}
 */
export function isNighttime() {
  const hour = new Date().getHours();
  return hour >= ORDINANCE.nighttime.start || hour < ORDINANCE.nighttime.end;
}

/**
 * Get the current applicable noise limit.
 * @returns {number} dB limit
 */
export function getCurrentLimit() {
  return isNighttime() ? ORDINANCE.nighttime.limit : ORDINANCE.daytime.limit;
}

/**
 * Auto-detection default threshold.
 */
export const DEFAULT_AUTO_THRESHOLD = 65;

/**
 * dBFS offset for rough SPL calibration.
 * Smartphone mics typically read ~90 dB below actual SPL.
 */
export const DBFS_TO_SPL_OFFSET = 90;
