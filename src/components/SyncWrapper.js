'use client'

import { useDataSync } from '@/lib/useDataSync'
import SyncSettings from './SyncSettings'

export default function SyncWrapper() {
  const { syncEnabled, setSyncEnabled, isOnline, isSyncing, syncToCloud, fetchFromCloud } = useDataSync('flarecare-symptoms', [])

  return (
    <SyncSettings
      syncEnabled={syncEnabled}
      setSyncEnabled={setSyncEnabled}
      isOnline={isOnline}
      isSyncing={isSyncing}
      syncToCloud={syncToCloud}
      fetchFromCloud={fetchFromCloud}
    />
  )
}
