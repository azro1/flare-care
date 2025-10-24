import { supabase, TABLES } from './supabase'

const PREFERENCES_KEY = 'flarecare-user-preferences'

/**
 * Get user preferences from localStorage first, then fallback to Supabase
 * @param {string} userId - User ID (or 'anonymous' for non-logged in users)
 * @returns {Promise<Object|null>} User preferences or null if not found
 */
export async function getUserPreferences(userId) {
  try {
    // First try localStorage
    const localPrefs = localStorage.getItem(PREFERENCES_KEY)
    if (localPrefs) {
      const parsed = JSON.parse(localPrefs)
      // Check if preferences are for the same user
      if (parsed.userId === userId) {
        return parsed.preferences
      }
    }

    // If no local preferences or different user, try Supabase (all users are logged in)
    if (userId) {
      const { data, error } = await supabase
        .from(TABLES.USER_PREFERENCES)
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error fetching user preferences:', error)
        return null
      }

      if (data) {
        // Cache in localStorage for faster access
        localStorage.setItem(PREFERENCES_KEY, JSON.stringify({
          userId,
          preferences: data.preferences,
          lastUpdated: data.updated_at
        }))
        return data.preferences
      }
    }

    return null
  } catch (error) {
    console.error('Error getting user preferences:', error)
    return null
  }
}

/**
 * Save user preferences to both localStorage and Supabase
 * @param {string} userId - User ID (or 'anonymous' for non-logged in users)
 * @param {Object} preferences - Preferences object
 * @returns {Promise<boolean>} Success status
 */
export async function saveUserPreferences(userId, preferences) {
  try {
    const preferencesData = {
      isSmoker: preferences.isSmoker || false,
      isDrinker: preferences.isDrinker || false,
      normalBathroomFrequency: preferences.normalBathroomFrequency || null,
      hasSetPreferences: true,
      lastUpdated: new Date().toISOString(),
      // Pattern tracking for habit change detection
      smokingPattern: preferences.smokingPattern || { consecutiveNo: 0, lastAsked: null },
      alcoholPattern: preferences.alcoholPattern || { consecutiveNo: 0, lastAsked: null }
    }

    // Save to localStorage
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify({
      userId,
      preferences: preferencesData,
      lastUpdated: preferencesData.lastUpdated
    }))

    // Save to Supabase (all users are logged in)
    if (userId) {
      const { error } = await supabase
        .from(TABLES.USER_PREFERENCES)
        .upsert({
          user_id: userId,
          preferences: preferencesData,
          updated_at: preferencesData.lastUpdated
        }, {
          onConflict: 'user_id'
        })

      if (error) {
        console.error('Error saving user preferences to Supabase:', error)
        // Don't fail completely - localStorage save succeeded
      }
    }

    return true
  } catch (error) {
    console.error('Error saving user preferences:', error)
    return false
  }
}

/**
 * Update a specific preference and handle potential habit changes
 * @param {string} userId - User ID
 * @param {string} key - Preference key ('isSmoker' or 'isDrinker')
 * @param {boolean} value - New value
 * @returns {Promise<Object>} Result with success status and whether to show confirmation
 */
export async function updatePreference(userId, key, value) {
  try {
    const currentPrefs = await getUserPreferences(userId)
    
    if (!currentPrefs) {
      // No existing preferences, just save the new value
      await saveUserPreferences(userId, { [key]: value })
      return { success: true, showConfirmation: false }
    }

    // Check if this represents a habit change
    const isHabitChange = currentPrefs[key] !== value
    
    if (isHabitChange) {
      // Update the preference
      const updatedPrefs = {
        ...currentPrefs,
        [key]: value,
        lastUpdated: new Date().toISOString()
      }
      
      await saveUserPreferences(userId, updatedPrefs)
      return { 
        success: true, 
        showConfirmation: true, 
        habitChanged: key,
        oldValue: currentPrefs[key],
        newValue: value
      }
    }

    return { success: true, showConfirmation: false }
  } catch (error) {
    console.error('Error updating preference:', error)
    return { success: false, showConfirmation: false }
  }
}

/**
 * Check for habit change patterns and update preferences
 * @param {string} userId - User ID
 * @param {string} habit - 'smoking' or 'alcohol'
 * @param {boolean} didToday - Whether they did the habit today
 * @returns {Promise<Object>} Result with whether to show pattern modal
 */
export async function checkHabitPattern(userId, habit, didToday) {
  try {
    const preferences = await getUserPreferences(userId)
    if (!preferences) return { showModal: false }

    const patternKey = habit === 'smoking' ? 'smokingPattern' : 'alcoholPattern'
    const habitKey = habit === 'smoking' ? 'isSmoker' : 'isDrinker'
    const currentPattern = preferences[patternKey] || { consecutiveNo: 0, lastAsked: null }
    
    // Only track patterns for users who are known to do this habit
    if (!preferences[habitKey]) return { showModal: false }

    let newPattern = { ...currentPattern }
    let showModal = false

    if (didToday) {
      // Reset counter if they did it today
      newPattern.consecutiveNo = 0
    } else {
      // Increment counter if they didn't do it today
      newPattern.consecutiveNo += 1
      
      // Check if we should ask about habit change
      const shouldAsk = newPattern.consecutiveNo >= 5 && 
                       (!newPattern.lastAsked || 
                        new Date() - new Date(newPattern.lastAsked) > 30 * 24 * 60 * 60 * 1000) // 30 days
      
      if (shouldAsk) {
        showModal = true
        newPattern.lastAsked = new Date().toISOString()
      }
    }

    // Update preferences with new pattern
    const updatedPrefs = {
      ...preferences,
      [patternKey]: newPattern,
      lastUpdated: new Date().toISOString()
    }
    
    await saveUserPreferences(userId, updatedPrefs)
    
    return { 
      showModal, 
      consecutiveNo: newPattern.consecutiveNo,
      habit 
    }
  } catch (error) {
    console.error('Error checking habit pattern:', error)
    return { showModal: false }
  }
}

/**
 * Clear user preferences (useful for testing or account deletion)
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Success status
 */
export async function clearUserPreferences(userId) {
  try {
    // Clear localStorage
    localStorage.removeItem(PREFERENCES_KEY)

    // Clear from Supabase (all users are logged in)
    if (userId) {
      const { error } = await supabase
        .from(TABLES.USER_PREFERENCES)
        .delete()
        .eq('user_id', userId)

      if (error) {
        console.error('Error clearing user preferences from Supabase:', error)
        return false
      }
    }

    return true
  } catch (error) {
    console.error('Error clearing user preferences:', error)
    return false
  }
}
