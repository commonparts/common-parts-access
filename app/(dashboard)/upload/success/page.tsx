import Link from 'next/link'

interface SuccessPageProps {
  searchParams: {
    slug?: string
  }
}

export default function UploadSuccessPage({ searchParams }: SuccessPageProps) {
  const slug = searchParams.slug
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
          <h1 className="text-2xl font-semibold">Your model has been docked</h1>
          <p className="text-sm text-muted-foreground">
            Everything is saved. You can review the model details or share it with the community.
          </p>
        </div>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
          <Link
            href={viewHref}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            View model
          </Link>
          <Link
            href="/upload"
            className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            Upload another
          </Link>
        </div>
      </div>
    </div>
  )
}