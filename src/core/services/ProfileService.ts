/**
 * ProfileService
 * Handles all user profile operations with Supabase
 */

import { getSupabaseClient } from '@/lib/supabase';
import type { UserProfile, ProfileUpdate, SignUpMetadata } from '@/core/domain/models';

const supabase = getSupabaseClient();

export class ProfileService {
  /**
   * Get the profile of the currently authenticated user
   */
  static async getCurrentUserProfile(): Promise<UserProfile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return null;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching current user profile:', error);
      return null;
    }

    return data;
  }

  /**
   * Get a profile by user ID
   */
  static async getProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    return data;
  }

  /**
   * Update the current user's profile
   */
  static async updateProfile(updates: ProfileUpdate): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('No authenticated user');
      return false;
    }

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (error) {
      console.error('Error updating profile:', error);
      return false;
    }

    return true;
  }

  /**
   * Check if a username is available
   */
  static async isUsernameAvailable(username: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (error) {
      console.error('Error checking username availability:', error);
      return false;
    }

    return data === null;
  }

  /**
   * Search profiles by username or full name
   */
  static async searchProfiles(query: string): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .rpc('search_profiles', { search_query: query });

    if (error) {
      console.error('Error searching profiles:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get all profiles (paginated)
   */
  static async getAllProfiles(limit = 50, offset = 0): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching profiles:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Sign up a new user with profile metadata
   */
  static async signUp(
    email: string,
    password: string,
    metadata: SignUpMetadata
  ): Promise<{ success: boolean; error?: string }> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data.user) {
      return { success: false, error: 'No user returned from sign up' };
    }

    return { success: true };
  }

  /**
   * Delete the current user's profile (cascades to auth.users)
   */
  static async deleteProfile(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('No authenticated user');
      return false;
    }

    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', user.id);

    if (error) {
      console.error('Error deleting profile:', error);
      return false;
    }

    return true;
  }
}

