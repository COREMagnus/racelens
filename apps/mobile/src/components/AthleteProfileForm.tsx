import type { AthleteProfile, ExperienceLevel, RaceDistanceChoice } from '@racelens/shared';
import {
  EXPERIENCE_LEVELS,
  MAX_CONSTRAINTS_CHARS,
  NOT_RACING,
  RACE_DISTANCES,
  normalizeAthleteProfile,
  validateOnboarding,
} from '@racelens/shared';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radius, spacing } from '../theme';
import { Card } from './Card';
import { PrimaryButton } from './PrimaryButton';

const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export function AthleteProfileForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial: AthleteProfile;
  submitLabel: string;
  onSubmit: (profile: AthleteProfile) => Promise<void> | void;
}) {
  const [name, setName] = useState(initial.name);
  const [raceDistance, setRaceDistance] = useState<RaceDistanceChoice | undefined>(
    initial.raceDistance,
  );
  const [raceGoalDate, setRaceGoalDate] = useState(initial.raceGoalDate);
  const [totalHours, setTotalHours] = useState(hourText(initial.weeklyVolume.totalHours));
  const [swimHours, setSwimHours] = useState(hourText(initial.weeklyVolume.swimHours));
  const [bikeHours, setBikeHours] = useState(hourText(initial.weeklyVolume.bikeHours));
  const [runHours, setRunHours] = useState(hourText(initial.weeklyVolume.runHours));
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | undefined>(
    initial.experienceLevel,
  );
  const [constraints, setConstraints] = useState(initial.constraints);
  const [errors, setErrors] = useState<ReturnType<typeof validateOnboarding>>({});
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(initial.name);
    setRaceDistance(initial.raceDistance);
    setRaceGoalDate(initial.raceGoalDate);
    setTotalHours(hourText(initial.weeklyVolume.totalHours));
    setSwimHours(hourText(initial.weeklyVolume.swimHours));
    setBikeHours(hourText(initial.weeklyVolume.bikeHours));
    setRunHours(hourText(initial.weeklyVolume.runHours));
    setExperienceLevel(initial.experienceLevel);
    setConstraints(initial.constraints);
  }, [initial]);

  const racing = raceDistance !== undefined && raceDistance !== NOT_RACING;

  async function submit() {
    const draft = {
      name,
      raceGoalDate,
      weeklyVolume: {
        ...(parseHours(totalHours) != null ? { totalHours: parseHours(totalHours) } : {}),
        ...(parseHours(swimHours) != null ? { swimHours: parseHours(swimHours) } : {}),
        ...(parseHours(bikeHours) != null ? { bikeHours: parseHours(bikeHours) } : {}),
        ...(parseHours(runHours) != null ? { runHours: parseHours(runHours) } : {}),
      },
      constraints,
      ...(raceDistance ? { raceDistance } : {}),
      ...(experienceLevel ? { experienceLevel } : {}),
    };
    const nextErrors = validateOnboarding(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setSaved(false);
      return;
    }
    setSaving(true);
    try {
      await onSubmit(normalizeAthleteProfile(draft));
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <FieldLabel text="Display name" error={errors.name} />
      <TextInput
        value={name}
        onChangeText={(value) => {
          setName(value);
          setSaved(false);
        }}
        style={styles.input}
        placeholder="Your name"
        placeholderTextColor={colors.muted}
        autoCapitalize="words"
      />

      <FieldLabel text="Race distance" error={errors.raceDistance} />
      <View style={styles.row}>
        {RACE_DISTANCES.map((distance) => (
          <Chip
            key={distance}
            label={distance}
            active={raceDistance === distance}
            onPress={() => {
              setRaceDistance(distance);
              setSaved(false);
            }}
          />
        ))}
        <Chip
          label="Not racing yet"
          active={raceDistance === NOT_RACING}
          onPress={() => {
            setRaceDistance(NOT_RACING);
            setRaceGoalDate('');
            setSaved(false);
          }}
        />
      </View>

      {racing ? (
        <>
          <FieldLabel text="Goal race date (YYYY-MM-DD)" error={errors.raceGoalDate} />
          <TextInput
            value={raceGoalDate}
            onChangeText={(value) => {
              setRaceGoalDate(value);
              setSaved(false);
            }}
            style={styles.input}
            autoCapitalize="none"
            placeholder="2026-11-08"
            placeholderTextColor={colors.muted}
          />
        </>
      ) : (
        <Text style={styles.hint}>No race date needed until you pick a distance.</Text>
      )}

      <FieldLabel text="Typical weekly hours" error={errors.weeklyVolume} />
      <TextInput
        value={totalHours}
        onChangeText={(value) => {
          setTotalHours(value);
          setSaved(false);
        }}
        style={styles.input}
        keyboardType="decimal-pad"
        placeholder="8"
        placeholderTextColor={colors.muted}
      />
      <Text style={styles.hint}>Your current typical week — not a goal week.</Text>

      <Text style={styles.optional}>Optional sport split (hours)</Text>
      <View style={styles.split}>
        <HourBox label="Swim" value={swimHours} onChange={setSwimHours} onDirty={() => setSaved(false)} />
        <HourBox label="Bike" value={bikeHours} onChange={setBikeHours} onDirty={() => setSaved(false)} />
        <HourBox label="Run" value={runHours} onChange={setRunHours} onDirty={() => setSaved(false)} />
      </View>

      <FieldLabel text="Experience (optional)" />
      <View style={styles.row}>
        {EXPERIENCE_LEVELS.map((level) => (
          <Chip
            key={level}
            label={EXPERIENCE_LABELS[level]}
            active={experienceLevel === level}
            onPress={() => {
              setExperienceLevel((current) => (current === level ? undefined : level));
              setSaved(false);
            }}
          />
        ))}
      </View>

      <FieldLabel
        text={`Constraints / notes (optional, ${constraints.length}/${MAX_CONSTRAINTS_CHARS})`}
        error={errors.constraints}
      />
      <TextInput
        value={constraints}
        onChangeText={(value) => {
          setConstraints(value);
          setSaved(false);
        }}
        style={[styles.input, styles.notes]}
        placeholder="Injuries, limited swim access, travel…"
        placeholderTextColor={colors.muted}
        multiline
        maxLength={MAX_CONSTRAINTS_CHARS}
      />

      <PrimaryButton
        label={saved ? 'Saved' : submitLabel}
        onPress={() => void submit()}
        loading={saving}
      />
    </Card>
  );
}

