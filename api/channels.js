const SUPABASE_URL = 'https://pawwbhmaenjnsxptomtg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhd3diaG1hZW5qbnN4cHRvbXRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNDkzODksImV4cCI6MjA4MjcyNTM4OX0.n6jYdtH4eKnPHq5sb-e7Gtuw16Oi1L3EMoKBcgF_SeM';

function analyzeUrl(url) {
    const normalizedUrl = url.trim();
    if (/youtube\.com\/@|youtube\.com\/channel\//.test(normalizedUrl)) {
        return { platform: 'youtube' };
    }
    if (/tiktok\.com\/@/.test(normalizedUrl) && !/\/video\//.test(normalizedUrl)) {
        return { platform: 'tiktok' };
    }
    if (/instagram\.com\/([a-zA-Z0-9_.-]+)\/?(\?.*)?$/.test(normalizedUrl)) {
        const match = normalizedUrl.match(/instagram\.com\/([a-zA-Z0-9_.-]+)/);
        if (match && !['p', 'reel', 'reels', 'stories', 'explore', 'direct'].includes(match[1])) {
            return { platform: 'instagram' };
        }
    }
    return { platform: 'other' };
}

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

    // GET: 채널 목록
    if (req.method === 'GET') {
        try {
            const response = await fetch(
                `${SUPABASE_URL}/rest/v1/channels?select=*&order=created_at.desc`,
                { headers }
            );

            if (!response.ok) throw new Error(`Supabase error: ${response.status}`);

            const channels = await response.json();
            return res.status(200).json({ channels: channels || [] });
        } catch (error) {
            console.error('Channels GET error:', error);
            return res.status(500).json({ error: '채널 목록을 가져올 수 없습니다.' });
        }
    }

    // POST: 채널 생성
    if (req.method === 'POST') {
        try {
            const { url, folder_id, title, thumbnail, description } = req.body;

            if (!url) {
                return res.status(400).json({ error: 'URL이 필요합니다.' });
            }

            // 중복 체크
            const checkRes = await fetch(
                `${SUPABASE_URL}/rest/v1/channels?url=eq.${encodeURIComponent(url)}&select=id`,
                { headers }
            );
            const existing = await checkRes.json();
            if (existing && existing.length > 0) {
                return res.status(409).json({ error: '이미 등록된 채널입니다.' });
            }

            const urlInfo = analyzeUrl(url);

            const insertRes = await fetch(
                `${SUPABASE_URL}/rest/v1/channels`,
                {
                    method: 'POST',
                    headers: { ...headers, 'Prefer': 'return=representation' },
                    body: JSON.stringify({
                        url,
                        platform: urlInfo.platform,
                        title: title || url,
                        thumbnail: thumbnail || null,
                        description: description || null,
                        folder_id: folder_id || null
                    })
                }
            );

            if (!insertRes.ok) throw new Error(`Insert error: ${insertRes.status}`);

            const [savedChannel] = await insertRes.json();
            return res.status(201).json(savedChannel);
        } catch (error) {
            console.error('Channels POST error:', error);
            return res.status(500).json({ error: '채널을 저장할 수 없습니다.' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
