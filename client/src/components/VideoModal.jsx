import React, { useState, useEffect, useCallback } from 'react';
import { videosApi, aiAssistApi, youtubeCommentsApi, savedCommentsApi } from '../utils/api';
import { getPlatformIcon, getPlatformColor, getPlatformName } from '../utils/platformIcons';
import TagInput from './TagInput';
import useModalHistory from '../hooks/useModalHistory';

const VideoModal = ({ video, onClose, onUpdate, onDelete }) => {
    useModalHistory(!!video, onClose);
    const [memo, setMemo] = useState(video?.memo || '');
    const [tags, setTags] = useState(video?.tags || []);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [embedFailed, setEmbedFailed] = useState(false);
    const [embedLoading, setEmbedLoading] = useState(true);
    const [isWidescreen, setIsWidescreen] = useState(false);

    // AI 상태
    const [aiMemoLoading, setAiMemoLoading] = useState(false);
    const [aiTagsLoading, setAiTagsLoading] = useState(false);
    const [suggestedTags, setSuggestedTags] = useState([]);
    const [originalMemo, setOriginalMemo] = useState(null);

    // YouTube 댓글
    const [comments, setComments] = useState([]);
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [commentsDisabled, setCommentsDisabled] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);

    // 저장한 댓글
    const [savedComments, setSavedComments] = useState([]);
    const [savingCommentIdx, setSavingCommentIdx] = useState(null);
    const [memoInputIdx, setMemoInputIdx] = useState(null);
    const [memoInputValue, setMemoInputValue] = useState('');

    const PlatformIcon = getPlatformIcon(video?.platform);
    const platformColor = getPlatformColor(video?.platform);

    // 디바운스 저장
    const debouncedSave = useCallback(
        debounce(async (newMemo, newTags) => {
            if (!video) return;
            setSaving(true);
            try {
                const response = await videosApi.update(video.id, {
                    memo: newMemo,
                    tags: newTags
                });
                onUpdate(response.data);
            } catch (error) {
                console.error('저장 오류:', error);
            } finally {
                setSaving(false);
            }
        }, 1000),
        [video, onUpdate]
    );

    useEffect(() => {
        if (video && (memo !== video.memo || JSON.stringify(tags) !== JSON.stringify(video.tags))) {
            debouncedSave(memo, tags);
        }
    }, [memo, tags]);

    // 모달 열릴 때 저장 댓글 로드
    useEffect(() => {
        if (video?.id) {
            savedCommentsApi.getByVideoId(video.id).then(data => {
                setSavedComments(data);
            }).catch(err => console.error('저장 댓글 로드 오류:', err));
        }
    }, [video?.id]);

    useEffect(() => {
        setEmbedFailed(false);
        setEmbedLoading(true);
        setIsWidescreen(false);
        const timer = setTimeout(() => {
            setEmbedLoading(false);
        }, 3000);
        return () => clearTimeout(timer);
    }, [video?.id]);

    const handleEmbedProblem = () => {
        setEmbedFailed(true);
        setEmbedLoading(false);
    };

    const handleDelete = async () => {
        if (!video) return;
        setDeleting(true);
        try {
            await videosApi.delete(video.id);
            onDelete(video.id);
            onClose();
        } catch (error) {
            console.error('삭제 오류:', error);
        } finally {
            setDeleting(false);
        }
    };

    const openOriginalLink = () => {
        if (video?.url) {
            window.open(video.url, '_blank');
        }
    };

    // AI 메모 다듬기
    const handleAiRefineMemo = async () => {
        if (!memo.trim()) return;
        setAiMemoLoading(true);
        setOriginalMemo(memo);
        try {
            const result = await aiAssistApi.refineMemo({
                title: video.title,
                description: video.description,
                memo
            });
            setMemo(result.refinedMemo);
        } catch (error) {
            console.error('AI 메모 다듬기 오류:', error);
        } finally {
            setAiMemoLoading(false);
        }
    };

    // AI 메모 되돌리기
    const handleRevertMemo = () => {
        if (originalMemo !== null) {
            setMemo(originalMemo);
            setOriginalMemo(null);
        }
    };

    // AI 태그 추천
    const handleAiSuggestTags = async () => {
        setAiTagsLoading(true);
        try {
            const result = await aiAssistApi.suggestTags({
                title: video.title,
                description: video.description,
                memo,
                existingTags: tags
            });
            setSuggestedTags(result.suggestedTags || []);
        } catch (error) {
            console.error('AI 태그 추천 오류:', error);
        } finally {
            setAiTagsLoading(false);
        }
    };

    // 추천 태그 수락
    const handleAcceptTag = (tag) => {
        if (!tags.includes(tag)) {
            setTags(prev => [...prev, tag]);
        }
        setSuggestedTags(prev => prev.filter(t => t !== tag));
    };

    // 추천 태그 모두 무시
    const handleDismissSuggestions = () => {
        setSuggestedTags([]);
    };

    // YouTube 댓글 로드
    const handleLoadComments = async () => {
        if (comments.length > 0 || commentsDisabled) {
            setShowComments(!showComments);
            return;
        }
        setCommentsLoading(true);
        setShowComments(true);
        try {
            const [result, saved] = await Promise.all([
                youtubeCommentsApi.getComments(video.url),
                savedCommentsApi.getByVideoId(video.id),
            ]);
            setComments(result.comments || []);
            setCommentsDisabled(result.disabled || false);
            setSavedComments(saved);
        } catch (error) {
            console.error('댓글 로드 오류:', error);
        } finally {
            setCommentsLoading(false);
        }
    };

    // 댓글이 이미 저장되었는지 확인
    const isCommentSaved = (comment) => {
        return savedComments.some(sc => sc.author === comment.author && sc.text === comment.text);
    };

    // 저장된 댓글의 ID 찾기
    const getSavedCommentId = (comment) => {
        const found = savedComments.find(sc => sc.author === comment.author && sc.text === comment.text);
        return found?.id;
    };

    // 댓글 북마크 토글
    const handleToggleBookmark = async (comment, idx) => {
        const savedId = getSavedCommentId(comment);
        if (savedId) {
            // 이미 저장됨 → 삭제
            setSavingCommentIdx(idx);
            try {
                await savedCommentsApi.delete(savedId);
                setSavedComments(prev => prev.filter(sc => sc.id !== savedId));
            } catch (error) {
                console.error('댓글 삭제 오류:', error);
            } finally {
                setSavingCommentIdx(null);
            }
        } else {
            // 메모 입력 UI 열기
            setMemoInputIdx(idx);
            setMemoInputValue('');
        }
    };

    // 메모와 함께 댓글 저장
    const handleSaveComment = async (comment, idx) => {
        setSavingCommentIdx(idx);
        setMemoInputIdx(null);
        try {
            const saved = await savedCommentsApi.create({
                video_id: video.id,
                author: comment.author,
                text: comment.text,
                like_count: comment.likeCount || 0,
                published_at: comment.publishedAt || null,
                memo: memoInputValue,
            });
            setSavedComments(prev => [saved, ...prev]);
        } catch (error) {
            console.error('댓글 저장 오류:', error);
        } finally {
            setSavingCommentIdx(null);
            setMemoInputValue('');
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const getTikTokVideoId = (url) => {
        if (!url) return null;
        const match = url.match(/tiktok\.com\/@[^\/]+\/video\/(\d+)/);
        return match ? match[1] : null;
    };

    const getTikTokEmbedUrl = () => {
        const videoId = getTikTokVideoId(video?.url);
        if (!videoId) return null;
        return `https://www.tiktok.com/embed/v2/${videoId}`;
    };

    const getEmbedUrl = () => {
        if (!video?.url) return null;
        const ytMatch = video.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]+)/);
        if (ytMatch) {
            return `https://www.youtube.com/embed/${ytMatch[1]}`;
        }
        if (video.platform === 'tiktok') {
            return getTikTokEmbedUrl();
        }
        return null;
    };

    const embedUrl = getEmbedUrl();

    if (!video) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={onClose}>
            <div
                className="bg-white w-full sm:rounded-xl shadow-2xl sm:w-full sm:max-w-4xl max-h-[98vh] sm:max-h-[95vh] overflow-hidden flex flex-col rounded-t-2xl sm:rounded-b-xl"
                onClick={e => e.stopPropagation()}
            >
                {/* 모바일: 드래그 핸들 */}
                <div className="sm:hidden flex justify-center py-2">
                    <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
                </div>

                {/* 헤더 */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-2 sm:py-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs ${platformColor}`}>
                            <PlatformIcon className="w-3 h-3" />
                            <span className="hidden sm:inline">{getPlatformName(video.platform)}</span>
                        </span>
                        {saving && (
                            <span className="text-[10px] sm:text-xs text-gray-400">저장 중...</span>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={openOriginalLink}
                            className="p-1.5 text-gray-400 hover:text-primary-600 transition-colors"
                            title="원본 열기"
                        >
                            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </button>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(video.url);
                                setLinkCopied(true);
                                setTimeout(() => setLinkCopied(false), 2000);
                            }}
                            className="p-1.5 text-gray-400 hover:text-primary-600 transition-colors"
                            title="링크 복사"
                        >
                            {linkCopied ? (
                                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                </svg>
                            )}
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* 본문 - 좌측 썸네일/임베드 + 우측 메모 */}
                <div className="flex-1 overflow-y-auto">
                    <div className="flex gap-3 p-3 sm:p-6">
                        {/* 좌측: 임베드 또는 썸네일 (9:16) */}
                        <div className="flex-shrink-0 w-28 sm:w-48 md:w-64">
                            <div className={`${isWidescreen ? 'aspect-video' : 'aspect-[9/16]'} bg-gray-100 rounded-lg overflow-hidden relative`}>
                                {/* 비율 전환 버튼 */}
                                <button
                                    onClick={() => setIsWidescreen(!isWidescreen)}
                                    className="absolute top-2 left-2 z-20 px-2 py-1 text-xs bg-black/60 hover:bg-black/80 text-white rounded transition-colors flex items-center gap-1"
                                    title={isWidescreen ? '세로 비율 (9:16)' : '가로 비율 (16:9)'}
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        {isWidescreen ? (
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10h6m-6 0H3m6-10h6M9 7H3m12 10h6m0-10h-6" />
                                        ) : (
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                        )}
                                    </svg>
                                    {isWidescreen ? '9:16' : '16:9'}
                                </button>
                                {embedUrl && !embedFailed ? (
                                    <>
                                        {embedLoading && video.thumbnail && (
                                            <div className="absolute inset-0 z-10">
                                                <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                                    <div className="animate-spin rounded-full h-8 w-8 border-3 border-white border-t-transparent"></div>
                                                </div>
                                            </div>
                                        )}
                                        <iframe
                                            src={embedUrl}
                                            className="w-full h-full"
                                            allowFullScreen
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            onLoad={() => setEmbedLoading(false)}
                                            onError={() => { setEmbedFailed(true); setEmbedLoading(false); }}
                                        />
                                        {!embedLoading && (
                                            <button
                                                onClick={handleEmbedProblem}
                                                className="absolute bottom-2 right-2 px-2 py-1 text-xs bg-black/60 hover:bg-black/80 text-white/80 hover:text-white rounded transition-colors"
                                            >
                                                재생 안됨?
                                            </button>
                                        )}
                                    </>
                                ) : video.thumbnail ? (
                                    <div className="relative w-full h-full group">
                                        <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-2">
                                            <button
                                                onClick={openOriginalLink}
                                                className={`flex items-center gap-1.5 px-3 py-2 ${video.platform === 'tiktok' ? 'bg-black hover:bg-gray-800' : 'bg-red-600 hover:bg-red-700'} text-white rounded-full text-xs font-medium transition-all shadow-lg`}
                                            >
                                                <PlatformIcon className="w-4 h-4" />
                                                {getPlatformName(video.platform)}에서 보기
                                            </button>
                                            {embedFailed && (
                                                <p className="text-white/80 text-[10px]">임베드가 차단된 영상입니다</p>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                        <button onClick={openOriginalLink} className="text-primary-500 hover:text-primary-600 text-xs font-medium">
                                            원본에서 보기
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 우측: 제목 + 메모 + 태그 */}
                        <div className="flex-1 flex flex-col min-w-0">
                            {/* 제목 + 정보 */}
                            <h2 className="text-sm sm:text-base font-semibold text-gray-900 line-clamp-2">
                                {video.title || 'Untitled'}
                            </h2>
                            <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                                {video.channel_title && (
                                    <>
                                        <span className="text-gray-600">{video.channel_title}</span>
                                        <span className="text-gray-300">·</span>
                                    </>
                                )}
                                <span>{formatDate(video.created_at)}</span>
                            </div>
                            {video.description && (
                                <p className="hidden sm:block mt-2 text-xs text-gray-600 line-clamp-2">
                                    {video.description}
                                </p>
                            )}

                            {/* 메모 */}
                            <div className="mt-2 sm:mt-3 flex-1 flex flex-col">
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-xs font-medium text-gray-500">메모</label>
                                    <div className="flex items-center gap-1">
                                        {originalMemo !== null && (
                                            <button
                                                onClick={handleRevertMemo}
                                                className="text-[10px] px-1.5 py-0.5 text-amber-600 hover:bg-amber-50 rounded transition-colors"
                                            >
                                                되돌리기
                                            </button>
                                        )}
                                        <button
                                            onClick={handleAiRefineMemo}
                                            disabled={aiMemoLoading || !memo.trim()}
                                            className="text-[10px] px-1.5 py-0.5 bg-violet-50 text-violet-600 hover:bg-violet-100 disabled:opacity-40 rounded transition-colors flex items-center gap-0.5"
                                        >
                                            {aiMemoLoading ? (
                                                <div className="w-3 h-3 border border-violet-400 border-t-transparent rounded-full animate-spin"></div>
                                            ) : (
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                </svg>
                                            )}
                                            AI 다듬기
                                        </button>
                                    </div>
                                </div>
                                <textarea
                                    value={memo}
                                    onChange={(e) => setMemo(e.target.value)}
                                    placeholder="메모..."
                                    className="flex-1 w-full min-h-[60px] sm:min-h-[100px] p-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                                />
                            </div>

                            {/* 태그 */}
                            <div className="mt-2 sm:mt-3">
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-xs font-medium text-gray-500">태그</label>
                                    <button
                                        onClick={handleAiSuggestTags}
                                        disabled={aiTagsLoading}
                                        className="text-[10px] px-1.5 py-0.5 bg-violet-50 text-violet-600 hover:bg-violet-100 disabled:opacity-40 rounded transition-colors flex items-center gap-0.5"
                                    >
                                        {aiTagsLoading ? (
                                            <div className="w-3 h-3 border border-violet-400 border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                            </svg>
                                        )}
                                        AI 추천
                                    </button>
                                </div>
                                <TagInput
                                    tags={tags}
                                    onChange={setTags}
                                />
                                {/* AI 추천 태그 */}
                                {suggestedTags.length > 0 && (
                                    <div className="mt-1.5 p-2 bg-violet-50 rounded-lg">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[10px] text-violet-600 font-medium">AI 추천 태그</span>
                                            <button
                                                onClick={handleDismissSuggestions}
                                                className="text-[10px] text-violet-400 hover:text-violet-600"
                                            >
                                                닫기
                                            </button>
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {suggestedTags.map(tag => (
                                                <button
                                                    key={tag}
                                                    onClick={() => handleAcceptTag(tag)}
                                                    className="px-2 py-0.5 text-xs bg-white text-violet-700 border border-violet-200 hover:bg-violet-100 rounded-full transition-colors"
                                                >
                                                    + {tag}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* YouTube 인기 댓글 */}
                    {video.platform === 'youtube' && (
                        <div className="px-3 sm:px-6 pb-3 sm:pb-6">
                            <button
                                onClick={handleLoadComments}
                                className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200"
                            >
                                <span className="flex items-center gap-1.5">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                    인기 댓글
                                </span>
                                <svg className={`w-4 h-4 transition-transform ${showComments ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                            {showComments && (
                                <div className="mt-2 space-y-2">
                                    {commentsLoading ? (
                                        <div className="flex items-center justify-center py-4">
                                            <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                    ) : commentsDisabled ? (
                                        <p className="text-xs text-gray-400 text-center py-3">이 영상은 댓글이 비활성화되어 있습니다.</p>
                                    ) : comments.length === 0 ? (
                                        <p className="text-xs text-gray-400 text-center py-3">댓글이 없습니다.</p>
                                    ) : (
                                        comments.map((comment, idx) => (
                                            <div key={idx} className="px-3 py-2 bg-gray-50 rounded-lg">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-medium text-gray-700">{comment.author}</span>
                                                    <div className="flex items-center gap-1.5">
                                                        {comment.likeCount > 0 && (
                                                            <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                                                                </svg>
                                                                {comment.likeCount}
                                                            </span>
                                                        )}
                                                        <button
                                                            onClick={() => handleToggleBookmark(comment, idx)}
                                                            disabled={savingCommentIdx === idx}
                                                            className="p-0.5 transition-colors"
                                                            title={isCommentSaved(comment) ? '저장 취소' : '댓글 저장'}
                                                        >
                                                            {savingCommentIdx === idx ? (
                                                                <div className="w-3.5 h-3.5 border border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                                                            ) : isCommentSaved(comment) ? (
                                                                <svg className="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                                                                </svg>
                                                            ) : (
                                                                <svg className="w-3.5 h-3.5 text-gray-400 hover:text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                                                </svg>
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                                <p className="text-xs text-gray-600 whitespace-pre-wrap line-clamp-4">{comment.text}</p>
                                                {/* 메모 입력 UI */}
                                                {memoInputIdx === idx && (
                                                    <div className="mt-2 flex gap-1.5">
                                                        <input
                                                            type="text"
                                                            value={memoInputValue}
                                                            onChange={(e) => setMemoInputValue(e.target.value)}
                                                            onKeyDown={(e) => e.key === 'Enter' && handleSaveComment(comment, idx)}
                                                            placeholder="메모 (선택사항)"
                                                            className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-amber-400 focus:border-transparent"
                                                            autoFocus
                                                        />
                                                        <button
                                                            onClick={() => handleSaveComment(comment, idx)}
                                                            className="px-2 py-1 text-xs bg-amber-500 text-white rounded hover:bg-amber-600 transition-colors"
                                                        >
                                                            저장
                                                        </button>
                                                        <button
                                                            onClick={() => setMemoInputIdx(null)}
                                                            className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
                                                        >
                                                            취소
                                                        </button>
                                                    </div>
                                                )}
                                                {/* 저장된 메모 표시 */}
                                                {isCommentSaved(comment) && savedComments.find(sc => sc.author === comment.author && sc.text === comment.text)?.memo && (
                                                    <div className="mt-1 px-2 py-1 bg-amber-50 rounded text-[10px] text-amber-700">
                                                        {savedComments.find(sc => sc.author === comment.author && sc.text === comment.text).memo}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                        </div>
                    )}

                    {/* 저장한 댓글 섹션 (항상 표시) */}
                    {savedComments.length > 0 && (
                        <div className="px-3 sm:px-6 pb-3 sm:pb-6">
                            <h4 className="text-xs font-medium text-amber-600 mb-2 flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                                </svg>
                                저장한 댓글 ({savedComments.length})
                            </h4>
                            <div className="space-y-2">
                                {savedComments.map(sc => (
                                    <div key={sc.id} className="px-3 py-2 bg-amber-50 rounded-lg border border-amber-100">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs font-medium text-gray-700">{sc.author}</span>
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        await savedCommentsApi.delete(sc.id);
                                                        setSavedComments(prev => prev.filter(c => c.id !== sc.id));
                                                    } catch (err) { console.error(err); }
                                                }}
                                                className="text-[10px] text-gray-400 hover:text-red-500 transition-colors"
                                            >
                                                삭제
                                            </button>
                                        </div>
                                        <p className="text-xs text-gray-600 whitespace-pre-wrap">{sc.text}</p>
                                        {sc.memo && (
                                            <div className="mt-1 px-2 py-1 bg-white rounded text-[10px] text-amber-700">
                                                {sc.memo}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* 푸터 */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100 bg-gray-50">
                    <div>
                        {!showDeleteConfirm ? (
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                className="text-xs sm:text-sm text-red-500 hover:text-red-600 min-h-[36px] sm:min-h-0 px-2"
                            >
                                삭제
                            </button>
                        ) : (
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <button
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="text-xs sm:text-sm text-red-500 hover:text-red-600 font-medium min-h-[36px] sm:min-h-0 px-2"
                                >
                                    {deleting ? '삭제 중...' : '확인'}
                                </button>
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="text-xs sm:text-sm text-gray-500 hover:text-gray-600 min-h-[36px] sm:min-h-0 px-2"
                                >
                                    취소
                                </button>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-xs sm:text-sm text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors min-h-[36px] sm:min-h-0"
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
};

// 디바운스 헬퍼 함수
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

export default VideoModal;
