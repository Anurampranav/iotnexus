/**
 * Smart CodeFlurry Design Tokens
 * Single source of truth for all visual values.
 * DO NOT scatter these values throughout component files.
 */

// ─────────────────────────────────────────────
// COLORS
// ─────────────────────────────────────────────

export const Colors = {
  // Backgrounds
  background:    '#1E1B19',
  surface:       '#2A2725',
  surfaceHigh:   '#332F2C',
  surfaceLow:    '#221F1D',

  // Glass
  glass:         'rgba(255, 255, 255, 0.07)',
  glassMedium:   'rgba(255, 255, 255, 0.10)',
  glassStrong:   'rgba(255, 255, 255, 0.14)',
  glassBorder:   'rgba(255, 255, 255, 0.10)',
  glassHighlight:'rgba(255, 255, 255, 0.06)',

  // Primary accent
  primary:       '#FF8A50',
  primaryLight:  '#FFB38A',
  primaryDark:   '#E06A30',
  primaryGlow:   'rgba(255, 138, 80, 0.20)',
  primarySurface:'rgba(255, 138, 80, 0.12)',

  // Text
  textPrimary:   '#F5F5F5',
  textSecondary: '#B4B0AD',
  textMuted:     '#7A7570',
  textInverse:   '#1E1B19',

  // Semantic
  success:       '#6E8C8C',
  successLight:  '#8AADAD',
  successSurface:'rgba(110, 140, 140, 0.15)',
  warning:       '#FFC166',
  warningSurface:'rgba(255, 193, 102, 0.15)',
  error:         '#FF6B6B',
  errorSurface:  'rgba(255, 107, 107, 0.15)',
  info:          '#7BA7C4',
  infoSurface:   'rgba(123, 167, 196, 0.15)',

  // Device status
  statusOnline:  '#6E8C8C',
  statusOffline: '#7A7570',
  statusUnknown: '#B4B0AD',
  statusPending: '#FFC166',
  statusFailed:  '#FF6B6B',

  // Water levels
  waterNormal:   '#6E8C8C',
  waterWarning:  '#FFC166',
  waterLow:      '#FF8A50',
  waterCritical: '#FF6B6B',

  // Overlays
  overlay:       'rgba(30, 27, 25, 0.60)',
  overlayLight:  'rgba(30, 27, 25, 0.40)',
  overlayDark:   'rgba(30, 27, 25, 0.85)',

  // Separator
  separator:     'rgba(255, 255, 255, 0.06)',
  border:        'rgba(255, 255, 255, 0.08)',
  borderFocus:   'rgba(255, 138, 80, 0.50)',
} as const;

// ─────────────────────────────────────────────
// TYPOGRAPHY
// ─────────────────────────────────────────────

export const Typography = {
  fontFamily: {
    regular:    'Inter_400Regular',
    medium:     'Inter_500Medium',
    semiBold:   'Inter_600SemiBold',
    bold:       'Inter_700Bold',
  },
  fontSize: {
    xs:   11,
    sm:   13,
    base: 15,
    md:   17,
    lg:   20,
    xl:   24,
    '2xl': 28,
    '3xl': 34,
    '4xl': 42,
    '5xl': 56,
  },
  lineHeight: {
    tight:   1.2,
    normal:  1.5,
    relaxed: 1.7,
  },
  letterSpacing: {
    tight:  -0.5,
    normal:  0,
    wide:    0.5,
    wider:   1.0,
    widest:  2.0,
  },
} as const;

// ─────────────────────────────────────────────
// SPACING
// ─────────────────────────────────────────────

export const Spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  base:16,
  lg:  20,
  xl:  24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
} as const;

// ─────────────────────────────────────────────
// BORDER RADIUS
// ─────────────────────────────────────────────

export const Radius = {
  xs:   6,
  sm:   10,
  md:   14,
  lg:   20,
  xl:   24,
  '2xl': 32,
  full: 9999,
} as const;

// ─────────────────────────────────────────────
// BLUR
// ─────────────────────────────────────────────

export const Blur = {
  sm:   8,
  md:   16,
  lg:   24,
  xl:   32,
} as const;

// ─────────────────────────────────────────────
// SHADOWS
// ─────────────────────────────────────────────

export const Shadows = {
  sm: {
    shadowColor:   '#000000',
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius:  4,
    elevation:     2,
  },
  md: {
    shadowColor:   '#000000',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius:  12,
    elevation:     6,
  },
  lg: {
    shadowColor:   '#000000',
    shadowOffset:  { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius:  24,
    elevation:     12,
  },
  glow: {
    shadowColor:   '#FF8A50',
    shadowOffset:  { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius:  12,
    elevation:     4,
  },
} as const;

// ─────────────────────────────────────────────
// ANIMATION
// ─────────────────────────────────────────────

export const Animation = {
  durationFast:   120,
  durationNormal: 220,
  durationSlow:   380,
  durationPage:   300,
} as const;

// ─────────────────────────────────────────────
// ICON SIZES
// ─────────────────────────────────────────────

export const IconSize = {
  xs:   14,
  sm:   18,
  md:   22,
  lg:   26,
  xl:   32,
  '2xl': 40,
} as const;

// ─────────────────────────────────────────────
// LAYOUT
// ─────────────────────────────────────────────

export const Layout = {
  // Safe areas (supplemented by SafeAreaView)
  tabBarHeight:  72,
  headerHeight:  56,
  statusBarHeight: 0, // injected at runtime

  // Touch targets (min 44pt per accessibility)
  touchTarget:   44,

  // Content padding
  screenPadding: Spacing.base,
} as const;
