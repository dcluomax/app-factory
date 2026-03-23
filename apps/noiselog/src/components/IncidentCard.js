/**
 * IncidentCard.js — Individual incident list item
 * 
 * Displays incident details in a card format with severity badge.
 * Supports swipe to delete (long press).
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import SeverityBadge from './SeverityBadge';

/**
 * Format timestamp to readable date + time.
 */
function formatDateTime(ts) {
  const d = new Date(ts);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  let hours = d.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}  ${hours}:${mins} ${ampm}`;
}

/**
 * Format duration in seconds to human-readable string.
 */
function formatDuration(seconds) {
  if (!seconds || seconds < 1) return '< 1 sec';
  if (seconds < 60) return `${Math.round(seconds)} sec`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins > 0 ? `${hours}h ${remainMins}min` : `${hours}h`;
}

export default function IncidentCard({ incident, onDelete, theme }) {
  const handleLongPress = () => {
    Alert.alert(
      'Delete Incident',
      'Are you sure you want to remove this incident from your log?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete?.(incident.id) },
      ]
    );
  };

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
      onLongPress={handleLongPress}
      activeOpacity={0.8}
    >
      {/* Header: time + severity */}
      <View style={styles.header}>
        <Text style={[styles.dateText, { color: theme.colors.text }]}>
          {formatDateTime(incident.timestamp)}
        </Text>
        <SeverityBadge db={incident.peakDb} size="small" />
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: theme.colors.primary }]}>
            {incident.peakDb}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>
            Peak dB
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: theme.colors.text }]}>
            {incident.avgDb}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>
            Avg dB
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: theme.colors.text }]}>
            {formatDuration(incident.duration)}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>
            Duration
          </Text>
        </View>
      </View>

      {/* Note (if any) */}
      {incident.note ? (
        <View style={[styles.noteContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Text style={[styles.noteText, { color: theme.colors.textSecondary }]}>
            📝 "{incident.note}"
          </Text>
        </View>
      ) : null}

      {/* Auto-detected badge */}
      {incident.autoDetected && (
        <Text style={[styles.autoTag, { color: theme.colors.textMuted }]}>
          🤖 Auto-detected
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  noteContainer: {
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  noteText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  autoTag: {
    fontSize: 11,
    marginTop: 6,
    textAlign: 'right',
  },
});
