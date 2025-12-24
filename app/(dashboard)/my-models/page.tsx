import { DashboardShell } from "@/components/layout/dashboard-shell"
import { Grid } from "@/components/layout/grid"

export default function MyModelsPage() {
  return (
    <DashboardShell title="My Models" description="Manage your uploaded models and drafts.">
      <Grid columns={12}>
        <div className="col-span-12 rounded-lg border border-border-subtle bg-bg-surface p-lg text-text-secondary">
          My models view coming soon.
        </div>
      </Grid>
    </DashboardShell>
  )
}