import './globals.css'
import { Inter } from 'next/font/google'
import AppShell from '@/components/AppShell'
import ReminderProvider from '@/components/ReminderProvider'
import NotificationBanner from '@/components/NotificationBanner'
import PushEnableBanner from '@/components/PushEnableBanner'
import { AuthProvider } from '@/lib/AuthContext'
import { ThemeProvider } from '@/lib/ThemeContext'
import ScrollManager from '@/components/ScrollManager'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
})

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: 'FlareCare - Crohn\'s & Colitis Management',
  description: 'Track symptoms, medications, and generate reports for Crohn\'s & Colitis patients',
  icons: {
    icon: '/fclogo.svg',
    shortcut: '/fclogo.svg',
    apple: '/fclogo.svg',
  },
  openGraph: {
    title: 'FlareCare - Crohn\'s & Colitis Management',
    description: 'Track symptoms, medications, and generate reports for Crohn\'s & Colitis patients',
    images: [
      {
        url: '/fclogo.svg',
        width: 48,
        height: 48,
        alt: 'FlareCare logo',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'FlareCare - Crohn\'s & Colitis Management',
    description: 'Track symptoms, medications, and generate reports for Crohn\'s & Colitis patients',
    images: ['/fclogo.svg'],
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <link rel="icon" href="/fclogo.svg" type="image/svg+xml" />
        <link rel="shortcut icon" href="/fclogo.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/fclogo.svg" />
      </head>
      <body className={`${inter.className} min-h-screen`} style={{backgroundColor: 'var(--bg-main)'}} id="body">
        <ThemeProvider>
          <AuthProvider>
            <ScrollManager />
            <ReminderProvider />
            <NotificationBanner />
            <PushEnableBanner />
            <AppShell>{children}</AppShell>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}



