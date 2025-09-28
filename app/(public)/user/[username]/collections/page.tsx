export default function UserCollectionsPage({ params }: { params: { username: string } }) {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">{params.username}'s Collections</h1>
      <p className="text-gray-600">User's collections will be displayed here</p>
    </div>
  )
}