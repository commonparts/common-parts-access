import Link from 'next/link'
import { Container } from '@/components/layout/container'
import { Section } from '@/components/layout/section'

export const metadata = {
  title: 'Contributing a part',
  description: 'How to contribute a part to the Common Parts Index',
}

export default function ContributingPage() {
  return (
    <Section>
      <Container size="md">
        <div className="space-y-lg">
          <div>
            <h1 className="text-h1">Contributing a part to the Common Parts Index</h1>
            <p className="mt-md text-text-secondary">
              The Common Parts Index is a public catalog of spare part models — curated, structured, and maintained
              to help people repair the objects they own. Anyone can contribute. Some parts are hosted directly on
              Common Parts; others are referenced here with a link to the original platform. This guide explains what
              we accept, how to submit, and what happens after.
            </p>
          </div>

          <section className="space-y-sm">
            <h2 className="text-h3">What we accept</h2>
            <p className="text-text-secondary">A part is eligible for the Index if it meets the following conditions.</p>

            <div className="space-y-xs">
              <h3 className="text-h4">It contributes to repairability.</h3>
              <p className="text-text-secondary">
                The part must serve a functional purpose in keeping an object in use — whether it replaces a broken
                component, reinforces a known weak point, or improves a design flaw that causes recurring failures.
                Purely decorative or cosmetic parts are not eligible. Aftermarket upgrades that genuinely improve
                longevity are welcome.
              </p>
            </div>

            <div className="space-y-xs">
              <h3 className="text-h4">It targets a real, identifiable product.</h3>
              <p className="text-text-secondary">
                The part must be associated with at least one commercial product — a known brand and a specific model
                or product range. Generic parts with no defined product target are not eligible for now. A part can be
                compatible with multiple products.
              </p>
            </div>

            <div className="space-y-xs">
              <h3 className="text-h4">It has a known license and identifiable author.</h3>
              <p className="text-text-secondary">
                The original model must be published under a known license and attributed to an identifiable author
                — a name or pseudonym with a link to the original publication. Anonymous republications without a
                traceable source are not accepted.
              </p>
              <p className="text-text-secondary">
                For <strong className="font-medium text-text-primary">hosted parts</strong> — where the file is
                stored and served directly by Common Parts — the license must be open: CC0, CC BY, CC BY-SA, MIT, or
                GPL. If you are the original author and the model has no license, you can declare one at submission.
              </p>
              <p className="text-text-secondary">
                For <strong className="font-medium text-text-primary">referenced parts</strong> — where the file
                stays on the original platform and we link to it — any license is accepted, including NC, ND, or
                proprietary licenses. Since Common Parts only links to the file and does not redistribute it, these
                restrictions do not apply.
              </p>
            </div>

            <div className="space-y-xs">
              <h3 className="text-h4">The file is usable.</h3>
              <p className="text-text-secondary">
                We accept STL, OBJ, STP, and STEP formats. The file must be openable and geometrically sound — not
                corrupted, not arbitrarily scaled. For referenced parts, the file must be accessible at the source
                URL at the time of submission.
              </p>
            </div>
          </section>

          <section className="space-y-sm">
            <h2 className="text-h3">What we do not accept</h2>
            <ul className="list-disc space-y-xs pl-md text-text-secondary">
              <li>Decorative or cosmetic parts with no repair function</li>
              <li>Repair tools (a tool that helps you repair something is not a spare part)</li>
              <li>Parts with no identifiable product target</li>
              <li>
                Models under CC NC or CC ND licenses <strong className="font-medium text-text-primary">hosted directly on Common Parts</strong> —
                these licenses are incompatible with file redistribution. They may still be added as referenced parts.
              </li>
              <li>Files that cannot be opened or are manifestly broken</li>
              <li>Verbatim republications of an already-indexed model from the same source with no added value</li>
            </ul>
            <p className="text-text-secondary">
              Multiple versions of the same part for the same product are welcome — different materials, different
              print settings, alternative designs. Variety is useful.
            </p>
          </section>

          <section className="space-y-sm">
            <h2 className="text-h3">Verification status</h2>
            <p className="text-text-secondary">
              Every part in the Index carries a verification status reflecting the level of evidence available.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse border border-border-default">
                <thead>
                  <tr className="bg-bg-subtle">
                    <th className="border border-border-default px-sm py-xs text-left text-body font-medium text-text-primary">
                      Status
                    </th>
                    <th className="border border-border-default px-sm py-xs text-left text-body font-medium text-text-primary">
                      What it means
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-border-default px-sm py-xs align-top text-body font-medium text-text-primary">
                      Unverified
                    </td>
                    <td className="border border-border-default px-sm py-xs text-text-secondary">
                      The file exists and meets our criteria, but no print confirmation is available yet
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-border-default px-sm py-xs align-top text-body font-medium text-text-primary">
                      Author-tested
                    </td>
                    <td className="border border-border-default px-sm py-xs text-text-secondary">
                      The original author confirmed the part was printed and fits
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-border-default px-sm py-xs align-top text-body font-medium text-text-primary">
                      Community-validated
                    </td>
                    <td className="border border-border-default px-sm py-xs text-text-secondary">
                      One or more independent users confirmed a successful print and fit
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-sm">
            <h2 className="text-h3">How to submit</h2>

            <div className="space-y-xs">
              <h3 className="text-h4">If you are publishing an original model you designed</h3>
              <ol className="list-decimal space-y-xs pl-md text-text-secondary">
                <li>
                  Upload your file via{' '}
                  <Link href="/upload" className="underline" target="_blank" rel="noopener noreferrer">
                    Common Parts Access
                  </Link>
                </li>
                <li>Declare the license you want to apply</li>
                <li>Fill in the product metadata and print settings</li>
                <li>If you have printed and tested the part yourself, mark it as author-tested</li>
              </ol>
            </div>

            <div className="space-y-xs">
              <h3 className="text-h4">If you are curating an open-license model from another platform</h3>
              <p className="text-text-secondary">
                Use this flow for models published under CC0, CC BY, CC BY-SA, MIT, or GPL. The file will be hosted
                on Common Parts.
              </p>
              <ol className="list-decimal space-y-xs pl-md text-text-secondary">
                <li>Find the original publication (Printables, Thingiverse, GitHub, etc.)</li>
                <li>Confirm the license is open (see above)</li>
                <li>
                  Submit via{' '}
                  <Link href="/upload" className="underline" target="_blank" rel="noopener noreferrer">
                    Common Parts Access
                  </Link>{' '}
                  — paste the source URL, select <em>Curated from an external source</em>, and choose{' '}
                  <em>Host file</em>
                </li>
                <li>Review the pre-filled fields and complete what is missing</li>
                <li>Add the product metadata: brand, model(s), and category</li>
                <li>Add print settings if you have them — infill, supports, recommended material</li>
              </ol>
            </div>

            <div className="space-y-xs">
              <h3 className="text-h4">If you are referencing a model published under a restrictive license</h3>
              <p className="text-text-secondary">
                Use this flow for models published under NC, ND, or other non-open licenses. The file stays on the
                original platform — Common Parts hosts the metadata and links to the source.
              </p>
              <ol className="list-decimal space-y-xs pl-md text-text-secondary">
                <li>Find the original publication and confirm it is publicly accessible</li>
                <li>
                  Submit via{' '}
                  <Link href="/upload" className="underline" target="_blank" rel="noopener noreferrer">
                    Common Parts Access
                  </Link>{' '}
                  — paste the source URL, select <em>Curated from an external source</em>, and choose{' '}
                  <em>Link to source</em>
                </li>
                <li>Review the pre-filled fields and complete what is missing</li>
                <li>Add the product metadata: brand, model(s), and category</li>
              </ol>
            </div>
          </section>

          <section className="space-y-sm">
            <h2 className="text-h3">After submission</h2>
            <p className="text-text-secondary">
              Once submitted, the part goes through a brief curation review. We check that all required fields are
              present, the license is valid, and the file is in order. Parts that pass review are published
              immediately. Parts with missing information are flagged — you will be able to see which fields need
              attention.
            </p>
            <p className="text-text-secondary">
              We do not modify your model or its metadata without contacting you. Attribution is permanent and public.
            </p>
          </section>

          <section className="space-y-sm">
            <h2 className="text-h3">Questions</h2>
            <p className="text-text-secondary">
              If you are unsure whether a part qualifies, or if you want to contribute in bulk (for example, as a
              Repair Café importing a set of validated models), contact us at{' '}
              <Link href="mailto:contact@commonparts.org" className="underline">
                contact@commonparts.org
              </Link>
              .
            </p>
          </section>
        </div>
      </Container>
    </Section>
  )
}
