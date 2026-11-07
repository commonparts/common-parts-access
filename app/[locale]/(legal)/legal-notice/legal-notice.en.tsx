import { Link } from '@/i18n/navigation'
import { DATA_LICENSE, TERMS_LICENSES_SECTION_HREF } from '@/lib/utils/licenses'

export default function LegalNoticeEn() {
  return (
    <>
      <section>
        <h2>1. Publisher</h2>
        <p>
          Common Parts Access (accessible at access.commonparts.org) is published, in a non-professional capacity, by a
          private individual. As permitted by French law for non-professional publishers, the publisher&rsquo;s
          identification details have been provided to the hosting provider named below and are not disclosed on this
          site.
        </p>
        <p>
          The publisher can be contacted at <a href="mailto:contact@commonparts.org">contact@commonparts.org</a>.
        </p>
      </section>

      <section>
        <h2>2. Hosting</h2>
        <h3>2.1 Application hosting</h3>
        <p>The application is hosted by:</p>
        <ul>
          <li>Railway Corporation</li>
          <li>548 Market St PMB 68956, San Francisco, California 94104, United States</li>
          <li>Telephone: +1 415 707 7675</li>
          <li>Email: team@railway.com</li>
        </ul>

        <h3>2.2 Database and file storage</h3>
        <p>The database and the stored files are provided by:</p>
        <ul>
          <li>Supabase Pte. Ltd.</li>
          <li>65 Chulia Street, #38-02/03, OCBC Centre, Singapore 049513</li>
          <li>Email: legal@supabase.com</li>
        </ul>
      </section>

      <section>
        <h2>3. Intellectual property and licences</h2>
        <p>
          The source code of the Common Parts Access platform is published under the MIT Licence. Each published part
          remains under the licence chosen by its author. The <Link href="/terms">Terms of use</Link> describe these
          licences and the rights attached to them.
        </p>
        <p>
          The index data created on Common Parts Access (products, product references, compatibilities between parts
          and products, structured fields written here, and aggregated print reports) is published under the{' '}
          <a href={DATA_LICENSE.url}>
            {DATA_LICENSE.name} licence ({DATA_LICENSE.shortName})
          </a>
          , with attribution to &ldquo;{DATA_LICENSE.attribution}&rdquo;, as set out in{' '}
          <Link href={TERMS_LICENSES_SECTION_HREF}>section 4.2 of the Terms of use</Link>. Content taken from the
          original publication of a referenced part and part files remain under the licence chosen by their author.
        </p>
      </section>

      <section>
        <h2>4. Contact</h2>
        <p>For any question regarding this legal notice:</p>
        <p>
          <a href="mailto:contact@commonparts.org">contact@commonparts.org</a>
        </p>
      </section>
    </>
  )
}
