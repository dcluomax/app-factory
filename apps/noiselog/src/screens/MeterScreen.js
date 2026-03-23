/**
 * MeterScreen.js — Real-time dB meter with graph
 * 
 * The main screen showing live sound levels, visual gauge,
 * rolling graph, and incident logging controls.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Alert,
  useColorScheme,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import DbGauge from '../components/DbGauge';
import LevelGraph from '../components/LevelGraph';
import { AudioMeter } from '../utils/audioMeter';
import { saveIncident, getSettings, saveSettings } from '../utils/storage';
import { getTheme } from '../theme';
import { DEFAULT_AUTO_THRESHOLD, getLevelForDb, isNighttime, getCurrentLimit } from '../utils/thresholds';
import { loadRewarded, showRewardedAd } from '../utils/ads';

export default function MeterScreen() {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);

  // Audio meter state
  const [currentDb, setCurrentDb] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [dataPoints, setDataPoints] = useState([]);

  // Incident recording state
  const [isRecordingIncident, setIsRecordingIncident] = useState(false);
  const [incidentStart, setIncidentStart] = useState(null);
  const [incidentReadings, setIncidentReadings] = useState([]);

  // Auto-detection state
  const [autoDetect, setAutoDetect] = useState(true);
  const [autoThreshold, setAutoThreshold] = useState(DEFAULT_AUTO_THRESHOLD);
  const autoStartRef = useRef(null);
  const autoReadingsRef = useRef([]);
  const autoTimerRef = useRef(null);

  // Note modal state
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [pendingIncident, setPendingIncident] = useState(null);
  const [noteText, setNoteText] = useState('');

  // Settings modal
  const [showSettings, setShowSettings] = useState(false);
  const [settingsThreshold, setSettingsThreshold] = useState(String(DEFAULT_AUTO_THRESHOLD));

  // Refs for audio meter and readings buffer
  const meterRef = useRef(null);
  const dataPointsRef = useRef([]);
  const incidentReadingsRef = useRef([]);
  const isRecordingIncidentRef = useRef(false);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
    try { loadRewarded(); } catch(e) {}
    return () => {
      stopMeter();
    };
  }, []);

  const loadSettings = async () => {
    const settings = await getSettings();
    setAutoDetect(settings.autoDetect);
    setAutoThreshold(settings.autoThreshold);
    setSettingsThreshold(String(settings.autoThreshold));
  };

  // Keep refs in sync with state
  useEffect(() => {
    isRecordingIncidentRef.current = isRecordingIncident;
  }, [isRecordingIncident]);

  /**
   * Handle a new dB reading from the audio meter.
   */
  const handleLevelUpdate = useCallback((dbSpl) => {
    setCurrentDb(dbSpl);

    // Update rolling data points (keep last 300 = ~60sec at 200ms)
    dataPointsRef.current = [...dataPointsRef.current.slice(-299), dbSpl];
    setDataPoints([...dataPointsRef.current]);

    // If manually recording an incident, capture readings
    if (isRecordingIncidentRef.current) {
      incidentReadingsRef.current.push(dbSpl);
      setIncidentReadings([...incidentReadingsRef.current]);
    }

    // Auto-detection logic
    if (autoDetect && !isRecordingIncidentRef.current) {
      if (dbSpl >= autoThreshold) {
        if (!autoStartRef.current) {
          // Start tracking potential auto-incident
          autoStartRef.current = Date.now();
          autoReadingsRef.current = [dbSpl];

          // Wait 10 seconds of sustained noise before logging
          autoTimerRef.current = setTimeout(() => {
            if (autoStartRef.current && autoReadingsRef.current.length > 0) {
              finalizeAutoIncident();
            }
          }, 10000);
        } else {
          autoReadingsRef.current.push(dbSpl);
        }
      } else {
        // Noise dropped below threshold
        if (autoStartRef.current) {
          const elapsed = Date.now() - autoStartRef.current;
          if (elapsed >= 10000 && autoReadingsRef.current.length > 5) {
            // Was sustained enough — log it
            finalizeAutoIncident();
          } else {
            // Reset — was too brief
            resetAutoDetection();
          }
        }
      }
    }
  }, [autoDetect, autoThreshold]);

  /**
   * Save an auto-detected incident.
   */
  const finalizeAutoIncident = async () => {
    const readings = autoReadingsRef.current;
    if (!readings.length || !autoStartRef.current) return;

    const duration = (Date.now() - autoStartRef.current) / 1000;
    const avg = Math.round(readings.reduce((a, b) => a + b, 0) / readings.length);
    const peak = Math.max(...readings);

    try {
      await saveIncident({
        timestamp: autoStartRef.current,
        duration: Math.round(duration),
        avgDb: avg,
        peakDb: peak,
        note: `Auto-detected: Sustained noise above ${autoThreshold} dB`,
        autoDetected: true,
      });
    } catch (err) {
      console.error('Failed to save auto incident:', err);
    }

    resetAutoDetection();
  };

  const resetAutoDetection = () => {
    autoStartRef.current = null;
    autoReadingsRef.current = [];
    if (autoTimerRef.current) {
      clearTimeout(autoTimerRef.current);
      autoTimerRef.current = null;
    }
  };

  /**
   * Start the audio meter.
   */
  const startMeter = async () => {
    if (meterRef.current) {
      await meterRef.current.stop();
    }

    const meter = new AudioMeter();
    meterRef.current = meter;

    const granted = await meter.requestPermissions();
    if (!granted) {
      Alert.alert(
        'Microphone Required',
        'NoiseLog needs microphone access to measure sound levels. Please grant permission in Settings.',
      );
      return;
    }

    await meter.start(handleLevelUpdate, 200);
    setIsActive(true);
  };

  /**
   * Stop the audio meter.
   */
  const stopMeter = async () => {
    if (meterRef.current) {
      await meterRef.current.stop();
      meterRef.current = null;
    }
    setIsActive(false);
    setCurrentDb(0);
    resetAutoDetection();
  };

  /**
   * Toggle meter on/off.
   */
  const toggleMeter = () => {
    if (isActive) {
      stopMeter();
    } else {
      // Show rewarded ad before starting (Pro users skip)
      showRewardedAd(() => {
        startMeter();
      });
    }
  };

  /**
   * Start/stop manual incident recording.
   */
  const toggleIncidentRecording = () => {
    if (isRecordingIncident) {
      // Stop recording — prepare to save
      const duration = incidentStart ? (Date.now() - incidentStart) / 1000 : 0;
      const readings = incidentReadingsRef.current;
      const avg = readings.length > 0
        ? Math.round(readings.reduce((a, b) => a + b, 0) / readings.length)
        : currentDb;
      const peak = readings.length > 0 ? Math.max(...readings) : currentDb;

      setPendingIncident({
        timestamp: incidentStart || Date.now(),
        duration: Math.round(duration),
        avgDb: avg,
        peakDb: peak,
      });
      setShowNoteModal(true);
      setIsRecordingIncident(false);
      setIncidentStart(null);
      incidentReadingsRef.current = [];
      setIncidentReadings([]);
    } else {
      // Start recording
      setIsRecordingIncident(true);
      setIncidentStart(Date.now());
      incidentReadingsRef.current = [currentDb];
      setIncidentReadings([currentDb]);
    }
  };

  /**
   * Quick log — instantly save current reading as a point-in-time incident.
   */
  const quickLog = () => {
    setPendingIncident({
      timestamp: Date.now(),
      duration: 0,
      avgDb: currentDb,
      peakDb: currentDb,
    });
    setNoteText('');
    setShowNoteModal(true);
  };

  /**
   * Save the pending incident with optional note.
   */
  const savePendingIncident = async () => {
    if (!pendingIncident) return;
    try {
      await saveIncident({
        ...pendingIncident,
        note: noteText.trim(),
      });
      Alert.alert('✅ Saved', `Incident logged: Peak ${pendingIncident.peakDb} dB`);
    } catch (err) {
      Alert.alert('Error', 'Failed to save incident.');
    }
    setShowNoteModal(false);
    setPendingIncident(null);
    setNoteText('');
  };

  /**
   * Save settings.
   */
  const handleSaveSettings = async () => {
    const threshold = parseInt(settingsThreshold, 10);
    if (isNaN(threshold) || threshold < 30 || threshold > 120) {
      Alert.alert('Invalid', 'Threshold must be between 30 and 120 dB.');
      return;
    }
    setAutoThreshold(threshold);
    await saveSettings({ autoDetect, autoThreshold: threshold });
    setShowSettings(false);
  };

  // Calculate incident duration display
  const incidentDuration = isRecordingIncident && incidentStart
    ? Math.round((Date.now() - incidentStart) / 1000)
    : 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Settings gear */}
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => setShowSettings(true)}
        >
          <Text style={[styles.settingsIcon, { color: theme.colors.textSecondary }]}>⚙️</Text>
        </TouchableOpacity>

        {/* dB Gauge */}
        <DbGauge db={currentDb} theme={theme} />

        {/* Rolling Graph */}
        <LevelGraph dataPoints={dataPoints} theme={theme} />

        {/* Recording indicator */}
        {isRecordingIncident && (
          <View style={styles.recordingBanner}>
            <Text style={styles.recordingText}>
              🔴 Recording incident... {incidentDuration}s
            </Text>
            <Text style={styles.recordingSubtext}>
              Peak: {incidentReadings.length > 0 ? Math.max(...incidentReadings) : 0} dB |{' '}
              Avg: {incidentReadings.length > 0
                ? Math.round(incidentReadings.reduce((a, b) => a + b, 0) / incidentReadings.length)
                : 0} dB
            </Text>
          </View>
        )}

        {/* Auto-detect status */}
        {autoDetect && isActive && (
          <Text style={[styles.autoStatus, { color: theme.colors.textMuted }]}>
            🤖 Auto-detect: Logging noise above {autoThreshold} dB
          </Text>
        )}
      </ScrollView>

      {/* Bottom buttons */}
      <View style={[styles.bottomBar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
        {/* Start/Stop Meter */}
        <TouchableOpacity
          style={[styles.meterBtn, { backgroundColor: isActive ? '#F44336' : theme.colors.primary }]}
          onPress={toggleMeter}
        >
          <Text style={styles.meterBtnText}>
            {isActive ? '⏹ Stop Meter' : '🎤 Start Meter'}
          </Text>
        </TouchableOpacity>

        {/* Log Incident */}
        {isActive && (
          <>
            <TouchableOpacity
              style={[
                styles.logBtn,
                {
                  backgroundColor: isRecordingIncident ? '#F44336' : '#FF9800',
                },
              ]}
              onPress={toggleIncidentRecording}
            >
              <Text style={styles.logBtnText}>
                {isRecordingIncident ? '⏹ Stop & Save' : '⏺ Record Incident'}
              </Text>
            </TouchableOpacity>

            {!isRecordingIncident && (
              <TouchableOpacity
                style={[styles.quickBtn, { borderColor: theme.colors.primary }]}
                onPress={quickLog}
              >
                <Text style={[styles.quickBtnText, { color: theme.colors.primary }]}>
                  📌 Quick Log
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {/* Note Modal */}
      <Modal
        visible={showNoteModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNoteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              📝 Add Note (Optional)
            </Text>
            <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
              Peak: {pendingIncident?.peakDb} dB | Avg: {pendingIncident?.avgDb} dB
            </Text>
            <TextInput
              style={[styles.noteInput, {
                color: theme.colors.text,
                backgroundColor: theme.colors.surfaceVariant,
                borderColor: theme.colors.border,
              }]}
              placeholder='e.g., "Loud music from unit 304"'
              placeholderTextColor={theme.colors.textMuted}
              value={noteText}
              onChangeText={setNoteText}
              multiline
              maxLength={200}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel, { borderColor: theme.colors.border }]}
                onPress={() => { setShowNoteModal(false); setPendingIncident(null); }}
              >
                <Text style={[styles.modalBtnText, { color: theme.colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: theme.colors.primary }]}
                onPress={savePendingIncident}
              >
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Save Incident</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal
        visible={showSettings}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              ⚙️ Meter Settings
            </Text>

            {/* Auto-detection toggle */}
            <TouchableOpacity
              style={[styles.settingRow, { borderBottomColor: theme.colors.divider }]}
              onPress={() => setAutoDetect(!autoDetect)}
            >
              <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
                🤖 Auto-Detection
              </Text>
              <Text style={[styles.settingValue, { color: autoDetect ? '#4CAF50' : '#F44336' }]}>
                {autoDetect ? 'ON' : 'OFF'}
              </Text>
            </TouchableOpacity>

            {/* Threshold */}
            {autoDetect && (
              <View style={[styles.settingRow, { borderBottomColor: theme.colors.divider }]}>
                <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
                  Threshold (dB)
                </Text>
                <TextInput
                  style={[styles.thresholdInput, {
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.surfaceVariant,
                  }]}
                  value={settingsThreshold}
                  onChangeText={setSettingsThreshold}
                  keyboardType="number-pad"
                  maxLength={3}
                />
              </View>
            )}

            {/* Noise ordinance reference */}
            <View style={[styles.ordinanceRef, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Text style={[styles.ordinanceTitle, { color: theme.colors.text }]}>
                📋 Typical Noise Ordinance
              </Text>
              <Text style={[styles.ordinanceItem, { color: theme.colors.textSecondary }]}>
                ☀️ Daytime (7am–10pm): 55 dB
              </Text>
              <Text style={[styles.ordinanceItem, { color: theme.colors.textSecondary }]}>
                🌙 Nighttime (10pm–7am): 45 dB
              </Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel, { borderColor: theme.colors.border }]}
                onPress={() => setShowSettings(false)}
              >
                <Text style={[styles.modalBtnText, { color: theme.colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: theme.colors.primary }]}
                onPress={handleSaveSettings}
              >
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 160,
    paddingTop: 10,
  },
  settingsBtn: {
    position: 'absolute',
    right: 16,
    top: 8,
    zIndex: 10,
    padding: 8,
  },
  settingsIcon: {
    fontSize: 24,
  },
  recordingBanner: {
    backgroundColor: '#B71C1C',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  recordingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  recordingSubtext: {
    color: '#ffcdd2',
    fontSize: 13,
    marginTop: 4,
  },
  autoStatus: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 10,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  meterBtn: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    elevation: 3,
  },
  meterBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  logBtn: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 30,
    elevation: 3,
  },
  logBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  quickBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 30,
    borderWidth: 2,
  },
  quickBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  modalBtnCancel: {
    borderWidth: 1,
  },
  modalBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  settingValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  thresholdInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    width: 60,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  ordinanceRef: {
    padding: 14,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 16,
  },
  ordinanceTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  ordinanceItem: {
    fontSize: 13,
    marginTop: 3,
  },
});
