/**
 * SeverityBadge.js — Color-coded severity indicator
 * 
 * Shows 🟢 Quiet / 🟡 Moderate / 🟠 Loud / 🔴 Very Loud badges.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getLevelForDb } from '../utils/thresholds';

export default function SeverityBadge({ db, size = 'medium' }) {
  const level = getLevelForDb(db);
  const isSmall = size === 'small';

  return (
    <View style={[styles.badge, { backgroundColor: level.color }, isSmall && styles.badgeSmall]}>
      <Text style={[styles.text, isSmall && styles.textSmall]}>
        {level.emoji} {level.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  badgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  textSmall: {
    fontSize: 11,
  },
});
