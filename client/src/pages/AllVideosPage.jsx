import React, { useState, useEffect, useRef, useCallback } from 'react';
import { videosApi, tagsApi, parseUrlApi, foldersApi } from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import VideoCard from '../components/VideoCard';
import VideoModal from '../components/VideoModal';
import QuickUrlModal from '../components/QuickUrlModal';
import BatchTagModal from '../components/BatchTagModal';
import NavigationTabs from '../components/NavigationTabs';
import FilterPanel from '../components/FilterPanel';
import { getPlatformName } from '../utils/platformIcons';
import { CATEGORIES } from '../utils/categories';
import { exportCheckedVideosAsMarkdown, downloadMarkdownFile } from '../utils/exportMarkdown';

const AllVideosPage = () => {
    const toast = useToast();
    const [videos, setVideos] = useState([]);
    const [tags, setTags] = useState([]);
    const [folders, setFolders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [totalCount, setTotalCount] = useState(0);

    // 필터 상태
    const [sortBy, setSortBy] = useState('newest');
    const [filterPlatform, setFilterPlatform] = useState('all');
    const [filterVideoType, setFilterVideoType] = useState('all');
    const [filterTag, setFilterTag] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterRating, setFilterRating] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // 모달 상태
    const [showAddModal, setShowAddModal] = useState(false);
    const [showBatchTagModal, setShowBatchTagModal] = useState(false);

    // 선택 상태
    const [selectedVideos, setSelectedVideos] = useState(new Set());
    const selectionMode = selectedVideos.size > 0;

    // 다운로드 체크된 영상 수
    const checkedCount = videos.filter(v => v.download_check).length;

    // 필터 활성 여부
    const hasActiveFilters = filterPlatform !== 'all' || filterVideoType !== 'all' ||
        filterCategory !== 'all' || filterTag !== '' || filterRating !== null || searchQuery !== '';

    useEffect(() => {
        loadData();
    }, [sortBy, filterPlatform, filterVideoType, filterTag, filterCategory, filterRating, searchQuery]);

    const loadData = async () => {
        try {
            setLoading(true);
            const params = { sort: sortBy };
            if (filterPlatform !== 'all') params.platform = filterPlatform;
            if (filterVideoType !== 'all') params.video_type = filterVideoType;
            if (filterTag) params.tag = filterTag;
            if (filterCategory !== 'all') params.category = filterCategory;
            if (filterRating) params.min_rating = filterRating;
            if (searchQuery) params.search = searchQuery;

            const [videosRes, tagsRes, foldersRes] = await Promise.all([
                videosApi.getAll(params),
                tagsApi.getAll(),
                foldersApi.getAll()
            ]);

            const loadedVideos = videosRes.data.videos || [];
            setVideos(loadedVideos);
            setTags(tagsRes.data.tags || []);
            setFolders(foldersRes.data.folders || []);

            // 필터 없을 때만 전체 개수 업데이트
            if (!hasActiveFilters) {
                setTotalCount(loadedVideos.length);
            }
        } catch (error) {
            console.error('데이터 로드 오류:', error);
        } finally {
            setLoading(false);
        }
    };

    // 전체 개수를 처음 로드 시 기록
    useEffect(() => {
        if (!hasActiveFilters && videos.length > 0) {
            setTotalCount(videos.length);
        }
    }, [videos, hasActiveFilters]);

    const handleClearAllFilters = () => {
        setSortBy('newest');
        setFilterPlatform('all');
        setFilterVideoType('all');
        setFilterTag('');
        setFilterCategory('all');
        setFilterRating(null);
        setSearchQuery('');
    };

    const handleQuickAdd = async (url) => {
        const parseResult = await parseUrlApi.parse(url);
        const parsed = parseResult.data;
        const response = await videosApi.create({
            url,
            title: parsed.title,
            thumbnail: parsed.thumbnail,
            description: parsed.description
        });
        setVideos(prev => [response.data, ...prev]);
    };

    const handleVideoUpdate = (updatedVideo) => {
        setVideos(prev => prev.map(v => v.id === updatedVideo.id ? updatedVideo : v));
        setSelectedVideo(updatedVideo);
    };

    const handleVideoDelete = (videoId, deletedIndex) => {
        setVideos(prev => {
            const next = prev.filter(v => v.id !== videoId);
            if (next.length > 0 && deletedIndex !== undefined) {
                const nextIdx = deletedIndex < next.length ? deletedIndex : next.length - 1;
                setSelectedVideo(next[nextIdx]);
            } else {
                setSelectedVideo(null);
            }
            return next;
        });
    };

    const handleVideoSelect = (videoId) => {
        setSelectedVideos(prev => {
            const newSet = new Set(prev);
            if (newSet.has(videoId)) {
                newSet.delete(videoId);
            } else {
                newSet.add(videoId);
            }
            return newSet;
        });
    };

    const clearSelection = () => {
        setSelectedVideos(new Set());
    };

    const handleDeleteSelected = async () => {
        if (!confirm(`${selectedVideos.size}개 영상을 삭제하시겠습니까?`)) return;

        try {
            for (const videoId of selectedVideos) {
                await videosApi.delete(videoId);
            }
            setVideos(prev => prev.filter(v => !selectedVideos.has(v.id)));
            clearSelection();
            toast.success('삭제되었습니다.');
        } catch (error) {
            console.error('삭제 오류:', error);
            toast.error('삭제 중 오류가 발생했습니다.');
        }
    };

    const handleBatchTagApply = async (newTags) => {
        try {
            for (const videoId of selectedVideos) {
                const video = videos.find(v => v.id === videoId);
                if (video) {
                    const existingTags = video.tags || [];
                    const mergedTags = [...new Set([...existingTags, ...newTags])];
                    await videosApi.update(videoId, { tags: mergedTags });
                }
            }
            await loadData();
            clearSelection();
            setShowBatchTagModal(false);
            toast.success('태그가 추가되었습니다.');
        } catch (error) {
            console.error('태그 추가 오류:', error);
            toast.error('태그 추가에 실패했습니다.');
        }
    };

    const handleMoveToFolder = async (folderId) => {
        if (selectedVideos.size === 0) return;

        try {
            await foldersApi.moveVideos(folderId, Array.from(selectedVideos));
            setVideos(prev => prev.filter(v => !selectedVideos.has(v.id)));
            clearSelection();
            toast.success('영상을 폴더로 이동했습니다.');
        } catch (error) {
            console.error('폴더 이동 오류:', error);
            toast.error('폴더 이동 중 오류가 발생했습니다.');
        }
    };

    const handleToggleDownloadCheck = async (videoId, checked) => {
        try {
            await videosApi.update(videoId, { download_check: checked });
            setVideos(prev => prev.map(v => v.id === videoId ? { ...v, download_check: checked } : v));
        } catch (error) {
            console.error('다운로드 체크 오류:', error);
        }
    };

    const handleExportChecked = () => {
        const checkedVideos = videos.filter(v => v.download_check);
        if (checkedVideos.length === 0) {
            toast.error('다운로드 체크된 영상이 없습니다.');
            return;
        }
        const md = exportCheckedVideosAsMarkdown(checkedVideos);
        downloadMarkdownFile(md, `benchbox-download-${new Date().toISOString().slice(0, 10)}.md`);
        toast.success(`${checkedVideos.length}개 영상 목록을 내보냈습니다.`);
    };

    // FilterPanel용 필터 그룹 구성
    const filterGroups = [
        {
            key: 'platform',
            label: '플랫폼',
            options: [
                { value: 'all', label: '전체' },
                { value: 'youtube', label: getPlatformName('youtube') },
                { value: 'tiktok', label: getPlatformName('tiktok') },
                { value: 'instagram', label: getPlatformName('instagram') },
            ],
            value: filterPlatform,
            onChange: setFilterPlatform,
        },
        {
            key: 'videoType',
            label: '형식',
            options: [
                { value: 'all', label: '전체' },
                { value: 'shorts', label: '숏폼' },
                { value: 'long', label: '롱폼' },
            ],
            value: filterVideoType,
            onChange: setFilterVideoType,
        },
        {
            key: 'category',
            label: '카테고리',
            options: [
                { value: 'all', label: '전체' },
                ...CATEGORIES.map(cat => ({ value: cat.id, label: `${cat.emoji} ${cat.label}` })),
            ],
            value: filterCategory,
            onChange: setFilterCategory,
        },
        ...(tags.length > 0 ? [{
            key: 'tag',
            label: '태그',
            options: [
                { value: '', label: '전체' },
                ...tags.map(tag => ({ value: tag.name, label: `#${tag.name}` })),
            ],
            value: filterTag,
            onChange: setFilterTag,
        }] : []),
        {
            key: 'rating',
            label: '별점',
            type: 'rating-min',
            value: filterRating,
            onChange: setFilterRating,
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <NavigationTabs />

            <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    {/* 타이틀 + 추가 버튼 */}
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 sm:gap-4">
                            <h1 className="text-xl font-bold text-gray-900">전체 영상</h1>
                            <span className="text-xs sm:text-sm text-gray-500">{videos.length}개</span>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                            >
                                <option value="newest">최신순</option>
                                <option value="oldest">오래된순</option>
                                <option value="title">제목순</option>
                                <option value="rating_desc">별점순</option>
                            </select>
                            {checkedCount > 0 && (
                                <button
                                    onClick={handleExportChecked}
                                    className="flex items-center gap-1 px-2.5 py-1 text-xs bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 rounded-lg transition-colors"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    내보내기 ({checkedCount})
                                </button>
                            )}
                        </div>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 text-sm bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors min-h-[44px] sm:min-h-0"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span className="hidden sm:inline">영상 추가</span>
                        </button>
                    </div>

                    {/* FilterPanel */}
                    <FilterPanel
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        searchPlaceholder="제목, 메모, 태그 검색..."
                        filterGroups={filterGroups}
                    />
                </div>

                {/* 선택 툴바 */}
                {selectionMode && (
                    <div className="bg-primary-500 text-white">
                        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <span className="font-medium">{selectedVideos.size}개 선택됨</span>
                            <div className="flex flex-wrap items-center gap-2">
                                {folders.length > 0 && (
                                    <select
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                handleMoveToFolder(e.target.value);
                                                e.target.value = '';
                                            }
                                        }}
                                        className="px-3 py-2 sm:py-1.5 text-sm bg-white/20 hover:bg-white/30 rounded-lg text-white border-0 cursor-pointer min-h-[44px] sm:min-h-0"
                                        defaultValue=""
                                    >
                                        <option value="" disabled>폴더로 이동</option>
                                        {folders.map(folder => (
                                            <option key={folder.id} value={folder.id}>{folder.name}</option>
                                        ))}
                                    </select>
                                )}
                                <button
                                    onClick={() => setShowBatchTagModal(true)}
                                    className="px-4 py-2 sm:py-1.5 text-sm bg-white/20 hover:bg-white/30 rounded-lg flex items-center gap-1 min-h-[44px] sm:min-h-0"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                    </svg>
                                    태그
                                </button>
                                <button
                                    onClick={clearSelection}
                                    className="px-4 py-2 sm:py-1.5 text-sm bg-white/20 hover:bg-white/30 rounded-lg min-h-[44px] sm:min-h-0"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handleDeleteSelected}
                                    className="px-4 py-2 sm:py-1.5 text-sm bg-red-500 hover:bg-red-600 rounded-lg min-h-[44px] sm:min-h-0"
                                >
                                    삭제
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </header>

            <main className="max-w-7xl mx-auto px-4 py-6">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        <div>
                            <div
                                onClick={() => setShowAddModal(true)}
                                className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors aspect-video flex flex-col items-center justify-center text-gray-400 hover:text-primary-500"
                            >
                                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                                </svg>
                                <span className="mt-1 text-xs">영상 추가</span>
                            </div>
                        </div>

                        {videos.map(video => (
                            <div key={video.id}>
                                <VideoCard
                                    video={video}
                                    onClick={setSelectedVideo}
                                    isSelected={selectedVideos.has(video.id)}
                                    onSelect={handleVideoSelect}
                                    selectionMode={selectionMode}
                                    onToggleDownloadCheck={handleToggleDownloadCheck}
                                />
                            </div>
                        ))}
                    </div>
                )}

                {/* 빈 결과 - 필터 있을 때 개선된 안내 */}
                {!loading && videos.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        {hasActiveFilters ? (
                            <>
                                <p className="mb-2">검색 결과가 없습니다</p>
                                {totalCount > 0 && (
                                    <p className="text-sm text-gray-400 mb-4">
                                        필터를 해제하면 전체 {totalCount}개 영상을 볼 수 있어요
                                    </p>
                                )}
                                <button
                                    onClick={handleClearAllFilters}
                                    className="px-4 py-2 text-sm bg-primary-50 text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-100 transition-colors"
                                >
                                    필터 초기화
                                </button>
                            </>
                        ) : (
                            <p>등록된 영상이 없습니다</p>
                        )}
                    </div>
                )}
            </main>

            {selectedVideo && (
                <VideoModal
                    video={selectedVideo}
                    onClose={() => setSelectedVideo(null)}
                    onUpdate={handleVideoUpdate}
                    onDelete={handleVideoDelete}
                    videos={videos}
                    currentIndex={videos.findIndex(v => v.id === selectedVideo.id)}
                    onNavigate={(idx) => setSelectedVideo(videos[idx])}
                />
            )}

            {showAddModal && (
                <QuickUrlModal
                    title="영상 추가"
                    placeholder="영상 URL 붙여넣기..."
                    onSubmit={handleQuickAdd}
                    onClose={() => setShowAddModal(false)}
                />
            )}

            {showBatchTagModal && (
                <BatchTagModal
                    selectedCount={selectedVideos.size}
                    onApply={handleBatchTagApply}
                    onClose={() => setShowBatchTagModal(false)}
                />
            )}
        </div>
    );
};

export default AllVideosPage;
