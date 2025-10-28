# FlareCare

A personal companion app for managing Crohn's & Colitis symptoms, built with Next.js and designed for easy expansion to native mobile apps.

## Features

### 🏠 Home Dashboard
- Clean, intuitive interface with quick access to all features
- Mobile-optimized hero section with responsive design
- Feature cards with hover animations and visual indicators
- Modern glass-morphism design with smooth transitions

### 📊 Symptom Tracking
- **Multi-step wizard** with intuitive question flow
- Log daily symptoms with severity levels (1-10)
- Track symptom start/end dates and ongoing status
- **Smart user preferences** - learns from your habits to streamline future entries
- **Bathroom frequency tracking** with baseline and change detection
- **Lifestyle tracking** - smoking and alcohol consumption patterns
- **Meal tracking** - separate breakfast, lunch, and dinner entry screens
- Add detailed notes and potential food triggers
- Edit and delete previous entries
- Visual severity indicators with color coding
- **Toast notifications** for successful actions
- Mobile-friendly form design with validation
- **Pattern detection** - intelligently detects habit changes over time
- **Enhanced detail pages** - Clean, organized view of individual symptom entries
- **Improved visual hierarchy** - Better spacing and typography for readability

### 💊 Medication Management
- Add medications with dosage and timing
- **Medication reminders** with browser notifications
- Set specific times or custom times for each medication
- Enable/disable reminders per medication
- Add notes for each medication
- Edit and delete medication entries
- Visual time-of-day indicators
- Clean, organized medication list
- **NEW: Medication Tracking Wizard** - Track missed medications, NSAIDs, and antibiotics
- **Multi-step tracking flow** - Simple wizard interface for medication adherence logging
- **Detailed tracking** - Log specific medications with dates, times, and dosages
- **Dashboard integration** - View recent medication tracking activity
- **Supabase integration** - Cloud storage for medication tracking data

### 📈 Reports & Analytics
- **Flexible date ranges** - Last 7 days, 30 days, 3 months, or custom periods
- **Quick preset buttons** for common time periods
- **Comprehensive PDF exports** with detailed symptom information
- **CSV exports** for data analysis in Excel/Google Sheets
- **UK date formatting** (dd/mm/yyyy) for better readability
- **Bathroom frequency data** included in all exports
- **Notes included** in all exports for complete medical context
- **Auto-pagination** for long reports
- **Data validation** prevents empty report exports

### ☁️ Cloud Sync & Authentication
- **User Authentication** - Secure Google OAuth login system
- **Cross-device access** - Sign in on any device to access your data
- **Local-first data storage** by default
- **Optional Supabase cloud synchronization**
- **Secure, encrypted data storage**
- **Works offline** with automatic sync when online
- **User isolation** - Each user only sees their own data

### 🎨 Design & UX
- **Mobile-first responsive design** with optimized layouts
- **Custom animations** and smooth transitions
- **Modern typography** with Inter font family
- **Glass-morphism effects** with backdrop blur
- **Intuitive navigation** with mobile dropdown menu
- **Custom modals** replacing browser alerts
- **Consistent color scheme** with cadet blue accents
- **Dark theme** with slate backgrounds and white text
- **Custom form elements** - styled radio buttons and checkboxes
- **Responsive toast notifications** with proper mobile positioning

### 🧠 Smart User Preferences
- **First-time user setup** - captures baseline habits (smoking, drinking, bathroom frequency)
- **Returning user optimization** - asks contextual questions instead of repetitive ones
- **Pattern detection** - intelligently detects when habits change over time
- **Respectful prompts** - only asks about habit changes after 5+ consecutive "No" answers
- **30-day cooldown** - prevents repeated prompts for the same habit
- **Automatic profile updates** - updates preferences when users confirm habit changes
- **Local + cloud storage** - preferences synced across devices
- **Smart navigation** - skips irrelevant questions based on stored preferences

### 🔒 Security & Validation
- **Input sanitization** to prevent XSS attacks using DOMPurify
- **Form validation** with built-in HTML5 validation
- **Secure authentication** with Google OAuth
- **Data protection** with proper sanitization of user inputs
- **Secure data operations** via Supabase's built-in client methods

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, JavaScript
- **Styling**: Tailwind CSS with custom components
- **Data Storage**: Local Storage + Supabase (optional)
- **PDF Export**: jsPDF with text wrapping and pagination
- **Icons**: Heroicons (SVG)
- **Fonts**: Inter, Merriweather, Playfair Display (Google Fonts)

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

