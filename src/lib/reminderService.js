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
      new Notification('Medication Reminder', {
        body: `Time to take: ${medication.name}`,
        tag: 'medication-reminder',
        requireInteraction: true
      })
    } else {
      console.log(`Reminder: Time to take ${medication.name}`)
    }
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
