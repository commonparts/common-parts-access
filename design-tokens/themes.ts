import { semanticTokens } from "./semantic"
import { colorPrimitives } from "./primitives"

export const lightTheme = {
  ...semanticTokens,
} as const

export const darkTheme = {
  ...semanticTokens,

  color: {
    ...semanticTokens.color,

    text: {
      primary: colorPrimitives.black[50], // #F7F7F6
      secondary: colorPrimitives.black[400], // #AAAAAA
      tertiary: colorPrimitives.black[500], // #888888
      disabled: colorPrimitives.black[600], // #777777
      inverse: colorPrimitives.black[900], // #1A1A1A
      link: colorPrimitives.green[400], // lighter green for dark bg
      linkHover: colorPrimitives.green[300],
    },

    background: {
      page: colorPrimitives.black[900], // #1A1A1A
      surface: colorPrimitives.black[800], // #333333
      subtle: colorPrimitives.black[700], // #555555
      muted: colorPrimitives.black[700],
      hover: colorPrimitives.black[700],
      disabled: colorPrimitives.black[800],
      accent: colorPrimitives.green[900], // very dark green
      accentSubtle: colorPrimitives.green[800],
    },

    border: {
      default: colorPrimitives.black[700], // #555555
      subtle: colorPrimitives.black[800], // #333333
      strong: colorPrimitives.black[500], // #888888
      focus: colorPrimitives.green[400],
    },

    action: {
      primary: colorPrimitives.green[500], // Malachite stays
      primaryHover: colorPrimitives.green[400],
      primaryActive: colorPrimitives.green[600],
      disabled: colorPrimitives.black[700],
    },

    institutional: {
      viridian: colorPrimitives.green[600], // unchanged — the seal is the seal
      malachite: colorPrimitives.green[500], // unchanged
    },

    status: {
      success: colorPrimitives.green[900],
      successText: colorPrimitives.green[300],
      error: colorPrimitives.red[900],
      errorText: colorPrimitives.red[300],
      errorBorder: colorPrimitives.red[700],
      warning: colorPrimitives.amber[900],
      warningText: colorPrimitives.amber[300],
      warningBorder: colorPrimitives.amber[700],
    },

    certification: {
      background: colorPrimitives.green[600], // unchanged — protected mark
      text: colorPrimitives.surface.white,
      outlineBorder: colorPrimitives.green[400],
      outlineText: colorPrimitives.green[400],
    },
  },
} as const