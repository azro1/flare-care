# FlareCare Mobile (native)

**FlareCare** is a **personal health companion for people living with inflammatory bowel disease (IBD)**—especially **Crohn’s disease** and **ulcerative colitis**. The app helps you **track day‑to‑day data** (symptoms, medications, hydration, bowel movements, weight, appointments), **see summaries** on a dashboard, **prepare for clinic visits** (reports / briefs), and **stay on schedule** with reminders—**on your phone**, with a **fixed light or dark** appearance you choose in Account.

**It is not medical advice.** It does not diagnose or treat. Always follow your qualified clinicians.

This folder is the **native mobile app** (Expo / React Native, **iOS + Android**). It is built to align with the **existing web app’s behaviour and APIs** where parity matters; you do **not** need to re‑explain product intent in every new chat if this file stays current.

---

## Who it is for

- Adults managing **IBD** who want **simple, consistent tracking** between appointments.
- Anyone already using **FlareCare on the web** who wants the same flows on mobile (auth, data model, and many behaviours are shared).

---

## What the mobile app does (feature areas)

- **Auth:** Email **OTP** sign-in (countdown, resend limits, friendly errors) and **Google** sign-in via Supabase — see **§ Email OTP verification** below.
- **Dashboard:** Home overview, **weather** (via your web API where configured), **news** rail when available, shortcuts into trackers.
- **Core tracking:** Symptoms, medications (including “taken” / tracking inserts), **hydration**, **bowel**, **weight**, **appointments**.
- **Reports & briefs:** Mobile report views and sharing / email using the **existing report email API** from the web backend.
- **Reminders:** Native notification permission and **medication reminder** scheduling (FCM on Android; see Firebase notes below).
- **Account:** Profile / email display, **light / dark** theme, **About** (product + contact), **logout** (with confirmation modal).

For **recent UI / polish / changelog-style notes**, see **`CHANGELOG.md`** in this folder.

---

## UI conventions (check before new screens)

Use existing screens as reference — do **not** default to web-style teal hyperlinks.

| Pattern | Reference | Colour / style |
|---------|-----------|----------------|
| **Navigate to another screen** (Account lists, chart link, “View all types”) | `AccountOptionRow` in `App.tsx` | Label **`c.text`**, chevron **`c.textMuted`**, 15px `Inter_400Regular` (medium optional via `labelMedium`) |
| **Inline link in body copy** (e.g. tip “Open chart”) | Hydration **Reset** | **`c.text`** or **`c.textSecondary`** + `textDecorationLine: "underline"` — not `c.primary` |
| **Primary action** (Save, Log now) | `PrimaryButton` | Teal fill — **`c.primary`** |
| **Selected state / type badge / hero feature icon** | Bowel bubbles, dashboard tiles | **`c.primary`** |
| **Form field icons** (calendar, time) | Bowel log sheet | **`c.textSecondary`** — utility, not a CTA |
| **Destructive** | Logout, delete confirm | **`c.destructiveFill`** / `danger` for text |
| **Tips** | Hydration / bowel tip row | Bulb **`#EAB308`** only on the icon; copy **`c.textMuted`** |

**Do not use `c.primary` / `c.link` for tappable text navigation** unless you deliberately want a CTA (e.g. wizard **“Add medication”** in a form — that’s adding data, not leaving the screen).

**New tracker / settings screens:** card layout + `SCREEN_EDGE_PADDING` + `useFlareColors()`; stack routes with `headerOptions` titles; link rows like Account, not a second colour system.

**Live examples:** Account tab (`AccountOptionRow`), **Bowel** (`screens/BowelScreen.tsx`), **Bristol chart** (`screens/BristolGuideScreen.tsx`), **Hydration** (Reset link).

---

## Stack (high level)

