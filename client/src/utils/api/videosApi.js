import { supabase } from '../../lib/supabase';
import { withRetry } from './withRetry';
import { analyzeUrl } from './urlAnalysis';
import { syncVideoTags } from './tagHelpers';

// 영상 API
export const videosApi = {
    getAll: async (params = {}) => {
        let query = supabase.from('videos').select('*, video_tags(tags(name))');

        if (params.channel_id === 'null' || params.channel_id === '') {
            query = query.is('channel_id', null);
        } else if (params.channel_id) {
            query = query.eq('channel_id', params.channel_id);
        }

        if (params.folder_id === 'null' || params.folder_id === '') {
            query = query.is('folder_id', null);
        } else if (params.folder_id) {
            query = query.eq('folder_id', params.folder_id);
        }

        // 완전 미분류 (폴더도 채널도 없는 영상)
        if (params.unassigned) {
            query = query.is('channel_id', null).is('folder_id', null);
        }

        if (params.platform && params.platform !== 'all') {
            query = query.eq('platform', params.platform);
        }

        if (params.video_type && params.video_type !== 'all') {
            query = query.eq('video_type', params.video_type);
        }

        // 검색은 태그 포함해서 JS에서 처리 (아래 videosWithTags에서)

        switch (params.sort) {
            case 'oldest':
                query = query.order('created_at', { ascending: true });
                break;
            case 'title':
                query = query.order('title', { ascending: true });
                break;
            default:
                query = query.order('created_at', { ascending: false });
        }

        const { data: videos, error } = await withRetry(() => query);
        if (error) throw error;

        // 관계형 쿼리로 가져온 태그 데이터를 파싱
        const videosWithTags = videos.map(video => {
            const tags = (video.video_tags || []).map(vt => vt.tags?.name).filter(Boolean);
            const { video_tags: _, ...videoData } = video;
            return { ...videoData, tags };
        }).filter(video => {
            // 태그 필터
            if (params.tag && !video.tags.includes(params.tag)) {
                return false;
            }

            // 검색어로 태그도 검색 (# 제거 후 비교)
            if (params.search) {
                const searchLower = params.search.replace(/^#/, '').toLowerCase();
                const titleMatch = video.title?.toLowerCase().includes(searchLower);
                const memoMatch = video.memo?.toLowerCase().includes(searchLower);
                const tagMatch = video.tags.some(tag => tag.toLowerCase().includes(searchLower));

                if (!titleMatch && !memoMatch && !tagMatch) {
                    return false;
                }
            }

            return true;
        });

        return { data: { videos: videosWithTags } };
    },

    getById: async (id) => {
        const { data: video, error } = await withRetry(() => supabase
            .from('videos')
            .select('*, channels(title)')
            .eq('id', id)
            .single());

        if (error) throw error;

        const { data: tagData } = await withRetry(() => supabase
            .from('video_tags')
            .select('tags(name)')
            .eq('video_id', id));

        const tags = tagData?.map(t => t.tags?.name).filter(Boolean) || [];

        return {
            data: {
                ...video,
                channel_title: video.channels?.title,
                tags
            }
        };
    },

    create: async (data) => {
        const { url, channel_id = null, folder_id = null, memo = '', tags = [], title, thumbnail, description } = data;
        const urlInfo = analyzeUrl(url);

        // 중복 체크 (에러 발생시 무시하고 진행)
        try {
            const { data: existing } = await supabase
                .from('videos')
                .select('id')
                .eq('url', url)
                .maybeSingle();

            if (existing) {
                throw { response: { status: 409, data: { error: '이미 저장된 영상입니다.', existingId: existing.id } } };
            }
        } catch (dupError) {
            // 중복 체크 에러는 무시 (URL 특수문자 문제)
            if (dupError.response?.status === 409) throw dupError;
        }

        const { data: savedVideo, error } = await supabase
            .from('videos')
            .insert({
                url,
                channel_id: channel_id || null,
                folder_id: folder_id || null,
                platform: urlInfo.platform,
                video_type: urlInfo.videoType || 'long',
                title: title || url,
                thumbnail: thumbnail || null,
                description: description || null,
                memo
            })
            .select()
            .single();

        if (error) throw error;

        // 태그 처리 (create: replace=false로 기존 삭제 없이 추가만)
        await syncVideoTags(savedVideo.id, tags, { replace: false });

        return { data: { ...savedVideo, tags } };
    },

    update: async (id, data) => {
        const { memo, tags, channel_id, folder_id } = data;
        const updates = { updated_at: new Date().toISOString() };
        if (memo !== undefined) updates.memo = memo;
        if (channel_id !== undefined) updates.channel_id = channel_id || null;
        if (folder_id !== undefined) updates.folder_id = folder_id || null;

        await supabase.from('videos').update(updates).eq('id', id);

        if (tags !== undefined) {
            // update: replace=true로 기존 태그 삭제 후 재생성
            await syncVideoTags(id, tags);
        }

        const { data: updatedVideo } = await supabase.from('videos').select('*').eq('id', id).single();
        const { data: tagData } = await supabase.from('video_tags').select('tags(name)').eq('video_id', id);
        const updatedTags = tagData?.map(t => t.tags?.name).filter(Boolean) || [];

        return { data: { ...updatedVideo, tags: updatedTags } };
    },

    delete: async (id) => {
        const { error } = await supabase.from('videos').delete().eq('id', id);
        if (error) throw error;
        return { data: { message: '영상이 삭제되었습니다.' } };
    }
};
