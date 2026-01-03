import React, { useState, useEffect, useRef } from 'react';
import { tagsApi } from '../utils/api';

const TagInput = ({ tags = [], onChange, channelId = null, showCategoryPicker = true }) => {
    const [inputValue, setInputValue] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [recommendations, setRecommendations] = useState([]);
    const [categorizedTags, setCategorizedTags] = useState([]);
    const [expandedCategories, setExpandedCategories] = useState({});
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [showCategoryPanel, setShowCategoryPanel] = useState(false);
    const inputRef = useRef(null);
    const suggestionsRef = useRef(null);

    // 카테고리별 태그 가져오기
    useEffect(() => {
        if (showCategoryPicker) {
            tagsApi.getByCategory()
                .then(res => {
                    setCategorizedTags(res.data.categorizedTags || []);
                    // 첫 번째 카테고리는 기본 펼침
                    const initial = {};
                    if (res.data.categorizedTags?.length > 0) {
                        initial[res.data.categorizedTags[0].id || 'uncategorized'] = true;
                    }
                    setExpandedCategories(initial);
                })
                .catch(() => setCategorizedTags([]));
        }
    }, [showCategoryPicker]);

    // 채널별 추천 태그 가져오기
    useEffect(() => {
        if (channelId) {
            tagsApi.recommend(channelId)
                .then(res => setRecommendations(res.data.recommendations || []))
                .catch(() => setRecommendations([]));
        }
    }, [channelId]);

    // 자동완성
    useEffect(() => {
        if (inputValue.length >= 1) {
            const searchTerm = inputValue.replace(/^#/, '');
            tagsApi.autocomplete(searchTerm)
                .then(res => {
                    const filtered = (res.data.suggestions || [])
                        .filter(s => !tags.includes(s));
                    setSuggestions(filtered);
                    setShowSuggestions(filtered.length > 0);
                })
                .catch(() => setSuggestions([]));
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    }, [inputValue, tags]);

    // 외부 클릭 시 드롭다운 닫기
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(e.target) &&
                inputRef.current && !inputRef.current.contains(e.target)) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const addTag = (tagName) => {
        const cleanTag = tagName.replace(/^#/, '').trim();
        if (cleanTag && !tags.includes(cleanTag)) {
            onChange([...tags, cleanTag]);
        }
        setInputValue('');
        setShowSuggestions(false);
        inputRef.current?.focus();
    };

    const removeTag = (tagToRemove) => {
        onChange(tags.filter(t => t !== tagToRemove));
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (inputValue.trim()) {
                addTag(inputValue);
            }
        } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
            removeTag(tags[tags.length - 1]);
        }
    };

    const toggleCategory = (categoryId) => {
        setExpandedCategories(prev => ({
            ...prev,
            [categoryId || 'uncategorized']: !prev[categoryId || 'uncategorized']
        }));
    };

    const filteredRecommendations = recommendations.filter(r => !tags.includes(r));

    return (
        <div className="space-y-3">
            {/* 태그 입력 영역 */}
            <div className="relative">
                {/* 카테고리 버튼 - 항상 상단에 표시 */}
                {showCategoryPicker && (
                    <div className="mb-2">
                        <button
                            type="button"
                            onClick={() => setShowCategoryPanel(!showCategoryPanel)}
                            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors ${showCategoryPanel ? 'bg-primary-500 text-white' : 'bg-primary-50 text-primary-600 hover:bg-primary-100 border border-primary-200'}`}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                            <span className="text-sm font-medium">카테고리에서 태그 선택</span>
                            <svg className={`w-4 h-4 transition-transform ${showCategoryPanel ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                    </div>
                )}

                {/* 태그 입력 박스 */}
                <div className="flex flex-wrap items-center gap-1.5 p-2 bg-white border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent min-h-[42px]">
                    {/* 기존 태그들 */}
                    {tags.map((tag, index) => (
                        <span
                            key={index}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-100 text-primary-700 text-sm rounded"
                        >
                            #{tag}
                            <button
                                type="button"
                                onClick={() => removeTag(tag)}
                                className="text-primary-500 hover:text-primary-700"
                            >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </span>
                    ))}

                    {/* 입력 필드 */}
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                        placeholder={tags.length === 0 ? "태그 입력... (Enter로 추가)" : ""}
                        className="flex-1 min-w-[100px] text-sm focus:outline-none"
                    />
                </div>

                {/* 자동완성 드롭다운 */}
                {showSuggestions && (
                    <div
                        ref={suggestionsRef}
                        className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto"
                    >
                        {suggestions.map((suggestion, index) => (
                            <button
                                key={index}
                                type="button"
                                onClick={() => addTag(suggestion)}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                            >
                                #{suggestion}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* 카테고리별 태그 패널 - 모바일 최적화 */}
            {showCategoryPanel && categorizedTags.length > 0 && (
                <div className="border border-gray-200 rounded-lg bg-gray-50 overflow-hidden">
                    <div className="p-3 sm:p-2 bg-gray-100 border-b border-gray-200 flex items-center justify-between">
                        <span className="text-sm sm:text-xs font-medium text-gray-600">카테고리별 태그 (탭하여 추가)</span>
                        <button
                            type="button"
                            onClick={() => setShowCategoryPanel(false)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 rounded sm:hidden"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <div className="max-h-72 sm:max-h-60 overflow-y-auto">
                        {categorizedTags.map((category) => {
                            const categoryKey = category.id || 'uncategorized';
                            const isExpanded = expandedCategories[categoryKey];
                            const availableTags = category.tags?.filter(t => !tags.includes(t.name)) || [];

                            return (
                                <div key={categoryKey} className="border-b border-gray-200 last:border-b-0">
                                    {/* 카테고리 헤더 - 터치 영역 확대 */}
                                    <button
                                        type="button"
                                        onClick={() => toggleCategory(category.id)}
                                        className="w-full flex items-center justify-between px-3 py-3 sm:py-2 hover:bg-gray-100 transition-colors min-h-[48px] sm:min-h-0"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="w-4 h-4 sm:w-3 sm:h-3 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: category.color }}
                                            />
                                            <span className="text-base sm:text-sm font-medium text-gray-700">
                                                {category.name}
                                            </span>
                                            <span className="text-sm sm:text-xs text-gray-400">
                                                ({availableTags.length})
                                            </span>
                                        </div>
                                        <svg
                                            className={`w-5 h-5 sm:w-4 sm:h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>

                                    {/* 태그 목록 - 터치 친화적 크기 */}
                                    {isExpanded && availableTags.length > 0 && (
                                        <div className="px-3 pb-3 sm:pb-2 flex flex-wrap gap-2 sm:gap-1.5">
                                            {availableTags.map((tag) => (
                                                <button
                                                    key={tag.id}
                                                    type="button"
                                                    onClick={() => addTag(tag.name)}
                                                    className="px-3 py-2 sm:px-2 sm:py-1 text-sm sm:text-xs rounded-lg sm:rounded transition-colors hover:opacity-80 min-h-[40px] sm:min-h-0"
                                                    style={{
                                                        backgroundColor: `${category.color}20`,
                                                        color: category.color,
                                                        border: `1px solid ${category.color}40`
                                                    }}
                                                >
                                                    #{tag.name}
                                                    {tag.count > 0 && (
                                                        <span className="ml-1 opacity-60">({tag.count})</span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {isExpanded && availableTags.length === 0 && (
                                        <div className="px-3 pb-3 sm:pb-2 text-sm sm:text-xs text-gray-400">
                                            사용 가능한 태그가 없습니다
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* 추천 태그 - 모바일 터치 친화적 */}
            {filteredRecommendations.length > 0 && (
                <div>
                    <div className="text-sm sm:text-xs text-gray-500 mb-2 sm:mb-1.5">추천 태그</div>
                    <div className="flex flex-wrap gap-2 sm:gap-1.5">
                        {filteredRecommendations.map((tag, index) => (
                            <button
                                key={index}
                                type="button"
                                onClick={() => addTag(tag)}
                                className="px-3 py-2 sm:px-2 sm:py-1 text-sm sm:text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg sm:rounded transition-colors min-h-[40px] sm:min-h-0"
                            >
                                #{tag}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TagInput;
