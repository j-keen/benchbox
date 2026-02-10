import { getGoogleApiKey } from './googleApiKey';

// YouTube 댓글 API (같은 Google API Key 사용)
export const youtubeCommentsApi = {
    getComments: async (videoUrl) => {
        const match = videoUrl?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]+)/);
        if (!match) return { comments: [], disabled: false };

        const videoId = match[1];

        // Try server first, fallback to direct YouTube API call
        try {
            const response = await fetch('/api/youtube-comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ videoId })
            });
            if (response.ok) return response.json();
        } catch (e) {
            console.log('서버 API 실패, 클라이언트 폴백:', e.message);
        }

        // Direct YouTube API call (only if API key is available)
        const youtubeApiKey = getGoogleApiKey();
        if (!youtubeApiKey) {
            console.log('YouTube API 키가 설정되지 않았습니다.');
            return { comments: [], disabled: false };
        }
        try {
            const ytResponse = await fetch(
                `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&order=relevance&maxResults=10&key=${youtubeApiKey}`
            );
            if (ytResponse.status === 403) return { comments: [], disabled: true };
            if (!ytResponse.ok) throw new Error('YouTube API 호출 실패');

            const ytData = await ytResponse.json();
            const comments = (ytData.items || []).map(item => {
                const snippet = item.snippet?.topLevelComment?.snippet;
                return {
                    author: snippet?.authorDisplayName || '익명',
                    text: snippet?.textDisplay || '',
                    likeCount: snippet?.likeCount || 0,
                    publishedAt: snippet?.publishedAt || ''
                };
            });
            return { comments };
        } catch (error) {
            console.error('YouTube API 오류:', error);
            return { comments: [], disabled: false };
        }
    }
};
