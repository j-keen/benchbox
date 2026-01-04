import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://pawwbhmaenjnsxptomtg.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_ravpeXJd4294xbcpG6jBMQ_ij2RkcZL';
const supabase = createClient(supabaseUrl, supabaseKey);

// URL 분석
function analyzeUrl(url) {
    const normalizedUrl = url.trim();

    if (/youtube\.com\/@|youtube\.com\/channel\//.test(normalizedUrl)) {
        return { platform: 'youtube', type: 'channel' };
    }
    if (/tiktok\.com\/@/.test(normalizedUrl) && !/\/video\//.test(normalizedUrl)) {
        return { platform: 'tiktok', type: 'channel' };
    }
    if (/instagram\.com\/([a-zA-Z0-9_.-]+)\/?(\?.*)?$/.test(normalizedUrl)) {
        const match = normalizedUrl.match(/instagram\.com\/([a-zA-Z0-9_.-]+)/);
        if (match && !['p', 'reel', 'reels', 'stories', 'explore', 'direct'].includes(match[1])) {
            return { platform: 'instagram', type: 'channel' };
        }
    }

    return { platform: 'other', type: 'channel' };
}

export default async function handler(req, res) {
    // CORS 헤더
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // GET: 채널 목록
    if (req.method === 'GET') {
        try {
            const { data: channels, error } = await supabase
                .from('channels')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            return res.status(200).json({ channels: channels || [] });
        } catch (error) {
            console.error('Channels GET error:', error);
            return res.status(500).json({ error: '채널 목록을 가져올 수 없습니다.' });
        }
    }

    // POST: 채널 생성
    if (req.method === 'POST') {
        try {
            const { url, folder_id } = req.body;

            if (!url) {
                return res.status(400).json({ error: 'URL이 필요합니다.' });
            }

            // 중복 체크
            const { data: existing } = await supabase
                .from('channels')
                .select('id')
                .eq('url', url)
                .maybeSingle();

            if (existing) {
                return res.status(409).json({ error: '이미 등록된 채널입니다.' });
            }

            const urlInfo = analyzeUrl(url);

            const { data: savedChannel, error } = await supabase
                .from('channels')
                .insert({
                    url,
                    platform: urlInfo.platform,
                    title: url,
                    folder_id: folder_id || null
                })
                .select()
                .single();

            if (error) throw error;

            return res.status(201).json(savedChannel);
        } catch (error) {
            console.error('Channels POST error:', error);
            return res.status(500).json({ error: '채널을 저장할 수 없습니다.' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
