'use client'

import Link from 'next/link'
import { useEffect } from 'react'

export default function NotFound() {
  useEffect(() => {
    document.documentElement.classList.add('is-404')
    // Lock scroll similar to wizard landing pages
    document.body.style.position = 'fixed'
    document.body.style.width = '100%'
    document.body.style.height = '100%'
    document.body.style.backgroundColor = 'transparent'
    document.documentElement.style.background = '#1a1d24'
    document.documentElement.style.height = '100%'
    return () => {
      document.documentElement.classList.remove('is-404')
      document.body.style.position = 'static'
      document.body.style.width = 'auto'
      document.body.style.height = 'auto'
      document.body.style.backgroundColor = ''
      document.documentElement.style.background = ''
      document.documentElement.style.height = ''
    }
  }, [])

  return (
    <div className="pt-24 sm:pt-0 sm:flex-grow flex flex-col items-center justify-center px-6">
      <div className="text-center max-w-md mx-auto">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-source text-primary mb-4">Page Not Found!</h1>
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

