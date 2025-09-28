export default function UploadSuccessPage() {
  return (
    <div className="text-center">
      <h1 className="text-3xl font-bold mb-6 text-green-600">Upload Successful!</h1>
      <div className="bg-white p-6 rounded-lg shadow inline-block">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <p className="text-gray-600 mb-4">Your model has been uploaded successfully!</p>
        <div className="space-x-4">
          <button className="bg-blue-500 text-white px-4 py-2 rounded">View Model</button>
          <button className="bg-gray-500 text-white px-4 py-2 rounded">Upload Another</button>
        </div>
      </div>
    </div>
  )
}