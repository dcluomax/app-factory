import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { COLORS, TIMER_SIZE, TIMER_STROKE, TIMER_RADIUS, TIMER_CIRCUMFERENCE } from '../theme';
import { formatTime } from '../utils/timer';

/**
 * CircularTimer — The heart of FocusForge
 * 
 * A large SVG circle progress ring with MM:SS display.
 * progress: 0 (empty) to 1 (full)
 * color: stroke color (amber for focus, green for break, red for broken)
 */
const CircularTimer = ({ 
  remainingSeconds, 
  totalSeconds, 
  state,
  subtitle,
  color = COLORS.accent,
}) => {
  const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
  const strokeDashoffset = TIMER_CIRCUMFERENCE * (1 - progress);
  
  // Determine ring color based on state
  const ringColor = color;
  const bgRingColor = COLORS.primaryLight + '60'; // Semi-transparent
  
  return (
    <View style={styles.container}>
      <Svg width={TIMER_SIZE} height={TIMER_SIZE} style={styles.svg}>
        {/* Background circle */}
        <Circle
          cx={TIMER_SIZE / 2}
          cy={TIMER_SIZE / 2}
          r={TIMER_RADIUS}
          stroke={bgRingColor}
          strokeWidth={TIMER_STROKE}
          fill="transparent"
        />
        {/* Progress circle */}
        <Circle
          cx={TIMER_SIZE / 2}
          cy={TIMER_SIZE / 2}
          r={TIMER_RADIUS}
          stroke={ringColor}
          strokeWidth={TIMER_STROKE}
          fill="transparent"
          strokeDasharray={TIMER_CIRCUMFERENCE}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${TIMER_SIZE / 2}, ${TIMER_SIZE / 2}`}
        />
      </Svg>
      
      {/* Time display overlay */}
      <View style={styles.timeContainer}>
        <Text style={[styles.timeText, { color: ringColor }]}>
          {formatTime(remainingSeconds)}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle}>{subtitle}</Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: TIMER_SIZE,
    height: TIMER_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  svg: {
    position: 'absolute',
  },
  timeContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 64,
    fontWeight: '200',
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
});

export default CircularTimer;
