import { supabase } from '../../lib/supabase';
import { withRetry } from './withRetry';
import { analyzeUrl } from './urlAnalysis';
import { storageApi } from './storageApi';

// 채널 API
export const channelsApi = {
    getAll: async (params = {}) => {
        let query = supabase.from('channels').select('*, folders(name, color)');

        if (params.folder_id !== undefined) {
            if (params.folder_id === 'null' || params.folder_id === '') {
                query = query.is('folder_id', null);
            } else {
                query = query.eq('folder_id', params.folder_id);
            }
        }

        query = query.order('created_at', { ascending: false });
        const { data: channels, error } = await withRetry(() => query);
        if (error) throw error;

        const channelsWithCount = await Promise.all(channels.map(async (channel) => {
            const { count } = await withRetry(() => supabase
                .from('videos')
                .select('*', { count: 'exact', head: true })
                .eq('channel_id', channel.id));

            return {
                ...channel,
                video_count: count || 0,
                folder_name: channel.folders?.name,
                folder_color: channel.folders?.color
            };
        }));

        return { data: { channels: channelsWithCount } };
    },

    getById: async (id) => {
        const { data: channel, error } = await withRetry(() => supabase
            .from('channels')
            .select('*')
            .eq('id', id)
            .single());

        if (error) throw error;

        const { count } = await withRetry(() => supabase
            .from('videos')
            .select('*', { count: 'exact', head: true })
            .eq('channel_id', id));

        return { data: { ...channel, video_count: count || 0 } };
    },

    create: async (data) => {
        const { url, memo = '', title, thumbnail, description } = data;
        const urlInfo = analyzeUrl(url);

        // 중복 체크 (에러 발생시 무시하고 진행)
        try {
            const { data: existing } = await supabase.from('channels').select('id').eq('url', url).maybeSingle();
            if (existing) {
                throw { response: { status: 409, data: { error: '이미 등록된 채널입니다.', existingId: existing.id } } };
            }
        } catch (dupError) {
            if (dupError.response?.status === 409) throw dupError;
        }

        const { data: savedChannel, error } = await supabase
            .from('channels')
            .insert({
                url,
                platform: urlInfo.platform,
                title: title || url,
                thumbnail: thumbnail || null,
                description: description || null,
                memo
            })
            .select()
            .single();

        if (error) throw error;
        return { data: { ...savedChannel, video_count: 0 } };
    },

    update: async (id, data) => {
        const { memo, folder_id, thumbnail, title } = data;
        const updates = { updated_at: new Date().toISOString() };
        if (memo !== undefined) updates.memo = memo;
        if (folder_id !== undefined) {
            updates.folder_id = (folder_id === null || folder_id === '') ? null : folder_id;
        }
        if (thumbnail !== undefined) updates.thumbnail = thumbnail;
        if (title !== undefined) updates.title = title;

        await supabase.from('channels').update(updates).eq('id', id);

        const { data: updatedChannel } = await withRetry(() => supabase
            .from('channels')
            .select('*, folders(name, color)')
            .eq('id', id)
            .single());

        const { count } = await withRetry(() => supabase
            .from('videos')
            .select('*', { count: 'exact', head: true })
            .eq('channel_id', id));

        return {
            data: {
                ...updatedChannel,
                video_count: count || 0,
                folder_name: updatedChannel.folders?.name,
                folder_color: updatedChannel.folders?.color
            }
        };
    },

    delete: async (id) => {
        // 삭제 전 채널 정보 가져오기 (썸네일 URL)
        const { data: channel } = await supabase
            .from('channels')
            .select('thumbnail')
            .eq('id', id)
            .single();

        // 채널 삭제
        const { error } = await supabase.from('channels').delete().eq('id', id);
        if (error) throw error;

        // 썸네일 이미지 삭제 (Supabase Storage 이미지만)
        if (channel?.thumbnail) {
            await storageApi.deleteImage(channel.thumbnail);
        }

        return { data: { message: '채널이 삭제되었습니다.' } };
    }
};
