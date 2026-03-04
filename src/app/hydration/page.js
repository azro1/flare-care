'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import { CupSoda, Lightbulb } from 'lucide-react'
import { supabase, TABLES } from '@/lib/supabase'

const HYDRATION_TARGET = 6

function HydrationPageContent() {
  const { user } = useAuth()
  const [glasses, setGlasses] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const today = new Date().toISOString().split('T')[0]

  const fetchToday = async () => {
    if (!user?.id) return
    try {
      const { data, error } = await supabase
        .from(TABLES.DAILY_HYDRATION)
        .select('glasses')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle()
      if (error) throw error
      setGlasses(data?.glasses ?? 0)
    } catch (err) {
      console.error('Error fetching hydration:', err)
      setGlasses(0)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchToday()
  }, [user?.id])

  const handleAddGlass = async () => {
    if (!user?.id) return
    const newGlasses = glasses + 1
    try {
      const { error } = await supabase
        .from(TABLES.DAILY_HYDRATION)
        .upsert(
          { user_id: user.id, date: today, glasses: newGlasses, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,date' }
        )
      if (error) throw error
      setGlasses(newGlasses)
      if (newGlasses >= HYDRATION_TARGET) {
        window.dispatchEvent(new Event('hydration-completed'))
      }
    } catch (err) {
      console.error('Error adding hydration:', err)
    }
  }

  return (
    <div className="max-w-4xl w-full mx-auto sm:px-4 md:px-6 lg:px-8 min-w-0">
      <div className="mb-5 sm:mb-6">
        <div className="card">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-source text-primary mb-4 sm:mb-6">
                Hydration
              </h1>
              <p className="text-sm sm:text-base text-secondary font-roboto leading-relaxed">
                Track your daily water intake to hit your goal each day
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-5 sm:mb-6 min-w-0">
        <div className="flex flex-row flex-wrap items-center justify-between gap-4 mb-5 sm:mb-6">
          <div className="flex items-center min-w-0">
            <div className="flex w-10 h-10 bg-sky-100 dashboard-icon-panel rounded-lg items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
              <CupSoda className="w-5 h-5 text-sky-600 dark:text-white" />
            </div>
            <h2 className="text-xl font-semibold font-source text-primary">
              Today&apos;s progress
            </h2>
          </div>
        </div>
        <div>
        {isLoading ? (
          <p className="text-secondary text-sm">Loading...</p>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-3xl sm:text-4xl font-bold text-primary">{glasses}</span>
              <span className="text-xl text-secondary ml-1">/ {HYDRATION_TARGET} glasses</span>
            </div>
            {glasses < HYDRATION_TARGET ? (
              <button
                onClick={handleAddGlass}
                className="px-6 py-3 rounded-lg text-base font-semibold transition-colors bg-[#5F9EA0] text-white hover:bg-[#5F9EA0]/90"
              >
                +1 glass
              </button>
            ) : (
              <div className="w-12 h-12 rounded-full bg-green-100 dashboard-icon-panel flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </div>
        )}
        </div>
      </div>

      <div className="mt-4 sm:mt-6 card">
        <div>
          <p className="text-sm sm:text-base text-secondary font-roboto leading-relaxed">
            Tap +1 each time you have a glass of water. Your target is {HYDRATION_TARGET} glasses per day (roughly 250ml each).
          </p>
          <div className="card-inner p-5 sm:p-6 mt-4">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-5 h-5 flex-shrink-0 text-amber-500 dark:text-white" />
              <span className="text-base sm:text-sm font-semibold text-primary font-source">Important to know:</span>
            </div>
            <p className="text-xs text-secondary font-roboto leading-relaxed">
              Most guidelines recommend around 1.5–2 litres (about 6–8 glasses) of water per day for adults. It varies with size, activity, and climate.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HydrationPage() {
  return (
    <ProtectedRoute>
      <HydrationPageContent />
    </ProtectedRoute>
  )
}
