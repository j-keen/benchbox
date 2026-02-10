import { describe, it, expect } from 'vitest';
import { analyzeUrl, extractYouTubeVideoId } from '../api/urlAnalysis';
import { storageApi } from '../api/storageApi';

// ========================================
// Characterization Tests for api modules
// These tests document CURRENT behavior.
// If any test fails during refactoring,
// it means behavior has changed.
// ========================================

// ============ TESTS ============

describe('URL Analysis (analyzeUrl)', () => {
    describe('YouTube', () => {
        it('detects YouTube shorts', () => {
            const result = analyzeUrl('https://www.youtube.com/shorts/abc123');
            expect(result).toEqual({
                platform: 'youtube',
                type: 'video',
                videoType: 'shorts',
                url: 'https://www.youtube.com/shorts/abc123'
            });
        });

        it('detects YouTube shorts without www', () => {
            const result = analyzeUrl('https://youtube.com/shorts/abc123');
            expect(result.platform).toBe('youtube');
            expect(result.videoType).toBe('shorts');
        });

        it('detects YouTube long videos (watch)', () => {
            const result = analyzeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
            expect(result).toEqual({
                platform: 'youtube',
                type: 'video',
                videoType: 'long',
                url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
            });
        });

        it('detects YouTube short URL (youtu.be)', () => {
            const result = analyzeUrl('https://youtu.be/dQw4w9WgXcQ');
            expect(result.platform).toBe('youtube');
            expect(result.videoType).toBe('long');
        });

        it('detects YouTube channel (@handle)', () => {
            const result = analyzeUrl('https://www.youtube.com/@channelname');
            expect(result).toEqual({
                platform: 'youtube',
                type: 'channel',
                videoType: null,
                url: 'https://www.youtube.com/@channelname'
            });
        });

        it('detects YouTube channel (/channel/ format)', () => {
            const result = analyzeUrl('https://www.youtube.com/channel/UCxxxxxxxx');
            expect(result.platform).toBe('youtube');
            expect(result.type).toBe('channel');
        });
    });

    describe('TikTok', () => {
        it('detects TikTok videos', () => {
            const result = analyzeUrl('https://www.tiktok.com/@user.name/video/1234567890');
            expect(result.platform).toBe('tiktok');
            expect(result.type).toBe('video');
            expect(result.videoType).toBe('shorts');
        });

        it('detects TikTok short links', () => {
            const result = analyzeUrl('https://vt.tiktok.com/abc123/');
            expect(result.platform).toBe('tiktok');
            expect(result.type).toBe('video');
        });

        it('detects TikTok channels', () => {
            const result = analyzeUrl('https://www.tiktok.com/@username');
            expect(result.platform).toBe('tiktok');
            expect(result.type).toBe('channel');
        });
    });

    describe('Instagram', () => {
        it('detects Instagram reels', () => {
            const result = analyzeUrl('https://www.instagram.com/reel/CxYz123/');
            expect(result.platform).toBe('instagram');
            expect(result.videoType).toBe('shorts');
        });

        it('detects Instagram posts', () => {
            const result = analyzeUrl('https://www.instagram.com/p/CxYz123/');
            expect(result.platform).toBe('instagram');
            expect(result.videoType).toBe('long');
        });

        it('detects Instagram profiles', () => {
            const result = analyzeUrl('https://www.instagram.com/username');
            expect(result.platform).toBe('instagram');
            expect(result.type).toBe('channel');
        });
    });

    describe('Xiaohongshu', () => {
        it('detects Xiaohongshu explore posts', () => {
            const result = analyzeUrl('https://www.xiaohongshu.com/explore/abc123');
            expect(result.platform).toBe('xiaohongshu');
            expect(result.type).toBe('video');
        });

        it('detects Xiaohongshu short links', () => {
            const result = analyzeUrl('https://xhslink.com/abc123');
            expect(result.platform).toBe('xiaohongshu');
        });

        it('detects Xiaohongshu user profiles', () => {
            const result = analyzeUrl('https://www.xiaohongshu.com/user/profile/abc123');
            expect(result.platform).toBe('xiaohongshu');
            expect(result.type).toBe('channel');
        });
    });

    describe('Edge Cases', () => {
        it('returns "other" for unknown URLs', () => {
            const result = analyzeUrl('https://example.com/some-page');
            expect(result.platform).toBe('other');
            expect(result.type).toBe('unknown');
        });

        it('handles URLs with whitespace', () => {
            const result = analyzeUrl('  https://www.youtube.com/watch?v=abc123  ');
            expect(result.platform).toBe('youtube');
            expect(result.url).toBe('https://www.youtube.com/watch?v=abc123');
        });

        it('handles URLs with extra query params', () => {
            const result = analyzeUrl('https://www.youtube.com/watch?v=abc123&t=120');
            expect(result.platform).toBe('youtube');
            expect(result.videoType).toBe('long');
        });
    });
});

describe('YouTube Video ID Extraction (extractYouTubeVideoId)', () => {
    it('extracts ID from standard watch URL', () => {
        expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('extracts ID from short URL', () => {
        expect(extractYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('extracts ID from shorts URL', () => {
        expect(extractYouTubeVideoId('https://www.youtube.com/shorts/abc123')).toBe('abc123');
    });

    it('returns null for non-YouTube URLs', () => {
        expect(extractYouTubeVideoId('https://example.com')).toBeNull();
    });

    it('returns null for YouTube channel URLs', () => {
        expect(extractYouTubeVideoId('https://www.youtube.com/@channelname')).toBeNull();
    });

    it('handles IDs with hyphens and underscores', () => {
        expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=a-b_c123')).toBe('a-b_c123');
    });
});

describe('Storage Path Extraction (getPathFromUrl)', () => {
    it('extracts path from Supabase storage URL', () => {
        const url = 'https://project.supabase.co/storage/v1/object/public/images/thumbnails/123_abc.jpg';
        expect(storageApi.getPathFromUrl(url)).toBe('thumbnails/123_abc.jpg');
    });

    it('returns null for non-storage URLs', () => {
        expect(storageApi.getPathFromUrl('https://example.com/image.jpg')).toBeNull();
    });

    it('returns null for null/undefined input', () => {
        expect(storageApi.getPathFromUrl(null)).toBeNull();
        expect(storageApi.getPathFromUrl(undefined)).toBeNull();
        expect(storageApi.getPathFromUrl('')).toBeNull();
    });

    it('handles nested folder paths', () => {
        const url = 'https://project.supabase.co/storage/v1/object/public/images/a/b/c/file.png';
        expect(storageApi.getPathFromUrl(url)).toBe('a/b/c/file.png');
    });
});
