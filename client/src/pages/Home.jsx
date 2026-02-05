import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { videosApi, channelsApi, tagsApi, foldersApi, parseUrlApi } from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import { useKeyboardShortcuts, useGlobalPaste } from '../hooks/useKeyboardShortcuts';
import VideoCard from '../components/VideoCard';
import UrlInput from '../components/UrlInput';
import VideoModal from '../components/VideoModal';
import FolderModal from '../components/FolderModal';
import BatchTagModal from '../components/BatchTagModal';
import QuickUrlModal from '../components/QuickUrlModal';
import MobileAddModal from '../components/MobileAddModal';
import TagManagerModal from '../components/TagManagerModal';
import FABMenu from '../components/FABMenu';
import ApiKeySettingsModal from '../components/ApiKeySettingsModal';
import { VideoGridSkeleton } from '../components/Skeleton';

const Home = () => {
    const navigate = useNavigate();
    const searchInputRef = useRef(null);
    const toast = useToast();

    // 상태
    const [videos, setVideos] = useState([]);
    const [channels, setChannels] = useState([]);
    const [folders, setFolders] = useState([]);
    const [allTags, setAllTags] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedVideo, setSelectedVideo] = useState(null);

    // 폴더 상태
    const [activeFolder, setActiveFolder] = useState(null); // null = 전체, 'unfiled' = 미분류
    const [activeChannel, setActiveChannel] = useState(null);

    // 드롭다운 상태
    const [folderDropdownOpen, setFolderDropdownOpen] = useState(false);
    const [channelDropdownOpen, setChannelDropdownOpen] = useState(false);
    const [showFolderModal, setShowFolderModal] = useState(false);
    const [editingFolder, setEditingFolder] = useState(null);

    // 일괄 태그 모달
    const [showBatchTagModal, setShowBatchTagModal] = useState(false);

    // 빠른 URL 등록 모달
    const [showChannelUrlModal, setShowChannelUrlModal] = useState(false);
    const [showVideoUrlModal, setShowVideoUrlModal] = useState(false);

    // 태그 관리 모달
    const [showTagManager, setShowTagManager] = useState(false);

    // API 키 설정 모달
    const [showApiSettings, setShowApiSettings] = useState(false);

    // 모바일 추가 모달
    const [showMobileAddModal, setShowMobileAddModal] = useState(false);
    const [mobileAddPreview, setMobileAddPreview] = useState(null);
    const [clipboardLoading, setClipboardLoading] = useState(false);

    // 선택 상태
    const [selectedChannels, setSelectedChannels] = useState(new Set());
    const [selectedVideos, setSelectedVideos] = useState(new Set());
    const [selectedFolders, setSelectedFolders] = useState(new Set());
    const [selectionMode, setSelectionMode] = useState(false);

    // 필터 상태
    const [sortBy, setSortBy] = useState('newest');
    const [searchQuery, setSearchQuery] = useState('');
    const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);
    const [durationFilter, setDurationFilter] = useState('all'); // 'all' | 'short' | 'long'

    // 숏폼/롱폼 판별 (URL 기반)
    const isShortForm = (video) => {
        const url = video.url || '';
        // 인스타그램, 틱톡 = 항상 숏폼
        if (url.includes('instagram.com') || url.includes('tiktok.com')) return true;
        // 유튜브 Shorts
        if (url.includes('/shorts/')) return true;
        return false;
    };

    // 데이터 로드
    useEffect(() => {
        loadData();
    }, [sortBy, searchQuery, activeFolder, activeChannel, showUnassignedOnly]);

    // 선택 모드 토글
    useEffect(() => {
        if (selectedChannels.size > 0 || selectedVideos.size > 0 || selectedFolders.size > 0) {
            setSelectionMode(true);
        } else {
            setSelectionMode(false);
        }
    }, [selectedChannels, selectedVideos, selectedFolders]);

    const loadData = async () => {
        try {
            setLoading(true);

            // 폴더 필터 파라미터
            const channelParams = {};
            if (activeFolder === 'unfiled') {
                channelParams.folder_id = 'null';
            } else if (activeFolder !== null) {
                channelParams.folder_id = activeFolder;
            }

            // 특정 폴더 선택 시 해당 폴더의 영상만 가져오기
            if (activeFolder !== null && activeFolder !== 'unfiled') {
                // 폴더 상세 API 사용 (채널 영상 + 직접 저장 영상 모두 포함)
                const [folderRes, foldersRes, tagsRes] = await Promise.all([
                    foldersApi.getById(activeFolder),
                    foldersApi.getAll(),
                    tagsApi.getAll()
                ]);

                // 폴더의 영상들 필터링 적용
                let folderVideos = folderRes.data.videos || [];

                // 채널 필터
                if (activeChannel) {
                    folderVideos = folderVideos.filter(v => v.channel_id === activeChannel);
                }

                // 검색 필터
                if (searchQuery) {
                    const query = searchQuery.toLowerCase();
                    folderVideos = folderVideos.filter(v =>
                        v.title?.toLowerCase().includes(query) ||
                        v.memo?.toLowerCase().includes(query) ||
                        v.tags?.some(t => t.toLowerCase().includes(query))
                    );
                }
                // 정렬
                if (sortBy === 'oldest') {
                    folderVideos.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                } else if (sortBy === 'title') {
                    folderVideos.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
                } else {
                    folderVideos.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                }

                setVideos(folderVideos);
                setChannels(folderRes.data.channels || []);
                setFolders(foldersRes.data.folders || []);
                setAllTags(tagsRes.data.tags || []);
            } else {
                // 전체 또는 미분류: 기존 로직
                const videoParams = {
                    sort: sortBy,
                    search: searchQuery || undefined
                };

                // 채널 필터
                if (activeChannel) {
                    videoParams.channel_id = activeChannel;
                }

                // 미분류 선택 시 channel_id와 folder_id 둘 다 null인 영상만
                if (activeFolder === 'unfiled') {
                    videoParams.channel_id = 'null';
                    videoParams.folder_id = 'null';
                } else if (showUnassignedOnly) {
                    videoParams.unassigned = true;
                }

                const [videosRes, channelsRes, foldersRes, tagsRes] = await Promise.all([
                    videosApi.getAll(videoParams),
                    channelsApi.getAll(channelParams),
                    foldersApi.getAll(),
                    tagsApi.getAll()
                ]);

                setVideos(videosRes.data.videos || []);
                setChannels(channelsRes.data.channels || []);
                setFolders(foldersRes.data.folders || []);
                setAllTags(tagsRes.data.tags || []);
            }
        } catch (error) {
            console.error('데이터 로드 오류:', error);
        } finally {
            setLoading(false);
        }
    };

    // URL 저장 처리
    const handleSaveUrl = async (data) => {
        try {
            if (data.isChannel) {
                const response = await channelsApi.create({
                    url: data.url,
                    title: data.title,
                    thumbnail: data.thumbnail,
                    description: data.description
                });
                setChannels(prev => [response.data, ...prev]);
            } else {
                const createData = {
                    url: data.url,
                    channel_id: data.channel_id,
                    title: data.title,
                    thumbnail: data.thumbnail,
                    description: data.description
                };
                if (data.memo) createData.memo = data.memo;
                if (data.tags && data.tags.length > 0) createData.tags = data.tags;
                const response = await videosApi.create(createData);
                if (!data.channel_id) {
                    setVideos(prev => [response.data, ...prev]);
                }
            }
            setShowMobileAddModal(false);
            setMobileAddPreview(null);
        } catch (error) {
            console.error('저장 오류:', error);
            toast.error(error.response?.data?.error || '저장에 실패했습니다.');
        }
    };

    // 클립보드에서 URL 등록 (모바일)
    const handleClipboardPaste = async () => {
        try {
            setClipboardLoading(true);
            const text = await navigator.clipboard.readText();
            if (!text.trim()) {
                toast.error('클립보드가 비어있습니다.');
                return;
            }
            // URL 유효성 체크
            try {
                new URL(text);
            } catch {
                toast.error('클립보드에 유효한 URL이 없습니다.');
                return;
            }
            // URL 파싱
            const response = await parseUrlApi.parse(text);
            setMobileAddPreview(response.data);
            setShowMobileAddModal(true);
        } catch (error) {
            console.error('클립보드 읽기 오류:', error);
            toast.error('클립보드를 읽을 수 없습니다. URL을 직접 입력해주세요.');
        } finally {
            setClipboardLoading(false);
        }
    };

    // UrlInput에서 미리보기 완료 후 모바일 모달 열기
    const handleUrlPreviewForMobile = (preview) => {
        setMobileAddPreview(preview);
        setShowMobileAddModal(true);
    };

    // 채널 클릭 처리
    const handleChannelClick = (channel) => {
        navigate(`/channel/${channel.id}`);
    };

    // 빠른 채널 URL 등록
    const handleQuickChannelAdd = async (url) => {
        // 먼저 메타데이터 파싱
        const parseResult = await parseUrlApi.parse(url);
        const parsed = parseResult.data;
        const response = await channelsApi.create({
            url,
            title: parsed.title,
            thumbnail: parsed.thumbnail,
            description: parsed.description
        });
        setChannels(prev => [response.data, ...prev]);
    };

    // 빠른 영상 URL 등록
    const handleQuickVideoAdd = async (url) => {
        // 먼저 메타데이터 파싱
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

    // 영상 업데이트 처리
    const handleVideoUpdate = (updatedVideo) => {
        setVideos(prev => prev.map(v => v.id === updatedVideo.id ? updatedVideo : v));
        setSelectedVideo(updatedVideo);
    };

    // 영상 삭제 처리
    const handleVideoDelete = (videoId) => {
        setVideos(prev => prev.filter(v => v.id !== videoId));
    };

    // 영상을 채널로 드래그앤드롭 이동
    const handleVideoDrop = async (video, channel) => {
        try {
            await videosApi.update(video.id, { channel_id: channel.id });
            setVideos(prev => prev.filter(v => v.id !== video.id));
            setChannels(prev => prev.map(c =>
                c.id === channel.id
                    ? { ...c, video_count: (c.video_count || 0) + 1 }
                    : c
            ));
        } catch (error) {
            console.error('영상 이동 오류:', error);
            toast.error('영상을 채널로 이동하는데 실패했습니다.');
        }
    };

    // 채널을 폴더로 드래그앤드롭 이동
    const handleChannelDropToFolder = async (channel, folder) => {
        try {
            await foldersApi.moveChannels(folder.id, [channel.id]);
            await loadData();
            toast.success(`${folder.name} 폴더로 이동했습니다.`);
        } catch (error) {
            console.error('채널 이동 오류:', error);
            toast.error('채널을 폴더로 이동하는데 실패했습니다.');
        }
    };

    // 영상을 폴더로 드래그앤드롭 이동
    const handleVideoDropToFolder = async (video, folder) => {
        try {
            await foldersApi.moveVideos(folder.id, [video.id]);
            setVideos(prev => prev.filter(v => v.id !== video.id));
            toast.success(`${folder.name} 폴더로 이동했습니다.`);
        } catch (error) {
            console.error('영상 이동 오류:', error);
            toast.error('영상을 폴더로 이동하는데 실패했습니다.');
        }
    };

    // 폴더 클릭 처리 (필터 탭으로 변경)
    const handleFolderTabClick = (folderId) => {
        setActiveFolder(folderId);
        setActiveChannel(null); // 폴더 변경 시 채널 필터 초기화
    };

    // 폴더 편집 처리
    const handleFolderEdit = (folder) => {
        setEditingFolder(folder);
        setShowFolderModal(true);
    };

    // 폴더 선택 토글
    const handleFolderSelect = (folderId) => {
        setSelectedFolders(prev => {
            const newSet = new Set(prev);
            if (newSet.has(folderId)) {
                newSet.delete(folderId);
            } else {
                newSet.add(folderId);
            }
            return newSet;
        });
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
        setSelectedFolders(new Set());
    };

    // 전역 URL 붙여넣기 처리
    const handleGlobalPaste = useCallback(async (url) => {
        try {
            // 먼저 메타데이터 파싱
            const parseResult = await parseUrlApi.parse(url);
            const parsed = parseResult.data;

            // URL 패턴에 따라 영상인지 채널인지 자동 판단
            // 영상 URL 패턴을 먼저 체크 (더 구체적)
            const isVideo =
                url.includes('/watch') ||           // YouTube 일반 영상
                url.includes('/shorts/') ||         // YouTube Shorts
                url.includes('youtu.be/') ||        // YouTube 단축 URL
                url.includes('/video/') ||          // TikTok 영상
                url.includes('/reel/') ||           // Instagram Reels
                url.includes('/p/') ||              // Instagram 포스트
                url.includes('tiktok.com/@') && url.includes('/video/');  // TikTok 영상 (유저포함)

            // 채널 URL 패턴 (영상이 아닌 경우에만)
            const isChannel = !isVideo && (
                url.includes('/@') ||               // YouTube/TikTok 채널
                url.includes('/channel/') ||        // YouTube 채널 ID
                url.includes('/c/') ||              // YouTube 커스텀 URL
                url.includes('/user/')              // YouTube 레거시 사용자
            );

            if (isChannel) {
                const response = await channelsApi.create({
                    url,
                    title: parsed.title,
                    thumbnail: parsed.thumbnail,
                    description: parsed.description
                });
                setChannels(prev => [response.data, ...prev]);
                toast.success('채널이 등록되었습니다.');
            } else {
                // 기본값은 영상으로 처리
                const response = await videosApi.create({
                    url,
                    title: parsed.title,
                    thumbnail: parsed.thumbnail,
                    description: parsed.description
                });
                setVideos(prev => [response.data, ...prev]);
                toast.success('영상이 등록되었습니다.');
            }
        } catch (error) {
            console.error('URL 등록 오류:', error);
            toast.error(error.response?.data?.error || 'URL 등록에 실패했습니다.');
        }
    }, [toast]);

    // 전역 붙여넣기 훅
    useGlobalPaste(handleGlobalPaste);

    // 키보드 단축키
    useKeyboardShortcuts([
        {
            key: 'Escape',
            action: () => {
                // 모달 닫기 우선
                if (folderDropdownOpen) {
                    setFolderDropdownOpen(false);
                } else if (channelDropdownOpen) {
                    setChannelDropdownOpen(false);
                } else if (showMobileAddModal) {
                    setShowMobileAddModal(false);
                    setMobileAddPreview(null);
                } else if (selectedVideo) {
                    setSelectedVideo(null);
                } else if (showFolderModal) {
                    setShowFolderModal(false);
                    setEditingFolder(null);
                } else if (showBatchTagModal) {
                    setShowBatchTagModal(false);
                } else if (showChannelUrlModal) {
                    setShowChannelUrlModal(false);
                } else if (showVideoUrlModal) {
                    setShowVideoUrlModal(false);
                } else if (selectionMode) {
                    // 선택 모드 해제
                    clearSelection();
                }
            },
            allowInInput: true
        },
        {
            key: 'k',
            ctrl: true,
            action: () => {
                searchInputRef.current?.focus();
            }
        },
        {
            key: '/',
            action: () => {
                searchInputRef.current?.focus();
            }
        },
        {
            key: 'Delete',
            action: () => {
                if (selectionMode) {
                    handleDeleteSelected();
                }
            }
        }
    ]);

    // 선택 항목 삭제
    const handleDeleteSelected = async () => {
        const folderCount = selectedFolders.size;
        const channelCount = selectedChannels.size;
        const videoCount = selectedVideos.size;

        if (folderCount === 0 && channelCount === 0 && videoCount === 0) return;

        const confirmMsg = [];
        if (folderCount > 0) confirmMsg.push(`폴더 ${folderCount}개`);
        if (channelCount > 0) confirmMsg.push(`채널 ${channelCount}개`);
        if (videoCount > 0) confirmMsg.push(`영상 ${videoCount}개`);

        const additionalMsg = folderCount > 0 ? '\n(폴더 내 채널은 미분류로 이동됩니다)' : '';
        if (!confirm(`${confirmMsg.join(', ')}를 삭제하시겠습니까?${additionalMsg}`)) return;

        try {
            for (const folderId of selectedFolders) {
                await foldersApi.delete(folderId);
            }
            for (const channelId of selectedChannels) {
                await channelsApi.delete(channelId);
            }
            for (const videoId of selectedVideos) {
                await videosApi.delete(videoId);
            }

            setFolders(prev => prev.filter(f => !selectedFolders.has(f.id)));
            setChannels(prev => prev.filter(c => !selectedChannels.has(c.id)));
            setVideos(prev => prev.filter(v => !selectedVideos.has(v.id)));
            clearSelection();
            toast.success('삭제되었습니다.');
        } catch (error) {
            console.error('삭제 오류:', error);
            toast.error('삭제 중 오류가 발생했습니다.');
        }
    };

    // 선택한 채널을 폴더로 이동
    const handleMoveChannelsToFolder = async (folderId) => {
        if (selectedChannels.size === 0) return;

        try {
            await foldersApi.moveChannels(folderId, Array.from(selectedChannels));
            await loadData();
            clearSelection();
            toast.success('채널을 폴더로 이동했습니다.');
        } catch (error) {
            console.error('폴더 이동 오류:', error);
            toast.error('폴더 이동 중 오류가 발생했습니다.');
        }
    };

    // 선택한 영상을 폴더로 이동
    const handleMoveVideosToFolder = async (folderId) => {
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

    // 선택한 영상을 채널로 이동
    const handleMoveVideosToChannel = async (channelId) => {
        if (selectedVideos.size === 0) return;

        try {
            const count = selectedVideos.size;
            for (const videoId of selectedVideos) {
                await videosApi.update(videoId, { channel_id: channelId });
            }
            setVideos(prev => prev.filter(v => !selectedVideos.has(v.id)));
            setChannels(prev => prev.map(c =>
                c.id === channelId
                    ? { ...c, video_count: (c.video_count || 0) + count }
                    : c
            ));
            clearSelection();
            toast.success('영상을 채널로 이동했습니다.');
        } catch (error) {
            console.error('채널 이동 오류:', error);
            toast.error('채널 이동 중 오류가 발생했습니다.');
        }
    };

    // 일괄 태그 추가
    const handleBatchTagApply = async (tags) => {
        try {
            for (const videoId of selectedVideos) {
                const video = videos.find(v => v.id === videoId);
                if (video) {
                    const existingTags = video.tags || [];
                    const newTags = [...new Set([...existingTags, ...tags])];
                    await videosApi.update(videoId, { tags: newTags });
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

    // 채널 썸네일 수정
    const handleUpdateThumbnail = async (channelId, thumbnailUrl) => {
        try {
            await channelsApi.update(channelId, { thumbnail: thumbnailUrl });
            setChannels(prev => prev.map(c =>
                c.id === channelId ? { ...c, thumbnail: thumbnailUrl } : c
            ));
            toast.success('썸네일이 수정되었습니다.');
        } catch (error) {
            console.error('썸네일 수정 오류:', error);
            toast.error('썸네일 수정 중 오류가 발생했습니다.');
        }
    };

    // 폴더 저장
    const handleSaveFolder = async (folderData) => {
        try {
            if (editingFolder) {
                await foldersApi.update(editingFolder.id, folderData);
            } else {
                await foldersApi.create(folderData);
            }
            await loadData();
            setShowFolderModal(false);
            setEditingFolder(null);
            toast.success(editingFolder ? '폴더가 수정되었습니다.' : '폴더가 생성되었습니다.');
        } catch (error) {
            console.error('폴더 저장 오류:', error);
            toast.error('폴더 저장에 실패했습니다.');
        }
    };

    // 폴더 삭제
    const handleDeleteFolder = async (folderId) => {
        if (!confirm('폴더를 삭제하시겠습니까? 폴더 내 채널은 미분류로 이동됩니다.')) return;

        try {
            await foldersApi.delete(folderId);
            if (activeFolder === folderId) {
                setActiveFolder(null);
            }
            await loadData();
            toast.success('폴더가 삭제되었습니다.');
        } catch (error) {
            console.error('폴더 삭제 오류:', error);
            toast.error('폴더 삭제에 실패했습니다.');
        }
    };

    // 현재 활성 폴더 이름 가져오기
    const getActiveFolderName = () => {
        if (activeFolder === null) return '전체';
        if (activeFolder === 'unfiled') return '미분류';
        const folder = folders.find(f => f.id === activeFolder);
        return folder?.name || '전체';
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* 헤더 */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-4">
                    {/* 모바일: 한 줄에 로고 + 검색 + 태그관리 */}
                    <div className="flex items-center gap-2">
                        <h1 className="text-lg sm:text-xl font-bold text-gray-900 flex-shrink-0">BenchBox</h1>
                        {/* 검색창 */}
                        <div className="relative flex-1">
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={`검색... (Ctrl+K)`}
                                className="w-full sm:w-64 pl-8 pr-3 py-2 sm:py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* 데스크탑/태블릿: URL 입력 */}
                    <div className="hidden sm:block mt-4">
                        <UrlInput
                            onSave={handleSaveUrl}
                            onPreview={handleUrlPreviewForMobile}
                            channels={channels}
                        />
                    </div>
                </div>

                {/* 선택 툴바 */}
                {selectionMode && (
                    <div className="bg-primary-500 text-white">
                        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                                <span className="font-medium">
                                    {selectedFolders.size + selectedChannels.size + selectedVideos.size}개 선택됨
                                </span>
                                <div className="flex flex-wrap items-center gap-2">
                                    {selectedFolders.size > 0 && (
                                        <span className="text-xs sm:text-sm opacity-80">폴더 {selectedFolders.size}개</span>
                                    )}
                                    {selectedChannels.size > 0 && (
                                        <span className="text-xs sm:text-sm opacity-80">채널 {selectedChannels.size}개</span>
                                    )}
                                    {selectedVideos.size > 0 && (
                                        <span className="text-xs sm:text-sm opacity-80">영상 {selectedVideos.size}개</span>
                                    )}
                                </div>
                                <span className="hidden sm:inline text-xs opacity-60">(ESC로 취소)</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                {/* 채널 폴더 이동 */}
                                {selectedChannels.size > 0 && (
                                    <select
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                handleMoveChannelsToFolder(e.target.value);
                                                e.target.value = '';
                                            }
                                        }}
                                        className="px-3 py-2 sm:py-1.5 text-sm bg-white/20 hover:bg-white/30 rounded-lg text-white border-0 cursor-pointer min-h-[44px] sm:min-h-0"
                                        defaultValue=""
                                    >
                                        <option value="" disabled>채널 → 폴더</option>
                                        <option value="null">미분류</option>
                                        {folders.map(folder => (
                                            <option key={folder.id} value={folder.id}>{folder.name}</option>
                                        ))}
                                    </select>
                                )}
                                {/* 영상 폴더 이동 */}
                                {selectedVideos.size > 0 && (
                                    <select
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                handleMoveVideosToFolder(e.target.value);
                                                e.target.value = '';
                                            }
                                        }}
                                        className="px-3 py-2 sm:py-1.5 text-sm bg-white/20 hover:bg-white/30 rounded-lg text-white border-0 cursor-pointer min-h-[44px] sm:min-h-0"
                                        defaultValue=""
                                    >
                                        <option value="" disabled>영상 → 폴더</option>
                                        {folders.map(folder => (
                                            <option key={folder.id} value={folder.id}>{folder.name}</option>
                                        ))}
                                    </select>
                                )}
                                {/* 영상 채널 이동 */}
                                {selectedVideos.size > 0 && channels.length > 0 && (
                                    <select
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                handleMoveVideosToChannel(e.target.value);
                                                e.target.value = '';
                                            }
                                        }}
                                        className="px-3 py-2 sm:py-1.5 text-sm bg-white/20 hover:bg-white/30 rounded-lg text-white border-0 cursor-pointer min-h-[44px] sm:min-h-0"
                                        defaultValue=""
                                    >
                                        <option value="" disabled>영상 → 채널</option>
                                        {channels.map(channel => (
                                            <option key={channel.id} value={channel.id}>{channel.title}</option>
                                        ))}
                                    </select>
                                )}
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

            <main className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-6">
                {/* 필터 바 */}
                <div className="mb-5">
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* 폴더 드롭다운 */}
                        <div className="relative">
                            <button
                                onClick={() => { setFolderDropdownOpen(!folderDropdownOpen); setChannelDropdownOpen(false); }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                                    activeFolder !== null
                                        ? 'bg-primary-500 text-white shadow-sm'
                                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                }`}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                </svg>
                                <span className="max-w-[120px] truncate">
                                    {activeFolder === null
                                        ? '전체 폴더'
                                        : activeFolder === 'unfiled'
                                            ? '미분류'
                                            : folders.find(f => f.id === activeFolder)?.name || '폴더'
                                    }
                                </span>
                                <svg className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${folderDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {folderDropdownOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setFolderDropdownOpen(false)} />

                                    {/* 데스크탑: 드롭다운 */}
                                    <div className="hidden sm:block absolute left-0 top-full mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 max-h-96 overflow-y-auto">
                                        {/* 전체 */}
                                        <button
                                            onClick={() => {
                                                setActiveFolder(null);
                                                setActiveChannel(null);
                                                setFolderDropdownOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors flex items-center gap-3 ${
                                                activeFolder === null ? 'bg-primary-50 text-primary-600 font-medium' : 'text-gray-700'
                                            }`}
                                        >
                                            <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                                                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                                </svg>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium">전체</div>
                                                <div className="text-xs text-gray-400">모든 폴더의 콘텐츠</div>
                                            </div>
                                        </button>

                                        <div className="border-t border-gray-100"></div>

                                        {folders.map(folder => (
                                            <div
                                                key={folder.id}
                                                className={`group w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors flex items-center gap-3 cursor-pointer ${
                                                    activeFolder === folder.id ? 'bg-primary-50 text-primary-700' : 'text-gray-700'
                                                }`}
                                                onClick={() => {
                                                    handleFolderTabClick(folder.id);
                                                    setActiveChannel(null);
                                                    setFolderDropdownOpen(false);
                                                }}
                                                onDragOver={(e) => {
                                                    e.preventDefault();
                                                    e.dataTransfer.dropEffect = 'move';
                                                    e.currentTarget.classList.add('bg-green-50');
                                                }}
                                                onDragLeave={(e) => {
                                                    e.currentTarget.classList.remove('bg-green-50');
                                                }}
                                                onDrop={(e) => {
                                                    e.preventDefault();
                                                    e.currentTarget.classList.remove('bg-green-50');
                                                    const channelData = e.dataTransfer.getData('channel');
                                                    if (channelData) {
                                                        handleChannelDropToFolder(JSON.parse(channelData), folder);
                                                        return;
                                                    }
                                                    const videoData = e.dataTransfer.getData('video');
                                                    if (videoData) {
                                                        handleVideoDropToFolder(JSON.parse(videoData), folder);
                                                    }
                                                }}
                                            >
                                                <div
                                                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                                                    style={{ backgroundColor: folder.color ? `${folder.color}20` : '#f3f4f6' }}
                                                >
                                                    <span
                                                        className="w-3 h-3 rounded-full"
                                                        style={{ backgroundColor: folder.color || '#9ca3af' }}
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium truncate">{folder.name}</div>
                                                    <div className="text-xs text-gray-400">
                                                        {folder.channel_count || 0}개 채널
                                                        {(folder.video_count || 0) > 0 && ` · ${folder.video_count}개 영상`}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleFolderEdit(folder);
                                                        setFolderDropdownOpen(false);
                                                    }}
                                                    className="p-1.5 rounded-lg hover:bg-gray-200 sm:opacity-0 sm:group-hover:opacity-100 transition-all text-gray-400 hover:text-gray-600"
                                                    title="폴더 수정"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}

                                        {/* 미분류 */}
                                        <button
                                            onClick={() => {
                                                handleFolderTabClick('unfiled');
                                                setActiveChannel(null);
                                                setFolderDropdownOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors flex items-center gap-3 ${
                                                activeFolder === 'unfiled' ? 'bg-gray-100 text-gray-800 font-medium' : 'text-gray-700'
                                            }`}
                                        >
                                            <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                                                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8" />
                                                </svg>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium">미분류</div>
                                                <div className="text-xs text-gray-400">폴더에 속하지 않은 항목</div>
                                            </div>
                                        </button>

                                        <div className="border-t border-gray-100 sticky bottom-0 bg-white">
                                            <button
                                                onClick={() => {
                                                    setEditingFolder(null);
                                                    setShowFolderModal(true);
                                                    setFolderDropdownOpen(false);
                                                }}
                                                className="w-full text-left px-4 py-3 text-sm text-primary-500 hover:bg-primary-50 transition-colors flex items-center gap-3"
                                            >
                                                <div className="w-9 h-9 bg-primary-50 rounded-full flex items-center justify-center flex-shrink-0">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                    </svg>
                                                </div>
                                                <span className="font-medium">새 폴더 만들기</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* 모바일: 바텀시트 */}
                                    <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[60vh] overflow-hidden flex flex-col animate-slide-up">
                                        <div className="flex justify-center py-3 flex-shrink-0">
                                            <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
                                        </div>
                                        <div className="px-4 pb-2 flex-shrink-0">
                                            <h3 className="text-base font-semibold text-gray-900">폴더 선택</h3>
                                            <p className="text-xs text-gray-400 mt-0.5">폴더를 선택하면 해당 폴더의 콘텐츠만 표시됩니다</p>
                                        </div>

                                        <div className="overflow-y-auto flex-1 pb-safe">
                                            <button
                                                onClick={() => {
                                                    setActiveFolder(null);
                                                    setActiveChannel(null);
                                                    setFolderDropdownOpen(false);
                                                }}
                                                className={`w-full text-left px-4 py-3.5 text-sm flex items-center gap-3 active:bg-gray-100 ${
                                                    activeFolder === null ? 'bg-primary-50 text-primary-600 font-medium' : 'text-gray-700'
                                                }`}
                                            >
                                                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                                                    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium">전체</div>
                                                    <div className="text-xs text-gray-400">모든 폴더의 콘텐츠</div>
                                                </div>
                                                {activeFolder === null && (
                                                    <svg className="w-5 h-5 text-primary-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                )}
                                            </button>

                                            <div className="border-t border-gray-100"></div>

                                            {folders.map(folder => (
                                                <div
                                                    key={folder.id}
                                                    onClick={() => {
                                                        handleFolderTabClick(folder.id);
                                                        setActiveChannel(null);
                                                        setFolderDropdownOpen(false);
                                                    }}
                                                    className={`w-full text-left px-4 py-3.5 text-sm flex items-center gap-3 active:bg-gray-100 cursor-pointer ${
                                                        activeFolder === folder.id ? 'bg-primary-50 text-primary-700' : 'text-gray-700'
                                                    }`}
                                                >
                                                    <div
                                                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                                                        style={{ backgroundColor: folder.color ? `${folder.color}20` : '#f3f4f6' }}
                                                    >
                                                        <span
                                                            className="w-4 h-4 rounded-full"
                                                            style={{ backgroundColor: folder.color || '#9ca3af' }}
                                                        />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-medium truncate">{folder.name}</div>
                                                        <div className="text-xs text-gray-400">
                                                            {folder.channel_count || 0}개 채널
                                                            {(folder.video_count || 0) > 0 && ` · ${folder.video_count}개 영상`}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleFolderEdit(folder);
                                                            setFolderDropdownOpen(false);
                                                        }}
                                                        className="p-2 rounded-lg active:bg-gray-200 text-gray-400"
                                                        title="폴더 수정"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                        </svg>
                                                    </button>
                                                    {activeFolder === folder.id && (
                                                        <svg className="w-5 h-5 text-primary-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    )}
                                                </div>
                                            ))}

                                            <button
                                                onClick={() => {
                                                    handleFolderTabClick('unfiled');
                                                    setActiveChannel(null);
                                                    setFolderDropdownOpen(false);
                                                }}
                                                className={`w-full text-left px-4 py-3.5 text-sm flex items-center gap-3 active:bg-gray-100 ${
                                                    activeFolder === 'unfiled' ? 'bg-gray-100 text-gray-800 font-medium' : 'text-gray-700'
                                                }`}
                                            >
                                                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                                                    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium">미분류</div>
                                                    <div className="text-xs text-gray-400">폴더에 속하지 않은 항목</div>
                                                </div>
                                                {activeFolder === 'unfiled' && (
                                                    <svg className="w-5 h-5 text-gray-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                )}
                                            </button>

                                            <div className="border-t border-gray-100">
                                                <button
                                                    onClick={() => {
                                                        setEditingFolder(null);
                                                        setShowFolderModal(true);
                                                        setFolderDropdownOpen(false);
                                                    }}
                                                    className="w-full text-left px-4 py-3.5 text-sm text-primary-500 flex items-center gap-3 active:bg-primary-50"
                                                >
                                                    <div className="w-10 h-10 bg-primary-50 rounded-full flex items-center justify-center flex-shrink-0">
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                        </svg>
                                                    </div>
                                                    <span className="font-medium">새 폴더 만들기</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* 채널 드롭다운 */}
                        <div className="relative">
                            <button
                                onClick={() => { setChannelDropdownOpen(!channelDropdownOpen); setFolderDropdownOpen(false); }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                                    activeChannel
                                        ? 'bg-emerald-500 text-white shadow-sm'
                                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                }`}
                            >
                                {activeChannel && channels.find(c => c.id === activeChannel)?.thumbnail ? (
                                    <img
                                        src={channels.find(c => c.id === activeChannel)?.thumbnail}
                                        alt=""
                                        className="w-5 h-5 rounded-full object-cover"
                                    />
                                ) : (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                )}
                                <span className="max-w-[120px] truncate">
                                    {activeChannel
                                        ? channels.find(c => c.id === activeChannel)?.title || '채널'
                                        : '전체 채널'
                                    }
                                </span>
                                <svg className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${channelDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {/* 데스크탑: absolute dropdown / 모바일: fixed 바텀시트 */}
                            {channelDropdownOpen && (
                                <>
                                    {/* 백드롭 */}
                                    <div className="fixed inset-0 z-40" onClick={() => setChannelDropdownOpen(false)} />

                                    {/* 데스크탑: 드롭다운 */}
                                    <div className="hidden sm:block absolute left-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 max-h-96 overflow-y-auto">
                                        {/* 전체 채널 */}
                                        <button
                                            onClick={() => {
                                                setActiveChannel(null);
                                                setChannelDropdownOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors flex items-center gap-3 ${
                                                !activeChannel ? 'bg-primary-50 text-primary-600 font-medium' : 'text-gray-700'
                                            }`}
                                        >
                                            <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                                                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                                </svg>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium">전체 채널</div>
                                                <div className="text-xs text-gray-400">{channels.length}개 채널의 영상 보기</div>
                                            </div>
                                        </button>

                                        <div className="border-t border-gray-100"></div>

                                        {channels.map(channel => (
                                            <button
                                                key={channel.id}
                                                onClick={() => {
                                                    setActiveChannel(channel.id);
                                                    setChannelDropdownOpen(false);
                                                }}
                                                className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors flex items-center gap-3 ${
                                                    activeChannel === channel.id ? 'bg-emerald-50 text-emerald-700' : 'text-gray-700'
                                                }`}
                                            >
                                                {channel.thumbnail ? (
                                                    <img
                                                        src={channel.thumbnail}
                                                        alt=""
                                                        className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                                                    />
                                                ) : (
                                                    <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                                                        <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                        </svg>
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium truncate">{channel.title}</div>
                                                    {channel.description && (
                                                        <div className="text-xs text-gray-400 truncate">{channel.description}</div>
                                                    )}
                                                </div>
                                                <span className="text-xs text-gray-400 flex-shrink-0">
                                                    {channel.video_count || 0}개
                                                </span>
                                            </button>
                                        ))}

                                        {channels.length === 0 && (
                                            <div className="px-4 py-8 text-center text-sm text-gray-400">
                                                등록된 채널이 없습니다
                                            </div>
                                        )}

                                        <div className="border-t border-gray-100 sticky bottom-0 bg-white">
                                            <button
                                                onClick={() => {
                                                    setShowChannelUrlModal(true);
                                                    setChannelDropdownOpen(false);
                                                }}
                                                className="w-full text-left px-4 py-3 text-sm text-primary-500 hover:bg-primary-50 transition-colors flex items-center gap-3"
                                            >
                                                <div className="w-9 h-9 bg-primary-50 rounded-full flex items-center justify-center flex-shrink-0">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                    </svg>
                                                </div>
                                                <span className="font-medium">새 채널 추가</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* 모바일: 바텀시트 */}
                                    <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[60vh] overflow-hidden flex flex-col animate-slide-up">
                                        {/* 드래그 핸들 */}
                                        <div className="flex justify-center py-3 flex-shrink-0">
                                            <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
                                        </div>
                                        <div className="px-4 pb-2 flex-shrink-0">
                                            <h3 className="text-base font-semibold text-gray-900">채널 선택</h3>
                                            <p className="text-xs text-gray-400 mt-0.5">채널을 선택하면 해당 채널의 영상만 표시됩니다</p>
                                        </div>

                                        <div className="overflow-y-auto flex-1 pb-safe">
                                            {/* 전체 채널 */}
                                            <button
                                                onClick={() => {
                                                    setActiveChannel(null);
                                                    setChannelDropdownOpen(false);
                                                }}
                                                className={`w-full text-left px-4 py-3.5 text-sm flex items-center gap-3 active:bg-gray-100 ${
                                                    !activeChannel ? 'bg-primary-50 text-primary-600 font-medium' : 'text-gray-700'
                                                }`}
                                            >
                                                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                                                    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium">전체 채널</div>
                                                    <div className="text-xs text-gray-400">{channels.length}개 채널의 영상 보기</div>
                                                </div>
                                                {!activeChannel && (
                                                    <svg className="w-5 h-5 text-primary-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                )}
                                            </button>

                                            <div className="border-t border-gray-100"></div>

                                            {channels.map(channel => (
                                                <button
                                                    key={channel.id}
                                                    onClick={() => {
                                                        setActiveChannel(channel.id);
                                                        setChannelDropdownOpen(false);
                                                    }}
                                                    className={`w-full text-left px-4 py-3.5 text-sm flex items-center gap-3 active:bg-gray-100 ${
                                                        activeChannel === channel.id ? 'bg-emerald-50 text-emerald-700' : 'text-gray-700'
                                                    }`}
                                                >
                                                    {channel.thumbnail ? (
                                                        <img
                                                            src={channel.thumbnail}
                                                            alt=""
                                                            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                                                            <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                            </svg>
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-medium truncate">{channel.title}</div>
                                                        {channel.description && (
                                                            <div className="text-xs text-gray-400 line-clamp-1">{channel.description}</div>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        <span className="text-xs text-gray-400">{channel.video_count || 0}개</span>
                                                        {activeChannel === channel.id && (
                                                            <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                </button>
                                            ))}

                                            {channels.length === 0 && (
                                                <div className="px-4 py-10 text-center text-sm text-gray-400">
                                                    등록된 채널이 없습니다
                                                </div>
                                            )}

                                            <div className="border-t border-gray-100">
                                                <button
                                                    onClick={() => {
                                                        setShowChannelUrlModal(true);
                                                        setChannelDropdownOpen(false);
                                                    }}
                                                    className="w-full text-left px-4 py-3.5 text-sm text-primary-500 flex items-center gap-3 active:bg-primary-50"
                                                >
                                                    <div className="w-10 h-10 bg-primary-50 rounded-full flex items-center justify-center flex-shrink-0">
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                        </svg>
                                                    </div>
                                                    <span className="font-medium">새 채널 추가</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* 활성 채널 필터 칩 (해제 가능) */}
                        {activeChannel && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-medium">
                                {channels.find(c => c.id === activeChannel)?.title}
                                <button onClick={() => setActiveChannel(null)} className="hover:text-emerald-800 ml-0.5">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </span>
                        )}

                        {/* 활성 폴더 필터 칩 */}
                        {activeFolder !== null && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-50 text-primary-600 rounded-full text-xs font-medium">
                                {activeFolder === 'unfiled' ? '미분류' : folders.find(f => f.id === activeFolder)?.name}
                                <button onClick={() => setActiveFolder(null)} className="hover:text-primary-800 ml-0.5">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </span>
                        )}

                        {/* 구분선 (필터 활성시) */}
                        {(activeFolder !== null || activeChannel !== null) && (
                            <button
                                onClick={() => { setActiveFolder(null); setActiveChannel(null); }}
                                className="text-xs text-gray-400 hover:text-gray-600 ml-1"
                            >
                                초기화
                            </button>
                        )}

                        {/* 정렬 드롭다운 - 우측 끝 */}
                        <div className="ml-auto">
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                            >
                                <option value="newest">최신순</option>
                                <option value="oldest">오래된순</option>
                                <option value="title">제목순</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* 영상 섹션 */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <span>
                                    {activeChannel
                                        ? channels.find(c => c.id === activeChannel)?.title
                                        : showUnassignedOnly ? '미분류 영상' : '저장한 영상'}
                                </span>
                                <span className="text-xs sm:text-sm font-normal text-gray-500">
                                    {videos.length}개
                                </span>
                            </h2>
                            {/* 숏폼/롱폼 필터 */}
                            <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                                <button
                                    onClick={() => setDurationFilter('all')}
                                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                                        durationFilter === 'all'
                                            ? 'bg-white text-gray-900 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    전체
                                </button>
                                <button
                                    onClick={() => setDurationFilter('short')}
                                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                                        durationFilter === 'short'
                                            ? 'bg-white text-gray-900 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    숏폼
                                </button>
                                <button
                                    onClick={() => setDurationFilter('long')}
                                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                                        durationFilter === 'long'
                                            ? 'bg-white text-gray-900 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    롱폼
                                </button>
                            </div>
                        </div>
                        {/* 데스크탑: 추가 버튼 */}
                        <div className="hidden sm:flex items-center gap-2">
                            <button
                                onClick={() => {
                                    setEditingFolder(null);
                                    setShowFolderModal(true);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                                </svg>
                                폴더
                            </button>
                            <button
                                onClick={() => setShowChannelUrlModal(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                </svg>
                                채널
                            </button>
                        </div>
                    </div>

                    {/* 영상 그리드 */}
                    {(() => {
                        const filteredVideos = durationFilter === 'all'
                            ? videos
                            : durationFilter === 'short'
                                ? videos.filter(v => isShortForm(v))
                                : videos.filter(v => !isShortForm(v));
                        return loading ? (
                            <VideoGridSkeleton count={10} />
                        ) : filteredVideos.length > 0 ? (
                        <div className="columns-3 md:columns-4 lg:columns-5 gap-2 sm:gap-4 space-y-2 sm:space-y-4">
                            {filteredVideos.map(video => (
                                <div key={video.id} className="break-inside-avoid">
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
                    ) : (
                        <div className="text-center py-12">
                            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <p className="text-gray-500 mb-4">
                                {durationFilter !== 'all'
                                    ? `${durationFilter === 'short' ? '숏폼' : '롱폼'} 영상이 없습니다`
                                    : '저장된 영상이 없습니다'
                                }
                            </p>
                            {durationFilter !== 'all' ? (
                                <button
                                    onClick={() => setDurationFilter('all')}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                                >
                                    전체 보기
                                </button>
                            ) : (
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
                    );
                    })()}
                </section>
            </main>

            {/* FAB 메뉴 */}
            <FABMenu
                onClipboardPaste={handleClipboardPaste}
                onAddVideo={() => setShowVideoUrlModal(true)}
                onAddChannel={() => setShowChannelUrlModal(true)}
                onAddFolder={() => {
                    setEditingFolder(null);
                    setShowFolderModal(true);
                }}
                onOpenTagManager={() => setShowTagManager(true)}
                onToggleSelectionMode={() => {
                    if (selectionMode) {
                        setSelectedChannels(new Set());
                        setSelectedVideos(new Set());
                        setSelectedFolders(new Set());
                    } else {
                        setSelectionMode(true);
                    }
                }}
                onOpenSettings={() => setShowApiSettings(true)}
                hidden={!!selectedVideo || showFolderModal || showBatchTagModal || showChannelUrlModal || showVideoUrlModal || showTagManager || showMobileAddModal || showApiSettings}
            />

            {/* 영상 상세 모달 */}
            {selectedVideo && (
                <VideoModal
                    video={selectedVideo}
                    onClose={() => setSelectedVideo(null)}
                    onUpdate={handleVideoUpdate}
                    onDelete={handleVideoDelete}
                />
            )}

            {/* 폴더 생성/수정 모달 */}
            {showFolderModal && (
                <FolderModal
                    folder={editingFolder}
                    onSave={handleSaveFolder}
                    onClose={() => {
                        setShowFolderModal(false);
                        setEditingFolder(null);
                    }}
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

            {/* 태그 관리 모달 */}
            <TagManagerModal
                isOpen={showTagManager}
                onClose={() => setShowTagManager(false)}
            />

            {/* API 키 설정 모달 */}
            <ApiKeySettingsModal
                isOpen={showApiSettings}
                onClose={() => setShowApiSettings(false)}
            />

            {/* 모바일 추가 모달 */}
            {showMobileAddModal && mobileAddPreview && (
                <MobileAddModal
                    preview={mobileAddPreview}
                    channels={channels}
                    onSave={handleSaveUrl}
                    onClose={() => {
                        setShowMobileAddModal(false);
                        setMobileAddPreview(null);
                    }}
                />
            )}
        </div>
    );
};

export default Home;
