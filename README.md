# FlareCare

A personal companion app for managing Crohn's & Colitis symptoms, built with Next.js and designed for easy expansion to native mobile apps.

## Features

### 🏠 Home Dashboard
- Clean, intuitive interface with quick access to all features
- Mobile-optimized hero section with responsive design
- Feature cards with hover animations and visual indicators
- Modern glass-morphism design with smooth transitions

### 📊 Symptom Tracking
- Log daily symptoms with severity levels (1-10)
- Track symptom start/end dates and ongoing status
- Add detailed notes and potential food triggers
- Edit and delete previous entries
- Visual severity indicators with color coding
- Mobile-friendly form design with validation

### 💊 Medication Management
- Add medications with dosage and timing
- **Medication reminders** with browser notifications
- Set specific times or custom times for each medication
- Enable/disable reminders per medication
- Add notes for each medication
- Edit and delete medication entries
- Visual time-of-day indicators
- Clean, organized medication list

### 📈 Reports & Analytics
- **Flexible date ranges** - Last 7 days, 30 days, 3 months, or custom periods
- **Quick preset buttons** for common time periods
- **Comprehensive PDF exports** with detailed symptom information
- **CSV exports** for data analysis in Excel/Google Sheets
- **UK date formatting** (dd/mm/yyyy) for better readability
- **Notes included** in all exports for complete medical context
- **Auto-pagination** for long reports
- **Data validation** prevents empty report exports

### ☁️ Cloud Sync & Authentication
- **User Authentication** - Secure email OTP login system
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
- **Consistent color scheme** with blue gradients

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
1. **Sign in** - Enter your email to receive a secure login code
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
│   ├── medications/       # Medications management
│   ├── reports/           # Reports and analytics
│   ├── symptoms/          # Symptom tracking
│   ├── globals.css        # Global styles
│   ├── layout.js          # Root layout
│   └── page.js            # Home page
├── components/            # Reusable components
│   ├── ConfirmationModal.js
│   ├── Navigation.js
│   └── SyncSettings.js
└── lib/                   # Utilities and hooks
    ├── supabase.js        # Supabase client and helpers
    ├── useDataSync.js     # Data sync hook
    └── useLocalStorage.js # Local storage hook
```

## Data Privacy

- **Local-first**: All data is stored locally on your device by default
- **Optional sync**: Cloud sync is completely optional and user-controlled
- **Encrypted**: Data is encrypted in transit and at rest
- **Private**: Only you can access your data - no sharing with third parties

## Contributing

This is a personal project, but suggestions and feedback are welcome! The app is designed to be easily extensible for future features like:
- Medication reminders and notifications
- Advanced analytics and insights
- Healthcare provider integration
- Mobile app development

## License

This project is for personal use. Please respect the privacy and personal nature of this health management application.

## About

Built by someone who understands the daily challenges of living with Crohn's disease. This app was created to fill a gap in the market for simple, effective, and privacy-focused health management tools.

---

**FlareCare** - Built with care for Crohn's & Colitis patients. ❤️
