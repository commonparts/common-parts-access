export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">My Models</h3>
          <p className="text-2xl font-bold text-blue-600">12</p>
          <p className="text-gray-600">Published models</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Downloads</h3>
          <p className="text-2xl font-bold text-green-600">1,234</p>
          <p className="text-gray-600">Total downloads</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Likes</h3>
          <p className="text-2xl font-bold text-red-600">567</p>
          <p className="text-gray-600">Total likes</p>
        </div>
      </div>
    </div>
  )
}