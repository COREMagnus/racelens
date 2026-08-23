export const colors = {
  bg: '#07090C',
  surface: '#12161C',
  surface2: '#1A2028',
  border: '#2A323C',
  text: '#F4F1EA',
  muted: '#8B93A0',
  accent: '#C8F04D',
  accentDim: '#8BA534',
  danger: '#FF6B4A',
  swim: '#3D9CF0',
  bike: '#F0B429',
  run: '#FF6B4A',
  brick: '#B57BFF',
} as const;

export const sportColor: Record<'swim' | 'bike' | 'run' | 'brick', string> = {
  swim: colors.swim,
  bike: colors.bike,
  run: colors.run,
  brick: colors.brick,
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  pill: 999,
} as const;
