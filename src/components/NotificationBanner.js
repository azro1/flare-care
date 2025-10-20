'use client'

import { useState, useEffect } from 'react'

const NotificationBanner = () => {
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    // Listen for custom reminder events
    const handleReminder = (event) => {
      const { medicationNames } = event.detail
      const id = Date.now()
      
      
      setNotifications(prev => [...prev, { id, medicationNames, timestamp: new Date() }])
      
      // Auto-remove after 10 seconds
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id))
      }, 10000)
    }

    window.addEventListener('medication-reminder', handleReminder)
    
    return () => {
      window.removeEventListener('medication-reminder', handleReminder)
    }
  }, [])

  if (notifications.length === 0) return null

  return (
    <div className="fixed top-20 right-4 z-[9999] space-y-2">
      {notifications.map(notification => (
        <div
          key={notification.id}
          className="bg-violet-500 text-white px-6 py-4 rounded-lg shadow-lg border-l-4 border-violet-400 max-w-sm animate-in slide-in-from-right duration-300"
        >
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium">
                💊 Medication Reminder
              </h3>
              <p className="mt-1 text-sm">
                Time to take: {notification.medicationNames}
              </p>
              <p className="mt-1 text-xs opacity-75">
                {notification.timestamp.toLocaleTimeString()}
              </p>
            </div>
            <button
              onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
              className="ml-4 flex-shrink-0 text-white hover:text-gray-200"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

export default NotificationBanner
