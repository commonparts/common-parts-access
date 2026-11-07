import { getTranslations } from "next-intl/server"

export default async function ProfileSettingsPage() {
  const t = await getTranslations('DashboardPages.profile')
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">{t('title')}</h1>
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <p className="text-gray-600">{t('comingSoon')}</p>
      </div>
    </div>
  )
}