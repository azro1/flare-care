'use client'

import { useEffect } from 'react'
import { useDataSync } from '@/lib/useDataSync'
import reminderService from '@/lib/reminderService'

export default function ReminderProvider() {
  const { data: medications } = useDataSync('flarecare-medications', [])

  useEffect(() => {
    console.log('ReminderProvider: Starting reminder service with medications:', medications)
    // Start the global reminder service
    reminderService.start(medications)

    // Cleanup on unmount
    return () => {
      console.log('ReminderProvider: Stopping reminder service')
      reminderService.stop()
    }
  }, [medications])

  // This component doesn't render anything
  return null
}
