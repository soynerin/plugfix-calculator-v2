/**
 * User Profile Types
 * Generated from Supabase profiles table schema
 * Date: 2026-02-18
 */

/**
 * User Profile
 * Extends auth.users with custom profile information
 */
export interface UserProfile {
  id: string; // UUID from auth.users
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  updated_at: string; // ISO timestamp
  created_at: string; // ISO timestamp
}

/**
 * Profile Insert
 * Data required when creating a new profile
 */
export interface ProfileInsert {
  id: string; // Must match auth.users id
  username?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
}

/**
 * Profile Update
 * Fields that can be updated by the profile owner
 */
export interface ProfileUpdate {
  username?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
}

/**
 * Sign Up Metadata
 * Data passed to Supabase Auth during registration
 * This data is automatically used to create the profile
 */
export interface SignUpMetadata {
  username?: string;
  full_name?: string;
  avatar_url?: string;
}

/**
 * Database Tables
 * Type-safe reference to Supabase tables
 */
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: UserProfile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
      };
      // ... other tables
    };
  };
}

