import React, { useState, useRef, useCallback } from 'react';

const FolderCard = ({ folder, onClick, onChannelDrop, onVideoDrop, onEdit, onDelete, isSelected, onSelect, selectionMode }) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    // Long press state
    const longPressTimeout = useRef(null);
    const touchMoved = useRef(false);
    const longPressTriggered = useRef(false);

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

        // 채널 드롭 처리
        const channelData = e.dataTransfer.getData('channel');
        if (channelData && onChannelDrop) {
            const channel = JSON.parse(channelData);
            onChannelDrop(channel, folder);
            return;
        }

        // 영상 드롭 처리
        const videoData = e.dataTransfer.getData('video');
        if (videoData && onVideoDrop) {
            const video = JSON.parse(videoData);
            onVideoDrop(video, folder);
        }
    };

    const handleEditClick = (e) => {
        e.stopPropagation();
        onEdit?.(folder);
    };

    const handleDeleteClick = (e) => {
        e.stopPropagation();
        onDelete?.(folder.id);
    };

    const handleSelectClick = (e) => {
        e.stopPropagation();
        onSelect?.(folder.id);
    };

    const handleCardClick = useCallback((e) => {
        // 터치 이벤트 후에 발생하는 클릭은 무시 (모바일)
        if (longPressTriggered.current) {
            e.preventDefault();
            return;
        }

        // 선택 모드에서 클릭
        if (selectionMode && onSelect) {
            onSelect(folder.id);
        } else {
            onClick(folder);
        }
    }, [selectionMode, onSelect, onClick, folder]);

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
                    onSelect(folder.id);
                    // Haptic feedback
                    if (navigator.vibrate) {
                        navigator.vibrate(50);
                    }
                }
            }, 500);
        }
    }, [onSelect, folder.id, selectionMode]);

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
            onSelect(folder.id);
        }
        // 선택 모드가 아닐 때는 일반 클릭 (onClick)
    }, [selectionMode, onSelect, folder]);

    return (
        <div
            onClick={handleCardClick}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onContextMenu={(e) => e.preventDefault()}
            className={`flex-shrink-0 w-36 sm:w-44 bg-white rounded-lg shadow-sm overflow-hidden cursor-pointer card-hover border-2 transition-all select-none ${
                isDragOver ? 'border-green-500 ring-2 ring-green-200 scale-105' :
                isSelected ? 'border-primary-500 ring-2 ring-primary-200' : 'border-transparent'
            }`}
        >
            {/* 커버 이미지 */}
            <div
                className="relative aspect-square"
                style={{ backgroundColor: folder.color || '#6366f1' }}
            >
                {folder.cover_image ? (
                    <img
                        src={folder.cover_image}
                        alt={folder.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-16 h-16 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                    </div>
                )}

                {/* 채널/영상 수 배지 */}
                <div className="absolute bottom-2 right-2 flex gap-1">
                    <span className="bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                        📺 {folder.channel_count || 0}
                    </span>
                    {(folder.video_count || 0) > 0 && (
                        <span className="bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                            🎬 {folder.video_count}
                        </span>
                    )}
                </div>

                {/* 선택 체크박스 - 좌상단 */}
                {(selectionMode || isHovered) && (
                    <button
                        onClick={handleSelectClick}
                        className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                            isSelected
                                ? 'bg-primary-500 text-white'
                                : 'bg-black/40 text-white hover:bg-black/60'
                        }`}
                    >
                        {isSelected ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        )}
                    </button>
                )}

                {/* 액션 버튼들 - 우상단 (선택 모드가 아닐 때만, 모바일에서는 항상 표시) */}
                {!selectionMode && (
                    <div className={`absolute top-2 right-2 flex items-center gap-1 sm:transition-opacity ${isHovered ? 'opacity-100' : 'sm:opacity-0'}`}>
                        <button
                            onClick={handleEditClick}
                            className="p-2 sm:p-1.5 bg-black/40 hover:bg-black/60 rounded-full transition-colors"
                            title="편집"
                        >
                            <svg className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                        </button>
                        <button
                            onClick={handleDeleteClick}
                            className="p-2 sm:p-1.5 bg-red-500/80 hover:bg-red-600 rounded-full transition-colors"
                            title="삭제"
                        >
                            <svg className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                )}

                {/* 드래그 오버 인디케이터 */}
                {isDragOver && (
                    <div className="absolute inset-0 bg-green-500/30 flex items-center justify-center">
                        <div className="bg-white rounded-full p-3">
                            <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        </div>
                    </div>
                )}
            </div>

            {/* 폴더 정보 */}
            <div className="p-3">
                <h3 className="font-medium text-gray-900 text-sm truncate flex items-center gap-1.5">
                    <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: folder.color || '#6366f1' }}
                    />
                    {folder.name}
                </h3>
                {folder.description && (
                    <p className="mt-1 text-xs text-gray-500 line-clamp-2">
                        {folder.description}
                    </p>
                )}
            </div>
        </div>
    );
};

// 폴더 추가 카드
export const AddFolderCard = ({ onClick }) => (
    <div
        onClick={onClick}
        className="flex-shrink-0 w-36 sm:w-44 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors"
    >
        <div className="aspect-square flex flex-col items-center justify-center text-gray-400 hover:text-primary-500">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
            <span className="mt-1 text-xs">폴더 추가</span>
        </div>
    </div>
);

export default FolderCard;
