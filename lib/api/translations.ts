import { getTranslations } from 'next-intl/server'
import { requestLocale } from '@/lib/utils/locale'

/** The `Api` messages, in the locale of the page behind `request` (#500). */
export function getApiTranslations(request: Request) {
  return getTranslations({ locale: requestLocale(request), namespace: 'Api' })
}
