/**
 * theme.js — App theme configuration with dark mode support
 * 
 * Material Design 3 inspired theme with orange/amber primary.
 */

export const Colors = {
  primary: '#EF6C00',
  primaryDark: '#E65100',
  primaryLight: '#FF9800',
  accent: '#FFB74D',

  // Severity colors
  quiet: '#4CAF50',
  moderate: '#8BC34A',
  loud: '#FF9800',
  veryLoud: '#F44336',
  harmful: '#B71C1C',

  // Status
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',
};

export const LightTheme = {
  dark: false,
  colors: {
    ...Colors,
    background: '#FAFAFA',
    surface: '#FFFFFF',
    surfaceVariant: '#F5F5F5',
    card: '#FFFFFF',
    text: '#212121',
    textSecondary: '#757575',
    textMuted: '#9E9E9E',
    border: '#E0E0E0',
    divider: '#EEEEEE',
    tabBar: '#FFFFFF',
    tabBarInactive: '#9E9E9E',
    statusBar: '#E65100',
    meterBackground: '#F5F5F5',
  },
};

export const DarkTheme = {
  dark: true,
  colors: {
    ...Colors,
    background: '#121212',
    surface: '#1E1E1E',
    surfaceVariant: '#2C2C2C',
    card: '#1E1E1E',
    text: '#EEEEEE',
    textSecondary: '#B0B0B0',
    textMuted: '#757575',
    border: '#333333',
    divider: '#2C2C2C',
    tabBar: '#1E1E1E',
    tabBarInactive: '#666666',
    statusBar: '#000000',
    meterBackground: '#1E1E1E',
  },
};

/**
 * Get theme based on color scheme preference.
 * @param {string} colorScheme - 'dark' or 'light'
 * @returns {object} Theme object
 */
export function getTheme(colorScheme) {
  return colorScheme === 'dark' ? DarkTheme : LightTheme;
}
