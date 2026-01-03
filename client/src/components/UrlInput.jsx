import React, { useState } from 'react';
import { parseUrlApi } from '../utils/api';
import { getPlatformIcon, getPlatformColor, getPlatformName } from '../utils/platformIcons';

const UrlInput = ({ onSave, currentChannelId = null, channels = [] }) => {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState(null);
    const [error, setError] = useState('');
    const [showLocationPicker, setShowLocationPicker] = useState(false);
    const [selectedChannelId, setSelectedChannelId] = useState(currentChannelId);

    const handlePaste = async (e) => {
        const pastedUrl = e.clipboardData?.getData('text') || e.target.value;
        setUrl(pastedUrl);
        setError('');
        setPreview(null);

        if (!pastedUrl.trim()) return;

        // URL 유효성 간단 체크
        try {
            new URL(pastedUrl);
        } catch {
            setError('유효한 URL을 입력해주세요.');
            return;
        }

        setLoading(true);
        try {
            const response = await parseUrlApi.parse(pastedUrl);
            setPreview(response.data);
            setSelectedChannelId(currentChannelId);
        } catch (err) {
            console.error('URL 파싱 오류:', err);
            setError(err.response?.data?.error || '정보를 가져올 수 없습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = () => {
        if (!preview) return;

        onSave({
            url: preview.original_url,
            channel_id: preview.type === 'channel' ? null : selectedChannelId,
            isChannel: preview.type === 'channel',
            ...preview
        });

        // 초기화
        setUrl('');
        setPreview(null);
        setError('');
        setShowLocationPicker(false);
    };

    const handleCancel = () => {
        setUrl('');
        setPreview(null);
        setError('');
        setShowLocationPicker(false);
    };

    const PlatformIcon = preview ? getPlatformIcon(preview.platform) : null;
    const platformColor = preview ? getPlatformColor(preview.platform) : '';

    return (
        <div className="w-full">
            {/* URL 입력창 */}
            <div className="relative">
                <div className="flex items-center bg-white border border-gray-200 rounded-lg shadow-sm focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent">
                    <span className="pl-4 text-gray-400">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                    </span>
                    <input
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onPaste={handlePaste}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && url && !preview) {
                                handlePaste({ target: { value: url } });
                            }
                        }}
                        placeholder="URL 붙여넣기..."
                        className="flex-1 pl-3 pr-3 py-3 text-gray-900 placeholder-gray-400 focus:outline-none"
                    />
                    {/* 항상 보이는 추가 버튼 */}
                    {url && !preview && (
                        <button
                            onClick={() => handlePaste({ target: { value: url } })}
                            disabled={loading}
                            className="mr-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white text-sm font-medium rounded-lg transition-colors min-h-[44px] flex-shrink-0 flex items-center gap-2"
                        >
                            {loading && (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            )}
                            추가
                        </button>
                    )}
                </div>
            </div>

            {/* 에러 메시지 */}
            {error && (
                <div className="mt-2 px-3 py-2 bg-red-50 text-red-600 text-sm rounded-lg">
                    {error}
                </div>
            )}

            {/* 미리보기 */}
            {preview && (
                <div className="mt-3 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                    <div className="p-4">
                        <div className="flex gap-4">
                            {/* 썸네일 */}
                            <div className="flex-shrink-0 w-24 h-16 bg-gray-100 rounded overflow-hidden">
                                {preview.thumbnail ? (
                                    <img
                                        src={preview.thumbnail}
                                        alt={preview.title}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                )}
                            </div>

                            {/* 정보 */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${platformColor}`}>
                                        <PlatformIcon className="w-3 h-3" />
                                        {getPlatformName(preview.platform)}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        {preview.type === 'channel' ? '채널' : '영상'}
                                    </span>
                                </div>
                                <h4 className="mt-1 font-medium text-gray-900 truncate">
                                    {preview.title}
                                </h4>
                                {preview.type !== 'channel' && (
                                    <div className="mt-1 text-sm text-gray-500">
                                        저장 위치: {selectedChannelId
                                            ? channels.find(c => c.id === selectedChannelId)?.title || '선택된 채널'
                                            : '개별 영상 (홈)'}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 버튼 */}
                        <div className="mt-4 flex justify-end gap-2">
                            {preview.type !== 'channel' && channels.length > 0 && (
                                <button
                                    onClick={() => setShowLocationPicker(!showLocationPicker)}
                                    className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                                >
                                    다른 곳에 저장
                                </button>
                            )}
                            <button
                                onClick={handleCancel}
                                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-4 py-1.5 text-sm text-white bg-primary-500 hover:bg-primary-600 rounded transition-colors"
                            >
                                {preview.type === 'channel' ? '등록' : '저장'}
                            </button>
                        </div>

                        {/* 저장 위치 선택 */}
                        {showLocationPicker && preview.type !== 'channel' && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                                <div className="text-sm font-medium text-gray-700 mb-2">저장 위치 선택</div>
                                <div className="space-y-1 max-h-40 overflow-y-auto">
                                    <label className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                                        <input
                                            type="radio"
                                            name="location"
                                            checked={selectedChannelId === null}
                                            onChange={() => setSelectedChannelId(null)}
                                            className="text-primary-500"
                                        />
                                        <span className="text-sm">개별 영상 (홈)</span>
                                    </label>
                                    {channels.map(channel => (
                                        <label key={channel.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                                            <input
                                                type="radio"
                                                name="location"
                                                checked={selectedChannelId === channel.id}
                                                onChange={() => setSelectedChannelId(channel.id)}
                                                className="text-primary-500"
                                            />
                                            <span className="text-sm">{channel.title}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default UrlInput;
