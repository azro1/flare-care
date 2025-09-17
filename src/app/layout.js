import './globals.css'
import Navigation from '@/components/Navigation'

export const metadata = {
  title: 'FlareCare - Crohn\'s & Colitis Management',
  description: 'Track symptoms, medications, and generate reports for Crohn\'s & Colitis patients',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <div className="min-h-screen flex flex-col">
          <Navigation />
          <main className="flex-1 container mx-auto px-4 py-8">
            {children}
          </main>
          <footer className="bg-white border-t border-gray-200 py-6 mt-auto">
            <div className="container mx-auto px-4 text-center text-gray-600">
              <p>&copy; 2025 FlareCare. Built with care for Crohn's & Colitis patients.</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}
