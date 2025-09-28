export default function CategoryPage({ params }: { params: { slug: string } }) {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Category: {params.slug}</h1>
      <p className="text-gray-600">Models in {params.slug} category will be displayed here</p>
    </div>
  )
}