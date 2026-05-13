import { Container } from '@/components/layout/container'
import { Section } from '@/components/layout/section'

export const metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for Common Parts Access',
}

export default function PrivacyPage() {
  return (
    <Section>
      <Container size="md">
        <div className="space-y-lg py-2xl">
          <div>
            <h1 className="text-h1">Privacy Policy</h1>
            <p className="mt-md text-text-secondary">
              Coming soon.
            </p>
          </div>
        </div>
      </Container>
    </Section>
  )
}
