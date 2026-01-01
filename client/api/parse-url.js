import axios from 'axios';
import * as cheerio from 'cheerio';

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
    if (/youtube\.com\/@|youtube\.com\/channel\//.test(normalizedUrl)) {
        return { platform: 'youtube', type: 'channel' };
    }

    // TikTok
    if (/tiktok\.com\/@[\w.-]+\/video\//.test(normalizedUrl)) {
        return { platform: 'tiktok', type: 'video', videoType: 'shorts' };
    }
    if (/tiktok\.com\/@/.test(normalizedUrl)) {
        return { platform: 'tiktok', type: 'channel' };
    }

    // Instagram
    if (/instagram\.com\/reel\//.test(normalizedUrl)) {
        return { platform: 'instagram', type: 'video', videoType: 'shorts' };
    }
    if (/instagram\.com\/p\//.test(normalizedUrl)) {
        return { platform: 'instagram', type: 'video', videoType: 'long' };
    }
    if (/instagram\.com\/[a-zA-Z0-9_.-]+\/?$/.test(normalizedUrl)) {
        return { platform: 'instagram', type: 'channel' };
    }

    return { platform: 'other', type: 'unknown' };
}

// 제목에서 플랫폼명 제거
function cleanTitle(title, platform) {
    if (!title) return title;

    let cleaned = title;

    // YouTube: " - YouTube" 제거
    cleaned = cleaned.replace(/\s*-\s*YouTube\s*$/i, '');

    // TikTok: "TikTok · " 또는 "TikTok・" 제거
    cleaned = cleaned.replace(/^TikTok\s*[·・]\s*/i, '');

    // Instagram: "Instagram의 " 또는 "Instagram: " 제거
    cleaned = cleaned.replace(/^Instagram의\s*/i, '');
    cleaned = cleaned.replace(/^.*?\s+on\s+Instagram:\s*/i, '');

    // 앞뒤 공백 정리
    cleaned = cleaned.trim();

    return cleaned || title;
}

// YouTube 비디오 ID 추출
function extractYouTubeVideoId(url) {
    let match = url.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
    match = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
    match = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
    return null;
}

// OG 태그 파싱
async function fetchOgTags(url, platform) {
    try {
        // YouTube 특수 처리
        if (platform === 'youtube') {
            const videoId = extractYouTubeVideoId(url);
            if (videoId) {
                const thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

                try {
                    const response = await axios.get(url, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)',
                            'Accept-Language': 'ko-KR,ko;q=0.9'
                        },
                        timeout: 8000
                    });
                    const $ = cheerio.load(response.data);
                    const title = $('meta[property="og:title"]').attr('content') ||
                                 $('title').text()?.replace(' - YouTube', '') || 'YouTube Video';
                    const description = $('meta[property="og:description"]').attr('content') || '';

                    return { title, description, thumbnail };
                } catch {
                    return { title: 'YouTube Video', description: '', thumbnail };
                }
            }
        }

        // TikTok oEmbed
        if (platform === 'tiktok' && url.includes('/video/')) {
            try {
                const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
                const response = await axios.get(oembedUrl, { timeout: 8000 });
                if (response.data) {
                    return {
                        title: response.data.title || response.data.author_name || 'TikTok',
                        description: response.data.author_name ? `by ${response.data.author_name}` : '',
                        thumbnail: response.data.thumbnail_url || ''
                    };
                }
            } catch (e) {
                console.log('TikTok oEmbed failed:', e.message);
            }
        }

        // 일반 OG 태그 파싱
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'facebookexternalhit/1.1',
                'Accept': 'text/html',
                'Accept-Language': 'ko-KR,ko;q=0.9'
            },
            timeout: 10000,
            maxRedirects: 5
        });

        const $ = cheerio.load(response.data);

        return {
            title: $('meta[property="og:title"]').attr('content') ||
                   $('meta[name="twitter:title"]').attr('content') ||
                   $('title').text() || 'Untitled',
            description: $('meta[property="og:description"]').attr('content') ||
                        $('meta[name="description"]').attr('content') || '',
            thumbnail: $('meta[property="og:image"]').attr('content') ||
                      $('meta[name="twitter:image"]').attr('content') || ''
        };
    } catch (error) {
        console.error('OG parsing failed:', error.message);
        return { title: url, description: '', thumbnail: '' };
    }
}

// Vercel Serverless Function Handler
export default async function handler(req, res) {
    // CORS 헤더
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'URL이 필요합니다.' });
    }

    try {
        const urlInfo = analyzeUrl(url);
        const ogData = await fetchOgTags(url, urlInfo.platform);

        return res.status(200).json({
            platform: urlInfo.platform,
            type: urlInfo.type,
            videoType: urlInfo.videoType,
            title: cleanTitle(ogData.title, urlInfo.platform),
            thumbnail: ogData.thumbnail,
            description: ogData.description,
            url: url
        });
    } catch (error) {
        console.error('Parse URL error:', error);
        return res.status(500).json({ error: '정보를 가져올 수 없습니다.' });
    }
}
