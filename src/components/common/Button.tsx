import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { COLORS } from '../../constants';

interface Props {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  size?: 'sm' | 'md' | 'lg';
}

export default function Button({ title, onPress, variant = 'primary', loading, disabled, style, size = 'md' }: Props) {
  const bg = {
    primary: COLORS.primary,
    secondary: COLORS.surface,
    danger: COLORS.danger,
    ghost: 'transparent',
  }[variant];

  const textColor = variant === 'ghost' || variant === 'secondary' ? COLORS.text : '#fff';
  const borderColor = variant === 'secondary' ? COLORS.border : 'transparent';
  const pad = size === 'sm' ? 10 : size === 'lg' ? 18 : 14;
  const fontSize = size === 'sm' ? 13 : size === 'lg' ? 17 : 15;

  return (
    <TouchableOpacity
      style={[
        styles.btn,
        { backgroundColor: bg, borderColor, paddingVertical: pad },
        (disabled || loading) && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text style={[styles.label, { color: textColor, fontSize }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingHorizontal: 20,
  },
  label: { fontWeight: '600' },
  disabled: { opacity: 0.5 },
});
