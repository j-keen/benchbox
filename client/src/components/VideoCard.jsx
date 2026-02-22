import React, { useState, useRef, useCallback } from 'react';
import { getPlatformIcon, getPlatformColor } from '../utils/platformIcons';
import HighlightText from './HighlightText';

const VideoCard = ({ video, onClick, isSelected, onSelect, selectionMode, draggable = true, searchQuery }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const PlatformIcon = getPlatformIcon(video.platform);
    const platformColor = getPlatformColor(video.platform);
    const isShorts = video.video_type === 'shorts';

    // Long press state
    const longPressTimeout = useRef(null);
    const touchMoved = useRef(false);
    const longPressTriggered = useRef(false);

    const handleDragStart = (e) => {
        setIsDragging(true);
        e.dataTransfer.setData('video', JSON.stringify(video));
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnd = () => {
        setIsDragging(false);
    };

    // Long press handlers for mobile selection
    const handleTouchStart = useCallback((e) => {
        touchMoved.current = false;
        longPressTriggered.current = false;

        // 선택 모드가 아닐 때만 롱프레스로 선택 활성화
        if (!selectionMode) {
            longPressTimeout.current = setTimeout(() => {
                longPressTriggered.current = true;
                // Trigger selection on long press
                if (onSelect) {
                    onSelect(video.id);
                    // Haptic feedback
                    if (navigator.vibrate) {
                        navigator.vibrate(50);
                    }
                }
            }, 500);
        }
    }, [onSelect, video.id, selectionMode]);

    const handleTouchMove = useCallback(() => {
        touchMoved.current = true;
        if (longPressTimeout.current) {
            clearTimeout(longPressTimeout.current);
        }
    }, []);

    const handleTouchEnd = useCallback((e) => {
        if (longPressTimeout.current) {
            clearTimeout(longPressTimeout.current);
        }

        // If long press was triggered, prevent default
        if (longPressTriggered.current) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        // If touch moved, ignore
        if (touchMoved.current) {
            return;
        }

        // 선택 모드일 때는 탭으로 선택/해제
        if (selectionMode && onSelect) {
            e.preventDefault();
            e.stopPropagation();
            onSelect(video.id);
        }
        // 선택 모드가 아닐 때는 일반 클릭 (onClick)
        // 이 경우는 handleClick에서 처리됨
    }, [selectionMode, onSelect, video]);

    const handleClick = useCallback((e) => {
        // 터치 이벤트 후에 발생하는 클릭은 무시 (모바일)
        if (longPressTriggered.current) {
            e.preventDefault();
            return;
        }

        // 선택 모드에서 클릭
        if (selectionMode && onSelect) {
            onSelect(video.id);
        } else {
            onClick(video);
        }
    }, [selectionMode, onSelect, onClick, video]);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return '오늘';
        if (diffDays === 1) return '어제';
        if (diffDays < 7) return `${diffDays}일 전`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)}개월 전`;
        return date.toLocaleDateString('ko-KR');
    };

    const handleCheckClick = (e) => {
        e.stopPropagation();
        if (onSelect) {
            onSelect(video.id);
        }
    };

    return (
        <div
            draggable={draggable && !selectionMode}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onClick={handleClick}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onContextMenu={(e) => e.preventDefault()}
            className={`bg-white rounded-lg shadow-sm overflow-hidden cursor-pointer card-hover border-2 transition-all select-none ${
                isSelected ? 'border-primary-500 ring-2 ring-primary-200' : 'border-transparent'
            } ${isDragging ? 'opacity-50 scale-95' : ''}`}
        >
            {/* 썸네일 - 숏폼은 9:16, 롱폼은 16:9 */}
            <div className={`relative bg-gray-100 ${isShorts ? 'aspect-[9/16]' : 'aspect-video'}`}>
                {video.thumbnail ? (
                    <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = isShorts
                                ? 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 9 16"><rect fill="%23e5e7eb" width="9" height="16"/></svg>'
                                : 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 9"><rect fill="%23e5e7eb" width="16" height="9"/></svg>';
                        }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </div>
                )}

                {/* 좌측 상단: 체크박스 (호버 또는 선택모드일 때, onSelect가 있을 때만) */}
                {onSelect && (isHovered || selectionMode || isSelected) && (
                    <div
                        onClick={handleCheckClick}
                        className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-all ${
                            isSelected
                                ? 'bg-primary-500 text-white'
                                : 'bg-white/90 text-gray-400 hover:text-primary-500 border border-gray-300'
                        }`}
                    >
                        {isSelected ? (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                        ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        )}
                    </div>
                )}

                {/* 우측 상단: 플랫폼 아이콘 + 숏폼 뱃지 */}
                <div className="absolute top-2 right-2 flex items-center gap-1">
                    {isShorts && (
                        <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                            Shorts
                        </span>
                    )}
                    <div className={`p-1.5 rounded ${platformColor}`}>
                        <PlatformIcon className="w-4 h-4" />
                    </div>
                </div>
            </div>

            {/* 정보 */}
            <div className="p-2 sm:p-3">
                <h3 className="font-medium text-gray-900 line-clamp-2 text-sm leading-5">
                    {video.title
                        ? <HighlightText text={video.title} query={searchQuery} />
                        : 'Untitled'}
                </h3>

                {/* 채널명 - 항상 표시 */}
                {video.channel_title && (
                    <div className="mt-1 text-xs text-gray-500 truncate">
                        {video.channel_title}
                    </div>
                )}

                {/* 저장일 */}
                <div className="mt-1 text-xs text-gray-400">
                    {formatDate(video.created_at)}
                </div>

                {/* 검색 매칭 스니펫 (메모/태그) */}
                {searchQuery && (() => {
                    const cleanQuery = searchQuery.replace(/^#/, '').toLowerCase();
                    if (!cleanQuery) return null;

                    const memoMatches = video.memo?.toLowerCase().includes(cleanQuery);
                    const matchingTags = video.tags?.filter(t => t.toLowerCase().includes(cleanQuery)) || [];

                    if (!memoMatches && matchingTags.length === 0) return null;

                    return (
                        <div className="mt-1.5 pt-1.5 border-t border-gray-100 space-y-1">
                            {memoMatches && video.memo && (() => {
                                const idx = video.memo.toLowerCase().indexOf(cleanQuery);
                                const start = Math.max(0, idx - 15);
                                const end = Math.min(video.memo.length, idx + cleanQuery.length + 15);
                                const snippet =
                                    (start > 0 ? '...' : '') +
                                    video.memo.slice(start, end) +
                                    (end < video.memo.length ? '...' : '');
                                return (
                                    <p className="text-[11px] text-gray-400 line-clamp-1">
                                        📝 <HighlightText text={snippet} query={searchQuery} />
                                    </p>
                                );
                            })()}

                            {matchingTags.length > 0 && (
                                <div className="flex flex-wrap gap-0.5">
                                    {matchingTags.slice(0, 3).map(tag => (
                                        <span key={tag} className="text-[10px] bg-gray-100 text-gray-500 px-1 py-0.5 rounded">
                                            <HighlightText text={`#${tag}`} query={searchQuery} />
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })()}
            </div>
        </div>
    );
};

export default VideoCard;
