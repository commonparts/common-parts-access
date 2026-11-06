'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Link, usePathname } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'

/** Links to the current page, query string included, in every other locale. */
export function LanguageSwitcher() {
  const t = useTranslations('LanguageSwitcher')
  const locale = useLocale()
  const pathname = usePathname()
  const search = useSearchParams().toString()

  return (
    <div role="group" aria-label={t('label')} className="flex items-center">
      {routing.locales
        .filter((target) => target !== locale)
        .map((target) => (
          <Button key={target} asChild variant="ghost" size="sm" className="px-xs font-medium md:px-sm">
            <Link
              href={search ? `${pathname}?${search}` : pathname}
              locale={target}
              lang={target}
              hrefLang={target}
              aria-label={t('localeName', { locale: target })}
            >
              {/* The code keeps the navbar on one line on small screens. */}
              <span className="md:hidden">{target.toUpperCase()}</span>
              <span className="hidden md:inline">{t('localeName', { locale: target })}</span>
            </Link>
          </Button>
        ))}
    </div>
  )
}
