import Link from 'next/link'

import { StatusPage } from '@/components/layout/status-page'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <StatusPage
      eyebrow="Error 404"
      title="Page not found"
      description="The page you requested does not exist or is no longer available."
    >
      <Button asChild>
        <Link href="/">Return home</Link>
      </Button>
      <Button asChild variant="outline">
        <Link href="/browse">Browse parts</Link>
      </Button>
    </StatusPage>
  )
}
