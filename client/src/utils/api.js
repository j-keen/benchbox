import { supabase } from '../lib/supabase';

// 이미지 업로드 API (Supabase Storage)
export const storageApi = {
    uploadImage: async (file, folder = 'thumbnails') => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { data, error } = await supabase.storage
            .from('images')
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) throw error;

        // 공개 URL 가져오기
        const { data: { publicUrl } } = supabase.storage
            .from('images')
            .getPublicUrl(fileName);

        return publicUrl;
    },

    // URL에서 스토리지 파일 경로 추출
    getPathFromUrl: (url) => {
        if (!url) return null;
        // Supabase Storage URL 패턴: .../storage/v1/object/public/images/...
        const match = url.match(/\/storage\/v1\/object\/public\/images\/(.+)$/);
        return match ? match[1] : null;
    },

    // 이미지 삭제 (현재 RLS 정책 문제로 비활성화)
    deleteImage: async (url) => {
        // TODO: Supabase Storage DELETE RLS 정책 해결 후 활성화
        // const path = storageApi.getPathFromUrl(url);
        // if (!path) return;
        // await supabase.storage.from('images').remove([path]);
    }
};

// URL 분석 함수 (클라이언트에서 직접 처리)
const PLATFORM_PATTERNS = {
    youtube: {
        shorts: [/(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/],
        long: [/(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/, /youtu\.be\/([a-zA-Z0-9_-]+)/],
        channel: [/(?:www\.)?youtube\.com\/@([a-zA-Z0-9_-]+)/, /(?:www\.)?youtube\.com\/channel\/([a-zA-Z0-9_-]+)/]
    },
    tiktok: {
        shorts: [/(?:www\.)?tiktok\.com\/@[\w.-]+\/video\/(\d+)/, /vt\.tiktok\.com\/([a-zA-Z0-9]+)/],
        channel: [/(?:www\.)?tiktok\.com\/@([\w.-]+)\/?(?:\?|$)/]
    },
    instagram: {
        shorts: [/(?:www\.)?instagram\.com\/reel\/([a-zA-Z0-9_-]+)/],
        long: [/(?:www\.)?instagram\.com\/p\/([a-zA-Z0-9_-]+)/],
        channel: [/(?:www\.)?instagram\.com\/([a-zA-Z0-9_.-]+)\/?(?:\?|$)/]
    },
    xiaohongshu: {
        shorts: [/(?:www\.)?xiaohongshu\.com\/explore\/([a-zA-Z0-9]+)/, /xhslink\.com\/([a-zA-Z0-9]+)/],
        channel: [/(?:www\.)?xiaohongshu\.com\/user\/profile\/([a-zA-Z0-9]+)/]
    }
};

function analyzeUrl(url) {
    const normalizedUrl = url.trim();
    for (const [platform, patterns] of Object.entries(PLATFORM_PATTERNS)) {
        if (patterns.shorts) {
            for (const regex of patterns.shorts) {
                if (regex.test(normalizedUrl)) {
                    return { platform, type: 'video', videoType: 'shorts', url: normalizedUrl };
                }
            }
        }
        if (patterns.long) {
            for (const regex of patterns.long) {
                if (regex.test(normalizedUrl)) {
                    return { platform, type: 'video', videoType: 'long', url: normalizedUrl };
                }
            }
        }
        if (patterns.channel) {
            for (const regex of patterns.channel) {
                if (regex.test(normalizedUrl)) {
                    return { platform, type: 'channel', videoType: null, url: normalizedUrl };
                }
            }
        }
    }
    return { platform: 'other', type: 'unknown', videoType: null, url: normalizedUrl };
}

// 영상 API
export const videosApi = {
    getAll: async (params = {}) => {
        let query = supabase.from('videos').select('*');

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

        if (params.platform && params.platform !== 'all') {
            query = query.eq('platform', params.platform);
        }

        if (params.video_type && params.video_type !== 'all') {
            query = query.eq('video_type', params.video_type);
        }

        if (params.search) {
            query = query.or(`title.ilike.%${params.search}%,memo.ilike.%${params.search}%`);
        }

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

        const { data: videos, error } = await query;
        if (error) throw error;

        // 태그 가져오기
        const videosWithTags = await Promise.all(videos.map(async (video) => {
            const { data: tagData } = await supabase
                .from('video_tags')
                .select('tags(name)')
                .eq('video_id', video.id);
            const tags = tagData?.map(t => t.tags?.name).filter(Boolean) || [];

            if (params.tag && !tags.includes(params.tag)) {
                return null;
            }
            return { ...video, tags };
        }));

        return { data: { videos: videosWithTags.filter(v => v !== null) } };
    },

    getById: async (id) => {
        const { data: video, error } = await supabase
            .from('videos')
            .select('*, channels(title)')
            .eq('id', id)
            .single();

        if (error) throw error;

        const { data: tagData } = await supabase
            .from('video_tags')
            .select('tags(name)')
            .eq('video_id', id);

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

        // 태그 처리
        for (const tagName of tags) {
            const cleanTag = tagName.replace(/^#/, '').trim();
            if (cleanTag) {
                let { data: tag } = await supabase.from('tags').select('id').eq('name', cleanTag).single();
                if (!tag) {
                    const { data: newTag } = await supabase.from('tags').insert({ name: cleanTag }).select().single();
                    tag = newTag;
                }
                if (tag) {
                    await supabase.from('video_tags').insert({ video_id: savedVideo.id, tag_id: tag.id });
                }
            }
        }

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
            await supabase.from('video_tags').delete().eq('video_id', id);
            for (const tagName of tags) {
                const cleanTag = tagName.replace(/^#/, '').trim();
                if (cleanTag) {
                    let { data: tag } = await supabase.from('tags').select('id').eq('name', cleanTag).single();
                    if (!tag) {
                        const { data: newTag } = await supabase.from('tags').insert({ name: cleanTag }).select().single();
                        tag = newTag;
                    }
                    if (tag) {
                        await supabase.from('video_tags').insert({ video_id: id, tag_id: tag.id });
                    }
                }
            }
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
        const { data: channels, error } = await query;
        if (error) throw error;

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

        return { data: { channels: channelsWithCount } };
    },

    getById: async (id) => {
        const { data: channel, error } = await supabase
            .from('channels')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        const { count } = await supabase
            .from('videos')
            .select('*', { count: 'exact', head: true })
            .eq('channel_id', id);

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

        // 썸네일 변경 시 기존 이미지 삭제 (현재 비활성화)
        // if (thumbnail !== undefined) {
        //     const { data: oldChannel } = await supabase
        //         .from('channels')
        //         .select('thumbnail')
        //         .eq('id', id)
        //         .single();
        //     if (oldChannel?.thumbnail && oldChannel.thumbnail !== thumbnail) {
        //         await storageApi.deleteImage(oldChannel.thumbnail);
        //     }
        // }

        await supabase.from('channels').update(updates).eq('id', id);

        const { data: updatedChannel } = await supabase
            .from('channels')
            .select('*, folders(name, color)')
            .eq('id', id)
            .single();

        const { count } = await supabase
            .from('videos')
            .select('*', { count: 'exact', head: true })
            .eq('channel_id', id);

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

// 폴더 API
export const foldersApi = {
    getAll: async () => {
        const { data: folders, error } = await supabase
            .from('folders')
            .select('*')
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: false });

        if (error) throw error;

        const foldersWithCount = await Promise.all(folders.map(async (folder) => {
            const { count } = await supabase
                .from('channels')
                .select('*', { count: 'exact', head: true })
                .eq('folder_id', folder.id);

            return { ...folder, channel_count: count || 0 };
        }));

        return { data: { folders: foldersWithCount } };
    },

    getById: async (id) => {
        const { data: folder, error } = await supabase.from('folders').select('*').eq('id', id).single();
        if (error) throw error;

        const { data: channels } = await supabase
            .from('channels')
            .select('*')
            .eq('folder_id', id)
            .order('created_at', { ascending: false });

        const channelsWithCount = await Promise.all((channels || []).map(async (channel) => {
            const { count } = await supabase
                .from('videos')
                .select('*', { count: 'exact', head: true })
                .eq('channel_id', channel.id);
            return { ...channel, video_count: count || 0 };
        }));

        const channelIds = (channels || []).map(c => c.id);
        let channelVideos = [];
        if (channelIds.length > 0) {
            const { data } = await supabase
                .from('videos')
                .select('*, channels(title, thumbnail)')
                .in('channel_id', channelIds)
                .order('created_at', { ascending: false });

            channelVideos = (data || []).map(v => ({
                ...v,
                channel_title: v.channels?.title,
                channel_thumbnail: v.channels?.thumbnail,
                source_type: 'channel'
            }));
        }

        const { data: folderVideos } = await supabase
            .from('videos')
            .select('*')
            .eq('folder_id', id)
            .is('channel_id', null)
            .order('created_at', { ascending: false });

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
            const { data: tagData } = await supabase
                .from('video_tags')
                .select('tags(name)')
                .eq('video_id', video.id);
            const tags = tagData?.map(t => t.tags?.name).filter(Boolean) || [];
            return { ...video, tags };
        }));

        const { count: channelCount } = await supabase
            .from('channels')
            .select('*', { count: 'exact', head: true })
            .eq('folder_id', id);

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

        const { count } = await supabase
            .from('channels')
            .select('*', { count: 'exact', head: true })
            .eq('folder_id', id);

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

// 태그 API
export const tagsApi = {
    getAll: async () => {
        const { data: tags, error } = await supabase.from('tags').select('*');
        if (error) throw error;

        const tagsWithCount = await Promise.all(tags.map(async (tag) => {
            const { count: videoCount } = await supabase
                .from('video_tags')
                .select('*', { count: 'exact', head: true })
                .eq('tag_id', tag.id);

            const { count: channelCount } = await supabase
                .from('channel_tags')
                .select('*', { count: 'exact', head: true })
                .eq('tag_id', tag.id);

            return { ...tag, count: (videoCount || 0) + (channelCount || 0) };
        }));

        tagsWithCount.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
        return { data: { tags: tagsWithCount } };
    },

    autocomplete: async (q) => {
        if (!q || q.length < 1) {
            return { data: { suggestions: [] } };
        }

        const { data: tags, error } = await supabase
            .from('tags')
            .select('name')
            .ilike('name', `%${q}%`)
            .order('name', { ascending: true })
            .limit(10);

        if (error) throw error;
        return { data: { suggestions: tags.map(t => t.name) } };
    },

    recommend: async (channelId) => {
        const { data: videos } = await supabase.from('videos').select('id').eq('channel_id', channelId);
        if (!videos || videos.length === 0) {
            return { data: { recommendations: [] } };
        }

        const videoIds = videos.map(v => v.id);
        const { data: videoTags } = await supabase
            .from('video_tags')
            .select('tag_id, tags(name)')
            .in('video_id', videoIds);

        const tagCounts = {};
        (videoTags || []).forEach(vt => {
            const tagName = vt.tags?.name;
            if (tagName) {
                tagCounts[tagName] = (tagCounts[tagName] || 0) + 1;
            }
        });

        const recommendations = Object.entries(tagCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name]) => name);

        return { data: { recommendations } };
    },

    getChannelTags: async (channelId) => {
        const { data: tagData, error } = await supabase
            .from('channel_tags')
            .select('tags(name)')
            .eq('channel_id', channelId);

        if (error) throw error;
        return { data: { tags: (tagData || []).map(t => t.tags?.name).filter(Boolean) } };
    },

    updateChannelTags: async (channelId, tags) => {
        await supabase.from('channel_tags').delete().eq('channel_id', channelId);

        for (const tagName of tags) {
            const trimmedName = tagName.trim();
            if (!trimmedName) continue;

            let { data: tag } = await supabase.from('tags').select('id').eq('name', trimmedName).single();
            if (!tag) {
                const { data: newTag } = await supabase.from('tags').insert({ name: trimmedName }).select().single();
                tag = newTag;
            }
            if (tag) {
                await supabase.from('channel_tags').upsert({ channel_id: channelId, tag_id: tag.id });
            }
        }

        const { data: updatedTags } = await supabase
            .from('channel_tags')
            .select('tags(name)')
            .eq('channel_id', channelId);

        return { data: { tags: (updatedTags || []).map(t => t.tags?.name).filter(Boolean) } };
    }
};

// YouTube 비디오 ID 추출 (폴백용)
function extractYouTubeVideoId(url) {
    let match = url.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
    match = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
    match = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
    return null;
}

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

export default { videosApi, channelsApi, foldersApi, tagsApi, parseUrlApi };
