import Link from 'next/link'
import { Container } from '@/components/layout/container'
import { Section } from '@/components/layout/section'

export const metadata = {
  title: 'Legal Notice',
  description: 'Legal Notice for Common Parts Access',
}

export default function LegalNoticePage() {
  return (
    <Section>
      <Container size="md">
        <div className="space-y-lg">
          <div>
            <h1 className="text-h1">Legal notice</h1>
            <p className="mt-md text-text-secondary">Common Parts Access</p>
          </div>

          <section className="space-y-sm">
            <h2 className="text-h3">1. Publisher</h2>
            <p className="text-text-secondary">
              Common Parts Access (accessible at access.commonparts.org) is published, in a non-professional capacity,
              by a private individual. As permitted by French law for non-professional publishers, the publisher&rsquo;s
              identification details have been provided to the hosting provider named below and are not disclosed on
              this site.
            </p>
            <p className="text-text-secondary">
              The publisher can be contacted at{' '}
              <a href="mailto:contact@commonparts.org" className="underline">
                contact@commonparts.org
              </a>
              .
            </p>
          </section>

          <section className="space-y-sm">
            <h2 className="text-h3">2. Hosting</h2>
            <h3 className="text-h4">2.1 Application hosting</h3>
            <p className="text-text-secondary">The application is hosted by:</p>
            <ul className="list-disc space-y-xs pl-md text-text-secondary">
              <li>Railway Corporation</li>
              <li>548 Market St PMB 68956, San Francisco, California 94104, United States</li>
              <li>Telephone: +1 415 707 7675</li>
            </ul>

            <h3 className="text-h4">2.2 Database and file storage</h3>
            <p className="text-text-secondary">The database and the stored files are provided by:</p>
            <ul className="list-disc space-y-xs pl-md text-text-secondary">
              <li>Supabase Pte. Ltd.</li>
              <li>65 Chulia Street, #38-02/03, OCBC Centre, Singapore 049513</li>
            </ul>
          </section>

          <section className="space-y-sm">
            <h2 className="text-h3">3. Intellectual property and licences</h2>
            <p className="text-text-secondary">
              The source code of the Common Parts Access platform is published under the MIT Licence. Each published
              part remains under the licence chosen by its author. The{' '}
              <Link href="/terms" className="underline">
                Terms of use
              </Link>{' '}
              describe these licences and the rights attached to them.
            </p>
          </section>

          <section className="space-y-sm">
            <h2 className="text-h3">4. Contact</h2>
            <p className="text-text-secondary">For any question regarding this legal notice:</p>
            <p className="text-text-secondary">
              <a href="mailto:contact@commonparts.org" className="underline">
                contact@commonparts.org
              </a>
            </p>
          </section>
        </div>
      </Container>
    </Section>
  )
}
