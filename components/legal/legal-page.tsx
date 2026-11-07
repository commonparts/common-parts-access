import type { Metadata } from 'next'
import type { Locale } from 'next-intl'
import { getLocale, getTranslations } from 'next-intl/server'
import type { ComponentType } from 'react'

import { Container } from '@/components/layout/container'
import { Section } from '@/components/layout/section'
import { APP_NAME } from '@/lib/utils/constants'

type LegalPageKey = 'terms' | 'privacy' | 'legalNotice'

interface LegalPageProps {
  page: LegalPageKey
  /** The text of the page in each locale, written as plain markup styled by this shell. */
  content: Record<Locale, ComponentType>
}

export async function legalPageMetadata(page: LegalPageKey): Promise<Metadata> {
  const t = await getTranslations('LegalPages')
  return { title: t(`${page}.title`), description: t(`${page}.description`) }
}

/**
 * Shell of the legal pages: title, governing language clause and the styles of
 * the section markup, around the content of the active locale. The texts are
 * TSX rather than messages because they are long-form and reviewed as a whole.
 */
export async function LegalPage({ page, content }: LegalPageProps) {
  const [locale, t] = await Promise.all([getLocale(), getTranslations('LegalPages')])
  const Content = content[locale]

  return (
    <Section>
      <Container size="md">
        <div className="space-y-lg [&_a]:underline [&_h2]:text-h3 [&_h3]:scroll-mt-3xl [&_h3]:text-h4 [&_p]:text-text-secondary [&_section]:space-y-sm [&_ul]:list-disc [&_ul]:space-y-xs [&_ul]:pl-md [&_ul]:text-text-secondary">
          <div>
            <h1 className="text-h1">{t(`${page}.title`)}</h1>
            <p className="mt-md">{APP_NAME}</p>
            <p className="mt-sm">{t('governingLanguage')}</p>
          </div>
          <Content />
        </div>
      </Container>
    </Section>
  )
}
