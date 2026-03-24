import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { videosApi, aiAssistApi, youtubeCommentsApi, savedCommentsApi } from '../utils/api';
import { getPlatformIcon, getPlatformColor, getPlatformName } from '../utils/platformIcons';
import TagInput from './TagInput';
import StarRating from './StarRating';
import CategoryButtons from './CategoryButtons';
import useModalHistory from '../hooks/useModalHistory';

// 드래그 가능한 저장 댓글 아이템
const SortableCommentItem = ({ sc, scIdx, totalCount, handleReorderComment, handleMoveToEdge, setMemoPopup, setMemoPopupValue, savedCommentsApi, setSavedComments }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sc.id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className={`px-3 py-2 bg-amber-50 rounded-lg border border-amber-100 flex gap-2 ${isDragging ? 'shadow-lg' : ''}`}>
            {/* 드래그 핸들 */}
            {totalCount > 1 && (
                <button
                    {...attributes}
                    {...listeners}
                    className="flex-shrink-0 flex items-center touch-none text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing"
                    style={{ minWidth: 20, minHeight: 44 }}
                    title="드래그하여 순서 변경"
                >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <circle cx="9" cy="5" r="1.5" /><circle cx="15" cy="5" r="1.5" />
                        <circle cx="9" cy="10" r="1.5" /><circle cx="15" cy="10" r="1.5" />
                        <circle cx="9" cy="15" r="1.5" /><circle cx="15" cy="15" r="1.5" />
                        <circle cx="9" cy="20" r="1.5" /><circle cx="15" cy="20" r="1.5" />
                    </svg>
                </button>
            )}
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-700">{sc.author}</span>
                    <div className="flex items-center gap-1">
                        {totalCount > 1 && (
                            <div className="flex items-center mr-1">
                                {scIdx > 0 && (
                                    <>
                                        <button
                                            onClick={() => handleMoveToEdge(scIdx, 'top')}
                                            className="p-0.5 text-gray-400 hover:text-sky-500 transition-colors"
                                            title="맨 위로"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 11l7-7 7 7M5 19l7-7 7 7" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => handleReorderComment(scIdx, -1)}
                                            className="p-0.5 text-gray-400 hover:text-sky-500 transition-colors"
                                            title="위로"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                            </svg>
                                        </button>
                                    </>
                                )}
                                {scIdx < totalCount - 1 && (
                                    <>
                                        <button
                                            onClick={() => handleReorderComment(scIdx, 1)}
                                            className="p-0.5 text-gray-400 hover:text-sky-500 transition-colors"
                                            title="아래로"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => handleMoveToEdge(scIdx, 'bottom')}
                                            className="p-0.5 text-gray-400 hover:text-sky-500 transition-colors"
                                            title="맨 아래로"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5l7 7 7-7M5 13l7 7 7-7" />
                                            </svg>
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                        <button
                            onClick={() => {
                                setMemoPopup({
                                    comment: { author: sc.author, text: sc.text, likeCount: sc.like_count, publishedAt: sc.published_at },
                                    idx: -1,
                                    savedId: sc.id,
                                    existingMemo: sc.memo || '',
                                });
                                setMemoPopupValue(sc.memo || '');
                            }}
                            className="text-[10px] text-gray-400 hover:text-amber-500 transition-colors"
                        >
                            메모
                        </button>
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
                </div>
                <p className="text-xs text-gray-600 whitespace-pre-wrap">{sc.text}</p>
                {sc.memo && (
                    <div className="mt-1 px-2 py-1 bg-white rounded text-[10px] text-amber-700">
                        {sc.memo}
                    </div>
                )}
            </div>
        </div>
    );
};

const VideoModal = ({ video, onClose, onUpdate, onDelete, videos, currentIndex, onNavigate }) => {
    useModalHistory(!!video, onClose);
    const [memo, setMemo] = useState(video?.memo || '');
    const [tags, setTags] = useState(video?.tags || []);
    const [categories, setCategories] = useState(video?.categories || []);
    const [rating, setRating] = useState(video?.rating || 3);
    const [downloadCheck, setDownloadCheck] = useState(video?.download_check || false);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [embedFailed, setEmbedFailed] = useState(false);
    const [embedLoading, setEmbedLoading] = useState(true);
    const [isWidescreen, setIsWidescreen] = useState(false);
    const [slideDirection, setSlideDirection] = useState(null); // 'left' | 'right' | null
    const [isAnimating, setIsAnimating] = useState(false);
    const touchStartX = useRef(null);
    const touchStartY = useRef(null);
    const modalContentRef = useRef(null);

    const canGoPrev = videos && currentIndex > 0;
    const canGoNext = videos && currentIndex < (videos?.length || 0) - 1;

    // 애니메이션 포함 네비게이션 (먼저 선언)
    const navigateWithAnimation = useCallback((direction) => {
        if (isAnimating) return;
        setIsAnimating(true);
        setSlideDirection(direction);

        setTimeout(() => {
            if (direction === 'left') {
                onNavigate(currentIndex + 1);
            } else {
                onNavigate(currentIndex - 1);
            }
            setSlideDirection(direction === 'left' ? 'enter-right' : 'enter-left');
            setTimeout(() => {
                setSlideDirection(null);
                setIsAnimating(false);
            }, 200);
        }, 150);
    }, [currentIndex, onNavigate, isAnimating]);

    // 키보드 네비게이션
    useEffect(() => {
        if (!videos || !onNavigate) return;
        const handleKeyDown = (e) => {
            const isInputFocused = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
            if (isInputFocused) return;

            if (e.key === 'ArrowLeft' && canGoPrev) {
                e.preventDefault();
                navigateWithAnimation('right');
            } else if (e.key === 'ArrowRight' && canGoNext) {
                e.preventDefault();
                navigateWithAnimation('left');
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [videos, onNavigate, canGoPrev, canGoNext, navigateWithAnimation]);

    // 스와이프 제스처
    const handleTouchStart = useCallback((e) => {
        if (!videos || !onNavigate) return;
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
    }, [videos, onNavigate]);

    const handleTouchEnd = useCallback((e) => {
        if (!videos || !onNavigate || touchStartX.current === null || isAnimating) return;
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const diffX = touchStartX.current - touchEndX;
        const diffY = Math.abs(touchStartY.current - touchEndY);

        if (Math.abs(diffX) > 60 && Math.abs(diffX) > diffY) {
            if (diffX > 0 && canGoNext) {
                navigateWithAnimation('left');
            } else if (diffX < 0 && canGoPrev) {
                navigateWithAnimation('right');
            }
        }
        touchStartX.current = null;
        touchStartY.current = null;
    }, [videos, currentIndex, onNavigate, canGoPrev, canGoNext, isAnimating]);

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
    const [visibleCommentCount, setVisibleCommentCount] = useState(10);
    const [linkCopied, setLinkCopied] = useState(false);

    // 저장한 댓글
    const [savedComments, setSavedComments] = useState([]);
    const [savingCommentIdx, setSavingCommentIdx] = useState(null);
    const [memoPopup, setMemoPopup] = useState(null); // { comment, idx, savedId, existingMemo }
    const [memoPopupValue, setMemoPopupValue] = useState('');
    const pressTimer = useRef(null);
    const isLongPress = useRef(false);

    const PlatformIcon = getPlatformIcon(video?.platform);
    const platformColor = getPlatformColor(video?.platform);

    // video가 변경되면 (네비게이션) 로컬 state 동기화
    useEffect(() => {
        if (video) {
            setMemo(video.memo || '');
            setTags(video.tags || []);
            setCategories(video.categories || []);
            setRating(video.rating || 3);
            setDownloadCheck(video.download_check || false);
            setShowDeleteConfirm(false);
            setSuggestedTags([]);
            setOriginalMemo(null);
            setComments([]);
            setShowComments(false);
            setLinkCopied(false);
            setCommentsDisabled(false);
        }
    }, [video?.id]);

    // 디바운스 저장
    const debouncedSave = useCallback(
        debounce(async (newMemo, newTags, newCategories, newRating, newDownloadCheck) => {
            if (!video) return;
            setSaving(true);
            try {
                const response = await videosApi.update(video.id, {
                    memo: newMemo,
                    tags: newTags,
                    categories: newCategories,
                    rating: newRating,
                    download_check: newDownloadCheck
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
        if (video && (
            memo !== video.memo ||
            JSON.stringify(tags) !== JSON.stringify(video.tags) ||
            JSON.stringify(categories) !== JSON.stringify(video.categories) ||
            rating !== video.rating ||
            downloadCheck !== video.download_check
        )) {
            debouncedSave(memo, tags, categories, rating, downloadCheck);
        }
    }, [memo, tags, categories, rating, downloadCheck]);

    // 모달 열릴 때 저장 댓글 로드
    useEffect(() => {
        if (video?.id) {
            savedCommentsApi.getByVideoId(video.id).then(data => {
                setSavedComments(data);
            }).catch(err => console.error('저장 댓글 로드 오류:', err));
        }
    }, [video]);

    useEffect(() => {
        setEmbedFailed(false);
        setEmbedLoading(true);
        setIsWidescreen(false);
        const timer = setTimeout(() => {
            setEmbedLoading(false);
        }, 3000);
        return () => clearTimeout(timer);
    }, [video?.id]);

    // 이전/다음 영상 썸네일 프리로딩
    useEffect(() => {
        if (!videos) return;
        const toPreload = [];
        if (currentIndex > 0) toPreload.push(videos[currentIndex - 1]?.thumbnail);
        if (currentIndex < videos.length - 1) toPreload.push(videos[currentIndex + 1]?.thumbnail);
        toPreload.filter(Boolean).forEach(src => {
            const img = new Image();
            img.src = src;
        });
    }, [videos, currentIndex]);

    const handleEmbedProblem = () => {
        setEmbedFailed(true);
        setEmbedLoading(false);
    };

    const handleDelete = async () => {
        if (!video) return;
        setDeleting(true);
        try {
            await videosApi.delete(video.id);
            onDelete(video.id, currentIndex);
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
            if (result.error === 'API_KEY_MISSING') {
                alert('YouTube 댓글을 불러오려면 설정에서 Google API 키를 등록해주세요.');
                setShowComments(false);
            } else {
                setComments(result.comments || []);
                setCommentsDisabled(result.disabled || false);
            }
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

    // 저장된 댓글 전체 객체 반환 (메모 프리필용)
    const getSavedComment = (comment) => {
        return savedComments.find(sc => sc.author === comment.author && sc.text === comment.text);
    };

    // 메모 없이 즉시 저장
    const handleQuickSave = async (comment, idx) => {
        setSavingCommentIdx(idx);
        try {
            const minOrder = savedComments.length > 0
                ? Math.min(...savedComments.map(sc => sc.sort_order ?? 0)) - 1
                : 0;
            const saved = await savedCommentsApi.create({
                video_id: video.id,
                author: comment.author,
                text: comment.text,
                like_count: comment.likeCount || 0,
                published_at: comment.publishedAt || null,
                memo: '',
                sort_order: minOrder,
            });
            setSavedComments(prev => [saved, ...prev]);
        } catch (error) {
            console.error('댓글 저장 오류:', error);
        } finally {
            setSavingCommentIdx(null);
        }
    };

    // 메모 팝업에서 저장/수정
    const handleMemoPopupSave = async () => {
        if (!memoPopup) return;
        const { comment, idx, savedId } = memoPopup;
        setSavingCommentIdx(idx);
        setMemoPopup(null);
        try {
            if (savedId) {
                // 기존 메모 수정
                await savedCommentsApi.update(savedId, { memo: memoPopupValue });
                setSavedComments(prev => prev.map(sc => sc.id === savedId ? { ...sc, memo: memoPopupValue } : sc));
            } else {
                // 새로 저장 (메모 포함)
                const minOrder = savedComments.length > 0
                    ? Math.min(...savedComments.map(sc => sc.sort_order ?? 0)) - 1
                    : 0;
                const saved = await savedCommentsApi.create({
                    video_id: video.id,
                    author: comment.author,
                    text: comment.text,
                    like_count: comment.likeCount || 0,
                    published_at: comment.publishedAt || null,
                    memo: memoPopupValue,
                    sort_order: minOrder,
                });
                setSavedComments(prev => [saved, ...prev]);
            }
        } catch (error) {
            console.error('댓글 메모 저장 오류:', error);
        } finally {
            setSavingCommentIdx(null);
            setMemoPopupValue('');
        }
    };

    // 메모 팝업 열기 헬퍼
    const openMemoPopup = (comment, idx) => {
        const saved = getSavedComment(comment);
        setMemoPopup({
            comment,
            idx,
            savedId: saved?.id || null,
            existingMemo: saved?.memo || '',
        });
        setMemoPopupValue(saved?.memo || '');
    };

    // 롱프레스 감지: 포인터 다운
    const handleBookmarkPointerDown = (comment, idx) => {
        isLongPress.current = false;
        pressTimer.current = setTimeout(() => {
            isLongPress.current = true;
            openMemoPopup(comment, idx);
        }, 400);
    };

    // 롱프레스 감지: 포인터 업 (짧은 탭)
    const handleBookmarkPointerUp = async (comment, idx) => {
        clearTimeout(pressTimer.current);
        if (isLongPress.current) return; // 롱프레스는 이미 처리됨
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
            // 즉시 저장 (메모 없이)
            await handleQuickSave(comment, idx);
        }
    };

    // 롱프레스 감지: 포인터 떠남
    const handleBookmarkPointerLeave = () => {
        clearTimeout(pressTimer.current);
    };

    // 저장 댓글 순서 변경 (위/아래 swap)
    const handleReorderComment = async (index, direction) => {
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= savedComments.length) return;

        const prevComments = [...savedComments];

        // 낙관적 업데이트: 배열에서 위치 swap
        setSavedComments(prev => {
            const next = [...prev];
            [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
            return next;
        });

        try {
            const reordered = [...prevComments];
            [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
            await savedCommentsApi.reorder(reordered.map(c => c.id));
        } catch (err) {
            console.error('순서 변경 오류:', err);
            setSavedComments(prevComments);
        }
    };

    // 저장 댓글 맨위/맨아래로 이동
    const handleMoveToEdge = async (index, edge) => {
        if (savedComments.length <= 1) return;
        if (edge === 'top' && index === 0) return;
        if (edge === 'bottom' && index === savedComments.length - 1) return;

        const prevComments = [...savedComments];

        setSavedComments(prev => {
            const next = [...prev];
            const [item] = next.splice(index, 1);
            if (edge === 'top') next.unshift(item);
            else next.push(item);
            return next;
        });

        try {
            const reordered = [...prevComments];
            const [item] = reordered.splice(index, 1);
            if (edge === 'top') reordered.unshift(item);
            else reordered.push(item);
            await savedCommentsApi.reorder(reordered.map(c => c.id));
        } catch (err) {
            console.error('순서 변경 오류:', err);
            setSavedComments(prevComments);
        }
    };

    // 드래그앤드롭 센서
    const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 8 } });
    const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } });
    const sensors = useSensors(pointerSensor, touchSensor);

    // 드래그앤드롭 완료
    const handleDragEnd = async (event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = savedComments.findIndex(c => c.id === active.id);
        const newIndex = savedComments.findIndex(c => c.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return;

        const prevComments = [...savedComments];
        const reordered = arrayMove(savedComments, oldIndex, newIndex);

        setSavedComments(reordered);

        try {
            await savedCommentsApi.reorder(reordered.map(c => c.id));
        } catch (err) {
            console.error('드래그 순서 변경 오류:', err);
            setSavedComments(prevComments);
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

    const slideAnimationClass = slideDirection === 'left'
        ? 'translate-x-[-30px] opacity-0'
        : slideDirection === 'right'
            ? 'translate-x-[30px] opacity-0'
            : slideDirection === 'enter-left'
                ? 'translate-x-0 opacity-100'
                : slideDirection === 'enter-right'
                    ? 'translate-x-0 opacity-100'
                    : '';

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={onClose}>
            <div
                ref={modalContentRef}
                className={`bg-white w-full sm:rounded-xl shadow-2xl sm:w-full sm:max-w-4xl max-h-[98vh] sm:max-h-[95vh] overflow-hidden flex flex-col rounded-t-2xl sm:rounded-b-xl transition-all duration-150 ease-out ${slideAnimationClass}`}
                onClick={e => e.stopPropagation()}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
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
                        {videos && videos.length > 1 && (
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => canGoPrev && navigateWithAnimation('right')}
                                    disabled={!canGoPrev || isAnimating}
                                    className={`p-0.5 rounded transition-colors ${canGoPrev ? 'text-gray-500 hover:text-sky-500 hover:bg-sky-50' : 'text-gray-200 cursor-default'}`}
                                    title="이전 영상 (←)"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                </button>
                                <span className="text-[10px] sm:text-xs text-gray-400 tabular-nums min-w-[3ch] text-center">{currentIndex + 1} / {videos.length}</span>
                                <button
                                    onClick={() => canGoNext && navigateWithAnimation('left')}
                                    disabled={!canGoNext || isAnimating}
                                    className={`p-0.5 rounded transition-colors ${canGoNext ? 'text-gray-500 hover:text-sky-500 hover:bg-sky-50' : 'text-gray-200 cursor-default'}`}
                                    title="다음 영상 (→)"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                </button>
                            </div>
                        )}
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

                {/* 본문 */}
                <div className="flex-1 overflow-y-auto">
                    {/* 데스크탑 레이아웃 (기존과 동일) */}
                    <div className="hidden sm:flex gap-3 p-6">
                        {/* 좌측: 임베드 또는 썸네일 */}
                        <div className="flex-shrink-0 w-48 md:w-64">
                            <div className={`${isWidescreen ? 'aspect-video' : 'aspect-[9/16]'} bg-gray-100 rounded-lg overflow-hidden relative`}>
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

                        {/* 우측: 제목 + 카테고리 + 메모 + 태그 */}
                        <div className="flex-1 flex flex-col min-w-0">
                            <h2 className="text-base font-semibold text-gray-900 line-clamp-2">
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
                                <p className="mt-2 text-xs text-gray-600 line-clamp-2">
                                    {video.description}
                                </p>
                            )}

                            {/* 카테고리 */}
                            <div className="mt-3">
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-xs font-medium text-gray-500">카테고리</label>
                                    <button
                                        type="button"
                                        onClick={() => setDownloadCheck(!downloadCheck)}
                                        className={`flex items-center gap-1 px-2 py-1 text-xs rounded-lg transition-colors ${downloadCheck
                                                ? 'bg-green-100 text-green-700 border border-green-300'
                                                : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
                                            }`}
                                        title={downloadCheck ? '다운로드 체크 해제' : '다운로드 체크'}
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                        다운로드
                                    </button>
                                </div>
                                <CategoryButtons
                                    selected={categories}
                                    onChange={setCategories}
                                    required={true}
                                />
                            </div>

                            {/* 메모 */}
                            <div className="mt-3 flex-1 flex flex-col">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs font-medium text-gray-500">메모</label>
                                        <StarRating rating={rating} onChange={setRating} size="sm" />
                                    </div>
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
                                    className="flex-1 w-full min-h-[100px] p-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                                />
                            </div>

                            {/* 태그 */}
                            <div className="mt-3">
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

                    {/* 모바일 레이아웃 */}
                    <div className="sm:hidden">
                        {/* 최상단: 카테고리 + 다운로드 체크 */}
                        <div className="px-3 pt-3 pb-1">
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-xs font-medium text-gray-500">카테고리</label>
                                <button
                                    type="button"
                                    onClick={() => setDownloadCheck(!downloadCheck)}
                                    className={`flex items-center gap-1 px-2 py-1 text-xs rounded-lg transition-colors ${downloadCheck
                                            ? 'bg-green-100 text-green-700 border border-green-300'
                                            : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
                                        }`}
                                    title={downloadCheck ? '다운로드 체크 해제' : '다운로드 체크'}
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    다운로드
                                </button>
                            </div>
                            <CategoryButtons
                                selected={categories}
                                onChange={setCategories}
                                required={true}
                            />
                        </div>

                        {/* 2행: 썸네일 + 메모 나란히 */}
                        <div className="flex gap-3 px-3 pb-2">
                            {/* 썸네일 (w-24) */}
                            <div className="flex-shrink-0 w-24">
                                <div className={`${isWidescreen ? 'aspect-video' : 'aspect-[9/16]'} bg-gray-100 rounded-lg overflow-hidden relative`}>
                                    <button
                                        onClick={() => setIsWidescreen(!isWidescreen)}
                                        className="absolute top-1 left-1 z-20 px-1.5 py-0.5 text-[10px] bg-black/60 hover:bg-black/80 text-white rounded transition-colors flex items-center gap-0.5"
                                        title={isWidescreen ? '세로 비율 (9:16)' : '가로 비율 (16:9)'}
                                    >
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                                                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
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
                                                    className="absolute bottom-1 right-1 px-1.5 py-0.5 text-[10px] bg-black/60 hover:bg-black/80 text-white/80 hover:text-white rounded transition-colors"
                                                >
                                                    재생 안됨?
                                                </button>
                                            )}
                                        </>
                                    ) : video.thumbnail ? (
                                        <div className="relative w-full h-full group">
                                            <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-1">
                                                <button
                                                    onClick={openOriginalLink}
                                                    className={`flex items-center gap-1 px-2 py-1.5 ${video.platform === 'tiktok' ? 'bg-black hover:bg-gray-800' : 'bg-red-600 hover:bg-red-700'} text-white rounded-full text-[10px] font-medium transition-all shadow-lg`}
                                                >
                                                    <PlatformIcon className="w-3.5 h-3.5" />
                                                    {getPlatformName(video.platform)}에서 보기
                                                </button>
                                                {embedFailed && (
                                                    <p className="text-white/80 text-[9px]">임베드 차단됨</p>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-1">
                                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                            <button onClick={openOriginalLink} className="text-primary-500 hover:text-primary-600 text-[10px] font-medium">
                                                원본에서 보기
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 메모 + 별점 */}
                            <div className="flex-1 flex flex-col min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs font-medium text-gray-500">메모</label>
                                        <StarRating rating={rating} onChange={setRating} size="sm" />
                                    </div>
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
                                    className="flex-1 w-full min-h-[60px] p-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                                />
                            </div>
                        </div>

                        {/* 3행 이하: 전체 너비 섹션들 */}
                        <div className="px-3 space-y-2 pb-2">
                            {/* 제목 + 채널 · 날짜 */}
                            <div>
                                <h2 className="text-sm font-semibold text-gray-900 line-clamp-2">
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
                            </div>

                            {/* 태그 */}
                            <div>
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
                                        <>
                                        {comments.slice(0, visibleCommentCount).map((comment, idx) => (
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
                                                            onPointerDown={() => handleBookmarkPointerDown(comment, idx)}
                                                            onPointerUp={() => handleBookmarkPointerUp(comment, idx)}
                                                            onPointerLeave={handleBookmarkPointerLeave}
                                                            onContextMenu={(e) => e.preventDefault()}
                                                            disabled={savingCommentIdx === idx}
                                                            className="p-0.5 transition-colors select-none touch-none"
                                                            title={isCommentSaved(comment) ? '탭: 저장 취소 / 길게 누르기: 메모' : '탭: 즉시 저장 / 길게 누르기: 메모와 함께 저장'}
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
                                                        {/* 데스크탑 메모 아이콘 - 저장된 댓글에만 */}
                                                        {isCommentSaved(comment) && (
                                                            <button
                                                                onClick={() => openMemoPopup(comment, idx)}
                                                                className="hidden sm:inline-flex p-0.5 text-gray-400 hover:text-amber-500 transition-colors"
                                                                title="메모 편집"
                                                            >
                                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                </svg>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <p className="text-xs text-gray-600 whitespace-pre-wrap line-clamp-4">{comment.text}</p>
                                                {/* 저장된 메모 표시 */}
                                                {isCommentSaved(comment) && savedComments.find(sc => sc.author === comment.author && sc.text === comment.text)?.memo && (
                                                    <div className="mt-1 px-2 py-1 bg-amber-50 rounded text-[10px] text-amber-700">
                                                        {savedComments.find(sc => sc.author === comment.author && sc.text === comment.text).memo}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        {visibleCommentCount < comments.length && (
                                            <button
                                                onClick={() => setVisibleCommentCount(prev => prev + 10)}
                                                className="w-full py-2 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                                            >
                                                더보기 ({visibleCommentCount}/{comments.length})
                                            </button>
                                        )}
                                        </>
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
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                <SortableContext items={savedComments.map(sc => sc.id)} strategy={verticalListSortingStrategy}>
                                    <div className="space-y-2">
                                        {savedComments.map((sc, scIdx) => (
                                            <SortableCommentItem
                                                key={sc.id}
                                                sc={sc}
                                                scIdx={scIdx}
                                                totalCount={savedComments.length}
                                                handleReorderComment={handleReorderComment}
                                                handleMoveToEdge={handleMoveToEdge}
                                                setMemoPopup={setMemoPopup}
                                                setMemoPopupValue={setMemoPopupValue}
                                                savedCommentsApi={savedCommentsApi}
                                                setSavedComments={setSavedComments}
                                            />
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
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

            {/* 메모 팝업 모달 */}
            {memoPopup && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={() => setMemoPopup(null)}>
                    <div className="bg-white rounded-xl shadow-2xl w-[90vw] max-w-md p-4 mx-4" onClick={e => e.stopPropagation()}>
                        {/* 댓글 미리보기 */}
                        <div className="mb-3 px-3 py-2 bg-gray-50 rounded-lg">
                            <span className="text-xs font-medium text-gray-700">{memoPopup.comment.author}</span>
                            <p className="text-xs text-gray-600 mt-1 line-clamp-3 whitespace-pre-wrap">{memoPopup.comment.text}</p>
                        </div>
                        {/* 메모 입력 */}
                        <textarea
                            value={memoPopupValue}
                            onChange={(e) => setMemoPopupValue(e.target.value)}
                            placeholder="메모를 남겨보세요..."
                            className="w-full min-h-[80px] p-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-transparent resize-none"
                            autoFocus
                        />
                        {/* 버튼 */}
                        <div className="flex justify-end gap-2 mt-3">
                            <button
                                onClick={() => setMemoPopup(null)}
                                className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleMemoPopupSave}
                                className="px-3 py-1.5 text-xs bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                            >
                                {memoPopup.savedId ? '메모 수정' : '메모와 함께 저장'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
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
