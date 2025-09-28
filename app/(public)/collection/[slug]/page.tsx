export default function CollectionPage({ params }: { params: { slug: string } }) {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Collection: {params.slug}</h1>
      <p className="text-gray-600">Public collection content will be implemented here</p>
    </div>
  )
}