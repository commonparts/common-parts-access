import { Container } from "@/components/layout/container"
import { Section } from "@/components/layout/section"
import { Grid } from "@/components/layout/grid"

export default function UserProfilePage({ params }: { params: { username: string } }) {
  return (
    <Section>
      <Container size="xl" className="space-y-md">
        <h1 className="text-heading-md font-heading font-semibold text-text-primary">@{params.username}</h1>
        <Grid columns={12} className="gap-lg">
          <div className="col-span-12 md:col-span-4">
            <div className="rounded-lg border border-border-subtle bg-bg-surface p-lg shadow-surface">
              <div className="mx-auto mb-sm h-24 w-24 rounded-full bg-border-subtle" />
              <h2 className="text-heading-sm font-semibold text-center text-text-primary">{params.username}</h2>
              <p className="text-body text-text-secondary text-center">User profile information</p>
            </div>
          </div>
          <div className="col-span-12 md:col-span-8">
            <p className="text-body text-text-secondary">User&apos;s models and activity will be displayed here</p>
          </div>
        </Grid>
      </Container>
    </Section>
  )
}