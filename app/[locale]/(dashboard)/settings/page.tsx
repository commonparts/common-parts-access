import { getTranslations } from "next-intl/server"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { Grid } from "@/components/layout/grid"
import { SignOutEverywhere } from "@/components/auth/sign-out-everywhere"

export default async function SettingsPage() {
  const t = await getTranslations('DashboardPages.settings')
  return (
    <DashboardShell title={t('title')} description={t('description')}>
      <Grid columns={12}>
        <div className="col-span-12 rounded-lg border border-border-subtle bg-bg-surface p-lg text-text-secondary">
          <SignOutEverywhere />
        </div>
      </Grid>
    </DashboardShell>
  )
}