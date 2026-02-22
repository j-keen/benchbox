import React, { useState, useEffect, useRef } from 'react';
import { tagsApi } from '../utils/api';
import useModalHistory from '../hooks/useModalHistory';

const BatchTagModal = ({ selectedCount, onApply, onClose }) => {
    useModalHistory(true, onClose);
    const [tagInput, setTagInput] = useState('');
    const [tags, setTags] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const inputRef = useRef(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    useEffect(() => {
        const fetchSuggestions = async () => {
            if (tagInput.length > 0) {
                try {
                    const res = await tagsApi.autocomplete(tagInput);
                    setSuggestions(res.data.tags || []);
                } catch (error) {
                    console.error('태그 자동완성 오류:', error);
                }
            } else {
                setSuggestions([]);
            }
        };
        fetchSuggestions();
    }, [tagInput]);

    const addTag = (tag) => {
        const cleanTag = tag.replace(/^#/, '').trim();
        if (cleanTag && !tags.includes(cleanTag)) {
            setTags([...tags, cleanTag]);
        }
        setTagInput('');
        setSuggestions([]);
    };

    const removeTag = (tagToRemove) => {
        setTags(tags.filter(t => t !== tagToRemove));
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && tagInput) {
            e.preventDefault();
            addTag(tagInput);
        } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
            removeTag(tags[tags.length - 1]);
        }
    };

    const handleApply = () => {
        if (tags.length > 0) {
            onApply(tags);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
                <div className="p-4 border-b">
                    <h3 className="text-lg font-semibold">일괄 태그 추가</h3>
                    <p className="text-sm text-gray-500 mt-1">
                        {selectedCount}개 항목에 태그를 추가합니다
                    </p>
                </div>

                <div className="p-4">
                    {/* 태그 입력 */}
                    <div className="border border-gray-200 rounded-lg p-2 focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent">
                        <div className="flex flex-wrap gap-1 mb-2">
                            {tags.map((tag, index) => (
                                <span
                                    key={index}
                                    className="inline-flex items-center gap-1 bg-primary-100 text-primary-700 px-2 py-1 rounded text-sm"
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
                        <input
                            ref={inputRef}
                            type="text"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="태그 입력 후 Enter..."
                            className="w-full outline-none text-sm"
                        />
                    </div>

                    {/* 자동완성 제안 */}
                    {suggestions.length > 0 && (
                        <div className="mt-2 border border-gray-200 rounded-lg max-h-32 overflow-y-auto">
                            {suggestions.map((suggestion, index) => (
                                <button
                                    key={index}
                                    onClick={() => addTag(suggestion.name)}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between"
                                >
                                    <span>#{suggestion.name}</span>
                                    <span className="text-xs text-gray-400">{suggestion.count}회 사용</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleApply}
                        disabled={tags.length === 0}
                        className="px-4 py-2 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {tags.length > 0 ? `${tags.length}개 태그 추가` : '태그 추가'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BatchTagModal;
