import React, { useRef, useEffect, useCallback } from 'react';

const TagCarousel = ({ tags, activeTag, onTagSelect }) => {
    const scrollRef = useRef(null);

    // 마우스 세로 휠 → 가로 스크롤 변환
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        const handleWheel = (e) => {
            if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                e.preventDefault();
                el.scrollLeft += e.deltaY;
            }
        };

        el.addEventListener('wheel', handleWheel, { passive: false });
        return () => el.removeEventListener('wheel', handleWheel);
    }, []);

    // 랜덤 태그 선택
    const handleRandom = useCallback(() => {
        if (tags.length <= 1) return;
        const candidates = tags.filter(t => t.name !== activeTag);
        const random = candidates[Math.floor(Math.random() * candidates.length)];
        onTagSelect(random.name);

        // 선택된 칩으로 스크롤
        requestAnimationFrame(() => {
            const chip = scrollRef.current?.querySelector(`[data-tag="${CSS.escape(random.name)}"]`);
            chip?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        });
    }, [tags, activeTag, onTagSelect]);

    // 활성 태그 변경 시 해당 칩으로 스크롤
    useEffect(() => {
        if (!activeTag) return;
        requestAnimationFrame(() => {
            const chip = scrollRef.current?.querySelector(`[data-tag="${CSS.escape(activeTag)}"]`);
            chip?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        });
    }, [activeTag]);

    const chipBase = 'flex-shrink-0 rounded-full px-4 py-2.5 text-sm font-medium min-h-[44px] transition-all duration-200 cursor-pointer select-none';
    const chipActive = 'bg-primary-500 text-white shadow-md';
    const chipInactive = 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100';

    return (
        <div className="mb-4">
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-sm font-medium text-gray-500">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    태그 탐색
                </div>
                <button
                    onClick={handleRandom}
                    disabled={tags.length <= 1}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    랜덤
                </button>
            </div>

            {/* 스크롤 영역 */}
            <div
                ref={scrollRef}
                className="flex gap-2 overflow-x-auto scrollbar-hide pb-1"
                style={{ WebkitOverflowScrolling: 'touch' }}
            >
                {/* 전체 칩 */}
                <button
                    onClick={() => onTagSelect('')}
                    className={`${chipBase} ${activeTag === '' ? chipActive : chipInactive}`}
                >
                    전체
                </button>

                {/* 태그 칩들 */}
                {tags.map(tag => (
                    <button
                        key={tag.name}
                        data-tag={tag.name}
                        onClick={() => onTagSelect(tag.name === activeTag ? '' : tag.name)}
                        className={`${chipBase} ${tag.name === activeTag ? chipActive : chipInactive}`}
                    >
                        <span className="max-w-[150px] truncate inline-block align-middle">
                            #{tag.name}
                        </span>
                        {tag.count > 0 && (
                            <span className={`ml-1.5 text-xs ${tag.name === activeTag ? 'text-white/70' : 'text-gray-400'}`}>
                                {tag.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default TagCarousel;
