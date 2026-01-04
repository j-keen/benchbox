import { Router } from 'express';
import supabase from '../db/database.js';

const router = Router();

// 모든 폴더 조회
router.get('/', async (req, res) => {
    try {
        const { data: folders, error } = await supabase
            .from('folders')
            .select('*')
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: false });

        if (error) throw error;

        // 각 폴더의 채널 수 계산
        const foldersWithCount = await Promise.all(folders.map(async (folder) => {
            const { count } = await supabase
                .from('channels')
                .select('*', { count: 'exact', head: true })
                .eq('folder_id', folder.id);

            return {
                ...folder,
                channel_count: count || 0
            };
        }));

        res.json({ folders: foldersWithCount });
    } catch (error) {
        console.error('폴더 조회 오류:', error);
        res.status(500).json({ error: '폴더 목록을 가져오는데 실패했습니다.' });
    }
});

// 폴더 상세 조회 (채널 + 영상 포함)
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // 폴더 조회
        const { data: folder, error: folderError } = await supabase
            .from('folders')
            .select('*')
            .eq('id', id)
            .single();

        if (folderError || !folder) {
            return res.status(404).json({ error: '폴더를 찾을 수 없습니다.' });
        }

        // 폴더 내 채널들
        const { data: channels } = await supabase
            .from('channels')
            .select('*')
            .eq('folder_id', id)
            .order('created_at', { ascending: false });

        // 각 채널의 영상 수 계산
        const channelsWithCount = await Promise.all((channels || []).map(async (channel) => {
            const { count } = await supabase
                .from('videos')
                .select('*', { count: 'exact', head: true })
                .eq('channel_id', channel.id);

            return {
                ...channel,
                video_count: count || 0
            };
        }));

        // 채널을 통한 영상들
        const channelIds = (channels || []).map(c => c.id);
        let channelVideos = [];
        if (channelIds.length > 0) {
            const { data } = await supabase
                .from('videos')
                .select(`
                    *,
                    channels(title, thumbnail)
                `)
                .in('channel_id', channelIds)
                .order('created_at', { ascending: false });

            channelVideos = (data || []).map(v => ({
                ...v,
                channel_title: v.channels?.title,
                channel_thumbnail: v.channels?.thumbnail,
                source_type: 'channel'
            }));
        }

        // 폴더에 직접 저장된 영상들 (channel_id 유무 상관없이)
        const { data: folderVideos } = await supabase
            .from('videos')
            .select(`
                *,
                channels(title, thumbnail)
            `)
            .eq('folder_id', id)
            .order('created_at', { ascending: false });

        // 채널 영상과 중복되지 않는 폴더 직접 저장 영상만 추가
        const channelVideoIds = new Set(channelVideos.map(v => v.id));
        const directVideos = (folderVideos || [])
            .filter(v => !channelVideoIds.has(v.id)) // 중복 제거
            .map(v => ({
                ...v,
                channel_title: v.channels?.title || null,
                channel_thumbnail: v.channels?.thumbnail || null,
                source_type: v.channel_id ? 'channel' : 'folder'
            }));

        // 모든 영상 합치기
        const allVideos = [...channelVideos, ...directVideos].sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );

        // 각 영상의 태그 가져오기
        const videosWithTags = await Promise.all(allVideos.map(async (video) => {
            const { data: tagData } = await supabase
                .from('video_tags')
                .select('tags(name)')
                .eq('video_id', video.id);

            const tags = tagData?.map(t => t.tags?.name).filter(Boolean) || [];
            return { ...video, tags };
        }));

        // 채널 수 계산
        const { count: channelCount } = await supabase
            .from('channels')
            .select('*', { count: 'exact', head: true })
            .eq('folder_id', id);

        res.json({
            folder: { ...folder, channel_count: channelCount || 0 },
            channels: channelsWithCount,
            videos: videosWithTags,
            stats: {
                channel_count: channelsWithCount.length,
                video_count: videosWithTags.length
            }
        });
    } catch (error) {
        console.error('폴더 상세 조회 오류:', error);
        res.status(500).json({ error: '폴더 정보를 가져오는데 실패했습니다.' });
    }
});

