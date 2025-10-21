# Issues to Fix After Styling

## 1. Meal Section Logic Bug
**Problem**: Users can add food items AND check "I didn't eat anything" at the same time, causing conflicting information in the review form.

**Location**: `src/app/symptoms/page.js` - Meal tracking section (Step 13)

**Expected Behavior**: When user checks "I didn't eat anything" for a meal, it should clear any existing food items for that meal, or vice versa.

## 2. Inconsistent Redirect Behavior
**Problem**: After logging a symptom, sometimes users are redirected to the dashboard (`/`) and sometimes to the symptoms wizard landing page.

**Location**: `src/app/symptoms/page.js` - `handleSubmit` function (line 532)

**Current Code**: `router.push('/')`

**Expected Behavior**: Should consistently redirect to dashboard after successful symptom logging.

## 3. Symptom Status Display Bug
**Problem**: When logging a symptom as "ongoing" (no end date set), the symptom details page incorrectly shows "Resolved" instead of "Ongoing".

**Location**: `src/app/symptoms/[id]/page.js` - Status display logic

**Expected Behavior**: Should show "Ongoing" when `isOngoing` is true and no end date is set, "Resolved" only when an end date is provided.

---

*These issues should be addressed after completing all styling updates.*
