type TokenGroup = {
  [key: string]: TokenValue
}

type TokenValue = string | number | TokenGroup

function flattenTokens(obj: TokenGroup, prefix = "--"): Record<string, string> {
  const result: Record<string, string> = {}

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "object") {
      Object.assign(result, flattenTokens(value, `${prefix}${key}-`))
    } else {
      result[`${prefix}${key}`] = String(value)
    }
  }

  return result
}

export function themeToCSSVars(theme: TokenGroup): Record<string, string> {
  return flattenTokens(theme)
}