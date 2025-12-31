import { Router } from 'express';
import supabase from '../db/database.js';
import { analyzeUrl } from '../services/urlAnalyzer.js';
import { fetchOgTags } from '../services/ogParser.js';

const router = Router();

// 채널 목록 조회
router.get('/', async (req, res) => {
    try {
        const { folder_id } = req.query;

        let query = supabase
            .from('channels')
            .select(`
                *,
                folders(name, color)
            `);

        if (folder_id !== undefined) {
            if (folder_id === 'null' || folder_id === '') {
                query = query.is('folder_id', null);
            } else {
                query = query.eq('folder_id', folder_id);
            }
        }

        query = query.order('created_at', { ascending: false });

        const { data: channels, error } = await query;

        if (error) throw error;

        // 각 채널의 영상 수 계산
        const channelsWithCount = await Promise.all(channels.map(async (channel) => {
            const { count } = await supabase
                .from('videos')
                .select('*', { count: 'exact', head: true })
                .eq('channel_id', channel.id);

            return {
                ...channel,
                video_count: count || 0,
                folder_name: channel.folders?.name,
                folder_color: channel.folders?.color
            };
        }));

        res.json({ channels: channelsWithCount });
    } catch (error) {
        console.error('채널 목록 조회 오류:', error);
        res.status(500).json({ error: '채널 목록을 가져올 수 없습니다.' });
    }
});

// 채널 상세 조회
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { data: channel, error } = await supabase
            .from('channels')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !channel) {
            return res.status(404).json({ error: '채널을 찾을 수 없습니다.' });
        }

        // 영상 수 계산
        const { count } = await supabase
            .from('videos')
            .select('*', { count: 'exact', head: true })
            .eq('channel_id', id);

        res.json({
            ...channel,
            video_count: count || 0
        });
    } catch (error) {
        console.error('채널 상세 조회 오류:', error);
        res.status(500).json({ error: '채널 정보를 가져올 수 없습니다.' });
    }
});

// 채널 등록
router.post('/', async (req, res) => {
    try {
        const { url, memo = '' } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL이 필요합니다.' });
        }

        // URL 분석
        const urlInfo = analyzeUrl(url);

        // 중복 체크
        const { data: existing } = await supabase
            .from('channels')
            .select('id')
            .eq('url', url)
            .single();

        if (existing) {
            return res.status(409).json({
                error: '이미 등록된 채널입니다.',
                existingId: existing.id
            });
        }

        // OG 태그 파싱
        const ogData = await fetchOgTags(url, urlInfo.platform);

        // 채널 저장
        const { data: savedChannel, error } = await supabase
            .from('channels')
            .insert({
                url,
                platform: urlInfo.platform,
                title: ogData.title,
                thumbnail: ogData.thumbnail,
                description: ogData.description,
                memo
            })
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({
            ...savedChannel,
            video_count: 0
        });
    } catch (error) {
        console.error('채널 등록 오류:', error);
        res.status(500).json({ error: '채널을 등록할 수 없습니다.' });
    }
});

// 채널 수정 (메모, 폴더)
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { memo, folder_id } = req.body;

        // 채널 존재 확인
        const { data: channel, error: fetchError } = await supabase
            .from('channels')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !channel) {
            return res.status(404).json({ error: '채널을 찾을 수 없습니다.' });
        }

        // 업데이트할 필드 준비
        const updates = { updated_at: new Date().toISOString() };
        if (memo !== undefined) updates.memo = memo;
        if (folder_id !== undefined) {
            updates.folder_id = (folder_id === null || folder_id === '') ? null : folder_id;
        }

        // 업데이트 실행
        await supabase
            .from('channels')
            .update(updates)
            .eq('id', id);

        // 업데이트된 채널 조회
        const { data: updatedChannel } = await supabase
            .from('channels')
            .select(`
                *,
                folders(name, color)
            `)
            .eq('id', id)
            .single();

        // 영상 수 계산
        const { count } = await supabase
            .from('videos')
            .select('*', { count: 'exact', head: true })
            .eq('channel_id', id);

        res.json({
            ...updatedChannel,
            video_count: count || 0,
            folder_name: updatedChannel.folders?.name,
            folder_color: updatedChannel.folders?.color
        });
    } catch (error) {
        console.error('채널 수정 오류:', error);
        res.status(500).json({ error: '채널을 수정할 수 없습니다.' });
    }
});

// 채널 삭제
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('channels')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({ message: '채널이 삭제되었습니다.' });
    } catch (error) {
        console.error('채널 삭제 오류:', error);
        res.status(500).json({ error: '채널을 삭제할 수 없습니다.' });
    }
});

export default router;
