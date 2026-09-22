export default function UserPartsPage({ params }: { params: { username: string } }) {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">{params.username}&apos;s parts</h1>
      <p className="text-gray-600">User&apos;s parts will be displayed here</p>
    </div>
  )
}