import { toDate } from 'date-fns-tz'

/** Appointments and medication times are stored as UK wall clock (en-GB). */
export const APP_TIMEZONE = 'Europe/London'

/**
 * Parse calendar date + HH:mm as local time in Europe/London → UTC Date.
 * @param {string} dateStr YYYY-MM-DD
 * @param {string} [timeStr] HH:mm (optional; defaults 00:00)
 */
export function parseUkLocalDateTime(dateStr, timeStr) {
  if (!dateStr || typeof dateStr !== 'string') return new Date(NaN)
  const m = timeStr && /^\d{1,2}:\d{2}/.test(String(timeStr))
    ? String(timeStr).match(/^(\d{1,2}):(\d{2})/)
    : null
  const hh = m ? m[1].padStart(2, '0') : '00'
  const mm = m ? m[2].padStart(2, '0') : '00'
  return toDate(`${dateStr}T${hh}:${mm}:00`, { timeZone: APP_TIMEZONE })
}

/**
 * Current clock time in Europe/London as HH:mm for matching `medications.time_of_day`.
 */
export function getLondonTimeHHmm(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: APP_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(date)
  const hour = parts.find(p => p.type === 'hour')?.value ?? '00'
  const minute = parts.find(p => p.type === 'minute')?.value ?? '00'
  return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`
}

/** DB may store `07:00` or legacy `7:00` — match both in cron queries. */
export function timeOfDayQueryVariants(paddedHHmm) {
  const [h, m] = paddedHHmm.split(':')
  const unpadded = `${parseInt(h, 10)}:${m}`
  return paddedHHmm === unpadded ? [paddedHHmm] : [paddedHHmm, unpadded]
}
