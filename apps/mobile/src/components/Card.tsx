import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, radius, spacing } from '../theme';

export function Card({
  children,
  style,
  accent,
}: {
  children: ReactNode;
  style?: ViewStyle;
  accent?: string;
}) {
  return (
    <View style={[styles.card, accent ? { borderLeftColor: accent, borderLeftWidth: 3 } : null, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
});
