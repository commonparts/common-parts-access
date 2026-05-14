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
            <p className="mt-md text-text-secondary">Common Parts Access</p>
          </div>

          <section className="space-y-sm">
            <h2 className="text-h3">1. Acceptance of Terms</h2>
            <p className="text-text-secondary">
              By accessing or using Common Parts Access (accessible at access.commonparts.org), you agree to be bound
              by these Terms of Use. If you do not agree to these terms, you may not use the service.
            </p>
            <p className="text-text-secondary">
              These Terms of Use apply to all users of Common Parts Access, including visitors who browse without an
              account and registered users who publish content.
            </p>
            <p className="text-text-secondary">
              Common Parts reserves the right to update these Terms at any time. Continued use of Common Parts Access
              after any modification constitutes acceptance of the updated terms. We will notify registered users of
              material changes by email.
            </p>
          </section>

          <section className="space-y-sm">
            <h2 className="text-h3">2. Description of the Service</h2>
            <p className="text-text-secondary">
              Common Parts Access is an open platform for publishing and accessing digital spare parts, operated as an
              official interface of the Common Parts Infrastructure.
            </p>
            <p className="text-text-secondary">In its current phase of development, Common Parts Access allows users to:</p>
            <ul className="list-disc space-y-xs pl-md text-text-secondary">
              <li>Browse and download digital spare part files (3D models in formats including STL, 3MF, and STEP)</li>
              <li>Publish original or openly licensed spare part models with associated metadata</li>
              <li>Contribute structured metadata to improve the discoverability and usability of published parts</li>
            </ul>
            <p className="text-text-secondary">
              Current status: Common Parts Access is an open platform, not a certified part distribution system. The
              Common Parts Secure Print Protocol (CPSP) and manufacturer certification features are in development and
              not yet available. No commercial transactions are processed through Common Parts Access at this time.
            </p>
          </section>

          <section className="space-y-sm">
            <h2 className="text-h3">3. User Accounts</h2>
            <h3 className="text-h4">3.1 Registration</h3>
            <p className="text-text-secondary">
              Creating an account requires a valid email address. You are responsible for maintaining the
              confidentiality of your credentials and for all activity that occurs under your account. You must notify
              Common Parts immediately at contact@commonparts.org if you suspect unauthorized use of your account.
            </p>
            <p className="text-text-secondary">
              You may not create an account on behalf of another person without their explicit consent, or use a false
              identity for the purpose of misleading other users.
            </p>

            <h3 className="text-h4">3.2 Account suspension and termination</h3>
            <p className="text-text-secondary">Common Parts reserves the right to suspend or permanently delete any account that:</p>
            <ul className="list-disc space-y-xs pl-md text-text-secondary">
              <li>Violates these Terms of Use</li>
              <li>Publishes content that infringes third-party rights</li>
              <li>Engages in abusive, fraudulent, or harmful conduct on the platform</li>
              <li>Has been inactive for more than 24 consecutive months, following prior notice by email</li>
            </ul>
            <p className="text-text-secondary">
              You may delete your account at any time through your account settings or by contacting
              contact@commonparts.org. Account deletion is subject to the data retention provisions described in the
              Privacy Policy.
            </p>
          </section>

          <section className="space-y-sm">
            <h2 className="text-h3">4. Publishing Content</h2>
            <h3 className="text-h4">4.1 Eligibility to publish</h3>
            <p className="text-text-secondary">
              To publish content on Common Parts Access, you must hold an account and comply with these Terms. By
              publishing a part, you represent and warrant that:
            </p>
            <ul className="list-disc space-y-xs pl-md text-text-secondary">
              <li>You are the original author of the file, or you hold sufficient rights to publish it under an open license</li>
              <li>
                The file does not reproduce proprietary designs protected by industrial property rights (patent,
                registered design right, copyright) without authorization from the rights holder
              </li>
              <li>
                The published content does not constitute counterfeiting, passing off, or any other form of
                intellectual property infringement
              </li>
              <li>The published content is accurate, complete, and safe for the stated intended use</li>
            </ul>
            <p className="text-text-secondary">
              Important: Publishing a spare part model that reproduces a design protected by a registered patent or
              design right without authorization from the manufacturer is an infringement of industrial property law.
              Common Parts does not verify the intellectual property status of submitted files. You bear full legal
              responsibility for the content you publish.
            </p>

            <h3 className="text-h4">4.2 Licensing of published content</h3>
            <p className="text-text-secondary">When publishing a file on Common Parts Access, you must select one of the following open licenses:</p>
            <ul className="list-disc space-y-xs pl-md text-text-secondary">
              <li>Creative Commons Attribution 4.0 International (CC BY 4.0)</li>
              <li>Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)</li>
              <li>Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)</li>
              <li>MIT Licence</li>
            </ul>
            <p className="text-text-secondary">
              By selecting a license, you grant Common Parts and all users of the platform the rights specified in
              that license with respect to the published file. You retain authorship and ownership of your work.
              Common Parts does not acquire any transfer of intellectual property rights over your content.
            </p>
            <p className="text-text-secondary">
              Metadata associated with published parts (title, description, category, material, print settings,
              dimensions) is published under the Creative Commons Zero (CC0) license and enters the public domain. By
              submitting metadata, you waive any related rights to the fullest extent permitted by applicable law.
            </p>

            <h3 className="text-h4">4.3 Licence granted to Common Parts</h3>
            <p className="text-text-secondary">
              By publishing content on Common Parts Access, you grant Common Parts a worldwide, royalty-free,
              non-exclusive license to host, display, index, distribute, and make available your published file and
              associated metadata, for the purpose of operating and improving the platform. This license persists for
              as long as the content remains published on the platform.
            </p>
            <p className="text-text-secondary">
              Common Parts will not use your content for purposes unrelated to the operation of the platform without
              your explicit consent.
            </p>

            <h3 className="text-h4">4.4 Attribution of curated content</h3>
            <p className="text-text-secondary">
              Common Parts Access may include parts curated from third-party open-source repositories (such as
              Printables, Thingiverse, and equivalent platforms). Such parts are published under their original
              license, with full attribution to the original author and a link to the original source. Common Parts
              does not modify the license of any file it does not author.
            </p>
          </section>

          <section className="space-y-sm">
            <h2 className="text-h3">5. Prohibited Conduct</h2>
            <p className="text-text-secondary">The following uses of Common Parts Access are strictly prohibited:</p>
            <ul className="list-disc space-y-xs pl-md text-text-secondary">
              <li>
                Publishing content that infringes patents, design rights, copyrights, or any other intellectual
                property right
              </li>
              <li>Publishing counterfeit, deceptive, or fraudulently labelled parts</li>
              <li>
                Publishing files that contain malicious code or that are designed to damage devices or infrastructure
              </li>
              <li>Publishing content that is unlawful, defamatory, obscene, or harmful</li>
              <li>
                Attempting to access, scrape, or extract platform data in ways that circumvent the public API or
                overload the platform infrastructure
              </li>
              <li>
                Using automated means to create accounts, publish content, or interact with the platform in a
                misleading way
              </li>
              <li>Impersonating any person, manufacturer, or institution</li>
              <li>
                Attempting to reverse-engineer, decompile, or interfere with the platform's technical infrastructure
              </li>
            </ul>
          </section>

          <section className="space-y-sm">
            <h2 className="text-h3">6. Intellectual Property</h2>
            <h3 className="text-h4">6.1 Common Parts platform</h3>
            <p className="text-text-secondary">
              The Common Parts Access platform - including its source code, interface design, typography, and visual
              identity - is published under the MIT Licence and is available at the official Common Parts GitHub
              repository.
            </p>
            <p className="text-text-secondary">
              The Common Parts name, symbol, and certification marks are protected. No license to use these marks is
              granted by these Terms. Use of Common Parts marks requires prior written authorization from Common Parts.
            </p>

            <h3 className="text-h4">6.2 User content</h3>
            <p className="text-text-secondary">
              Each published part belongs to its author, subject to the open license selected at the time of
              publication. Common Parts claims no ownership over user-published content.
            </p>

            <h3 className="text-h4">6.3 Third-party rights</h3>
            <p className="text-text-secondary">
              Common Parts does not verify whether published parts infringe third-party intellectual property rights. If
              you believe that content published on Common Parts Access infringes your rights, please contact
              contact@commonparts.org with a description of the content at issue, the nature of the claimed
              infringement, and your contact details. Common Parts will review the complaint and take appropriate
              action, which may include removing the content.
            </p>
          </section>

          <section className="space-y-sm">
            <h2 className="text-h3">7. Disclaimers and Limitation of Liability</h2>
            <h3 className="text-h4">7.1 No warranty on published parts</h3>
            <p className="text-text-secondary">
              Common Parts Access is a registry platform. It does not test, validate, or certify user-published parts
              unless explicitly indicated by a verification status. Parts marked as unverified have not been reviewed
              by Common Parts.
            </p>
            <p className="text-text-secondary">
              Common Parts makes no warranty, express or implied, as to the fitness, safety, dimensional accuracy, or
              printability of any part available on the platform. Users who download and manufacture parts do so at
              their own risk.
            </p>

            <h3 className="text-h4">7.2 Platform availability</h3>
            <p className="text-text-secondary">
              Common Parts Access is provided on an as-is and as-available basis. Common Parts does not warrant
              uninterrupted or error-free access to the platform. We reserve the right to suspend the service for
              maintenance, updates, or in response to security incidents, without prior notice where urgency requires.
            </p>

            <h3 className="text-h4">7.3 Limitation of liability</h3>
            <p className="text-text-secondary">
              To the maximum extent permitted by applicable law, Common Parts shall not be liable for any indirect,
              incidental, consequential, or punitive damages arising from use of or inability to use Common Parts
              Access, including damages arising from reliance on published parts, loss of data, or service
              interruption.
            </p>
            <p className="text-text-secondary">
              Common Parts' total aggregate liability for any claim arising under these Terms shall not exceed the
              amount paid by the user to Common Parts in the twelve months preceding the claim. As Common Parts Access
              is currently provided free of charge, this amount is zero.
            </p>
          </section>

          <section className="space-y-sm">
            <h2 className="text-h3">8. Third-Party Links and Content</h2>
            <p className="text-text-secondary">
              Common Parts Access may reference or link to third-party platforms (such as original source repositories
              for curated parts). These links are provided for attribution and convenience only. Common Parts is not
              responsible for the content, availability, or practices of third-party websites and does not endorse
              them.
            </p>
          </section>

          <section className="space-y-sm">
            <h2 className="text-h3">9. Modifications to the Service</h2>
            <p className="text-text-secondary">
              Common Parts reserves the right to modify, suspend, or discontinue any part of Common Parts Access at any
              time. We will provide reasonable advance notice of significant changes affecting registered users where
              practicable. Common Parts shall not be liable to you or any third party for any modification, suspension,
              or discontinuation of the service.
            </p>
          </section>

          <section className="space-y-sm">
            <h2 className="text-h3">10. Governing Law and Dispute Resolution</h2>
            <p className="text-text-secondary">
              These Terms of Use are governed by and construed in accordance with French law, without regard to its
              conflict of law provisions.
            </p>
            <p className="text-text-secondary">
              In the event of a dispute arising from these Terms or your use of Common Parts Access, the parties agree
              to first attempt to resolve the dispute informally by contacting contact@commonparts.org. If the dispute
              cannot be resolved within 30 days, it shall be submitted to the competent courts of France.
            </p>
            <p className="text-text-secondary">
              If you are a consumer resident in the European Union, you may also use the European Commission's Online
              Dispute Resolution platform at https://ec.europa.eu/consumers/odr.
            </p>
          </section>

          <section className="space-y-sm">
            <h2 className="text-h3">11. Miscellaneous</h2>
            <p className="text-text-secondary">
              If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions shall
              continue in full force and effect.
            </p>
            <p className="text-text-secondary">
              The failure of Common Parts to enforce any right or provision of these Terms shall not constitute a
              waiver of that right or provision.
            </p>
            <p className="text-text-secondary">
              These Terms, together with the Privacy Policy, constitute the entire agreement between you and Common
              Parts with respect to your use of Common Parts Access.
            </p>
          </section>

          <section className="space-y-sm">
            <h2 className="text-h3">12. Contact</h2>
            <p className="text-text-secondary">For any questions regarding these Terms of Use:</p>
            <p className="text-text-secondary">Common Parts</p>
            <p className="text-text-secondary">
              <a href="mailto:contact@commonparts.org" className="underline">
                contact@commonparts.org
              </a>
            </p>
            <p className="text-text-secondary">access.commonparts.org</p>
          </section>
        </div>
      </Container>
    </Section>
  )
}
