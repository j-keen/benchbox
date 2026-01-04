import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://pawwbhmaenjnsxptomtg.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_ravpeXJd4294xbcpG6jBMQ_ij2RkcZL';
const supabase = createClient(supabaseUrl, supabaseKey);

// URL 분석
function analyzeUrl(url) {
    const normalizedUrl = url.trim();

    // YouTube
    if (/youtube\.com\/shorts\//.test(normalizedUrl)) {
        return { platform: 'youtube', type: 'video', videoType: 'shorts' };
    }
    if (/youtube\.com\/watch|youtu\.be\//.test(normalizedUrl)) {
        return { platform: 'youtube', type: 'video', videoType: 'long' };
    }

    // TikTok
    if (/tiktok\.com\/@[\w.-]+\/video\//.test(normalizedUrl)) {
        return { platform: 'tiktok', type: 'video', videoType: 'shorts' };
    }

    // Instagram
    if (/instagram\.com\/reel\//.test(normalizedUrl)) {
        return { platform: 'instagram', type: 'video', videoType: 'shorts' };
    }
    if (/instagram\.com\/p\//.test(normalizedUrl)) {
        return { platform: 'instagram', type: 'video', videoType: 'long' };
    }

    return { platform: 'other', type: 'video', videoType: 'long' };
}

export default async function handler(req, res) {
    // CORS 헤더
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // GET: 영상 목록
    if (req.method === 'GET') {
        try {
            const { data: videos, error } = await supabase
                .from('videos')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

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
            const { data: existing } = await supabase
                .from('videos')
                .select('id')
                .eq('url', url)
                .maybeSingle();

            if (existing) {
                return res.status(409).json({ error: '이미 저장된 영상입니다.' });
            }

            const urlInfo = analyzeUrl(url);

            const { data: savedVideo, error } = await supabase
                .from('videos')
                .insert({
                    url,
                    platform: urlInfo.platform,
                    video_type: urlInfo.videoType || 'long',
                    title: url,
                    channel_id: channel_id || null,
                    folder_id: folder_id || null
                })
                .select()
                .single();

            if (error) throw error;

            return res.status(201).json(savedVideo);
        } catch (error) {
            console.error('Videos POST error:', error);
            return res.status(500).json({ error: '영상을 저장할 수 없습니다.' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
