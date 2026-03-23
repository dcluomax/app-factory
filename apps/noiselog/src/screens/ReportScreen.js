/**
 * ReportScreen.js — PDF report generator & settings
 * 
 * Allows users to configure report parameters (address, date range),
 * generate a professional PDF noise incident report, and share it.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getIncidents, getSettings, saveSettings } from '../utils/storage';
import { generateAndShareReport, generatePdfReport } from '../utils/reportGenerator';
import { getTheme } from '../theme';
import { getLevelForDb } from '../utils/thresholds';

export default function ReportScreen() {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);

  const [address, setAddress] = useState('');
  const [incidents, setIncidents] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [lastReportUri, setLastReportUri] = useState(null);

  // Date range — default: last 7 days
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return formatDateForInput(d);
  });
  const [endDate, setEndDate] = useState(() => formatDateForInput(new Date()));

  // Load settings & incidents
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      const settings = await getSettings();
      if (settings.address) setAddress(settings.address);
      const items = await getIncidents();
      setIncidents(items);
    } catch (err) {
      console.error('Error loading report data:', err);
    }
  };

  /**
   * Filter incidents by the selected date range.
   */
  const getFilteredIncidents = () => {
    const start = parseDateInput(startDate);
    const end = parseDateInput(endDate);
    if (!start || !end) return incidents;

    // Set end to end of day
    end.setHours(23, 59, 59, 999);

    return incidents.filter(
      (i) => i.timestamp >= start.getTime() && i.timestamp <= end.getTime()
    );
  };

  /**
   * Generate and share the PDF report.
   */
  const handleGenerateReport = async () => {
    const filtered = getFilteredIncidents();

    if (filtered.length === 0) {
      Alert.alert(
        'No Incidents',
        'No incidents found for the selected date range. Log some incidents first.',
      );
      return;
    }

    setGenerating(true);

    try {
      // Save address to settings for future use
      if (address.trim()) {
        await saveSettings({ address: address.trim() });
      }

      const uri = await generateAndShareReport({
        address: address.trim() || 'Not specified',
        incidents: filtered,
        startDate,
        endDate,
      });

      setLastReportUri(uri);
    } catch (err) {
      console.error('Report generation failed:', err);
      Alert.alert('Error', 'Failed to generate report. Please try again.');
    }

    setGenerating(false);
  };

  /**
   * Generate without sharing (just save).
   */
  const handleGenerateOnly = async () => {
    const filtered = getFilteredIncidents();

    if (filtered.length === 0) {
      Alert.alert('No Incidents', 'No incidents found for the selected date range.');
      return;
    }

    setGenerating(true);

    try {
      if (address.trim()) {
        await saveSettings({ address: address.trim() });
      }

      const uri = await generatePdfReport({
        address: address.trim() || 'Not specified',
        incidents: filtered,
        startDate,
        endDate,
      });

      setLastReportUri(uri);
      Alert.alert('✅ Report Generated', `PDF saved successfully.\n\nIncidents: ${filtered.length}`);
    } catch (err) {
      console.error('Report generation failed:', err);
      Alert.alert('Error', 'Failed to generate report.');
    }

    setGenerating(false);
  };

  const filteredCount = getFilteredIncidents().length;
  const filteredIncidents = getFilteredIncidents();
  const avgPeak = filteredCount > 0
    ? Math.round(filteredIncidents.reduce((s, i) => s + (i.peakDb || 0), 0) / filteredCount)
    : 0;
  const maxPeak = filteredCount > 0
    ? Math.max(...filteredIncidents.map((i) => i.peakDb || 0))
    : 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Title */}
      <Text style={[styles.title, { color: theme.colors.text }]}>
        📊 Noise Incident Report
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
        Generate a professional PDF report of your noise incident log for complaints or legal evidence.
      </Text>

      {/* Location */}
      <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          📍 Location
        </Text>
        <TextInput
          style={[styles.input, {
            color: theme.colors.text,
            backgroundColor: theme.colors.surfaceVariant,
            borderColor: theme.colors.border,
          }]}
          placeholder="Enter your address..."
          placeholderTextColor={theme.colors.textMuted}
          value={address}
          onChangeText={setAddress}
        />
      </View>

      {/* Date Range */}
      <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          📅 Date Range
        </Text>
        <View style={styles.dateRow}>
          <View style={styles.dateField}>
            <Text style={[styles.dateLabel, { color: theme.colors.textSecondary }]}>From</Text>
            <TextInput
              style={[styles.dateInput, {
                color: theme.colors.text,
                backgroundColor: theme.colors.surfaceVariant,
                borderColor: theme.colors.border,
              }]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.colors.textMuted}
              value={startDate}
              onChangeText={setStartDate}
              maxLength={10}
            />
          </View>
          <Text style={[styles.dateSep, { color: theme.colors.textMuted }]}>→</Text>
          <View style={styles.dateField}>
            <Text style={[styles.dateLabel, { color: theme.colors.textSecondary }]}>To</Text>
            <TextInput
              style={[styles.dateInput, {
                color: theme.colors.text,
                backgroundColor: theme.colors.surfaceVariant,
                borderColor: theme.colors.border,
              }]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.colors.textMuted}
              value={endDate}
              onChangeText={setEndDate}
              maxLength={10}
            />
          </View>
        </View>
      </View>

      {/* Preview Stats */}
      <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          📋 Report Preview
        </Text>
        <View style={styles.previewGrid}>
          <View style={[styles.previewItem, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Text style={[styles.previewValue, { color: theme.colors.primary }]}>{filteredCount}</Text>
            <Text style={[styles.previewLabel, { color: theme.colors.textMuted }]}>Incidents</Text>
          </View>
          <View style={[styles.previewItem, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Text style={[styles.previewValue, { color: theme.colors.text }]}>{avgPeak} dB</Text>
            <Text style={[styles.previewLabel, { color: theme.colors.textMuted }]}>Avg Peak</Text>
          </View>
          <View style={[styles.previewItem, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Text style={[styles.previewValue, { color: maxPeak > 70 ? '#F44336' : theme.colors.text }]}>
              {maxPeak} dB
            </Text>
            <Text style={[styles.previewLabel, { color: theme.colors.textMuted }]}>Max Peak</Text>
          </View>
        </View>

        {/* Quick incident list */}
        {filteredCount > 0 && (
          <View style={styles.quickList}>
            {filteredIncidents.slice(0, 5).map((inc, idx) => {
              const level = getLevelForDb(inc.peakDb);
              return (
                <View key={inc.id} style={[styles.quickItem, { borderBottomColor: theme.colors.divider }]}>
                  <Text style={[styles.quickNum, { color: theme.colors.textMuted }]}>#{idx + 1}</Text>
                  <Text style={[styles.quickDate, { color: theme.colors.text }]}>
                    {new Date(inc.timestamp).toLocaleDateString()}
                  </Text>
                  <Text style={[styles.quickDb, { color: level.color }]}>{inc.peakDb} dB</Text>
                  <View style={[styles.quickBadge, { backgroundColor: level.color }]}>
                    <Text style={styles.quickBadgeText}>{level.label}</Text>
                  </View>
                </View>
              );
            })}
            {filteredCount > 5 && (
              <Text style={[styles.moreText, { color: theme.colors.textMuted }]}>
                ...and {filteredCount - 5} more incidents
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Ordinance Reference */}
      <View style={[styles.ordinanceBox, { backgroundColor: theme.dark ? '#1a237e' : '#e3f2fd' }]}>
        <Text style={[styles.ordinanceTitle, { color: theme.dark ? '#90caf9' : '#1565C0' }]}>
          ⚖️ Typical Residential Noise Ordinance
        </Text>
        <Text style={[styles.ordinanceText, { color: theme.dark ? '#bbdefb' : '#1976D2' }]}>
          Daytime (7am–10pm): 55 dB maximum
        </Text>
        <Text style={[styles.ordinanceText, { color: theme.dark ? '#bbdefb' : '#1976D2' }]}>
          Nighttime (10pm–7am): 45 dB maximum
        </Text>
        <Text style={[styles.ordinanceNote, { color: theme.dark ? '#64b5f6' : '#42A5F5' }]}>
          Note: Limits vary by municipality. Check your local ordinance.
        </Text>
      </View>

      {/* Generate Buttons */}
      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={[styles.generateBtn, { backgroundColor: theme.colors.primary }]}
          onPress={handleGenerateReport}
          disabled={generating}
        >
          {generating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.generateBtnText}>📤 Generate & Share PDF</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveBtn, { borderColor: theme.colors.primary }]}
          onPress={handleGenerateOnly}
          disabled={generating}
        >
          <Text style={[styles.saveBtnText, { color: theme.colors.primary }]}>
            💾 Generate PDF Only
          </Text>
        </TouchableOpacity>
      </View>

      {/* Disclaimer */}
      <View style={[styles.disclaimer, { backgroundColor: theme.colors.surfaceVariant }]}>
        <Text style={[styles.disclaimerText, { color: theme.colors.textMuted }]}>
          ⚠️ <Text style={{ fontWeight: '700' }}>DISCLAIMER:</Text> Measurements are approximate
          and taken using a smartphone microphone. Not calibrated to laboratory standards.
          Results should be used as supplementary evidence only.
        </Text>
      </View>
    </ScrollView>
  );
}

/**
 * Format a Date to YYYY-MM-DD string.
 */
function formatDateForInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse a YYYY-MM-DD string to a Date.
 */
function parseDateInput(str) {
  const parts = str.split('-');
  if (parts.length !== 3) return null;
  const [year, month, day] = parts.map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  section: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  dateField: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    marginBottom: 4,
    fontWeight: '500',
  },
  dateInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    textAlign: 'center',
  },
  dateSep: {
    fontSize: 18,
    paddingBottom: 12,
  },
  previewGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  previewItem: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  previewValue: {
    fontSize: 20,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  previewLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  quickList: {
    marginTop: 4,
  },
  quickItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 8,
  },
  quickNum: {
    fontSize: 12,
    width: 25,
  },
  quickDate: {
    fontSize: 13,
    flex: 1,
  },
  quickDb: {
    fontSize: 14,
    fontWeight: '700',
  },
  quickBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  quickBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  moreText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  ordinanceBox: {
    padding: 16,
    borderRadius: 14,
    marginBottom: 20,
  },
  ordinanceTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  ordinanceText: {
    fontSize: 14,
    marginBottom: 3,
  },
  ordinanceNote: {
    fontSize: 12,
    marginTop: 6,
    fontStyle: 'italic',
  },
  buttonGroup: {
    gap: 10,
    marginBottom: 20,
  },
  generateBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 3,
  },
  generateBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  saveBtn: {
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  disclaimer: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  disclaimerText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});
