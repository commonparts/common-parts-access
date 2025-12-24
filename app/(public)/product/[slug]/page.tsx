import { Container } from "@/components/layout/container"
import { Section } from "@/components/layout/section"

export default function ProductPage({ params }: { params: { slug: string } }) {
  return (
    <Section>
      <Container size="lg" className="space-y-sm">
        <h1 className="text-heading-md font-heading font-semibold text-text-primary">Product: {params.slug}</h1>
        <p className="text-body text-text-secondary">Product page content will be implemented here</p>
      </Container>
    </Section>
  )
}