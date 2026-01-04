import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://pawwbhmaenjnsxptomtg.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_ravpeXJd4294xbcpG6jBMQ_ij2RkcZL';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    // CORS 헤더
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { data: folders, error } = await supabase
            .from('folders')
            .select('*')
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: false });

        if (error) throw error;

        return res.status(200).json({ folders: folders || [] });
    } catch (error) {
        console.error('Folders API error:', error);
        return res.status(500).json({ error: '폴더 목록을 가져올 수 없습니다.' });
    }
}
