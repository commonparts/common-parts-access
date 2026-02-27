export const colorPrimitives = {
  // Neutral, institutional base
  charcoal: {
    50: "#EDEDED",
    100: "#D9D9D9",
    200: "#BFBFBF",
    300: "#A6A6A6",
    400: "#8C8C8C",
    500: "#737373",
    600: "#4D4D4D",
    700: "#333333",
    800: "#1F1F1F",
    900: "#111111",
  },

  neutral: {
    50: "#FFFFFF",
    100: "#F9F9F9",
    200: "#F5F5F5",
    300: "#EEEEEE",
    400: "#E5E5E5",
    500: "#D8D8D8",
    600: "#BFBFBF",
    700: "#A6A6A6",
    800: "#8C8C8C",
    900: "#737373",
  },

  accentBlue: {
    50: "#E8EEF7",
    100: "#C9D6EB",
    200: "#A3BCDC",
    300: "#7A9DCA",
    400: "#4F7EB6",
    500: "#1E3A5F",
    600: "#18304F",
    700: "#12263F",
    800: "#0C1B2F",
    900: "#081323",
  },
} as const

export const spacingPrimitives = {
  1: "4px",
  2: "8px",
  3: "10px",
  4: "16px",
  5: "24px",
  6: "32px",
  7: "40px",
  8: "48px",
  9: "64px",
  10: "80px",
} as const

export const radiusPrimitives = {
  none: "0",
  sm: "2px",
  md: "3px",
  lg: "6px",
  full: "9999px",
} as const

export const elevationPrimitives = {
  none: "none",

  xs: "0 1px 2px rgba(0, 0, 0, 0.04)",
  sm: "0 2px 4px rgba(0, 0, 0, 0.06)",
  md: "0 4px 8px rgba(0, 0, 0, 0.08)",
  lg: "0 8px 16px rgba(0, 0, 0, 0.10)",
  xl: "0 16px 32px rgba(0, 0, 0, 0.12)",
} as const

export const motionPrimitives = {
  duration: {
    fast: "100ms",
    medium: "200ms",
    slow: "300ms",
  },

  easing: {
    standard: "cubic-bezier(0.4, 0, 0.2, 1)",
    in: "cubic-bezier(0.4, 0, 1, 1)",
    out: "cubic-bezier(0, 0, 0.2, 1)",
  },
} as const

export const typographyPrimitives = {
  fontFamily: {
    body: "'Source Sans 3', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    heading: "'Source Sans 3', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    mono: "'Source Sans 3', ui-monospace, SFMono-Regular, monospace",
  },

  fontSize: {
    xs: "12px",
    sm: "14px",
    md: "16px",
    lg: "18px",
    xl: "20px",
    "2xl": "24px",
    "3xl": "30px",
    "4xl": "36px",
  },

  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.7,
  },
} as const