import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { foldersApi, channelsApi } from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import NavigationTabs from '../components/NavigationTabs';
import ChannelCard from '../components/ChannelCard';

const BrowsePage = () => {
    const [folders, setFolders] = useState([]);
    const [channels, setChannels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedFolders, setExpandedFolders] = useState(new Set());
    const toast = useToast();
    const navigate = useNavigate();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [foldersData, channelsData] = await Promise.all([
                foldersApi.getAll(),
                channelsApi.getAll()
            ]);
            setFolders(foldersData?.data?.folders || []);
            setChannels(channelsData?.data?.channels || []);
        } catch (error) {
            console.error('데이터 로딩 오류:', error);
            toast.error('데이터를 불러오는 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const toggleFolder = (folderId) => {
        setExpandedFolders(prev => {
            const next = new Set(prev);
            if (next.has(folderId)) {
                next.delete(folderId);
            } else {
                next.add(folderId);
            }
            return next;
        });
    };

    const handleChannelClick = (channel) => {
        navigate(`/channel/${channel.id}`);
    };

    // Group channels by folder
    const channelsByFolder = channels.reduce((acc, channel) => {
        const folderId = channel.folder_id || 'unfiled';
        if (!acc[folderId]) {
            acc[folderId] = [];
        }
        acc[folderId].push(channel);
        return acc;
    }, {});

    // Calculate total video count for each folder
    const folderVideoCounts = folders.reduce((acc, folder) => {
        const folderChannels = channelsByFolder[folder.id] || [];
        acc[folder.id] = folderChannels.reduce((sum, ch) => sum + (ch.video_count || 0), 0);
        return acc;
    }, {});

    const unfiledChannels = channelsByFolder['unfiled'] || [];
    const totalChannels = channels.length;
    const totalVideos = channels.reduce((sum, ch) => sum + (ch.video_count || 0), 0);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <NavigationTabs />
                <div className="flex items-center justify-center h-96">
                    <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <NavigationTabs />

            {/* Header */}
            <header className="bg-white border-b border-gray-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">폴더 & 채널</h1>
                            <p className="text-sm sm:text-base text-gray-500 mt-1">
                                {folders.length}개 폴더 · {totalChannels}개 채널 · {totalVideos}개 영상
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-6">
                {folders.length === 0 && unfiledChannels.length === 0 ? (
                    // Empty state
                    <div className="text-center py-16">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">폴더를 만들어 채널을 정리하세요</h2>
                        <p className="text-gray-500 mb-6">채널을 주제별로 분류하고 효율적으로 관리할 수 있습니다</p>
                        <Link
                            to="/"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            홈으로 가기
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Folders */}
                        {folders.map(folder => {
                            const folderChannels = channelsByFolder[folder.id] || [];
                            const isExpanded = expandedFolders.has(folder.id);
                            const videoCount = folderVideoCounts[folder.id] || 0;

                            return (
                                <div key={folder.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                    {/* Folder Header */}
                                    <div
                                        onClick={() => toggleFolder(folder.id)}
                                        className="flex items-center justify-between px-4 sm:px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            {/* Folder Color Dot */}
                                            <div
                                                className="w-4 h-4 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: folder.color || '#6366f1' }}
                                            ></div>

                                            {/* Folder Name */}
                                            <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                                                {folder.name}
                                            </h2>

                                            {/* Stats */}
                                            <div className="flex items-center gap-3 text-sm text-gray-500">
                                                <span className="hidden sm:inline">채널 {folderChannels.length}개</span>
                                                <span className="hidden sm:inline">•</span>
                                                <span className="hidden sm:inline">영상 {videoCount}개</span>
                                                <span className="sm:hidden">{folderChannels.length}개 · {videoCount}개</span>
                                            </div>
                                        </div>

                                        {/* Expand Icon */}
                                        <svg
                                            className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>

                                    {/* Folder Channels (Expandable) */}
                                    {isExpanded && (
                                        <div className="px-4 sm:px-6 pb-4 border-t border-gray-100">
                                            {folderChannels.length > 0 ? (
                                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 pt-4">
                                                    {folderChannels.map(channel => (
                                                        <div key={channel.id} className="flex justify-center">
                                                            <ChannelCard
                                                                channel={channel}
                                                                onClick={handleChannelClick}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-8 text-gray-400">
                                                    <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                    </svg>
                                                    <p className="text-sm">이 폴더에 채널이 없습니다</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Unfiled Channels */}
                        {unfiledChannels.length > 0 && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div
                                    onClick={() => toggleFolder('unfiled')}
                                    className="flex items-center justify-between px-4 sm:px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="w-4 h-4 rounded-full bg-gray-300 flex-shrink-0"></div>
                                        <h2 className="text-lg sm:text-xl font-bold text-gray-900">폴더 없음</h2>
                                        <div className="flex items-center gap-3 text-sm text-gray-500">
                                            <span className="hidden sm:inline">채널 {unfiledChannels.length}개</span>
                                            <span className="hidden sm:inline">•</span>
                                            <span className="hidden sm:inline">영상 {unfiledChannels.reduce((sum, ch) => sum + (ch.video_count || 0), 0)}개</span>
                                            <span className="sm:hidden">{unfiledChannels.length}개 · {unfiledChannels.reduce((sum, ch) => sum + (ch.video_count || 0), 0)}개</span>
                                        </div>
                                    </div>
                                    <svg
                                        className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${expandedFolders.has('unfiled') ? 'rotate-180' : ''}`}
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>

                                {expandedFolders.has('unfiled') && (
                                    <div className="px-4 sm:px-6 pb-4 border-t border-gray-100">
                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 pt-4">
                                            {unfiledChannels.map(channel => (
                                                <div key={channel.id} className="flex justify-center">
                                                    <ChannelCard
                                                        channel={channel}
                                                        onClick={handleChannelClick}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

export default BrowsePage;
