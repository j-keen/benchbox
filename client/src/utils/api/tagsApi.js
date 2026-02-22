import { supabase } from '../../lib/supabase';
import { withRetry } from './withRetry';
import { syncChannelTags } from './tagHelpers';

// 태그 API
export const tagsApi = {
    getAll: async () => {
        const { data: tags, error } = await withRetry(() => supabase
            .from('tags')
            .select('*, tag_categories(id, name, color), video_tags(count), channel_tags(count)'));
        if (error) throw error;

        const tagsWithCount = tags.map(tag => {
            const { video_tags, channel_tags, ...tagData } = tag;
            return {
                ...tagData,
                count: (video_tags?.[0]?.count || 0) + (channel_tags?.[0]?.count || 0),
                category: tag.tag_categories || null
            };
        });

        tagsWithCount.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
        return { data: { tags: tagsWithCount } };
    },

    // 카테고리별 태그 조회
    getByCategory: async () => {
        // 모든 카테고리 가져오기
        const { data: categories } = await withRetry(() => supabase
            .from('tag_categories')
            .select('*')
            .order('sort_order', { ascending: true }));

        // 모든 태그 가져오기 (사용 횟수 포함)
        const { data: tags } = await withRetry(() => supabase
            .from('tags')
            .select('*, video_tags(count)')
            .order('name', { ascending: true }));

        const tagsWithCount = (tags || []).map(tag => {
            const { video_tags, ...tagData } = tag;
            return { ...tagData, count: video_tags?.[0]?.count || 0 };
        });

        // 카테고리별로 그룹화
        const result = (categories || []).map(cat => ({
            ...cat,
            tags: tagsWithCount.filter(t => t.category_id === cat.id)
        }));

        // 미분류 태그
        const uncategorized = tagsWithCount.filter(t => !t.category_id);
        if (uncategorized.length > 0) {
            result.push({
                id: null,
                name: '미분류',
                color: '#9ca3af',
                tags: uncategorized
            });
        }

        return { data: { categorizedTags: result } };
    },

    // 태그 카테고리 변경
    updateCategory: async (tagId, categoryId) => {
        const { data, error } = await supabase
            .from('tags')
            .update({ category_id: categoryId || null })
            .eq('id', tagId)
            .select()
            .single();

        if (error) throw error;
        return { data };
    },

    autocomplete: async (q) => {
        if (!q || q.length < 1) {
            return { data: { suggestions: [] } };
        }

        const { data: tags, error } = await withRetry(() => supabase
            .from('tags')
            .select('name')
            .ilike('name', `%${q}%`)
            .order('name', { ascending: true })
            .limit(10));

        if (error) throw error;
        return { data: { suggestions: tags.map(t => t.name) } };
    },

    recommend: async (channelId) => {
        const { data: videos } = await withRetry(() => supabase.from('videos').select('id').eq('channel_id', channelId));
        if (!videos || videos.length === 0) {
            return { data: { recommendations: [] } };
        }

        const videoIds = videos.map(v => v.id);
        const { data: videoTags } = await withRetry(() => supabase
            .from('video_tags')
            .select('tag_id, tags(name)')
            .in('video_id', videoIds));

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
        const { data: tagData, error } = await withRetry(() => supabase
            .from('channel_tags')
            .select('tags(name)')
            .eq('channel_id', channelId));

        if (error) throw error;
        return { data: { tags: (tagData || []).map(t => t.tags?.name).filter(Boolean) } };
    },

    updateChannelTags: async (channelId, tags) => {
        await syncChannelTags(channelId, tags);

        const { data: updatedTags } = await withRetry(() => supabase
            .from('channel_tags')
            .select('tags(name)')
            .eq('channel_id', channelId));

        return { data: { tags: (updatedTags || []).map(t => t.tags?.name).filter(Boolean) } };
    }
};
