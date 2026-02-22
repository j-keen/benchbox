import React, { useState, useEffect } from 'react';
import { videosApi, tagsApi, parseUrlApi, foldersApi } from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import VideoCard from '../components/VideoCard';
import VideoModal from '../components/VideoModal';
import QuickUrlModal from '../components/QuickUrlModal';
import BatchTagModal from '../components/BatchTagModal';
import NavigationTabs from '../components/NavigationTabs';
import { getPlatformName } from '../utils/platformIcons';

const AllVideosPage = () => {
    const toast = useToast();
    const [videos, setVideos] = useState([]);
    const [tags, setTags] = useState([]);
    const [folders, setFolders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedVideo, setSelectedVideo] = useState(null);

    // 필터 상태
    const [sortBy, setSortBy] = useState('newest');
    const [filterPlatform, setFilterPlatform] = useState('all');
    const [filterVideoType, setFilterVideoType] = useState('all');
    const [filterTag, setFilterTag] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // 모달 상태
    const [showAddModal, setShowAddModal] = useState(false);
    const [showBatchTagModal, setShowBatchTagModal] = useState(false);

    // 선택 상태
    const [selectedVideos, setSelectedVideos] = useState(new Set());
    const selectionMode = selectedVideos.size > 0;

    useEffect(() => {
        loadData();
    }, [sortBy, filterPlatform, filterVideoType, filterTag, searchQuery]);

    const loadData = async () => {
        try {
            setLoading(true);
            const params = {
                sort: sortBy,
            };
            // 전체 영상 보기 - channel_id 필터 없음
            if (filterPlatform !== 'all') params.platform = filterPlatform;
            if (filterVideoType !== 'all') params.video_type = filterVideoType;
            if (filterTag) params.tag = filterTag;
            if (searchQuery) params.search = searchQuery;

            const [videosRes, tagsRes, foldersRes] = await Promise.all([
                videosApi.getAll(params),
                tagsApi.getAll(),
                foldersApi.getAll()
            ]);

            setVideos(videosRes.data.videos || []);
            setTags(tagsRes.data.tags || []);
            setFolders(foldersRes.data.folders || []);
        } catch (error) {
            console.error('데이터 로드 오류:', error);
        } finally {
            setLoading(false);
        }
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

    const handleVideoDelete = (videoId) => {
        setVideos(prev => prev.filter(v => v.id !== videoId));
        setSelectedVideo(null);
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

    // 선택한 영상을 폴더로 이동
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

    return (
        <div className="min-h-screen bg-gray-50">
            {/* 네비게이션 탭 */}
            <NavigationTabs />

            {/* 헤더 */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-2 sm:gap-4">
                            <h1 className="text-xl font-bold text-gray-900">전체 영상</h1>
                            <span className="text-xs sm:text-sm text-gray-500">{videos.length}개</span>
                        </div>

                        {/* 영상 추가 버튼 + 검색창 */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 text-sm bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors min-h-[44px] sm:min-h-0"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                영상 추가
                            </button>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="제목, 메모, 태그 검색..."
                                    className="w-full sm:w-64 pl-9 pr-3 py-2.5 sm:py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* 필터 */}
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="text-sm border border-gray-200 rounded-lg px-3 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0"
                        >
                            <option value="newest">최신순</option>
                            <option value="oldest">오래된순</option>
                            <option value="title">제목순</option>
                        </select>

                        <select
                            value={filterVideoType}
                            onChange={(e) => setFilterVideoType(e.target.value)}
                            className="text-sm border border-gray-200 rounded-lg px-3 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0"
                        >
                            <option value="all">전체 형식</option>
                            <option value="shorts">숏폼</option>
                            <option value="long">롱폼</option>
                        </select>

                        <select
                            value={filterPlatform}
                            onChange={(e) => setFilterPlatform(e.target.value)}
                            className="text-sm border border-gray-200 rounded-lg px-3 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0"
                        >
                            <option value="all">전체 플랫폼</option>
                            <option value="youtube">{getPlatformName('youtube')}</option>
                            <option value="tiktok">{getPlatformName('tiktok')}</option>
                            <option value="instagram">{getPlatformName('instagram')}</option>
                        </select>

                        {tags.length > 0 && (
                            <select
                                value={filterTag}
                                onChange={(e) => setFilterTag(e.target.value)}
                                className="text-sm border border-gray-200 rounded-lg px-3 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0"
                            >
                                <option value="">전체 태그</option>
                                {tags.map(tag => (
                                    <option key={tag.id} value={tag.name}>#{tag.name}</option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>

                {/* 선택 툴바 */}
                {selectionMode && (
                    <div className="bg-primary-500 text-white">
                        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <span className="font-medium">{selectedVideos.size}개 선택됨</span>
                            <div className="flex flex-wrap items-center gap-2">
                                {/* 폴더로 이동 */}
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

            {/* 메인 콘텐츠 */}
            <main className="max-w-7xl mx-auto px-4 py-6">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {/* 영상 추가 카드 */}
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

                        {/* 영상 카드들 */}
                        {videos.map(video => (
                            <div key={video.id}>
                                <VideoCard
                                    video={video}
                                    onClick={setSelectedVideo}
                                    isSelected={selectedVideos.has(video.id)}
                                    onSelect={handleVideoSelect}
                                    selectionMode={selectionMode}
                                />
                            </div>
                        ))}
                    </div>
                )}

                {!loading && videos.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <p>등록된 영상이 없습니다</p>
                    </div>
                )}
            </main>

            {/* 영상 상세 모달 */}
            {selectedVideo && (
                <VideoModal
                    video={selectedVideo}
                    onClose={() => setSelectedVideo(null)}
                    onUpdate={handleVideoUpdate}
                    onDelete={handleVideoDelete}
                />
            )}

            {/* 영상 추가 모달 */}
            {showAddModal && (
                <QuickUrlModal
                    title="영상 추가"
                    placeholder="영상 URL 붙여넣기..."
                    onSubmit={handleQuickAdd}
                    onClose={() => setShowAddModal(false)}
                />
            )}

            {/* 일괄 태그 추가 모달 */}
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
