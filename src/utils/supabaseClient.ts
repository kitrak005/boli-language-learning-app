import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
    // Doesn't throw — lets the app still boot and show a clear error in the
    // UI rather than a blank white screen if env vars are missing.
    console.error(
        '[VAKYA] Missing Supabase environment variables. Make sure VITE_SUPABASE_URL and ' +
        'VITE_SUPABASE_ANON_KEY are set in your .env file (and in your Vercel project settings for production).'
    );
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');