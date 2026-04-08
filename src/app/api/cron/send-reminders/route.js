import { POST as sendMedicationReminders } from '../send-medication-reminders/route'

// Backward compatibility for existing schedulers still calling /api/cron/send-reminders
export async function POST(request) {
  return sendMedicationReminders(request)
}

