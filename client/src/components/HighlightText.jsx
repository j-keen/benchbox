import React from 'react';

const HighlightText = ({ text, query }) => {
    if (!query || !text) return text || null;

    // # 접두사 제거 (기존 검색 로직과 동일)
    const cleanQuery = query.replace(/^#/, '');
    if (!cleanQuery) return text;

    // regex 특수문자 이스케이프
    const escaped = cleanQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const parts = text.split(new RegExp(`(${escaped})`, 'gi'));

    return parts.map((part, i) =>
        part.toLowerCase() === cleanQuery.toLowerCase() ? (
            <mark key={i} className="bg-amber-200 text-gray-900 rounded-sm px-0.5">
                {part}
            </mark>
        ) : (
            part
        )
    );
};

export default HighlightText;
