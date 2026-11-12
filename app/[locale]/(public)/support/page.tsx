import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getFormatter, getLocale, getTranslations } from 'next-intl/server'
import { Container } from '@/components/layout/container'
import { Section } from '@/components/layout/section'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { serverEnv } from '@/lib/env'
import { getSupportBudget } from '@/lib/support/budget'
import { localizedPageMetadata } from '@/lib/utils/seo'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('SupportPage')
  return { robots: { index: false, follow: false }, title: t('title'), description: t('intro'), ...localizedPageMetadata('/support', await getLocale()) }
}

/** Donations and the monthly operating budget share a public, localized page. */
export default async function SupportPage() {
  const t = await getTranslations('SupportPage')
  const leetchiUrl = serverEnv('SUPPORT_LEETCHI_URL')
  return (
    <Section>
      <Container size="md" className="space-y-lg">
        <header className="space-y-md">
          <h1 className="text-h1">{t('title')}</h1>
          <p className="text-text-secondary">{t('intro')}</p>
          {leetchiUrl ? (
            <Button asChild><a href={leetchiUrl} rel="noopener noreferrer">{t('donate')}</a></Button>
          ) : <p className="text-text-secondary">{t('pending')}</p>}
        </header>
        <Card>
          <CardHeader><CardTitle><h2 className="text-h3">{t('budget')}</h2></CardTitle></CardHeader>
          <CardContent className="space-y-md">
            <p className="text-text-secondary">{t('forecast')}</p>
            <Suspense fallback={<p role="status" className="text-text-secondary">{t('loading')}</p>}>
              <SupportBudget />
            </Suspense>
            <p className="text-caption text-text-secondary">{t('method')}</p>
            <p className="text-caption text-text-secondary">{t('exclusions')}</p>
          </CardContent>
        </Card>
      </Container>
    </Section>
  )
}

/** Streams the cost rows without delaying the fundraiser link. */
async function SupportBudget() {
  const [t, format, budget] = await Promise.all([getTranslations('SupportPage'), getFormatter(), getSupportBudget()])
  return (
    <dl className="space-y-sm">
      {(['railway', 'supabase', 'total'] as const).map((key) => (
        <div key={key} className="flex flex-wrap justify-between gap-sm border-b border-border-subtle pb-sm">
          <dt>{t(key)}</dt>
          <dd className="font-mono">{budget[key] === null ? t('unavailable') : format.number(budget[key], { style: 'currency', currency: 'EUR' })}</dd>
        </div>
      ))}
    </dl>
  )
}
