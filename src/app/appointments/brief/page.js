'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import ClinicianEmailModal from '@/components/ClinicianEmailModal'
import { useAuth } from '@/lib/AuthContext'
import { supabase, TABLES } from '@/lib/supabase'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

const WEEK_OPTIONS = [2, 4, 6]
const DAY_MS = 24 * 60 * 60 * 1000

const formatUkDate = (dateLike) => {
  const d = new Date(dateLike)
  if (Number.isNaN(d.getTime())) return 'N/A'
  const day = `${d.getDate()}`.padStart(2, '0')
  const month = `${d.getMonth() + 1}`.padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

const toDayStart = (date) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

const toAppointmentDateTime = (appointment) => {
  if (!appointment?.date) return null
  const base = new Date(appointment.date)
  if (Number.isNaN(base.getTime())) return null

  // If no time is set, treat as end-of-day so same-day entries remain upcoming.
  let hours = 23
  let minutes = 59
  if (typeof appointment.time === 'string' && /^\d{2}:\d{2}$/.test(appointment.time)) {
    const [h, m] = appointment.time.split(':').map(Number)
    if (Number.isFinite(h) && Number.isFinite(m)) {
      hours = h
      minutes = m
    }
  }

  const dt = new Date(base)
  dt.setHours(hours, minutes, 0, 0)
  return dt
}

const safeNumber = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

const average = (nums) => {
  if (!nums.length) return null
  const sum = nums.reduce((acc, n) => acc + n, 0)
  return sum / nums.length
}

const percentage = (value, total) => {
  if (!total) return null
  return Math.round((value / total) * 100)
}

function AppointmentBriefContent() {
  const router = useRouter()
  const { user } = useAuth()
  const [weeks, setWeeks] = useState(4)
  const [rangeMode, setRangeMode] = useState('preset') // 'preset' | 'custom'
  const [customStartDate, setCustomStartDate] = useState(null)
  const [customEndDate, setCustomEndDate] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [rangeError, setRangeError] = useState('')
  const [copied, setCopied] = useState(false)
  const [shared, setShared] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const [brief, setBrief] = useState(null)
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)
  const [emailForm, setEmailForm] = useState({
    consultantEmail: '',
    consultantName: '',
    note: '',
  })
  const [emailError, setEmailError] = useState('')
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [showEmailSentToast, setShowEmailSentToast] = useState(false)
  const [emailToastPortalReady, setEmailToastPortalReady] = useState(false)
  const emailSentToastTimerRef = useRef(null)

  useEffect(() => {
    setEmailToastPortalReady(true)
    return () => {
      if (emailSentToastTimerRef.current) {
        clearTimeout(emailSentToastTimerRef.current)
        emailSentToastTimerRef.current = null
      }
    }
  }, [])

  const loadBrief = useCallback(async () => {
    if (!user?.id) return
    setIsLoading(true)
    setError('')
    setRangeError('')

    const today = toDayStart(new Date())
    let currentStart
    let currentEnd

    if (rangeMode === 'custom') {
      if (!customStartDate || !customEndDate) {
        setIsLoading(false)
        return
      }
      currentStart = toDayStart(customStartDate)
      currentEnd = toDayStart(customEndDate)
      if (currentStart.getTime() > currentEnd.getTime()) {
        setRangeError('Please ensure the start date is before the end date.')
        setIsLoading(false)
        return
      }
    } else {
      currentEnd = today
      const days = weeks * 7
      currentStart = new Date(currentEnd.getTime() - ((days - 1) * DAY_MS))
    }

    const spanDays = Math.max(1, Math.round((currentEnd.getTime() - currentStart.getTime()) / DAY_MS) + 1)
    const previousStart = new Date(currentStart.getTime() - (spanDays * DAY_MS))
    const previousEnd = new Date(currentStart.getTime() - DAY_MS)

    try {
      const [symptomsRes, bowelRes, weightRes, medTrackRes, appointmentsRes] = await Promise.all([
        supabase
          .from(TABLES.LOG_SYMPTOMS)
          .select('severity, symptom_start_date, created_at')
          .eq('user_id', user.id)
          .gte('created_at', previousStart.toISOString())
          .order('created_at', { ascending: false }),
        supabase
          .from(TABLES.BOWEL_MOVEMENTS)
          .select('occurred_at, bristol_type')
          .eq('user_id', user.id)
          .gte('occurred_at', previousStart.toISOString())
          .order('occurred_at', { ascending: false }),
        supabase
          .from(TABLES.TRACK_WEIGHT)
          .select('date, value_kg')
          .eq('user_id', user.id)
          .gte('date', previousStart.toISOString().split('T')[0])
          .order('date', { ascending: false }),
        supabase
          .from(TABLES.LOG_MEDICATIONS)
          .select('created_at, missed_medications_list')
          .eq('user_id', user.id)
          .gte('created_at', previousStart.toISOString())
          .order('created_at', { ascending: false }),
        supabase
          .from(TABLES.APPOINTMENTS)
          .select('id, date, time, type, clinician_name, location, notes')
          .eq('user_id', user.id)
          .gte('date', today.toISOString().split('T')[0])
          .order('date', { ascending: true })
          .order('time', { ascending: true })
      ])

      if (symptomsRes.error) throw symptomsRes.error
      if (bowelRes.error) throw bowelRes.error
      if (weightRes.error) throw weightRes.error
      if (medTrackRes.error) throw medTrackRes.error
      if (appointmentsRes.error) throw appointmentsRes.error

      const inRange = (date, start, end) => {
        if (!date) return false
        const d = toDayStart(date)
        if (Number.isNaN(d.getTime())) return false
        return d >= start && d <= end
      }

      const symptoms = symptomsRes.data || []
      const symptomsCurrent = symptoms.filter((row) => {
        const eventDate = row.symptom_start_date || row.created_at
        return inRange(eventDate, currentStart, currentEnd)
      })
      const symptomsPrevious = symptoms.filter((row) => {
        const eventDate = row.symptom_start_date || row.created_at
        return inRange(eventDate, previousStart, previousEnd)
      })
      const severityCurrent = average(symptomsCurrent.map((row) => safeNumber(row.severity)).filter((n) => n != null))
      const severityPrevious = average(symptomsPrevious.map((row) => safeNumber(row.severity)).filter((n) => n != null))

      const bowelLogs = bowelRes.data || []
      const bowelCurrent = bowelLogs.filter((row) => inRange(row.occurred_at, currentStart, currentEnd))
      const bowelPrevious = bowelLogs.filter((row) => inRange(row.occurred_at, previousStart, previousEnd))
      const currentWeeks = Math.max(1, spanDays / 7)
      const bowelCurrentPerWeek = Number((bowelCurrent.length / currentWeeks).toFixed(1))
      const bowelPreviousPerWeek = Number((bowelPrevious.length / currentWeeks).toFixed(1))
      const bristolCurrentAvg = average(bowelCurrent.map((row) => safeNumber(row.bristol_type)).filter((n) => n != null))
      const bristolPreviousAvg = average(bowelPrevious.map((row) => safeNumber(row.bristol_type)).filter((n) => n != null))

      const weightRows = (weightRes.data || [])
        .map((row) => ({ ...row, parsedDate: new Date(row.date) }))
        .filter((row) => !Number.isNaN(row.parsedDate.getTime()))
      const weightCurrent = weightRows
        .filter((row) => row.parsedDate >= currentStart && row.parsedDate <= currentEnd)
        .sort((a, b) => a.parsedDate - b.parsedDate)
      const startWeight = safeNumber(weightCurrent[0]?.value_kg)
      const endWeight = safeNumber(weightCurrent[weightCurrent.length - 1]?.value_kg)
      const weightDelta = startWeight != null && endWeight != null ? Number((endWeight - startWeight).toFixed(1)) : null

      const medicationTrackingRows = medTrackRes.data || []
      const countMissedItemsInRange = (start, end) => {
        let total = 0
        medicationTrackingRows.forEach((entry) => {
          const list = Array.isArray(entry.missed_medications_list) ? entry.missed_medications_list : []
          list.forEach((item) => {
            const itemDate = item?.date || item?.date_taken || entry.created_at
            if (inRange(itemDate, start, end)) total += 1
          })
        })
        return total
      }
      const missedCurrent = countMissedItemsInRange(currentStart, currentEnd)
      const missedPrevious = countMissedItemsInRange(previousStart, previousEnd)

      const now = new Date()
      const upcomingAppointments = (appointmentsRes.data || []).filter((apt) => {
        const aptDateTime = toAppointmentDateTime(apt)
        return aptDateTime && aptDateTime.getTime() >= now.getTime()
      })
      const nextAppointment = upcomingAppointments[0] || null
      const talkingPoints = []
      if (severityCurrent != null && severityPrevious != null) {
        const diff = severityCurrent - severityPrevious
        if (Math.abs(diff) >= 0.5) {
          talkingPoints.push(
            diff > 0
              ? `Average symptom severity increased by ${diff.toFixed(1)} points.`
              : `Average symptom severity decreased by ${Math.abs(diff).toFixed(1)} points.`
          )
        }
      }
      if (Math.abs(bowelCurrentPerWeek - bowelPreviousPerWeek) >= 1) {
        talkingPoints.push(
          bowelCurrentPerWeek > bowelPreviousPerWeek
            ? `Bowel logs increased to ${bowelCurrentPerWeek}/week from ${bowelPreviousPerWeek}/week.`
            : `Bowel logs dropped to ${bowelCurrentPerWeek}/week from ${bowelPreviousPerWeek}/week.`
        )
      }
      if (weightDelta != null && Math.abs(weightDelta) >= 0.5) {
        talkingPoints.push(
          weightDelta > 0
            ? `Weight is up by ${weightDelta} kg in this period.`
            : `Weight is down by ${Math.abs(weightDelta)} kg in this period.`
        )
      }
      if (missedCurrent > missedPrevious) {
        talkingPoints.push(`More missed medication events were logged (${missedCurrent} vs ${missedPrevious}).`)
      } else if (missedPrevious > missedCurrent) {
        talkingPoints.push(`Fewer missed medication events were logged (${missedCurrent} vs ${missedPrevious}).`)
      }
      if (!talkingPoints.length) {
        talkingPoints.push('No major shifts detected in logged data over this period.')
      }

      setBrief({
        period: {
          start: currentStart,
          end: currentEnd,
          previousStart,
          previousEnd
        },
        symptoms: {
          currentCount: symptomsCurrent.length,
          previousCount: symptomsPrevious.length,
          currentAverage: severityCurrent,
          previousAverage: severityPrevious
        },
        bowel: {
          currentCount: bowelCurrent.length,
          previousCount: bowelPrevious.length,
          currentPerWeek: bowelCurrentPerWeek,
          previousPerWeek: bowelPreviousPerWeek,
          currentBristolAvg: bristolCurrentAvg,
          previousBristolAvg: bristolPreviousAvg
        },
        weight: {
          currentCount: weightCurrent.length,
          startWeight,
          endWeight,
          delta: weightDelta
        },
        medications: {
          missedCurrent,
          missedPrevious,
          changePercent: percentage(Math.max(missedCurrent - missedPrevious, 0), Math.max(missedPrevious, 1))
        },
        nextAppointment,
        talkingPoints
      })
    } catch (fetchError) {
      console.error('Error building appointment brief:', fetchError)
      setError('Could not generate your appointment brief. Please try again.')
      setBrief(null)
    } finally {
      setIsLoading(false)
    }
  }, [customEndDate, customStartDate, rangeMode, user?.id, weeks])

  useEffect(() => {
    if (rangeMode === 'custom' && (!customStartDate || !customEndDate)) return
    loadBrief()
  }, [customEndDate, customStartDate, loadBrief, rangeMode])

  const briefText = useMemo(() => {
    if (!brief) return ''
    const lines = [
      `Appointment Brief (${weeks} weeks)`,
      `${formatUkDate(brief.period.start)} to ${formatUkDate(brief.period.end)}`,
      '',
      `Symptoms: ${brief.symptoms.currentCount} logs, avg severity ${brief.symptoms.currentAverage != null ? brief.symptoms.currentAverage.toFixed(1) : 'N/A'}/10`,
      `Bowel: ${brief.bowel.currentCount} logs (${brief.bowel.currentPerWeek}/week), avg Bristol ${brief.bowel.currentBristolAvg != null ? brief.bowel.currentBristolAvg.toFixed(1) : 'N/A'}`,
      `Weight: ${brief.weight.startWeight != null && brief.weight.endWeight != null ? `${brief.weight.startWeight}kg -> ${brief.weight.endWeight}kg (${brief.weight.delta >= 0 ? '+' : ''}${brief.weight.delta}kg)` : 'Insufficient logs'}`,
      `Missed doses in selected period: ${brief.medications.missedCurrent}`,
      '',
      'What changed:',
      ...brief.talkingPoints.map((point) => `- ${point}`)
    ]
    return lines.join('\n')
  }, [brief, weeks])

  const copyBrief = async () => {
    if (!briefText) return
    try {
      await navigator.clipboard.writeText(briefText)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch (copyError) {
      console.error('Error copying brief:', copyError)
    }
  }

  const shareBrief = async () => {
    if (!briefText || typeof navigator === 'undefined' || !navigator.share) return
    try {
      await navigator.share({
        title: `Appointment Brief (${weeks} weeks)`,
        text: briefText
      })
      setShared(true)
      setTimeout(() => setShared(false), 1800)
    } catch (shareError) {
      // User cancel is expected sometimes.
      if (shareError?.name !== 'AbortError') {
        console.error('Error sharing brief:', shareError)
      }
    }
  }

  const openEmailModal = () => {
    if (!briefText) return
    setEmailError('')
    setIsEmailModalOpen(true)
  }

  const closeEmailModal = () => {
    if (isSendingEmail) return
    setIsEmailModalOpen(false)
  }

  const handleEmailFormChange = (event) => {
    const { name, value } = event.target
    setEmailForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSendBriefEmail = async (event) => {
    event.preventDefault()
    if (!brief) return

    const email = emailForm.consultantEmail.trim()
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setEmailError('Please enter a valid email address.')
      return
    }

    setIsSendingEmail(true)
    setEmailError('')

    try {
      const response = await fetch('/api/send-appointment-brief-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultantEmail: email,
          consultantName: emailForm.consultantName.trim() || null,
          note: emailForm.note.trim() || null,
          period: brief.period,
          briefText,
          summary: {
            symptoms: brief.symptoms,
            bowel: brief.bowel,
            weight: brief.weight,
            medications: brief.medications,
            nextAppointment: brief.nextAppointment,
            talkingPoints: brief.talkingPoints,
          },
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to send email. Please try again.')
      }

      setIsEmailModalOpen(false)
      setEmailForm({ consultantEmail: '', consultantName: '', note: '' })
      if (emailSentToastTimerRef.current) {
        clearTimeout(emailSentToastTimerRef.current)
      }
      setShowEmailSentToast(true)
      emailSentToastTimerRef.current = setTimeout(() => {
        setShowEmailSentToast(false)
        emailSentToastTimerRef.current = null
      }, 4000)
    } catch (sendError) {
      console.error('Error sending appointment brief email:', sendError)
      setEmailError(sendError.message || 'Failed to send email. Please try again.')
    } finally {
      setIsSendingEmail(false)
    }
  }

  const downloadBrief = () => {
    if (!briefText || typeof window === 'undefined') return
    try {
      const blob = new Blob([briefText], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const stamp = new Date().toISOString().split('T')[0]
      link.href = url
      link.download = `appointment-brief-${stamp}.txt`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      setDownloaded(true)
      setTimeout(() => setDownloaded(false), 1800)
    } catch (downloadError) {
      console.error('Error downloading brief:', downloadError)
    }
  }

  const emailSentToastEl =
    showEmailSentToast && emailToastPortalReady ? (
      <div
        className="fixed z-[9999] top-24 right-4 max-w-[min(24rem,calc(100vw-2rem))] rounded-lg shadow-lg border border-black/[0.08] dark:border-white/15 flex items-center gap-3 px-4 py-3"
        style={{ backgroundColor: 'var(--bg-dropdown)' }}
        role="status"
      >
        <div className="flex-shrink-0 flex items-center justify-center w-[1.125rem] h-[1.125rem] rounded-full bg-emerald-100 dark:bg-white" aria-hidden>
          <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <span className="flex-1 text-sm font-medium font-sans" style={{ color: 'var(--text-primary)' }}>
          Summary sent successfully!
        </span>
        <button
          type="button"
          onClick={() => {
            if (emailSentToastTimerRef.current) {
              clearTimeout(emailSentToastTimerRef.current)
              emailSentToastTimerRef.current = null
            }
            setShowEmailSentToast(false)
          }}
          className="flex-shrink-0 p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    ) : null

  const emailToastPortal =
    emailToastPortalReady && typeof document !== 'undefined' && emailSentToastEl
      ? createPortal(emailSentToastEl, document.body)
      : null

  return (
    <div className="max-w-4xl w-full mx-auto sm:px-4 md:px-6 min-w-0">
      {emailToastPortal}
      <div className="mb-5 sm:mb-6 card">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-title text-primary mb-3 sm:mb-6">Appointment Brief</h1>
          <p className="text-sm sm:text-base text-secondary font-sans">
            Auto-generated summary of your recent changes for faster consultations.
          </p>
        </div>
      </div>

      <div className="card mb-5 sm:mb-6">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            loadBrief()
          }}
        >
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap items-center gap-3">
              {WEEK_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setRangeMode('preset')
                    setWeeks(option)
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors border ${
                    rangeMode === 'preset' && weeks === option
                      ? 'bg-[#5F9EA0] text-white border-transparent'
                      : 'bg-[var(--bg-card)] dark:bg-[var(--bg-icon-container)] text-primary border-[var(--border-primary)]'
                  }`}
                  aria-pressed={rangeMode === 'preset' && weeks === option}
                >
                  Last {option} weeks
                </button>
              ))}
              <button
                type="button"
                onClick={() => setRangeMode('custom')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors border ${
                  rangeMode === 'custom'
                    ? 'bg-[#5F9EA0] text-white border-transparent'
                    : 'bg-[var(--bg-card)] dark:bg-[var(--bg-icon-container)] text-primary border-[var(--border-primary)]'
                }`}
                aria-pressed={rangeMode === 'custom'}
              >
                Custom
              </button>
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-sm font-semibold border border-[var(--border-primary)] text-primary sm:ml-auto"
            >
              Refresh
            </button>
          </div>
          {rangeMode === 'custom' && (
            <div className="grid sm:grid-cols-2 gap-4 mt-5">
              <div>
                <label className="block text-xs font-semibold text-secondary mb-2">Start date</label>
                <DatePicker
                  selected={customStartDate}
                  onChange={(date) => setCustomStartDate(date)}
                  maxDate={customEndDate || new Date()}
                  placeholderText="Select start date"
                  dateFormat="dd/MM/yyyy"
                  className="input-field-wizard w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-secondary mb-2">End date</label>
                <DatePicker
                  selected={customEndDate}
                  onChange={(date) => setCustomEndDate(date)}
                  minDate={customStartDate}
                  maxDate={new Date()}
                  placeholderText="Select end date"
                  dateFormat="dd/MM/yyyy"
                  className="input-field-wizard w-full"
                  required
                />
              </div>
            </div>
          )}
        </form>
        {rangeError ? (
          <p className="text-sm font-sans mt-2" style={{ color: 'var(--text-cadet-blue)' }}>{rangeError}</p>
        ) : null}
      </div>

      {isLoading ? (
        <p className="text-center py-12 text-secondary font-sans">Loading...</p>
      ) : error ? (
        <div className="card">
          <p className="text-sm sm:text-base font-sans" style={{ color: 'var(--text-cadet-blue)' }}>{error}</p>
        </div>
      ) : brief ? (
        <>
          <div className="card mb-5 sm:mb-6">
            <h2 className="text-xl font-semibold font-title text-primary mb-2 sm:mb-3">Summary ({formatUkDate(brief.period.start)} - {formatUkDate(brief.period.end)})</h2>
            <div className="card-inner p-4 sm:p-6">
              <div className="space-y-3 text-sm sm:text-base text-primary font-sans">
                <p><span className="font-semibold">Symptoms:</span> {brief.symptoms.currentCount} logs, avg severity {brief.symptoms.currentAverage != null ? `${brief.symptoms.currentAverage.toFixed(1)}/10` : 'N/A'} (prev {brief.symptoms.previousAverage != null ? `${brief.symptoms.previousAverage.toFixed(1)}/10` : 'N/A'})</p>
                <p><span className="font-semibold">Bowel:</span> {brief.bowel.currentCount} logs ({brief.bowel.currentPerWeek}/week), avg Bristol {brief.bowel.currentBristolAvg != null ? brief.bowel.currentBristolAvg.toFixed(1) : 'N/A'}</p>
                <p><span className="font-semibold">Weight:</span> {brief.weight.startWeight != null && brief.weight.endWeight != null ? `${brief.weight.startWeight} kg -> ${brief.weight.endWeight} kg (${brief.weight.delta >= 0 ? '+' : ''}${brief.weight.delta} kg)` : 'Not enough logs in this period'}</p>
                <p>
                  <span className="font-semibold">Missed doses:</span>{' '}
                  {brief.medications.missedCurrent === 0
                    ? 'No missed doses logged in this period'
                    : `${brief.medications.missedCurrent} logged${brief.medications.changePercent != null && brief.medications.missedCurrent > brief.medications.missedPrevious ? ` (up ${brief.medications.changePercent}% vs previous period)` : ''}`}
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              {typeof navigator !== 'undefined' && navigator.share ? (
                <button
                  type="button"
                  onClick={shareBrief}
                  className="button-cadet btn-size-md transition-colors inline-flex items-center justify-center whitespace-nowrap"
                >
                  {shared ? 'Shared' : 'Share'}
                </button>
              ) : null}
              <button
                type="button"
                onClick={openEmailModal}
                className="button-cadet btn-size-md transition-colors inline-flex items-center justify-center whitespace-nowrap"
              >
                Email
              </button>
              <button
                type="button"
                onClick={copyBrief}
                className="button-cadet btn-size-md transition-colors inline-flex items-center justify-center whitespace-nowrap"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button
                type="button"
                onClick={downloadBrief}
                className="button-cadet btn-size-md transition-colors inline-flex items-center justify-center whitespace-nowrap"
              >
                {downloaded ? 'Downloaded' : 'Download .txt'}
              </button>
            </div>
          </div>

          <div className="card mb-5 sm:mb-6">
            <h2 className="text-xl font-semibold font-title text-primary mb-2">Next appointment</h2>
            <div className="card-inner p-4 sm:p-6">
              {brief.nextAppointment ? (
                <div className="space-y-2 text-sm sm:text-base text-primary font-sans">
                  <p><span className="font-semibold">Date:</span> {formatUkDate(brief.nextAppointment.date)}{brief.nextAppointment.time ? ` at ${brief.nextAppointment.time}` : ''}</p>
                  <p><span className="font-semibold">Type:</span> {brief.nextAppointment.type || 'Not set'}</p>
                  {brief.nextAppointment.clinician_name ? <p><span className="font-semibold">Clinician:</span> {brief.nextAppointment.clinician_name}</p> : null}
                  {brief.nextAppointment.location ? <p><span className="font-semibold">Location:</span> {brief.nextAppointment.location}</p> : null}
                  {brief.nextAppointment.notes?.trim() ? <p><span className="font-semibold">Notes:</span> {brief.nextAppointment.notes.trim()}</p> : null}
                </div>
              ) : (
                <p className="text-sm sm:text-base text-secondary font-sans">No upcoming appointment found.</p>
              )}
            </div>
          </div>

          <div className="card mb-5 sm:mb-6">
            <h2 className="text-xl font-semibold font-title text-primary mb-2">What changed</h2>
            <div className="card-inner p-4 sm:p-6">
              <ul className="space-y-2 text-sm sm:text-base text-primary font-sans">
                {brief.talkingPoints.map((point) => (
                  <li key={point}>- {point}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/appointments')}
              className="button-cadet btn-size-lg hover:shadow-lg inline-flex items-center justify-center whitespace-nowrap font-sans w-auto"
            >
              Back to My Appointments
            </button>
          </div>
        </>
      ) : null}

      <ClinicianEmailModal
        isOpen={isEmailModalOpen}
        onClose={closeEmailModal}
        onSubmit={handleSendBriefEmail}
        title="Email this summary"
        description="Please fill in the fields below to send this appointment summary to your clinician."
        periodText={
          brief?.period
            ? `This summary will cover the period from ${formatUkDate(brief.period.start)} to ${formatUkDate(brief.period.end)}.`
            : ''
        }
        emailLabel="Clinician email *"
        nameLabel="Clinician name (optional)"
        noteLabel="Note to include (optional)"
        submitLabel="Send summary"
        isSubmitting={isSendingEmail}
        error={emailError}
        form={emailForm}
        onFormChange={handleEmailFormChange}
        idPrefix="brief-email"
      />
    </div>
  )
}

export default function AppointmentBriefPage() {
  return (
    <ProtectedRoute>
      <AppointmentBriefContent />
    </ProtectedRoute>
  )
}
