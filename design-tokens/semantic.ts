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
      primary: colorPrimitives.black[900], // #1A1A1A
      secondary: colorPrimitives.black[600], // #777777
      tertiary: colorPrimitives.black[400], // #AAAAAA
      disabled: colorPrimitives.black[300], // #D0D0CE
      inverse: colorPrimitives.surface.white, // #FFFFFF
      link: colorPrimitives.green[500], // Malachite
      linkHover: colorPrimitives.green[600], // Viridian
    },

    background: {
      page: colorPrimitives.surface.white,
      surface: colorPrimitives.surface.white,
      subtle: colorPrimitives.surface.light, // #F7F7F6
      muted: colorPrimitives.surface.subtle, // #EFEFED
      hover: colorPrimitives.surface.subtle,
      disabled: colorPrimitives.surface.subtle,
      // Institutional green backgrounds — used sparingly
      accent: colorPrimitives.green[100], // #EEF2EC
      accentSubtle: colorPrimitives.green[50], // #F4F7F3
    },

    border: {
      default: colorPrimitives.black[200], // #E4E4E2
      subtle: colorPrimitives.surface.muted, // #E4E4E2
      strong: colorPrimitives.black[500], // #888888
      focus: colorPrimitives.green[500], // Malachite
    },

    action: {
      primary: colorPrimitives.green[500], // Malachite — buttons, links
      primaryHover: colorPrimitives.green[600], // Viridian — hover state
      primaryActive: colorPrimitives.green[700],
      disabled: colorPrimitives.black[300],
    },

    // Institutional green — the seal, certification marks, symbol imprint
    institutional: {
      viridian: colorPrimitives.green[600], // #234F3E — print, formal
      malachite: colorPrimitives.green[500], // #2D6A4F — screen, interface
    },

    status: {
      success: colorPrimitives.green[100],
      successText: colorPrimitives.green[700],
      error: colorPrimitives.red[50],
      errorText: colorPrimitives.red[600],
      errorBorder: colorPrimitives.red[200],
      warning: colorPrimitives.amber[50],
      warningText: colorPrimitives.amber[600],
      warningBorder: colorPrimitives.amber[200],
    },

    // Certification marks
    certification: {
      background: colorPrimitives.green[600], // Viridian
      text: colorPrimitives.surface.white,
      outlineBorder: colorPrimitives.green[600],
      outlineText: colorPrimitives.green[600],
    },
  },

  spacing: {
    "3xs": spacingPrimitives[1], // 4px
    "2xs": spacingPrimitives[2], // 8px
    xs: spacingPrimitives[3], // 12px
    sm: spacingPrimitives[4], // 16px
    md: spacingPrimitives[6], // 24px
    lg: spacingPrimitives[7], // 32px
    xl: spacingPrimitives[9], // 48px
    "2xl": spacingPrimitives[10], // 64px
    "3xl": spacingPrimitives[11], // 80px
    "4xl": spacingPrimitives[12], // 96px
    "5xl": spacingPrimitives[13], // 120px
  },

  radius: {
    none: radiusPrimitives.none,
    sm: radiusPrimitives.sm, // 4px — tags, small pills
    md: radiusPrimitives.md, // 6px — buttons, inputs
    lg: radiusPrimitives.lg, // 8px — cards, dialogs
    xl: radiusPrimitives["2xl"], // 12px — large cards, sections
    pill: radiusPrimitives.full, // avatars, toggles
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
      micro: typographyPrimitives.fontSize.xs, // 11px — badges, labels
      caption: typographyPrimitives.fontSize.sm, // 13px — metadata, hints
      body: typographyPrimitives.fontSize.md, // 14px — UI text
      bodyLg: typographyPrimitives.fontSize.base, // 15px — reading text
      subtitle: typographyPrimitives.fontSize.xl, // 17px — section titles
      headingSm: typographyPrimitives.fontSize["2xl"], // 22px
      headingMd: typographyPrimitives.fontSize["3xl"], // 28px
      headingLg: typographyPrimitives.fontSize["4xl"], // 32px
      display: typographyPrimitives.fontSize["5xl"], // 42px — hero
      displayLg: typographyPrimitives.fontSize["6xl"], // 48px — institutional
    },

    weight: {
      light: typographyPrimitives.fontWeight.light, // 300 — large display
      regular: typographyPrimitives.fontWeight.regular, // 400 — body
      medium: typographyPrimitives.fontWeight.medium, // 500 — headings, logotype
      semibold: typographyPrimitives.fontWeight.semibold, // 600 — emphasis
    },

    lineHeight: {
      tight: typographyPrimitives.lineHeight.tight, // 1.15 — display text
      snug: typographyPrimitives.lineHeight.snug, // 1.3 — headings
      normal: typographyPrimitives.lineHeight.normal, // 1.5 — UI text
      relaxed: typographyPrimitives.lineHeight.relaxed, // 1.65 — reading text
    },

    letterSpacing: {
      tight: typographyPrimitives.letterSpacing.tight, // -0.02em — display
      snug: typographyPrimitives.letterSpacing.snug, // -0.01em — headings
      normal: typographyPrimitives.letterSpacing.normal,
      wide: typographyPrimitives.letterSpacing.wide, // 0.01em
      mono: typographyPrimitives.letterSpacing.wider, // 0.08em — overlines
      caps: typographyPrimitives.letterSpacing.widest, // 0.1em — section labels
    },
  },
} as const