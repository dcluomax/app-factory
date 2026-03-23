/**
 * storage.js — Incident CRUD and settings persistence
 * 
 * Uses AsyncStorage to persist incident logs and app settings.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const INCIDENTS_KEY = '@noiselog_incidents';
const SETTINGS_KEY = '@noiselog_settings';

// Default settings
const DEFAULT_SETTINGS = {
  address: '',
  autoDetect: true,
  autoThreshold: 65,
  autoMinDuration: 10, // seconds before auto-logging
  isPro: false, // Pro enabled by default for now
};

// ========================
// INCIDENTS
// ========================

/**
 * Get all saved incidents, sorted newest first.
 * @returns {Array} Array of incident objects
 */
export async function getIncidents() {
  try {
    const json = await AsyncStorage.getItem(INCIDENTS_KEY);
    if (!json) return [];
    const incidents = JSON.parse(json);
    return incidents.sort((a, b) => b.timestamp - a.timestamp);
  } catch (err) {
    console.error('Error reading incidents:', err);
    return [];
  }
}

/**
 * Save a new incident.
 * @param {object} incident - { timestamp, duration, avgDb, peakDb, note }
 * @returns {object} The saved incident with generated id
 */
export async function saveIncident(incident) {
  try {
    const incidents = await getIncidents();
    const newIncident = {
      id: `incident_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      duration: 0,
      avgDb: 0,
      peakDb: 0,
      note: '',
      ...incident,
    };
    incidents.push(newIncident);
    await AsyncStorage.setItem(INCIDENTS_KEY, JSON.stringify(incidents));
    return newIncident;
  } catch (err) {
    console.error('Error saving incident:', err);
    throw err;
  }
}

/**
 * Update an existing incident by ID.
 * @param {string} id - Incident ID
 * @param {object} updates - Fields to update
 * @returns {object|null} Updated incident or null if not found
 */
export async function updateIncident(id, updates) {
  try {
    const incidents = await getIncidents();
    const index = incidents.findIndex((i) => i.id === id);
    if (index === -1) return null;
    incidents[index] = { ...incidents[index], ...updates };
    await AsyncStorage.setItem(INCIDENTS_KEY, JSON.stringify(incidents));
    return incidents[index];
  } catch (err) {
    console.error('Error updating incident:', err);
    throw err;
  }
}

/**
 * Delete an incident by ID.
 * @param {string} id - Incident ID
 */
export async function deleteIncident(id) {
  try {
    const incidents = await getIncidents();
    const filtered = incidents.filter((i) => i.id !== id);
    await AsyncStorage.setItem(INCIDENTS_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error('Error deleting incident:', err);
    throw err;
  }
}

/**
 * Delete all incidents.
 */
export async function clearIncidents() {
  try {
    await AsyncStorage.setItem(INCIDENTS_KEY, JSON.stringify([]));
  } catch (err) {
    console.error('Error clearing incidents:', err);
    throw err;
  }
}

/**
 * Get incidents filtered by date range.
 * @param {number} startMs - Start timestamp in ms
 * @param {number} endMs - End timestamp in ms
 * @returns {Array} Filtered incidents
 */
export async function getIncidentsByDateRange(startMs, endMs) {
  const incidents = await getIncidents();
  return incidents.filter((i) => i.timestamp >= startMs && i.timestamp <= endMs);
}

// ========================
// SETTINGS
// ========================

/**
 * Get app settings.
 * @returns {object} Settings object
 */
export async function getSettings() {
  try {
    const json = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!json) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(json) };
  } catch (err) {
    console.error('Error reading settings:', err);
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Save app settings (merges with existing).
 * @param {object} updates - Settings fields to update
 */
export async function saveSettings(updates) {
  try {
    const current = await getSettings();
    const merged = { ...current, ...updates };
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
    return merged;
  } catch (err) {
    console.error('Error saving settings:', err);
    throw err;
  }
}
