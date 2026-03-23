// Timer State Machine
// States: IDLE → COMMITTED → FOCUSING → BREAK → IDLE

export const TIMER_STATES = {
  IDLE: 'IDLE',
  COMMITTED: 'COMMITTED',
  FOCUSING: 'FOCUSING',
  BREAK: 'BREAK',
  SESSION_COMPLETE: 'SESSION_COMPLETE',
  SESSION_BROKEN: 'SESSION_BROKEN',
};

export const PRESETS = [
  { label: 'Quick 25', focusMin: 25, breakMin: 5, icon: '⚡' },
  { label: 'Deep 45', focusMin: 45, breakMin: 10, icon: '🧠' },
  { label: 'Marathon 60', focusMin: 60, breakMin: 15, icon: '🔥' },
];

export const FOCUS_OPTIONS = [5, 15, 25, 30, 45, 60];
export const BREAK_OPTIONS = [5, 10, 15];

// Commitment countdown seconds
export const COMMIT_COUNTDOWN = 3;

/**
 * Format seconds to MM:SS
 */
export const formatTime = (totalSeconds) => {
  if (totalSeconds < 0) totalSeconds = 0;
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

/**
 * Calculate focus score as percentage (0-100)
 * foregroundTime / totalElapsed * 100
 */
export const calculateFocusScore = (foregroundSeconds, totalSeconds) => {
  if (totalSeconds <= 0 || foregroundSeconds <= 0) return 0;
  const score = Math.round((foregroundSeconds / totalSeconds) * 100);
  return Math.min(100, Math.max(0, score));
};

/**
 * Generate unique session ID
 */
export const generateSessionId = () => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
};

/**
 * Get progress as 0-1 fraction
 * For FOCUSING: counts down (1 → 0)
 * For BREAK: counts down (1 → 0)
 * For COMMITTED: counts down from COMMIT_COUNTDOWN
 */
export const getProgress = (remainingSeconds, totalSeconds) => {
  if (totalSeconds <= 0) return 0;
  return remainingSeconds / totalSeconds;
};
