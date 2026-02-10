import { supabase } from '../../lib/supabase';

// Find or create a tag by name, returns tag object with id
export async function findOrCreateTag(name) {
    let { data: tag } = await supabase.from('tags').select('id').eq('name', name).single();
    if (!tag) {
        const { data: newTag } = await supabase.from('tags').insert({ name }).select().single();
        tag = newTag;
    }
    return tag;
}

// Sync video tags (strips leading # from names)
// replace=true: delete existing tags first (for update), replace=false: add only (for create)
export async function syncVideoTags(videoId, tags, { replace = true } = {}) {
    if (replace) {
        await supabase.from('video_tags').delete().eq('video_id', videoId);
    }
    for (const tagName of tags) {
        const cleanTag = tagName.replace(/^#/, '').trim();
        if (cleanTag) {
            const tag = await findOrCreateTag(cleanTag);
            if (tag) {
                await supabase.from('video_tags').insert({ video_id: videoId, tag_id: tag.id });
            }
        }
    }
}

// Sync channel tags (does NOT strip leading #, uses upsert)
export async function syncChannelTags(channelId, tags) {
    await supabase.from('channel_tags').delete().eq('channel_id', channelId);
    for (const tagName of tags) {
        const trimmedName = tagName.trim();
        if (!trimmedName) continue;
        const tag = await findOrCreateTag(trimmedName);
        if (tag) {
            await supabase.from('channel_tags').upsert({ channel_id: channelId, tag_id: tag.id });
        }
    }
}