function FieldLabel({ text, error }: { text: string; error?: string }) {
  return (
    <>
      <Text style={styles.label}>{text}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </>
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
    <Text onPress={onPress} style={[styles.chip, active ? styles.chipActive : null]}>
      {label}
    </Text>
  );
}

function HourBox({
  label,
  value,
  onChange,
  onDirty,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onDirty: () => void;
}) {
  return (
    <View style={styles.hourBox}>
      <Text style={styles.hourLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={(next) => {
          onChange(next);
          onDirty();
        }}
        style={styles.hourInput}
        keyboardType="decimal-pad"
        placeholder="—"
        placeholderTextColor={colors.muted}
      />
    </View>
  );
}

function hourText(value: number | undefined): string {
  return typeof value === 'number' && value > 0 ? String(value) : '';
}

function parseHours(value: string): number | undefined {
  const parsed = Number(value.trim());
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
}

const styles = StyleSheet.create({
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: spacing.sm,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: 6,
  },
  hint: {
    color: colors.muted,
    fontSize: 13,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  optional: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 6,
    marginTop: spacing.xs,
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
    marginBottom: spacing.sm,
  },
  notes: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.md,
  },
  chip: {
    color: colors.muted,
    backgroundColor: colors.surface2,
    overflow: 'hidden',
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontWeight: '700',
  },
  chipActive: {
    color: colors.bg,
    backgroundColor: colors.accent,
  },
  split: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.md,
  },
  hourBox: {
    flex: 1,
  },
  hourLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  hourInput: {
    backgroundColor: colors.surface2,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    color: colors.text,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
  },
});
