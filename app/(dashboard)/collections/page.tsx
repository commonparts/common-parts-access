import { DashboardShell } from "@/components/layout/dashboard-shell"
import { Grid } from "@/components/layout/grid"

export default function CollectionsPage() {
  return (
    <DashboardShell title="Collections" description="Manage and organize your saved part collections.">
      <Grid columns={12}>
        <div className="col-span-12 rounded-lg border border-border-subtle bg-bg-surface p-lg text-text-secondary">
          Collections view coming soon.
        </div>
      </Grid>
    </DashboardShell>
  )
}