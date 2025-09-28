export default function UserProfilePage({ params }: { params: { username: string } }) {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">@{params.username}</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-center">{params.username}</h2>
            <p className="text-gray-600 text-center">User profile information</p>
          </div>
        </div>
        <div className="lg:col-span-2">
          <p className="text-gray-600">User's models and activity will be displayed here</p>
        </div>
      </div>
    </div>
  )
}