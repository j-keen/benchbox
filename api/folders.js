const SUPABASE_URL = 'https://pawwbhmaenjnsxptomtg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhd3diaG1hZW5qbnN4cHRvbXRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNDkzODksImV4cCI6MjA4MjcyNTM4OX0.n6jYdtH4eKnPHq5sb-e7Gtuw16Oi1L3EMoKBcgF_SeM';

export default async function handler(req, res) {
    // CORS
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
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/folders?select=*&order=sort_order.asc,created_at.desc`,
            {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Supabase error: ${response.status}`);
        }

        const folders = await response.json();
        return res.status(200).json({ folders: folders || [] });
    } catch (error) {
        console.error('Folders API error:', error);
        return res.status(500).json({ error: '폴더 목록을 가져올 수 없습니다.' });
    }
}
