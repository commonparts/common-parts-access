export default function AnalyticsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Model Analytics</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Total Views</h3>
          <p className="text-2xl font-bold text-blue-600">5,432</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Downloads</h3>
          <p className="text-2xl font-bold text-green-600">1,234</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Likes</h3>
          <p className="text-2xl font-bold text-red-600">567</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Comments</h3>
          <p className="text-2xl font-bold text-purple-600">89</p>
        </div>
      </div>
      <div className="bg-white p-6 rounded-lg shadow">
        <p className="text-gray-600">Detailed analytics charts will be displayed here</p>
      </div>
    </div>
  )
}