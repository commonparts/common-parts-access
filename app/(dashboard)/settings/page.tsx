import { DashboardShell } from "@/components/layout/dashboard-shell"
import { Grid } from "@/components/layout/grid"

export default function SettingsPage() {
  return (
    <DashboardShell title="Settings" description="Update your account and preferences.">
      <Grid columns={12}>
        <div className="col-span-12 rounded-lg border border-border-subtle bg-bg-surface p-lg text-text-secondary">
          Settings view coming soon.
        </div>
      </Grid>
    </DashboardShell>
  )
}