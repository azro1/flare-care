import { useState, useEffect } from 'react'

export function useLocalStorage(key, initialValue) {
  // State to store our value
  const [storedValue, setStoredValue] = useState(() => {
    if (typeof window === 'undefined') {
      console.log(`SSR: Using initial value for ${key}:`, initialValue)
      return initialValue
    }
    try {
      const item = window.localStorage.getItem(key)
      const parsed = item ? JSON.parse(item) : initialValue
      console.log(`Reading localStorage for ${key}:`, parsed, 'Raw item:', item, 'Item length:', item?.length)
      return parsed
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error)
      return initialValue
    }
  })

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = (value) => {
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value
      console.log(`Setting localStorage for ${key}:`, valueToStore)
      setStoredValue(valueToStore)
      
      // Save to local storage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
        console.log(`Saved to localStorage: ${key}`, JSON.parse(window.localStorage.getItem(key)))
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error)
    }
  }

  return [storedValue, setValue]
}
