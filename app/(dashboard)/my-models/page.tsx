import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { Grid } from '@/components/layout/grid'
import { MyModelsList } from '@/components/dashboard/my-models-list'
import { fetchUserModels } from '@/lib/supabase/queries/model'

interface PageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function MyModelsPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam || '1'))

  const { models, pagination } = await fetchUserModels(user.id, {
    page,
    status: 'published',
  })

  return (
    <DashboardShell
      title="My Models"
      description="Manage your published parts."
    >
      <Grid columns={12}>
        <div className="col-span-12 space-y-md">
          <MyModelsList
            initialModels={models}
            hasNextPage={pagination.hasNext}
            currentPage={pagination.page}
          />
        </div>
      </Grid>
    </DashboardShell>
  )
}
