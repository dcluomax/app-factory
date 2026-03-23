import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  SETTINGS: '@focusforge_settings',
  SESSIONS: '@focusforge_sessions',
  STREAK: '@focusforge_streak',
  DAILY_COUNT: '@focusforge_daily_count',
};

// Default settings
const DEFAULT_SETTINGS = {
  focusDuration: 25,      // minutes
  breakDuration: 5,       // minutes
  longBreakDuration: 15,  // minutes
  longBreakInterval: 4,   // sessions before long break
  soundEnabled: true,
  vibrationEnabled: true,
  isPro: false,            // Pro enabled by default
  dailyFreeLimit: 3,
};

// ─── Settings ───────────────────────────────────────────────────────
export const getSettings = async () => {
  try {
    const raw = await AsyncStorage.getItem(KEYS.SETTINGS);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
    return { ...DEFAULT_SETTINGS };
  } catch (e) {
    console.error('getSettings error:', e);
    return { ...DEFAULT_SETTINGS };
  }
};

export const saveSettings = async (settings) => {
  try {
    await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('saveSettings error:', e);
  }
};

// ─── Session History ────────────────────────────────────────────────
// Session format:
// {
//   id: string,
//   date: ISO string,
//   duration: number (minutes planned),
//   actualFocusTime: number (seconds in foreground),
//   totalTime: number (seconds total),
//   focusScore: number (0-100),
//   completed: boolean,
//   broken: boolean,
//   type: 'focus' | 'break',
// }

export const getSessions = async () => {
  try {
    const raw = await AsyncStorage.getItem(KEYS.SESSIONS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('getSessions error:', e);
    return [];
  }
};

export const saveSession = async (session) => {
  try {
    const sessions = await getSessions();
    sessions.unshift(session); // newest first
    // Keep last 500 sessions
    const trimmed = sessions.slice(0, 500);
    await AsyncStorage.setItem(KEYS.SESSIONS, JSON.stringify(trimmed));
    return trimmed;
  } catch (e) {
    console.error('saveSession error:', e);
  }
};

export const clearSessions = async () => {
  try {
    await AsyncStorage.removeItem(KEYS.SESSIONS);
  } catch (e) {
    console.error('clearSessions error:', e);
  }
};

// ─── Streak ─────────────────────────────────────────────────────────
// Streak format:
// {
//   current: number,
//   best: number,
//   lastCompletedDate: ISO date string (YYYY-MM-DD),
// }

const getToday = () => {
  const d = new Date();
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
};

const getYesterday = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
};

export const getStreak = async () => {
  try {
    const raw = await AsyncStorage.getItem(KEYS.STREAK);
    if (raw) {
      const streak = JSON.parse(raw);
      // Check if streak is still valid (completed yesterday or today)
      const today = getToday();
      const yesterday = getYesterday();
      if (streak.lastCompletedDate !== today && streak.lastCompletedDate !== yesterday) {
        // Streak expired
        return { current: 0, best: streak.best || 0, lastCompletedDate: null };
      }
      return streak;
    }
    return { current: 0, best: 0, lastCompletedDate: null };
  } catch (e) {
    console.error('getStreak error:', e);
    return { current: 0, best: 0, lastCompletedDate: null };
  }
};

export const incrementStreak = async () => {
  try {
    const streak = await getStreak();
    const today = getToday();
    
    if (streak.lastCompletedDate === today) {
      // Already completed today, no change
      return streak;
    }
    
    const newCurrent = streak.current + 1;
    const newBest = Math.max(newCurrent, streak.best);
    const updated = {
      current: newCurrent,
      best: newBest,
      lastCompletedDate: today,
    };
    await AsyncStorage.setItem(KEYS.STREAK, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('incrementStreak error:', e);
    return { current: 0, best: 0, lastCompletedDate: null };
  }
};

export const breakStreak = async () => {
  try {
    const streak = await getStreak();
    const updated = {
      current: 0,
      best: streak.best || 0,
      lastCompletedDate: streak.lastCompletedDate,
    };
    await AsyncStorage.setItem(KEYS.STREAK, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('breakStreak error:', e);
    return { current: 0, best: 0, lastCompletedDate: null };
  }
};

// ─── Daily Session Count ────────────────────────────────────────────
export const getDailySessionCount = async () => {
  try {
    const raw = await AsyncStorage.getItem(KEYS.DAILY_COUNT);
    if (raw) {
      const data = JSON.parse(raw);
      if (data.date === getToday()) {
        return data.count;
      }
    }
    return 0;
  } catch (e) {
    return 0;
  }
};

export const incrementDailyCount = async () => {
  try {
    const today = getToday();
    const raw = await AsyncStorage.getItem(KEYS.DAILY_COUNT);
    let count = 0;
    if (raw) {
      const data = JSON.parse(raw);
      if (data.date === today) {
        count = data.count;
      }
    }
    count += 1;
    await AsyncStorage.setItem(KEYS.DAILY_COUNT, JSON.stringify({ date: today, count }));
    return count;
  } catch (e) {
    return 0;
  }
};

// ─── Stats Helpers ──────────────────────────────────────────────────
export const getStatsForPeriod = async (days) => {
  const sessions = await getSessions();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  cutoff.setHours(0, 0, 0, 0);

  const filtered = sessions.filter(s => {
    const sDate = new Date(s.date);
    return sDate >= cutoff && s.type === 'focus';
  });

  const totalSessions = filtered.length;
  const completedSessions = filtered.filter(s => s.completed).length;
  const brokenSessions = filtered.filter(s => s.broken).length;
  const totalFocusSeconds = filtered.reduce((acc, s) => acc + (s.actualFocusTime || 0), 0);
  const avgFocusScore = totalSessions > 0
    ? Math.round(filtered.reduce((acc, s) => acc + (s.focusScore || 0), 0) / totalSessions)
    : 0;

  // Group by day
  const dailyMap = {};
  filtered.forEach(s => {
    const day = s.date.split('T')[0];
    if (!dailyMap[day]) {
      dailyMap[day] = { focusSeconds: 0, sessions: 0 };
    }
    dailyMap[day].focusSeconds += s.actualFocusTime || 0;
    dailyMap[day].sessions += 1;
  });

  // Build daily array for chart
  const dailyData = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const label = d.toLocaleDateString('en', { weekday: 'short' });
    dailyData.push({
      date: key,
      label,
      focusMinutes: Math.round((dailyMap[key]?.focusSeconds || 0) / 60),
      sessions: dailyMap[key]?.sessions || 0,
    });
  }

  return {
    totalSessions,
    completedSessions,
    brokenSessions,
    totalFocusMinutes: Math.round(totalFocusSeconds / 60),
    avgFocusScore,
    dailyData,
  };
};
