export const colorPrimitives = {
  deepHarbor: {
    50: "#E6EEF2",
    100: "#C9DAE3",
    200: "#9FBED0",
    300: "#749FBC",
    400: "#4A81A7",
    500: "#0B2D3F",
    600: "#092736",
    700: "#07202C",
    800: "#051822",
    900: "#031118",
  },

  steel: {
    50: "#F2F4F6",
    100: "#E1E5E8",
    200: "#C4CBD0",
    300: "#A6B1B8",
    400: "#8897A0",
    500: "#4A5B66",
    600: "#3F4E57",
    700: "#334048",
    800: "#273238",
    900: "#1B2328",
  },

  buoyOrange: {
    50: "#FFF3EC",
    100: "#FFE3D2",
    200: "#FFC6A6",
    300: "#FFA97A",
    400: "#FF8A3D",
    500: "#F97316",
    600: "#E8640F",
    700: "#C24F0A",
    800: "#9A3E08",
    900: "#7C3106",
  },

  mintFoam: {
    50: "#F1FDF6",
    100: "#DCFBEA",
    200: "#B9F5D0",
    300: "#8DEEB4",
    400: "#5FE696",
    500: "#34D399",
    600: "#10B981",
    700: "#059669",
    800: "#047857",
    900: "#065F46",
  },

  offWhite: {
    50: "#FFFFFF",
    100: "#F7F9FB",
    200: "#EEF2F6",
    300: "#E4E9EF",
    400: "#D8DEE6",
    500: "#C2C9D1",
    600: "#9FA7B1",
    700: "#7C858F",
    800: "#59626C",
    900: "#3A424A",
  },
} as const

export const spacingPrimitives = {
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  8: "32px",
  10: "40px",
  12: "48px",
  16: "64px",
} as const

export const radiusPrimitives = {
  none: "0",
  sm: "2px",
  md: "4px",
  lg: "8px",
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
    body: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    heading: "'Outfit', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace",
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