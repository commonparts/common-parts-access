import { notFound } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { EditPublishedPartForm } from '@/components/dashboard/edit-published-part-form'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { redirect } from '@/i18n/navigation'
import { getPublishedPartForEdit } from '@/lib/supabase/queries/part-edit'
import { createClient } from '@/lib/supabase/server'
import { isValidSlug } from '@/lib/utils/slug'

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function EditPublishedPartPage({ params }: PageProps) {
  const { slug } = await params
  if (!isValidSlug(slug)) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirect({ href: '/login', locale: await getLocale() })

  const [part, t] = await Promise.all([
    getPublishedPartForEdit(supabase, slug, user.id),
    getTranslations('EditPublishedPart'),
  ])
  if (!part) notFound()

  return (
    <DashboardShell title={t('title')}>
      <EditPublishedPartForm part={part} userId={user.id} />
    </DashboardShell>
  )
}
