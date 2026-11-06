import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['en', 'fr'],
  // Stage 1 addresses French Repair Cafés and fablabs: French is served when
  // neither the locale cookie nor Accept-Language names a supported locale.
  defaultLocale: 'fr',
  localePrefix: 'always',
})
