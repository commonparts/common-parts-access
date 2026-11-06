'use client'

import { useTranslations } from 'next-intl'
import { useEffect } from 'react'

import { Link } from '@/i18n/navigation'

import { StatusPage } from '@/components/layout/status-page'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations('ErrorPage')
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <StatusPage eyebrow={t('eyebrow')} title={t('title')} description={t('description')}>
      <Button onClick={() => reset()}>{t('retry')}</Button>
      <Button asChild variant="outline">
        <Link href="/">{t('home')}</Link>
      </Button>
    </StatusPage>
  )
}
