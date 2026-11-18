# User Profile Setup with Database Trigger

## Overview

This implementation uses a PostgreSQL trigger to automatically create user profiles when users sign up, working seamlessly with your existing RLS policies.

## How It Works

1. **User signs up** with an email code and username
2. **Supabase creates auth user** in `auth.users` table
3. **Database trigger fires automatically** and creates a profile with a generated username in `user_profiles`
4. **Chosen username is saved** after the user verifies their email
5. **User can update their profile** after sign-up (via RLS policy)

## Setup Instructions

### Step 1: The Database Trigger

The trigger and its function (`on_auth_user_created` → `public.handle_new_user()`) are part of the initial schema migration, `supabase/migrations/00000000000000_initial_schema.sql`. No manual step is needed on a database built from the migrations.

### Step 2: RLS Policies

The initial schema creates these RLS policies on the `user_profiles` table:

```sql
-- Policy 1: Users can view all profiles
CREATE POLICY "Users can view all profiles" ON user_profiles
  FOR SELECT USING (true);

-- Policy 2: Users can insert own profile
CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Policy 3: Users can update own profile
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);
```

### Step 3: Test the Sign-Up Flow

1. Navigate to `/sign-up` in your application
2. Fill in your email and username
3. Request an email code and verify it on the form
4. Check your Supabase dashboard → `user_profiles` table
5. You should see a new row with the username you entered

## How the Code Works

### Sign-Up Process

The form requests an email code with `signInWithOtp` and `shouldCreateUser: true`. The email template uses the stored interface locale. After verification, `completeEmailSignUp` updates the signed-in account's generated username under the existing profile RLS policy. An account that already has its own username keeps it. See [AUTH_FLOW.md](./AUTH_FLOW.md).

### Database Trigger Flow

```sql
-- When new user created:
INSERT INTO auth.users → TRIGGER fires → Creates user_profiles row

-- The profile gets:
- id: Same as auth.users.id
- username: From metadata or default 'user_' + first 8 characters of the id
- display_name: From metadata, otherwise null
```

## Benefits of This Approach

✅ **Works with existing RLS** - No changes needed to your security policies  
✅ **Automatic & reliable** - Profile always created when user signs up  
✅ **No service role needed** - More secure, no admin keys in code  
✅ **Transactional** - If user creation fails, no orphan profiles  
✅ **Flexible** - Username can be updated after sign-up  

## Troubleshooting

### "Username is already taken" error
- The database enforces uniqueness when the username is saved after email verification. Choose another username to finish signing up.

### Profile not created after sign-up
1. Check if the trigger was created: Run in SQL Editor:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
   ```
2. Check if the function exists:
   ```sql
   SELECT * FROM pg_proc WHERE proname = 'handle_new_user';
   ```

### Username not set in profile
- The username should be set via the update after creation
- Check browser console for any errors
- Verify RLS policy allows users to update their own profile

## Files Modified

- `supabase/migrations/00000000000000_initial_schema.sql` - Database trigger (`handle_new_user`)
- `lib/supabase/queries/auth.client.ts` - Email code requests and verification
- `lib/actions/account.ts` - Completing signup after verification
- `types/supabase.ts` - Generated row types (`user_profiles`), see [Generated types](./DEV_STRATEGY.md#generated-types)
- `components/auth/email-auth-form.tsx` - Username input field
