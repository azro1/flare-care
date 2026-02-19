'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { supabase } from '@/lib/supabase'
import {
  isPushSupported,
  getNotificationPermission,
  subscribeForPush,
  subscriptionToPayload,
  savePushSubscriptionToServer
} from '@/lib/pushSubscription'

const DISMISS_KEY = 'flarecare-push-banner-dismissed'

export default function PushEnableBanner() {
  const { user } = useAuth()
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    if (!user?.id || !isPushSupported()) return
    const perm = getNotificationPermission()
    const wasDismissed = typeof localStorage !== 'undefined' && localStorage.getItem(DISMISS_KEY)
    if (perm === 'default' && !wasDismissed) setDismissed(false)
    if (perm === 'default' && !wasDismissed) setShow(true)
  }, [user?.id])

  const handleEnable = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        console.error('Push enable failed: no session')
        setLoading(false)
        return
      }
      const sub = await subscribeForPush()
      if (!sub) {
        setLoading(false)
        return
      }
      const payload = subscriptionToPayload(sub)
      await savePushSubscriptionToServer(payload, session.access_token)
      setShow(false)
    } catch (e) {
      console.error('Push enable failed:', e)
    }
    setLoading(false)
  }

  const handleDismiss = () => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-[9998]">
      <div
        className="rounded-lg shadow-lg border p-4 flex flex-col gap-3"
        style={{
          backgroundColor: 'var(--bg-dropdown)',
          borderColor: 'var(--border-dropdown)'
        }}
      >
        <p className="text-sm font-roboto text-primary">
          Enable push notifications so you get medication reminders even when the app is closed.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleEnable}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50"
            style={{ backgroundColor: '#5F9EA0' }}
          >
            {loading ? 'Enabling…' : 'Enable push'}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="px-4 py-2 rounded-lg text-sm font-roboto transition-colors border"
            style={{
              backgroundColor: 'var(--bg-button-cancel)',
              borderColor: 'var(--border-primary)',
              color: 'var(--text-secondary)'
            }}
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}
