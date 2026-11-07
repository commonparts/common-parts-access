// Scoped to the dashboard on purpose: a loading boundary above the public
// pages would stream them with HTTP 200 before notFound() runs (#275).
export default function Loading() {
  return (
    <div className="flex items-center justify-center py-2xl">
      <div className="size-xl animate-spin rounded-full border-b-2 border-border-strong" />
    </div>
  )
}
