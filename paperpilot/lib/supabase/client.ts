/**
 * Supabase client helpers
 * 
 * - `sb`: Client-side Supabase client (uses NEXT_PUBLIC_* keys)
 * - `sbServer`: Server-only Supabase client (uses SERVICE_ROLE key)
 * 
 * IMPORTANT: Only import `sbServer` in server-side code (route handlers, server components)
 * Never expose the service role key to the client!
 */

import { createClient } from '@supabase/supabase-js';

// Validate environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env.local file.'
  );
}

/**
 * Client-side Supabase client
 * Safe to use in browser/client components
 */
export const sb = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Server-only Supabase client with elevated privileges
 * ONLY use in server-side code (API routes, server components)
 * 
 * @throws Error if service role key is not set or if called in browser
 */
export const sbServer = (() => {
  // Prevent accidental client-side usage
  if (typeof window !== 'undefined') {
    throw new Error(
      'sbServer should never be imported on the client side! Use sb instead.'
    );
  }

  if (!supabaseServiceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. This is required for server-side operations.'
    );
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
})();

// Type exports for database schema (to be extended as we build)
export type Database = {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          name: string;
          domain_focus: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          domain_focus?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          domain_focus?: string | null;
          created_at?: string;
        };
      };
      folders: {
        Row: {
          id: string;
          project_id: string | null;
          name: string;
          parent_id: string | null;
          tags: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id?: string | null;
          name: string;
          parent_id?: string | null;
          tags?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string | null;
          name?: string;
          parent_id?: string | null;
          tags?: string[];
          created_at?: string;
        };
      };
      papers: {
        Row: {
          id: string;
          project_id: string | null;
          folder_id: string | null;
          title: string;
          authors: string[];
          venue: string | null;
          year: number | null;
          citations: number | null;
          storage_path: string;
          public_url: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id?: string | null;
          folder_id?: string | null;
          title: string;
          authors?: string[];
          venue?: string | null;
          year?: number | null;
          citations?: number | null;
          storage_path: string;
          public_url: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string | null;
          folder_id?: string | null;
          title?: string;
          authors?: string[];
          venue?: string | null;
          year?: number | null;
          citations?: number | null;
          storage_path?: string;
          public_url?: string;
          created_at?: string;
        };
      };
      paper_assets: {
        Row: {
          id: string;
          paper_id: string | null;
          kind: 'audio' | 'video' | 'thumb' | 'transcript' | 'json';
          storage_path: string;
          public_url: string;
          bytes: number | null;
          etag: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          paper_id?: string | null;
          kind: 'audio' | 'video' | 'thumb' | 'transcript' | 'json';
          storage_path: string;
          public_url: string;
          bytes?: number | null;
          etag?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          paper_id?: string | null;
          kind?: 'audio' | 'video' | 'thumb' | 'transcript' | 'json';
          storage_path?: string;
          public_url?: string;
          bytes?: number | null;
          etag?: string | null;
          created_at?: string;
        };
      };
    };
  };
};

