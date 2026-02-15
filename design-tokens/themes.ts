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
      primary: colorPrimitives.neutral[50],
      secondary: colorPrimitives.neutral[200],
      disabled: colorPrimitives.charcoal[400],
      inverse: colorPrimitives.charcoal[900],
      link: colorPrimitives.accentBlue[400],
    },

    background: {
      page: colorPrimitives.charcoal[900],
      surface: colorPrimitives.charcoal[800],
      subtle: colorPrimitives.charcoal[700],
      hover: colorPrimitives.charcoal[700],
      disabled: colorPrimitives.charcoal[800],
    },

    border: {
      default: colorPrimitives.charcoal[600],
      subtle: colorPrimitives.charcoal[700],
      strong: colorPrimitives.charcoal[500],
      focus: colorPrimitives.accentBlue[400],
    },

    action: {
      primary: colorPrimitives.accentBlue[400],
      primaryHover: colorPrimitives.accentBlue[500],
      primaryActive: colorPrimitives.accentBlue[600],
      disabled: colorPrimitives.charcoal[500],
    },

    status: {
      success: colorPrimitives.accentBlue[300],
      successText: colorPrimitives.accentBlue[100],
    },
  },
} as const