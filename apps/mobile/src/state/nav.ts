export type RootRoute = 'boot' | 'sign-in' | 'onboarding' | 'tabs';

export function resolveRootRoute(input: {
  authLoaded: boolean;
  profileLoaded: boolean;
  token: string | null;
  hasCompletedOnboarding: boolean;
}): RootRoute {
  if (!input.authLoaded || !input.profileLoaded) return 'boot';
  if (!input.token) return 'sign-in';
  if (!input.hasCompletedOnboarding) return 'onboarding';
  return 'tabs';
}
