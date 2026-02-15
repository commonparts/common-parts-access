import { DashboardShell } from "@/components/layout/dashboard-shell"
import { Grid } from "@/components/layout/grid"

export default function LikesPage() {
  return (
    <DashboardShell title="Likes" description="Models you have liked across Common Parts Access.">
      <Grid columns={12}>
        <div className="col-span-12 rounded-lg border border-border-subtle bg-bg-surface p-lg text-text-secondary">
          Likes view coming soon.
        </div>
      </Grid>
    </DashboardShell>
  )
}