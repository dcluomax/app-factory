/**
 * audioMeter.js — Audio recording for metering and dBFS → SPL conversion
 * 
 * Uses expo-av Recording API to capture metering data from the microphone.
 * Provides real-time dB SPL readings at ~200ms intervals.
 */

import { Audio } from 'expo-av';
import { DBFS_TO_SPL_OFFSET } from './thresholds';

// Recording configuration optimized for metering (low quality is fine, we just need levels)
const RECORDING_OPTIONS = {
  isMeteringEnabled: true,
  android: {
    extension: '.m4a',
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
  },
  ios: {
    extension: '.m4a',
    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
    audioQuality: Audio.IOSAudioQuality.LOW,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 128000,
  },
};

/**
 * Convert dBFS metering value to approximate SPL.
 * dBFS range: -160 (silence) to 0 (max input).
 * Rough calibration: dB_SPL ≈ dBFS + 90.
 * 
 * @param {number} dbfs - Metering value in dBFS (-160 to 0)
 * @returns {number} Approximate dB SPL (clamped 0–130)
 */
export function dbfsToSpl(dbfs) {
  if (dbfs === undefined || dbfs === null || dbfs <= -160) return 0;
  const spl = dbfs + DBFS_TO_SPL_OFFSET;
  return Math.max(0, Math.min(130, Math.round(spl)));
}

/**
 * AudioMeter class — manages microphone recording for real-time metering.
 */
export class AudioMeter {
  constructor() {
    this.recording = null;
    this.isRecording = false;
    this.intervalId = null;
    this.onLevelUpdate = null; // callback: (dbSpl) => void
  }

  /**
   * Request microphone permissions.
   * @returns {boolean} Whether permission was granted
   */
  async requestPermissions() {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      return status === 'granted';
    } catch (err) {
      console.error('Permission request failed:', err);
      return false;
    }
  }

  /**
   * Start recording and polling metering data.
   * @param {function} onLevelUpdate - Callback receiving dB SPL values
   * @param {number} intervalMs - Polling interval (default 200ms)
   */
  async start(onLevelUpdate, intervalMs = 200) {
    if (this.isRecording) return;

    this.onLevelUpdate = onLevelUpdate;

    try {
      // Configure audio session
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      // Create and start recording
      this.recording = new Audio.Recording();
      await this.recording.prepareToRecordAsync(RECORDING_OPTIONS);
      await this.recording.startAsync();
      this.isRecording = true;

      // Poll for metering data at the specified interval
      this.intervalId = setInterval(async () => {
        if (!this.isRecording || !this.recording) return;

        try {
          const status = await this.recording.getStatusAsync();
          if (status.isRecording && status.metering !== undefined) {
            const dbSpl = dbfsToSpl(status.metering);
            if (this.onLevelUpdate) {
              this.onLevelUpdate(dbSpl);
            }
          }
        } catch (err) {
          // Recording may have been stopped
          console.warn('Metering poll error:', err.message);
        }
      }, intervalMs);
    } catch (err) {
      console.error('Failed to start audio meter:', err);
      this.isRecording = false;
      throw err;
    }
  }

  /**
   * Stop recording and clean up resources.
   */
  async stop() {
    this.isRecording = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.recording) {
      try {
        await this.recording.stopAndUnloadAsync();
      } catch (err) {
        console.warn('Error stopping recording:', err.message);
      }
      this.recording = null;
    }

    // Reset audio mode
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
    } catch (err) {
      // ignore
    }

    this.onLevelUpdate = null;
  }
}

// Export a singleton for convenience
export const audioMeter = new AudioMeter();
