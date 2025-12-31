// URL 분석 서비스 - 플랫폼과 콘텐츠 유형 판별

const PLATFORM_PATTERNS = {
    youtube: {
        shorts: [
            /(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/
        ],
        long: [
            /(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
            /youtu\.be\/([a-zA-Z0-9_-]+)/
        ],
        channel: [
            /(?:www\.)?youtube\.com\/@([a-zA-Z0-9_-]+)/,
            /(?:www\.)?youtube\.com\/channel\/([a-zA-Z0-9_-]+)/,
            /(?:www\.)?youtube\.com\/c\/([a-zA-Z0-9_-]+)/
        ]
    },
    tiktok: {
        shorts: [
            /(?:www\.)?tiktok\.com\/@[\w.-]+\/video\/(\d+)/,
            /vt\.tiktok\.com\/([a-zA-Z0-9]+)/
        ],
        channel: [
            /(?:www\.)?tiktok\.com\/@([\w.-]+)\/?(?:\?|$)/
        ]
    },
    instagram: {
        shorts: [
            /(?:www\.)?instagram\.com\/reel\/([a-zA-Z0-9_-]+)/
        ],
        long: [
            /(?:www\.)?instagram\.com\/p\/([a-zA-Z0-9_-]+)/
        ],
        channel: [
            /(?:www\.)?instagram\.com\/([a-zA-Z0-9_.-]+)\/?(?:\?|$)/
        ]
    },
    xiaohongshu: {
        shorts: [
            /(?:www\.)?xiaohongshu\.com\/explore\/([a-zA-Z0-9]+)/,
            /xhslink\.com\/([a-zA-Z0-9]+)/
        ],
        channel: [
            /(?:www\.)?xiaohongshu\.com\/user\/profile\/([a-zA-Z0-9]+)/
        ]
    }
};

/**
 * URL을 분석하여 플랫폼과 콘텐츠 유형을 반환
 * @param {string} url
 * @returns {{ platform: string, type: string, videoType: string, url: string }}
 */
export function analyzeUrl(url) {
    // URL 정규화
    let normalizedUrl = url.trim();

    for (const [platform, patterns] of Object.entries(PLATFORM_PATTERNS)) {
        // 숏폼 체크 (먼저 체크)
        if (patterns.shorts) {
            for (const regex of patterns.shorts) {
                if (regex.test(normalizedUrl)) {
                    return { platform, type: 'video', videoType: 'shorts', url: normalizedUrl };
                }
            }
        }

        // 롱폼 체크
        if (patterns.long) {
            for (const regex of patterns.long) {
                if (regex.test(normalizedUrl)) {
                    return { platform, type: 'video', videoType: 'long', url: normalizedUrl };
                }
            }
        }

        // 채널 URL 체크
        if (patterns.channel) {
            for (const regex of patterns.channel) {
                if (regex.test(normalizedUrl)) {
                    return { platform, type: 'channel', videoType: null, url: normalizedUrl };
                }
            }
        }
    }

    // 매칭 안 되면 기타로 처리
    return { platform: 'other', type: 'unknown', videoType: null, url: normalizedUrl };
}

/**
 * URL이 유효한지 검사
 * @param {string} url
 * @returns {boolean}
 */
export function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

export default { analyzeUrl, isValidUrl };
