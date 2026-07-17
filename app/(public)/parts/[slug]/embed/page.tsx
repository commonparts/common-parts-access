export default function ModelEmbedPage({ params }: { params: { slug: string } }) {
  return (
    <div className="h-screen w-full bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Embedded Model: {params.slug}</h1>
        <p className="text-gray-600">Embeddable model viewer will be implemented here</p>
      </div>
    </div>
  )
}