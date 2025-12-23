type TokenValue = string | number | Record<string, any>

function flattenTokens(
  obj: Record<string, TokenValue>,
  prefix = "--"
): Record<string, string> {
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

export function themeToCSSVars(theme: Record<string, any>) {
  return flattenTokens(theme)
}