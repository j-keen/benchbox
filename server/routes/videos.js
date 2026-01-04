import { Router } from 'express';
import supabase from '../db/database.js';
import { analyzeUrl } from '../services/urlAnalyzer.js';
import { fetchOgTags } from '../services/ogParser.js';

const router = Router();

// 영상 목록 조회
router.get('/', async (req, res) => {
    try {
        const { channel_id, folder_id, tag, platform, video_type, search, sort = 'newest' } = req.query;

        let query = supabase
            .from('videos')
            .select('*');

        // 채널 ID 필터
        if (channel_id === 'null' || channel_id === '') {
            query = query.is('channel_id', null);
        } else if (channel_id) {
            query = query.eq('channel_id', channel_id);
        }

        // 폴더 ID 필터
        if (folder_id === 'null' || folder_id === '') {
            query = query.is('folder_id', null);
        } else if (folder_id) {
            query = query.eq('folder_id', folder_id);
        }

        // 플랫폼 필터
        if (platform && platform !== 'all') {
            query = query.eq('platform', platform);
        }

        // 영상 타입 필터
        if (video_type && video_type !== 'all') {
            query = query.eq('video_type', video_type);
        }

        // 검색
        if (search) {
            query = query.or(`title.ilike.%${search}%,memo.ilike.%${search}%`);
        }

        // 정렬
        switch (sort) {
            case 'oldest':
                query = query.order('created_at', { ascending: true });
                break;
            case 'title':
                query = query.order('title', { ascending: true });
                break;
            default:
                query = query.order('created_at', { ascending: false });
        }

        const { data: videos, error } = await query;

        if (error) throw error;

        // 각 영상의 태그 가져오기
        const videosWithTags = await Promise.all(videos.map(async (video) => {
            const { data: tagData } = await supabase
                .from('video_tags')
                .select('tags(name)')
                .eq('video_id', video.id);

            const tags = tagData?.map(t => t.tags?.name).filter(Boolean) || [];

            // 태그 필터링
            if (tag && !tags.includes(tag)) {
                return null;
            }

            return { ...video, tags };
        }));

        // null 제거 (태그 필터링된 것들)
        const filteredVideos = videosWithTags.filter(v => v !== null);

        res.json({ videos: filteredVideos });
    } catch (error) {
        console.error('영상 목록 조회 오류:', error);
        res.status(500).json({ error: '영상 목록을 가져올 수 없습니다.' });
    }
});

// 영상 상세 조회
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { data: video, error } = await supabase
            .from('videos')
            .select(`
                *,
                channels(title)
            `)
            .eq('id', id)
            .single();

        if (error || !video) {
            return res.status(404).json({ error: '영상을 찾을 수 없습니다.' });
        }

        // 태그 가져오기
        const { data: tagData } = await supabase
            .from('video_tags')
            .select('tags(name)')
            .eq('video_id', id);

        const tags = tagData?.map(t => t.tags?.name).filter(Boolean) || [];

        res.json({
            ...video,
            channel_title: video.channels?.title,
            tags
        });
    } catch (error) {
        console.error('영상 상세 조회 오류:', error);
        res.status(500).json({ error: '영상 정보를 가져올 수 없습니다.' });
    }
});