- **Expo** (SDK aligned with `package.json`), **React Native**, **TypeScript**.
- **Supabase** client for auth and data (`EXPO_PUBLIC_*` vars below).
- **Theming:** `theme.tsx` — brand accent, light/dark tokens, navigation theme; most screens use `useFlareColors()` / `useFlareTheme()`.
- **Layout & typography tokens:** `lib/layoutConstants.ts` — screen padding, font sizes, collapsing-title spacing (see below).
- **Main UI code** today lives largely in **`App.tsx`** (screens, navigation, shared components). Splitting into modules is optional future work.

---

## Informational pages & collapsing titles

Use this section when adding pages like **What is IBD?** or **About** — long scroll content **without cards**, with a title that **shrinks into the nav bar** on scroll up and **expands back** on scroll down.

**Live examples:** `IbdScreen`, `AboutScreen`, `LegalDocumentScreen` (Privacy Policy / Terms of Use) in `App.tsx`.  
**Route names:** `Ibd`, `About`, `LegalDocument` (`document`: `privacy` | `terms`).

---

### What we built (vs normal screens)

| Normal screen (Meds, Settings, …) | Informational page |
|-----------------------------------|--------------------|
| Fixed **16px** title in nav bar (`FLARE_FONT_SIZE.navTitle`) | **One animated title** — no duplicate nav title |
| Often `Card` layout + **18px** section headings (`sectionTitle`) | No cards; body is plain `Text` / lists |
| Default React Navigation header | **Custom header** (see below) while the screen is mounted |
| `ScrollView` + `styles.screen` in the screen | **`CollapsingTitleScrollScreen`** wraps children (provides the scroll view) |

**Not** the iOS-only `headerLargeTitle` API — our own component works on **iOS and Android**.

**Component:** `components/CollapsingTitleScrollScreen.tsx`  
**Tokens:** `lib/layoutConstants.ts`  
**Nav config:** `App.tsx` → `headerOptions`

---

### Custom header (only on these pages)

When a screen mounts `CollapsingTitleScrollScreen`, it calls `navigation.setOptions({ header: … })` and replaces the default header with **`CollapsingHeader`**:

- Renders **back button** and **overflow menu** from existing `headerOptions` (`headerLeft` / `headerRight`)
- Solid header bar background (theme `screen` colour)
- **`overflow: visible`** so the single `Animated.Text` title can sit below the bar at rest and move up into it without being clipped
- On unmount, header options are reset

Other routes keep the normal stack header. You do **not** add a separate custom header per screen — the wrapper does it.

---

### Typography — use the right tokens

**Do not** hardcode font sizes on info pages. Use `layoutConstants.ts`:

| Token | Value | When to use |
|-------|-------|-------------|
| `INFORMATIONAL_PAGE_TITLE` | 22px / line 27 | Collapsing **page** title at rest — via `titlePreset="informational"` |
| `FLARE_FONT_SIZE.pageTitle` | 22px | Same (part of `INFORMATIONAL_PAGE_TITLE`) |
| `FLARE_FONT_SIZE.navTitle` | 16px | Title **collapsed** in header (automatic) |
| `FLARE_FONT_SIZE.sectionTitle` | 18px | **In-page** section headings (`dashboardSectionTitleLeft`) — *not* the morphing page title |
| `FLARE_FONT_SIZE.body` | 14px | Body paragraphs (`styles.text`) |
| `FLARE_FONT_FAMILY.bold` | Inter Bold | Page title & section headings |

**At rest:** page title is **22px**, left-aligned under the header.  
**Collapsed:** scales to **16px**, centred in the nav bar.  
**In-page headings** (e.g. “What is FlareCare?”, “Contact”) stay **18px** — same as dashboard section titles.

**Layout tokens** (usually only touch these in `layoutConstants.ts`):

| Token | Value | Purpose |
|-------|-------|---------|
| `COLLAPSING_TITLE_GAP_BELOW_HEADER` | 12px | Space between header bar and large title |
| `COLLAPSING_TITLE_CONTENT_GAP` | 16px | Space below title before body (at rest + scroll clearance) |
| `COLLAPSING_TITLE_SCROLL_DISTANCE` | 80px | Scroll distance for full collapse on **long** pages |
| `SCREEN_EDGE_PADDING` | 12px | Horizontal inset (scroll content aligns with title) |

