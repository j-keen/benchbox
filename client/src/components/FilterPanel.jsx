import React, { useState, useEffect, useRef, useCallback } from 'react';
import useModalHistory from '../hooks/useModalHistory';

const FilterPanel = ({
  searchQuery,
  onSearchChange,
  searchPlaceholder = '검색...',
  filterGroups = [],
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // 모바일 뒤로가기 시 패널 닫기
  useModalHistory(isOpen, () => setIsOpen(false));
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const debounceRef = useRef(null);

  // 검색 디바운스
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  const handleSearchChange = useCallback((value) => {
    setLocalSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearchChange(value);
    }, 300);
  }, [onSearchChange]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // 활성 필터 개수 (정렬 제외)
  const activeFilters = filterGroups.filter(g => {
    if (g.type === 'rating-min') return g.value !== null;
    return g.value !== 'all' && g.value !== '';
  });
  const activeFilterCount = activeFilters.length;

  // 활성 필터 칩 생성
  const activeChips = activeFilters.map(g => {
    let chipLabel = g.label;
    if (g.type === 'rating-min') {
      chipLabel = `⭐${g.value}점이상`;
    } else {
      const option = g.options.find(o => o.value === g.value);
      if (option) chipLabel = option.label;
    }
    return { key: g.key, label: chipLabel, group: g };
  });

  const handleClearFilter = (group) => {
    if (group.type === 'rating-min') {
      group.onChange(null);
    } else if (group.options[0]) {
      group.onChange(group.options[0].value);
    }
  };

  const handleClearAll = () => {
    filterGroups.forEach(g => handleClearFilter(g));
  };

  return (
    <div>
      {/* 검색바 + 필터 토글 */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={localSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {localSearch && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {filterGroups.length > 0 && (
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`relative flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-lg border transition-colors ${
              isOpen || activeFilterCount > 0
                ? 'bg-primary-50 border-primary-300 text-primary-600'
                : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* 필터 패널 (펼침/접힘) */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-[800px] opacity-100 mt-3' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
          {/* 필터 그룹들 */}
          {filterGroups.map(group => (
            <div key={group.key}>
              {group.type === 'rating-min' ? (
                <RatingFilter
                  label={group.label}
                  value={group.value}
                  onChange={group.onChange}
                />
              ) : (
                <FilterGroup
                  label={group.label}
                  options={group.options}
                  value={group.value}
                  onChange={group.onChange}
                  maxHeight={group.maxHeight}
                />
              )}
            </div>
          ))}

          {/* 필터 초기화 */}
          {activeFilterCount > 0 && (
            <button
              onClick={handleClearAll}
              className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              필터 초기화
            </button>
          )}
        </div>
      </div>

      {/* 활성 필터 칩 (필터 패널 닫혀있을 때만) */}
      {!isOpen && activeChips.length > 0 && (
        <div className="mt-2 flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
          {activeChips.map(chip => (
            <button
              key={chip.key}
              onClick={() => handleClearFilter(chip.group)}
              className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-xs bg-primary-50 text-primary-700 border border-primary-200 rounded-full hover:bg-primary-100 transition-colors"
            >
              {chip.label}
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// 칩 선택 필터 그룹
const FilterGroup = ({ label, options, value, onChange, maxHeight }) => (
  <div>
    <p className="text-xs font-medium text-gray-500 mb-1.5">{label}</p>
    <div
      className={`flex flex-wrap gap-1.5 ${maxHeight ? 'overflow-y-auto' : ''}`}
      style={maxHeight ? { maxHeight } : undefined}
    >
      {options.map(option => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`px-2.5 py-1.5 text-xs rounded-lg transition-colors min-h-[36px] flex items-center gap-1 ${
              isSelected
                ? 'bg-primary-100 text-primary-700 border border-primary-300'
                : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  </div>
);

// 별점 필터
const RatingFilter = ({ label, value, onChange }) => {
  const options = [
    { value: null, label: '전체' },
    { value: 1, label: '⭐1+' },
    { value: 2, label: '⭐2+' },
    { value: 3, label: '⭐3+' },
    { value: 4, label: '⭐4+' },
    { value: 5, label: '⭐5' },
  ];

  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map(option => {
          const isSelected = option.value === value;
          return (
            <button
              key={String(option.value)}
              onClick={() => onChange(option.value)}
              className={`px-2.5 py-1.5 text-xs rounded-lg transition-colors min-h-[36px] flex items-center gap-1 ${
                isSelected
                  ? 'bg-primary-100 text-primary-700 border border-primary-300'
                  : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default FilterPanel;
