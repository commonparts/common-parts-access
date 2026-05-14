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
        <div className="space-y-lg">
          <div>
            <h1 className="text-h1">Privacy Policy</h1>
            <p className="mt-md text-text-secondary">Common Parts Access</p>
          </div>

          <section className="space-y-sm">
            <h2 className="text-h3">1. Introduction</h2>
            <p className="text-text-secondary">
              Common Parts Access (accessible at access.commonparts.org) is an open platform for publishing and
              accessing digital spare parts. It is an official interface of the Common Parts Infrastructure.
            </p>
            <p className="text-text-secondary">
              This Privacy Policy explains what personal data is collected when you use Common Parts Access, how it is
              used, and what rights you have regarding your data.
            </p>
            <p className="text-text-secondary">
              Common Parts acts as the data controller for all personal data processed through Common Parts Access. You
              may contact us at any time at contact@commonparts.org.
            </p>
          </section>

          <section className="space-y-sm">
            <h2 className="text-h3">2. Data Controller</h2>
            <p className="text-text-secondary">Common Parts</p>
            <p className="text-text-secondary">contact@commonparts.org</p>
            <p className="text-text-secondary">access.commonparts.org</p>
            <p className="text-text-secondary">
              As Common Parts is currently operating as an unincorporated project, the natural person responsible for
              data processing may be identified upon request via the contact address above.
            </p>
          </section>

          <section className="space-y-sm">
            <h2 className="text-h3">3. Data We Collect</h2>
            <h3 className="text-h4">3.1 Account data</h3>
            <p className="text-text-secondary">When you create an account on Common Parts Access, we collect:</p>
            <ul className="list-disc space-y-xs pl-md text-text-secondary">
              <li>Email address</li>
              <li>Username and display name (as provided by you)</li>
              <li>Password (stored in hashed form - we never store your password in plain text)</li>
              <li>Profile information you choose to add (bio, avatar)</li>
            </ul>

            <h3 className="text-h4">3.2 Content data</h3>
            <p className="text-text-secondary">When you publish spare parts or other content to the platform, we collect:</p>
            <ul className="list-disc space-y-xs pl-md text-text-secondary">
              <li>3D model files and associated metadata (title, description, material, print settings)</li>
              <li>Tags, categories, and other classification data you provide</li>
            </ul>

            <h3 className="text-h4">3.3 Usage data</h3>
            <p className="text-text-secondary">When you use Common Parts Access, we automatically record:</p>
            <ul className="list-disc space-y-xs pl-md text-text-secondary">
              <li>Downloads and views associated with your account</li>
              <li>Collections and likes you create</li>
              <li>Date and time of actions performed on the platform</li>
            </ul>

            <h3 className="text-h4">3.4 Technical data</h3>
            <p className="text-text-secondary">For technical operation of the service, we process:</p>
            <ul className="list-disc space-y-xs pl-md text-text-secondary">
              <li>Session data stored in cookies (see Section 5)</li>
              <li>IP address (processed transiently by our infrastructure - not stored in application logs)</li>
            </ul>
          </section>

          <section className="space-y-sm">
            <h2 className="text-h3">4. Legal Basis and Purpose</h2>
            <p className="text-text-secondary">
              We process your personal data on the following legal bases under the General Data Protection Regulation
              (GDPR):
            </p>
            <ul className="list-disc space-y-xs pl-md text-text-secondary">
              <li>
                Performance of a contract (Art. 6(1)(b) GDPR): account creation, authentication, and delivery of the
                services you request.
              </li>
              <li>
                Legitimate interests (Art. 6(1)(f) GDPR): maintaining security and integrity of the platform,
                preventing abuse.
              </li>
              <li>
                Consent (Art. 6(1)(a) GDPR): where we ask for your explicit agreement, such as for optional profile
                information.
              </li>
            </ul>
          </section>

          <section className="space-y-sm">
            <h2 className="text-h3">5. Cookies</h2>
            <p className="text-text-secondary">
              Common Parts Access uses cookies strictly for authentication and session management. No advertising,
              tracking, or analytics cookies are used.
            </p>
            <ul className="list-disc space-y-xs pl-md text-text-secondary">
              <li>Cookie name: Supabase authentication token cookie (sb-*-auth-token pattern)</li>
              <li>Purpose: Stores your authenticated session to keep you logged in.</li>
              <li>Type: Strictly necessary. This cookie is essential for the service to function and does not require your consent.</li>
              <li>Provider: Supabase, Inc. (our authentication infrastructure provider).</li>
              <li>Duration: Session and short-term persistence (expires upon logout or session timeout).</li>
            </ul>
            <p className="text-text-secondary">
              You may delete cookies at any time through your browser settings. Doing so will log you out of your
              account.
            </p>
          </section>

          <section className="space-y-sm">
            <h2 className="text-h3">6. Third-Party Processors</h2>
            <p className="text-text-secondary">
              We use the following sub-processors to operate Common Parts Access.
            </p>
            <ul className="list-disc space-y-xs pl-md text-text-secondary">
              <li>
                Supabase, Inc. - Database, authentication, and file storage infrastructure. Supabase is SOC 2 Type II certified.
              </li>
            </ul>
            <p className="text-text-secondary">
              We do not sell, rent, or share your personal data with any third party for marketing or advertising
              purposes.
            </p>
          </section>

          <section className="space-y-sm">
            <h2 className="text-h3">7. Data Retention</h2>
            <p className="text-text-secondary">
              We retain your personal data for as long as your account remains active. If you delete your account, your
              personal data will be deleted within 30 days, except where retention is required by law or necessary to
              resolve disputes.
            </p>
            <p className="text-text-secondary">
              Content you have published to the platform (spare part models and associated metadata) may remain
              available after account deletion if other users have downloaded or referenced it, unless you request full
              removal.
            </p>
          </section>

          <section className="space-y-sm">
            <h2 className="text-h3">8. Your Rights</h2>
            <p className="text-text-secondary">Under the GDPR, you have the following rights regarding your personal data:</p>
            <ul className="list-disc space-y-xs pl-md text-text-secondary">
              <li>Right of access: obtain a copy of the personal data we hold about you.</li>
              <li>Right to rectification: correct inaccurate or incomplete data.</li>
              <li>
                Right to erasure: request deletion of your personal data (subject to legal retention obligations).
              </li>
              <li>Right to restriction: request that we limit processing of your data.</li>
              <li>Right to data portability: receive your data in a structured, machine-readable format.</li>
              <li>Right to object: object to processing based on legitimate interests.</li>
              <li>
                Right to withdraw consent: where processing is based on consent, withdraw it at any time without
                affecting prior processing.
              </li>
            </ul>
            <p className="text-text-secondary">
              To exercise any of these rights, contact us at contact@commonparts.org. We will respond within 30 days.
              If you believe your rights have not been respected, you have the right to lodge a complaint with your
              national data protection authority (in France: the CNIL - www.cnil.fr).
            </p>
          </section>

          <section className="space-y-sm">
            <h2 className="text-h3">9. Security</h2>
            <p className="text-text-secondary">
              Common Parts Access implements industry-standard security measures, including encrypted data transmission
              (TLS), hashed password storage, and session-based authentication managed by Supabase. No system is fully
              secure; we encourage you to use a strong, unique password for your account.
            </p>
          </section>

          <section className="space-y-sm">
            <h2 className="text-h3">10. Minors</h2>
            <p className="text-text-secondary">
              Common Parts Access is not directed at children under the age of 16. We do not knowingly collect personal
              data from minors. If you believe a minor has created an account, please contact us at
              contact@commonparts.org and we will delete the account promptly.
            </p>
          </section>

          <section className="space-y-sm">
            <h2 className="text-h3">11. Changes to This Policy</h2>
            <p className="text-text-secondary">
              We may update this Privacy Policy from time to time. When we do, the effective date at the top of this
              document will be updated. If changes are material, we will notify registered users by email. Continued
              use of Common Parts Access after any change constitutes acceptance of the updated policy.
            </p>
          </section>

          <section className="space-y-sm">
            <h2 className="text-h3">12. Contact</h2>
            <p className="text-text-secondary">
              For any questions, requests, or concerns regarding this Privacy Policy or the processing of your personal
              data:
            </p>
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
