import { LegalPage, legalPageMetadata } from '@/components/legal/legal-page'
import TermsEn from './terms.en'
import TermsFr from './terms.fr'

export const generateMetadata = () => legalPageMetadata('terms')

export default function TermsPage() {
  return <LegalPage page="terms" content={{ en: TermsEn, fr: TermsFr }} />
}
