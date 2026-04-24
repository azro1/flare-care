'use client'

import { useLayoutEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export default function ScrollManager() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
  }, [])

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return
    const root = document.documentElement
    const previous = root.style.scrollBehavior
    root.style.scrollBehavior = 'auto'
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    root.style.scrollBehavior = previous
  }, [pathname, searchParams])

  return null
}
