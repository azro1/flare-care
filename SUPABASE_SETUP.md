# Supabase Setup for FlareCare

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up/Login and create a new project
3. Choose a region close to your users
4. Wait for the project to be ready

## 2. Get Your Credentials

1. Go to your project dashboard
2. Click on "Settings" → "API"
3. Copy your:
   - Project URL
   - Anon public key

## 3. Create Environment Variables

Create a `.env.local` file in your project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

## 4. Set Up Database Tables

Run this SQL in your Supabase SQL Editor:

```sql
-- Create symptoms table
CREATE TABLE symptoms (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  date DATE NOT NULL,
  severity INTEGER NOT NULL CHECK (severity >= 1 AND severity <= 10),
  notes TEXT,
  foods TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create medications table
CREATE TABLE medications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  dosage TEXT,
  time_of_day TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_settings table
CREATE TABLE user_settings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  sync_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE symptoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Create policies (users can only access their own data)
CREATE POLICY "Users can view own symptoms" ON symptoms
  FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert own symptoms" ON symptoms
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update own symptoms" ON symptoms
  FOR UPDATE USING (user_id = auth.uid()::text);

CREATE POLICY "Users can delete own symptoms" ON symptoms
  FOR DELETE USING (user_id = auth.uid()::text);

-- Similar policies for medications
CREATE POLICY "Users can view own medications" ON medications
  FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert own medications" ON medications
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update own medications" ON medications
  FOR UPDATE USING (user_id = auth.uid()::text);

CREATE POLICY "Users can delete own medications" ON medications
  FOR DELETE USING (user_id = auth.uid()::text);

-- Similar policies for user_settings
CREATE POLICY "Users can view own settings" ON user_settings
  FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert own settings" ON user_settings
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update own settings" ON user_settings
  FOR UPDATE USING (user_id = auth.uid()::text);
```

## 5. Test the Setup

1. Restart your development server: `npm run dev`
2. Go to the app and click "Sync Settings" in the navigation
3. Enable cloud sync
4. Add some test data and verify it syncs

## Features

- **Local-first**: Data is stored locally by default
- **Optional sync**: Users can choose to enable cloud sync
- **Offline support**: Works without internet, syncs when online
- **Privacy**: Data is encrypted and only accessible by the user
- **Cross-device**: Access your data from any device when sync is enabled
