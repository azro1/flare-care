import './globals.css'
import AppShell from '@/components/AppShell'
import ReminderProvider from '@/components/ReminderProvider'
import NotificationBanner from '@/components/NotificationBanner'
import { AuthProvider } from '@/lib/AuthContext'
import { ThemeProvider } from '@/lib/ThemeContext'
import LoadingScreen from '@/components/LoadingScreen'

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: 'FlareCare - Crohn\'s & Colitis Management',
  description: 'Track symptoms, medications, and generate reports for Crohn\'s & Colitis patients',
  icons: {
    icon: '/icons/seagull.svg',
    shortcut: '/icons/seagull.svg',
    apple: '/icons/seagull.svg',
  },
  openGraph: {
    title: 'FlareCare - Crohn\'s & Colitis Management',
    description: 'Track symptoms, medications, and generate reports for Crohn\'s & Colitis patients',
    images: [
      {
        url: '/icons/seagull.svg',
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
    images: ['/icons/seagull.svg'],
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <link rel="icon" href="/icons/seagull.svg" type="image/svg+xml" />
        <link rel="shortcut icon" href="/icons/seagull.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/seagull.svg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700;900&family=Playfair+Display:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700;800;900&family=Nunito:wght@300;400;500;600;700&family=Roboto:wght@300;400;500;700;900&family=Lato:wght@300;400;700;900&family=Montserrat:wght@300;400;500;600;700;800;900&family=Raleway:wght@300;400;500;600;700;800;900&family=Source+Sans+Pro:wght@300;400;600;700;900&family=Barlow:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen" style={{backgroundColor: 'var(--bg-main)'}} id="body">
        <ThemeProvider>
          <AuthProvider>
            <ReminderProvider />
            <NotificationBanner />
            <LoadingScreen>
              <AppShell>{children}</AppShell>
            </LoadingScreen>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
