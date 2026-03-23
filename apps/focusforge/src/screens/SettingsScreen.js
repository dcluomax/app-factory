import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SPACING } from '../theme';
import {
  getSettings,
  saveSettings,
  getStreak,
  clearSessions,
} from '../utils/storage';
import { FOCUS_OPTIONS, BREAK_OPTIONS } from '../utils/timer';

const SettingsScreen = () => {
  const [settings, setSettings] = useState(null);
  const [streak, setStreak] = useState({ current: 0, best: 0 });

  const loadData = useCallback(async () => {
    const s = await getSettings();
    setSettings(s);
    const st = await getStreak();
    setStreak(st);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const updateSetting = async (key, value) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await saveSettings(updated);
  };

  const handleUpgrade = async () => {
    try {
      const { purchasePro, initIAP } = require('../utils/pro');
      await initIAP();
      await purchasePro();
    } catch (e) {
      if (e?.code !== 'E_USER_CANCELLED') {
        Alert.alert('Purchase Error', 'Could not complete purchase. Please try again.');
      }
    }
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will delete all session history. Your streak will be preserved. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearSessions();
            Alert.alert('Done', 'Session history cleared.');
          },
        },
      ]
    );
  };

  if (!settings) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Settings</Text>

      {/* Focus Duration */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Focus Duration</Text>
        <View style={styles.optionRow}>
          {FOCUS_OPTIONS.map((mins) => (
            <TouchableOpacity
              key={mins}
              style={[
                styles.optionChip,
                settings.focusDuration === mins && styles.optionChipActive,
              ]}
              onPress={() => updateSetting('focusDuration', mins)}
            >
              <Text
                style={[
                  styles.optionText,
                  settings.focusDuration === mins && styles.optionTextActive,
                ]}
              >
                {mins}m
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Break Duration */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Break Duration</Text>
        <View style={styles.optionRow}>
          {BREAK_OPTIONS.map((mins) => (
            <TouchableOpacity
              key={mins}
              style={[
                styles.optionChip,
                settings.breakDuration === mins && styles.optionChipActive,
              ]}
              onPress={() => updateSetting('breakDuration', mins)}
            >
              <Text
                style={[
                  styles.optionText,
                  settings.breakDuration === mins && styles.optionTextActive,
                ]}
              >
                {mins}m
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Long Break */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Long Break</Text>
        <Text style={styles.sectionHint}>
          After every {settings.longBreakInterval} sessions
        </Text>
        <View style={styles.optionRow}>
          {[10, 15, 20, 30].map((mins) => (
            <TouchableOpacity
              key={mins}
              style={[
                styles.optionChip,
                settings.longBreakDuration === mins && styles.optionChipActive,
              ]}
              onPress={() => updateSetting('longBreakDuration', mins)}
            >
              <Text
                style={[
                  styles.optionText,
                  settings.longBreakDuration === mins && styles.optionTextActive,
                ]}
              >
                {mins}m
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.optionRow}>
          {[2, 3, 4, 5, 6].map((n) => (
            <TouchableOpacity
              key={n}
              style={[
                styles.optionChip,
                settings.longBreakInterval === n && styles.optionChipActive,
              ]}
              onPress={() => updateSetting('longBreakInterval', n)}
            >
              <Text
                style={[
                  styles.optionText,
                  settings.longBreakInterval === n && styles.optionTextActive,
                ]}
              >
                every {n}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Toggles */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Alerts</Text>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Sound</Text>
          <Switch
            value={settings.soundEnabled}
            onValueChange={(val) => updateSetting('soundEnabled', val)}
            trackColor={{ false: COLORS.textDim + '30', true: COLORS.accent + '60' }}
            thumbColor={settings.soundEnabled ? COLORS.accent : COLORS.textDim}
          />
        </View>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Vibration</Text>
          <Switch
            value={settings.vibrationEnabled}
            onValueChange={(val) => updateSetting('vibrationEnabled', val)}
            trackColor={{ false: COLORS.textDim + '30', true: COLORS.accent + '60' }}
            thumbColor={settings.vibrationEnabled ? COLORS.accent : COLORS.textDim}
          />
        </View>
      </View>

      {/* Streak Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Streak</Text>
        <View style={styles.streakInfo}>
          <View style={styles.streakItem}>
            <Text style={styles.streakValue}>🔥 {streak.current}</Text>
            <Text style={styles.streakLabel}>Current</Text>
          </View>
          <View style={styles.streakItem}>
            <Text style={styles.streakValue}>🏆 {streak.best}</Text>
            <Text style={styles.streakLabel}>Best</Text>
          </View>
        </View>
      </View>

      {/* Pro Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        {settings.isPro ? (
          <View style={styles.proRow}>
            <Text style={styles.proLabel}>⭐ FocusForge Pro</Text>
            <Text style={styles.proActive}>Unlimited • No Ads • Full Stats</Text>
          </View>
        ) : (
          <View>
            <View style={styles.proRow}>
              <Text style={styles.proLabel}>Free Plan</Text>
              <Text style={styles.proHint}>{settings.dailyFreeLimit} sessions/day • Ads shown</Text>
            </View>
            <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgrade}>
              <Text style={styles.upgradeText}>⭐ Upgrade to Pro — $1.99</Text>
              <Text style={styles.upgradeSubtext}>No ads • Unlimited sessions • Custom presets</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Data */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data</Text>
        <TouchableOpacity style={styles.dangerButton} onPress={handleClearData}>
          <Text style={styles.dangerText}>Clear Session History</Text>
        </TouchableOpacity>
      </View>

      {/* Privacy & Legal */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Legal</Text>
        <TouchableOpacity style={styles.row} onPress={() => Linking.openURL('process.env.PRIVACY_URL || 'https://your-site.com/privacy-policy/'')}>
          <Text style={styles.rowLabel}>Privacy Policy</Text>
          <Text style={styles.rowValue}>→</Text>
        </TouchableOpacity>
        <Text style={styles.footerSubtext}>This app uses Google AdMob for advertising. Ad data is processed by Google per their privacy policy.</Text>
      </View>

      {/* App Info */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>FocusForge v1.0.0</Text>
        <Text style={styles.footerSubtext}>
          Discipline equals freedom.
        </Text>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingTop: 50,
    paddingHorizontal: SPACING.lg,
  },
  loading: {
    color: COLORS.textDim,
    textAlign: 'center',
    marginTop: 100,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.lg,
  },
  // Sections
  section: {
    marginBottom: SPACING.lg + 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.sm + 2,
  },
  sectionHint: {
    fontSize: 12,
    color: COLORS.textDim,
    marginBottom: SPACING.sm,
  },
  // Option chips
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  optionChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionChipActive: {
    backgroundColor: COLORS.accent + '20',
    borderColor: COLORS.accent,
  },
  optionText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  optionTextActive: {
    color: COLORS.accent,
  },
  // Toggle
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  toggleLabel: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '500',
  },
  // Streak
  streakInfo: {
    flexDirection: 'row',
  },
  streakItem: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  streakValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  streakLabel: {
    fontSize: 12,
    color: COLORS.textDim,
    fontWeight: '500',
  },
  // Pro
  proRow: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
  },
  proLabel: {
    color: COLORS.accent,
    fontSize: 16,
    fontWeight: '700',
  },
  proHint: {
    color: COLORS.textDim,
    fontSize: 12,
    marginTop: 4,
  },
  proActive: {
    color: COLORS.textDim,
    fontSize: 12,
    marginTop: SPACING.xs,
    paddingHorizontal: SPACING.md,
  },
  upgradeButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    padding: SPACING.md,
    marginTop: SPACING.sm,
    alignItems: 'center',
  },
  upgradeText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '800',
  },
  upgradeSubtext: {
    color: '#000000aa',
    fontSize: 11,
    marginTop: 2,
  },
  // Danger
  dangerButton: {
    borderWidth: 1,
    borderColor: COLORS.danger + '40',
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: 'center',
  },
  dangerText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: '600',
  },
  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    marginTop: SPACING.md,
  },
  footerText: {
    color: COLORS.textDim,
    fontSize: 13,
    fontWeight: '500',
  },
  footerSubtext: {
    color: COLORS.textDim + '80',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
});

export default SettingsScreen;
