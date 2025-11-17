# Supabase Auth Setup Guide

This document explains how to set up and use Supabase Authentication in the application.

## Overview

The application now uses Supabase Auth for user authentication, replacing the localStorage-based email system. This allows users to:
- Log in from any device
- Access their purchases across devices
- Use secure password or magic link authentication

## Setup Steps

### 1. Enable Supabase Auth

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** > **Providers**
3. Enable **Email** provider
4. Configure email settings:
   - Enable "Confirm email" if you want email verification (optional)
   - Set up email templates for magic links

### 2. Run Database Migration

Run the SQL migration file in your Supabase SQL Editor:

```sql
-- Run: supabase-auth-migration.sql
```

This migration:
- Adds `auth_user_id` column to link `users` table with `auth.users`
- Creates a trigger to automatically create user records when auth users sign up
- Updates RLS policies for authenticated users

### 3. Environment Variables

Ensure these are set in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 4. Test the Setup

1. Start your development server: `npm run dev`
2. Navigate to `/login`
3. Try signing up with email/password or magic link
4. After login, you should see your purchases

## How It Works

### Authentication Flow

1. **Sign Up/Login**: User creates account or logs in via `/login`
2. **Auth State**: Supabase Auth manages session via secure cookies
3. **User Linking**: When user signs up, trigger automatically creates/links user in `users` table
4. **Purchase Access**: Purchases are linked via `user_id` which is linked to `auth_user_id`

### Backward Compatibility

The system maintains backward compatibility:
- Guest checkout still works (email-only, no auth required)
- Existing purchases by email still work
- New authenticated users get linked automatically

### Key Files

- `lib/authClient.ts` - Client-side auth utilities
- `lib/authServer.ts` - Server-side auth utilities  
- `lib/purchaseVerification.ts` - Updated to support both auth and email lookups
- `app/login/page.tsx` - Login/signup page
- `app/auth/callback/page.tsx` - OAuth/magic link callback handler

## User Experience

### For New Users

1. User clicks "Log ind" button
2. Chooses to sign up or use magic link
3. After authentication, purchases are automatically linked
4. User can access purchases from any device

### For Existing Users (Guest Checkout)

1. Existing purchases by email still work
2. User can log in with the same email to link account
3. Future purchases will be linked to auth account

## API Routes

- `GET /api/user/me` - Get current authenticated user and purchases
- `GET /api/user/purchases?email=...` - Get purchases by email (legacy)

## Troubleshooting

### Users can't log in

1. Check Supabase Auth is enabled in dashboard
2. Verify environment variables are set
3. Check browser console for errors

### Purchases not showing after login

1. Verify database migration ran successfully
2. Check if user record exists in `users` table
3. Verify `auth_user_id` is linked correctly

### Magic link not working

1. Check email provider settings in Supabase
2. Verify email templates are configured
3. Check spam folder for magic link emails

## Migration Notes

- Existing guest checkout users can continue using the system
- When they log in with the same email, their account gets linked
- All future purchases will be linked to their auth account
- The system gracefully falls back to email lookup if auth is not available

