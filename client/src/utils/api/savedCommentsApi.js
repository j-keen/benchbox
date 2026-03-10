import { supabase } from '../../lib/supabase';
import { withRetry } from './withRetry';

// 저장한 댓글 API
export const savedCommentsApi = {
    // 전체 저장 댓글 조회 (영상 정보 포함)
    getAll: async () => {
        const { data, error } = await withRetry(() =>
            supabase
                .from('saved_comments')
                .select('*, videos(id, title, thumbnail, url, platform)')
                .order('sort_order', { ascending: true })
                .order('created_at', { ascending: false })
        );
        if (error) throw error;
        return data || [];
    },

    // 특정 영상의 저장 댓글 조회
    getByVideoId: async (videoId) => {
        const { data, error } = await withRetry(() =>
            supabase
                .from('saved_comments')
                .select('*')
                .eq('video_id', videoId)
                .order('sort_order', { ascending: true })
                .order('created_at', { ascending: false })
        );
        if (error) throw error;
        return data || [];
    },

    // 댓글 저장 (최상단 배치: 기존 최소 sort_order - 1)
    create: async ({ video_id, author, text, like_count = 0, published_at, memo = '', sort_order }) => {
        const { data, error } = await supabase
            .from('saved_comments')
            .insert({ video_id, author, text, like_count, published_at, memo, sort_order: sort_order ?? 0 })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    // 메모 수정
    update: async (id, { memo }) => {
        const { data, error } = await supabase
            .from('saved_comments')
            .update({ memo })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    // 두 댓글의 sort_order swap
    reorder: async (id1, order1, id2, order2) => {
        const { error: err1 } = await supabase
            .from('saved_comments')
            .update({ sort_order: order2 })
            .eq('id', id1);
        if (err1) throw err1;

        const { error: err2 } = await supabase
            .from('saved_comments')
            .update({ sort_order: order1 })
            .eq('id', id2);
        if (err2) throw err2;
    },

    // 저장 취소 (삭제)
    delete: async (id) => {
        const { error } = await supabase
            .from('saved_comments')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },
};
