import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { savedCommentsApi } from '../utils/api';
import { getPlatformIcon, getPlatformColor } from '../utils/platformIcons';
import NavigationTabs from '../components/NavigationTabs';
import FilterPanel from '../components/FilterPanel';

const SavedCommentsPage = () => {
    const navigate = useNavigate();
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editMemo, setEditMemo] = useState('');

    // 필터 상태
    const [searchQuery, setSearchQuery] = useState('');
    const [filterVideoId, setFilterVideoId] = useState('all');

    useEffect(() => {
        loadComments();
    }, []);

    const loadComments = async () => {
        try {
            setLoading(true);
            const data = await savedCommentsApi.getAll();
            setComments(data);
        } catch (error) {
            console.error('저장 댓글 로드 오류:', error);
        } finally {
            setLoading(false);
        }
    };

    // 연결된 영상 목록 추출
    const linkedVideos = useMemo(() => {
        const map = new Map();
        comments.forEach(c => {
            if (c.videos) map.set(c.videos.id, c.videos);
        });
        return Array.from(map.values());
    }, [comments]);

    // 클라이언트 사이드 필터링
    const filteredComments = useMemo(() => {
        return comments.filter(comment => {
            // 텍스트 검색
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const textMatch = comment.text?.toLowerCase().includes(q);
                const authorMatch = comment.author?.toLowerCase().includes(q);
                const memoMatch = comment.memo?.toLowerCase().includes(q);
                if (!textMatch && !authorMatch && !memoMatch) return false;
            }

            // 영상 필터
            if (filterVideoId !== 'all') {
                if (!comment.videos || comment.videos.id !== filterVideoId) return false;
            }

            return true;
        });
    }, [comments, searchQuery, filterVideoId]);

    const hasActiveFilters = searchQuery !== '' || filterVideoId !== 'all';

    const handleDelete = async (id) => {
        try {
            await savedCommentsApi.delete(id);
            setComments(prev => prev.filter(c => c.id !== id));
        } catch (error) {
            console.error('삭제 오류:', error);
        }
    };

    const handleStartEdit = (comment) => {
        setEditingId(comment.id);
        setEditMemo(comment.memo || '');
    };

    const handleSaveEdit = async (id) => {
        try {
            await savedCommentsApi.update(id, { memo: editMemo });
            setComments(prev => prev.map(c => c.id === id ? { ...c, memo: editMemo } : c));
            setEditingId(null);
        } catch (error) {
            console.error('수정 오류:', error);
        }
    };

    // 필터 그룹 구성
    const filterGroups = linkedVideos.length > 1 ? [
        {
            key: 'video',
            label: '영상별',
            options: [
                { value: 'all', label: '전체' },
                ...linkedVideos.map(v => ({
                    value: v.id,
                    label: v.title?.length > 15 ? v.title.slice(0, 15) + '...' : (v.title || '제목 없음'),
                })),
            ],
            value: filterVideoId,
            onChange: setFilterVideoId,
        },
    ] : [];

    return (
        <div className="min-h-screen bg-gray-50">
            <NavigationTabs />

            <div className="max-w-2xl mx-auto px-4 pt-20 pb-8">
                <h1 className="text-lg font-bold text-gray-900 mb-4">
                    저장한 댓글
                    {comments.length > 0 && (
                        <span className="ml-2 text-sm font-normal text-gray-500">({filteredComments.length}/{comments.length})</span>
                    )}
                </h1>

                {/* 검색/필터 (댓글이 있을 때만) */}
                {comments.length > 0 && (
                    <div className="mb-4">
                        <FilterPanel
                            searchQuery={searchQuery}
                            onSearchChange={setSearchQuery}
                            searchPlaceholder="댓글, 작성자, 메모 검색..."
                            filterGroups={filterGroups}
                        />
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : comments.length === 0 ? (
                    <div className="text-center py-16">
                        <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                        <p className="text-sm text-gray-500 mb-1">저장한 댓글이 없습니다</p>
                        <p className="text-xs text-gray-400">영상 상세에서 인기 댓글의 북마크 버튼을 눌러 저장하세요</p>
                    </div>
                ) : filteredComments.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <p className="text-sm mb-2">검색 결과가 없습니다</p>
                        <p className="text-xs text-gray-400 mb-4">
                            필터를 해제하면 전체 {comments.length}개 댓글을 볼 수 있어요
                        </p>
                        <button
                            onClick={() => { setSearchQuery(''); setFilterVideoId('all'); }}
                            className="px-4 py-2 text-sm bg-primary-50 text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-100 transition-colors"
                        >
                            필터 초기화
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredComments.map(comment => {
                            const video = comment.videos;
                            const PlatformIcon = video ? getPlatformIcon(video.platform) : null;
                            const platformColor = video ? getPlatformColor(video.platform) : '';

                            return (
                                <div key={comment.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                    {video && (
                                        <button
                                            onClick={() => navigate(`/videos?video=${video.id}`)}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                                        >
                                            {video.thumbnail && (
                                                <img src={video.thumbnail} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium text-gray-800 truncate">{video.title}</p>
                                                {PlatformIcon && (
                                                    <span className={`inline-flex items-center gap-0.5 text-[10px] mt-0.5 ${platformColor}`}>
                                                        <PlatformIcon className="w-2.5 h-2.5" />
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    )}

                                    <div className="px-4 py-3">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-xs font-medium text-gray-700">{comment.author}</span>
                                            {comment.like_count > 0 && (
                                                <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                                                    </svg>
                                                    {comment.like_count}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{comment.text}</p>

                                        {editingId === comment.id ? (
                                            <div className="mt-2 flex gap-1.5">
                                                <input
                                                    type="text"
                                                    value={editMemo}
                                                    onChange={(e) => setEditMemo(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(comment.id)}
                                                    className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-amber-400"
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={() => handleSaveEdit(comment.id)}
                                                    className="px-2 py-1 text-xs bg-amber-500 text-white rounded hover:bg-amber-600"
                                                >
                                                    저장
                                                </button>
                                                <button
                                                    onClick={() => setEditingId(null)}
                                                    className="px-2 py-1 text-xs text-gray-500"
                                                >
                                                    취소
                                                </button>
                                            </div>
                                        ) : comment.memo ? (
                                            <div
                                                onClick={() => handleStartEdit(comment)}
                                                className="mt-2 px-2 py-1 bg-amber-50 rounded text-xs text-amber-700 cursor-pointer hover:bg-amber-100 transition-colors"
                                            >
                                                {comment.memo}
                                            </div>
                                        ) : null}

                                        <div className="mt-2 flex items-center gap-2 justify-end">
                                            <button
                                                onClick={() => handleStartEdit(comment)}
                                                className="text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
                                            >
                                                {comment.memo ? '메모 수정' : '메모 추가'}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(comment.id)}
                                                className="text-[10px] text-gray-400 hover:text-red-500 transition-colors"
                                            >
                                                삭제
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SavedCommentsPage;
