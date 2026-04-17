import * as yup from 'yup'

/** Matches `STAGES` in `api/ai/medication-chat/route.js` — name-entry steps only */
export const MEDICATION_CHAT_NAME_STAGES = ['missed_name', 'nsaid_name', 'antibiotic_name']

const EXAMPLE_BY_STAGE = {
  missed_name: 'Prednisolone',
  nsaid_name: 'Ibuprofen',
  antibiotic_name: 'Amoxicillin',
}

const UNCERTAIN_PHRASES = [
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

/** Each word (or hyphen chunk) with 4+ letters must contain a vowel — blocks consonant mash like "cdjnkmhdws". */
function everyLongLetterChunkHasVowel(value) {
  const vowel = /[aeiouyAEIOUY]/
  const words = value.trim().split(/\s+/).filter(Boolean)
  for (const raw of words) {
    for (const segment of raw.split('-')) {
      const lettersOnly = segment.replace(/[^a-zA-Z]/g, '')
      if (lettersOnly.length < 4) continue
      if (!vowel.test(lettersOnly)) return false
    }
  }
  return true
}

/**
 * Long “words” that use only the letter e as a vowel (typed spam). Catches e.g. "edffefre frerefr efrferfer fer".
 * May reject very rare real terms (e.g. "efferent"); user can use manual entry.
 */
function noEOnlyVowelSpam(value) {
  const words = value.trim().split(/\s+/).filter(Boolean)
  for (const raw of words) {
    for (const segment of raw.split('-')) {
      const letters = segment.replace(/[^a-zA-Z]/g, '')
      if (letters.length < 7) continue
      const vowels = letters.match(/[aeiouy]/gi) || []
      if (vowels.length < 3) continue
      const hasNonE = vowels.some((v) => v.toLowerCase() !== 'e')
      if (!hasNonE) return false
    }
  }
  return true
}

function buildMedicationNameStringSchema(exampleDrug) {
  const hint = `Please enter just the medication name (for example: ${exampleDrug}).`
  return yup
    .string()
    .transform((v) => (v == null ? '' : String(v).trim()))
    .required('Please enter a name.')
    .min(3, 'Please enter a bit more detail.')
    .max(80, 'Please shorten the name.')
    .test('not-uncertain', hint, (value) => {
      if (!value) return false
      const lower = value.toLowerCase()
      return !UNCERTAIN_PHRASES.some((p) => lower.includes(p))
    })
    .test('word-count', hint, (value) => {
      if (!value) return false
      return value.split(/\s+/).filter(Boolean).length <= 4
    })
    .test(
      'plain-name',
      'Please enter a medication name using letters or numbers — not HTML, tags, or code.',
      (value) => {
        if (!value) return false
        if (/[<>]/.test(value)) return false
        if (/[{}`\\]/.test(value)) return false
        if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(value)) return false
        return true
      }
    )
    .test(
      'looks-like-medication-name',
      'Please enter a real medication name — not mostly numbers or random characters.',
      (value) => {
        if (!value) return false
        const letters = (value.match(/\p{L}/gu) || []).length
        const digits = (value.match(/\d/g) || []).length
        if (letters === 0) return false
        // Short codes like "B12" (1 letter, ≤4 chars) are allowed; long strings need real words.
        if (letters < 2 && value.length > 4) return false
        if (letters >= 2 && digits > letters * 2) return false
        if (digits >= 5 && letters < 3) return false
        // Real names usually contain a vowel (y counts); blocks digit-salts like "21212w1212" (only w).
        if (value.length >= 5 && !/[aeiouyAEIOUY]/.test(value)) return false
        return true
      }
    )
    .test(
      'word-shaped',
      'Please enter a real medication name — each word should look like a name (not random letters).',
      (value) => {
        if (!value) return false
        return everyLongLetterChunkHasVowel(value)
      }
    )
    .test(
      'no-e-only-vowel-spam',
      'Please enter a real medication name — that looks like random typing.',
      (value) => {
        if (!value) return false
        return noEOnlyVowelSpam(value)
      }
    )
}

export function isMedicationChatNameStage(stage) {
  return MEDICATION_CHAT_NAME_STAGES.includes(stage)
}

/**
 * Yup field schema for the chat `message` input when `stage` is a name step; otherwise `null` (use plain `yup.string()`).
 */
export function buildMedicationChatMessageFieldSchema(stage) {
  if (!isMedicationChatNameStage(stage)) return null
  const example = EXAMPLE_BY_STAGE[stage] || 'Prednisolone'
  return buildMedicationNameStringSchema(example)
}

/**
 * Server/client shared validation. Returns `null` if valid or if `stage` is not a name step (caller should skip).
 * Returns error message string if invalid on a name step.
 */
export function validateMedicationChatName(text, stage) {
  if (!isMedicationChatNameStage(stage)) return null
  const example = EXAMPLE_BY_STAGE[stage] || 'Prednisolone'
  try {
    buildMedicationNameStringSchema(example).validateSync(text, { abortEarly: true })
    return null
  } catch (e) {
    if (e instanceof yup.ValidationError) {
      return e.message
    }
    throw e
  }
}
