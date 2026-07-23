/**
 * License policy helpers shared by the curation tool, the upload flow and
 * their API routes. The hosting whitelist rule lives here so client filters
 * and server gates can never drift apart.
 */

export interface LicenseHostability {
  spdxId: string
  allowsCommercial: boolean
  allowsRedistribution: boolean
}

/**
 * NoDerivatives is not modeled as a licenses column — CC "ND" variants are
 * identified by their SPDX id (e.g. CC-BY-ND-4.0, CC-BY-NC-ND-4.0). The check
 * matches ND only as a whole dash-delimited segment so ids merely containing
 * the letters (hypothetical "BRAND-1.0") never match.
 */
export function isNoDerivativesLicense(spdxId: string): boolean {
  return /(^|-)ND(-|$)/i.test(spdxId)
}

/**
 * Whitelist rule for hosting files on the platform: the license must allow
 * commercial use and redistribution, and must not be a NoDerivatives
 * variant. NC fails via allowsCommercial; ND via the SPDX id — the flag
 * pair alone would wrongly admit CC-BY-ND (it allows redistribution of the
 * unmodified work).
 */
export function isHostableLicense(license: LicenseHostability): boolean {
  return (
    license.allowsCommercial &&
    license.allowsRedistribution &&
    !isNoDerivativesLicense(license.spdxId)
  )
}

/** Same rule for raw database rows (snake_case columns). */
export function isHostableLicenseRow(row: {
  spdx_id: string
  allows_commercial: boolean
  allows_redistribution: boolean
}): boolean {
  return isHostableLicense({
    spdxId: row.spdx_id,
    allowsCommercial: row.allows_commercial,
    allowsRedistribution: row.allows_redistribution,
  })
}
