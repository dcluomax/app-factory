import { BannerAd, BannerAdSize, BANNER_UNIT_ID } from '../utils/ads';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import { COLORS, SPACING } from '../theme';
import { getStatsForPeriod, getStreak, getSessions } from '../utils/storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - SPACING.lg * 2;
const CHART_HEIGHT = 160;
const CHART_PADDING = { top: 20, bottom: 30, left: 10, right: 10 };


// Gamification levels
const LEVELS = [
  { min: 0, title: 'Rookie', icon: '🌱', color: '#78909C', perk: 'Welcome! Complete 3 sessions to level up' },
  { min: 3, title: 'Focused', icon: '🎯', color: '#66BB6A', perk: 'Unlocked: Session history' },
  { min: 10, title: 'Warrior', icon: '⚔️', color: '#42A5F5', perk: 'Unlocked: Weekly chart' },
  { min: 25, title: 'Master', icon: '🧠', color: '#AB47BC', perk: 'Unlocked: Custom presets' },
  { min: 50, title: 'Legend', icon: '👑', color: '#FFB300', perk: 'Unlocked: Focus score insights' },
  { min: 100, title: 'Titan', icon: '⚡', color: '#FF7043', perk: 'Unlocked: Export data' },
  { min: 200, title: 'Immortal', icon: '🔱', color: '#EF5350', perk: 'Max level reached' },
];

function getLevel(n) { let l = LEVELS[0]; for (const x of LEVELS) if (n >= x.min) l = x; return l; }
function getNext(n) { for (const x of LEVELS) if (n < x.min) return x; return null; }
function getProgress(n) { const c = getLevel(n); const nx = getNext(n); if (!nx) return 1; return Math.min(1, (n - c.min) / (nx.min - c.min)); }

const LevelCard = ({ totalSessions = 0 }) => {
  const level = getLevel(totalSessions);
  const next = getNext(totalSessions);
  const progress = getProgress(totalSessions);
  return (
    <View style={lcStyles.card}>
      <View style={lcStyles.topRow}>
        <Text style={lcStyles.icon}>{level.icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[lcStyles.title, { color: level.color }]}>{level.title}</Text>
          <Text style={lcStyles.perk}>{level.perk}</Text>
        </View>
        <View style={lcStyles.xpBox}>
          <Text style={[lcStyles.xpNum, { color: level.color }]}>{totalSessions}</Text>
          <Text style={lcStyles.xpLabel}>XP</Text>
        </View>
      </View>
      {next && (
        <View style={lcStyles.barRow}>
          <View style={lcStyles.barBg}>
            <View style={[lcStyles.barFill, { width: `${progress * 100}%`, backgroundColor: level.color }]} />
          </View>
          <Text style={lcStyles.nextText}>{next.icon} {next.min - totalSessions} to {next.title}</Text>
        </View>
      )}
      {!next && <Text style={[lcStyles.nextText, { textAlign: 'center', marginTop: 6 }]}>🏆 MAX LEVEL</Text>}
    </View>
  );
};

const lcStyles = StyleSheet.create({
  card: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.surfaceLight },
  topRow: { flexDirection: 'row', alignItems: 'center' },
  icon: { fontSize: 36, marginRight: 12 },
  title: { fontSize: 20, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase' },
  perk: { fontSize: 11, color: COLORS.textDim, marginTop: 2 },
  xpBox: { alignItems: 'center' },
  xpNum: { fontSize: 28, fontWeight: '900' },
  xpLabel: { fontSize: 10, color: COLORS.textDim, fontWeight: '700', letterSpacing: 1 },
  barRow: { marginTop: 10 },
  barBg: { height: 6, backgroundColor: COLORS.primaryDark, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  nextText: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4, fontWeight: '500' },
});

const PERIODS = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
];

