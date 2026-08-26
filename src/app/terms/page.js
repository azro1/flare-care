import LegalDocumentPage from '@/components/LegalDocumentPage'
import { LEGAL_FOOTER_NOTE, LEGAL_LAST_UPDATED, TERMS_INTRO, TERMS_SECTIONS } from '@/content/legalDocuments'

export const metadata = {
  title: 'Terms of Use | Flarecare',
  description: 'Terms of Use for the Flarecare health logging app and website.',
}

export default function TermsPage() {
  return (
    <LegalDocumentPage
      title="Terms of Use"
      lastUpdated={LEGAL_LAST_UPDATED}
      intro={TERMS_INTRO}
      sections={TERMS_SECTIONS}
      footerNote={LEGAL_FOOTER_NOTE}
    />
  )
}
