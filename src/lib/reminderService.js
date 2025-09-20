// Global reminder service that runs regardless of which page the user is on
class ReminderService {
  constructor() {
    this.interval = null
    this.lastNotificationTime = {}
    this.medications = []
    this.isRunning = false
  }

  // Start the reminder service
  start(medications) {
    console.log('ReminderService: Starting with medications:', medications)
    this.medications = medications || []
    
    if (this.isRunning) {
      console.log('ReminderService: Already running, stopping first')
      this.stop()
    }

    this.isRunning = true
    console.log('ReminderService: Started successfully')
    
    // Set timers for each medication's exact reminder time
    this.setReminderTimers()
  }

  // Stop the reminder service
  stop() {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
    this.isRunning = false
  }

  // Update medications data
  updateMedications(medications) {
    this.medications = medications || []
  }

  // Set exact timers for each medication's reminder time
  setReminderTimers() {
    // Clear any existing timers
    if (this.timers) {
      this.timers.forEach(timer => clearTimeout(timer))
    }
    this.timers = []

    this.medications.forEach(med => {
      if (!med.remindersEnabled || med.timeOfDay === 'as-needed') return

      let targetTime = med.timeOfDay
      if (med.timeOfDay === 'custom' && med.customTime) {
        targetTime = med.customTime
      }

      // Calculate exact time until reminder
      const now = new Date()
      const [hours, minutes] = targetTime.split(':').map(Number)
      const reminderTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0)

      // If time has passed today, set for tomorrow
      if (reminderTime <= now) {
        reminderTime.setDate(reminderTime.getDate() + 1)
      }

      const timeUntilReminder = reminderTime.getTime() - now.getTime()
      console.log(`Setting timer for ${med.name} at ${targetTime} in ${timeUntilReminder}ms`)

      const timer = setTimeout(() => {
        this.showNotification(med)
      }, timeUntilReminder)

      this.timers.push(timer)
    })
  }

  // Reset notification history for testing
  resetNotificationHistory() {
    this.lastNotificationTime = {}
    console.log('Notification history reset - you can now test notifications again')
  }

  // Show notification for a specific medication
  async showNotification(medication) {
    console.log(`Showing notification for ${medication.name}`)
    
    // Request notification permission if not already granted
    if (Notification.permission === 'default') {
      await Notification.requestPermission()
    }
    
    // Show browser notification if permission granted
    if (Notification.permission === 'granted') {
      new Notification('💊 Medication Reminder', {
        body: `Time to take: ${medication.name}`,
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" fill="%232563eb" rx="4"/><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" fill="white" stroke="white" stroke-width="0.5"/></svg>',
        badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" fill="%232563eb" rx="4"/><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" fill="white" stroke="white" stroke-width="0.5"/></svg>',
        tag: 'medication-reminder',
        requireInteraction: true,
        silent: false,
        vibrate: [200, 100, 200]
      })
    } else {
      console.log(`Reminder: Time to take ${medication.name}`)
    }

    // Always show in-app banner notification as fallback
    const event = new CustomEvent('medication-reminder', {
      detail: { medicationNames: medication.name }
    })
    window.dispatchEvent(event)
  }

  // Check for due medications
  async checkReminders() {
    const now = new Date()
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0')
    const currentDate = now.toDateString()
    
    const dueMedications = this.medications.filter(med => {
      if (!med.remindersEnabled) return false
      if (med.timeOfDay === 'as-needed') return false
      
      let targetTime = med.timeOfDay
      if (med.timeOfDay === 'custom' && med.customTime) {
        targetTime = med.customTime
      }
      
      // Check if current time exactly matches target time
      const isTimeMatch = currentTime === targetTime
      
      // Check if we've already sent a notification for this medication at this specific time today
      const notificationKey = `${med.id}-${targetTime}-${currentDate}`
      const lastNotified = this.lastNotificationTime[notificationKey]
      const hasNotifiedToday = lastNotified && lastNotified === currentDate
      
      return isTimeMatch && !hasNotifiedToday
    })

    if (dueMedications.length > 0) {
      const medicationNames = dueMedications.map(med => med.name).join(', ')
      console.log('Found due medication:', medicationNames)
      console.log('Notification permission:', Notification.permission)
      
      // Request notification permission if not already granted
      if (Notification.permission === 'default') {
        await Notification.requestPermission()
      }
      
      // Show browser notification if permission granted
      if (Notification.permission === 'granted') {
        console.log('Creating notification...')
        new Notification('Medication Reminder', {
          body: `Time to take: ${medicationNames}`,
          tag: 'medication-reminder',
          requireInteraction: true
        })
        console.log('Notification created')
      } else {
        // Fallback to console log
        console.log(`Reminder: Time to take ${medicationNames}`)
      }
      
      // Mark these medications as notified today
      dueMedications.forEach(med => {
        let targetTime = med.timeOfDay
        if (med.timeOfDay === 'custom' && med.customTime) {
          targetTime = med.customTime
        }
        const notificationKey = `${med.id}-${targetTime}-${currentDate}`
        this.lastNotificationTime[notificationKey] = currentDate
      })
    }
  }
}

// Create a singleton instance
const reminderService = new ReminderService()

export default reminderService
