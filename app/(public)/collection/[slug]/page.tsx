import { Container } from "@/components/layout/container"
import { Section } from "@/components/layout/section"
import { notFoundUnlessSocialFeatures } from "@/lib/utils/feature-flags"

interface CollectionPageProps {
  params: Promise<{ slug: string }>
}

export default async function CollectionPage({ params }: CollectionPageProps) {
  notFoundUnlessSocialFeatures()
  const { slug } = await params

  return (
    <Section>
      <Container size="lg" className="space-y-sm">
        <h1 className="text-heading-md font-heading font-semibold text-text-primary">Collection: {slug}</h1>
        <p className="text-body text-text-secondary">Public collection content will be implemented here</p>
      </Container>
    </Section>
  )
}
