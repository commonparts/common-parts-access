'use client'

import Link from 'next/link'
import { useEffect } from 'react'

import { StatusPage } from '@/components/layout/status-page'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <StatusPage
      eyebrow="Error"
      title="Something went wrong"
      description="This page could not be loaded. Try again, or return to the home page."
    >
      <Button onClick={() => reset()}>Try again</Button>
      <Button asChild variant="outline">
        <Link href="/">Return home</Link>
      </Button>
    </StatusPage>
  )
}
