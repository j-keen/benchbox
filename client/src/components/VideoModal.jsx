import React, { useState, useEffect, useCallback } from 'react';
import { videosApi } from '../utils/api';
import { getPlatformIcon, getPlatformColor, getPlatformName } from '../utils/platformIcons';
import TagInput from './TagInput';

const VideoModal = ({ video, onClose, onUpdate, onDelete }) => {
    const [memo, setMemo] = useState(video?.memo || '');
    const [tags, setTags] = useState(video?.tags || []);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

    const formatDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    // 임베드 URL 생성
    const getEmbedUrl = () => {
        if (!video?.url) return null;

        // YouTube
        const ytMatch = video.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]+)/);
        if (ytMatch) {
            return `https://www.youtube.com/embed/${ytMatch[1]}`;
        }

        return null;
    };

    const embedUrl = getEmbedUrl();

    if (!video) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={onClose}>
            <div
                className="bg-white w-full sm:rounded-xl shadow-2xl sm:w-full sm:max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col rounded-t-2xl sm:rounded-b-xl"
                onClick={e => e.stopPropagation()}
            >
                {/* 모바일: 드래그 핸들 */}
                <div className="sm:hidden flex justify-center py-2">
                    <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
                </div>

                {/* 헤더 - 모바일 컴팩트 */}
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
                    <button
                        onClick={onClose}
                        className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* 본문 - 모바일 최적화 */}
                <div className="flex-1 overflow-y-auto">
                    <div className="flex flex-col md:flex-row">
                        {/* 좌측: 영상 정보 */}
                        <div className="md:w-3/5 p-3 sm:p-6 border-b md:border-b-0 md:border-r border-gray-100">
                            {/* 임베드 또는 썸네일 */}
                            <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                                {embedUrl ? (
                                    <iframe
                                        src={embedUrl}
                                        className="w-full h-full"
                                        allowFullScreen
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    />
                                ) : video.thumbnail ? (
                                    <img
                                        src={video.thumbnail}
                                        alt={video.title}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                        <svg className="w-12 h-12 sm:w-16 sm:h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                )}
                            </div>

                            {/* 영상 정보 - 모바일 컴팩트 */}
                            <div className="mt-3 sm:mt-4">
                                <h2 className="text-sm sm:text-lg font-semibold text-gray-900 line-clamp-2">
                                    {video.title || 'Untitled'}
                                </h2>

                                {/* 모바일: 채널/날짜를 한 줄로 압축 */}
                                <div className="mt-1 sm:mt-2 flex items-center gap-2 text-xs sm:text-sm text-gray-500 flex-wrap">
                                    {video.channel_title && (
                                        <>
                                            <span className="text-gray-600">{video.channel_title}</span>
                                            <span className="text-gray-300">·</span>
                                        </>
                                    )}
                                    <span>{formatDate(video.created_at)}</span>
                                </div>

                                {/* 설명 - 모바일에서는 숨김 */}
                                {video.description && (
                                    <p className="hidden sm:block mt-3 text-sm text-gray-600 line-clamp-3">
                                        {video.description}
                                    </p>
                                )}

                                <button
                                    onClick={openOriginalLink}
                                    className="mt-2 sm:mt-4 inline-flex items-center gap-1 text-xs sm:text-sm text-primary-600 hover:text-primary-700 min-h-[36px] sm:min-h-0"
                                >
                                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                    원본 열기
                                </button>
                            </div>
                        </div>

                        {/* 우측: 기록 + 태그 */}
                        <div className="md:w-2/5 p-3 sm:p-6 flex flex-col">
                            {/* 내 기록 */}
                            <div className="flex-1">
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                                    내 기록
                                </label>
                                <textarea
                                    value={memo}
                                    onChange={(e) => setMemo(e.target.value)}
                                    placeholder="메모..."
                                    className="w-full h-24 sm:h-40 p-2.5 sm:p-3 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                                />
                            </div>

                            {/* 해시태그 */}
                            <div className="mt-3 sm:mt-4">
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                                    태그
                                </label>
                                <TagInput
                                    tags={tags}
                                    onChange={setTags}
                                    channelId={video.channel_id}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 푸터 - 모바일 최적화 */}
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
