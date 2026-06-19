export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'https://disastermesh-api.onrender.com/api/v1';

export const SOCKET_URL =
  process.env.EXPO_PUBLIC_SOCKET_URL || 'https://disastermesh-api.onrender.com';

// Seismic detection constants
export const SEISMIC = {
  STA_WINDOW: 1,        // seconds (short-term average)
  LTA_WINDOW: 10,       // seconds (long-term average)
  TRIGGER_RATIO: 3.5,   // STA/LTA ratio to trigger detection
  MIN_ACCEL: 0.3,       // m/s² minimum to consider
  SAMPLE_INTERVAL: 50,  // ms — 20 Hz sampling
  COOLDOWN_MS: 30000,   // 30s between triggers
};

export const LOCATION = {
  UPDATE_INTERVAL_MS: 30000,       // 30 seconds during active disaster
  BACKGROUND_INTERVAL_MS: 60000,  // 1 minute background
  ACCURACY: 'balanced' as const,
};

export const DISASTER_TYPES = [
  { id: 'earthquake', label: 'Earthquake', icon: '🌍', color: '#DC2626' },
  { id: 'flood', label: 'Flood', icon: '🌊', color: '#2563EB' },
  { id: 'cyclone', label: 'Cyclone', icon: '🌀', color: '#7C3AED' },
  { id: 'fire', label: 'Fire', icon: '🔥', color: '#EA580C' },
  { id: 'tsunami', label: 'Tsunami', icon: '🌊', color: '#0891B2' },
  { id: 'storm', label: 'Storm', icon: '⛈️', color: '#6366F1' },
];

export const SOS_TYPES = [
  { id: 'trapped', label: 'Trapped', icon: '🆘', color: '#DC2626' },
  { id: 'injured', label: 'Injured', icon: '🩺', color: '#EA580C' },
  { id: 'water', label: 'Need Water', icon: '💧', color: '#2563EB' },
  { id: 'medicine', label: 'Medicine', icon: '💊', color: '#7C3AED' },
  { id: 'rescue', label: 'Rescue', icon: '🚨', color: '#DC2626' },
  { id: 'fire', label: 'Fire', icon: '🔥', color: '#EA580C' },
];

export const LANGUAGES = [
  { code: 'ta', label: 'தமிழ்', name: 'Tamil' },
  { code: 'en', label: 'English', name: 'English' },
  { code: 'hi', label: 'हिंदी', name: 'Hindi' },
  { code: 'te', label: 'తెలుగు', name: 'Telugu' },
  { code: 'kn', label: 'ಕನ್ನಡ', name: 'Kannada' },
  { code: 'ml', label: 'മലയാളം', name: 'Malayalam' },
];

export const COLORS = {
  bg: '#0f172a',
  panel: '#1e293b',
  border: '#334155',
  text: '#f1f5f9',
  muted: '#94a3b8',
  danger: '#dc2626',
  warning: '#ea580c',
  safe: '#22c55e',
  blue: '#3b82f6',
};
