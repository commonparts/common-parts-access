import { getTranslations } from 'next-intl/server'

import { StatusPage } from '@/components/layout/status-page'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'

export default async function NotFound() {
  const t = await getTranslations('NotFound')
  return (
    <StatusPage eyebrow={t('eyebrow')} title={t('title')} description={t('description')}>
      <Button asChild>
        <Link href="/">{t('home')}</Link>
      </Button>
      <Button asChild variant="outline">
        <Link href="/browse">{t('browse')}</Link>
      </Button>
    </StatusPage>
  )
}
