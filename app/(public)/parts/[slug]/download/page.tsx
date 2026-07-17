export default function ModelDownloadPage({ params }: { params: { slug: string } }) {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Download Model: {params.slug}</h1>
      <p className="text-gray-600">Download handling will be implemented here</p>
    </div>
  )
}