import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING } from '../theme';

/**
 * PresetButton — Quick start preset chip
 */
const PresetButton = ({ label, icon, onPress, disabled = false }) => {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.label, disabled && styles.disabledText]}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderRadius: 24,
    marginHorizontal: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.accent + '30',
  },
  disabled: {
    opacity: 0.4,
  },
  icon: {
    fontSize: 16,
    marginRight: SPACING.xs + 2,
  },
  label: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  disabledText: {
    color: COLORS.textDim,
  },
});

export default PresetButton;
