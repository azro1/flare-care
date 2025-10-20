'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../lib/AuthContext'

export default function SyncSettings({ 
  syncEnabled, 
  setSyncEnabled, 
  isOnline, 
  isSyncing, 
  syncToCloud, 
  fetchFromCloud 
}) {
  const { isAuthenticated } = useAuth()
  const [showSettings, setShowSettings] = useState(false)
  const dropdownRef = useRef(null)

  const handleSyncToggle = (enabled) => {
    if (enabled && !isOnline) {
      alert('You need to be online to enable cloud sync.')
      return
    }
    if (enabled && !isAuthenticated) {
      alert('You need to be signed in to enable cloud sync.')
      return
    }
    setSyncEnabled(enabled)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowSettings(false)
      }
    }

    if (showSettings) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSettings])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="flex items-center space-x-2 text-sm bg-violet-500 hover:bg-violet-600 text-white px-4 py-2.5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 whitespace-nowrap"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span className="font-medium">Sync</span>
        {isSyncing && (
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
        )}
      </button>

      {showSettings && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-10">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold font-roboto text-gray-900">Cloud Sync</h3>
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
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium font-roboto text-gray-900 mb-1">Enable Cloud Sync</p>
                <p className="text-xs text-gray-500 font-roboto">
                  Sync your data across devices and keep it backed up
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={syncEnabled}
                  onChange={(e) => handleSyncToggle(e.target.checked)}
                  disabled={!isOnline || !isAuthenticated}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-500"></div>
              </label>
            </div>

            {/* Status */}
            <div className="flex items-center space-x-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className={`font-roboto ${isOnline ? 'text-green-700' : 'text-red-700'}`}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
              {isSyncing && (
                <>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-blue-700 font-roboto">Syncing...</span>
                </>
              )}
            </div>

            {/* Sync Actions */}
            {syncEnabled && isOnline && isAuthenticated && (
              <div className="space-y-2">
                <button
                  onClick={syncToCloud}
                  disabled={isSyncing}
                  className="w-full btn-secondary text-sm py-2 font-roboto"
                >
                  {isSyncing ? 'Syncing...' : 'Sync to Cloud'}
                </button>
                <button
                  onClick={fetchFromCloud}
                  disabled={isSyncing}
                  className="w-full btn-secondary text-sm py-2 font-roboto"
                >
                  {isSyncing ? 'Syncing...' : 'Fetch from Cloud'}
                </button>
              </div>
            )}

            {/* Info */}
            <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
              <p className="font-medium mb-1 font-roboto">How it works:</p>
              <ul className="space-y-1 font-roboto">
                <li>• Your data is stored locally by default</li>
                <li>• Sign in to enable sync across devices</li>
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
