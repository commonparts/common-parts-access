import { LegalPage, legalPageMetadata } from '@/components/legal/legal-page'
import PrivacyEn from './privacy.en'
import PrivacyFr from './privacy.fr'

export const generateMetadata = () => legalPageMetadata('privacy')

export default function PrivacyPage() {
  return <LegalPage page="privacy" content={{ en: PrivacyEn, fr: PrivacyFr }} />
}
