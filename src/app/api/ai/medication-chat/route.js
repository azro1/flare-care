import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const STAGES = {
  MISSED_YN: 'missed_yes_no',
  MISSED_NAME: 'missed_name',
  MISSED_DATE: 'missed_date',
  MISSED_TIME: 'missed_time',
  MISSED_ADD_MORE: 'missed_add_more',
  NSAID_YN: 'nsaid_yes_no',
  NSAID_NAME: 'nsaid_name',
  NSAID_DATE: 'nsaid_date',
  NSAID_TIME: 'nsaid_time',
  NSAID_DOSE: 'nsaid_dose',
  NSAID_ADD_MORE: 'nsaid_add_more',
  ANTIBIOTIC_YN: 'antibiotic_yes_no',
  ANTIBIOTIC_NAME: 'antibiotic_name',
  ANTIBIOTIC_DATE: 'antibiotic_date',
  ANTIBIOTIC_TIME: 'antibiotic_time',
  ANTIBIOTIC_DOSE: 'antibiotic_dose',
  ANTIBIOTIC_ADD_MORE: 'antibiotic_add_more',
  READY: 'ready_for_review',
}

function initializeDraft(input) {
  const base = input && typeof input === 'object' ? input : {}
  return {
    missedMedications: Array.isArray(base.missedMedications) ? base.missedMedications : [],
    nsaids: Array.isArray(base.nsaids) ? base.nsaids : [],
    antibiotics: Array.isArray(base.antibiotics) ? base.antibiotics : [],
    meta: {
      stage: base?.meta?.stage || STAGES.MISSED_YN,
      skipped: {
        missed: Boolean(base?.meta?.skipped?.missed),
        nsaid: Boolean(base?.meta?.skipped?.nsaid),
        antibiotic: Boolean(base?.meta?.skipped?.antibiotic),
      },
      currentEntry: base?.meta?.currentEntry && typeof base.meta.currentEntry === 'object' ? base.meta.currentEntry : {},
    },
  }
}

function parseYesNo(text) {
  const v = String(text || '').trim().toLowerCase()
  if (!v) return null
  if (['yes', 'y', 'yeah', 'yep', 'true'].includes(v)) return true
  if (['no', 'n', 'nope', 'false'].includes(v)) return false
  return null
}

