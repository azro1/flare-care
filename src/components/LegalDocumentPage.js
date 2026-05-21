'use client'

import Link from 'next/link'

/**
 * Renders privacy / terms content from src/content/legalDocuments.js.
 * @param {{ title: string, lastUpdated: string, intro?: string, sections: Array<{ id: string, title: string, paragraphs: string[] }>, footerNote?: string }} props
 */
export default function LegalDocumentPage({ title, lastUpdated, intro, sections, footerNote }) {
  return (
    <div className="w-full sm:px-4 md:px-6 min-w-0">
      <div className="max-w-3xl mx-auto py-6 sm:py-10">
        <header className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold font-title text-primary mb-2">{title}</h1>
          <p className="text-sm font-sans text-secondary">Last updated: {lastUpdated}</p>
          {intro ? (
            <p className="text-sm font-sans text-secondary leading-relaxed mt-4">{intro}</p>
          ) : null}
        </header>

        <div className="space-y-8">
          {sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <h2 className="text-lg sm:text-xl font-semibold font-title text-primary mb-3">{section.title}</h2>
              <div className="space-y-3 text-sm font-sans text-secondary leading-relaxed">
                {section.paragraphs.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        {footerNote ? (
          <p className="text-xs font-sans text-tertiary mt-10 pt-6 border-t border-[var(--card-border)] leading-relaxed">
            {footerNote}
          </p>
        ) : null}

        <p className="text-sm font-sans text-secondary mt-8">
          Questions?{' '}
          <a href="mailto:support@flarecare.app" className="text-[#5F9EA0] hover:underline">
            support@flarecare.app
          </a>
          {' · '}
          <Link href="/privacy" className="text-[#5F9EA0] hover:underline">
            Privacy
          </Link>
          {' · '}
          <Link href="/terms" className="text-[#5F9EA0] hover:underline">
            Terms
          </Link>
        </p>
      </div>
    </div>
  )
}
