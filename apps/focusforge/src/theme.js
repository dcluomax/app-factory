// FocusForge Theme — Dark, serious, no-nonsense
export const COLORS = {
  primary: '#263238',        // Dark charcoal
  primaryLight: '#37474F',   // Slightly lighter charcoal
  primaryDark: '#1a2327',    // Deeper dark
  accent: '#FFB300',         // Amber
  accentDim: '#FF8F00',      // Darker amber
  accentLight: '#FFD54F',    // Light amber
  background: '#1C2529',     // App background
  surface: '#263238',        // Card/surface
  surfaceLight: '#2E3B41',   // Elevated surface
  text: '#ECEFF1',           // Primary text
  textSecondary: '#90A4AE',  // Secondary text
  textDim: '#607D8B',        // Dimmed text
  danger: '#EF5350',         // Red for warnings/broken
  success: '#66BB6A',        // Green for completed
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0,0,0,0.7)',
  transparent: 'transparent',
};

export const FONTS = {
  timer: {
    fontFamily: undefined, // Will use system monospace
    fontVariant: ['tabular-nums'],
  },
  heading: {
    fontWeight: '700',
  },
  body: {
    fontWeight: '400',
  },
  caption: {
    fontWeight: '300',
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const TIMER_SIZE = 280;
export const TIMER_STROKE = 8;
export const TIMER_RADIUS = (TIMER_SIZE - TIMER_STROKE) / 2;
export const TIMER_CIRCUMFERENCE = 2 * Math.PI * TIMER_RADIUS;
