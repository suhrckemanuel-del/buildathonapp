export const colors = {
  background: '#000000',
  surface: '#0f0f12',
  surfaceRaised: '#16161c',
  surfaceGlass: 'rgba(255,255,255,0.08)',
  border: '#27272f',
  primary: '#f97316',
  primaryPressed: '#ea580c',
  brand: '#f97316',
  brandSoft: '#fb923c',
  violet: '#a855f7',
  text: '#f0f0ff',
  muted: '#9ca3af',
  subdued: '#6b7280',
  success: '#22c55e',
  danger: '#f87171',
  warning: '#f59e0b',
  films: '#ef4444',
  music: '#d4b629',
  sports: '#22c55e',
  gaming: '#3b82f6',
  global: '#a855f7',
  rotterdam: '#00873e',
};

export type CategoryKey = 'films' | 'music' | 'sports' | 'gaming' | 'global';

export const categoryThemes: Record<
  CategoryKey,
  { label: string; icon: string; color: string; gradient: [string, string] }
> = {
  films: { label: 'Films', icon: '🎬', color: colors.films, gradient: ['#4a1117', '#dc2626'] },
  music: { label: 'Music', icon: '♪', color: colors.music, gradient: ['#4c3d0b', '#a88616'] },
  sports: { label: 'Sports', icon: '⚽', color: colors.sports, gradient: ['#063f24', '#159447'] },
  gaming: { label: 'Gaming', icon: '🎮', color: colors.gaming, gradient: ['#0d2a5c', '#2563eb'] },
  global: { label: 'Global', icon: '◎', color: colors.global, gradient: ['#38136b', '#9333ea'] },
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
};

export const accentFor = (category: 'films' | 'games' | CategoryKey) => {
  if (category === 'games') return colors.gaming;
  return categoryThemes[category as CategoryKey]?.color ?? colors.primary;
};

export const gradientFor = (category: 'films' | 'games' | CategoryKey): [string, string] => {
  if (category === 'games') return categoryThemes.gaming.gradient;
  return categoryThemes[category as CategoryKey]?.gradient ?? [colors.primary, colors.violet];
};
