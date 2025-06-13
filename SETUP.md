# Sotto Note Setup Guide

## Overview

Sotto Note (そっとノート) is a wellness app that combines journaling, meditation, and AI feedback to help users organize their thoughts and emotions.

## Prerequisites

- Node.js >= 20.0.0
- npm or yarn
- Supabase account
- OpenAI API key

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# OpenAI API Key
OPENAI_API_KEY=your_openai_api_key_here

# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Database Schema

The application requires the following Supabase tables:

### 1. profiles table

```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### 2. journals table

````sql
CREATE TABLE journals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    mood TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    date TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS (Row Level Security)
ALTER TABLE journals ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own journals" ON journals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own journals" ON journals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own journals" ON journals
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own journals" ON journals
    FOR DELETE USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_journals_user_id_timestamp ON journals(user_id, timestamp DESC);

### 3. Profile creation trigger
```sql
-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name)
  VALUES (new.id, new.raw_user_meta_data->>'name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile on user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
````

## Supabase Authentication Setup

1. **Enable Google OAuth Provider:**

   - Go to your Supabase project dashboard
   - Navigate to Authentication > Providers
   - Enable Google provider
   - Configure OAuth credentials from Google Cloud Console

2. **Configure Redirect URLs:**
   - Add your application URL to the list of allowed redirect URLs
   - For local development: `http://localhost:5173`
   - For production: your deployed URL

## Installation Steps

1. **Clone the repository:**

   ```bash
   git clone [repository-url]
   cd sotto-note
   ```

2. **Install dependencies:**

   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables:**

   - Copy the `.env.example` to `.env` (if available)
   - Fill in your OpenAI API key and Supabase credentials

4. **Run database migrations:**

   - Execute the SQL commands above in your Supabase SQL editor

5. **Start the development server:**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

## Key Features

### 1. Journal Entries

- Users can create journal entries with mood tracking
- Entries are stored with:
  - Content (text)
  - Mood (emotion state)
  - Timestamp
  - Date (formatted for display)

### 2. Mood Tracking

Available mood options:

- 😊 良い (Good)
- 😌 普通 (Neutral)
- 😔 悲しい (Sad)
- 😰 不安 (Anxious)
- 😤 怒り (Angry)
- 😴 疲れた (Tired)

### 3. AI Counseling

- Uses OpenAI GPT-4 to provide empathetic responses
- Accessible via the bot icon on each journal entry
- AI acts as a supportive therapist

### 4. Breathing Exercise

- Available at `/breathing` route
- Guided meditation with visual animations

## Project Structure

```
sotto-note/
├── app/
│   ├── components/     # Reusable components
│   ├── lib/           # Server utilities (Supabase, OpenAI)
│   ├── routes/        # Remix routes
│   ├── moodColors.ts  # Mood configuration
│   └── root.tsx       # Root layout
├── public/            # Static assets (SVGs, images)
└── package.json       # Dependencies
```

## Security Notes

1. **Environment Variables:**

   - Never commit `.env` file to version control
   - Keep API keys secure

2. **Row Level Security (RLS):**

   - All database tables have RLS enabled
   - Users can only access their own data

3. **Authentication:**
   - Google OAuth is the primary authentication method
   - Sessions are managed by Supabase Auth

## Troubleshooting

### Common Issues:

1. **"User not logged in" errors:**

   - Ensure Google OAuth is properly configured in Supabase
   - Check redirect URLs match your application URL

2. **Database errors:**

   - Verify RLS policies are correctly set up
   - Check that tables exist with correct schema

3. **AI responses not working:**
   - Verify OpenAI API key is valid
   - Check API rate limits

## Development Tips

1. The app uses Remix with Vite for fast development
2. Tailwind CSS for styling
3. TypeScript for type safety
4. Supabase client libraries for both server and client-side operations

## Production Deployment

1. Build the application:

   ```bash
   npm run build
   ```

2. Set production environment variables

3. Deploy using your preferred hosting service (Vercel, Netlify, etc.)

4. Update Supabase redirect URLs for production domain

## Support

For issues or questions, please refer to the project repository or documentation.
