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
      primary: colorPrimitives.offWhite[50],
      secondary: colorPrimitives.offWhite[300],
      disabled: colorPrimitives.steel[400],
      inverse: colorPrimitives.deepHarbor[900],
      link: colorPrimitives.buoyOrange[400],
    },

    background: {
      page: colorPrimitives.deepHarbor[900],
      surface: colorPrimitives.deepHarbor[800],
      subtle: colorPrimitives.deepHarbor[700],
      hover: colorPrimitives.deepHarbor[700],
      disabled: colorPrimitives.deepHarbor[800],
    },

    border: {
      default: colorPrimitives.steel[700],
      subtle: colorPrimitives.steel[800],
      strong: colorPrimitives.steel[600],
      focus: colorPrimitives.buoyOrange[400],
    },

    action: {
      primary: colorPrimitives.buoyOrange[400],
      primaryHover: colorPrimitives.buoyOrange[500],
      primaryActive: colorPrimitives.buoyOrange[600],
      disabled: colorPrimitives.steel[600],
    },

    status: {
      success: colorPrimitives.mintFoam[400],
      successText: colorPrimitives.mintFoam[100],
    },
  },
} as const