3. **Set up environment variables** (optional - for cloud sync)
   ```bash
   cp .env.example .env.local
   ```
   Add your Supabase credentials to `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

### Basic Usage
1. **Sign in** - Click "Continue with Google" to sign in securely
2. **Start by logging symptoms** - Click "Symptoms" and add your first entry
3. **Add medications** - Go to "Medications" to set up your medication schedule
4. **Generate reports** - Use the "Reports" page to create summaries for your healthcare team

### Cloud Sync (Optional)
1. **Enable sync** - Toggle the sync switch on Symptoms or Medications pages
2. **Automatic sync** - Your data will automatically sync when you make changes
3. **Manual sync** - Use "Sync to Cloud" and "Fetch from Cloud" buttons for manual control

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── about/             # About page
│   ├── auth/              # Authentication pages
│   ├── medications/       # Medications management
│   ├── reports/           # Reports and analytics
│   ├── symptoms/          # Symptom tracking
│   │   └── [id]/         # Individual symptom details
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
│   ├── SyncSettings.js    # Cloud sync controls
│   └── TimePicker.js      # Time selection component
└── lib/                   # Utilities and hooks
    ├── AuthContext.js     # Authentication context
    ├── sanitize.js        # Input sanitization
    ├── supabase.js        # Supabase client and helpers
    ├── useDataSync.js     # Data sync hook
    ├── useLocalStorage.js # Local storage hook
    └── userPreferences.js # Smart preferences system
```

## Data Privacy

- **Local-first**: All data is stored locally on your device by default
- **Optional sync**: Cloud sync is completely optional and user-controlled
- **Encrypted**: Data is encrypted in transit and at rest
- **Private**: Only you can access your data - no sharing with third parties

## Recent Updates

### 🆕 Medication Tracking Wizard (Latest)
- **Complete medication adherence tracking** - Track missed medications, NSAIDs, and antibiotics
- **Multi-step wizard interface** - Intuitive flow matching the symptoms wizard design
- **Detailed medication logging** - Specific medications with dates, times, and dosages
- **Dashboard integration** - Recent medication tracking activity displayed on home page
- **Supabase cloud storage** - Medication tracking data synced across devices
- **Delete functionality** - Remove medication tracking entries with confirmation modals
- **Consistent UI/UX** - Matches the existing app design language and patterns

### 🎨 Enhanced Symptom Details Pages
- **Redesigned detail view** - Clean, organized layout for individual symptom entries
- **Improved visual hierarchy** - Better spacing, typography, and information organization
- **Status-first overview** - Key metrics displayed with clear priority (Status, Severity, Stress)
- **Consistent styling** - Proper CSS variable usage and dark mode support
- **Mobile optimization** - Responsive design that works perfectly on all devices

### 🚀 Smart User Preferences System
- **Intelligent symptom logging** - learns from your habits to streamline future entries
- **Pattern detection** - detects when you've quit smoking/drinking based on usage patterns
- **Respectful prompts** - only asks about habit changes after detecting clear patterns
- **Contextual questions** - asks "Did you smoke today?" instead of "Do you smoke?"

### 🎨 UI/UX Improvements
- **Split meal entry** - separate screens for breakfast, lunch, and dinner
- **Dark theme** - consistent slate backgrounds with white text
- **Custom form elements** - styled radio buttons and checkboxes in cadet blue
- **Toast notifications** - success and delete confirmations
- **Mobile optimization** - improved scrolling and button visibility

### 🔧 Technical Enhancements
- **Multi-step wizard** - intuitive question flow for symptom logging
- **Smart navigation** - skips irrelevant questions based on user preferences
- **Pattern tracking** - stores consecutive "No" answers to detect habit changes
- **Preference persistence** - local storage + cloud sync for user preferences

## Contributing

This is a personal project, but suggestions and feedback are welcome! The app is designed to be easily extensible for future features like:
- Advanced analytics and insights
- Healthcare provider integration
- Mobile app development
- AI-powered symptom pattern recognition

## License

This project is for personal use. Please respect the privacy and personal nature of this health management application.

## About

Built by someone who understands the daily challenges of living with Crohn's disease. This app was created to fill a gap in the market for simple, effective, and privacy-focused health management tools.

---

**FlareCare** - Built with care for Crohn's & Colitis patients. ❤️
