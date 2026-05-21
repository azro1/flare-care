import LegalDocumentPage from '@/components/LegalDocumentPage'
import { LEGAL_FOOTER_NOTE, LEGAL_LAST_UPDATED, PRIVACY_INTRO, PRIVACY_SECTIONS } from '@/content/legalDocuments'

export const metadata = {
  title: 'Privacy Policy | FlareCare',
  description: 'How FlareCare collects, uses, and protects your personal and health-related data.',
}

export default function PrivacyPage() {
  return (
    <LegalDocumentPage
      title="Privacy Policy"
      lastUpdated={LEGAL_LAST_UPDATED}
      intro={PRIVACY_INTRO}
      sections={PRIVACY_SECTIONS}
      footerNote={LEGAL_FOOTER_NOTE}
    />
  )
}
