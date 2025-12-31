import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * URL에서 OG 태그 정보를 추출
 * @param {string} url
 * @param {string} platform
 * @returns {Promise<{ title: string, description: string, thumbnail: string, siteName: string }>}
 */
export async function fetchOgTags(url, platform = 'other') {
    try {
        // 플랫폼별 특수 처리
        if (platform === 'tiktok') {
            return await fetchTikTokInfo(url);
        }

        if (platform === 'instagram') {
            return await fetchInstagramInfo(url);
        }

        // 일반 OG 태그 파싱
        return await fetchGenericOgTags(url);
    } catch (error) {
        console.error('OG 태그 파싱 실패:', error.message);
        return {
            title: extractTitleFromUrl(url, platform),
            description: '',
            thumbnail: '',
            siteName: platform
        };
    }
}

/**
 * 일반 OG 태그 파싱
 */
async function fetchGenericOgTags(url) {
    const response = await axios.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
        },
        timeout: 15000,
        maxRedirects: 5
    });

    const $ = cheerio.load(response.data);

    return {
        title: $('meta[property="og:title"]').attr('content') ||
               $('meta[name="twitter:title"]').attr('content') ||
               $('title').text() ||
               'Untitled',
        description: $('meta[property="og:description"]').attr('content') ||
                    $('meta[name="twitter:description"]').attr('content') ||
                    $('meta[name="description"]').attr('content') ||
                    '',
        thumbnail: $('meta[property="og:image"]').attr('content') ||
                  $('meta[name="twitter:image"]').attr('content') ||
                  '',
        siteName: $('meta[property="og:site_name"]').attr('content') ||
                 ''
    };
}

/**
 * TikTok 정보 추출
 */
async function fetchTikTokInfo(url) {
    const username = extractTikTokUsername(url);
    const isVideo = url.includes('/video/');

    try {
        // 영상 URL인 경우 oembed API 사용
        if (isVideo) {
            try {
                const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
                const oembedResponse = await axios.get(oembedUrl, { timeout: 10000 });

                if (oembedResponse.data) {
                    return {
                        title: oembedResponse.data.title || oembedResponse.data.author_name || 'TikTok',
                        description: oembedResponse.data.author_name ? `by ${oembedResponse.data.author_name}` : '',
                        thumbnail: oembedResponse.data.thumbnail_url || '',
                        siteName: 'TikTok'
                    };
                }
            } catch (e) {
                console.log('TikTok oembed 실패:', e.message);
            }
        }

        // 페이지에서 직접 정보 추출
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'facebookexternalhit/1.1',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
            timeout: 15000,
            maxRedirects: 5
        });

        const $ = cheerio.load(response.data);

        // OG 태그에서 정보 추출
        let title = $('meta[property="og:title"]').attr('content') || '';
        let description = $('meta[property="og:description"]').attr('content') || '';
        let thumbnail = $('meta[property="og:image"]').attr('content') || '';

        // __UNIVERSAL_DATA_FOR_REHYDRATION__ 스크립트에서 추가 정보 추출
        $('script#__UNIVERSAL_DATA_FOR_REHYDRATION__').each((i, el) => {
            try {
                const jsonText = $(el).html();
                if (jsonText) {
                    const data = JSON.parse(jsonText);

                    // 사용자 정보 추출
                    const defaultScope = data?.['__DEFAULT_SCOPE__'];
                    if (defaultScope) {
                        const userDetail = defaultScope['webapp.user-detail'];
                        if (userDetail?.userInfo?.user) {
                            const user = userDetail.userInfo.user;
                            title = user.nickname || title;
                            description = user.signature || description;
                            thumbnail = user.avatarLarger || user.avatarMedium || user.avatarThumb || thumbnail;
                        }
                    }
                }
            } catch (e) {
                // JSON 파싱 실패 무시
            }
        });

        // SIGI_STATE 스크립트에서도 시도
        $('script#SIGI_STATE').each((i, el) => {
            try {
                const jsonText = $(el).html();
                if (jsonText) {
                    const data = JSON.parse(jsonText);
                    const userModule = data?.UserModule?.users;
                    if (userModule) {
                        const userKey = Object.keys(userModule)[0];
                        if (userKey && userModule[userKey]) {
                            const user = userModule[userKey];
                            title = user.nickname || title;
                            description = user.signature || description;
                            thumbnail = user.avatarLarger || user.avatarMedium || thumbnail;
                        }
                    }
                }
            } catch (e) {
                // JSON 파싱 실패 무시
            }
        });

        // 타이틀 정리
        title = cleanTitle(title) || username || 'TikTok';

        return {
            title,
            description: description || '',
            thumbnail: thumbnail || '',
            siteName: 'TikTok'
        };
    } catch (error) {
        console.error('TikTok 정보 추출 실패:', error.message);
        return {
            title: username || 'TikTok',
            description: '',
            thumbnail: '',
            siteName: 'TikTok'
        };
    }
}

/**
 * Instagram 정보 추출
 */
async function fetchInstagramInfo(url) {
    const username = extractInstagramUsername(url);

    try {
        // Facebook 봇으로 요청 (Instagram이 더 잘 응답함)
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'facebookexternalhit/1.1',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
            timeout: 15000,
            maxRedirects: 5
        });

        const $ = cheerio.load(response.data);

        let title = $('meta[property="og:title"]').attr('content') || '';
        let description = $('meta[property="og:description"]').attr('content') || '';
        let thumbnail = $('meta[property="og:image"]').attr('content') || '';

        // 타이틀 정리
        title = cleanTitle(title) || username || 'Instagram';

        return {
            title,
            description,
            thumbnail,
            siteName: 'Instagram'
        };
    } catch (error) {
        console.error('Instagram 정보 추출 실패:', error.message);
        return {
            title: username || 'Instagram',
            description: '',
            thumbnail: '',
            siteName: 'Instagram'
        };
    }
}

/**
 * TikTok URL에서 사용자명 추출
 */
function extractTikTokUsername(url) {
    const match = url.match(/tiktok\.com\/@([\w.-]+)/);
    return match ? `@${match[1]}` : null;
}

/**
 * Instagram URL에서 사용자명 추출
 */
function extractInstagramUsername(url) {
    const match = url.match(/instagram\.com\/([a-zA-Z0-9_.-]+)/);
    if (match && !['p', 'reel', 'reels', 'stories', 'explore'].includes(match[1])) {
        return `@${match[1]}`;
    }
    return null;
}

/**
 * URL에서 기본 타이틀 추출
 */
function extractTitleFromUrl(url, platform) {
    if (platform === 'tiktok') {
        return extractTikTokUsername(url) || 'TikTok';
    }
    if (platform === 'instagram') {
        return extractInstagramUsername(url) || 'Instagram';
    }
    try {
        const urlObj = new URL(url);
        return urlObj.hostname;
    } catch {
        return 'Untitled';
    }
}

/**
 * 타이틀 정리
 */
function cleanTitle(title) {
    if (!title) return '';
    return title
        .replace(/\s*\|\s*TikTok$/i, '')
        .replace(/\s*on TikTok$/i, '')
        .replace(/\s*•\s*Instagram.*$/i, '')
        .replace(/\(@[\w.-]+\)\s*/g, '')
        .replace(/^\(/, '')
        .replace(/\)$/, '')
        .trim();
}

export default { fetchOgTags };
