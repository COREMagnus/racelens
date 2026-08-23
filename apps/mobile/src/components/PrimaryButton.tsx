import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type ViewStyle,
} from 'react-native';

import { colors, radius, spacing } from '../theme';

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  tone = 'accent',
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  tone?: 'accent' | 'ghost';
  style?: ViewStyle;
}) {
  const ghost = tone === 'ghost';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        ghost ? styles.ghost : styles.accent,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={ghost ? colors.text : colors.bg} />
      ) : (
        <Text style={[styles.label, ghost ? styles.ghostLabel : styles.accentLabel]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  accent: {
    backgroundColor: colors.accent,
  },
  ghost: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    fontWeight: '700',
    fontSize: 15,
  },
  accentLabel: {
    color: colors.bg,
  },
  ghostLabel: {
    color: colors.text,
  },
});
