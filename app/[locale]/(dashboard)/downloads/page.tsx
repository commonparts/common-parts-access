import { getTranslations } from "next-intl/server"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { Grid } from "@/components/layout/grid"

export default async function DownloadsPage() {
  const t = await getTranslations('DashboardPages.downloads')
  return (
    <DashboardShell title={t('title')} description={t('description')}>
      <Grid columns={12}>
        <div className="col-span-12 rounded-lg border border-border-subtle bg-bg-surface p-lg text-text-secondary">
          {t('comingSoon')}
        </div>
      </Grid>
    </DashboardShell>
  )
}