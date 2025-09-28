export default function DownloadsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Download History</h1>
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div className="flex space-x-4">
              <select className="border border-gray-300 rounded px-3 py-2">
                <option>All Time</option>
                <option>Last 7 days</option>
                <option>Last 30 days</option>
              </select>
              <input type="search" placeholder="Search downloads..." className="border border-gray-300 rounded px-3 py-2" />
            </div>
          </div>
        </div>
        <div className="p-6">
          <p className="text-gray-600">Your download history will be displayed here</p>
        </div>
      </div>
    </div>
  )
}