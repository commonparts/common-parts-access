import { getTranslations } from "next-intl/server"

export default async function AccountSettingsPage() {
  const t = await getTranslations('DashboardPages.account')
  return (
    <div>
      <h1 className="mb-md font-heading text-heading-md font-semibold text-text-primary">{t('title')}</h1>
      <div className="rounded-lg bg-bg-surface p-md shadow-surface">
        <p className="text-text-secondary">{t('comingSoon')}</p>
      </div>
    </div>
  )
}