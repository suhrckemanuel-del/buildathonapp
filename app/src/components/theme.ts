export const colors = {
  background: '#0a0a0f',
  surface: '#13131a',
  surfaceRaised: '#1c1c26',
  border: '#2a2a3a',
  primary: '#6366f1',
  primaryPressed: '#4f46e5',
  text: '#f0f0ff',
  muted: '#9ca3af',
  subdued: '#6b7280',
  success: '#22c55e',
  danger: '#f87171',
  films: '#e53935',
  gaming: '#3b82f6',
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
};

export const accentFor = (category: 'films' | 'games') =>
  category === 'films' ? colors.films : colors.gaming;