// 폴더 생성
router.post('/', async (req, res) => {
    try {
        const { name, color = '#6366f1', cover_image, description } = req.body;

        if (!name) {
            return res.status(400).json({ error: '폴더 이름이 필요합니다.' });
        }

        // 정렬 순서 계산
        const { data: maxOrderData } = await supabase
            .from('folders')
            .select('sort_order')
            .order('sort_order', { ascending: false })
            .limit(1)
            .single();

        const sortOrder = (maxOrderData?.sort_order || 0) + 1;

        const { data: folder, error } = await supabase
            .from('folders')
            .insert({
                name,
                color,
                cover_image: cover_image || null,
                description: description || null,
                sort_order: sortOrder
            })
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({ ...folder, channel_count: 0 });
    } catch (error) {
        console.error('폴더 생성 오류:', error);
        res.status(500).json({ error: '폴더 생성에 실패했습니다.' });
    }
});

// 폴더 수정
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, color, cover_image, description, sort_order } = req.body;

        // 폴더 존재 확인
        const { data: existing, error: fetchError } = await supabase
            .from('folders')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !existing) {
            return res.status(404).json({ error: '폴더를 찾을 수 없습니다.' });
        }

        // 업데이트할 필드 준비
        const updates = {};
        if (name !== undefined) updates.name = name;
        if (color !== undefined) updates.color = color;
        if (cover_image !== undefined) updates.cover_image = cover_image;
        if (description !== undefined) updates.description = description;
        if (sort_order !== undefined) updates.sort_order = sort_order;

        // 업데이트 실행
        const { data: folder, error } = await supabase
            .from('folders')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // 채널 수 계산
        const { count } = await supabase
            .from('channels')
            .select('*', { count: 'exact', head: true })
            .eq('folder_id', id);

        res.json({ ...folder, channel_count: count || 0 });
    } catch (error) {
        console.error('폴더 수정 오류:', error);
        res.status(500).json({ error: '폴더 수정에 실패했습니다.' });
    }
});

// 폴더 삭제
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('folders')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({ message: '폴더가 삭제되었습니다.' });
    } catch (error) {
        console.error('폴더 삭제 오류:', error);
        res.status(500).json({ error: '폴더 삭제에 실패했습니다.' });
    }
});

// 영상을 폴더로 직접 이동
router.post('/:id/videos', async (req, res) => {
    try {
        const { id } = req.params;
        const { video_ids } = req.body;

        if (!Array.isArray(video_ids)) {
            return res.status(400).json({ error: '영상 ID 배열이 필요합니다.' });
        }

        const folderId = id === 'null' ? null : id;

        if (folderId !== null) {
            const { data: folder, error } = await supabase
                .from('folders')
                .select('id')
                .eq('id', folderId)
                .single();

            if (error || !folder) {
                return res.status(404).json({ error: '폴더를 찾을 수 없습니다.' });
            }
        }

        for (const videoId of video_ids) {
            await supabase
                .from('videos')
                .update({ folder_id: folderId, channel_id: null })
                .eq('id', videoId);
        }

        res.json({ message: '영상이 폴더로 이동되었습니다.' });
    } catch (error) {
        console.error('영상 이동 오류:', error);
        res.status(500).json({ error: '영상 이동에 실패했습니다.' });
    }
});

// 채널을 폴더로 이동
router.post('/:id/channels', async (req, res) => {
    try {
        const { id } = req.params;
        const { channel_ids } = req.body;

        if (!Array.isArray(channel_ids)) {
            return res.status(400).json({ error: '채널 ID 배열이 필요합니다.' });
        }

        const folderId = id === 'null' ? null : id;

        if (folderId !== null) {
            const { data: folder, error } = await supabase
                .from('folders')
                .select('id')
                .eq('id', folderId)
                .single();

            if (error || !folder) {
                return res.status(404).json({ error: '폴더를 찾을 수 없습니다.' });
            }
        }

        for (const channelId of channel_ids) {
            await supabase
                .from('channels')
                .update({ folder_id: folderId })
                .eq('id', channelId);
        }

        res.json({ message: '채널이 이동되었습니다.' });
    } catch (error) {
        console.error('채널 이동 오류:', error);
        res.status(500).json({ error: '채널 이동에 실패했습니다.' });
    }
});

// 폴더 순서 변경
router.put('/reorder', async (req, res) => {
    try {
        const { folder_ids } = req.body;

        if (!Array.isArray(folder_ids)) {
            return res.status(400).json({ error: '폴더 ID 배열이 필요합니다.' });
        }

        for (let i = 0; i < folder_ids.length; i++) {
            await supabase
                .from('folders')
                .update({ sort_order: i })
                .eq('id', folder_ids[i]);
        }

        res.json({ message: '폴더 순서가 변경되었습니다.' });
    } catch (error) {
        console.error('폴더 순서 변경 오류:', error);
        res.status(500).json({ error: '폴더 순서 변경에 실패했습니다.' });
    }
});

export default router;