Short pages (e.g. About): collapse finishes over **however far the page can scroll** — handled inside the component; no extra setup.

---

### Content layout rules

1. **Left-align** intro and body under the page title (same as **What is IBD?**). Do **not** centre hero text under a left page title.
2. **Do not** animate body text with the title — only the page title moves; content scrolls normally.
3. **Do not** wrap content in an outer `ScrollView` — `CollapsingTitleScrollScreen` is the scroll view.
4. **Do not** add a second page title in JSX — the wrapper renders it.
5. Section headings inside the page use `styles.dashboardSectionTitleLeft` (18px), not `pageTitle`.
6. Footer bits (e.g. version on About) may stay centred if they’re clearly a footer.

---

### Checklist: add a new informational page

**1. Screen component** (`App.tsx` or extracted file):

```tsx
function MyInfoScreen() {
  const insets = useSafeAreaInsets();
  const bottomScrollInset = useBottomTabScrollInset();

  return (
    <CollapsingTitleScrollScreen
      title="My Page Title"
      titlePreset="informational"
      bottomInset={Math.max(insets.bottom, 16) + 48 + bottomScrollInset}
    >
      <Text style={[styles.text, { color: c.textMuted }]}>Intro paragraph…</Text>
      <Text style={[styles.dashboardSectionTitleLeft, { color: c.text }]}>Section</Text>
      {/* more content */}
    </CollapsingTitleScrollScreen>
  );
}
```

Copy `bottomInset` from `IbdScreen` / `AboutScreen` so content clears the bottom tab bar.

**2. Stack route** — register in `AppStack.Navigator`:

```tsx
<AppStack.Screen name="MyInfo">{() => <MyInfoScreen />}</AppStack.Screen>
```

**3. `headerOptions`** in `App.tsx` — **empty nav title** so it doesn’t duplicate the morphing title:

```tsx
const isMyInfo = route.name === "MyInfo";
// in headerTitle ternary:
: isMyInfo
  ? ""
  : …
```

**4. Navigation** — link from menu / overflow / wherever (e.g. `navigation.navigate("MyInfo")`).

**5. Verify**

- [ ] Title **22px** left-aligned at rest; **16px** centred in header when scrolled up
- [ ] Back + overflow menu visible
- [ ] Body **left-aligned**, no double scroll, no duplicate title
- [ ] Short page: title still reaches header centre at bottom of scroll
- [ ] Spacing under title feels OK (`COLLAPSING_TITLE_CONTENT_GAP` in one place if tuning)

**6. Update this README** — add the screen name to **Live examples** above.

---

### When *not* to use this

- Card-based screens (Meds, Reminders, Account sub-screens, wizards, …)
- Screens that only need a fixed **16px** nav title
- Anywhere you’d use `styles.screen` + normal `ScrollView` without a morphing title

For those, keep `headerTitle: "…"` in `headerOptions` and **18px** / **16px** tokens as today — no `CollapsingTitleScrollScreen`.

---

### References

- Original iOS-native plan (superseded): `plans/collapsing-large-title-headers.md`
- Implementation: `components/CollapsingTitleScrollScreen.tsx`, `lib/layoutConstants.ts`, `App.tsx` (`IbdScreen`, `AboutScreen`, `headerOptions`)

---

## Email OTP verification

Email sign-in uses a **one-time code** (Supabase OTP). The verification step shows a **live expiry countdown**, controlled **resend**, and user-friendly error copy.

**Implementation:** `lib/otpAuth.ts` (constants + helpers), auth UI in `App.tsx` (`AuthScreen` code step).

### Behaviour

