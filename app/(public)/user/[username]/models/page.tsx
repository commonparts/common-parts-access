export default function UserModelsPage({ params }: { params: { username: string } }) {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">{params.username}'s Models</h1>
      <p className="text-gray-600">User's models will be displayed here</p>
    </div>
  )
}