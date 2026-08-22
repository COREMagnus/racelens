import type { Sport } from '@racelens/shared';
import { StyleSheet, Text, View } from 'react-native';

import { radius, sportColor } from '../theme';

export function SportBadge({ sport }: { sport: Sport }) {
  return (
    <View style={[styles.badge, { backgroundColor: `${sportColor[sport]}22` }]}>
      <Text style={[styles.label, { color: sportColor[sport] }]}>{sport.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