| Phase | What the user sees |
|-------|-------------------|
| **Code sent** | Alert to check email; user enters code on verification step |
| **Time remaining** | `Code expires in M:SS` countdown (no resend button yet) |
| **Expired** | Countdown hidden; **Resend code** enabled (same email, new OTP, timer restarts) |
| **Resend limit** | Max **3** resend taps per attempt (**4** emails total incl. first send); then blocked with clear copy |
| **Bad / expired code** | Friendly message pointing to resend after timer |
| **Leave flow** | Timer state is **not** persisted — restarting sign-in resets the attempt |

Account → Information shows sign-in method as **Email OTP** when applicable.

### Configuration

| Setting | Where | Default |
|---------|--------|---------|
| OTP expiry | Supabase Dashboard → **Auth → Email → OTP expiry** | 15 min (900s) recommended |
| App mirror | `EXPO_PUBLIC_OTP_EXPIRY_SECONDS` in env | `900` — **must match** Supabase |
| Max resends | `OTP_MAX_RESENDS` in `lib/otpAuth.ts` | `3` |

### Key exports (`lib/otpAuth.ts`)

- `OTP_EXPIRY_SECONDS` — from env, fallback 900
- `OTP_MAX_RESENDS` — resend taps after initial send
- `formatOtpCountdown`, `otpRemainingSeconds`, `isOtpExpired`
- `otpVerifyErrorMessage`, `otpResendErrorMessage`

**Later (optional):** thin `sendOtp` / `verifyOtp` / `resendOtp` abstraction if auth provider changes off Supabase.

---

## Required environment variables

Set these before running (e.g. `.env` or your shell, depending on how you load Expo env):

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_WEB_API_BASE_URL` (example: `https://your-web-app.vercel.app`)
- `EXPO_PUBLIC_OTP_EXPIRY_SECONDS` (optional, default `900` — must match Supabase Auth → Email → OTP expiry)

The web base URL is used for things like **weather** and **image proxying** where the mobile app calls your deployed web API.

---

## Run locally

**This folder (`apps/mobile`) is the native app.** The repository root is the **Next.js web app** (`npm run dev` there). For mobile, work here:

```bash
cd apps/mobile
npm install   # first time only
```

- `npm run start`
- `npm run android`
- `npm run ios`

Use a **development build** (`expo-dev-client`) when you rely on native modules (e.g. notifications) beyond Expo Go.

**Physical device on the same Wi‑Fi (especially Windows):** from **`apps/mobile`**, run:

```bash
npm run start:dev-client:lan
```

That runs a small launcher which sets `REACT_NATIVE_PACKAGER_HOSTNAME` to your PC’s best‑guess LAN IPv4 so the QR / dev URL is not stuck on `127.0.0.1`. If it picks the wrong interface (VPN, Docker, etc.), set `REACT_NATIVE_PACKAGER_HOSTNAME` yourself to the IPv4 from `ipconfig` / `ip addr` before starting. **USB Android:** `adb reverse tcp:8081 tcp:8081` is another way to reach Metro without LAN.

---

## Firebase Android (`google-services.json`)

Mobile push uses **Firebase Cloud Messaging (FCM)** on Android. Short checklist: **`FIREBASE_SETUP.md`** in this folder. Broader migration notes: [`MOBILE_MIGRATION_RUNBOOK.md`](../../MOBILE_MIGRATION_RUNBOOK.md).

---

## Store reality (one codebase, two stores)

**Google Play** and the **Apple App Store** are separate: shipping to Play does **not** publish on iOS. iOS needs its own build, **App Store Connect** submission, and **Apple review**.

---

## Keeping this README useful

When you add a **user-visible feature** or change **product positioning**, update the **“What the mobile app does”** and **“Who it is for”** sections here so the next session (or collaborator) gets context without scrolling old chats.

When you add an **informational page** with a collapsing title, follow **§ Informational pages & collapsing titles** and add the screen to the live examples list there.

When you change **auth / OTP** behaviour or Supabase expiry, update **§ Email OTP verification** and keep `EXPO_PUBLIC_OTP_EXPIRY_SECONDS` in sync with the dashboard.
