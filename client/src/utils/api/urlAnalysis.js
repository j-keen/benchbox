// URL 분석 함수 (클라이언트에서 직접 처리)
export const PLATFORM_PATTERNS = {
    youtube: {
        shorts: [/(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/],
        long: [/(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/, /youtu\.be\/([a-zA-Z0-9_-]+)/],
        channel: [/(?:www\.)?youtube\.com\/@([a-zA-Z0-9_-]+)/, /(?:www\.)?youtube\.com\/channel\/([a-zA-Z0-9_-]+)/]
    },
    tiktok: {
        shorts: [/(?:www\.)?tiktok\.com\/@[\w.-]+\/video\/(\d+)/, /vt\.tiktok\.com\/([a-zA-Z0-9]+)/],
        channel: [/(?:www\.)?tiktok\.com\/@([\w.-]+)\/?(?:\?|$)/]
    },
    instagram: {
        shorts: [/(?:www\.)?instagram\.com\/reel\/([a-zA-Z0-9_-]+)/],
        long: [/(?:www\.)?instagram\.com\/p\/([a-zA-Z0-9_-]+)/],
        channel: [/(?:www\.)?instagram\.com\/([a-zA-Z0-9_.-]+)\/?(?:\?|$)/]
    },
    xiaohongshu: {
        shorts: [/(?:www\.)?xiaohongshu\.com\/explore\/([a-zA-Z0-9]+)/, /xhslink\.com\/([a-zA-Z0-9]+)/],
        channel: [/(?:www\.)?xiaohongshu\.com\/user\/profile\/([a-zA-Z0-9]+)/]
    }
};

export function analyzeUrl(url) {
    const normalizedUrl = url.trim();
    for (const [platform, patterns] of Object.entries(PLATFORM_PATTERNS)) {
        if (patterns.shorts) {
            for (const regex of patterns.shorts) {
                if (regex.test(normalizedUrl)) {
                    return { platform, type: 'video', videoType: 'shorts', url: normalizedUrl };
                }
            }
        }
        if (patterns.long) {
            for (const regex of patterns.long) {
                if (regex.test(normalizedUrl)) {
                    return { platform, type: 'video', videoType: 'long', url: normalizedUrl };
                }
            }
        }
        if (patterns.channel) {
            for (const regex of patterns.channel) {
                if (regex.test(normalizedUrl)) {
                    return { platform, type: 'channel', videoType: null, url: normalizedUrl };
                }
            }
        }
    }
    return { platform: 'other', type: 'unknown', videoType: null, url: normalizedUrl };
}

// YouTube 비디오 ID 추출 (폴백용)
export function extractYouTubeVideoId(url) {
    let match = url.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
    match = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
    match = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
    return null;
}
