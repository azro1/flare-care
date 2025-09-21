import DOMPurify from 'dompurify'

/**
 * Sanitizes user input to prevent XSS attacks
 * Removes HTML tags, scripts, and malicious content
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return input
  
  // Remove all HTML tags and script content
  return DOMPurify.sanitize(input, { 
    ALLOWED_TAGS: [], // Remove all HTML tags
    ALLOWED_ATTR: [], // Remove all attributes
    KEEP_CONTENT: true // Keep text content but remove tags
  }).trim()
}

/**
 * Sanitizes text input for display (allows basic formatting)
 */
export function sanitizeForDisplay(input) {
  if (typeof input !== 'string') return input
  
  // Allow basic formatting but remove scripts
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br'],
    ALLOWED_ATTR: []
  })
}

/**
 * Validates and sanitizes medication names
 */
export function sanitizeMedicationName(name) {
  if (typeof name !== 'string') return ''
  
  // Remove HTML, scripts, and limit length
  const sanitized = sanitizeInput(name)
  return sanitized.substring(0, 100) // Limit to 100 characters
}

/**
 * Validates and sanitizes notes
 */
export function sanitizeNotes(notes) {
  if (typeof notes !== 'string') return ''
  
  // Allow basic formatting but remove scripts
  const sanitized = sanitizeForDisplay(notes)
  return sanitized.substring(0, 500) // Limit to 500 characters
}

/**
 * Validates and sanitizes food triggers
 */
export function sanitizeFoodTriggers(foods) {
  if (typeof foods !== 'string') return ''
  
  // Remove HTML and scripts, keep text only
  const sanitized = sanitizeInput(foods)
  return sanitized.substring(0, 200) // Limit to 200 characters
}
