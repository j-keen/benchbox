import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { videosApi, channelsApi, tagsApi, foldersApi, parseUrlApi } from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import { useGlobalPaste } from '../hooks/useKeyboardShortcuts';
import VideoCard from '../components/VideoCard';
import UrlInput from '../components/UrlInput';
import VideoModal from '../components/VideoModal';
import { getPlatformIcon, getPlatformColor, getPlatformName } from '../utils/platformIcons';

const ChannelDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const toast = useToast();

    // 상태
    const [channel, setChannel] = useState(null);
    const [videos, setVideos] = useState([]);
    const [allChannels, setAllChannels] = useState([]);
    const [allTags, setAllTags] = useState([]);
    const [folders, setFolders] = useState([]);
    const [channelTags, setChannelTags] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [editingMemo, setEditingMemo] = useState(false);
    const [memoText, setMemoText] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // 태그 편집 상태
    const [editingTags, setEditingTags] = useState(false);
    const [tagInput, setTagInput] = useState('');
    const [tagSuggestions, setTagSuggestions] = useState([]);

    // 모바일 접기 상태
    const [showDetails, setShowDetails] = useState(false);

    // 필터 상태
    const [sortBy, setSortBy] = useState('newest');
    const [filterTag, setFilterTag] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // 선택 상태
    const [selectedVideos, setSelectedVideos] = useState(new Set());
    const [selectionMode, setSelectionMode] = useState(false);

    // 선택 모드 토글
    useEffect(() => {
        if (selectedVideos.size > 0) {
            setSelectionMode(true);
        } else {
            setSelectionMode(false);
        }
    }, [selectedVideos]);

    // 데이터 로드
    useEffect(() => {
        loadData();
    }, [id, sortBy, filterTag, searchQuery]);

    const loadData = async () => {
        try {
            setLoading(true);

            const [channelRes, videosRes, allChannelsRes, tagsRes, foldersRes, channelTagsRes] = await Promise.all([
                channelsApi.getById(id),
                videosApi.getAll({
                    channel_id: id,
                    sort: sortBy,
                    tag: filterTag || undefined,
                    search: searchQuery || undefined
                }),
                channelsApi.getAll(),
                tagsApi.getAll(),
                foldersApi.getAll(),
                tagsApi.getChannelTags(id)
            ]);

            setChannel(channelRes.data);
            setMemoText(channelRes.data.memo || '');
            setVideos(videosRes.data.videos || []);
            setAllChannels(allChannelsRes.data.channels || []);
            setAllTags(tagsRes.data.tags || []);
            setFolders(foldersRes.data.folders || []);
            setChannelTags(channelTagsRes.data.tags || []);
        } catch (error) {
            console.error('데이터 로드 오류:', error);
            navigate('/');
        } finally {
            setLoading(false);
        }
    };

    // URL 저장 처리
    const handleSaveUrl = async (data) => {
        try {
            const parseResult = await parseUrlApi.parse(data.url);
            const parsed = parseResult.data;

            if (data.isChannel) {
                await channelsApi.create({
                    url: data.url,
                    title: parsed.title,
                    thumbnail: parsed.thumbnail,
                    description: parsed.description
                });
                navigate('/');
            } else {
                const response = await videosApi.create({
                    url: data.url,
                    channel_id: data.channel_id || parseInt(id),
                    title: parsed.title,
                    thumbnail: parsed.thumbnail,
                    description: parsed.description
                });

                if (data.channel_id === parseInt(id) || !data.channel_id) {
                    setVideos(prev => [response.data, ...prev]);
                }
            }
            toast.success('저장되었습니다.');
        } catch (error) {
            console.error('저장 오류:', error);
            toast.error(error.response?.data?.error || '저장에 실패했습니다.');
        }
    };

    // 채널 메모 저장
    const handleSaveMemo = async () => {
        try {
            await channelsApi.update(id, { memo: memoText });
            setChannel(prev => ({ ...prev, memo: memoText }));
            setEditingMemo(false);
        } catch (error) {
            console.error('메모 저장 오류:', error);
        }
    };

    // 채널 삭제
    const handleDeleteChannel = async () => {
        try {
            await channelsApi.delete(id);
            navigate('/');
        } catch (error) {
            console.error('채널 삭제 오류:', error);
        }
    };

    // 폴더 변경
    const handleFolderChange = async (folderId) => {
        try {
            await channelsApi.update(id, { folder_id: folderId === '' ? null : folderId });
            const updatedChannel = await channelsApi.getById(id);
            setChannel(updatedChannel.data);
        } catch (error) {
            console.error('폴더 변경 오류:', error);
        }
    };

    // 태그 자동완성
    const handleTagInputChange = async (e) => {
        const value = e.target.value;
        setTagInput(value);

        if (value.length > 0) {
            try {
                const res = await tagsApi.autocomplete(value);
                setTagSuggestions(res.data.suggestions.filter(s => !channelTags.includes(s)));
            } catch (error) {
                console.error('태그 자동완성 오류:', error);
            }
        } else {
            setTagSuggestions([]);
        }
    };

    // 태그 추가
    const addTag = (tagName) => {
        const trimmed = tagName.trim();
        if (trimmed && !channelTags.includes(trimmed)) {
            setChannelTags(prev => [...prev, trimmed]);
        }
        setTagInput('');
        setTagSuggestions([]);
    };

    // 태그 제거
    const removeTag = (tagName) => {
        setChannelTags(prev => prev.filter(t => t !== tagName));
    };

    // 태그 저장
    const handleSaveTags = async () => {
        try {
            await tagsApi.updateChannelTags(id, channelTags);
            setEditingTags(false);
        } catch (error) {
            console.error('태그 저장 오류:', error);
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
        setSelectedVideos(new Set());
    };

    // 선택 항목 삭제
    const handleDeleteSelected = async () => {
        const videoCount = selectedVideos.size;
        if (videoCount === 0) return;

        if (!confirm(`영상 ${videoCount}개를 삭제하시겠습니까?`)) return;

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

    // 전역 URL 붙여넣기 처리 (이 채널에 영상으로 저장)
    const handleGlobalPaste = useCallback(async (url) => {
        try {
            const parseResult = await parseUrlApi.parse(url);
            const parsed = parseResult.data;
            // 채널 페이지에서는 이 채널에 영상으로 저장
            const response = await videosApi.create({
                url,
                channel_id: parseInt(id),
                title: parsed.title,
                thumbnail: parsed.thumbnail,
                description: parsed.description
            });
            setVideos(prev => [response.data, ...prev]);
            toast.success('영상이 등록되었습니다.');
        } catch (error) {
            console.error('URL 등록 오류:', error);
            toast.error(error.response?.data?.error || 'URL 등록에 실패했습니다.');
        }
    }, [id, toast]);

    // 전역 붙여넣기 훅
    useGlobalPaste(handleGlobalPaste);

    // 원본 채널 열기
    const openOriginalChannel = () => {
        if (channel?.url) {
            window.open(channel.url, '_blank');
        }
    };

    if (loading || !channel) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const PlatformIcon = getPlatformIcon(channel.platform);
    const platformColor = getPlatformColor(channel.platform);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* 헤더 */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/')}
                            className="p-1 text-gray-500 hover:text-gray-700"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <h1 className="text-xl font-bold text-gray-900">BenchBox</h1>
                    </div>

                    {/* URL 입력 */}
                    <div className="mt-4">
                        <UrlInput
                            onSave={handleSaveUrl}
                            currentChannelId={parseInt(id)}
                            channels={allChannels}
                        />
                    </div>
                </div>

                {/* 선택 툴바 */}
                {selectionMode && (
                    <div className="bg-primary-500 text-white">
                        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex items-center gap-2 sm:gap-4">
                                <span className="font-medium">
                                    {selectedVideos.size}개 선택됨
                                </span>
                                <span className="hidden sm:inline text-xs opacity-60">(ESC로 취소)</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
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
                {/* 채널 정보 섹션 - 모바일 컴팩트 */}
                <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-6">
                    {/* 모바일: 한줄로 압축, 데스크톱: 기존 레이아웃 */}
                    <div className="flex items-start gap-3 sm:gap-4">
                        {/* 채널 썸네일 */}
                        <div className="flex-shrink-0 w-12 h-12 sm:w-20 sm:h-20 bg-gray-100 rounded-lg overflow-hidden">
                            {channel.thumbnail ? (
                                <img
                                    src={channel.thumbnail}
                                    alt={channel.title}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    <svg className="w-6 h-6 sm:w-10 sm:h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                            )}
                        </div>

                        {/* 채널 정보 - 모바일 압축 */}
                        <div className="flex-1 min-w-0">
                            {/* 제목 + 플랫폼 (한줄) */}
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="text-base sm:text-xl font-semibold text-gray-900 truncate">
                                    {channel.title || 'Untitled'}
                                </h2>
                                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] sm:text-xs ${platformColor}`}>
                                    <PlatformIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                    <span className="hidden sm:inline">{getPlatformName(channel.platform)}</span>
                                </span>
                            </div>

                            {/* 영상수 + 폴더 + 채널열기 (한줄) */}
                            <div className="mt-1 flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-500 flex-wrap">
                                <span>{channel.video_count || 0}개 영상</span>
                                <span className="text-gray-300">|</span>
                                <select
                                    value={channel.folder_id || ''}
                                    onChange={(e) => handleFolderChange(e.target.value)}
                                    className="text-xs border-0 bg-transparent p-0 pr-4 text-gray-500 focus:ring-0 cursor-pointer"
                                >
                                    <option value="">미분류</option>
                                    {folders.map(folder => (
                                        <option key={folder.id} value={folder.id}>{folder.name}</option>
                                    ))}
                                </select>
                                <button
                                    onClick={openOriginalChannel}
                                    className="text-primary-600 hover:text-primary-700 inline-flex items-center gap-0.5"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                    <span className="hidden sm:inline">채널 열기</span>
                                </button>
                            </div>
                        </div>

                        {/* 삭제 버튼 - 모바일에서는 아이콘만 */}
                        <div className="flex-shrink-0">
                            {!showDeleteConfirm ? (
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    title="채널 삭제"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            ) : (
                                <div className="flex items-center gap-1 px-2 py-1 bg-red-50 rounded-lg">
                                    <button
                                        onClick={handleDeleteChannel}
                                        className="text-xs font-medium text-red-600 hover:text-red-700 px-2 py-1"
                                    >
                                        삭제
                                    </button>
                                    <button
                                        onClick={() => setShowDeleteConfirm(false)}
                                        className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
                                    >
                                        취소
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 모바일: 상세 정보 펼치기 버튼 */}
                    <button
                        onClick={() => setShowDetails(!showDetails)}
                        className="sm:hidden mt-3 w-full flex items-center justify-center gap-1 py-2 text-xs text-gray-500 hover:text-gray-700 border-t border-gray-100"
                    >
                        <span>{showDetails ? '접기' : '태그/메모 보기'}</span>
                        <svg className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {/* 태그/메모 - 모바일에서는 숨김, PC에서는 항상 표시 */}
                    <div className={`${showDetails ? 'block' : 'hidden'} sm:block`}>
                        {/* 태그 */}
                        <div className="mt-4 pt-4 border-t border-gray-100">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-xs sm:text-sm font-medium text-gray-700">태그</h3>
                                {!editingTags && (
                                    <button
                                        onClick={() => setEditingTags(true)}
                                        className="text-xs sm:text-sm text-primary-600 hover:text-primary-700"
                                    >
                                        편집
                                    </button>
                                )}
                            </div>

                            {editingTags ? (
                                <div>
                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                        {channelTags.map((tag) => (
                                            <span
                                                key={tag}
                                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-50 text-primary-700 rounded-full text-xs"
                                            >
                                                #{tag}
                                                <button
                                                    onClick={() => removeTag(tag)}
                                                    className="hover:text-primary-900"
                                                >
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={tagInput}
                                            onChange={handleTagInputChange}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && tagInput.trim()) {
                                                    e.preventDefault();
                                                    addTag(tagInput);
                                                }
                                            }}
                                            placeholder="태그 입력 후 Enter"
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                        />
                                        {tagSuggestions.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                                                {tagSuggestions.map((suggestion) => (
                                                    <button
                                                        key={suggestion}
                                                        onClick={() => addTag(suggestion)}
                                                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                                                    >
                                                        #{suggestion}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-2 flex justify-end gap-2">
                                        <button
                                            onClick={() => {
                                                setEditingTags(false);
                                                loadData();
                                            }}
                                            className="px-3 py-1 text-xs text-gray-600 hover:text-gray-900"
                                        >
                                            취소
                                        </button>
                                        <button
                                            onClick={handleSaveTags}
                                            className="px-3 py-1 text-xs text-white bg-primary-500 hover:bg-primary-600 rounded"
                                        >
                                            저장
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-wrap gap-1.5">
                                    {channelTags.length > 0 ? (
                                        channelTags.map((tag) => (
                                            <span
                                                key={tag}
                                                className="px-2 py-0.5 bg-primary-50 text-primary-700 rounded-full text-xs"
                                            >
                                                #{tag}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-xs text-gray-400 italic">태그 없음</span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 메모 */}
                        <div className="mt-4 pt-4 border-t border-gray-100">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-xs sm:text-sm font-medium text-gray-700">메모</h3>
                                {!editingMemo && (
                                    <button
                                        onClick={() => setEditingMemo(true)}
                                        className="text-xs sm:text-sm text-primary-600 hover:text-primary-700"
                                    >
                                        편집
                                    </button>
                                )}
                            </div>

                            {editingMemo ? (
                                <div>
                                    <textarea
                                        value={memoText}
                                        onChange={(e) => setMemoText(e.target.value)}
                                        placeholder="이 채널에 대한 메모를 작성하세요..."
                                        className="w-full h-24 sm:h-32 p-3 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                                    />
                                    <div className="mt-2 flex justify-end gap-2">
                                        <button
                                            onClick={() => {
                                                setMemoText(channel.memo || '');
                                                setEditingMemo(false);
                                            }}
                                            className="px-3 py-1 text-xs text-gray-600 hover:text-gray-900"
                                        >
                                            취소
                                        </button>
                                        <button
                                            onClick={handleSaveMemo}
                                            className="px-3 py-1 text-xs text-white bg-primary-500 hover:bg-primary-600 rounded"
                                        >
                                            저장
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-xs sm:text-sm text-gray-600 whitespace-pre-wrap">
                                    {channel.memo || <span className="text-gray-400 italic">메모 없음</span>}
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* 영상 목록 섹션 */}
                <section>
                    <div className="flex flex-col gap-3 mb-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <span>이 채널의 영상</span>
                                <span className="text-sm font-normal text-gray-500">
                                    {videos.length}개
                                </span>
                            </h2>

                            {/* 정렬 */}
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

                        {/* 검색창 */}
                        <div className="relative">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="이 채널에서 검색... (제목, 메모, 태그)"
                                className="w-full pl-9 pr-8 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

                    {/* 영상 그리드 - Masonry 레이아웃 */}
                    {videos.length > 0 ? (
                        <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4 space-y-4">
                            {videos.map(video => (
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
                        <div className="text-center py-12 text-gray-500">
                            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <p>이 채널에 저장된 영상이 없습니다.</p>
                            <p className="text-sm mt-1">상단에 URL을 붙여넣어 영상을 추가하세요!</p>
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
        </div>
    );
};

export default ChannelDetail;
