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
      primary: colorPrimitives.deepHarbor[500],
      secondary: colorPrimitives.steel[600],
      disabled: colorPrimitives.steel[400],
      inverse: colorPrimitives.offWhite[50],
      link: colorPrimitives.buoyOrange[500],
    },

    background: {
      page: colorPrimitives.offWhite[100],
      surface: colorPrimitives.offWhite[50],
      subtle: colorPrimitives.offWhite[200],
      hover: colorPrimitives.offWhite[300],
      disabled: colorPrimitives.offWhite[200],
    },

    border: {
      default: colorPrimitives.steel[500],
      subtle: colorPrimitives.steel[200],
      strong: colorPrimitives.steel[700],
      focus: colorPrimitives.buoyOrange[500],
    },

    action: {
      primary: colorPrimitives.buoyOrange[500],
      primaryHover: colorPrimitives.buoyOrange[600],
      primaryActive: colorPrimitives.buoyOrange[700],
      disabled: colorPrimitives.steel[300],
    },

    status: {
      success: colorPrimitives.mintFoam[200],
      successText: colorPrimitives.mintFoam[700],
    },
  },

  spacing: {
    xs: spacingPrimitives[1],
    sm: spacingPrimitives[2],
    md: spacingPrimitives[4],
    lg: spacingPrimitives[6],
    xl: spacingPrimitives[8],
    "2xl": spacingPrimitives[12],
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