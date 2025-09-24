import './globals.css'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import ReminderProvider from '@/components/ReminderProvider'
import NotificationBanner from '@/components/NotificationBanner'
import { AuthProvider } from '@/lib/AuthContext'
import { ToastProvider } from '@/lib/ToastContext'

export const metadata = {
  title: 'FlareCare - Crohn\'s & Colitis Management',
  description: 'Track symptoms, medications, and generate reports for Crohn\'s & Colitis patients',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%2314b8a6;stop-opacity:1" /><stop offset="100%" style="stop-color:%239333ea;stop-opacity:1" /></linearGradient></defs><rect width="24" height="24" fill="url(%23grad)" rx="4"/><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" fill="white" stroke="white" stroke-width="0.5"/></svg>',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700;900&family=Playfair+Display:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-slate-50">
        <AuthProvider>
          <ToastProvider>
            <ReminderProvider />
            <NotificationBanner />
          <div className="min-h-[100dvh] flex flex-col">
            <Navigation />
            <main className="flex-grow flex flex-col container mx-auto px-4 py-12">
              {children}
            </main>
          <Footer />
        </div>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
