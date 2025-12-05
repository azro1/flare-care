# Fix medication reminder time defaulting on edit

- Fixed issue where editing a medication without a reminder time would default to 7:00
- Changed `startEdit` function to use nullish coalescing operator (`??`) instead of logical OR (`||`)
- Now preserves empty reminder times when editing - reminder time only set when user explicitly selects one
