const SUPABASE_URL = 'https://pawwbhmaenjnsxptomtg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhd3diaG1hZW5qbnN4cHRvbXRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNDkzODksImV4cCI6MjA4MjcyNTM4OX0.n6jYdtH4eKnPHq5sb-e7Gtuw16Oi1L3EMoKBcgF_SeM';

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
    };

    // GET: 폴더 목록
    if (req.method === 'GET') {
        try {
            const response = await fetch(
                `${SUPABASE_URL}/rest/v1/folders?select=*&order=sort_order.asc,created_at.desc`,
                { headers }
            );

            if (!response.ok) {
                throw new Error(`Supabase error: ${response.status}`);
            }

            const folders = await response.json();
            return res.status(200).json({ folders: folders || [] });
        } catch (error) {
            console.error('Folders GET error:', error);
            return res.status(500).json({ error: '폴더 목록을 가져올 수 없습니다.' });
        }
    }

    // POST: 폴더 생성
    if (req.method === 'POST') {
        try {
            const { name, color = '#6366f1' } = req.body;

            if (!name) {
                return res.status(400).json({ error: '폴더 이름이 필요합니다.' });
            }

            // 최대 sort_order 가져오기
            const maxOrderRes = await fetch(
                `${SUPABASE_URL}/rest/v1/folders?select=sort_order&order=sort_order.desc&limit=1`,
                { headers }
            );
            const maxOrderData = await maxOrderRes.json();
            const sortOrder = (maxOrderData[0]?.sort_order || 0) + 1;

            const insertRes = await fetch(
                `${SUPABASE_URL}/rest/v1/folders`,
                {
                    method: 'POST',
                    headers: { ...headers, 'Prefer': 'return=representation' },
                    body: JSON.stringify({
                        name,
                        color,
                        sort_order: sortOrder
                    })
                }
            );

            if (!insertRes.ok) throw new Error(`Insert error: ${insertRes.status}`);

            const [savedFolder] = await insertRes.json();
            return res.status(201).json(savedFolder);
        } catch (error) {
            console.error('Folders POST error:', error);
            return res.status(500).json({ error: '폴더를 생성할 수 없습니다.' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
