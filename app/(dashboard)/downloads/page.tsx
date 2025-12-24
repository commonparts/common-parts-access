import { DashboardShell } from "@/components/layout/dashboard-shell"
import { Grid } from "@/components/layout/grid"

export default function DownloadsPage() {
  return (
    <DashboardShell title="Downloads" description="See the parts you have downloaded and track activity.">
      <Grid columns={12}>
        <div className="col-span-12 rounded-lg border border-border-subtle bg-bg-surface p-lg text-text-secondary">
          Downloads view coming soon.
        </div>
      </Grid>
    </DashboardShell>
  )
}