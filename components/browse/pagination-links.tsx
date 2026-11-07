import { useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'

import { Button } from '@/components/ui/button'

interface PaginationLinksProps {
  /** Path of the listing without any query string, e.g. "/brands/bosch". */
  basePath: string
  page: number
  totalPages: number
}

/**
 * Link-based prev/next pagination for server-rendered listings — crawlable,
 * no client state. Page 1 links to the bare base path so the canonical URL
 * never carries a redundant ?page=1.
 */
export function PaginationLinks({ basePath, page, totalPages }: PaginationLinksProps) {
  const t = useTranslations('Pagination')
  if (totalPages <= 1) return null

  const pageHref = (target: number): string =>
    target <= 1 ? basePath : `${basePath}?page=${target}`

  return (
    <nav aria-label={t('label')} className="flex items-center justify-center gap-sm">
      {page > 1 ? (
        <Button asChild variant="outline" size="sm">
          <Link href={pageHref(page - 1)}>{t('previous')}</Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>
          {t('previous')}
        </Button>
      )}
      <span className="text-caption text-text-secondary">
        {t('pageOf', { page, totalPages })}
      </span>
      {page < totalPages ? (
        <Button asChild variant="outline" size="sm">
          <Link href={pageHref(page + 1)}>{t('next')}</Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>
          {t('next')}
        </Button>
      )}
    </nav>
  )
}
