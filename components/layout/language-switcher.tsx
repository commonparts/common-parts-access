'use client'

import { Globe } from 'lucide-react'
import { hasLocale, useLocale, useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { usePathname, useRouter } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'

/** Globe menu that reopens the current page, query string included, in the chosen locale. */
export function LanguageSwitcher() {
  const t = useTranslations('LanguageSwitcher')
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const search = useSearchParams().toString()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t('label')}>
          <Globe aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={locale}
          onValueChange={(target) => {
            if (hasLocale(routing.locales, target)) {
              router.replace(search ? `${pathname}?${search}` : pathname, { locale: target })
            }
          }}
        >
          {routing.locales.map((target) => (
            <DropdownMenuRadioItem key={target} value={target} lang={target}>
              {t('localeName', { locale: target })}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
