import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import type { ReactNode } from 'react'

import { Link } from '@/i18n/navigation'
import { Container } from '@/components/layout/container'
import { Section } from '@/components/layout/section'
import { DATA_LICENSE, TERMS_LICENSES_SECTION_HREF } from '@/lib/utils/licenses'

const CONTACT_EMAIL = 'contact@commonparts.org'

const CELL_CLASS = 'border border-border-default px-sm py-xs'
const HEADER_CELL_CLASS = `${CELL_CLASS} text-left text-body font-medium text-text-primary`
const STATUS_CELL_CLASS = `${CELL_CLASS} align-top text-body font-medium text-text-primary`
const MEANING_CELL_CLASS = `${CELL_CLASS} text-text-secondary`

/** The verification statuses of the table, in the order a part climbs them. */
const VERIFICATION_STATUSES = ['unverified', 'authorTested', 'communityValidated'] as const

/** Emphasis inside the rich messages of this page. */
const strong = (chunks: ReactNode) => <strong className="font-medium text-text-primary">{chunks}</strong>

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('ContributingPage')
  return { title: t('metaTitle'), description: t('metaDescription') }
}

/**
 * The contributor guide. Its copy is the `ContributingPage` messages; sentences
 * with a link or emphasis are rendered with `t.rich`.
 */
export default async function ContributingPage() {
  const t = await getTranslations('ContributingPage')

  return (
    <Section>
      <Container size="md">
        <div className="space-y-lg">
          <div>
            <h1 className="text-h1">{t('title')}</h1>
            <p className="mt-md text-text-secondary">{t('intro')}</p>
          </div>

          <section className="space-y-sm">
            <h2 className="text-h3">{t('accept.title')}</h2>
            <p className="text-text-secondary">{t('accept.intro')}</p>

            <div className="space-y-xs">
              <h3 className="text-h4">{t('accept.repair.title')}</h3>
              <p className="text-text-secondary">{t('accept.repair.body')}</p>
            </div>

            <div className="space-y-xs">
              <h3 className="text-h4">{t('accept.product.title')}</h3>
              <p className="text-text-secondary">{t('accept.product.body')}</p>
            </div>

            <div className="space-y-xs">
              <h3 className="text-h4">{t('accept.license.title')}</h3>
              <p className="text-text-secondary">{t('accept.license.body')}</p>
              <p className="text-text-secondary">{t.rich('accept.license.hosted', { strong })}</p>
              <p className="text-text-secondary">{t.rich('accept.license.referenced', { strong })}</p>
            </div>

            <div className="space-y-xs">
              <h3 className="text-h4">{t('accept.file.title')}</h3>
              <p className="text-text-secondary">{t('accept.file.body')}</p>
            </div>
          </section>

          <section className="space-y-sm">
            <h2 className="text-h3">{t('reject.title')}</h2>
            <ul className="list-disc space-y-xs pl-md text-text-secondary">
              <li>{t('reject.decorative')}</li>
              <li>{t('reject.tools')}</li>
              <li>{t('reject.noProduct')}</li>
              <li>{t('reject.forbiddenLicense')}</li>
              <li>{t.rich('reject.ncNd', { strong })}</li>
              <li>{t('reject.broken')}</li>
              <li>{t('reject.duplicate')}</li>
            </ul>
            <p className="text-text-secondary">{t('reject.variants')}</p>
          </section>

          <section className="space-y-sm">
            <h2 className="text-h3">{t('verification.title')}</h2>
            <p className="text-text-secondary">{t('verification.intro')}</p>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse border border-border-default">
                <thead>
                  <tr className="bg-bg-subtle">
                    <th className={HEADER_CELL_CLASS}>{t('verification.status')}</th>
                    <th className={HEADER_CELL_CLASS}>{t('verification.meaning')}</th>
                  </tr>
                </thead>
                <tbody>
                  {VERIFICATION_STATUSES.map((status) => (
                    <tr key={status}>
                      <td className={STATUS_CELL_CLASS}>{t(`verification.${status}.label`)}</td>
                      <td className={MEANING_CELL_CLASS}>{t(`verification.${status}.meaning`)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-sm">
            <h2 className="text-h3">{t('submit.title')}</h2>
            <p className="text-text-secondary">{t('submit.intro')}</p>

            <div className="space-y-xs">
              <h3 className="text-h4">{t('submit.original.title')}</h3>
              <p className="text-text-secondary">
                {t.rich('submit.original.body', {
                  publish: (chunks) => (
                    <Link href="/publish" className="underline" target="_blank" rel="noopener noreferrer">
                      {chunks}
                    </Link>
                  ),
                })}
              </p>
              <ol className="list-decimal space-y-xs pl-md text-text-secondary">
                <li>{t('submit.original.steps.identify')}</li>
                <li>{t('submit.original.steps.files')}</li>
                <li>{t('submit.original.steps.details')}</li>
                <li>{t('submit.original.steps.products')}</li>
                <li>{t('submit.original.steps.review')}</li>
              </ol>
              <p className="text-text-secondary">{t('submit.original.license')}</p>
              <p className="text-text-secondary">{t.rich('submit.original.badge', { strong })}</p>
            </div>

            <div className="space-y-xs">
              <h3 className="text-h4">{t('submit.elsewhere.title')}</h3>
              <p className="text-text-secondary">{t.rich('submit.elsewhere.body', { strong })}</p>
              <p className="text-text-secondary">{t('submit.elsewhere.start')}</p>
            </div>
          </section>

          <section className="space-y-sm">
            <h2 className="text-h3">{t('after.title')}</h2>
            <p className="text-text-secondary">{t('after.checks')}</p>
            <p className="text-text-secondary">{t('after.attribution')}</p>
          </section>

          <section className="space-y-sm">
            <h2 className="text-h3">{t('dataLicense.title')}</h2>
            <p className="text-text-secondary">
              {t.rich('dataLicense.body', {
                licenseName: DATA_LICENSE.name,
                shortName: DATA_LICENSE.shortName,
                attribution: DATA_LICENSE.attribution,
                license: (chunks) => (
                  <a href={DATA_LICENSE.url} className="underline">
                    {chunks}
                  </a>
                ),
                terms: (chunks) => (
                  <Link href={TERMS_LICENSES_SECTION_HREF} className="underline">
                    {chunks}
                  </Link>
                ),
              })}
            </p>
          </section>

          <section className="space-y-sm">
            <h2 className="text-h3">{t('questions.title')}</h2>
            <p className="text-text-secondary">
              {t.rich('questions.body', {
                email: CONTACT_EMAIL,
                mail: (chunks) => (
                  <Link href={`mailto:${CONTACT_EMAIL}`} className="underline">
                    {chunks}
                  </Link>
                ),
              })}
            </p>
          </section>
        </div>
      </Container>
    </Section>
  )
}
