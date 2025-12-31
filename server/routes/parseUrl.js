import { Router } from 'express';
import { analyzeUrl, isValidUrl } from '../services/urlAnalyzer.js';
import { fetchOgTags } from '../services/ogParser.js';

const router = Router();

// URL 정보 추출
router.post('/', async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL이 필요합니다.' });
        }

        if (!isValidUrl(url)) {
            return res.status(400).json({ error: '유효한 URL을 입력해주세요.' });
        }

        // URL 분석
        const urlInfo = analyzeUrl(url);

        // OG 태그 파싱 (플랫폼 정보 전달)
        const ogData = await fetchOgTags(url, urlInfo.platform);

        res.json({
            platform: urlInfo.platform,
            type: urlInfo.type,
            title: ogData.title,
            thumbnail: ogData.thumbnail,
            description: ogData.description,
            siteName: ogData.siteName,
            original_url: url
        });
    } catch (error) {
        console.error('URL 파싱 오류:', error);
        res.status(500).json({ error: '정보를 가져올 수 없습니다.' });
    }
});

export default router;
