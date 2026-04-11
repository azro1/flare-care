'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import ConfirmationModal from '@/components/ConfirmationModal'
import { CupSoda, Lightbulb, Minus, Plus } from 'lucide-react'
import { supabase, TABLES } from '@/lib/supabase'

const HYDRATION_TARGET = 6

function HydrationPageContent() {
  const { user } = useAuth()
  const [glasses, setGlasses] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [showResetModal, setShowResetModal] = useState(false)

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

  const persistGlasses = async (next) => {
    if (!user?.id) return
    const clamped = Math.max(0, Math.min(next, HYDRATION_TARGET))
    try {
      const { error } = await supabase
        .from(TABLES.DAILY_HYDRATION)
        .upsert(
          { user_id: user.id, date: today, glasses: clamped, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,date' }
        )
      if (error) throw error
      setGlasses(clamped)
      if (clamped >= HYDRATION_TARGET) {
        window.dispatchEvent(new Event('hydration-completed'))
      }
    } catch (err) {
      console.error('Error updating hydration:', err)
    }
  }

  const handleIncrement = () => persistGlasses(glasses + 1)
  const handleDecrement = () => persistGlasses(glasses - 1)

  const handleReset = async () => {
    if (!user?.id) return
    try {
      const { error } = await supabase
        .from(TABLES.DAILY_HYDRATION)
        .upsert(
          { user_id: user.id, date: today, glasses: 0, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,date' }
        )
      if (error) throw error
      setGlasses(0)
      setShowResetModal(false)
      const key = `flarecare-hydration-reset-${user.id}-${today}`
      localStorage.setItem(key, JSON.stringify({ timestamp: new Date().toISOString() }))
      window.dispatchEvent(new Event('hydration-reset'))
    } catch (err) {
      console.error('Error resetting hydration:', err)
    }
  }

  return (
    <div className="max-w-4xl w-full mx-auto sm:px-4 md:px-6 min-w-0">
      <div className="mb-5 sm:mb-6">
        <div className="card">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-title text-primary mb-3 sm:mb-6">
                My Hydration
              </h1>
              <p className="text-sm sm:text-base text-secondary font-sans leading-relaxed">
                Track your daily water intake to hit your goal each day
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-5 sm:mb-6 min-w-0">
        <div className="flex flex-row flex-wrap items-center justify-between gap-4 mb-5 sm:mb-6">
          <div className="flex items-center min-w-0">
            <div className="hidden sm:flex w-10 h-10 bg-sky-100 dashboard-icon-panel rounded-lg items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
              <CupSoda className="w-5 h-5 text-sky-600 dark:[color:var(--text-goal-icon-hydration)]" />
            </div>
            <h2 className="text-xl font-semibold font-title text-primary">
              Daily intake
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
              <div className="min-h-6 mt-2">
                {glasses > 0 && (
                  <button
                    onClick={() => setShowResetModal(true)}
                    className="text-sm text-secondary hover:text-primary underline"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDecrement}
                disabled={glasses === 0}
                aria-label="Remove one glass"
                className="card-inner inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--border-primary)] transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Minus className="w-4 h-4" strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={handleIncrement}
                disabled={glasses >= HYDRATION_TARGET}
                aria-label="Add one glass"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#5F9EA0] text-white transition-colors hover:bg-[#5F9EA0]/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="w-4 h-4" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        )}
        </div>
      </div>

      <div className="mt-4 sm:mt-6 card">
        <div>
          <p className="text-sm text-secondary font-sans leading-relaxed">
            Use − and + to update your daily intake count. Your target is {HYDRATION_TARGET} glasses per day (roughly 250ml each).
          </p>
          <div className="card-inner p-5 sm:p-6 mt-4">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-5 h-5 flex-shrink-0 text-amber-500" />
              <span className="text-base sm:text-sm font-semibold text-primary font-title">Important to know:</span>
            </div>
            <p className="text-xs text-secondary font-sans leading-relaxed">
              Most guidelines recommend around 1.5–2 litres (about 6–8 glasses) of water per day for adults.
            </p>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={handleReset}
        title="Reset today's count?"
        message="Your hydration progress will be reset to 0. If you did not mean to do this click Cancel to close."
        confirmText="Reset"
        cancelText="Cancel"
        isDestructive={false}
      />
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
