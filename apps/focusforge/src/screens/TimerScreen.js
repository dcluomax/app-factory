import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  AppState,
  Vibration,
  StatusBar,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import * as Notifications from 'expo-notifications';
import { COLORS, SPACING } from '../theme';
import { loadInterstitial, showInterstitial as showInterstitialAd } from '../utils/ads';
import CircularTimer from '../components/CircularTimer';
import PresetButton from '../components/PresetButton';
import StreakBadge from '../components/StreakBadge';
import {
  TIMER_STATES,
  PRESETS,
  COMMIT_COUNTDOWN,
  calculateFocusScore,
  generateSessionId,
} from '../utils/timer';
import {
  getSettings,
  getStreak,
  incrementStreak,
  breakStreak,
  saveSession,
  getDailySessionCount,
  incrementDailyCount,
  getSessions,
} from '../utils/storage';
import { getRandomQuote } from '../utils/quotes';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const TimerScreen = ({ navigation }) => {
  // Keep screen awake during sessions
  useKeepAwake();

  // ─── State ──────────────────────────────────────────────────────
  const [timerState, setTimerState] = useState(TIMER_STATES.IDLE);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [focusDuration, setFocusDuration] = useState(25);
  const [breakDuration, setBreakDuration] = useState(5);
  const [settings, setSettings] = useState(null);
  const [streak, setStreak] = useState({ current: 0, best: 0 });
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [quote, setQuote] = useState(getRandomQuote());
  const [focusScore, setFocusScore] = useState(100);
  const [dailyCount, setDailyCount] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);

  // ─── Refs ───────────────────────────────────────────────────────
  const intervalRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const foregroundTimeRef = useRef(0);
  const totalElapsedRef = useRef(0);
  const sessionStartRef = useRef(null);
  const backgroundTimestampRef = useRef(null);
  const sessionIdRef = useRef(null);
  const timerStateRef = useRef(TIMER_STATES.IDLE);

  // Keep ref in sync with state
  useEffect(() => {
    timerStateRef.current = timerState;
  }, [timerState]);

  // ─── Preload Ads ────────────────────────────────────────────────
  useEffect(() => {
    try { loadInterstitial(); } catch (e) {}
  }, []);

  // ─── Load Settings & Streak ─────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const s = await getSettings();
      setSettings(s);
      setFocusDuration(s.focusDuration);
      setBreakDuration(s.breakDuration);
      const st = await getStreak();
      setStreak(st);
      const dc = await getDailySessionCount();
      setDailyCount(dc);
      try { const sessions = await getSessions(); setTotalSessions(sessions.length); } catch(e) {}
    };
    load();
  }, []);

  // Reload settings when screen focuses
  useEffect(() => {
    const unsubscribe = navigation?.addListener?.('focus', async () => {
      const s = await getSettings();
      setSettings(s);
      // Only update duration if IDLE
      if (timerStateRef.current === TIMER_STATES.IDLE) {
        setFocusDuration(s.focusDuration);
        setBreakDuration(s.breakDuration);
      }
      const st = await getStreak();
      setStreak(st);
    });
    return () => { if (unsubscribe) unsubscribe(); };
  }, [navigation]);

  // ─── AppState Detection (Focus Tracking) ────────────────────────
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription?.remove();
    };
  }, []);

  const handleAppStateChange = useCallback(async (nextAppState) => {
    const currentState = timerStateRef.current;

    if (
      appStateRef.current === 'active' &&
      (nextAppState === 'background' || nextAppState === 'inactive')
    ) {
      // App going to background
      backgroundTimestampRef.current = Date.now();

      if (currentState === TIMER_STATES.FOCUSING) {
        // User left during focus — send notification
        await sendFocusReminder();
      }
    }

    if (
      (appStateRef.current === 'background' || appStateRef.current === 'inactive') &&
      nextAppState === 'active'
    ) {
      // App coming back to foreground
      if (backgroundTimestampRef.current && currentState === TIMER_STATES.FOCUSING) {
        const bgTime = (Date.now() - backgroundTimestampRef.current) / 1000;
        totalElapsedRef.current += bgTime;
        // Don't add to foreground time — it was background
        
        // If gone for more than 30 seconds during focus, consider it a break in focus
        if (bgTime > 30) {
          // Show warning but don't break streak yet — session continues
          setQuote({ text: "You left. Stay locked in.", author: "FocusForge" });
        }
      }
      backgroundTimestampRef.current = null;
    }

    appStateRef.current = nextAppState;
  }, []);

  // ─── Notification ───────────────────────────────────────────────
  const sendFocusReminder = async () => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⚠️ FocusForge — Get Back!',
          body: 'Your focus session is running. Get back to the app or your streak breaks.',
          sound: true,
        },
        trigger: null, // Send immediately
      });
    } catch (e) {
      // Notification permissions may not be granted
    }
  };

  // ─── Request Notification Permissions ───────────────────────────
  useEffect(() => {
    const requestPerms = async () => {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
          await Notifications.requestPermissionsAsync();
        }
      } catch (e) {
        // Ignore
      }
    };
    requestPerms();
  }, []);

  // ─── Timer Logic ────────────────────────────────────────────────
  useEffect(() => {
    if (
      timerState === TIMER_STATES.COMMITTED ||
      timerState === TIMER_STATES.FOCUSING ||
      timerState === TIMER_STATES.BREAK
    ) {
      intervalRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            handleTimerComplete();
            return 0;
          }

          // Track foreground time only when app is active
          if (
            appStateRef.current === 'active' &&
            timerStateRef.current === TIMER_STATES.FOCUSING
          ) {
            foregroundTimeRef.current += 1;
            totalElapsedRef.current += 1;
          } else if (timerStateRef.current === TIMER_STATES.FOCUSING) {
            totalElapsedRef.current += 1;
          }

          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timerState]);

  // ─── Timer Complete Handler ─────────────────────────────────────
  const handleTimerComplete = useCallback(async () => {
    const currentState = timerStateRef.current;

    if (currentState === TIMER_STATES.COMMITTED) {
      // Commitment countdown done — start focusing
      const totalSec = focusDuration * 60;
      setTotalSeconds(totalSec);
      setRemainingSeconds(totalSec);
      foregroundTimeRef.current = 0;
      totalElapsedRef.current = 0;
      sessionStartRef.current = Date.now();
      setTimerState(TIMER_STATES.FOCUSING);
      setQuote(getRandomQuote());
      return;
    }

    if (currentState === TIMER_STATES.FOCUSING) {
      // Focus session complete!
      if (settings?.vibrationEnabled !== false) {
        Vibration.vibrate([0, 500, 200, 500]);
      }

      const score = calculateFocusScore(
        foregroundTimeRef.current,
        totalElapsedRef.current
      );
      setFocusScore(score);

      // Save session
      const session = {
        id: sessionIdRef.current,
        date: new Date().toISOString(),
        duration: focusDuration,
        actualFocusTime: foregroundTimeRef.current,
        totalTime: totalElapsedRef.current,
        focusScore: score,
        completed: true,
        broken: false,
        type: 'focus',
      };
      await saveSession(session);

      // Update streak
      const newStreak = await incrementStreak();
      setStreak(newStreak);

      // Update daily count
      const newCount = await incrementDailyCount();
      setDailyCount(newCount);
      setSessionsCompleted((prev) => prev + 1);

      // Show completion then auto-start break
      setTimerState(TIMER_STATES.SESSION_COMPLETE);

      // Show interstitial ad after every 3rd completed session
      if ((sessionsCompleted + 1) % 3 === 0) {
        try { showInterstitialAd(); } catch (e) {}
      }

      // Auto-start break after 3 seconds
      setTimeout(() => {
        startBreak();
      }, 3000);
      return;
    }

    if (currentState === TIMER_STATES.BREAK) {
      // Break complete
      if (settings?.vibrationEnabled !== false) {
        Vibration.vibrate([0, 300, 100, 300]);
      }
      resetToIdle();
      return;
    }
  }, [focusDuration, breakDuration, settings]);

  // ─── Actions ────────────────────────────────────────────────────
  const startSession = useCallback((focusMin, breakMin) => {
    setFocusDuration(focusMin);
    setBreakDuration(breakMin);
    sessionIdRef.current = generateSessionId();
    
    // Start commitment countdown
    setTotalSeconds(COMMIT_COUNTDOWN);
    setRemainingSeconds(COMMIT_COUNTDOWN);
    setTimerState(TIMER_STATES.COMMITTED);
    setQuote(getRandomQuote());
  }, []);

  const startPreset = useCallback((preset) => {
    startSession(preset.focusMin, preset.breakMin);
  }, [startSession]);

  const startCustom = useCallback(() => {
    if (!settings) return;
    startSession(settings.focusDuration, settings.breakDuration);
  }, [settings, startSession]);

  const startBreak = useCallback(() => {
    // Determine if long break
    const longBreakInterval = settings?.longBreakInterval || 4;
    const isLongBreak = sessionsCompleted > 0 && sessionsCompleted % longBreakInterval === 0;
    const bDuration = isLongBreak ? (settings?.longBreakDuration || 15) : breakDuration;
    
    const totalSec = bDuration * 60;
    setTotalSeconds(totalSec);
    setRemainingSeconds(totalSec);
    setTimerState(TIMER_STATES.BREAK);
  }, [breakDuration, sessionsCompleted, settings]);

  const abandonSession = useCallback(async () => {
    Alert.alert(
      '💀 Quit Session?',
      'Your streak will be broken. This cannot be undone.',
      [
        { text: 'Stay', style: 'cancel' },
        {
          text: 'Quit',
          style: 'destructive',
          onPress: async () => {
            if (intervalRef.current) clearInterval(intervalRef.current);

            // Save broken session
            const score = calculateFocusScore(
              foregroundTimeRef.current,
              totalElapsedRef.current
            );
            const session = {
              id: sessionIdRef.current,
              date: new Date().toISOString(),
              duration: focusDuration,
              actualFocusTime: foregroundTimeRef.current,
              totalTime: totalElapsedRef.current,
              focusScore: score,
              completed: false,
              broken: true,
              type: 'focus',
            };
            await saveSession(session);

            // Break streak
            const newStreak = await breakStreak();
            setStreak(newStreak);
            setFocusScore(score);
            setTimerState(TIMER_STATES.SESSION_BROKEN);

            // Return to idle after showing broken state
            setTimeout(() => {
              resetToIdle();
            }, 3000);
          },
        },
      ]
    );
  }, [focusDuration]);

  const skipBreak = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    resetToIdle();
  }, []);

  const resetToIdle = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTimerState(TIMER_STATES.IDLE);
    setRemainingSeconds(0);
    setTotalSeconds(0);
    foregroundTimeRef.current = 0;
    totalElapsedRef.current = 0;
    setQuote(getRandomQuote());
  }, []);

  // ─── Render Helpers ─────────────────────────────────────────────
  const getTimerColor = () => {
    switch (timerState) {
      case TIMER_STATES.COMMITTED:
        return COLORS.accentLight;
      case TIMER_STATES.FOCUSING:
        return COLORS.accent;
      case TIMER_STATES.BREAK:
        return COLORS.success;
      case TIMER_STATES.SESSION_COMPLETE:
        return COLORS.success;
      case TIMER_STATES.SESSION_BROKEN:
        return COLORS.danger;
      default:
        return COLORS.accent;
    }
  };

  const getSubtitle = () => {
    switch (timerState) {
      case TIMER_STATES.COMMITTED:
        return 'COMMITTING...';
      case TIMER_STATES.FOCUSING:
        return 'DEEP FOCUS';
      case TIMER_STATES.BREAK:
        return 'BREAK TIME';
      case TIMER_STATES.SESSION_COMPLETE:
        return `DONE • SCORE ${focusScore}%`;
      case TIMER_STATES.SESSION_BROKEN:
        return 'STREAK BROKEN';
      default:
        return null;
    }
  };

  const getDisplaySeconds = () => {
    if (timerState === TIMER_STATES.IDLE) {
      return focusDuration * 60;
    }
    if (timerState === TIMER_STATES.SESSION_COMPLETE) {
      return 0;
    }
    if (timerState === TIMER_STATES.SESSION_BROKEN) {
      return 0;
    }
    return remainingSeconds;
  };

  const getDisplayTotal = () => {
    if (timerState === TIMER_STATES.IDLE) {
      return focusDuration * 60;
    }
    return totalSeconds;
  };

  const isActive = [
    TIMER_STATES.COMMITTED,
    TIMER_STATES.FOCUSING,
    TIMER_STATES.BREAK,
  ].includes(timerState);

  const isIdle = timerState === TIMER_STATES.IDLE;
  const isFocusing = timerState === TIMER_STATES.FOCUSING;
  const isBreak = timerState === TIMER_STATES.BREAK;
  const isComplete = timerState === TIMER_STATES.SESSION_COMPLETE;
  const isBroken = timerState === TIMER_STATES.SESSION_BROKEN;

  // ─── Render ─────────────────────────────────────────────────────
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} bounces={false}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Header — only show when idle */}
      {isIdle && (
        <View style={styles.header}>
          <StreakBadge streak={streak.current} dailyCount={dailyCount} />
        </View>
      )}

      {/* Immersive state indicator when active */}
      {isActive && (
        <View style={styles.activeHeader}>
          <View style={[styles.stateDot, { backgroundColor: getTimerColor() }]} />
          <Text style={[styles.stateLabel, { color: getTimerColor() }]}>
            {timerState === TIMER_STATES.COMMITTED
              ? 'LOCKING IN'
              : isFocusing
              ? 'FOCUS MODE'
              : 'ON BREAK'}
          </Text>
        </View>
      )}

      {/* Timer */}
      <View style={styles.timerSection}>
        <CircularTimer
          remainingSeconds={getDisplaySeconds()}
          totalSeconds={getDisplayTotal()}
          state={timerState}
          subtitle={getSubtitle()}
          color={getTimerColor()}
        />
      </View>

      {/* Quote — during focus or idle */}
      {(isFocusing || isIdle) && quote && (
        <View style={styles.quoteSection}>
          <Text style={styles.quoteText}>"{quote.text}"</Text>
          <Text style={styles.quoteAuthor}>— {quote.author}</Text>
        </View>
      )}

      {/* Session Complete message */}
      {isComplete && (
        <View style={styles.completeSection}>
          <Text style={styles.completeEmoji}>✅</Text>
          <Text style={styles.completeTitle}>Session Complete</Text>
          <Text style={styles.completeScore}>Focus Score: {focusScore}%</Text>
          <Text style={styles.completeSubtext}>Break starting soon...</Text>
        </View>
      )}

      {/* Session Broken message */}
      {isBroken && (
        <View style={styles.completeSection}>
          <Text style={styles.completeEmoji}>💀</Text>
          <Text style={[styles.completeTitle, { color: COLORS.danger }]}>
            Streak Broken
          </Text>
          <Text style={styles.completeScore}>Focus Score: {focusScore}%</Text>
          <Text style={styles.completeSubtext}>Get back up. Start again.</Text>
        </View>
      )}

      {/* Controls */}
      <View style={styles.controlSection}>
        {isIdle && (
          <>
            {/* Presets */}
            <View style={styles.presetRow}>
              {PRESETS.map((preset) => (
                <PresetButton
                  key={preset.label}
                  label={preset.label}
                  icon={preset.icon}
                  onPress={() => startPreset(preset)}
                />
              ))}
            </View>

            {/* Custom Start */}
            <TouchableOpacity
              style={styles.startButton}
              onPress={startCustom}
              activeOpacity={0.8}
            >
              <Text style={styles.startButtonText}>
                START {focusDuration} MIN
              </Text>
            </TouchableOpacity>
          </>
        )}

        {isFocusing && (
          <TouchableOpacity
            style={styles.abandonButton}
            onPress={abandonSession}
            activeOpacity={0.8}
          >
            <Text style={styles.abandonText}>QUIT (breaks streak)</Text>
          </TouchableOpacity>
        )}

        {isBreak && (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={skipBreak}
            activeOpacity={0.8}
          >
            <Text style={styles.skipText}>SKIP BREAK</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 40,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 20,
    paddingBottom: 20,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  sessionCount: {
    color: COLORS.textDim,
    fontSize: 13,
    fontWeight: '500',
  },
  // Active header
  activeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
  },
  stateDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: SPACING.sm,
  },
  stateLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
  },
  // Timer
  timerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Quote
  quoteSection: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    minHeight: 80,
  },
  quoteText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 20,
  },
  quoteAuthor: {
    color: COLORS.textDim,
    fontSize: 12,
    marginTop: SPACING.xs,
  },
  // Complete / Broken
  completeSection: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  completeEmoji: {
    fontSize: 40,
    marginBottom: SPACING.sm,
  },
  completeTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.success,
    marginBottom: SPACING.xs,
  },
  completeScore: {
    fontSize: 16,
    color: COLORS.accent,
    fontWeight: '600',
  },
  completeSubtext: {
    fontSize: 13,
    color: COLORS.textDim,
    marginTop: SPACING.xs,
  },
  // Controls
  controlSection: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl + 10,
    alignItems: 'center',
  },
  presetRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
    flexWrap: 'wrap',
  },
  startButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.xl + 16,
    paddingVertical: SPACING.md,
    borderRadius: 30,
    elevation: 4,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  startButtonText: {
    color: COLORS.primaryDark,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
  },
  abandonButton: {
    borderWidth: 1,
    borderColor: COLORS.danger + '60',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm + 4,
    borderRadius: 24,
  },
  abandonText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  skipButton: {
    borderWidth: 1,
    borderColor: COLORS.textDim + '60',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm + 4,
    borderRadius: 24,
  },
  skipText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

export default TimerScreen;
