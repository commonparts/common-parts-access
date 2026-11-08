import licenseTexts from '@/assets/license-texts.json'
import type { Tables } from '@/types/supabase'

export interface ArchiveLicenseInput {
  name: string
  author: string | null
  authorUrl: string | null
  sourceUrl: string | null
  license: Pick<Tables<'licenses'>, 'name' | 'spdx_id' | 'url'> | null
}

/** Builds an offline license notice; bundled SPDX texts are never fetched at download time. */
export function archiveLicenseText(part: ArchiveLicenseInput): string {
  const license = part.license
  const texts: Readonly<Record<string, string>> = licenseTexts
  const text = license && Object.hasOwn(texts, license.spdx_id) ? texts[license.spdx_id] : null
  return [
    `Part: ${part.name}`,
    part.author && `Author: ${part.author}`,
    part.authorUrl && `Author URL: ${part.authorUrl}`,
    part.sourceUrl && `Source: ${part.sourceUrl}`,
    license && `License: ${license.name}`,
    license && `SPDX-License-Identifier: ${license.spdx_id}`,
    license && `License URL: ${license.url}`,
    '',
    text || (license
      ? 'The full license text is not bundled. Refer to the license URL above for its terms.'
      : 'No license information is available for this part. No permission to reuse it is granted by this notice.'),
    '',
  ].filter((line) => line !== null).join('\n')
}
