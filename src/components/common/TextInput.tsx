import React from 'react';
import { StyleSheet, Text, TextInput as RNTextInput, TextInputProps, View } from 'react-native';
import { COLORS } from '../../constants';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  suffix?: string;
}

export default function TextInput({ label, error, suffix, style, ...rest }: Props) {
  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.inputRow}>
        <RNTextInput
          style={[styles.input, error && styles.inputError, suffix && styles.inputWithSuffix, style]}
          placeholderTextColor={COLORS.textMuted}
          selectionColor={COLORS.primary}
          {...rest}
        />
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 14 },
  label: { color: COLORS.textMuted, fontSize: 13, fontWeight: '500', marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },
  input: { flex: 1, color: COLORS.text, fontSize: 15, paddingHorizontal: 14, paddingVertical: 12 },
  inputWithSuffix: { paddingRight: 0 },
  inputError: { borderColor: COLORS.danger },
  suffix: { color: COLORS.textMuted, fontSize: 14, paddingRight: 14 },
  error: { color: COLORS.danger, fontSize: 12, marginTop: 4 },
});