// 영상 저장
router.post('/', async (req, res) => {
    try {
        const { url, channel_id = null, folder_id = null, memo = '', tags = [] } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL이 필요합니다.' });
        }

        // URL 분석
        const urlInfo = analyzeUrl(url);

        // OG 태그 파싱
        const ogData = await fetchOgTags(url, urlInfo.platform);

        // 중복 체크
        const { data: existing } = await supabase
            .from('videos')
            .select('id')
            .eq('url', url)
            .single();

        if (existing) {
            return res.status(409).json({
                error: '이미 저장된 영상입니다.',
                existingId: existing.id
            });
        }

        // 영상 저장
        const { data: savedVideo, error } = await supabase
            .from('videos')
            .insert({
                url,
                channel_id: channel_id || null,
                folder_id: folder_id || null,
                platform: urlInfo.platform,
                video_type: urlInfo.videoType || 'long',
                title: ogData.title,
                thumbnail: ogData.thumbnail,
                description: ogData.description,
                memo
            })
            .select()
            .single();

        if (error) throw error;

        // 태그 처리
        if (tags.length > 0) {
            for (const tagName of tags) {
                const cleanTag = tagName.replace(/^#/, '').trim();
                if (cleanTag) {
                    // 태그 생성 또는 조회
                    let { data: tag } = await supabase
                        .from('tags')
                        .select('id')
                        .eq('name', cleanTag)
                        .single();

                    if (!tag) {
                        const { data: newTag } = await supabase
                            .from('tags')
                            .insert({ name: cleanTag })
                            .select()
                            .single();
                        tag = newTag;
                    }

                    if (tag) {
                        await supabase
                            .from('video_tags')
                            .insert({ video_id: savedVideo.id, tag_id: tag.id });
                    }
                }
            }
        }

        res.status(201).json({
            ...savedVideo,
            tags
        });
    } catch (error) {
        console.error('영상 저장 오류:', error);
        res.status(500).json({ error: '영상을 저장할 수 없습니다.' });
    }
});

// 영상 수정
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { memo, tags, channel_id, folder_id } = req.body;

        // 영상 존재 확인
        const { data: video, error: fetchError } = await supabase
            .from('videos')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !video) {
            return res.status(404).json({ error: '영상을 찾을 수 없습니다.' });
        }

        // 업데이트할 필드 준비
        const updates = { updated_at: new Date().toISOString() };
        if (memo !== undefined) updates.memo = memo;

        // channel_id와 folder_id는 상호 배타적
        // 채널에 저장하면 폴더에서 제거, 폴더에 저장하면 채널에서 제거
        if (channel_id !== undefined) {
            updates.channel_id = channel_id || null;
            if (channel_id) {
                updates.folder_id = null; // 채널에 저장하면 폴더에서 제거
            }
        }
        if (folder_id !== undefined) {
            updates.folder_id = folder_id || null;
            if (folder_id) {
                updates.channel_id = null; // 폴더에 저장하면 채널에서 제거
            }
        }

        // 업데이트 실행
        await supabase
            .from('videos')
            .update(updates)
            .eq('id', id);

        // 태그 업데이트
        if (tags !== undefined) {
            // 기존 태그 삭제
            await supabase
                .from('video_tags')
                .delete()
                .eq('video_id', id);

            // 새 태그 추가
            for (const tagName of tags) {
                const cleanTag = tagName.replace(/^#/, '').trim();
                if (cleanTag) {
                    let { data: tag } = await supabase
                        .from('tags')
                        .select('id')
                        .eq('name', cleanTag)
                        .single();

                    if (!tag) {
                        const { data: newTag } = await supabase
                            .from('tags')
                            .insert({ name: cleanTag })
                            .select()
                            .single();
                        tag = newTag;
                    }

                    if (tag) {
                        await supabase
                            .from('video_tags')
                            .insert({ video_id: id, tag_id: tag.id });
                    }
                }
            }
        }

        // 업데이트된 영상 반환
        const { data: updatedVideo } = await supabase
            .from('videos')
            .select('*')
            .eq('id', id)
            .single();

        // 태그 가져오기
        const { data: tagData } = await supabase
            .from('video_tags')
            .select('tags(name)')
            .eq('video_id', id);

        const updatedTags = tagData?.map(t => t.tags?.name).filter(Boolean) || [];

        res.json({
            ...updatedVideo,
            tags: updatedTags
        });
    } catch (error) {
        console.error('영상 수정 오류:', error);
        res.status(500).json({ error: '영상을 수정할 수 없습니다.' });
    }
});

// 영상 삭제
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('videos')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({ message: '영상이 삭제되었습니다.' });
    } catch (error) {
        console.error('영상 삭제 오류:', error);
        res.status(500).json({ error: '영상을 삭제할 수 없습니다.' });
    }
});

export default router;
