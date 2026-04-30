export const colorPrimitives = {
  // Core neutral — warm black, not pure
  black: {
    50: "#F7F7F6",
    100: "#EFEFED",
    200: "#E4E4E2",
    300: "#D0D0CE",
    400: "#AAAAAA",
    500: "#888888",
    600: "#777777",
    700: "#555555",
    800: "#333333",
    900: "#1A1A1A",
  },

  // Surface & background tones
  surface: {
    white: "#FFFFFF",
    light: "#F7F7F6",
    subtle: "#EFEFED",
    muted: "#E4E4E2",
  },

  // Institutional green — the seal color
  green: {
    50: "#F4F7F3",
    100: "#EEF2EC",
    200: "#D4E0CF",
    300: "#A8C4A0",
    400: "#6B9A60",
    500: "#2D6A4F", // Malachite — interface / digital
    600: "#234F3E", // Viridian — institutional / print
    700: "#1B3D30",
    800: "#132B22",
    900: "#0C1C16",
  },

  // Functional: error / destructive
  red: {
    50: "#FEF2F2",
    100: "#FDE8E8",
    200: "#F9C4C4",
    300: "#F09898",
    400: "#E25C5C",
    500: "#C53030",
    600: "#9B2C2C",
    700: "#742A2A",
    800: "#4A1D1D",
    900: "#2D1111",
  },

  // Functional: warning
  amber: {
    50: "#FFFBEB",
    100: "#FEF3C7",
    200: "#FDE68A",
    300: "#FCD34D",
    400: "#FBBF24",
    500: "#D97706",
    600: "#B45309",
    700: "#92400E",
    800: "#78350F",
    900: "#451A03",
  },
} as const

export const spacingPrimitives = {
  0: "0",
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  7: "32px",
  8: "40px",
  9: "48px",
  10: "64px",
  11: "80px",
  12: "96px",
  13: "120px",
} as const

export const radiusPrimitives = {
  none: "0",
  sm: "4px",
  md: "6px",
  lg: "8px",
  xl: "10px",
  "2xl": "12px",
  "3xl": "14px",
  full: "9999px",
} as const

export const elevationPrimitives = {
  none: "none",
  xs: "0 1px 2px rgba(26, 26, 26, 0.04)",
  sm: "0 2px 4px rgba(26, 26, 26, 0.06)",
  md: "0 4px 8px rgba(26, 26, 26, 0.08)",
  lg: "0 8px 16px rgba(26, 26, 26, 0.10)",
  xl: "0 16px 32px rgba(26, 26, 26, 0.12)",
} as const

export const motionPrimitives = {
  duration: {
    fast: "100ms",
    medium: "150ms",
    slow: "200ms",
  },
  easing: {
    standard: "cubic-bezier(0.4, 0, 0.2, 1)",
    in: "cubic-bezier(0.4, 0, 1, 1)",
    out: "cubic-bezier(0, 0, 0.2, 1)",
  },
} as const

export const typographyPrimitives = {
  fontFamily: {
    body: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    heading:
      "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    mono: "'IBM Plex Mono', 'SFMono-Regular', 'Consolas', monospace",
  },

  fontSize: {
    xs: "11px",
    sm: "13px",
    md: "14px",
    base: "15px",
    lg: "16px",
    xl: "17px",
    "2xl": "22px",
    "3xl": "28px",
    "4xl": "32px",
    "5xl": "42px",
    "6xl": "48px",
  },

  fontWeight: {
    light: 300,
    regular: 400,
    medium: 500,
    semibold: 600,
  },

  lineHeight: {
    tight: 1.15,
    snug: 1.3,
    normal: 1.5,
    relaxed: 1.65,
  },

  letterSpacing: {
    tight: "-0.02em",
    snug: "-0.01em",
    normal: "0",
    wide: "0.01em",
    wider: "0.08em",
    widest: "0.1em",
  },
} as const