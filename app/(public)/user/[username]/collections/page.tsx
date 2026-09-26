import { notFoundUnlessSocialFeatures } from "@/lib/utils/feature-flags"

interface UserCollectionsPageProps {
  params: Promise<{ username: string }>
}

export default async function UserCollectionsPage({ params }: UserCollectionsPageProps) {
  notFoundUnlessSocialFeatures()
  const { username } = await params

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">{username}&apos;s Collections</h1>
      <p className="text-gray-600">User&apos;s collections will be displayed here</p>
    </div>
  )
}
