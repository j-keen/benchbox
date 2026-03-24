import { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import useModalHistory from '../hooks/useModalHistory';
import {
    PlusIcon,
    VideoCameraIcon,
    TvIcon,
    FolderPlusIcon,
    TagIcon,
    CheckCircleIcon,
    ChevronDownIcon,
    LinkIcon,
    KeyIcon,
} from '@heroicons/react/24/outline';

/**
 * FABMenu - URL 등록 전용 플로팅 버튼 + 롱프레스 메뉴
 *
 * - FAB 탭 (짧게) → 클립보드 URL 즉시 등록
 * - FAB 롱프레스 (400ms+) → 바텀 시트 메뉴
 * - 5개 퀵 액션 (아이콘 그리드)
 * - 네비게이션 칩
 * - 접을 수 있는 사용 팁
 */
export default function FABMenu({
    onClipboardPaste,
    onAddVideo,
    onAddChannel,
    onAddFolder,
    onOpenTagManager,
    onToggleSelectionMode,
    onOpenSettings,
    hidden = false,
}) {
    const [isOpen, setIsOpen] = useState(false);
    useModalHistory(isOpen, () => setIsOpen(false));
    const [tipsExpanded, setTipsExpanded] = useState(false);
    const longPressTimer = useRef(null);
    const isLongPress = useRef(false);

    // FAB 터치 시작 - 롱프레스 감지
    const handlePointerDown = useCallback(() => {
        isLongPress.current = false;
        longPressTimer.current = setTimeout(() => {
            isLongPress.current = true;
            setIsOpen(true);
            setTipsExpanded(false);
        }, 400);
    }, []);

    // FAB 터치 종료
    const handlePointerUp = useCallback(() => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
        if (!isLongPress.current) {
            if (isOpen) {
                setIsOpen(false);
            } else {
                onClipboardPaste();
            }
        }
    }, [isOpen, onClipboardPaste]);

    // 포인터가 버튼 밖으로 나간 경우
    const handlePointerLeave = useCallback(() => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    }, []);

    // 액션 실행 후 메뉴 닫기
    // FABMenu를 먼저 닫아 히스토리 cleanup을 완료한 뒤, 새 모달을 열어야
    // popstate 충돌로 새 모달이 바로 닫히는 문제를 방지할 수 있음
    const handleAction = (actionFn) => {
        setIsOpen(false);
        setTimeout(() => actionFn(), 60);
    };

    // 바텀 시트 외부 클릭
    const handleBackdropClick = () => {
        setIsOpen(false);
    };

    // 퀵 액션 데이터 (URL 붙여넣기는 FAB 탭으로 이동)
    const quickActions = [
        {
            icon: VideoCameraIcon,
            label: '영상 추가',
            bgColor: 'bg-sky-100',
            textColor: 'text-sky-600',
            action: onAddVideo,
            delay: '0ms',
        },
        {
            icon: TvIcon,
            label: '채널 추가',
            bgColor: 'bg-emerald-100',
            textColor: 'text-emerald-600',
            action: onAddChannel,
            delay: '50ms',
        },
        {
            icon: FolderPlusIcon,
            label: '폴더 만들기',
            bgColor: 'bg-indigo-100',
            textColor: 'text-indigo-600',
            action: onAddFolder,
            delay: '100ms',
        },
        {
            icon: TagIcon,
            label: '태그 관리',
            bgColor: 'bg-amber-100',
            textColor: 'text-amber-600',
            action: onOpenTagManager,
            delay: '150ms',
        },
        {
            icon: CheckCircleIcon,
            label: '선택 모드',
            bgColor: 'bg-gray-100',
            textColor: 'text-gray-600',
            action: onToggleSelectionMode,
            delay: '200ms',
        },
        {
            icon: KeyIcon,
            label: 'API 키 설정',
            bgColor: 'bg-orange-100',
            textColor: 'text-orange-600',
            action: onOpenSettings,
            delay: '250ms',
        },
    ];

    // 네비게이션 칩 데이터
    const navChips = [
        { label: '채널 전체보기', to: '/channels' },
        { label: '영상 전체보기', to: '/videos' },
        { label: '폴더 탐색', to: '/browse' },
        { label: '저장한 댓글', to: '/saved-comments' },
    ];

    // 사용 팁
    const tips = [
        { icon: '⌨️', text: 'Ctrl+V 어디서든 URL을 붙여넣어 영상/채널을 등록할 수 있어요' },
        { icon: '🎯', text: '영상을 채널 카드에 드래그하면 분류할 수 있어요' },
        { icon: '✨', text: '영상 상세에서 AI가 메모를 다듬어줘요' },
        { icon: '🔍', text: '/ 또는 Ctrl+K로 검색을 바로 열 수 있어요' },
        { icon: '👆', text: '이 버튼을 길게 누르면 더 많은 기능을 볼 수 있어요' },
    ];

    if (hidden) return null;

    return (
        <>
            {/* FAB 버튼 - 탭: URL 등록, 롱프레스: 메뉴 */}
            <button
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerLeave}
                onContextMenu={(e) => e.preventDefault()}
                className={`fixed bottom-6 right-4 z-40 h-14 bg-gradient-to-br from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 select-none touch-none ${
                    isOpen ? 'w-14' : 'w-14 sm:w-auto sm:px-5'
                }`}
                aria-label={isOpen ? '메뉴 닫기' : 'URL 붙여넣기 (길게 누르면 메뉴)'}
            >
                {isOpen ? (
                    <PlusIcon className="w-6 h-6 rotate-45 transition-transform duration-200" />
                ) : (
                    <>
                        <LinkIcon className="w-6 h-6" />
                        <span className="hidden sm:inline text-sm font-medium">URL 등록</span>
                    </>
                )}
            </button>

            {/* 백드롭 + 바텀 시트 */}
            {isOpen && (
                <>
                    {/* 백드롭 */}
                    <div
                        className="fixed inset-0 bg-black/30 z-40 transition-opacity duration-200"
                        onClick={handleBackdropClick}
                    />

                    {/* 바텀 시트 */}
                    <div
                        className="fixed bottom-0 left-0 right-0 z-40 bg-white rounded-t-2xl shadow-2xl max-h-[70vh] overflow-hidden flex flex-col sm:max-w-md sm:mx-auto sm:mb-4 sm:rounded-2xl animate-slide-up"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* 드래그 핸들 */}
                        <div className="flex justify-center py-3">
                            <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
                        </div>

                        {/* 스크롤 가능 컨텐츠 */}
                        <div className="overflow-y-auto flex-1 pb-6">
                            {/* Section 1: 퀵 액션 그리드 */}
                            <div className="px-6 mb-6">
                                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                    빠른 작업
                                </h3>
                                <div className="grid grid-cols-3 gap-3">
                                    {quickActions.map((action, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleAction(action.action)}
                                            className="flex flex-col items-center gap-2 group"
                                            style={{
                                                animation: `fadeInUp 0.3s ease-out ${action.delay} both`,
                                            }}
                                        >
                                            <div
                                                className={`w-16 h-16 ${action.bgColor} ${action.textColor} rounded-2xl flex items-center justify-center transition-all duration-200 group-hover:scale-110 group-active:scale-95 shadow-sm group-hover:shadow-md`}
                                            >
                                                <action.icon className="w-7 h-7" />
                                            </div>
                                            <span className="text-xs font-medium text-gray-700 text-center leading-tight">
                                                {action.label}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 구분선 */}
                            <div className="border-t border-gray-100 mx-6 mb-5"></div>

                            {/* Section 2: 둘러보기 칩 */}
                            <div className="px-6 mb-6">
                                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                    둘러보기
                                </h3>
                                <div className="flex gap-2 flex-wrap">
                                    {navChips.map((chip, idx) => (
                                        <Link
                                            key={idx}
                                            to={chip.to}
                                            onClick={() => setIsOpen(false)}
                                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-full transition-colors active:scale-95"
                                        >
                                            {chip.label}
                                        </Link>
                                    ))}
                                </div>
                            </div>

                            {/* 구분선 */}
                            <div className="border-t border-gray-100 mx-6 mb-5"></div>

                            {/* Section 3: 사용 팁 (접을 수 있음) */}
                            <div className="px-6">
                                <button
                                    onClick={() => setTipsExpanded(!tipsExpanded)}
                                    className="flex items-center justify-between w-full mb-3 group"
                                >
                                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        사용 팁
                                    </h3>
                                    <ChevronDownIcon
                                        className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                                            tipsExpanded ? 'rotate-180' : 'rotate-0'
                                        }`}
                                    />
                                </button>

                                {tipsExpanded && (
                                    <div className="space-y-2.5 animate-fadeIn">
                                        {tips.map((tip, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-start gap-2 text-xs text-gray-500 leading-relaxed"
                                            >
                                                <span className="text-sm flex-shrink-0 mt-0.5">
                                                    {tip.icon}
                                                </span>
                                                <span>{tip.text}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* 애니메이션 키프레임 */}
            <style>{`
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes slide-up {
                    from {
                        transform: translateY(100%);
                    }
                    to {
                        transform: translateY(0);
                    }
                }

                @keyframes fadeIn {
                    from {
                        opacity: 0;
                    }
                    to {
                        opacity: 1;
                    }
                }

                .animate-slide-up {
                    animation: slide-up 0.2s ease-out;
                }

                .animate-fadeIn {
                    animation: fadeIn 0.2s ease-out;
                }
            `}</style>
        </>
    );
}
