import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2 className="text-6xl font-bold mb-4">404</h2>
      <h3 className="text-2xl mb-4">Page Not Found</h3>
      <p className="mb-8 text-gray-600">Could not find the requested resource.</p>
      <Link 
        href="/"
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Return Home
      </Link>
    </div>
  )
}