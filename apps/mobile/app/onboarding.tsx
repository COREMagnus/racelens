import type { AthleteProfile } from '@racelens/shared';
import { Redirect, router } from 'expo-router';

import { AthleteProfileForm } from '../src/components/AthleteProfileForm';
import { Screen } from '../src/components/Screen';
import { useProfile } from '../src/state/profile';

export default function OnboardingScreen() {
  const { profile, loaded, hasCompletedOnboarding, saveProfile } = useProfile();

  if (!loaded) {
    return null;
  }

  if (hasCompletedOnboarding) {
    return <Redirect href="/(tabs)" />;
  }

  async function onSubmit(next: AthleteProfile) {
    await saveProfile(next);
    router.replace('/(tabs)');
  }

  return (
    <Screen
      title="Welcome to TriAdapt"
      subtitle="Your adaptive AI triathlon coach. Save a real name, race goal, and typical volume so Home, Plan, and Coach stop using demo data."
    >
      <AthleteProfileForm initial={profile} submitLabel="Save and continue" onSubmit={onSubmit} />
    </Screen>
  );
}
