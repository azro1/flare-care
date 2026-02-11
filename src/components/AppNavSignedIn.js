'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Info, BookOpen, User } from 'lucide-react'

const bottomTabs = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/about', label: 'About', icon: Info },
  { href: '/ibd', label: 'IBD', icon: BookOpen },
  { href: '/account', label: 'Account', icon: User },
]

export default function AppNavSignedIn() {
  const pathname = usePathname()

  const isActive = (href) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t safe-area-pb"
      style={{ backgroundColor: 'var(--bg-nav-footer)' }}
    >
      <div className="flex items-center justify-around h-16">
        {bottomTabs.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 py-2 gap-0.5 transition-colors ${
                active ? 'text-[#5F9EA0]' : ''
              }`}
              style={!active ? { color: 'var(--text-footer)' } : undefined}
            >
              <Icon className="w-6 h-6" strokeWidth={active ? 2.5 : 2} />
              <span className="text-xs font-medium font-roboto">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
