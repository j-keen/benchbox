import axios from 'axios';
import * as cheerio from 'cheerio';

// YouTube API 키
const YOUTUBE_API_KEY = 'AIzaSyBP72SA8upFcS5Buykjn5oSfvfWnvDosAw';

// 숫자 포맷팅 (1000 -> 1K, 1000000 -> 1M)
function formatCount(num) {
    if (!num) return null;
    const n = parseInt(num);
    if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억`;
    if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
}

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
    // Instagram 채널 - 쿼리 파라미터 허용 (?igsh= 등)
    if (/instagram\.com\/([a-zA-Z0-9_.-]+)\/?(\?.*)?$/.test(normalizedUrl)) {
        const match = normalizedUrl.match(/instagram\.com\/([a-zA-Z0-9_.-]+)/);
        if (match && !['p', 'reel', 'reels', 'stories', 'explore', 'direct'].includes(match[1])) {
            return { platform: 'instagram', type: 'channel' };
        }
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

// YouTube 채널 핸들 또는 ID 추출
function extractYouTubeChannelInfo(url) {
    // @handle 형식
    let match = url.match(/youtube\.com\/@([^/?]+)/);
    if (match) return { type: 'handle', value: match[1] };

    // channel/ID 형식
    match = url.match(/youtube\.com\/channel\/([^/?]+)/);
    if (match) return { type: 'id', value: match[1] };

    return null;
}

// URL에서 작성자 핸들 추출
function extractAuthorHandle(url) {
    // TikTok: tiktok.com/@username/video/...
    let match = url.match(/tiktok\.com\/@([^/?]+)/);
    if (match) return `@${match[1]}`;

    // Instagram: instagram.com/username/...
    match = url.match(/instagram\.com\/([a-zA-Z0-9_.-]+)/);
    if (match && !['p', 'reel', 'reels', 'stories'].includes(match[1])) {
        return `@${match[1]}`;
    }

    // YouTube: youtube.com/@username
    match = url.match(/youtube\.com\/@([^/?]+)/);
    if (match) return `@${match[1]}`;

    return null;
}

// YouTube Data API로 영상 정보 가져오기
async function fetchYouTubeVideoInfo(videoId) {
    try {
        const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}&key=${YOUTUBE_API_KEY}`;
        const response = await axios.get(apiUrl, { timeout: 8000 });

        if (response.data.items && response.data.items.length > 0) {
            const item = response.data.items[0];
            const snippet = item.snippet;
            const stats = item.statistics;

            const viewCount = formatCount(stats.viewCount);
            const likeCount = formatCount(stats.likeCount);
            const commentCount = formatCount(stats.commentCount);

            // description 포맷: "조회수 10만 · 좋아요 1.5만 · 댓글 500"
            const descParts = [];
            if (viewCount) descParts.push(`조회수 ${viewCount}`);
            if (likeCount) descParts.push(`좋아요 ${likeCount}개`);
            if (commentCount) descParts.push(`댓글 ${commentCount}개`);

            return {
                title: snippet.title,
                thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                description: descParts.join(' · '),
                author: snippet.channelTitle
            };
        }
    } catch (e) {
        console.log('YouTube API failed:', e.message);
    }
    return null;
}

// YouTube Data API로 채널 정보 가져오기
async function fetchYouTubeChannelInfo(channelInfo) {
    try {
        let apiUrl;
        if (channelInfo.type === 'handle') {
            apiUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forHandle=${channelInfo.value}&key=${YOUTUBE_API_KEY}`;
        } else {
            apiUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelInfo.value}&key=${YOUTUBE_API_KEY}`;
        }

        const response = await axios.get(apiUrl, { timeout: 8000 });

        if (response.data.items && response.data.items.length > 0) {
            const item = response.data.items[0];
            const snippet = item.snippet;
            const stats = item.statistics;

            const subCount = formatCount(stats.subscriberCount);
            const videoCount = formatCount(stats.videoCount);

            // description 포맷: "구독자 100만명 · 동영상 500개"
            const descParts = [];
            if (subCount) descParts.push(`구독자 ${subCount}명`);
            if (videoCount) descParts.push(`동영상 ${videoCount}개`);

            return {
                title: snippet.title,
                thumbnail: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || '',
                description: descParts.join(' · '),
                author: `@${channelInfo.value}`
            };
        }
    } catch (e) {
        console.log('YouTube Channel API failed:', e.message);
    }
    return null;
}

