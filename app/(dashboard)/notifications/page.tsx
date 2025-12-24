import { DashboardShell } from "@/components/layout/dashboard-shell"
import { Grid } from "@/components/layout/grid"

export default function NotificationsPage() {
  return (
    <DashboardShell title="Notifications" description="Stay updated on model activity and messages.">
      <Grid columns={12}>
        <div className="col-span-12 rounded-lg border border-border-subtle bg-bg-surface p-lg text-text-secondary">
          Notifications view coming soon.
        </div>
      </Grid>
    </DashboardShell>
  )
}