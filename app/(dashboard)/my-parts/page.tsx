import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { Grid } from '@/components/layout/grid'
import { MyPartsList } from '@/components/dashboard/my-parts-list'
import { fetchUserModels } from '@/lib/supabase/queries/model'

interface PageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function MyPartsPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { page: pageParam } = await searchParams
  const rawPage = parseInt(pageParam || '1', 10)
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1

  const { models, pagination } = await fetchUserModels(user.id, {
    page,
    status: 'published',
  })

  return (
    <DashboardShell
      title="My parts"
      description="Manage your published parts."
    >
      <Grid columns={12}>
        <div className="col-span-12 space-y-md">
          <MyPartsList
            initialModels={models}
            hasNextPage={pagination.hasNext}
            currentPage={pagination.page}
          />
        </div>
      </Grid>
    </DashboardShell>
  )
}
