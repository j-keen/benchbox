import { analyzeUrl, extractYouTubeVideoId } from './urlAnalysis';

// URL 파싱 API (서버 API 호출, 실패시 클라이언트 폴백)
export const parseUrlApi = {
    parse: async (url) => {
        // 서버 API 호출 시도
        try {
            const response = await fetch('/api/parse-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });

            if (response.ok) {
                const data = await response.json();
                return { data };
            }
        } catch (e) {
            console.log('서버 API 실패, 클라이언트 폴백 사용:', e.message);
        }

        // 폴백: 클라이언트에서 직접 처리
        const urlInfo = analyzeUrl(url);

        // YouTube인 경우 썸네일 직접 생성
        if (urlInfo.platform === 'youtube') {
            const videoId = extractYouTubeVideoId(url);
            if (videoId) {
                return {
                    data: {
                        platform: urlInfo.platform,
                        type: urlInfo.type,
                        videoType: urlInfo.videoType,
                        url: urlInfo.url,
                        title: url,
                        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                        description: ''
                    }
                };
            }
        }

        // 다른 플랫폼은 기본값 반환
        return {
            data: {
                platform: urlInfo.platform,
                type: urlInfo.type,
                videoType: urlInfo.videoType,
                url: urlInfo.url,
                title: url,
                thumbnail: '',
                description: ''
            }
        };
    }
};
