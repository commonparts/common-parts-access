import { Container } from "@/components/layout/container"
import { Section } from "@/components/layout/section"
import { Input } from "@/components/ui/input"

export default function SearchPage() {
  return (
    <Section>
      <Container size="lg" className="space-y-md">
        <div className="space-y-xs">
          <h1 className="text-heading-md font-heading font-semibold text-text-primary">Search Results</h1>
          <p className="text-body text-text-secondary">Search results will be displayed here</p>
        </div>
        <Input type="search" placeholder="Search for 3D models..." />
      </Container>
    </Section>
  )
}