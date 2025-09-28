export default function SearchPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Search Results</h1>
      <div className="mb-6">
        <input 
          type="search" 
          placeholder="Search for 3D models..." 
          className="w-full p-3 border border-gray-300 rounded-lg"
        />
      </div>
      <p className="text-gray-600">Search results will be displayed here</p>
    </div>
  )
}