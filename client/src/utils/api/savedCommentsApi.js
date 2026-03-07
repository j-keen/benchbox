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
                .order('created_at', { ascending: false })
        );
        if (error) throw error;
        return data || [];
    },

    // 댓글 저장
    create: async ({ video_id, author, text, like_count = 0, published_at, memo = '' }) => {
        const { data, error } = await supabase
            .from('saved_comments')
            .insert({ video_id, author, text, like_count, published_at, memo })
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

    // 저장 취소 (삭제)
    delete: async (id) => {
        const { error } = await supabase
            .from('saved_comments')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },
};
