export default function CollectionsPage() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Collections</h1>
        <button className="bg-blue-500 text-white px-4 py-2 rounded">Create Collection</button>
      </div>
      <div className="bg-white p-6 rounded-lg shadow">
        <p className="text-gray-600">Your collections will be displayed here</p>
      </div>
    </div>
  )
}