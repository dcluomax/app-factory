/**
 * LevelGraph.js — Rolling 60-second SVG line chart of dB levels
 * 
 * Draws a smooth line chart using react-native-svg showing
 * the last 60 seconds of dB readings.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polyline, Line, Text as SvgText, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import { ORDINANCE, isNighttime } from '../utils/thresholds';

const GRAPH_WIDTH = 340;
const GRAPH_HEIGHT = 140;
const PADDING_LEFT = 35;
const PADDING_RIGHT = 10;
const PADDING_TOP = 10;
const PADDING_BOTTOM = 20;
const CHART_WIDTH = GRAPH_WIDTH - PADDING_LEFT - PADDING_RIGHT;
const CHART_HEIGHT = GRAPH_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

// Max dB on the Y axis
const MAX_DB = 110;
const MIN_DB = 20;

/**
 * Convert dB value to Y coordinate on the chart.
 */
function dbToY(db) {
  const clamped = Math.max(MIN_DB, Math.min(MAX_DB, db));
  const ratio = (clamped - MIN_DB) / (MAX_DB - MIN_DB);
  return PADDING_TOP + CHART_HEIGHT - ratio * CHART_HEIGHT;
}

/**
 * Convert data index to X coordinate on the chart.
 */
function indexToX(index, totalPoints) {
  if (totalPoints <= 1) return PADDING_LEFT;
  const ratio = index / (totalPoints - 1);
  return PADDING_LEFT + ratio * CHART_WIDTH;
}

export default function LevelGraph({ dataPoints = [], theme }) {
  // dataPoints is an array of dB values, newest last, covering ~60 seconds
  const maxPoints = 300; // 60 seconds at ~5 readings/sec (200ms interval)

  // Build the polyline points string
  const pointsStr = useMemo(() => {
    if (!dataPoints.length) return '';
    const points = dataPoints.slice(-maxPoints);
    return points
      .map((db, i) => `${indexToX(i, points.length)},${dbToY(db)}`)
      .join(' ');
  }, [dataPoints]);

  // Calculate the fill polygon (for area under curve)
  const fillPoints = useMemo(() => {
    if (!dataPoints.length) return '';
    const points = dataPoints.slice(-maxPoints);
    const linePoints = points
      .map((db, i) => `${indexToX(i, points.length)},${dbToY(db)}`)
      .join(' ');
    const lastX = indexToX(points.length - 1, points.length);
    const firstX = indexToX(0, points.length);
    const bottomY = PADDING_TOP + CHART_HEIGHT;
    return `${firstX},${bottomY} ${linePoints} ${lastX},${bottomY}`;
  }, [dataPoints]);

  const currentLimit = isNighttime() ? ORDINANCE.nighttime.limit : ORDINANCE.daytime.limit;
  const limitY = dbToY(currentLimit);

  // Y-axis gridlines
  const gridLines = [30, 50, 70, 90, 110];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.title, { color: theme.colors.textSecondary }]}>
        📈 Sound Level — Last 60 seconds
      </Text>
      <Svg width={GRAPH_WIDTH} height={GRAPH_HEIGHT}>
        <Defs>
          <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#EF6C00" stopOpacity="0.3" />
            <Stop offset="100%" stopColor="#EF6C00" stopOpacity="0.02" />
          </LinearGradient>
        </Defs>

        {/* Background */}
        <Rect
          x={PADDING_LEFT}
          y={PADDING_TOP}
          width={CHART_WIDTH}
          height={CHART_HEIGHT}
          fill={theme.dark ? '#1a1a1a' : '#fafafa'}
          rx={4}
        />

        {/* Grid lines and labels */}
        {gridLines.map((db) => (
          <React.Fragment key={db}>
            <Line
              x1={PADDING_LEFT}
              y1={dbToY(db)}
              x2={PADDING_LEFT + CHART_WIDTH}
              y2={dbToY(db)}
              stroke={theme.dark ? '#333' : '#e0e0e0'}
              strokeWidth={0.5}
            />
            <SvgText
              x={PADDING_LEFT - 5}
              y={dbToY(db) + 4}
              fontSize={9}
              fill={theme.colors.textMuted}
              textAnchor="end"
            >
              {db}
            </SvgText>
          </React.Fragment>
        ))}

        {/* Noise limit threshold line (dashed) */}
        <Line
          x1={PADDING_LEFT}
          y1={limitY}
          x2={PADDING_LEFT + CHART_WIDTH}
          y2={limitY}
          stroke="#F44336"
          strokeWidth={1}
          strokeDasharray="4,3"
          opacity={0.7}
        />
        <SvgText
          x={PADDING_LEFT + CHART_WIDTH - 2}
          y={limitY - 4}
          fontSize={8}
          fill="#F44336"
          textAnchor="end"
          opacity={0.8}
        >
          Limit {currentLimit}dB
        </SvgText>

        {/* Area fill under curve */}
        {fillPoints ? (
          <Polyline
            points={fillPoints}
            fill="url(#areaGrad)"
            stroke="none"
          />
        ) : null}

        {/* Main data line */}
        {pointsStr ? (
          <Polyline
            points={pointsStr}
            fill="none"
            stroke="#EF6C00"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : null}

        {/* X-axis labels */}
        <SvgText
          x={PADDING_LEFT}
          y={GRAPH_HEIGHT - 4}
          fontSize={9}
          fill={theme.colors.textMuted}
        >
          60s ago
        </SvgText>
        <SvgText
          x={PADDING_LEFT + CHART_WIDTH}
          y={GRAPH_HEIGHT - 4}
          fontSize={9}
          fill={theme.colors.textMuted}
          textAnchor="end"
        >
          Now
        </SvgText>
      </Svg>

      <Text style={[styles.disclaimer, { color: theme.colors.textMuted }]}>
        ⚠️ Readings are approximate. Not calibrated to laboratory standards.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    elevation: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  disclaimer: {
    fontSize: 10,
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
