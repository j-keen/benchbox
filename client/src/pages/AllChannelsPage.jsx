import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { channelsApi, foldersApi, parseUrlApi } from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import ChannelCard, { AddChannelCard } from '../components/ChannelCard';
import QuickUrlModal from '../components/QuickUrlModal';
import NavigationTabs from '../components/NavigationTabs';
import { getPlatformName } from '../utils/platformIcons';

const AllChannelsPage = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const [channels, setChannels] = useState([]);
    const [folders, setFolders] = useState([]);
    const [loading, setLoading] = useState(true);

    // 필터 상태
    const [filterPlatform, setFilterPlatform] = useState('all');
    const [filterFolder, setFilterFolder] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // 모달 상태
    const [showAddModal, setShowAddModal] = useState(false);

    // 선택 상태
    const [selectedChannels, setSelectedChannels] = useState(new Set());
    const selectionMode = selectedChannels.size > 0;

    useEffect(() => {
        loadData();
    }, [filterPlatform, filterFolder, searchQuery]);

    const loadData = async () => {
        try {
            setLoading(true);
            const params = {};
            if (filterPlatform !== 'all') params.platform = filterPlatform;
            if (filterFolder !== 'all') {
                if (filterFolder === 'unfiled') {
                    params.folder_id = 'null';
                } else {
                    params.folder_id = filterFolder;
                }
            }
            if (searchQuery) params.search = searchQuery;

            const [channelsRes, foldersRes] = await Promise.all([
                channelsApi.getAll(params),
                foldersApi.getAll()
            ]);

            setChannels(channelsRes.data.channels || []);
            setFolders(foldersRes.data.folders || []);
        } catch (error) {
            console.error('데이터 로드 오류:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChannelClick = (channel) => {
        navigate(`/channel/${channel.id}`);
    };

    const handleQuickAdd = async (url) => {
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

    const clearSelection = () => {
        setSelectedChannels(new Set());
    };

    const handleDeleteSelected = async () => {
        if (!confirm(`${selectedChannels.size}개 채널을 삭제하시겠습니까?`)) return;

        try {
            for (const channelId of selectedChannels) {
                await channelsApi.delete(channelId);
            }
            setChannels(prev => prev.filter(c => !selectedChannels.has(c.id)));
            clearSelection();
            toast.success('삭제되었습니다.');
        } catch (error) {
            console.error('삭제 오류:', error);
            toast.error('삭제 중 오류가 발생했습니다.');
        }
    };

    const handleMoveToFolder = async (folderId) => {
        if (selectedChannels.size === 0) return;

        try {
            await foldersApi.moveChannels(folderId, Array.from(selectedChannels));
            await loadData();
            clearSelection();
            toast.success('폴더로 이동했습니다.');
        } catch (error) {
            console.error('폴더 이동 오류:', error);
            toast.error('폴더 이동 중 오류가 발생했습니다.');
        }
    };

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

    return (
        <div className="min-h-screen bg-gray-50">
            {/* 네비게이션 탭 */}
            <NavigationTabs />

            {/* 헤더 */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-2 sm:gap-4">
                            <h1 className="text-xl font-bold text-gray-900">전체 채널</h1>
                            <span className="text-xs sm:text-sm text-gray-500">{channels.length}개</span>
                        </div>

                        {/* 채널 추가 버튼 + 검색창 */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 text-sm bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors min-h-[44px] sm:min-h-0"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                </svg>
                                채널 추가
                            </button>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="채널 검색..."
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
                            value={filterPlatform}
                            onChange={(e) => setFilterPlatform(e.target.value)}
                            className="text-sm border border-gray-200 rounded-lg px-3 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0"
                        >
                            <option value="all">전체 플랫폼</option>
                            <option value="youtube">{getPlatformName('youtube')}</option>
                            <option value="tiktok">{getPlatformName('tiktok')}</option>
                            <option value="instagram">{getPlatformName('instagram')}</option>
                        </select>

                        <select
                            value={filterFolder}
                            onChange={(e) => setFilterFolder(e.target.value)}
                            className="text-sm border border-gray-200 rounded-lg px-3 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0"
                        >
                            <option value="all">전체 폴더</option>
                            <option value="unfiled">미분류</option>
                            {folders.map(folder => (
                                <option key={folder.id} value={folder.id}>{folder.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* 선택 툴바 */}
                {selectionMode && (
                    <div className="bg-primary-500 text-white">
                        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <span className="font-medium">{selectedChannels.size}개 선택됨</span>
                            <div className="flex flex-wrap items-center gap-2">
                                <select
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            handleMoveToFolder(e.target.value);
                                            e.target.value = '';
                                        }
                                    }}
                                    className="px-3 py-2 sm:py-1.5 text-sm bg-white/20 hover:bg-white/30 rounded-lg text-white border-0 min-h-[44px] sm:min-h-0"
                                    defaultValue=""
                                >
                                    <option value="" disabled>폴더로 이동</option>
                                    <option value="null">미분류</option>
                                    {folders.map(folder => (
                                        <option key={folder.id} value={folder.id}>{folder.name}</option>
                                    ))}
                                </select>
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
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {/* 채널 추가 카드 */}
                        <AddChannelCard onClick={() => setShowAddModal(true)} />

                        {/* 채널 카드들 */}
                        {channels.map(channel => (
                            <ChannelCard
                                key={channel.id}
                                channel={channel}
                                onClick={handleChannelClick}
                                isSelected={selectedChannels.has(channel.id)}
                                onSelect={handleChannelSelect}
                                selectionMode={selectionMode}
                                onUpdateThumbnail={handleUpdateThumbnail}
                            />
                        ))}
                    </div>
                )}

                {!loading && channels.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <p>등록된 채널이 없습니다</p>
                    </div>
                )}
            </main>

            {/* 채널 추가 모달 */}
            {showAddModal && (
                <QuickUrlModal
                    title="채널 추가"
                    placeholder="채널 URL 붙여넣기..."
                    onSubmit={handleQuickAdd}
                    onClose={() => setShowAddModal(false)}
                />
            )}
        </div>
    );
};

export default AllChannelsPage;
