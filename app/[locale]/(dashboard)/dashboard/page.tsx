import { DashboardShell } from "@/components/layout/dashboard-shell"
import { Grid } from "@/components/layout/grid"

export default function DashboardPage() {
  return (
    <DashboardShell title="Dashboard" description="Overview of your maker activity and insights.">
      <Grid columns={12}>
        <div className="col-span-12 rounded-lg border border-border-subtle bg-bg-surface p-lg text-text-secondary">
          Dashboard content coming soon.
        </div>
      </Grid>
    </DashboardShell>
  )
}