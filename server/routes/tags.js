import { Router } from 'express';
import supabase from '../db/database.js';

const router = Router();

// 전체 태그 목록 (사용 횟수 포함)
router.get('/', async (req, res) => {
    try {
        const { data: tags, error } = await supabase
            .from('tags')
            .select('*');

        if (error) throw error;

        // 각 태그의 사용 횟수 계산
        const tagsWithCount = await Promise.all(tags.map(async (tag) => {
            const { count: videoCount } = await supabase
                .from('video_tags')
                .select('*', { count: 'exact', head: true })
                .eq('tag_id', tag.id);

            const { count: channelCount } = await supabase
                .from('channel_tags')
                .select('*', { count: 'exact', head: true })
                .eq('tag_id', tag.id);

            return {
                ...tag,
                count: (videoCount || 0) + (channelCount || 0)
            };
        }));

        // 사용 횟수로 정렬
        tagsWithCount.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

        res.json({ tags: tagsWithCount });
    } catch (error) {
        console.error('태그 목록 조회 오류:', error);
        res.status(500).json({ error: '태그 목록을 가져올 수 없습니다.' });
    }
});

// 태그 자동완성
router.get('/autocomplete', async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.length < 1) {
            return res.json({ suggestions: [] });
        }

        const { data: tags, error } = await supabase
            .from('tags')
            .select('name')
            .ilike('name', `%${q}%`)
            .order('name', { ascending: true })
            .limit(10);

        if (error) throw error;

        res.json({
            suggestions: tags.map(t => t.name)
        });
    } catch (error) {
        console.error('태그 자동완성 오류:', error);
        res.status(500).json({ error: '태그 추천을 가져올 수 없습니다.' });
    }
});

// 특정 채널에서 자주 사용되는 태그 (추천용)
router.get('/recommend/:channelId', async (req, res) => {
    try {
        const { channelId } = req.params;

        // 채널의 영상 ID들 가져오기
        const { data: videos } = await supabase
            .from('videos')
            .select('id')
            .eq('channel_id', channelId);

        if (!videos || videos.length === 0) {
            return res.json({ recommendations: [] });
        }

        const videoIds = videos.map(v => v.id);

        // 해당 영상들의 태그 가져오기
        const { data: videoTags } = await supabase
            .from('video_tags')
            .select('tag_id, tags(name)')
            .in('video_id', videoIds);

        // 태그별 카운트
        const tagCounts = {};
        (videoTags || []).forEach(vt => {
            const tagName = vt.tags?.name;
            if (tagName) {
                tagCounts[tagName] = (tagCounts[tagName] || 0) + 1;
            }
        });

        // 정렬하여 상위 5개 반환
        const recommendations = Object.entries(tagCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name]) => name);

        res.json({ recommendations });
    } catch (error) {
        console.error('태그 추천 오류:', error);
        res.status(500).json({ error: '추천 태그를 가져올 수 없습니다.' });
    }
});

// 채널에 태그 추가/업데이트
router.post('/channel/:channelId', async (req, res) => {
    try {
        const { channelId } = req.params;
        const { tags } = req.body;

        if (!Array.isArray(tags)) {
            return res.status(400).json({ error: '태그 배열이 필요합니다.' });
        }

        // 기존 태그 삭제
        await supabase
            .from('channel_tags')
            .delete()
            .eq('channel_id', channelId);

        // 새 태그 추가
        for (const tagName of tags) {
            const trimmedName = tagName.trim();
            if (!trimmedName) continue;

            // 태그가 없으면 생성
            let { data: tag } = await supabase
                .from('tags')
                .select('id')
                .eq('name', trimmedName)
                .single();

            if (!tag) {
                const { data: newTag } = await supabase
                    .from('tags')
                    .insert({ name: trimmedName })
                    .select()
                    .single();
                tag = newTag;
            }

            if (tag) {
                await supabase
                    .from('channel_tags')
                    .upsert({ channel_id: channelId, tag_id: tag.id });
            }
        }

        // 업데이트된 태그 반환
        const { data: updatedTags } = await supabase
            .from('channel_tags')
            .select('tags(name)')
            .eq('channel_id', channelId);

        res.json({
            tags: (updatedTags || []).map(t => t.tags?.name).filter(Boolean)
        });
    } catch (error) {
        console.error('채널 태그 업데이트 오류:', error);
        res.status(500).json({ error: '태그를 업데이트할 수 없습니다.' });
    }
});

// 채널의 태그 조회
router.get('/channel/:channelId', async (req, res) => {
    try {
        const { channelId } = req.params;

        const { data: tagData, error } = await supabase
            .from('channel_tags')
            .select('tags(name)')
            .eq('channel_id', channelId);

        if (error) throw error;

        res.json({
            tags: (tagData || []).map(t => t.tags?.name).filter(Boolean)
        });
    } catch (error) {
        console.error('채널 태그 조회 오류:', error);
        res.status(500).json({ error: '태그를 가져올 수 없습니다.' });
    }
});

export default router;