// OG 태그 파싱
async function fetchOgTags(url, platform, type) {
    try {
        const authorHandle = extractAuthorHandle(url);

        // ===== YouTube 영상 =====
        if (platform === 'youtube' && type === 'video') {
            const videoId = extractYouTubeVideoId(url);
            if (videoId) {
                // YouTube API로 정보 가져오기
                const apiResult = await fetchYouTubeVideoInfo(videoId);
                if (apiResult) {
                    return apiResult;
                }

                // API 실패 시 OG 태그 폴백
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
                    const channelName = $('link[itemprop="name"]').attr('content') || '';

                    return {
                        title,
                        description: channelName ? `작성자: ${channelName}` : '',
                        thumbnail,
                        author: channelName || authorHandle
                    };
                } catch {
                    return { title: 'YouTube Video', description: '', thumbnail, author: authorHandle };
                }
            }
        }

        // ===== YouTube 채널 =====
        if (platform === 'youtube' && type === 'channel') {
            const channelInfo = extractYouTubeChannelInfo(url);
            if (channelInfo) {
                // YouTube API로 정보 가져오기
                const apiResult = await fetchYouTubeChannelInfo(channelInfo);
                if (apiResult) {
                    return apiResult;
                }
            }

            // API 실패 시 OG 태그 폴백
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
                             $('title').text()?.replace(' - YouTube', '') || 'YouTube Channel';
                const ogDescription = $('meta[property="og:description"]').attr('content') || '';
                const thumbnail = $('meta[property="og:image"]').attr('content') || '';

                // 구독자 수 추출 (한글/영문)
                const subsMatch = ogDescription.match(/구독자\s*([\d,.만억KkMm]+)\s*명?|([\d,.KkMm]+)\s*[Ss]ubscribers?/i);
                const subs = subsMatch?.[1] || subsMatch?.[2];
                const description = subs ? `구독자 ${subs}명` : ogDescription;

                return { title, description, thumbnail, author: authorHandle };
            } catch {
                return { title: 'YouTube Channel', description: '', thumbnail: '', author: authorHandle };
            }
        }

        // ===== TikTok 영상 =====
        // OG 태그에서 좋아요/댓글 정보 가져오기 (oEmbed는 통계 없음)
        if (platform === 'tiktok' && type === 'video') {
            try {
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

                const title = $('meta[property="og:title"]').attr('content') ||
                             $('title').text() || 'TikTok Video';
                const ogDescription = $('meta[property="og:description"]').attr('content') || '';
                const thumbnail = $('meta[property="og:image"]').attr('content') || '';

                // TikTok OG description 형식: "좋아요 570.5K개 · 댓글 7606개"
                return { title, description: ogDescription, thumbnail, author: authorHandle };
            } catch {
                // OG 실패 시 oEmbed 시도
                try {
                    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
                    const response = await axios.get(oembedUrl, { timeout: 8000 });
                    if (response.data) {
                        return {
                            title: response.data.title || 'TikTok Video',
                            description: `작성자: ${response.data.author_name || authorHandle}`,
                            thumbnail: response.data.thumbnail_url || '',
                            author: response.data.author_name || authorHandle
                        };
                    }
                } catch {}
                return { title: 'TikTok Video', description: '', thumbnail: '', author: authorHandle };
            }
        }

        // ===== TikTok 채널 =====
        if (platform === 'tiktok' && type === 'channel') {
            try {
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

                const title = $('meta[property="og:title"]').attr('content') ||
                             $('title').text() || 'TikTok';
                const ogDescription = $('meta[property="og:description"]').attr('content') || '';
                const thumbnail = $('meta[property="og:image"]').attr('content') || '';

                // TikTok 영문 팔로워를 한글로 변환: "12.5M Followers" -> "팔로워 12.5M명"
                let description = ogDescription;
                const followersMatch = ogDescription.match(/([\d.]+[KkMm]?)\s*[Ff]ollowers?/i);
                if (followersMatch) {
                    description = `팔로워 ${followersMatch[1]}명`;
                }

                return { title, description, thumbnail, author: authorHandle };
            } catch {
                return {
                    title: authorHandle || 'TikTok Channel',
                    description: '',
                    thumbnail: '',
                    author: authorHandle
                };
            }
        }

        // ===== Instagram 영상/채널 =====
        if (platform === 'instagram') {
            try {
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

                const title = $('meta[property="og:title"]').attr('content') ||
                             $('meta[name="twitter:title"]').attr('content') ||
                             $('title').text() || 'Instagram';
                const description = $('meta[property="og:description"]').attr('content') ||
                                   $('meta[name="description"]').attr('content') || '';
                const thumbnail = $('meta[property="og:image"]').attr('content') ||
                                 $('meta[name="twitter:image"]').attr('content') || '';

                return { title, description, thumbnail, author: authorHandle };
            } catch {
                return {
                    title: authorHandle || 'Instagram',
                    description: '',
                    thumbnail: '',
                    author: authorHandle
                };
            }
        }

        // ===== 기타 플랫폼 =====
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
                      $('meta[name="twitter:image"]').attr('content') || '',
            author: authorHandle
        };
    } catch (error) {
        console.error('OG parsing failed:', error.message);
        const authorHandle = extractAuthorHandle(url);
        return { title: authorHandle || url, description: '', thumbnail: '', author: authorHandle };
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
        const ogData = await fetchOgTags(url, urlInfo.platform, urlInfo.type);

        return res.status(200).json({
            platform: urlInfo.platform,
            type: urlInfo.type,
            videoType: urlInfo.videoType,
            title: cleanTitle(ogData.title, urlInfo.platform),
            thumbnail: ogData.thumbnail,
            description: ogData.description,
            author: ogData.author || null,
            url: url
        });
    } catch (error) {
        console.error('Parse URL error:', error);
        return res.status(500).json({ error: '정보를 가져올 수 없습니다.' });
    }
}
