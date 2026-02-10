import { supabase } from '../../lib/supabase';

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
        // TODO: Enable after fixing Supabase Storage DELETE RLS policy
    }
};
