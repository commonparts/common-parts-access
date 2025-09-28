export default function MyModelsPage() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Models</h1>
        <button className="bg-blue-500 text-white px-4 py-2 rounded">Upload New Model</button>
      </div>
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <a href="/my-models" className="border-b-2 border-blue-500 py-2 px-4 text-sm font-medium text-blue-600">All</a>
            <a href="/my-models/published" className="border-b-2 border-transparent py-2 px-4 text-sm font-medium text-gray-500 hover:text-gray-700">Published</a>
            <a href="/my-models/drafts" className="border-b-2 border-transparent py-2 px-4 text-sm font-medium text-gray-500 hover:text-gray-700">Drafts</a>
            <a href="/my-models/analytics" className="border-b-2 border-transparent py-2 px-4 text-sm font-medium text-gray-500 hover:text-gray-700">Analytics</a>
          </nav>
        </div>
        <div className="p-6">
          <p className="text-gray-600">Your models will be displayed here</p>
        </div>
      </div>
    </div>
  )
}