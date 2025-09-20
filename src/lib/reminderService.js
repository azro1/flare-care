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
    this.medications = medications || []
    
    if (this.isRunning) {
      this.stop()
    }

    this.isRunning = true
    this.checkReminders() // Check immediately
    this.interval = setInterval(() => {
      this.checkReminders()
    }, 30000) // Check every 30 seconds
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
      
      // Check if current time matches target time (within 30 second window)
      const timeDiff = Math.abs(new Date(`2000-01-01T${currentTime}`) - new Date(`2000-01-01T${targetTime}`))
      const isTimeMatch = timeDiff <= 30000 // 30 seconds in milliseconds
      
      // Check if we've already sent a notification for this medication today
      const notificationKey = `${med.id}-${currentDate}`
      const lastNotified = this.lastNotificationTime[notificationKey]
      const hasNotifiedToday = lastNotified && lastNotified === currentDate
      
      return isTimeMatch && !hasNotifiedToday
    })

    if (dueMedications.length > 0) {
      const medicationNames = dueMedications.map(med => med.name).join(', ')
      
      // Request notification permission if not already granted
      if (Notification.permission === 'default') {
        await Notification.requestPermission()
      }
      
      // Show browser notification if permission granted
      if (Notification.permission === 'granted') {
        new Notification('Medication Reminder', {
          body: `Time to take: ${medicationNames}`,
          tag: 'medication-reminder',
          requireInteraction: true
        })
      } else {
        // Fallback to console log
        console.log(`Reminder: Time to take ${medicationNames}`)
      }
      
      // Mark these medications as notified today
      dueMedications.forEach(med => {
        const notificationKey = `${med.id}-${currentDate}`
        this.lastNotificationTime[notificationKey] = currentDate
      })
    }
  }
}

// Create a singleton instance
const reminderService = new ReminderService()

export default reminderService
