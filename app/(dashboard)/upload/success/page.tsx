import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface SuccessPageProps {
  searchParams: Promise<{
    slug?: string
  }>
}

export default async function UploadSuccessPage({ searchParams }: SuccessPageProps) {
  const { slug } = await searchParams
  const viewHref = slug ? `/model/${slug}` : '/browse'

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-xl border bg-card p-8 shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <div className="mt-6 space-y-2 text-center">
          <h1 className="text-2xl font-semibold">Your model has been uploaded</h1>
          <p className="text-sm text-muted-foreground">
            Everything is saved. You can review the model details or share it with the community.
          </p>
        </div>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
          <Button asChild className="w-full sm:w-auto">
            <Link href={viewHref}>
              View model
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/upload">
              Upload another
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}