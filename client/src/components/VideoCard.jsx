import React, { useState, useRef, useCallback } from 'react';
import { getPlatformIcon, getPlatformColor } from '../utils/platformIcons';

const VideoCard = ({ video, onClick, isSelected, onSelect, selectionMode, draggable = true, showChannelInfo = false }) => {
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

    // description에서 통계 정보 파싱
    const parseStats = (description) => {
        if (!description) return null;

        let likes = null;
        let comments = null;

        // "좋아요 570.5K개" 또는 "1,431 likes" 패턴
        const likesMatch = description.match(/좋아요\s*([\d,.]+[KkMm]?)개|(\d[\d,]*)\s*likes?/i);
        if (likesMatch) {
            likes = likesMatch[1] || likesMatch[2];
        }

        // "댓글 7606개" 또는 "8 comments" 패턴
        const commentsMatch = description.match(/댓글\s*([\d,.]+[KkMm]?)개|(\d[\d,]*)\s*comments?/i);
        if (commentsMatch) {
            comments = commentsMatch[1] || commentsMatch[2];
        }

        if (!likes && !comments) return null;
        return { likes, comments };
    };

    const stats = parseStats(video.description);

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
            <div className="p-3">
                {/* 채널 정보 (폴더 상세에서 사용) */}
                {showChannelInfo && video.channel_title && (
                    <div className="flex items-center gap-1.5 mb-1.5">
                        {video.channel_thumbnail && (
                            <img
                                src={video.channel_thumbnail}
                                alt=""
                                className="w-4 h-4 rounded-full object-cover"
                            />
                        )}
                        <span className="text-xs text-gray-500 truncate">
                            {video.channel_title}
                        </span>
                    </div>
                )}

                <h3 className="font-medium text-gray-900 line-clamp-2 text-sm leading-5 min-h-[40px]">
                    {video.title || 'Untitled'}
                </h3>

                {/* 통계 정보 (좋아요, 댓글) */}
                {stats && (
                    <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                        {stats.likes && (
                            <span className="flex items-center gap-1">
                                <span>❤️</span>
                                <span>{stats.likes}</span>
                            </span>
                        )}
                        {stats.comments && (
                            <span className="flex items-center gap-1">
                                <span>💬</span>
                                <span>{stats.comments}</span>
                            </span>
                        )}
                    </div>
                )}

                {/* 태그 */}
                {video.tags && video.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                        {video.tags.slice(0, 3).map((tag, index) => (
                            <span
                                key={index}
                                className="text-xs text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded"
                            >
                                #{tag}
                            </span>
                        ))}
                        {video.tags.length > 3 && (
                            <span className="text-xs text-gray-400">
                                +{video.tags.length - 3}
                            </span>
                        )}
                    </div>
                )}

                {/* 저장일 */}
                <div className="mt-2 text-xs text-gray-400">
                    {formatDate(video.created_at)}
                </div>
            </div>
        </div>
    );
};

export default VideoCard;
