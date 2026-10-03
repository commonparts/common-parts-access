# User Profile Setup with Database Trigger

## Overview

This implementation uses a PostgreSQL trigger to automatically create user profiles when users sign up, working seamlessly with your existing RLS policies.

## How It Works

1. **User signs up** with email, password, and username
2. **Supabase creates auth user** in `auth.users` table
3. **Database trigger fires automatically** and creates a profile in `user_profiles` table
4. **Username is stored** in user metadata and then updated in the profile
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
2. Fill in email, username, and password
3. Submit the form
4. Check your Supabase dashboard → `user_profiles` table
5. You should see a new row with the username you entered

## How the Code Works

### Sign-Up Process (`lib/supabase/queries/auth.client.ts`)

```typescript
// 1. Check username availability
checkUsernameAvailability(username)

// 2. Create auth user with username in metadata
supabase.auth.signUp({
  email,
  password,
  options: {
    data: { username }  // Stored in user metadata
  }
})

// 3. Trigger automatically creates user_profile

// 4. Update profile with username (via RLS)
updateUserProfile(userId, { username })
```

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
- The username check happens before sign-up
- Try a different username

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
- `lib/supabase/queries/auth.client.ts` - Updated signUp function
- `lib/supabase/queries/users.ts` - User profile queries
- `types/users.ts` - TypeScript interfaces
- `components/auth/sign-up-form.tsx` - Username input field
