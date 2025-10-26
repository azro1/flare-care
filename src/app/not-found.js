'use client'

import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6">
      <div className="text-center max-w-md mx-auto">
        <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-secondary mb-4">Page not found</h2>
        <p className="text-tertiary mb-8 leading-relaxed">
          Sorry, we couldn't find the page you're looking for. It might have been moved or doesn't exist.
        </p>
        <Link 
          href="/"
          className="button-cadet font-bold py-2.5 px-8 rounded-lg hover:shadow-lg inline-block text-lg"
        >
          Go back home
        </Link>
      </div>
    </div>
  )
}

