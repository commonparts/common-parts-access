import {
  colorPrimitives,
  spacingPrimitives,
  radiusPrimitives,
  elevationPrimitives,
  motionPrimitives,
  typographyPrimitives,
} from "./primitives"

export const semanticTokens = {
  color: {
    text: {
      primary: colorPrimitives.charcoal[800],
      secondary: colorPrimitives.charcoal[600],
      disabled: colorPrimitives.charcoal[400],
      inverse: colorPrimitives.neutral[50],
      link: colorPrimitives.accentBlue[500],
    },

    background: {
      page: colorPrimitives.neutral[100],
      surface: colorPrimitives.neutral[50],
      subtle: colorPrimitives.neutral[200],
      hover: colorPrimitives.neutral[300],
      disabled: colorPrimitives.neutral[200],
    },

    border: {
      default: colorPrimitives.charcoal[400],
      subtle: colorPrimitives.neutral[400],
      strong: colorPrimitives.charcoal[700],
      focus: colorPrimitives.accentBlue[500],
    },

    action: {
      primary: colorPrimitives.accentBlue[500],
      primaryHover: colorPrimitives.accentBlue[600],
      primaryActive: colorPrimitives.accentBlue[700],
      disabled: colorPrimitives.neutral[500],
    },

    status: {
      success: colorPrimitives.accentBlue[200],
      successText: colorPrimitives.accentBlue[700],
    },
  },

  spacing: {
    xs: spacingPrimitives[1],
    sm: spacingPrimitives[2],
    md: spacingPrimitives[4],
    lg: spacingPrimitives[6],
    xl: spacingPrimitives[8],
    "2xl": spacingPrimitives[12],
    "3xl": spacingPrimitives[16],
  },

  radius: {
    none: radiusPrimitives.none,
    sm: radiusPrimitives.sm,
    md: radiusPrimitives.md,
    lg: radiusPrimitives.lg,
    pill: radiusPrimitives.full,
  },

    elevation: {
    none: elevationPrimitives.none,
    surface: elevationPrimitives.xs,
    raised: elevationPrimitives.sm,
    overlay: elevationPrimitives.md,
    modal: elevationPrimitives.lg,
  },

  motion: {
    duration: {
      fast: motionPrimitives.duration.fast,
      medium: motionPrimitives.duration.medium,
      slow: motionPrimitives.duration.slow,
    },

    easing: {
      standard: motionPrimitives.easing.standard,
      in: motionPrimitives.easing.in,
      out: motionPrimitives.easing.out,
    },
  },

  typography: {
    font: {
      body: typographyPrimitives.fontFamily.body,
      heading: typographyPrimitives.fontFamily.heading,
      mono: typographyPrimitives.fontFamily.mono,
    },

    size: {
      body: typographyPrimitives.fontSize.md,
      caption: typographyPrimitives.fontSize.sm,
      headingSm: typographyPrimitives.fontSize.xl,
      headingMd: typographyPrimitives.fontSize["2xl"],
      headingLg: typographyPrimitives.fontSize["3xl"],
    },

    weight: {
      body: typographyPrimitives.fontWeight.regular,
      medium: typographyPrimitives.fontWeight.medium,
      semibold: typographyPrimitives.fontWeight.semibold,
      bold: typographyPrimitives.fontWeight.bold,
    },

    lineHeight: {
      body: typographyPrimitives.lineHeight.normal,
      heading: typographyPrimitives.lineHeight.tight,
    },
  },
} as const