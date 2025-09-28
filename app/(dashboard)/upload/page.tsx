export default function UploadPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Upload Model</h1>
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
          <p className="text-gray-600 mb-4">Drag and drop your 3D model files here</p>
          <button className="bg-blue-500 text-white px-4 py-2 rounded">Choose Files</button>
        </div>
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Model Title
          </label>
          <input type="text" className="w-full p-3 border border-gray-300 rounded-lg" />
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea rows={4} className="w-full p-3 border border-gray-300 rounded-lg"></textarea>
        </div>
      </div>
    </div>
  )
}