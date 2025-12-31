import React, { useState, useEffect, useRef } from 'react';
import { tagsApi } from '../utils/api';

const TagInput = ({ tags = [], onChange, channelId = null }) => {
    const [inputValue, setInputValue] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [recommendations, setRecommendations] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const inputRef = useRef(null);
    const suggestionsRef = useRef(null);

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

    const filteredRecommendations = recommendations.filter(r => !tags.includes(r));

    return (
        <div className="space-y-3">
            {/* 태그 입력 영역 */}
            <div className="relative">
                <div className="flex flex-wrap gap-1.5 p-2 bg-white border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent min-h-[42px]">
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
                        placeholder={tags.length === 0 ? "태그 입력..." : ""}
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

            {/* 추천 태그 */}
            {filteredRecommendations.length > 0 && (
                <div>
                    <div className="text-xs text-gray-500 mb-1.5">추천 태그</div>
                    <div className="flex flex-wrap gap-1.5">
                        {filteredRecommendations.map((tag, index) => (
                            <button
                                key={index}
                                type="button"
                                onClick={() => addTag(tag)}
                                className="px-2 py-0.5 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
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
