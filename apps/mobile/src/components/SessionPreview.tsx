import type { Intensity, Session, Sport } from '@racelens/shared';
import { INTENSITY_FEELS, INTENSITY_ZONES, SPORTS } from '@racelens/shared';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radius, spacing } from '../theme';
import { Card } from './Card';
import { PrimaryButton } from './PrimaryButton';
import { SportBadge } from './SportBadge';

const INTENSITIES: Intensity[] = [...INTENSITY_ZONES, ...INTENSITY_FEELS];

export function SessionPreview({
  session,
  onConfirm,
}: {
  session: Session;
  onConfirm: (next: Session) => void;
}) {
  const [draft, setDraft] = useState<Session>(session);

  return (
    <Card>
      <Text style={styles.heading}>Structured session</Text>
      <Text style={styles.hint}>Mock AI draft — edit anything, then confirm.</Text>

      <View style={styles.row}>
        {SPORTS.map((sport) => (
          <Chip
            key={sport}
            label={sport}
            active={draft.sport === sport}
            onPress={() => setDraft({ ...draft, sport })}
          />
        ))}
      </View>

      <Field
        label="Duration (min)"
        value={String(draft.durationMin)}
        keyboardType="number-pad"
        onChangeText={(value) =>
          setDraft({ ...draft, durationMin: Number(value) || 0 })
        }
      />
      <Field
        label="Load"
        value={String(draft.load)}
        keyboardType="number-pad"
        onChangeText={(value) => setDraft({ ...draft, load: Number(value) || 0 })}
      />
      <Field
        label="RPE (1–10)"
        value={String(draft.rpe)}
        keyboardType="number-pad"
        onChangeText={(value) => setDraft({ ...draft, rpe: clamp(Number(value) || 0, 1, 10) })}
      />

      <Text style={styles.label}>Intensity</Text>
      <View style={styles.row}>
        {INTENSITIES.map((intensity) => (
          <Chip
            key={intensity}
            label={intensity}
            active={draft.intensity === intensity}
            onPress={() => setDraft({ ...draft, intensity })}
          />
        ))}
      </View>

      <Field
        label="Notes"
        value={draft.notes}
        multiline
        onChangeText={(notes) => setDraft({ ...draft, notes })}
      />

      <View style={styles.meta}>
        <SportBadge sport={draft.sport as Sport} />
        <Text style={styles.metaText}>source · {draft.source}</Text>
      </View>

      <PrimaryButton label="Confirm session" onPress={() => onConfirm(draft)} />
    </Card>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'number-pad' | 'default';
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType ?? 'default'}
        multiline={multiline}
        placeholderTextColor={colors.muted}
        style={[styles.input, multiline ? styles.multiline : null]}
      />
    </View>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Text
      onPress={onPress}
      style={[styles.chip, active ? styles.chipActive : null]}
    >
      {label}
    </Text>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

const styles = StyleSheet.create({
  heading: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  hint: {
    color: colors.muted,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.sm,
  },
  field: {
    marginBottom: spacing.sm,
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: 0.4,
  },
  input: {
    backgroundColor: colors.surface2,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  chip: {
    color: colors.muted,
    backgroundColor: colors.surface2,
    overflow: 'hidden',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  chipActive: {
    color: colors.bg,
    backgroundColor: colors.accent,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: spacing.md,
    marginTop: 4,
  },
  metaText: {
    color: colors.muted,
    fontSize: 12,
  },
});
