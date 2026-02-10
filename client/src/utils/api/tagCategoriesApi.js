import { supabase } from '../../lib/supabase';
import { withRetry } from './withRetry';

// 태그 카테고리 API
export const tagCategoriesApi = {
    getAll: async () => {
        const { data: categories, error } = await withRetry(() => supabase
            .from('tag_categories')
            .select('*')
            .order('sort_order', { ascending: true }));

        if (error) throw error;
        return { data: { categories: categories || [] } };
    },

    create: async (data) => {
        const { name, color = '#6366f1', icon = null } = data;

        // 최대 sort_order 가져오기
        const { data: maxOrder } = await supabase
            .from('tag_categories')
            .select('sort_order')
            .order('sort_order', { ascending: false })
            .limit(1)
            .single();

        const sortOrder = (maxOrder?.sort_order || 0) + 1;

        const { data: category, error } = await supabase
            .from('tag_categories')
            .insert({ name, color, icon, sort_order: sortOrder })
            .select()
            .single();

        if (error) throw error;
        return { data: category };
    },

    update: async (id, data) => {
        const { name, color, icon, sort_order } = data;
        const updates = { updated_at: new Date().toISOString() };
        if (name !== undefined) updates.name = name;
        if (color !== undefined) updates.color = color;
        if (icon !== undefined) updates.icon = icon;
        if (sort_order !== undefined) updates.sort_order = sort_order;

        const { data: category, error } = await supabase
            .from('tag_categories')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return { data: category };
    },

    delete: async (id) => {
        const { error } = await supabase
            .from('tag_categories')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { data: { message: '카테고리가 삭제되었습니다.' } };
    },

    reorder: async (categoryIds) => {
        for (let i = 0; i < categoryIds.length; i++) {
            await supabase
                .from('tag_categories')
                .update({ sort_order: i })
                .eq('id', categoryIds[i]);
        }
        return { data: { message: '순서가 변경되었습니다.' } };
    }
};
