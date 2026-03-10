import React, { useRef, useEffect, useCallback, useState } from 'react';

const TagCarousel = ({ tags, activeTag, onTagSelect, isVisible = true }) => {
    const scrollRef = useRef(null);
    const isAutoScrolling = useRef(false);
    const debounceRef = useRef(null);
    const [visualTag, setVisualTag] = useState(activeTag);

    // 외부에서 activeTag 변경 시 visualTag 동기화 + 스크롤
    useEffect(() => {
        setVisualTag(activeTag);
        isAutoScrolling.current = true;
        requestAnimationFrame(() => {
            const tagValue = activeTag || '';
            const chip = tagValue === ''
                ? scrollRef.current?.querySelector('[data-tag="__all__"]')
                : scrollRef.current?.querySelector(`[data-tag="${CSS.escape(tagValue)}"]`);
            if (chip) {
                chip.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }
            setTimeout(() => { isAutoScrolling.current = false; }, 300);
        });
    }, [activeTag]);

    // 가운데 칩 찾기
    const findCenterTag = useCallback(() => {
        const container = scrollRef.current;
        if (!container) return null;

        const centerX = container.scrollLeft + container.clientWidth / 2;
        const chips = container.querySelectorAll('[data-tag]');
        let closestChip = null;
        let closestDist = Infinity;

        chips.forEach(chip => {
            const chipCenter = chip.offsetLeft + chip.offsetWidth / 2;
            const dist = Math.abs(chipCenter - centerX);
            if (dist < closestDist) {
                closestDist = dist;
                closestChip = chip;
            }
        });

        if (!closestChip) return null;
        const tagValue = closestChip.dataset.tag;
        return tagValue === '__all__' ? '' : tagValue;
    }, []);

    // 스크롤 이벤트 → 가운데 칩 자동 선택
    const handleScroll = useCallback(() => {
        if (isAutoScrolling.current || !isVisible) return;

        const centerTag = findCenterTag();
        if (centerTag === null) return;

        // 시각적 하이라이트 즉시
        setVisualTag(centerTag);

        // 실제 필터 적용은 디바운스
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            onTagSelect(centerTag);
        }, 150);
    }, [findCenterTag, onTagSelect, isVisible]);

    // cleanup debounce
    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

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

    // 클릭으로 직접 선택
    const handleChipClick = useCallback((tagName) => {
        const newTag = tagName === visualTag ? '' : tagName;
        isAutoScrolling.current = true;
        setVisualTag(newTag);
        onTagSelect(newTag);

        requestAnimationFrame(() => {
            const chipValue = newTag === '' ? '__all__' : newTag;
            const chip = scrollRef.current?.querySelector(`[data-tag="${CSS.escape(chipValue)}"]`);
            if (chip) {
                chip.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }
            setTimeout(() => { isAutoScrolling.current = false; }, 300);
        });
    }, [visualTag, onTagSelect]);

    const chipBase = 'flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium min-h-[32px] transition-all duration-200 cursor-pointer select-none';
    const chipActive = 'bg-primary-500 text-white shadow-md';
    const chipInactive = 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100';

    return (
        <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
                isVisible ? 'max-h-[48px] opacity-100 mb-2' : 'max-h-0 opacity-0 mb-0'
            }`}
        >
            {/* 스크롤 영역 */}
            <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1"
                style={{ WebkitOverflowScrolling: 'touch' }}
            >
                {/* 전체 칩 */}
                <button
                    data-tag="__all__"
                    onClick={() => handleChipClick('')}
                    className={`${chipBase} ${visualTag === '' ? chipActive : chipInactive}`}
                >
                    전체
                </button>

                {/* 태그 칩들 */}
                {tags.map(tag => (
                    <button
                        key={tag.name}
                        data-tag={tag.name}
                        onClick={() => handleChipClick(tag.name)}
                        className={`${chipBase} ${tag.name === visualTag ? chipActive : chipInactive}`}
                    >
                        <span className="max-w-[150px] truncate inline-block align-middle">
                            #{tag.name}
                        </span>
                        {tag.count > 0 && (
                            <span className={`ml-1.5 text-xs ${tag.name === visualTag ? 'text-white/70' : 'text-gray-400'}`}>
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
