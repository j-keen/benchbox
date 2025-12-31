import React, { useState, useRef, useCallback } from 'react';
import { getPlatformIcon, getPlatformColor } from '../utils/platformIcons';

const ChannelCard = ({ channel, onClick, isSelected, onSelect, selectionMode, onVideoDrop, draggable = false }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const PlatformIcon = getPlatformIcon(channel.platform);
    const platformColor = getPlatformColor(channel.platform);

    // Long press state
    const longPressTimeout = useRef(null);
    const touchMoved = useRef(false);
    const longPressTriggered = useRef(false);

    const handleCheckClick = (e) => {
        e.stopPropagation();
        if (onSelect) {
            onSelect(channel.id);
        }
    };

    const handleDragStart = (e) => {
        setIsDragging(true);
        e.dataTransfer.setData('channel', JSON.stringify(channel));
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnd = () => {
        setIsDragging(false);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setIsDragOver(true);
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        const videoData = e.dataTransfer.getData('video');
        if (videoData && onVideoDrop) {
            const video = JSON.parse(videoData);
            onVideoDrop(video, channel);
        }
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
                    onSelect(channel.id);
                    // Haptic feedback
                    if (navigator.vibrate) {
                        navigator.vibrate(50);
                    }
                }
            }, 500);
        }
    }, [onSelect, channel.id, selectionMode]);

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
            onSelect(channel.id);
        }
        // 선택 모드가 아닐 때는 일반 클릭 (onClick)
    }, [selectionMode, onSelect, channel]);

    const handleClick = useCallback((e) => {
        // 터치 이벤트 후에 발생하는 클릭은 무시 (모바일)
        if (longPressTriggered.current) {
            e.preventDefault();
            return;
        }

        // 선택 모드에서 클릭
        if (selectionMode && onSelect) {
            onSelect(channel.id);
        } else {
            onClick(channel);
        }
    }, [selectionMode, onSelect, onClick, channel]);

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
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onContextMenu={(e) => e.preventDefault()}
            className={`flex-shrink-0 w-36 sm:w-44 bg-white rounded-lg shadow-sm overflow-hidden cursor-pointer card-hover border-2 transition-all select-none ${
                isSelected ? 'border-primary-500 ring-2 ring-primary-200' :
                isDragOver ? 'border-green-500 ring-2 ring-green-200 scale-105' : 'border-transparent'
            } ${isDragging ? 'opacity-50 scale-95' : ''}`}
        >
            {/* 썸네일/프로필 */}
            <div className="relative aspect-square bg-gray-100">
                {channel.thumbnail ? (
                    <img
                        src={channel.thumbnail}
                        alt={channel.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect fill="%23e5e7eb" width="1" height="1"/></svg>';
                        }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
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

                {/* 우측 상단: 플랫폼 아이콘 + 영상 수 */}
                <div className="absolute top-2 right-2 flex items-center gap-1">
                    {channel.video_count > 0 && (
                        <span className="bg-black/70 text-white text-xs px-1.5 py-0.5 rounded font-medium">
                            {channel.video_count}
                        </span>
                    )}
                    <div className={`p-1 rounded ${platformColor}`}>
                        <PlatformIcon className="w-3.5 h-3.5" />
                    </div>
                </div>
            </div>

            {/* 정보 */}
            <div className="p-2">
                <h3 className="font-medium text-gray-900 text-sm truncate">
                    {channel.title || 'Untitled'}
                </h3>
                <div className="mt-1 text-xs text-gray-500 line-clamp-2 leading-4 min-h-[32px]">
                    {channel.description || '영상을 추가해보세요'}
                </div>
            </div>
        </div>
    );
};

// 채널 추가 버튼
export const AddChannelCard = ({ onClick }) => (
    <div
        onClick={onClick}
        className="flex-shrink-0 w-36 sm:w-44 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors"
    >
        <div className="aspect-square flex flex-col items-center justify-center text-gray-400 hover:text-primary-500">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
            <span className="mt-1 text-xs">채널 추가</span>
        </div>
    </div>
);

export default ChannelCard;