function parseDate(text) {
  const value = String(text || '').trim().toLowerCase()
  if (!value) return null
  if (value === 'today') return new Date().toISOString().slice(0, 10)
  if (value === 'yesterday') {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return d.toISOString().slice(0, 10)
  }
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`
  const ukMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (ukMatch) {
    const day = ukMatch[1].padStart(2, '0')
    const month = ukMatch[2].padStart(2, '0')
    const year = ukMatch[3]
    return `${year}-${month}-${day}`
  }
  return null
}

function parseTimeOfDay(text) {
  const value = String(text || '').trim().toLowerCase()
  if (!value) return null
  if (value.includes('morning')) return 'Morning'
  if (value.includes('afternoon')) return 'Afternoon'
  if (value.includes('evening')) return 'Evening'
  if (value.includes('night')) return 'Night'
  return null
}

function parseDosage(text) {
  const digits = String(text || '').replace(/\D/g, '').slice(0, 5)
  return digits || null
}

function isLikelyMedicationName(text) {
  const value = String(text || '').trim()
  if (!value) return false
  const lower = value.toLowerCase()
  const uncertainPhrases = [
    'not sure',
    'dont know',
    "don't know",
    'something',
    'whatever',
    'maybe',
    'i think',
    'last night',
    'well',
  ]
  if (uncertainPhrases.some((phrase) => lower.includes(phrase))) return false
  const words = value.split(/\s+/).filter(Boolean)
  // Medication names are usually short labels, not sentence-like inputs.
  if (words.length > 4) return false
  return true
}

function reply({ assistantMessage, draft, status = 'needs_more_info', nextQuestion = null, missingFields = [], warnings = [] }) {
  return NextResponse.json({
    assistantMessage,
    status,
    nextQuestion,
    draft,
    missingFields,
    warnings,
  })
}

function missingFromDraft(draft) {
  const missing = []
  draft.missedMedications.forEach((item, i) => {
    if (!item.medicationName) missing.push({ path: `draft.missedMedications[${i}].medicationName`, reason: 'required' })
    if (!item.date) missing.push({ path: `draft.missedMedications[${i}].date`, reason: 'required' })
    if (!item.time) missing.push({ path: `draft.missedMedications[${i}].time`, reason: 'required' })
  })
  draft.nsaids.forEach((item, i) => {
    if (!item.name) missing.push({ path: `draft.nsaids[${i}].name`, reason: 'required' })
    if (!item.date) missing.push({ path: `draft.nsaids[${i}].date`, reason: 'required' })
    if (!item.time) missing.push({ path: `draft.nsaids[${i}].time`, reason: 'required' })
    if (!item.dose) missing.push({ path: `draft.nsaids[${i}].dose`, reason: 'required' })
  })
  draft.antibiotics.forEach((item, i) => {
    if (!item.name) missing.push({ path: `draft.antibiotics[${i}].name`, reason: 'required' })
    if (!item.date) missing.push({ path: `draft.antibiotics[${i}].date`, reason: 'required' })
    if (!item.time) missing.push({ path: `draft.antibiotics[${i}].time`, reason: 'required' })
    if (!item.dose) missing.push({ path: `draft.antibiotics[${i}].dose`, reason: 'required' })
  })
  return missing
}

export async function POST(request) {
  try {
    const body = await request.json()
    const userMessage = String(body?.userMessage || '').trim()
    const draft = initializeDraft(body?.draft)
    const stage = draft.meta.stage

    if (!userMessage && stage === STAGES.MISSED_YN) {
      return reply({
        draft,
        assistantMessage: 'Did you miss any prescribed medications recently? Reply yes or no.',
        nextQuestion: { field: 'missedMedications', prompt: 'Did you miss any prescribed medications recently?', options: ['Yes', 'No'] },
      })
    }

    if (stage === STAGES.MISSED_YN) {
      const yn = parseYesNo(userMessage)
      if (yn == null) {
        return reply({
          draft,
          assistantMessage: 'Please answer with yes or no. Did you miss any prescribed medications recently?',
          status: 'clarification_needed',
          nextQuestion: { field: 'missedMedications', prompt: 'Did you miss any prescribed medications recently?', options: ['Yes', 'No'] },
        })
      }
      if (!yn) {
        draft.meta.skipped.missed = true
        draft.meta.stage = STAGES.NSAID_YN
        return reply({
          draft,
          assistantMessage: 'Okay, no missed prescribed medications logged. Did you take any NSAIDs recently? Reply yes or no.',
          nextQuestion: { field: 'nsaids', prompt: 'Did you take any NSAIDs recently?', options: ['Yes', 'No'] },
        })
      }
      draft.meta.stage = STAGES.MISSED_NAME
      return reply({
        draft,
        assistantMessage: 'Which prescribed medication did you miss?',
        nextQuestion: { field: 'missedMedications.medicationName', prompt: 'Medication name', options: [] },
      })
    }

    if (stage === STAGES.MISSED_NAME) {
      if (!userMessage) {
        return reply({ draft, status: 'clarification_needed', assistantMessage: 'Please enter the medication name you missed.' })
      }
      if (!isLikelyMedicationName(userMessage)) {
        return reply({
          draft,
          status: 'clarification_needed',
          assistantMessage: 'Please enter just the medication name (for example: Prednisolone).',
        })
      }
      draft.meta.currentEntry = { medicationName: userMessage }
      draft.meta.stage = STAGES.MISSED_DATE
      return reply({
        draft,
        assistantMessage: 'What date was it missed? (e.g. today, yesterday, or DD/MM/YYYY)',
        nextQuestion: { field: 'missedMedications.date', prompt: 'Missed date', options: ['Today', 'Yesterday'] },
      })
    }

    if (stage === STAGES.MISSED_DATE) {
      const date = parseDate(userMessage)
      if (!date) {
        return reply({ draft, status: 'clarification_needed', assistantMessage: 'I could not read that date. Try today, yesterday, or DD/MM/YYYY.' })
      }
      draft.meta.currentEntry.date = date
      draft.meta.stage = STAGES.MISSED_TIME
      return reply({
        draft,
        assistantMessage: 'What time of day was it missed? Morning, afternoon, evening, or night.',
        nextQuestion: { field: 'missedMedications.time', prompt: 'Time of day', options: ['Morning', 'Afternoon', 'Evening', 'Night'] },
      })
    }

    if (stage === STAGES.MISSED_TIME) {
      const time = parseTimeOfDay(userMessage)
      if (!time) {
        return reply({ draft, status: 'clarification_needed', assistantMessage: 'Please choose one: morning, afternoon, evening, or night.' })
      }
      draft.missedMedications.push({
        medicationName: draft.meta.currentEntry.medicationName,
        date: draft.meta.currentEntry.date,
        time,
        dose: null,
      })
      draft.meta.currentEntry = {}
      draft.meta.stage = STAGES.MISSED_ADD_MORE
      return reply({
        draft,
        assistantMessage: 'Added. Do you want to add another missed prescribed medication? Reply yes or no.',
        nextQuestion: { field: 'missedMedications.addMore', prompt: 'Add another missed medication?', options: ['Yes', 'No'] },
      })
    }

    if (stage === STAGES.MISSED_ADD_MORE) {
      const yn = parseYesNo(userMessage)
      if (yn == null) {
        return reply({ draft, status: 'clarification_needed', assistantMessage: 'Please answer yes or no. Add another missed medication?' })
      }
      if (yn) {
        draft.meta.stage = STAGES.MISSED_NAME
        return reply({ draft, assistantMessage: 'Which prescribed medication did you miss?' })
      }
      draft.meta.stage = STAGES.NSAID_YN
      return reply({
        draft,
        assistantMessage: 'Did you take any NSAIDs recently? Reply yes or no.',
        nextQuestion: { field: 'nsaids', prompt: 'Did you take any NSAIDs recently?', options: ['Yes', 'No'] },
      })
    }

    if (stage === STAGES.NSAID_YN) {
      const yn = parseYesNo(userMessage)
      if (yn == null) return reply({ draft, status: 'clarification_needed', assistantMessage: 'Please answer yes or no. Did you take any NSAIDs recently?' })
      if (!yn) {
        draft.meta.skipped.nsaid = true
        draft.meta.stage = STAGES.ANTIBIOTIC_YN
        return reply({
          draft,
          assistantMessage: 'Did you take any antibiotics recently? Reply yes or no.',
          nextQuestion: { field: 'antibiotics', prompt: 'Did you take any antibiotics recently?', options: ['Yes', 'No'] },
        })
      }
      draft.meta.stage = STAGES.NSAID_NAME
      return reply({ draft, assistantMessage: 'Which NSAID did you take?' })
    }

    if (stage === STAGES.NSAID_NAME) {
      if (!userMessage) return reply({ draft, status: 'clarification_needed', assistantMessage: 'Please enter the NSAID name.' })
      if (!isLikelyMedicationName(userMessage)) {
        return reply({
          draft,
          status: 'clarification_needed',
          assistantMessage: 'Please enter just the NSAID name (for example: Ibuprofen).',
        })
      }
      draft.meta.currentEntry = { name: userMessage }
      draft.meta.stage = STAGES.NSAID_DATE
      return reply({ draft, assistantMessage: 'What date was it taken? (e.g. today, yesterday, or DD/MM/YYYY)' })
    }

    if (stage === STAGES.NSAID_DATE) {
      const date = parseDate(userMessage)
      if (!date) return reply({ draft, status: 'clarification_needed', assistantMessage: 'I could not read that date. Try today, yesterday, or DD/MM/YYYY.' })
      draft.meta.currentEntry.date = date
      draft.meta.stage = STAGES.NSAID_TIME
      return reply({ draft, assistantMessage: 'What time of day was it taken? Morning, afternoon, evening, or night.' })
    }

    if (stage === STAGES.NSAID_TIME) {
      const time = parseTimeOfDay(userMessage)
      if (!time) return reply({ draft, status: 'clarification_needed', assistantMessage: 'Please choose one: morning, afternoon, evening, or night.' })
      draft.meta.currentEntry.time = time
      draft.meta.stage = STAGES.NSAID_DOSE
      return reply({ draft, assistantMessage: 'What dosage did you take? (e.g. 200mg)' })
    }

    if (stage === STAGES.NSAID_DOSE) {
      const dose = parseDosage(userMessage)
      if (!dose) return reply({ draft, status: 'clarification_needed', assistantMessage: 'Please provide a dosage in mg, numbers only (example: 200).' })
      draft.nsaids.push({
        name: draft.meta.currentEntry.name,
        date: draft.meta.currentEntry.date,
        time: draft.meta.currentEntry.time,
        dose,
      })
      draft.meta.currentEntry = {}
      draft.meta.stage = STAGES.NSAID_ADD_MORE
      return reply({ draft, assistantMessage: 'Added. Do you want to add another NSAID entry? Reply yes or no.' })
    }

    if (stage === STAGES.NSAID_ADD_MORE) {
      const yn = parseYesNo(userMessage)
      if (yn == null) return reply({ draft, status: 'clarification_needed', assistantMessage: 'Please answer yes or no. Add another NSAID entry?' })
      if (yn) {
        draft.meta.stage = STAGES.NSAID_NAME
        return reply({ draft, assistantMessage: 'Which NSAID did you take?' })
      }
      draft.meta.stage = STAGES.ANTIBIOTIC_YN
      return reply({ draft, assistantMessage: 'Did you take any antibiotics recently? Reply yes or no.' })
    }

    if (stage === STAGES.ANTIBIOTIC_YN) {
      const yn = parseYesNo(userMessage)
      if (yn == null) return reply({ draft, status: 'clarification_needed', assistantMessage: 'Please answer yes or no. Did you take any antibiotics recently?' })
      if (!yn) {
        draft.meta.skipped.antibiotic = true
        draft.meta.stage = STAGES.READY
        const missing = missingFromDraft(draft)
        return reply({
          draft,
          status: missing.length ? 'needs_more_info' : 'ready_for_review',
          assistantMessage: missing.length ? 'I still need a few details before review.' : 'Thanks. Your medication tracking draft is ready for review.',
          missingFields: missing,
        })
      }
      draft.meta.stage = STAGES.ANTIBIOTIC_NAME
      return reply({ draft, assistantMessage: 'Which antibiotic did you take?' })
    }

    if (stage === STAGES.ANTIBIOTIC_NAME) {
      if (!userMessage) return reply({ draft, status: 'clarification_needed', assistantMessage: 'Please enter the antibiotic name.' })
      if (!isLikelyMedicationName(userMessage)) {
        return reply({
          draft,
          status: 'clarification_needed',
          assistantMessage: 'Please enter just the antibiotic name (for example: Amoxicillin).',
        })
      }
      draft.meta.currentEntry = { name: userMessage }
      draft.meta.stage = STAGES.ANTIBIOTIC_DATE
      return reply({ draft, assistantMessage: 'What date was it taken? (e.g. today, yesterday, or DD/MM/YYYY)' })
    }

    if (stage === STAGES.ANTIBIOTIC_DATE) {
      const date = parseDate(userMessage)
      if (!date) return reply({ draft, status: 'clarification_needed', assistantMessage: 'I could not read that date. Try today, yesterday, or DD/MM/YYYY.' })
      draft.meta.currentEntry.date = date
      draft.meta.stage = STAGES.ANTIBIOTIC_TIME
      return reply({ draft, assistantMessage: 'What time of day was it taken? Morning, afternoon, evening, or night.' })
    }

    if (stage === STAGES.ANTIBIOTIC_TIME) {
      const time = parseTimeOfDay(userMessage)
      if (!time) return reply({ draft, status: 'clarification_needed', assistantMessage: 'Please choose one: morning, afternoon, evening, or night.' })
      draft.meta.currentEntry.time = time
      draft.meta.stage = STAGES.ANTIBIOTIC_DOSE
      return reply({ draft, assistantMessage: 'What dosage did you take? (e.g. 200mg)' })
    }

    if (stage === STAGES.ANTIBIOTIC_DOSE) {
      const dose = parseDosage(userMessage)
      if (!dose) return reply({ draft, status: 'clarification_needed', assistantMessage: 'Please provide a dosage in mg, numbers only (example: 500).' })
      draft.antibiotics.push({
        name: draft.meta.currentEntry.name,
        date: draft.meta.currentEntry.date,
        time: draft.meta.currentEntry.time,
        dose,
      })
      draft.meta.currentEntry = {}
      draft.meta.stage = STAGES.ANTIBIOTIC_ADD_MORE
      return reply({ draft, assistantMessage: 'Added. Do you want to add another antibiotic entry? Reply yes or no.' })
    }

    if (stage === STAGES.ANTIBIOTIC_ADD_MORE) {
      const yn = parseYesNo(userMessage)
      if (yn == null) return reply({ draft, status: 'clarification_needed', assistantMessage: 'Please answer yes or no. Add another antibiotic entry?' })
      if (yn) {
        draft.meta.stage = STAGES.ANTIBIOTIC_NAME
        return reply({ draft, assistantMessage: 'Which antibiotic did you take?' })
      }
      draft.meta.stage = STAGES.READY
      const missing = missingFromDraft(draft)
      return reply({
        draft,
        status: missing.length ? 'needs_more_info' : 'ready_for_review',
        assistantMessage: missing.length ? 'I still need a few details before review.' : 'Thanks. Your medication tracking draft is ready for review.',
        missingFields: missing,
      })
    }

    const missing = missingFromDraft(draft)
    return reply({
      draft,
      status: missing.length ? 'needs_more_info' : 'ready_for_review',
      assistantMessage: missing.length ? 'I still need a few details before review.' : 'Your medication tracking draft is ready for review.',
      missingFields: missing,
    })
  } catch (error) {
    console.error('Error in medication-chat route:', error)
    return NextResponse.json({ error: 'Failed to process medication chat.' }, { status: 500 })
  }
}

