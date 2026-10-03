# Auth Landing Rebuild Summary - Deep Lagoon Design

## Commits
- **bde97b5**: Rebuild auth landing screens to match Deep Lagoon mockups
- **fc2aba1**: Remove temporary auth landing template file
- **Branch**: `design/teal-redesign`
- **Base**: `mobile-native` (6c82dbd8099529f9bef32c38d968c858c3ed2df6)

## Files Changed
1. **apps/mobile/components/GoogleGIcon.tsx** (new)
   - Official 4-color Google "G" SVG icon using react-native-svg
   - Paths with fills: #4285F4 (blue), #34A853 (green), #FBBC05 (yellow), #EA4335 (red)

2. **apps/mobile/App.tsx**
   - Imported GoogleGIcon component
   - Complete structural rebuild of AuthScreen landing (step === "method"):
     * Removed old Animated.View cascades, authBlue/onPrimaryChrome conditionals
     * New layout: plain background → logo+tagline in upper-middle → flex spacer → bottom-pinned actions
     * First-time variant: "Continue with email" (teal, mail icon) + "Continue with Google" (secondary with 4-color G) + legal footer
     * Returning variant: "Welcome back, <name>" + "Unlock with fingerprint" + fallback link + legal footer
     * Removed duplicate quick-unlock overlay section (now integrated)
     * Cleaned up email/code entry screens (removed onPrimary/authBlue conditionals)
   - Added new styles:
     * authLandingTop, authLandingTaglineNew, authLandingBottom
     * authWelcomeBack, authFallbackLink, authFallbackLinkText

## Layout Structure (Matching Mockups)

### First-Time Landing
```
┌─────────────────────────┐
│  Status Bar (safe area) │
├─────────────────────────┤
│                         │
│    [270px Logo Image]   │  ← Upper-middle, centered
│   Your Health. Your     │  ← Two-line tagline
│   IBD. Your Control.    │     Secondary text color
│                         │
│        (flex: 1)        │  ← Spacer pushes bottom content down
│                         │
│ ┌─────────────────────┐ │
│ │ Continue with email │ │  ← 56px height, teal, mail icon
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ Continue with Google│ │  ← 56px height, secondary dark, 4-color G
│ └─────────────────────┘ │
│  By continuing you      │  ← Legal footer
│  agree to our...        │
└─────────────────────────┘
```

### Returning User Landing
```
┌─────────────────────────┐
│  Status Bar (safe area) │
├─────────────────────────┤
│                         │
│    [270px Logo Image]   │  ← Same position as first-time
│   Your Health. Your     │
│   IBD. Your Control.    │
│                         │
│        (flex: 1)        │
│                         │
│  Welcome back, Simon    │  ← Secondary text, 18px medium
│ ┌─────────────────────┐ │
│ │ Unlock with Face ID │ │  ← 56px height, teal, fingerprint icon
│ └─────────────────────┘ │
│  Use email or Google    │  ← Link text (reveals email/Google)
│      instead            │
│  By continuing you      │
│  agree to our...        │
└─────────────────────────┘
```

## Color Tokens Applied
- **Light mode background**: #F4F7F8 (plain, not authBlue)
- **Dark mode background**: #0B0E11
- **Primary button**: #0E7C7B (teal)
- **Secondary button light**: bg #0D234B (navy), text white
- **Secondary button dark**: bg #1C242B, border #5E727E (1px), text white
- **Text secondary light**: #4F5D6E
- **Text secondary dark**: #9AAAB6
- **Link light**: #0B6A69
- **Link dark**: #5CC8C2
- **Legal footer light**: #7F929B
- **Legal footer dark**: #5A6D79

## Key Changes vs. Previous Implementation
1. **Removed** solid primary (authBlue) background fill
2. **Removed** old auth landing panels and cascade animations on method screen
3. **Removed** "Secure sign-in" badge below buttons
4. **Removed** old quick-unlock floating overlay (lines 1508-1581 deleted)
5. **Added** clean flex-based layout with upper-middle logo+tagline and bottom-pinned actions
6. **Added** proper 4-color Google G SVG (not monochrome Ionicon)
7. **Changed** button height to 56px (was variable)
8. **Changed** icon size to 18px (was 16px)
9. **Integrated** quick-unlock into method screen conditionally instead of overlay
10. **Kept** tap-to-unlock behavior (no auto-prompt as originally intended)

## Verification
- TypeScript typecheck: ✅ No new errors (pre-existing errors unrelated)
- Layout verification: See `auth-landing-verification.html` for side-by-side comparison
- Logo aspect ratio: 3.03:1 (3780×1248 assets)
- Button sizing: 56px height, full-width with 24px horizontal padding
- Spacing: 12px gap between buttons, 24px above legal footer

## Status
✅ Complete structural rebuild matching mockups
✅ Pushed to origin/design/teal-redesign
✅ No pull request opened (per instructions)
✅ Base branch mobile-native untouched
