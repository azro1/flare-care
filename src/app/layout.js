import './globals.css'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import MainContent from '@/components/MainContent'
import ReminderProvider from '@/components/ReminderProvider'
import NotificationBanner from '@/components/NotificationBanner'
import ThemeToggle from '@/components/ThemeToggle'
import { AuthProvider } from '@/lib/AuthContext'
import { ThemeProvider } from '@/lib/ThemeContext'
import LoadingScreen from '@/components/LoadingScreen'

export const metadata = {
  title: 'FlareCare - Crohn\'s & Colitis Management',
  description: 'Track symptoms, medications, and generate reports for Crohn\'s & Colitis patients',
  icons: {
    icon: '/icons/logo.svg',
    shortcut: '/icons/logo.svg',
    apple: '/icons/logo.svg',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
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
              <div className="min-h-screen flex flex-col relative">
                <Navigation />
                <MainContent>
                  {children}
                </MainContent>
                <Footer />
                <ThemeToggle />
              </div>
            </LoadingScreen>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
