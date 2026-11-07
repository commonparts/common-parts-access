import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['en', 'fr'],
  // English is the default for international reach: it is served when neither
  // the locale cookie nor Accept-Language names a supported locale.
  defaultLocale: 'en',
  localePrefix: 'always',
})
