'use client'

import { useTheme } from '@/lib/ThemeContext'
import ProtectedRoute from '@/components/ProtectedRoute'

function SettingsPageContent() {
  const { theme, toggleTheme } = useTheme()

  return (
    <div>
      <div className="max-w-5xl mx-auto sm:px-4 md:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-4 sm:mb-6 card">
          <div className="">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-source text-primary mb-4">Settings</h1>
            <p className="text-secondary font-roboto break-words">Manage your app preferences and settings</p>
          </div>
        </div>

        {/* Theme Section */}
        <div className="card mb-4 sm:mb-6">
          <h3 className="text-lg sm:text-xl font-semibold font-source text-primary mb-4">Theme</h3>
          
          <div className="card-inner p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-secondary mb-1">Appearance</p>
                <p className="text-primary font-roboto text-sm">
                  {theme === 'dark' ? 'Dark mode' : 'Light mode'}
                </p>
              </div>
              
              <button
                onClick={toggleTheme}
                className="relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none"
                style={{
                  backgroundColor: theme === 'dark' ? '#5F9EA0' : '#cbd5e1'
                }}
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    theme === 'dark' ? 'translate-x-8' : 'translate-x-1'
                  }`}
                />
                <span className="sr-only">Toggle theme</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsPageContent />
    </ProtectedRoute>
  )
}

