/**
 * DbGauge.js — Big dB number display with color-coded background
 * 
 * The centerpiece of the meter screen. Shows the current dB level
 * as a large number with a color that shifts based on severity.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { getColorForDb, getLevelForDb, ORDINANCE, isNighttime } from '../utils/thresholds';

export default function DbGauge({ db, theme }) {
  const level = getLevelForDb(db);
  const animatedWidth = useRef(new Animated.Value(0)).current;

  // Animate the level bar width (0–100% based on dB, max 130)
  useEffect(() => {
    const percent = Math.min(100, (db / 120) * 100);
    Animated.timing(animatedWidth, {
      toValue: percent,
      duration: 150,
      useNativeDriver: false,
    }).start();
  }, [db]);

  const currentLimit = isNighttime() ? ORDINANCE.nighttime.limit : ORDINANCE.daytime.limit;
  const overLimit = db > currentLimit;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.meterBackground }]}>
      {/* Main dB display */}
      <View style={styles.dbContainer}>
        <Text style={[styles.dbValue, { color: level.color }]}>
          {db}
        </Text>
        <Text style={[styles.dbUnit, { color: theme.colors.textSecondary }]}>dB</Text>
      </View>

      {/* Level label */}
      <Text style={[styles.levelLabel, { color: level.color }]}>
        {level.emoji} {level.label}
      </Text>
      <Text style={[styles.levelDesc, { color: theme.colors.textMuted }]}>
        {level.description}
      </Text>

      {/* Animated level bar */}
      <View style={[styles.barContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
        <Animated.View
          style={[
            styles.bar,
            {
              backgroundColor: level.color,
              width: animatedWidth.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
        {/* Threshold marker */}
        <View
          style={[
            styles.thresholdMarker,
            { left: `${(currentLimit / 120) * 100}%` },
          ]}
        >
          <View style={[styles.thresholdLine, { backgroundColor: theme.colors.text }]} />
        </View>
      </View>

      {/* Ordinance reference */}
      <View style={styles.ordinanceRow}>
        <Text style={[styles.ordinanceText, { color: theme.colors.textMuted }]}>
          {isNighttime() ? '🌙 Night limit: 45 dB' : '☀️ Day limit: 55 dB'}
        </Text>
        {overLimit && (
          <Text style={styles.overLimitBadge}>
            ⚠️ OVER LIMIT
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 10,
  },
  dbContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  dbValue: {
    fontSize: 96,
    fontWeight: '800',
    lineHeight: 96,
    fontVariant: ['tabular-nums'],
  },
  dbUnit: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 14,
    marginLeft: 4,
  },
  levelLabel: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 2,
  },
  levelDesc: {
    fontSize: 14,
    marginBottom: 20,
  },
  barContainer: {
    width: '100%',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  bar: {
    height: '100%',
    borderRadius: 6,
  },
  thresholdMarker: {
    position: 'absolute',
    top: -4,
    bottom: -4,
    width: 2,
  },
  thresholdLine: {
    width: 2,
    height: 20,
    opacity: 0.5,
  },
  ordinanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 12,
  },
  ordinanceText: {
    fontSize: 12,
  },
  overLimitBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F44336',
  },
});
