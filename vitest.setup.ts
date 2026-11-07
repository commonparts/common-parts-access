import { createTranslator, type Locale } from 'next-intl'
import { vi } from 'vitest'
import en from '@/messages/en.json'
import fr from '@/messages/fr.json'

// next-intl/server only works under the react-server condition, which Vitest
// does not use: tests translate from the message files, in English unless a
// locale is named.
vi.mock('next-intl/server', () => ({
  getLocale: async () => 'en',
  getTranslations: async (options?: string | { locale?: Locale; namespace?: string }) => {
    const { locale = 'en', namespace } = typeof options === 'string' ? { namespace: options } : (options ?? {})
    // Any namespace the code under test asks for, unchecked here.
    return createTranslator({ locale, messages: locale === 'fr' ? fr : en, namespace: namespace as never })
  },
}))
