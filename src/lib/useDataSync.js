import { useState, useEffect, useRef } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { supabase, TABLES, syncToSupabase, fetchFromSupabase, deleteFromSupabase } from './supabase'

export function useDataSync(key, initialValue = []) {
  const [isClient, setIsClient] = useState(false)
  const [localData, setLocalData] = useLocalStorage(key, initialValue)
  const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' ? navigator.onLine : true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncEnabled, setSyncEnabled] = useLocalStorage('flarecare-sync-enabled', false)
  const [userId, setUserId] = useLocalStorage('flarecare-user-id', null)
  const hasFetchedRef = useRef(false)

  console.log(`useDataSync for ${key}:`, { syncEnabled, isOnline, userId, dataLength: localData.length })

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Check if user is online
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const checkOnline = () => setIsOnline(navigator.onLine)
    checkOnline()
    window.addEventListener('online', checkOnline)
    window.addEventListener('offline', checkOnline)
    return () => {
      window.removeEventListener('online', checkOnline)
      window.removeEventListener('offline', checkOnline)
    }
  }, [])

  // Generate user ID if not exists
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    if (!userId) {
      const newUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      setUserId(newUserId)
    }
  }, [userId, setUserId])

  // Sync data to Supabase when sync is enabled and online
  const syncToCloud = async () => {
    console.log('syncToCloud called:', { syncEnabled, isOnline, userId, dataLength: localData.length })
    if (!syncEnabled || !isOnline || !userId || localData.length === 0) {
      console.log('Sync skipped:', { syncEnabled, isOnline, userId, dataLength: localData.length })
      return
    }

    setIsSyncing(true)
    try {
      const tableName = key.replace('flarecare-', '')
      
      // Transform data to match Supabase schema based on table type
      const transformedData = localData.map(item => {
        const { 
          createdAt, 
          updatedAt, 
          ...rest 
        } = item
        
        // Base transformation for all tables
        const baseTransformed = {
          ...rest,
          created_at: createdAt,
          updated_at: updatedAt || createdAt
        }
        
        // Add symptom-specific fields only for symptoms table
        if (tableName === 'symptoms') {
          const { 
            symptomStartDate, 
            isOngoing, 
            symptomEndDate,
            createdAt,
            updatedAt,
            ...restWithoutSymptomFields
          } = item
          return {
            ...restWithoutSymptomFields,
            created_at: createdAt,
            updated_at: updatedAt || createdAt,
            symptom_start_date: symptomStartDate,
            is_ongoing: isOngoing,
            symptom_end_date: symptomEndDate || null
          }
        }
        
        // Add medication-specific fields only for medications table
        if (tableName === 'medications') {
          const { 
            timeOfDay, 
            startDate, 
            endDate,
            createdAt,
            updatedAt,
            ...restWithoutMedFields
          } = item
          return {
            ...restWithoutMedFields,
            created_at: createdAt,
            updated_at: updatedAt || createdAt,
            frequency: timeOfDay, // Map timeOfDay to frequency
            start_date: startDate || createdAt?.split('T')[0] || new Date().toISOString().split('T')[0], // Use creation date as start date if not provided
            end_date: endDate || null
          }
        }
        
        return baseTransformed
      })
      
      const result = await syncToSupabase(tableName, transformedData, userId)
      
      if (!result.success) {
        console.error('Sync failed:', result.error)
      }
    } catch (error) {
      console.error('Sync error:', error)
    } finally {
      setIsSyncing(false)
    }
  }

  // Fetch data from Supabase when sync is enabled
  const fetchFromCloud = async () => {
    if (!syncEnabled || !isOnline || !userId) return

    setIsSyncing(true)
    try {
      const tableName = key.replace('flarecare-', '')
      const result = await fetchFromSupabase(tableName, userId)
      
          if (result.success && result.data) {
            // Merge cloud data with local data, prioritizing local changes
            const cloudData = result.data.map(item => {
              const { 
                user_id, 
                created_at, 
                updated_at,
                ...rest 
              } = item
              
              // Base transformation for all tables
              const baseTransformed = {
                ...rest,
                createdAt: created_at,
                updatedAt: updated_at
              }
              
              // Add symptom-specific fields only for symptoms table
              if (tableName === 'symptoms') {
                const { 
                  symptom_start_date, 
                  is_ongoing, 
                  symptom_end_date,
                  date
                } = item
                return {
                  ...baseTransformed,
                  symptomStartDate: symptom_start_date || date, // Fallback to 'date' if symptom_start_date is null
                  isOngoing: is_ongoing,
                  symptomEndDate: symptom_end_date
                }
              }
              
              // Add medication-specific fields only for medications table
              if (tableName === 'medications') {
                const { 
                  frequency, 
                  start_date, 
                  end_date 
                } = item
                return {
                  ...baseTransformed,
                  timeOfDay: frequency, // Map frequency back to timeOfDay
                  // Note: startDate and endDate are not used in the current UI
                  // but are available if needed for future features
                  startDate: start_date,
                  endDate: end_date
                }
              }
              
              return baseTransformed
            })
        
        // Get current local data at the time of merge
        setLocalData(currentLocalData => {
          console.log('fetchFromCloud merge check:', { 
            currentLocalLength: currentLocalData.length, 
            cloudDataLength: cloudData.length 
          })
          
          // If we have local data, don't overwrite it with empty cloud data
          if (currentLocalData.length > 0) {
            console.log('Keeping existing local data, not overwriting with cloud data')
            return currentLocalData
          }
          
          // If no local data, use cloud data
          console.log('Using cloud data as no local data exists')
          return cloudData
        })
      }
    } catch (error) {
      console.error('Fetch error:', error)
    } finally {
      setIsSyncing(false)
    }
  }

  // Auto-sync when data changes and sync is enabled
  useEffect(() => {
    if (syncEnabled && isOnline && userId) {
      const timeoutId = setTimeout(syncToCloud, 2000) // Increased debounce to 2 seconds
      return () => clearTimeout(timeoutId)
    }
  }, [localData, syncEnabled, isOnline, userId])

  // Sync existing local data when sync is first enabled
  useEffect(() => {
    // Force re-read sync state from localStorage to ensure it's current
    const currentSyncState = JSON.parse(localStorage.getItem('flarecare-sync-enabled') || 'false')
    console.log('Sync state changed - localStorage says:', currentSyncState, 'component state:', syncEnabled)
    
    if (currentSyncState && isOnline && userId) {
      // Force re-read from localStorage when sync is enabled
      const storedData = JSON.parse(localStorage.getItem(key) || '[]')
      console.log('Sync enabled - checking localStorage:', storedData)
      
      if (storedData.length > 0) {
        console.log('Found data in localStorage, syncing to cloud')
        // Update local state with data from localStorage
        setLocalData(storedData)
        // Sync to cloud
        syncToCloud()
      } else {
        console.log('No data in localStorage to sync')
      }
    }
  }, [syncEnabled]) // Only trigger when syncEnabled changes

  // Fetch data on mount if sync is enabled (only once)
  useEffect(() => {
    if (syncEnabled && isOnline && userId && !hasFetchedRef.current) {
      hasFetchedRef.current = true
      // Don't fetch from cloud - let the sync effect handle pushing local data to cloud
    }
  }, [syncEnabled, isOnline, userId])

  // Enhanced setter that handles both local and cloud operations
  const setData = (newData) => {
    setLocalData(newData)
  }

  // Enhanced delete function
  const deleteData = async (id) => {
    console.log('deleteData called:', { id, syncEnabled, isOnline, userId })
    
    // Always try to delete from cloud if online and have userId
    if (isOnline && userId) {
      try {
        const tableName = key.replace('flarecare-', '')
        console.log('Deleting from cloud:', { tableName, id, userId })
        const result = await deleteFromSupabase(tableName, id, userId)
        console.log('Cloud delete result:', result)
        
        // Don't fail if cloud delete fails - still delete locally
        if (!result.success) {
          console.warn('Cloud delete failed, but continuing with local delete:', result.error)
        }
      } catch (error) {
        console.warn('Delete from cloud failed, but continuing with local delete:', error)
      }
    } else {
      console.log('Skipping cloud delete - offline or no userId:', { isOnline, userId })
    }

    // Always delete from local data
    const updatedData = localData.filter(item => item.id !== id)
    setLocalData(updatedData)
    console.log('Deleted locally, remaining items:', updatedData.length)
  }

  // Return default values during SSR to prevent hydration mismatch
  if (!isClient) {
    return {
      data: initialValue,
      setData: () => {},
      deleteData: () => {},
      isOnline: true,
      isSyncing: false,
      syncEnabled: false,
      setSyncEnabled: () => {},
      syncToCloud: () => {},
      fetchFromCloud: () => {},
      userId: null
    }
  }

  return {
    data: localData,
    setData,
    deleteData,
    isOnline,
    isSyncing,
    syncEnabled,
    setSyncEnabled,
    syncToCloud,
    fetchFromCloud,
    userId
  }
}
