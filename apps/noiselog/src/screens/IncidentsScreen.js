/**
 * IncidentsScreen.js — Incident history list
 * 
 * Shows all logged incidents with filtering and deletion support.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  useColorScheme,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import IncidentCard from '../components/IncidentCard';
import { getIncidents, deleteIncident, clearIncidents } from '../utils/storage';
import { getTheme } from '../theme';

// Date filter options
const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
];

/**
 * Get start of today, this week, or this month as timestamps.
 */
function getFilterStart(filterKey) {
  const now = new Date();
  switch (filterKey) {
    case 'today': {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return d.getTime();
    }
    case 'week': {
      const d = new Date(now);
      d.setDate(d.getDate() - d.getDay()); // Start of week (Sunday)
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }
    case 'month': {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      return d.getTime();
    }
    default:
      return 0;
  }
}

export default function IncidentsScreen() {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);

  const [incidents, setIncidents] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Reload incidents whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadIncidents();
    }, [activeFilter])
  );

  const loadIncidents = async () => {
    setLoading(true);
    try {
      let items = await getIncidents();
      
      // Apply date filter
      if (activeFilter !== 'all') {
        const startTs = getFilterStart(activeFilter);
        items = items.filter((i) => i.timestamp >= startTs);
      }

      setIncidents(items);
    } catch (err) {
      console.error('Failed to load incidents:', err);
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    try {
      await deleteIncident(id);
      setIncidents((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      Alert.alert('Error', 'Failed to delete incident.');
    }
  };

  const handleClearAll = () => {
    Alert.alert(
      '🗑️ Clear All Incidents',
      'This will permanently delete all logged incidents. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await clearIncidents();
            setIncidents([]);
          },
        },
      ]
    );
  };

  // Summary stats
  const totalIncidents = incidents.length;
  const avgPeak = totalIncidents > 0
    ? Math.round(incidents.reduce((sum, i) => sum + (i.peakDb || 0), 0) / totalIncidents)
    : 0;
  const maxPeak = totalIncidents > 0 ? Math.max(...incidents.map((i) => i.peakDb || 0)) : 0;

  const renderItem = useCallback(({ item }) => (
    <IncidentCard
      incident={item}
      onDelete={handleDelete}
      theme={theme}
    />
  ), [theme]);

  const keyExtractor = useCallback((item) => item.id, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header with summary */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: theme.colors.primary }]}>
              {totalIncidents}
            </Text>
            <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>
              Incidents
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
              {avgPeak}
            </Text>
            <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>
              Avg Peak dB
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: '#F44336' }]}>
              {maxPeak}
            </Text>
            <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>
              Max Peak dB
            </Text>
          </View>
        </View>

        {/* Date filter chips */}
        <View style={styles.filterRow}>
          {FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterChip,
                {
                  backgroundColor: activeFilter === filter.key
                    ? theme.colors.primary
                    : theme.colors.surfaceVariant,
                },
              ]}
              onPress={() => setActiveFilter(filter.key)}
            >
              <Text
                style={[
                  styles.filterText,
                  {
                    color: activeFilter === filter.key ? '#fff' : theme.colors.textSecondary,
                  },
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Clear all button */}
          {totalIncidents > 0 && (
            <TouchableOpacity
              style={[styles.filterChip, { backgroundColor: '#FFEBEE' }]}
              onPress={handleClearAll}
            >
              <Text style={[styles.filterText, { color: '#F44336' }]}>🗑️</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Incident list */}
      {totalIncidents === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyIcon]}>📋</Text>
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
            No incidents logged
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.colors.textMuted }]}>
            Start the meter and tap "Record Incident" or enable auto-detection to begin logging noise events.
          </Text>
        </View>
      ) : (
        <FlatList
          data={incidents}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  summaryLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    paddingTop: 12,
    paddingBottom: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
