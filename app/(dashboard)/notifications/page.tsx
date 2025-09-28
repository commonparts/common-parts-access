export default function NotificationsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Notifications</h1>
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Recent Notifications</h2>
            <button className="text-sm text-blue-600 hover:text-blue-800">Mark all as read</button>
          </div>
        </div>
        <div className="p-6">
          <p className="text-gray-600">Your notifications will be displayed here</p>
        </div>
      </div>
    </div>
  )
}