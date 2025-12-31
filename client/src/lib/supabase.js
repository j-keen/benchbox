import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://pawwbhmaenjnsxptomtg.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_ravpeXJd4294xbcpG6jBMQ_ij2RkcZL';

export const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
