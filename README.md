# FlareCare

A personal app for managing Crohn's & Colitis day to day.

## Core Features

- Dashboard with recent activity, daily goals, and health news
- Symptom logging wizard with detail pages
- Medication management with reminders and medication tracking wizard
- Hydration tracking
- Weight and bowel movement tracking with detail pages
- Appointment management with reminders and detail pages
- Appointment Brief generator (2/4/6-week presets + custom range)
- Reports (PDF/CSV)
- Google sign-in with Supabase-backed data

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, JavaScript
- **Styling**: Tailwind CSS with custom components
- **Data Storage**: Supabase + local browser state where needed
- **PDF Export**: jsPDF with text wrapping and pagination
- **Icons**: Lucide React
- **Fonts**: Inter (Next.js `next/font` optimized loading)

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd flare-care
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables** (optional - for cloud sync and push reminders)
   ```bash
   cp .env.example .env.local
   ```
   Add to `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   # For push notifications (medication & appointment reminders):
   NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
   VAPID_PRIVATE_KEY=your_vapid_private_key
   CRON_SECRET=your_cron_secret
   # Optional: For news feed article images (get free key at newsapi.org):
   NEWSAPI_KEY=your_newsapi_key
   ```
   Generate VAPID keys with `npx web-push generate-vapid-keys`.

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

1. **Sign in** with Google
2. **Log symptoms / medications / hydration / bowel / weight**
3. **Manage appointments** and generate an appointment summary
4. **Generate reports** for clinician visits

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/
│   │   └── news/          # Health news API (NewsAPI, MedlinePlus, Google News)
│   ├── about/             # About page
│   ├── auth/              # Authentication pages
│   ├── hydration/         # Hydration tracking
│   ├── appointments/      # Appointment management + brief generator
│   │   ├── [id]/         # Individual appointment details
│   │   └── brief/        # Appointment brief summary page
│   ├── bowel-movements/   # Bowel movement logs
│   │   └── [id]/         # Individual bowel movement details
│   ├── medications/       # Medications management
│   │   └── [id]/         # Individual medication details
│   ├── reports/           # Reports and analytics
│   ├── symptoms/          # Symptom tracking
│   │   └── [id]/         # Individual symptom details
│   ├── weight/            # Weight tracking
│   │   └── [id]/         # Individual weight details
│   ├── globals.css        # Global styles
│   ├── layout.js          # Root layout
│   └── page.js            # Home page
├── components/            # Reusable components
│   ├── AuthForm.js        # Authentication form
│   ├── ConfirmationModal.js # Modal dialogs
│   ├── DatePicker.js      # Date selection component
│   ├── LoadingScreen.js   # Loading states
│   ├── Navigation.js      # Main navigation
│   ├── ProtectedRoute.js  # Route protection
│   ├── ReminderProvider.js # Medication reminders
│   └── TimePicker.js      # Time selection component
└── lib/                   # Utilities and hooks
    ├── AuthContext.js     # Authentication context
    ├── sanitize.js        # Input sanitization
    ├── supabase.js        # Supabase client and helpers
    ├── useLocalStorage.js # Local storage hook
    └── userPreferences.js # Smart preferences system
```

## Data Privacy

- **Local-first**: All data is stored locally on your device by default
- **Encrypted**: Data is encrypted in transit and at rest
- **Private**: Only you can access your data - no sharing with third parties

## Contributing

This is a personal project, but suggestions and feedback are welcome.

## License

This project is for personal use. Please respect the privacy and personal nature of this health management application.

## About

This app started as an idea to make day-to-day life with Crohn's and Colitis a bit easier. It focuses on quick logging, clear health patterns, and practical summaries you can actually use in appointments.

