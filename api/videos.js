const SUPABASE_URL = 'https://pawwbhmaenjnsxptomtg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhd3diaG1hZW5qbnN4cHRvbXRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNDkzODksImV4cCI6MjA4MjcyNTM4OX0.n6jYdtH4eKnPHq5sb-e7Gtuw16Oi1L3EMoKBcgF_SeM';

function analyzeUrl(url) {
    const normalizedUrl = url.trim();

    if (/youtube\.com\/shorts\//.test(normalizedUrl)) {
        return { platform: 'youtube', videoType: 'shorts' };
    }
    if (/youtube\.com\/watch|youtu\.be\//.test(normalizedUrl)) {
        return { platform: 'youtube', videoType: 'long' };
    }
    if (/tiktok\.com\/@[\w.-]+\/video\//.test(normalizedUrl)) {
        return { platform: 'tiktok', videoType: 'shorts' };
    }
    if (/instagram\.com\/reel\//.test(normalizedUrl)) {
        return { platform: 'instagram', videoType: 'shorts' };
    }
    if (/instagram\.com\/p\//.test(normalizedUrl)) {
        return { platform: 'instagram', videoType: 'long' };
    }

    return { platform: 'other', videoType: 'long' };
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

    // GET: 영상 목록
    if (req.method === 'GET') {
        try {
            const response = await fetch(
                `${SUPABASE_URL}/rest/v1/videos?select=*&order=created_at.desc`,
                { headers }
            );

            if (!response.ok) throw new Error(`Supabase error: ${response.status}`);

            const videos = await response.json();
            return res.status(200).json({ videos: videos || [] });
        } catch (error) {
            console.error('Videos GET error:', error);
            return res.status(500).json({ error: '영상 목록을 가져올 수 없습니다.' });
        }
    }

    // POST: 영상 저장
    if (req.method === 'POST') {
        try {
            const { url, channel_id, folder_id } = req.body;

            if (!url) {
                return res.status(400).json({ error: 'URL이 필요합니다.' });
            }

            // 중복 체크
            const checkRes = await fetch(
                `${SUPABASE_URL}/rest/v1/videos?url=eq.${encodeURIComponent(url)}&select=id`,
                { headers }
            );
            const existing = await checkRes.json();
            if (existing && existing.length > 0) {
                return res.status(409).json({ error: '이미 저장된 영상입니다.' });
            }

            const urlInfo = analyzeUrl(url);

            const insertRes = await fetch(
                `${SUPABASE_URL}/rest/v1/videos`,
                {
                    method: 'POST',
                    headers: { ...headers, 'Prefer': 'return=representation' },
                    body: JSON.stringify({
                        url,
                        platform: urlInfo.platform,
                        video_type: urlInfo.videoType,
                        title: url,
                        channel_id: channel_id || null,
                        folder_id: folder_id || null
                    })
                }
            );

            if (!insertRes.ok) throw new Error(`Insert error: ${insertRes.status}`);

            const [savedVideo] = await insertRes.json();
            return res.status(201).json(savedVideo);
        } catch (error) {
            console.error('Videos POST error:', error);
            return res.status(500).json({ error: '영상을 저장할 수 없습니다.' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
