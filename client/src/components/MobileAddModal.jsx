import { useState, useRef } from 'react';
import SaveLocationPicker from './SaveLocationPicker';
import StarRating from './StarRating';
import CategoryButtons from './CategoryButtons';
import { getPlatformIcon, getPlatformColor, getPlatformName } from '../utils/platformIcons';
import { aiAssistApi, youtubeCommentsApi } from '../utils/api';
import useModalHistory from '../hooks/useModalHistory';

export default function MobileAddModal({ preview, channels, folders = [], currentChannelId, onSave, onClose, onChannelsChange, onFoldersChange }) {
  useModalHistory(true, onClose);
  const [memo, setMemo] = useState('');
  const [categories, setCategories] = useState([]);
  const [rating, setRating] = useState(3);
  const [selectedChannelId, setSelectedChannelId] = useState(currentChannelId || null);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [aiMemoLoading, setAiMemoLoading] = useState(false);
  const [originalMemo, setOriginalMemo] = useState(null);

  // YouTube 인기 댓글
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsDisabled, setCommentsDisabled] = useState(false);
  const [showComments, setShowComments] = useState(false);

  // 북마크 (로컬 — 아직 DB 저장 전)
  const [bookmarkedComments, setBookmarkedComments] = useState([]);
  // 각 항목: { author, text, likeCount, publishedAt, memo }

  // 메모 팝업
  const [memoPopup, setMemoPopup] = useState(null);
  const [memoPopupValue, setMemoPopupValue] = useState('');

  // 롱프레스
  const pressTimer = useRef(null);
  const isLongPress = useRef(false);

  const canSave = categories.length > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      url: preview.original_url || preview.url,
      channel_id: preview.type === 'channel' ? null : selectedChannelId,
      folder_id: preview.type === 'channel' ? null : selectedFolderId,
      isChannel: preview.type === 'channel',
      memo,
      categories,
      rating,
      bookmarkedComments,
      ...preview
    });
  };

  // 댓글 로드
  const handleLoadComments = async () => {
    if (comments.length > 0 || commentsDisabled) {
      setShowComments(!showComments);
      return;
    }
    setCommentsLoading(true);
    setShowComments(true);
    try {
      const result = await youtubeCommentsApi.getComments(preview.original_url || preview.url);
      if (result.error === 'API_KEY_MISSING') {
        alert('YouTube 댓글을 불러오려면 설정에서 Google API 키를 등록해주세요.');
        setShowComments(false);
      } else {
        setComments(result.comments || []);
        setCommentsDisabled(result.disabled || false);
      }
    } catch (error) {
      console.error('댓글 로드 오류:', error);
    } finally {
      setCommentsLoading(false);
    }
  };

  // 댓글이 북마크되었는지 확인 (로컬)
  const isCommentBookmarked = (comment) => {
    return bookmarkedComments.some(bc => bc.author === comment.author && bc.text === comment.text);
  };

  // 북마크된 댓글의 메모 가져오기
  const getBookmarkedComment = (comment) => {
    return bookmarkedComments.find(bc => bc.author === comment.author && bc.text === comment.text);
  };

  // 롱프레스: 포인터 다운
  const handleBookmarkPointerDown = (comment, idx) => {
    isLongPress.current = false;
    pressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      openMemoPopup(comment, idx);
    }, 400);
  };

  // 롱프레스: 포인터 업 (짧은 탭)
  const handleBookmarkPointerUp = (comment, idx) => {
    clearTimeout(pressTimer.current);
    if (isLongPress.current) return;
    if (isCommentBookmarked(comment)) {
      // 북마크 해제
      setBookmarkedComments(prev => prev.filter(bc => !(bc.author === comment.author && bc.text === comment.text)));
    } else {
      // 북마크 추가 (메모 없이)
      setBookmarkedComments(prev => [...prev, {
        author: comment.author,
        text: comment.text,
        likeCount: comment.likeCount || 0,
        publishedAt: comment.publishedAt || null,
        memo: '',
      }]);
    }
  };

  // 롱프레스: 포인터 떠남
  const handleBookmarkPointerLeave = () => {
    clearTimeout(pressTimer.current);
  };

  // 메모 팝업 열기
  const openMemoPopup = (comment, idx) => {
    const bookmarked = getBookmarkedComment(comment);
    setMemoPopup({ comment, idx });
    setMemoPopupValue(bookmarked?.memo || '');
  };

  // 메모 팝업 저장
  const handleMemoPopupSave = () => {
    if (!memoPopup) return;
    const { comment } = memoPopup;
    const existing = isCommentBookmarked(comment);
    if (existing) {
      // 메모 수정
      setBookmarkedComments(prev => prev.map(bc =>
        bc.author === comment.author && bc.text === comment.text
          ? { ...bc, memo: memoPopupValue }
          : bc
      ));
    } else {
      // 새로 북마크 + 메모
      setBookmarkedComments(prev => [...prev, {
        author: comment.author,
        text: comment.text,
        likeCount: comment.likeCount || 0,
        publishedAt: comment.publishedAt || null,
        memo: memoPopupValue,
      }]);
    }
    setMemoPopup(null);
    setMemoPopupValue('');
  };

  const handleLocationSelect = ({ channelId, folderId }) => {
    setSelectedChannelId(channelId);
    setSelectedFolderId(folderId);
    setShowLocationPicker(false);
  };

  const getLocationLabel = () => {
    if (selectedFolderId) {
      const folder = folders.find(f => f.id === selectedFolderId);
      return folder ? `📁 ${folder.name}` : '개별 영상 (홈)';
    }
    if (selectedChannelId) {
      const channel = channels.find(c => c.id === selectedChannelId);
      return channel ? `📺 ${channel.title}` : '개별 영상 (홈)';
    }
    return '개별 영상 (홈)';
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
          {/* 카테고리 (최상단) */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              카테고리 <span className="text-red-400">*</span>
            </label>
            <CategoryButtons
              selected={categories}
              onChange={setCategories}
              required={false}
            />
            {categories.length === 0 && (
              <p className="mt-1 text-[10px] text-red-400">최소 1개 카테고리를 선택해주세요</p>
            )}
          </div>

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
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-gray-500">메모</label>
                  <StarRating rating={rating} onChange={setRating} size="sm" />
                </div>
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

          {/* Save Location - 접힌 row */}
          {preview.type !== 'channel' && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">저장 위치</label>
              <button
                onClick={() => setShowLocationPicker(true)}
                className="w-full flex items-center justify-between p-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left"
              >
                <span className="text-sm text-gray-900 truncate">{getLocationLabel()}</span>
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}

          {/* 인기 댓글 (YouTube만) */}
          {preview.platform === 'youtube' && (
            <div>
              <button
                onClick={handleLoadComments}
                className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200"
              >
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  인기 댓글
                  {bookmarkedComments.length > 0 && (
                    <span className="text-[10px] text-amber-500 font-medium">({bookmarkedComments.length}개 북마크)</span>
                  )}
                </span>
                <svg className={`w-4 h-4 transition-transform ${showComments ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showComments && (
                <div className="mt-2 space-y-2">
                  {commentsLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : commentsDisabled ? (
                    <p className="text-xs text-gray-400 text-center py-3">이 영상은 댓글이 비활성화되어 있습니다.</p>
                  ) : comments.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-3">댓글이 없습니다.</p>
                  ) : (
                    comments.map((comment, idx) => (
                      <div key={idx} className="px-3 py-2 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-gray-700">{comment.author}</span>
                          <div className="flex items-center gap-1.5">
                            {comment.likeCount > 0 && (
                              <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                                </svg>
                                {comment.likeCount}
                              </span>
                            )}
                            <button
                              onPointerDown={() => handleBookmarkPointerDown(comment, idx)}
                              onPointerUp={() => handleBookmarkPointerUp(comment, idx)}
                              onPointerLeave={handleBookmarkPointerLeave}
                              onContextMenu={(e) => e.preventDefault()}
                              className="p-0.5 transition-colors select-none touch-none"
                              title={isCommentBookmarked(comment) ? '탭: 북마크 해제 / 길게 누르기: 메모' : '탭: 북마크 / 길게 누르기: 메모와 함께 북마크'}
                            >
                              {isCommentBookmarked(comment) ? (
                                <svg className="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                                </svg>
                              ) : (
                                <svg className="w-3.5 h-3.5 text-gray-400 hover:text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                </svg>
                              )}
                            </button>
                            {/* 데스크탑 메모 아이콘 - 북마크된 댓글에만 */}
                            {isCommentBookmarked(comment) && (
                              <button
                                onClick={() => openMemoPopup(comment, idx)}
                                className="hidden sm:inline-flex p-0.5 text-gray-400 hover:text-amber-500 transition-colors"
                                title="메모 편집"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 whitespace-pre-wrap line-clamp-4">{comment.text}</p>
                        {/* 북마크된 메모 표시 */}
                        {isCommentBookmarked(comment) && getBookmarkedComment(comment)?.memo && (
                          <div className="mt-1 px-2 py-1 bg-amber-50 rounded text-[10px] text-amber-700">
                            {getBookmarkedComment(comment).memo}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
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
            disabled={!canSave}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors min-h-[44px]"
          >
            저장
          </button>
        </div>
      </div>

      {/* 메모 팝업 모달 */}
      {memoPopup && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={() => setMemoPopup(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-[90vw] max-w-md p-4 mx-4" onClick={e => e.stopPropagation()}>
            {/* 댓글 미리보기 */}
            <div className="mb-3 px-3 py-2 bg-gray-50 rounded-lg">
              <span className="text-xs font-medium text-gray-700">{memoPopup.comment.author}</span>
              <p className="text-xs text-gray-600 mt-1 line-clamp-3 whitespace-pre-wrap">{memoPopup.comment.text}</p>
            </div>
            {/* 메모 입력 */}
            <textarea
              value={memoPopupValue}
              onChange={(e) => setMemoPopupValue(e.target.value)}
              placeholder="메모를 남겨보세요..."
              className="w-full min-h-[80px] p-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-transparent resize-none"
              autoFocus
            />
            {/* 버튼 */}
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => setMemoPopup(null)}
                className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleMemoPopupSave}
                className="px-3 py-1.5 text-xs bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
              >
                {isCommentBookmarked(memoPopup.comment) ? '메모 수정' : '메모와 함께 북마크'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SaveLocationPicker 서브 모달 */}
      {showLocationPicker && (
        <SaveLocationPicker
          channels={channels}
          folders={folders}
          selectedChannelId={selectedChannelId}
          selectedFolderId={selectedFolderId}
          onSelect={handleLocationSelect}
          onClose={() => setShowLocationPicker(false)}
          onChannelsChange={onChannelsChange}
          onFoldersChange={onFoldersChange}
        />
      )}
    </div>
  );
}
