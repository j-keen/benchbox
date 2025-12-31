import dotenv from 'dotenv';
dotenv.config();

import initSqlJs from 'sql.js';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'db', 'database.sqlite');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
    console.log('🚀 SQLite → Supabase 마이그레이션 시작...\n');

    // SQLite 로드
    const SQL = await initSqlJs();
    const buffer = fs.readFileSync(dbPath);
    const db = new SQL.Database(buffer);

    // 1. 폴더 마이그레이션
    console.log('📁 폴더 마이그레이션...');
    const folders = db.exec('SELECT * FROM folders');
    if (folders.length > 0 && folders[0].values.length > 0) {
        const columns = folders[0].columns;
        for (const row of folders[0].values) {
            const folder = {};
            columns.forEach((col, i) => {
                folder[col] = row[i];
            });

            // id는 자동 생성되므로 제외하고 삽입
            const { error } = await supabase
                .from('folders')
                .insert({
                    name: folder.name,
                    color: folder.color || '#6366f1',
                    cover_image: folder.cover_image,
                    description: folder.description,
                    sort_order: folder.sort_order || 0
                });

            if (error) {
                console.log(`  ⚠️ 폴더 "${folder.name}" 추가 실패:`, error.message);
            } else {
                console.log(`  ✅ 폴더 "${folder.name}" 추가됨`);
            }
        }
    } else {
        console.log('  (폴더 데이터 없음)');
    }

    // 2. 채널 마이그레이션
    console.log('\n📺 채널 마이그레이션...');
    const channels = db.exec('SELECT * FROM channels');
    const channelIdMap = {}; // 구 ID -> 신 ID 매핑

    if (channels.length > 0 && channels[0].values.length > 0) {
        const columns = channels[0].columns;
        for (const row of channels[0].values) {
            const channel = {};
            columns.forEach((col, i) => {
                channel[col] = row[i];
            });

            const oldId = channel.id;

            // folder_id 매핑 (폴더가 있으면 새 ID로)
            let newFolderId = null;
            if (channel.folder_id) {
                const { data: folderData } = await supabase
                    .from('folders')
                    .select('id')
                    .order('id', { ascending: true })
                    .limit(1);
                if (folderData && folderData.length > 0) {
                    newFolderId = folderData[0].id;
                }
            }

            const { data, error } = await supabase
                .from('channels')
                .insert({
                    folder_id: newFolderId,
                    url: channel.url,
                    platform: channel.platform,
                    title: channel.title,
                    thumbnail: channel.thumbnail,
                    description: channel.description,
                    memo: channel.memo
                })
                .select()
                .single();

            if (error) {
                console.log(`  ⚠️ 채널 "${channel.title}" 추가 실패:`, error.message);
            } else {
                channelIdMap[oldId] = data.id;
                console.log(`  ✅ 채널 "${channel.title}" 추가됨 (${oldId} → ${data.id})`);
            }
        }
    } else {
        console.log('  (채널 데이터 없음)');
    }

    // 3. 영상 마이그레이션
    console.log('\n🎬 영상 마이그레이션...');
    const videos = db.exec('SELECT * FROM videos');
    const videoIdMap = {}; // 구 ID -> 신 ID 매핑

    if (videos.length > 0 && videos[0].values.length > 0) {
        const columns = videos[0].columns;
        for (const row of videos[0].values) {
            const video = {};
            columns.forEach((col, i) => {
                video[col] = row[i];
            });

            const oldId = video.id;
            const newChannelId = video.channel_id ? channelIdMap[video.channel_id] : null;

            const { data, error } = await supabase
                .from('videos')
                .insert({
                    channel_id: newChannelId,
                    folder_id: null, // 폴더 직접 연결은 복잡하므로 null로
                    url: video.url,
                    platform: video.platform,
                    video_type: video.video_type || 'long',
                    title: video.title,
                    thumbnail: video.thumbnail,
                    description: video.description,
                    memo: video.memo
                })
                .select()
                .single();

            if (error) {
                console.log(`  ⚠️ 영상 "${video.title?.substring(0, 30)}..." 추가 실패:`, error.message);
            } else {
                videoIdMap[oldId] = data.id;
                console.log(`  ✅ 영상 "${video.title?.substring(0, 30)}..." 추가됨`);
            }
        }
    } else {
        console.log('  (영상 데이터 없음)');
    }

    // 4. 태그 마이그레이션
    console.log('\n🏷️ 태그 마이그레이션...');
    const tags = db.exec('SELECT * FROM tags');
    const tagIdMap = {}; // 구 ID -> 신 ID 매핑

    if (tags.length > 0 && tags[0].values.length > 0) {
        const columns = tags[0].columns;
        for (const row of tags[0].values) {
            const tag = {};
            columns.forEach((col, i) => {
                tag[col] = row[i];
            });

            const oldId = tag.id;

            const { data, error } = await supabase
                .from('tags')
                .insert({ name: tag.name })
                .select()
                .single();

            if (error) {
                console.log(`  ⚠️ 태그 "${tag.name}" 추가 실패:`, error.message);
            } else {
                tagIdMap[oldId] = data.id;
                console.log(`  ✅ 태그 "${tag.name}" 추가됨`);
            }
        }
    } else {
        console.log('  (태그 데이터 없음)');
    }

    // 5. 영상-태그 연결 마이그레이션
    console.log('\n🔗 영상-태그 연결 마이그레이션...');
    const videoTags = db.exec('SELECT * FROM video_tags');

    if (videoTags.length > 0 && videoTags[0].values.length > 0) {
        for (const row of videoTags[0].values) {
            const oldVideoId = row[0];
            const oldTagId = row[1];

            const newVideoId = videoIdMap[oldVideoId];
            const newTagId = tagIdMap[oldTagId];

            if (newVideoId && newTagId) {
                const { error } = await supabase
                    .from('video_tags')
                    .insert({ video_id: newVideoId, tag_id: newTagId });

                if (!error) {
                    console.log(`  ✅ 영상-태그 연결됨`);
                }
            }
        }
    } else {
        console.log('  (영상-태그 연결 데이터 없음)');
    }

    // 6. 채널-태그 연결 마이그레이션
    console.log('\n🔗 채널-태그 연결 마이그레이션...');
    const channelTags = db.exec('SELECT * FROM channel_tags');

    if (channelTags.length > 0 && channelTags[0].values.length > 0) {
        for (const row of channelTags[0].values) {
            const oldChannelId = row[0];
            const oldTagId = row[1];

            const newChannelId = channelIdMap[oldChannelId];
            const newTagId = tagIdMap[oldTagId];

            if (newChannelId && newTagId) {
                const { error } = await supabase
                    .from('channel_tags')
                    .insert({ channel_id: newChannelId, tag_id: newTagId });

                if (!error) {
                    console.log(`  ✅ 채널-태그 연결됨`);
                }
            }
        }
    } else {
        console.log('  (채널-태그 연결 데이터 없음)');
    }

    console.log('\n✨ 마이그레이션 완료!');

    // 요약
    console.log('\n📊 마이그레이션 요약:');
    console.log(`  폴더: ${folders.length > 0 ? folders[0].values.length : 0}개`);
    console.log(`  채널: ${Object.keys(channelIdMap).length}개`);
    console.log(`  영상: ${Object.keys(videoIdMap).length}개`);
    console.log(`  태그: ${Object.keys(tagIdMap).length}개`);

    db.close();
}

migrate().catch(console.error);
