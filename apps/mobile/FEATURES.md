# FEATURES — list of all the app’s features

Everything users can see and do in Flarecare mobile. Update when you add or remove something.

Not for same-day working lists (`todays_notes.md`), feature plans (`plans/`), or implementation reminders (`DEV_NOTES.md`).

Flarecare helps people with Crohn’s / Colitis track their day and prepare for clinic.
**It is not medical advice.**

---

## How you move around

**Bottom tabs**

1. **Dashboard** — home  
2. **Supplies** — medical supplies list + request  
3. **Logs** — past symptom / medication-tracking / wellbeing entries  
4. **Account** — your settings and sign out  

**Top-right ⋮ menu** (on many screens)

- Settings  
- Info (IBD + nutrition guides)  
- About  
- Help  
- Log out  

---

## Signing in

- Sign in with **email code** or **Google**
- You must accept **Terms** and **Privacy** first
- Optional **fingerprint / Face ID** app lock while signed in
- With lock on, you can unlock again quickly after signing out (same fingerprint / Face ID)
- First-time users get a short **multi-slide intro**
- If there’s no name on the account, it asks for one (**Almost there**)

---

## Home (Dashboard)

**Top**
- Hello + today’s weather (city, condition, temperature)

**Check in**
- **Log Symptoms**
- **Track Medications** (missed meds, NSAIDs, antibiotics — for patterns)
- **My Wellbeing**

**Today’s priorities**  
A short list of what’s still left today. Only unfinished things appear.  
If everything’s done: “You're caught up for today”.  
Long lists can use **View all**.

It can show:
- Take medication (and the time, if you set one)
- Stay hydrated
- Check-in not completed
- Appointment today or tomorrow
- Supplies due / overdue

Reminder only — you don’t tap the lines.  
Hydration **numbers** live under **View progress**.

**My health / My tools / My care** (swipe between three pages)
- Health: Hydration + Bowel on top; My Meds full-width below
- Tools: Weight + Fluid Output stacked left; Food & Drink tall right
- Care: Appointments tall left; Supplies + Reports right

**View progress**  
Slide-up card with:
- Today’s meds status (how many taken)
- Today’s hydration cups
- A graph of progress over time  
Tap through to open My Meds or Hydration.

---

## Logging your health

| What | What it does |
|------|----------------|
| **Log Symptoms** | Record how you feel today (wizard) |
| **Track Medications** | Log missed prescribed meds, plus NSAIDs or antibiotics taken recently (patterns / triggers) |
| **My Wellbeing** | Log mood / wellbeing for the day |
| **My Meds** | Your medicine list (name, dose, reminder time). Open a medicine → **Mark as taken today** |
| **My Hydration** | Count cups of fluid (target is 6). Can reset today’s count. Link to intake guidelines in Help |
| **Bowel Movements** | Log stools. **Bristol Stool Chart** guide (and pick a type while logging) |
| **My Weight** | Log weight |
| **Fluid Output** | Log fluid output in ml. Hub tabs: **Urine** \| **Stoma** \| **Drain** \| **Other** (tap; fade). FAB prefills Type from the active tab; today’s total is for the open tab |
| **Food & Drink** | Optional diary of what you ate/drank with time. Hub tabs: **Food** \| **Drink** (tap; fade). Drinks may note ml. Not calories — for care-team intake notes |

**History**
- **Logs** tab: symptom / medication-tracking / wellbeing lists  
- Each tracker also has its own history / detail screens  

**Editing lists**
- On many lists you can **long-press** to select several items and **delete** them together (meds, appointments, supplies, bowel, weight, logs, etc.)

Some screens show a one-time tip card you can dismiss.

---

## Care / clinic

| What | What it does |
|------|----------------|
| **Appointments** | Upcoming visits; add / edit; optional reminder before the visit. Hub tabs: **Appointments** \| **Summary** (tap; fade). **Past** in the header |
| **Past Appointments** | Older visits |
| **Appointment Summary** | On Appointments → **Summary** tab: pick a period (e.g. last 2 / 4 / 6 weeks or custom dates) → summary with health overview, next appointment, what changed → **Share** or **Email** |
| **Reports** | Longer report for a date range → email |

You always choose when something is sent. Nothing emails itself in the background.

---

## Supplies

For things you reorder regularly (bags, dressings, giving sets, etc.).

**Named orders:** each order has its own name, cadence, due date, stock list, and saved email/subject/message — so you can switch without rewriting.

**First time:** Supplies opens setup — name → how often (including custom weeks) → next due.  
Then add stock on that order with **+**.

**Hub:** cards for each named order (due + cadence). **+** adds another order. Tap a card to manage its stock.

**Request supplies:** pick the order name (dropdown) → loads that order’s stock + wording → Email / Share / Copy message.
**Email** saves **send-to email, subject, and message** for that order (so next week they’re pre-filled) and advances **that** order’s due date. **Share** / **Copy message** only hand off the text — they do not save, advance due, or leave the request screen.


When any order is due or overdue, home shows it under **Today’s priorities**.

**Due-day alert:** if notifications are already on, stocked orders get a local phone alert at **9:00am** on the due date (tap opens that order). Empty orders are skipped; overdue stays on home priorities only (no catch-up ping).

---

## Reminders (phone alerts)

Open from **Settings → Push Notifications / Reminders** (wording in the app).

- Turn permission on/off  
- See how many alerts are scheduled  
- Open phone settings if alerts aren’t arriving  
- Daily alerts for medicines (when a reminder time is set)  
- Alerts before appointments (when a reminder is set)  
- Supply-order due alerts at **9:00am** on the due date (when the order has items and notifications are on). Tap opens that order. Overdue stays on home priorities — no catch-up alert.

---

## Account & info pages

**Account tab**
- Information (created date, sign-in method, account id)
- Personal details (name, email)
- Security (app lock)
- Appearance / theme is also in **Settings**
- Legal — Privacy Policy and Terms (read in the app)
- Help — Notifications, Daily Intake Guidelines, Appointments / summary
- About — product story, disclaimer, support email, app version
- **Delete account** — permanently removes the account and data (with a confirm step)
- Sign out

**Info (from ⋮)**
- **What is IBD?** — plain-language IBD info and how Flarecare helps  
- **Nutrition Guide** — food categories and tips (with a disclaimer)

---

## News (built, usually hidden)

There is a **Latest News** list (open / share articles) and a home news shelf.  
Right now news on home is **turned off** in the app, so you normally won’t see it.

---

## What Flarecare does **not** do

- Give medical advice or tell you to go to A&E  
- Send supply requests or emails by itself  
- Keep a history of old supply requests (not in this version)  
- Remote/server push for supplies (due alerts are **local** device notifications, same as meds/appointments)

---

## Looking ahead (not built yet)

- **More sign-in OAuth** (e.g. Apple) — keep **email** as the main CTA; don’t stack many full-width OAuth buttons on the method screen (fingerprint quick-unlock sits at the bottom and will cover them). Prefer **“More ways to sign in”** → sheet with providers, or a compact icon row. Today: email code + Google only.

---

## Tip for you

When you invent a new feature, add one short line here so future-you knows it’s real.
When something is only planned, put it under **Looking ahead** instead.
