# Notes for commit – details page updates

## What we did today

### Symptom log details page (`src/app/symptoms/[id]/page.js`)
- Moved title ("Symptom log"), date/time, and trash icon into the Overview card
- Removed "Overview" heading
- Added separator (border) under the date section
- Tighter spacing on mobile: `mt-1 sm:mt-2` for Status, Severity, Stress level
- Meals: quantity shown on the right of each item (flex layout)
- Meals: tighter spacing – `mb-1 sm:mb-2` for section titles, `py-1 sm:py-2` for rows, `space-y-3 sm:space-y-4`

### Medication log details page (`src/app/medications/track/[id]/page.js`)
- Same layout changes as symptom details
- Moved title ("Medication log"), date/time, and trash icon into the Overview card
- Removed "Overview" heading
- Added separator under the date section
- Tighter spacing: `mt-1 sm:mt-2` for Missed doses, NSAIDs, Antibiotics

---

## Commit message suggestion

```
feat: improve symptom and medication log details layout

- Move title, date/time, trash icon into Overview card for both pages
- Remove Overview heading, add separator under date
- Tighter mobile spacing for overview items
- Meals: quantity on right, tighter spacing
```

---

## Tomorrow
- Reports page: change or remove the cards at the bottom
- Do something different for that section
