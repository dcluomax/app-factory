import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING } from '../theme';

const StreakBadge = ({ streak, dailyCount = 0 }) => {
  return (
    <View style={styles.row}>
      <View style={styles.item}>
        <Text style={styles.emoji}>{streak > 0 ? '🔥' : '❄️'}</Text>
        <Text style={[styles.num, streak > 0 && { color: COLORS.accent }]}>{streak}</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.item}>
        <Text style={styles.num}>{dailyCount}</Text>
        <Text style={styles.label}>today</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 12 },
  emoji: { fontSize: 18, marginRight: 4 },
  num: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginRight: 2 },
  label: { fontSize: 12, color: COLORS.textDim, fontWeight: '500' },
  divider: { width: 1, height: 20, backgroundColor: COLORS.textDim + '40' },
});

export default StreakBadge;
