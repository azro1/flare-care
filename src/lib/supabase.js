import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database schema for Supabase
export const TABLES = {
  SYMPTOMS: 'symptoms',
  MEDICATIONS: 'medications',  // This now points to the new table
  TRACK_MEDICATIONS: 'track_medications',  // Add this for the renamed table
  TRACK_WEIGHT: 'track_weight',
  USER_SETTINGS: 'user_settings',
  USER_PREFERENCES: 'user_preferences'
}

// Helper functions for data operations
export const syncToSupabase = async (table, data, userId) => {
  try {
    const { error } = await supabase
      .from(table)
      .upsert(data.map(item => ({ ...item, user_id: userId })))
    
    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Sync error:', error)
    return { success: false, error: error.message }
  }
}

export const fetchFromSupabase = async (table, userId) => {
  try {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Fetch error:', error)
    return { success: false, error: error.message }
  }
}

export const deleteFromSupabase = async (table, id, userId) => {
  try {
    console.log('Attempting to delete:', { table, id, userId })
    const { error, count } = await supabase
      .from(table)
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
    
    console.log('Delete result:', { error, count })
    
    if (error) throw error
    return { success: true, count }
  } catch (error) {
    console.error('Delete error:', error)
    return { success: false, error: error.message }
  }
}
