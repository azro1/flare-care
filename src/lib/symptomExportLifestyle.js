/**
 * Shared lifestyle fields for PDF / CSV / email — matches log_symptoms + legacy column names.
 */

export function normalizeSymptomLogRow(rest) {
  if (!rest || typeof rest !== 'object') return rest
  return {
    ...rest,
    smoker: rest.smoker ?? rest.smoking,
    smoking_habits: rest.smoking_habits ?? rest.smoking_details,
    average_alcohol_units_pw: rest.average_alcohol_units_pw ?? rest.alcohol_habits,
  }
}

/**
 * Human-readable lines for PDF / plain-text email (no leading indent — callers add spacing).
 * @param {object} symptom
 * @param {{ isSmoker?: boolean, isDrinker?: boolean }} [prefs]
 * @returns {string[]}
 */
export function formatLifestyleLinesForExport(symptom, prefs = {}) {
  if (!symptom) return []
  const lines = []
  const habits = (symptom.smoking_habits ?? symptom.smoking_details ?? '').toString().trim()
  const avgAlc = symptom.average_alcohol_units_pw ?? symptom.alcohol_habits ?? ''
  const smoker = symptom.smoker ?? symptom.smoking

  if (typeof smoker === 'boolean') {
    if (smoker === true) {
      lines.push('Smoker: Yes')
      if (habits) lines.push(`Smoking habits: ${habits}`)
    } else {
      lines.push(`Smoker: ${prefs.isSmoker === false ? 'No (non-smoker)' : 'No'}`)
    }
  }

  if (typeof symptom.smoked_on_symptom_day === 'boolean') {
    lines.push(`Smoked on symptom day: ${symptom.smoked_on_symptom_day ? 'Yes' : 'No'}`)
    if (symptom.smoked_on_symptom_day === true && symptom.smoked_amount_on_symptom_day) {
      lines.push(`Smoked amount: ${symptom.smoked_amount_on_symptom_day}`)
    }
  }

  if (symptom.alcohol !== null && symptom.alcohol !== undefined) {
    if (symptom.alcohol === true) {
      lines.push('Alcohol: Yes')
      if (avgAlc !== '' && avgAlc != null) {
        lines.push(`Average alcohol units/week: ${avgAlc}`)
      }
    } else {
      lines.push(`Alcohol: ${prefs.isDrinker === false ? 'No (non-drinker)' : 'No'}`)
    }
  }

  if (typeof symptom.drank_on_symptom_day === 'boolean') {
    lines.push(`Alcohol on symptom day: ${symptom.drank_on_symptom_day ? 'Yes' : 'No'}`)
    if (symptom.drank_on_symptom_day === true && symptom.alcohol_units_on_symptom_day) {
      lines.push(`Alcohol units consumed: ${symptom.alcohol_units_on_symptom_day}`)
    }
  }

  return lines
}

/**
 * Flat row values for CSV (machine-friendly).
 * @param {object} symptom
 * @param {{ isSmoker?: boolean, isDrinker?: boolean }} [prefs]
 * @returns {string[]}
 */
export function lifestyleCsvCells(symptom, prefs = {}) {
  if (!symptom) {
    return ['', '', '', '', '', '', '', '']
  }
  const habits = (symptom.smoking_habits ?? symptom.smoking_details ?? '').toString().trim()
  const avgAlc = symptom.average_alcohol_units_pw ?? symptom.alcohol_habits ?? ''
  const smoker = symptom.smoker ?? symptom.smoking

  const smokerCell =
    typeof smoker === 'boolean'
      ? smoker
        ? 'Yes'
        : prefs.isSmoker === false
          ? 'No (non-smoker)'
          : 'No'
      : ''

  const smokedDay =
    typeof symptom.smoked_on_symptom_day === 'boolean'
      ? symptom.smoked_on_symptom_day
        ? 'Yes'
        : 'No'
      : ''

  const smokedAmt = symptom.smoked_amount_on_symptom_day
  const drinksAlc =
    symptom.alcohol === true
      ? 'Yes'
      : symptom.alcohol === false
        ? prefs.isDrinker === false
          ? 'No (non-drinker)'
          : 'No'
        : ''

  const drankDay =
    typeof symptom.drank_on_symptom_day === 'boolean'
      ? symptom.drank_on_symptom_day
        ? 'Yes'
        : 'No'
      : ''

  const unitsDay = symptom.alcohol_units_on_symptom_day

  return [
    smokerCell,
    habits,
    smokedDay,
    smokedAmt != null && String(smokedAmt).trim() !== '' ? String(smokedAmt) : '',
    drinksAlc,
    avgAlc !== '' && avgAlc != null ? String(avgAlc) : '',
    drankDay,
    unitsDay != null && String(unitsDay).trim() !== '' ? String(unitsDay) : '',
  ]
}