const StatsScreen = () => {
  const [selectedPeriod, setSelectedPeriod] = useState(0);
  const [stats, setStats] = useState(null);
  const [streak, setStreak] = useState({ current: 0, best: 0 });
  const [recentSessions, setRecentSessions] = useState([]);

  const loadStats = useCallback(async () => {
    const period = PERIODS[selectedPeriod];
    const s = await getStatsForPeriod(period.days);
    setStats(s);
    const st = await getStreak();
    setStreak(st);
    const sessions = await getSessions();
    setRecentSessions(sessions.slice(0, 10));
  }, [selectedPeriod]);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats])
  );

  useEffect(() => {
    loadStats();
  }, [selectedPeriod]);

  if (!stats) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Loading stats...</Text>
      </View>
    );
  }

  const maxMinutes = Math.max(...stats.dailyData.map((d) => d.focusMinutes), 1);

  // Chart dimensions
  const plotWidth = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
  const plotHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;
  const barWidth = Math.max(
    4,
    Math.min(24, (plotWidth / stats.dailyData.length) * 0.65)
  );
  const barGap = plotWidth / stats.dailyData.length;

  const formatMinutes = (mins) => {
    if (mins >= 60) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }
    return `${mins}m`;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Level Card */}
      <LevelCard totalSessions={stats.completedSessions + recentSessions.length} />

      {/* Period Selector */}
      <View style={styles.periodRow}>
        {PERIODS.map((period, idx) => (
          <TouchableOpacity
            key={period.label}
            style={[
              styles.periodBtn,
              idx === selectedPeriod && styles.periodBtnActive,
            ]}
            onPress={() => setSelectedPeriod(idx)}
          >
            <Text
              style={[
                styles.periodText,
                idx === selectedPeriod && styles.periodTextActive,
              ]}
            >
              {period.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary Cards */}
      <View style={styles.cardRow}>
        <View style={styles.card}>
          <Text style={styles.cardValue}>
            {formatMinutes(stats.totalFocusMinutes)}
          </Text>
          <Text style={styles.cardLabel}>Total Focus</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardValue}>{stats.completedSessions}</Text>
          <Text style={styles.cardLabel}>Completed</Text>
        </View>
        <View style={styles.card}>
          <Text style={[styles.cardValue, { color: COLORS.accent }]}>
            {stats.avgFocusScore}%
          </Text>
          <Text style={styles.cardLabel}>Avg Score</Text>
        </View>
      </View>

      <View style={styles.cardRow}>
        <View style={styles.card}>
          <Text style={[styles.cardValue, { color: COLORS.accent }]}>
            🔥 {streak.current}
          </Text>
          <Text style={styles.cardLabel}>Streak</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardValue}>{streak.best}</Text>
          <Text style={styles.cardLabel}>Best Streak</Text>
        </View>
        <View style={styles.card}>
          <Text style={[styles.cardValue, { color: COLORS.danger }]}>
            {stats.brokenSessions}
          </Text>
          <Text style={styles.cardLabel}>Broken</Text>
        </View>
      </View>

      {/* Chart */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Daily Focus Time</Text>
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          {/* Grid line */}
          <Line
            x1={CHART_PADDING.left}
            y1={CHART_PADDING.top + plotHeight}
            x2={CHART_WIDTH - CHART_PADDING.right}
            y2={CHART_PADDING.top + plotHeight}
            stroke={COLORS.textDim + '30'}
            strokeWidth={1}
          />
          {/* Bars */}
          {stats.dailyData.map((d, i) => {
            const barHeight = maxMinutes > 0
              ? (d.focusMinutes / maxMinutes) * plotHeight
              : 0;
            const x = CHART_PADDING.left + i * barGap + (barGap - barWidth) / 2;
            const y = CHART_PADDING.top + plotHeight - barHeight;

            return (
              <React.Fragment key={d.date}>
                <Rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.max(barHeight, 0)}
                  rx={barWidth / 2 > 4 ? 4 : barWidth / 2}
                  fill={d.focusMinutes > 0 ? COLORS.accent : COLORS.textDim + '20'}
                />
                {/* Day label — show every nth label to avoid crowding */}
                {(stats.dailyData.length <= 14 ||
                  i % Math.ceil(stats.dailyData.length / 10) === 0) && (
                  <SvgText
                    x={x + barWidth / 2}
                    y={CHART_HEIGHT - 5}
                    fill={COLORS.textDim}
                    fontSize={9}
                    textAnchor="middle"
                  >
                    {d.label}
                  </SvgText>
                )}
              </React.Fragment>
            );
          })}
        </Svg>
      </View>

      {/* Recent Sessions */}
      <View style={styles.recentSection}>
        <Text style={styles.chartTitle}>Recent Sessions</Text>
        {recentSessions.length === 0 ? (
          <Text style={styles.emptyText}>No sessions yet. Get to work.</Text>
        ) : (
          recentSessions.map((s) => (
            <View key={s.id} style={styles.sessionRow}>
              <View style={styles.sessionLeft}>
                <Text style={styles.sessionIcon}>
                  {s.broken ? '💀' : s.completed ? '✅' : '⏸'}
                </Text>
                <View>
                  <Text style={styles.sessionDuration}>
                    {s.duration} min {s.type === 'break' ? '(break)' : ''}
                  </Text>
                  <Text style={styles.sessionDate}>
                    {new Date(s.date).toLocaleDateString('en', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              </View>
              <View style={styles.sessionRight}>
                <Text
                  style={[
                    styles.sessionScore,
                    {
                      color: s.focusScore >= 90
                        ? COLORS.success
                        : s.focusScore >= 70
                        ? COLORS.accent
                        : COLORS.danger,
                    },
                  ]}
                >
                  {s.focusScore}%
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={{ height: 40 }} />
      <View style={{ alignItems: 'center', marginBottom: 10 }}>
        <BannerAd unitId={BANNER_UNIT_ID} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
      </View>
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
    marginBottom: SPACING.md,
  },
  // Period selector
  periodRow: {
    flexDirection: 'row',
    marginBottom: SPACING.lg,
  },
  periodBtn: {
    paddingHorizontal: SPACING.md + 4,
    paddingVertical: SPACING.sm,
    borderRadius: 16,
    marginRight: SPACING.sm,
    backgroundColor: COLORS.surfaceLight,
  },
  periodBtnActive: {
    backgroundColor: COLORS.accent,
  },
  periodText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  periodTextActive: {
    color: COLORS.primaryDark,
  },
  // Cards
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  card: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    marginHorizontal: 3,
    alignItems: 'center',
  },
  cardValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  cardLabel: {
    fontSize: 11,
    color: COLORS.textDim,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Chart
  chartContainer: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  // Recent sessions
  recentSection: {
    marginTop: SPACING.lg,
  },
  emptyText: {
    color: COLORS.textDim,
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: SPACING.xl,
  },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  sessionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionIcon: {
    fontSize: 20,
    marginRight: SPACING.sm,
  },
  sessionDuration: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },
  sessionDate: {
    color: COLORS.textDim,
    fontSize: 12,
    marginTop: 2,
  },
  sessionRight: {
    alignItems: 'flex-end',
  },
  sessionScore: {
    fontSize: 18,
    fontWeight: '700',
  },
});

export default StatsScreen;
