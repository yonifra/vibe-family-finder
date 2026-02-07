import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Profile } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Defer profile fetch to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data && !error) {
      setProfile(data as Profile);
    } else if (error && error.code === 'PGRST116') {
      // Profile doesn't exist (PGRST116 = no rows returned)
      // This happens for OAuth users - create a profile for them
      await createProfileForOAuthUser(userId);
    }
  };

  const createProfileForOAuthUser = async (userId: string) => {
    // Get user metadata from the current session to extract name/email
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    // Extract username from user metadata or email
    const userMetadata = user.user_metadata || {};
    const fullName = userMetadata.full_name || userMetadata.name || '';
    const email = user.email || '';

    // Generate username from full name, email, or fallback to user id
    let username = '';
    if (fullName) {
      // Convert "John Doe" to "johndoe" and add random suffix
      username = fullName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9_]/g, '');
    } else if (email) {
      // Use part before @ in email
      username = email.split('@')[0].replace(/[^a-z0-9_]/gi, '').toLowerCase();
    }

    // Ensure username is at least 3 chars and add random suffix for uniqueness
    if (username.length < 3) {
      username = 'user';
    }
    username = `${username}_${Math.random().toString(36).substring(2, 6)}`;

    const displayName = fullName || username;
    const avatarUrl = userMetadata.avatar_url || userMetadata.picture || null;

    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        username,
        display_name: displayName,
        avatar_url: avatarUrl,
        is_creator: false,
      })
      .select()
      .single();

    if (newProfile && !insertError) {
      setProfile(newProfile as Profile);
    } else if (insertError) {
      console.error('Failed to create profile for OAuth user:', insertError);
      // Try fetching again in case of race condition (profile was created elsewhere)
      const { data: retryData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (retryData) {
        setProfile(retryData as Profile);
      }
    }
  };

  const signUp = async (email: string, password: string, username: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) return { error };

    // Create profile after signup
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          username,
          display_name: username,
          is_creator: false,
        });

      if (profileError) return { error: profileError };
    }

    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
