import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import TagManagerModal from './TagManagerModal';

const NavigationTabs = () => {
    const location = useLocation();
    const currentPath = location.pathname;
    const [showTagManager, setShowTagManager] = useState(false);

    const tabs = [
        {
            path: '/',
            label: '홈',
            icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
            )
        },
        {
            path: '/channels',
            label: '전체 채널',
            icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            )
        },
        {
            path: '/videos',
            label: '전체 영상',
            icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
            )
        }
    ];

    return (
        <>
            <nav className="bg-white border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center justify-around sm:justify-start sm:gap-1 flex-1">
                            {tabs.map(tab => {
                                const isActive = currentPath === tab.path;

                                return (
                                    <Link
                                        key={tab.path}
                                        to={tab.path}
                                        className={`
                                            flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium
                                            border-b-2 transition-colors min-h-[48px]
                                            ${isActive
                                                ? 'border-primary-500 text-primary-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                            }
                                        `}
                                    >
                                        {tab.icon}
                                        {tab.label}
                                    </Link>
                                );
                            })}
                        </div>

                        {/* 태그 관리 버튼 */}
                        <button
                            onClick={() => setShowTagManager(true)}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm text-gray-500 hover:text-primary-600 hover:bg-gray-50 rounded-lg transition-colors"
                            title="태그 관리"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                            <span className="hidden sm:inline">태그 관리</span>
                        </button>
                    </div>
                </div>
            </nav>

            {/* 태그 관리 모달 */}
            <TagManagerModal
                isOpen={showTagManager}
                onClose={() => setShowTagManager(false)}
            />
        </>
    );
};

export default NavigationTabs;
