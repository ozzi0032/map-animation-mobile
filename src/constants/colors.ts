export const Colors = {
  // ─── Backgrounds (layered depth) ───
  bg0: '#040710',             // deepest — behind modals
  background: '#070913',      // main screen background (solid — used by auth screens)
  surface: '#0D1525',         // card / section backgrounds
  surfaceElevated: '#131E35', // elevated cards, inputs
  surfaceHigh: '#1A2745',     // tooltips, dropdowns

  // ─── Primary — Electric Blue ───
  primary: '#4499FF',
  primaryDark: '#1A67D3',
  primaryBright: '#66AAFF',
  primaryGlow: 'rgba(68,153,255,0.22)',
  primaryDim: 'rgba(68,153,255,0.10)',

  // ─── Accents ───
  secondary: '#10B981',
  accentPurple: '#8B5CF6',
  accentGlow: 'rgba(139,92,246,0.18)',

  // ─── Borders (micro-contrast) ───
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.14)',
  borderAccent: 'rgba(68,153,255,0.38)',

  // ─── Semantic ───
  error: '#EF4444',
  success: '#10B981',
  successGlow: 'rgba(16,185,129,0.18)',
  warning: '#F59E0B',

  // ─── Typography ───
  text: '#E8EEFF',
  textSecondary: '#7B8BAF',
  textMuted: '#374060',

  // ─── Legacy aliases (kept for auth-screen compat) ───
  inputBackground: '#0D1525',
  cardBackground: '#0D1525',
  googleBlue: '#4285F4',
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0,0,0,0.82)',
};

// The main background — exported separately so it can be used in
// StatusBar / SafeAreaView backgroundColor (must be solid hex)
export const BG = '#070913';
