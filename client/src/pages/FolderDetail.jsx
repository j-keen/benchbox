import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { foldersApi, channelsApi, videosApi, parseUrlApi } from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import { useGlobalPaste } from '../hooks/useKeyboardShortcuts';
import NavigationTabs from '../components/NavigationTabs';
import ChannelCard, { AddChannelCard } from '../components/ChannelCard';
import VideoCard from '../components/VideoCard';
import VideoModal from '../components/VideoModal';
import FolderModal from '../components/FolderModal';
import QuickUrlModal from '../components/QuickUrlModal';

const FolderDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const toast = useToast();

    // 상태
    const [folder, setFolder] = useState(null);
    const [channels, setChannels] = useState([]);
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);

    // 모달 상태
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [showFolderModal, setShowFolderModal] = useState(false);
    const [showChannelUrlModal, setShowChannelUrlModal] = useState(false);
    const [showVideoUrlModal, setShowVideoUrlModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // 선택 상태
    const [selectedChannels, setSelectedChannels] = useState(new Set());
    const [selectedVideos, setSelectedVideos] = useState(new Set());
    const [selectionMode, setSelectionMode] = useState(false);

    // 필터 상태
    const [filterChannelId, setFilterChannelId] = useState(null); // null = 전체
    const [sortBy, setSortBy] = useState('newest');

    // 선택 모드 토글
    useEffect(() => {
        if (selectedChannels.size > 0 || selectedVideos.size > 0) {
            setSelectionMode(true);
        } else {
            setSelectionMode(false);
        }
    }, [selectedChannels, selectedVideos]);

    // 데이터 로드
    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        try {
            setLoading(true);
            const res = await foldersApi.getById(id);
            setFolder(res.data.folder);
            setChannels(res.data.channels || []);
            setVideos(res.data.videos || []);
        } catch (error) {
            console.error('폴더 데이터 로드 오류:', error);
            navigate('/');
        } finally {
            setLoading(false);
        }
    };

    // 채널 클릭 처리
    const handleChannelClick = (channel) => {
        navigate(`/channel/${channel.id}`);
    };

    // 빠른 채널 URL 등록 (이 폴더에 추가)
    const handleQuickChannelAdd = async (url) => {
        const parseResult = await parseUrlApi.parse(url);
        const parsed = parseResult.data;
        const response = await channelsApi.create({
            url,
            title: parsed.title,
            thumbnail: parsed.thumbnail,
            description: parsed.description
        });
        const newChannel = response.data;

        // 새 채널을 이 폴더로 이동
        await foldersApi.moveChannels(id, [newChannel.id]);
        await loadData();
    };

    // 빠른 영상 URL 등록 (폴더에 직접 저장)
    const handleQuickVideoAdd = async (url) => {
        const parseResult = await parseUrlApi.parse(url);
        const parsed = parseResult.data;
        // 폴더에 직접 영상 저장 (folder_id만 설정, channel_id는 null)
        await videosApi.create({
            url,
            folder_id: parseInt(id),
            title: parsed.title,
            thumbnail: parsed.thumbnail,
            description: parsed.description
        });
        await loadData();
    };

    // 폴더 수정
    const handleSaveFolder = async (folderData) => {
        try {
            await foldersApi.update(id, folderData);
            await loadData();
            setShowFolderModal(false);
            toast.success('폴더가 수정되었습니다.');
        } catch (error) {
            console.error('폴더 수정 오류:', error);
            toast.error('폴더 수정에 실패했습니다.');
        }
    };

    // 폴더 삭제
    const handleDeleteFolder = async () => {
        try {
            await foldersApi.delete(id);
            toast.success('폴더가 삭제되었습니다.');
            navigate('/');
        } catch (error) {
            console.error('폴더 삭제 오류:', error);
            toast.error('폴더 삭제에 실패했습니다.');
        }
    };

    // 영상 업데이트 처리
    const handleVideoUpdate = (updatedVideo) => {
        setVideos(prev => prev.map(v => v.id === updatedVideo.id ? updatedVideo : v));
        setSelectedVideo(updatedVideo);
    };

    // 영상 삭제 처리
    const handleVideoDelete = (videoId) => {
        setVideos(prev => prev.filter(v => v.id !== videoId));
        setSelectedVideo(null);
    };

    // 채널 선택 토글
    const handleChannelSelect = (channelId) => {
        setSelectedChannels(prev => {
            const newSet = new Set(prev);
            if (newSet.has(channelId)) {
                newSet.delete(channelId);
            } else {
                newSet.add(channelId);
            }
            return newSet;
        });
    };

    // 영상 선택 토글
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

    // 선택 취소
    const clearSelection = () => {
        setSelectedChannels(new Set());
        setSelectedVideos(new Set());
    };

    // 선택 항목 삭제
    const handleDeleteSelected = async () => {
        const channelCount = selectedChannels.size;
        const videoCount = selectedVideos.size;

        if (channelCount === 0 && videoCount === 0) return;

        const confirmMsg = [];
        if (channelCount > 0) confirmMsg.push(`채널 ${channelCount}개`);
        if (videoCount > 0) confirmMsg.push(`영상 ${videoCount}개`);

        if (!confirm(`${confirmMsg.join(', ')}를 삭제하시겠습니까?`)) return;

        try {
            for (const channelId of selectedChannels) {
                await channelsApi.delete(channelId);
            }
            for (const videoId of selectedVideos) {
                await videosApi.delete(videoId);
            }

            setChannels(prev => prev.filter(c => !selectedChannels.has(c.id)));
            setVideos(prev => prev.filter(v => !selectedVideos.has(v.id)));
            clearSelection();
            toast.success('삭제되었습니다.');
        } catch (error) {
            console.error('삭제 오류:', error);
            toast.error('삭제 중 오류가 발생했습니다.');
        }
    };

    // 전역 URL 붙여넣기 처리 (이 폴더에 영상으로 저장)
    const handleGlobalPaste = useCallback(async (url) => {
        try {
            const parseResult = await parseUrlApi.parse(url);
            const parsed = parseResult.data;
            // 폴더 페이지에서는 영상으로 저장 (folder_id 포함)
            await videosApi.create({
                url,
                folder_id: parseInt(id),
                title: parsed.title,
                thumbnail: parsed.thumbnail,
                description: parsed.description
            });
            await loadData();
            toast.success('영상이 등록되었습니다.');
        } catch (error) {
            console.error('URL 등록 오류:', error);
            toast.error(error.response?.data?.error || 'URL 등록에 실패했습니다.');
        }
    }, [id, toast]);

    // 전역 붙여넣기 훅
    useGlobalPaste(handleGlobalPaste);

    // 필터링된 영상
    const filteredVideos = filterChannelId === 'folder'
        ? videos.filter(v => v.source_type === 'folder')  // 폴더 직접 저장 영상만
        : filterChannelId
            ? videos.filter(v => v.channel_id === filterChannelId)
            : videos;

    // 정렬된 영상
    const sortedVideos = [...filteredVideos].sort((a, b) => {
        if (sortBy === 'newest') {
            return new Date(b.created_at) - new Date(a.created_at);
        } else if (sortBy === 'oldest') {
            return new Date(a.created_at) - new Date(b.created_at);
        } else if (sortBy === 'title') {
            return (a.title || '').localeCompare(b.title || '');
        }
        return 0;
    });

    if (loading || !folder) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <NavigationTabs />

            {/* 폴더 헤더 */}
            <header className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex items-start gap-3 sm:gap-4">
                            {/* 뒤로가기 */}
                            <button
                                onClick={() => navigate('/')}
                                className="mt-1 p-2 sm:p-1 text-gray-400 hover:text-gray-600 transition-colors min-h-[44px] sm:min-h-0"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>

                            {/* 폴더 아이콘 */}
                            <div
                                className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: folder.color + '20' }}
                            >
                                <svg
                                    className="w-5 h-5 sm:w-6 sm:h-6"
                                    style={{ color: folder.color }}
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                                </svg>
                            </div>

                            {/* 폴더 정보 */}
                            <div className="min-w-0 flex-1">
                                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{folder.name}</h1>
                                {folder.description && (
                                    <p className="mt-1 text-sm sm:text-base text-gray-600 line-clamp-2">{folder.description}</p>
                                )}
                                <div className="mt-2 flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500">
                                    <span>{channels.length}개 채널</span>
                                    <span>·</span>
                                    <span>{videos.length}개 영상</span>
                                </div>
                            </div>
                        </div>

                        {/* 액션 버튼 */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <button
                                onClick={() => setShowChannelUrlModal(true)}
                                className="flex items-center gap-1.5 px-3 py-2 sm:py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors min-h-[44px] sm:min-h-0"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                </svg>
                                <span className="hidden sm:inline">채널 추가</span>
                                <span className="sm:hidden">채널</span>
                            </button>
                            <button
                                onClick={() => setShowVideoUrlModal(true)}
                                className="flex items-center gap-1.5 px-3 py-2 sm:py-1.5 text-sm bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors min-h-[44px] sm:min-h-0"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                <span className="hidden sm:inline">영상 추가</span>
                                <span className="sm:hidden">영상</span>
                            </button>
                            <button
                                onClick={() => setShowFolderModal(true)}
                                className="p-2.5 sm:p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors min-h-[44px] sm:min-h-0"
                                title="폴더 편집"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </button>
                            {!showDeleteConfirm ? (
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="p-2.5 sm:p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors min-h-[44px] sm:min-h-0"
                                    title="폴더 삭제"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            ) : (
                                <div className="flex items-center gap-2 px-3 py-2 sm:py-1.5 bg-red-50 rounded-lg">
                                    <span className="text-sm text-red-600">삭제?</span>
                                    <button
                                        onClick={handleDeleteFolder}
                                        className="text-sm font-medium text-red-600 hover:text-red-700 min-h-[44px] sm:min-h-0 px-2"
                                    >
                                        삭제
                                    </button>
                                    <button
                                        onClick={() => setShowDeleteConfirm(false)}
                                        className="text-sm text-gray-500 hover:text-gray-700 min-h-[44px] sm:min-h-0 px-2"
                                    >
                                        취소
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                {/* 선택 툴바 */}
                {selectionMode && (
                    <div className="bg-primary-500 text-white">
                        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                                <span className="font-medium">
                                    {selectedChannels.size + selectedVideos.size}개 선택됨
                                </span>
                                {selectedChannels.size > 0 && (
                                    <span className="text-xs sm:text-sm opacity-80">채널 {selectedChannels.size}개</span>
                                )}
                                {selectedVideos.size > 0 && (
                                    <span className="text-xs sm:text-sm opacity-80">영상 {selectedVideos.size}개</span>
                                )}
                                <span className="hidden sm:inline text-xs opacity-60">(ESC로 취소)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={clearSelection}
                                    className="px-4 py-2 sm:py-1.5 text-sm bg-white/20 hover:bg-white/30 rounded-lg transition-colors min-h-[44px] sm:min-h-0"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handleDeleteSelected}
                                    className="px-4 py-2 sm:py-1.5 text-sm bg-red-500 hover:bg-red-600 rounded-lg transition-colors flex items-center gap-1 min-h-[44px] sm:min-h-0"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    삭제
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </header>

            <main className="max-w-7xl mx-auto px-4 py-6">
                {/* 채널 섹션 */}
                <section className="mb-8">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        채널 ({channels.length})
                    </h2>

                    {channels.length > 0 ? (
                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                            {channels.map(channel => (
                                <ChannelCard
                                    key={channel.id}
                                    channel={channel}
                                    onClick={handleChannelClick}
                                    isSelected={selectedChannels.has(channel.id)}
                                    onSelect={handleChannelSelect}
                                    selectionMode={selectionMode}
                                />
                            ))}
                            <AddChannelCard onClick={() => setShowChannelUrlModal(true)} />
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg border border-dashed border-gray-300 p-8 text-center">
                            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                            <p className="text-gray-500 mb-3">이 폴더에 채널이 없습니다</p>
                            <button
                                onClick={() => setShowChannelUrlModal(true)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm rounded-lg transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                첫 채널 추가하기
                            </button>
                        </div>
                    )}
                </section>

                {/* 영상 섹션 */}
                <section>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">
                            영상 ({filteredVideos.length})
                        </h2>

                        <div className="flex items-center gap-3">
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="text-sm border border-gray-200 rounded-lg px-3 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            >
                                <option value="newest">최신순</option>
                                <option value="oldest">오래된순</option>
                                <option value="title">제목순</option>
                            </select>
                        </div>
                    </div>

                    {/* 채널별 필터 탭 */}
                    <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
                        <button
                            onClick={() => setFilterChannelId(null)}
                            className={`flex-shrink-0 px-4 py-2.5 sm:py-2 rounded-full text-sm font-medium transition-all min-h-[44px] sm:min-h-0 snap-start ${
                                filterChannelId === null
                                    ? 'bg-primary-500 text-white shadow-md'
                                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                            }`}
                        >
                            전체
                        </button>

                        {/* 폴더 직접 저장 영상 필터 */}
                        {videos.some(v => v.source_type === 'folder') && (
                            <button
                                onClick={() => setFilterChannelId('folder')}
                                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 sm:py-2 rounded-full text-sm font-medium transition-all min-h-[44px] sm:min-h-0 snap-start ${
                                    filterChannelId === 'folder'
                                        ? 'bg-gray-700 text-white shadow-md'
                                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                }`}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                                </svg>
                                <span>폴더 저장</span>
                                <span className={`text-xs ${filterChannelId === 'folder' ? 'opacity-70' : 'text-gray-400'}`}>
                                    {videos.filter(v => v.source_type === 'folder').length}
                                </span>
                            </button>
                        )}

                        {channels.map(channel => (
                            <button
                                key={channel.id}
                                onClick={() => setFilterChannelId(channel.id)}
                                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 sm:py-2 rounded-full text-sm font-medium transition-all min-h-[44px] sm:min-h-0 snap-start ${
                                    filterChannelId === channel.id
                                        ? 'bg-primary-500 text-white shadow-md'
                                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                }`}
                            >
                                {channel.thumbnail && (
                                    <img
                                        src={channel.thumbnail}
                                        alt=""
                                        className="w-5 h-5 rounded-full object-cover"
                                    />
                                )}
                                <span className="truncate max-w-[80px] sm:max-w-[100px]">{channel.title || 'Untitled'}</span>
                                <span className={`text-xs ${filterChannelId === channel.id ? 'opacity-70' : 'text-gray-400'}`}>
                                    {channel.video_count || 0}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* 영상 그리드 */}
                    {sortedVideos.length > 0 ? (
                        <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4 space-y-4">
                            {sortedVideos.map(video => (
                                <div key={video.id} className="break-inside-avoid">
                                    <VideoCard
                                        video={video}
                                        onClick={setSelectedVideo}
                                        showChannelInfo={filterChannelId === null}
                                        isSelected={selectedVideos.has(video.id)}
                                        onSelect={handleVideoSelect}
                                        selectionMode={selectionMode}
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg border border-dashed border-gray-300 p-12 text-center">
                            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <p className="text-gray-500 mb-4">
                                {filterChannelId
                                    ? '이 채널에 저장된 영상이 없습니다'
                                    : '이 폴더에 저장된 영상이 없습니다'}
                            </p>
                            {channels.length > 0 && (
                                <button
                                    onClick={() => setShowVideoUrlModal(true)}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    첫 영상 추가하기
                                </button>
                            )}
                        </div>
                    )}
                </section>
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

            {/* 폴더 수정 모달 */}
            {showFolderModal && (
                <FolderModal
                    folder={folder}
                    onSave={handleSaveFolder}
                    onClose={() => setShowFolderModal(false)}
                />
            )}

            {/* 빠른 채널 URL 등록 모달 */}
            {showChannelUrlModal && (
                <QuickUrlModal
                    title="채널 추가"
                    placeholder="채널 URL 붙여넣기..."
                    onSubmit={handleQuickChannelAdd}
                    onClose={() => setShowChannelUrlModal(false)}
                />
            )}

            {/* 빠른 영상 URL 등록 모달 */}
            {showVideoUrlModal && (
                <QuickUrlModal
                    title="영상 추가"
                    placeholder="영상 URL 붙여넣기..."
                    onSubmit={handleQuickVideoAdd}
                    onClose={() => setShowVideoUrlModal(false)}
                />
            )}
        </div>
    );
};

export default FolderDetail;
