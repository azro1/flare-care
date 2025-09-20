'use client'

import { useEffect } from 'react'
import { useDataSync } from '@/lib/useDataSync'
import reminderService from '@/lib/reminderService'

export default function ReminderProvider() {
  const { data: medications } = useDataSync('flarecare-medications', [])

  useEffect(() => {
    // Start the global reminder service
    reminderService.start(medications)

    // Cleanup on unmount
    return () => {
      reminderService.stop()
    }
  }, [medications])

  // This component doesn't render anything
  return null
}
