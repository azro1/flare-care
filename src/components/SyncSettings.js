'use client'

import { useState } from 'react'

export default function SyncSettings({ 
  syncEnabled, 
  setSyncEnabled, 
  isOnline, 
  isSyncing, 
  syncToCloud, 
  fetchFromCloud 
}) {
  const [showSettings, setShowSettings] = useState(false)

  const handleSyncToggle = (enabled) => {
    if (enabled && !isOnline) {
      alert('You need to be online to enable cloud sync.')
      return
    }
    setSyncEnabled(enabled)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="flex items-center space-x-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg shadow-sm transition-colors duration-200 whitespace-nowrap"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span>Sync Settings</span>
        {isSyncing && (
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
        )}
      </button>

      {showSettings && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Cloud Sync</h3>
            <button
              onClick={() => setShowSettings(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            {/* Sync Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Enable Cloud Sync</p>
                <p className="text-xs text-gray-500">
                  Sync your data across devices and keep it backed up
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={syncEnabled}
                  onChange={(e) => handleSyncToggle(e.target.checked)}
                  disabled={!isOnline}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Status */}
            <div className="flex items-center space-x-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className={isOnline ? 'text-green-700' : 'text-red-700'}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
              {isSyncing && (
                <>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-blue-700">Syncing...</span>
                </>
              )}
            </div>

            {/* Sync Actions */}
            {syncEnabled && isOnline && (
              <div className="space-y-2">
                <button
                  onClick={syncToCloud}
                  disabled={isSyncing}
                  className="w-full btn-secondary text-sm py-2"
                >
                  {isSyncing ? 'Syncing...' : 'Sync to Cloud'}
                </button>
                <button
                  onClick={fetchFromCloud}
                  disabled={isSyncing}
                  className="w-full btn-secondary text-sm py-2"
                >
                  {isSyncing ? 'Syncing...' : 'Fetch from Cloud'}
                </button>
              </div>
            )}

            {/* Info */}
            <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
              <p className="font-medium mb-1">How it works:</p>
              <ul className="space-y-1">
                <li>• Your data is stored locally by default</li>
                <li>• Enable sync to backup and access across devices</li>
                <li>• Data is encrypted and only you can access it</li>
                <li>• Works offline - syncs when you're back online</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
