import { LegalPage, legalPageMetadata } from '@/components/legal/legal-page'
import LegalNoticeEn from './legal-notice.en'
import LegalNoticeFr from './legal-notice.fr'

export const generateMetadata = () => legalPageMetadata('legalNotice')

export default function LegalNoticePage() {
  return <LegalPage page="legalNotice" content={{ en: LegalNoticeEn, fr: LegalNoticeFr }} />
}
