import { supabase } from '../../lib/supabase';
import { withRetry } from './withRetry';

// 폴더 API
export const foldersApi = {
    getAll: async () => {
        const { data: folders, error } = await withRetry(() => supabase
            .from('folders')
            .select('*')
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: false }));

        if (error) throw error;

        const foldersWithCount = await Promise.all(folders.map(async (folder) => {
            const { count: channelCount } = await withRetry(() => supabase
                .from('channels')
                .select('*', { count: 'exact', head: true })
                .eq('folder_id', folder.id));

            const { count: videoCount } = await withRetry(() => supabase
                .from('videos')
                .select('*', { count: 'exact', head: true })
                .eq('folder_id', folder.id));

            return { ...folder, channel_count: channelCount || 0, video_count: videoCount || 0 };
        }));

        return { data: { folders: foldersWithCount } };
    },

    getById: async (id) => {
        const { data: folder, error } = await withRetry(() => supabase.from('folders').select('*').eq('id', id).single());
        if (error) throw error;

        const { data: channels } = await withRetry(() => supabase
            .from('channels')
            .select('*')
            .eq('folder_id', id)
            .order('created_at', { ascending: false }));

        const channelsWithCount = await Promise.all((channels || []).map(async (channel) => {
            const { count } = await withRetry(() => supabase
                .from('videos')
                .select('*', { count: 'exact', head: true })
                .eq('channel_id', channel.id));
            return { ...channel, video_count: count || 0 };
        }));

        const channelIds = (channels || []).map(c => c.id);
        let channelVideos = [];
        if (channelIds.length > 0) {
            const { data } = await withRetry(() => supabase
                .from('videos')
                .select('*, channels(title, thumbnail)')
                .in('channel_id', channelIds)
                .order('created_at', { ascending: false }));

            channelVideos = (data || []).map(v => ({
                ...v,
                channel_title: v.channels?.title,
                channel_thumbnail: v.channels?.thumbnail,
                source_type: 'channel'
            }));
        }

        const { data: folderVideos } = await withRetry(() => supabase
            .from('videos')
            .select('*')
            .eq('folder_id', id)
            .is('channel_id', null)
            .order('created_at', { ascending: false }));

        const directVideos = (folderVideos || []).map(v => ({
            ...v,
            channel_title: null,
            channel_thumbnail: null,
            source_type: 'folder'
        }));

        const allVideos = [...channelVideos, ...directVideos].sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );

        const videosWithTags = await Promise.all(allVideos.map(async (video) => {
            const { data: tagData } = await withRetry(() => supabase
                .from('video_tags')
                .select('tags(name)')
                .eq('video_id', video.id));
            const tags = tagData?.map(t => t.tags?.name).filter(Boolean) || [];
            return { ...video, tags };
        }));

        const { count: channelCount } = await withRetry(() => supabase
            .from('channels')
            .select('*', { count: 'exact', head: true })
            .eq('folder_id', id));

        return {
            data: {
                folder: { ...folder, channel_count: channelCount || 0 },
                channels: channelsWithCount,
                videos: videosWithTags,
                stats: {
                    channel_count: channelsWithCount.length,
                    video_count: videosWithTags.length
                }
            }
        };
    },

    create: async (data) => {
        const { name, color = '#6366f1', cover_image, description } = data;

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
        return { data: { ...folder, channel_count: 0 } };
    },

    update: async (id, data) => {
        const { name, color, cover_image, description, sort_order } = data;
        const updates = {};
        if (name !== undefined) updates.name = name;
        if (color !== undefined) updates.color = color;
        if (cover_image !== undefined) updates.cover_image = cover_image;
        if (description !== undefined) updates.description = description;
        if (sort_order !== undefined) updates.sort_order = sort_order;

        const { data: folder, error } = await supabase
            .from('folders')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        const { count } = await withRetry(() => supabase
            .from('channels')
            .select('*', { count: 'exact', head: true })
            .eq('folder_id', id));

        return { data: { ...folder, channel_count: count || 0 } };
    },

    delete: async (id) => {
        const { error } = await supabase.from('folders').delete().eq('id', id);
        if (error) throw error;
        return { data: { message: '폴더가 삭제되었습니다.' } };
    },

    moveChannels: async (folderId, channelIds) => {
        const fid = folderId === 'null' ? null : folderId;
        for (const channelId of channelIds) {
            await supabase.from('channels').update({ folder_id: fid }).eq('id', channelId);
        }
        return { data: { message: '채널이 이동되었습니다.' } };
    },

    moveVideos: async (folderId, videoIds) => {
        const fid = folderId === 'null' ? null : folderId;
        for (const videoId of videoIds) {
            await supabase.from('videos').update({ folder_id: fid, channel_id: null }).eq('id', videoId);
        }
        return { data: { message: '영상이 폴더로 이동되었습니다.' } };
    },

    reorder: async (folderIds) => {
        for (let i = 0; i < folderIds.length; i++) {
            await supabase.from('folders').update({ sort_order: i }).eq('id', folderIds[i]);
        }
        return { data: { message: '폴더 순서가 변경되었습니다.' } };
    }
};
