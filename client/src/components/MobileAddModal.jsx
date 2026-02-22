import { useState } from 'react';
import TagInput from './TagInput';
import { getPlatformIcon, getPlatformColor, getPlatformName } from '../utils/platformIcons';
import { aiAssistApi } from '../utils/api';
import useModalHistory from '../hooks/useModalHistory';

export default function MobileAddModal({ preview, channels, currentChannelId, onSave, onClose }) {
  useModalHistory(true, onClose);
  const [memo, setMemo] = useState('');
  const [tags, setTags] = useState([]);
  const [selectedChannelId, setSelectedChannelId] = useState(currentChannelId || null);
  const [aiMemoLoading, setAiMemoLoading] = useState(false);
  const [aiTagsLoading, setAiTagsLoading] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState([]);
  const [originalMemo, setOriginalMemo] = useState(null);

  const handleSave = () => {
    onSave({
      url: preview.original_url,
      channel_id: preview.type === 'channel' ? null : selectedChannelId,
      isChannel: preview.type === 'channel',
      memo,
      tags,
      ...preview
    });
  };

  const handleAiRefineMemo = async () => {
    if (!memo.trim()) return;
    setAiMemoLoading(true);
    setOriginalMemo(memo);
    try {
        const result = await aiAssistApi.refineMemo({
            title: preview.title,
            description: preview.description,
            memo
        });
        setMemo(result.refinedMemo);
    } catch (error) {
        console.error('AI 메모 다듬기 오류:', error);
    } finally {
        setAiMemoLoading(false);
    }
  };

  const handleRevertMemo = () => {
    if (originalMemo !== null) {
        setMemo(originalMemo);
        setOriginalMemo(null);
    }
  };

  const handleAiSuggestTags = async () => {
    setAiTagsLoading(true);
    try {
        const result = await aiAssistApi.suggestTags({
            title: preview.title,
            description: preview.description,
            memo,
            existingTags: tags
        });
        setSuggestedTags(result.suggestedTags || []);
    } catch (error) {
        console.error('AI 태그 추천 오류:', error);
    } finally {
        setAiTagsLoading(false);
    }
  };

  const handleAcceptTag = (tag) => {
    if (!tags.includes(tag)) {
        setTags(prev => [...prev, tag]);
    }
    setSuggestedTags(prev => prev.filter(t => t !== tag));
  };

  const handleDismissSuggestions = () => {
    setSuggestedTags([]);
  };

  const PlatformIcon = getPlatformIcon(preview.platform);
  const platformColor = getPlatformColor(preview.platform);
  const platformName = getPlatformName(preview.platform);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 모바일 드래그 핸들 */}
        <div className="sm:hidden flex justify-center py-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 sm:py-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] sm:text-xs ${platformColor}`}>
              <PlatformIcon className="w-3 h-3" />
              <span className="hidden sm:inline">{platformName}</span>
            </span>
            <h2 className="text-sm sm:text-base font-semibold text-gray-900 truncate max-w-[160px] sm:max-w-none">
              {preview.title}
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <a
              href={preview.original_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-gray-400 hover:text-primary-600 transition-colors"
              title="원본 열기"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="닫기"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 p-3 sm:p-4 space-y-3 sm:space-y-4">
          {/* 썸네일 (9:16) + 메모 가로 배치 */}
          <div className="flex gap-3">
            {/* 9:16 썸네일 */}
            <div className="flex-shrink-0 w-24 sm:w-32 aspect-[9/16] bg-gray-100 rounded-lg overflow-hidden">
              {preview.thumbnail ? (
                <img
                  src={preview.thumbnail}
                  alt={preview.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>

            {/* 메모 (썸네일 높이에 맞춤) */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-500">메모</label>
                <div className="flex items-center gap-1">
                  {originalMemo !== null && (
                    <button
                      onClick={handleRevertMemo}
                      className="text-[10px] px-1.5 py-0.5 text-amber-600 hover:bg-amber-50 rounded transition-colors"
                    >
                      되돌리기
                    </button>
                  )}
                  <button
                    onClick={handleAiRefineMemo}
                    disabled={aiMemoLoading || !memo.trim()}
                    className="text-[10px] px-1.5 py-0.5 bg-violet-50 text-violet-600 hover:bg-violet-100 disabled:opacity-40 rounded transition-colors flex items-center gap-0.5"
                  >
                    {aiMemoLoading ? (
                      <div className="w-3 h-3 border border-violet-400 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    )}
                    AI 다듬기
                  </button>
                </div>
              </div>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="메모를 작성하세요..."
                className="flex-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-500">태그</label>
              <button
                onClick={handleAiSuggestTags}
                disabled={aiTagsLoading}
                className="text-[10px] px-1.5 py-0.5 bg-violet-50 text-violet-600 hover:bg-violet-100 disabled:opacity-40 rounded transition-colors flex items-center gap-0.5"
              >
                {aiTagsLoading ? (
                  <div className="w-3 h-3 border border-violet-400 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                )}
                AI 추천
              </button>
            </div>
            <TagInput
              tags={tags}
              onChange={setTags}
            />
            {/* AI 추천 태그 */}
            {suggestedTags.length > 0 && (
              <div className="mt-1.5 p-2 bg-violet-50 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-violet-600 font-medium">AI 추천 태그</span>
                  <button
                    onClick={handleDismissSuggestions}
                    className="text-[10px] text-violet-400 hover:text-violet-600"
                  >
                    닫기
                  </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {suggestedTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => handleAcceptTag(tag)}
                      className="px-2 py-0.5 text-xs bg-white text-violet-700 border border-violet-200 hover:bg-violet-100 rounded-full transition-colors"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Save Location */}
          {preview.type !== 'channel' && channels.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">저장 위치</label>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              <label className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded cursor-pointer">
                <input
                  type="radio"
                  name="channel"
                  checked={selectedChannelId === null}
                  onChange={() => setSelectedChannelId(null)}
                  className="text-primary-500"
                />
                <span className="text-sm">개별 영상 (홈)</span>
              </label>
              {channels.map((channel) => (
                <label
                  key={channel.id}
                  className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="radio"
                    name="channel"
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

        {/* Footer */}
        <div className="flex gap-2 p-3 sm:p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors min-h-[44px]"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors min-h-[44px]"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
