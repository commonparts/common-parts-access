import { Container } from '@/components/layout/container'
import { Section } from '@/components/layout/section'

export const metadata = {
  title: 'Terms of Use',
  description: 'Terms of Use for Common Parts Access',
}

export default function TermsPage() {
  return (
    <Section>
      <Container size="md">
        <div className="space-y-lg">
          <div>
            <h1 className="text-h1">Terms of Use</h1>
            <p className="mt-md text-text-secondary">
              Coming soon.
            </p>
          </div>
        </div>
      </Container>
    </Section>
  )
}
