export default function ProductPage({ params }: { params: { slug: string } }) {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Product: {params.slug}</h1>
      <p className="text-gray-600">Product page content will be implemented here</p>
    </div>
  )
}