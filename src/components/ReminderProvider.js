'use client'

import { useEffect, useState } from 'react'
import { supabase, TABLES } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import reminderService from '@/lib/reminderService'

export default function ReminderProvider() {
  const { user } = useAuth()
  const [medications, setMedications] = useState([])

  // Fetch medications directly from Supabase
  useEffect(() => {
    const fetchMedications = async () => {
      if (!user?.id) {
        setMedications([])
        return
      }

      try {
        const { data, error } = await supabase
          .from(TABLES.MEDICATIONS)
          .select('*')
          .eq('user_id', user.id)
          .neq('name', 'Medication Tracking')
          .order('created_at', { ascending: false })

        if (error) throw error

        if (data) {
          // Transform snake_case to camelCase
          const transformedMedications = data.map(item => {
            const {
              time_of_day,
              reminders_enabled,
              created_at,
              updated_at,
              ...rest
            } = item
            return {
              ...rest,
              timeOfDay: time_of_day || '',
              remindersEnabled: reminders_enabled !== false,
              createdAt: created_at,
              updatedAt: updated_at
            }
          })
          setMedications(transformedMedications)
        }
      } catch (error) {
        console.error('Error fetching medications:', error)
        setMedications([])
      }
    }

    fetchMedications()
  }, [user?.id])

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
