'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PartDetails } from '@/components/part/part-details'
import { DATA_LICENSE, TERMS_LICENSES_SECTION_HREF } from '@/lib/utils/licenses'
import { PUBLISH_STEP_NAMES, type PublishBlocker, type PublishStepIndex } from '@/lib/publish/steps'

interface ReviewStepProps {
  /** The draft's slug — the preview renders the real part page against it. */
  slug: string
  /**
   * Unmet conditions mirrored locally, so a blocked publish is explained
   * before the round trip. The server-side gate stays the authority.
   */
  blockers: readonly PublishBlocker[]
  /** Blockers returned by the gate's 422, when one came back. */
  serverBlockers: readonly string[]
  publishing: boolean
  saving: boolean
  onBack: () => void
  onSaveAsDraft: () => void
  onPublish: () => void
  onJumpTo: (step: PublishStepIndex) => void
  /** Track-specific additions above the publish button. */
  children?: React.ReactNode
}

/**
 * The Review step, shared by both tracks (issue #302): the real part page
 * rendered against the draft, the data license notice, then publish or save
 * for later.
 */
export function ReviewStep({
  slug,
  blockers,
  serverBlockers,
  publishing,
  saving,
  onBack,
  onSaveAsDraft,
  onPublish,
  onJumpTo,
  children,
}: ReviewStepProps) {
  const t = useTranslations('ReviewStep')
  const steps = useTranslations('PublishSteps')
  const reasons = useTranslations('PublishBlockers')
  const criteria = useTranslations('CurationCriteria')
  return (
    <div className="space-y-md">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <PartDetails slug={slug} />
        </CardContent>
      </Card>

      {children}

      {serverBlockers.length > 0 && (
        <Alert>
          <p className="font-medium">{t('blocked')}</p>
          <ul className="mt-2xs list-disc pl-md">
            {serverBlockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        </Alert>
      )}

      {blockers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('stillNeeded')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2xs">
              {blockers.map((blocker) => (
                <li
                  key={`${blocker.step}-${blocker.reason}-${blocker.criterion}`}
                  className="flex flex-wrap items-center justify-between gap-2xs"
                >
                  <span className="text-sm text-text-primary">
                    {blocker.criterion
                      ? reasons('criterion', { criterion: criteria(`${blocker.criterion}.label`) })
                      : reasons(blocker.reason)}
                  </span>
                  <Button variant="link" onClick={() => onJumpTo(blocker.step)}>
                    {steps('goTo', { step: steps(PUBLISH_STEP_NAMES[blocker.step]) })}
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Data license notice (#476): what the contributor writes here is index
          data under CC BY-SA 4.0; files and source content keep their own. */}
      <p className="text-sm text-text-secondary">
        {t.rich('dataLicense', {
          license: DATA_LICENSE.shortName,
          licenseLink: (chunks) => (
            <a href={DATA_LICENSE.url} className="underline" target="_blank" rel="noopener noreferrer">
              {chunks}
            </a>
          ),
          terms: (chunks) => (
            <Link href={TERMS_LICENSES_SECTION_HREF} className="underline" target="_blank" rel="noopener noreferrer">
              {chunks}
            </Link>
          ),
        })}
      </p>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={saving || publishing}>
          {t('back')}
        </Button>
        <div className="flex gap-sm">
          <Button variant="ghost" onClick={onSaveAsDraft} disabled={saving || publishing}>
            {t('saveAsDraft')}
          </Button>
          <Button onClick={onPublish} disabled={publishing || saving || blockers.length > 0}>
            {publishing ? t('publishing') : t('publish')}
          </Button>
        </div>
      </div>
    </div>
  )
}
