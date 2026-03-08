import { useState } from 'react';
import { channelsApi, foldersApi } from '../utils/api';
import { FOLDER_COLORS } from './FolderModal';

export default function SaveLocationPicker({
  channels, folders, selectedChannelId, selectedFolderId,
  onSelect, onClose, onChannelsChange, onFoldersChange
}) {
  const [activeTab, setActiveTab] = useState(selectedFolderId ? 'folder' : 'channel');
  const [tempChannelId, setTempChannelId] = useState(selectedChannelId);
  const [tempFolderId, setTempFolderId] = useState(selectedFolderId);

  // 인라인 생성 상태
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [creatingChannel, setCreatingChannel] = useState(false);

  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLORS[0]);
  const [creatingFolder, setCreatingFolder] = useState(false);

  const handleChannelSelect = (id) => {
    setTempChannelId(id);
    setTempFolderId(null);
  };

  const handleFolderSelect = (id) => {
    setTempFolderId(id);
    setTempChannelId(null);
  };

  const handleConfirm = () => {
    onSelect({ channelId: tempChannelId, folderId: tempFolderId });
  };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim() || creatingChannel) return;
    setCreatingChannel(true);
    try {
      const response = await channelsApi.create({
        url: `manual://${Date.now()}`,
        title: newChannelName.trim()
      });
      const newChannel = { ...response.data, video_count: 0 };
      onChannelsChange(prev => [newChannel, ...prev]);
      setTempChannelId(newChannel.id);
      setTempFolderId(null);
      setShowNewChannel(false);
      setNewChannelName('');
    } catch (error) {
      console.error('채널 생성 오류:', error);
    } finally {
      setCreatingChannel(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || creatingFolder) return;
    setCreatingFolder(true);
    try {
      const response = await foldersApi.create({
        name: newFolderName.trim(),
        color: newFolderColor
      });
      const newFolder = { ...response.data, video_count: 0, channel_count: 0 };
      onFoldersChange(prev => [newFolder, ...prev]);
      setTempFolderId(newFolder.id);
      setTempChannelId(null);
      setShowNewFolder(false);
      setNewFolderName('');
      setNewFolderColor(FOLDER_COLORS[0]);
    } catch (error) {
      console.error('폴더 생성 오류:', error);
    } finally {
      setCreatingFolder(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl sm:rounded-xl w-full sm:max-w-md max-h-[70vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 모바일 드래그 핸들 */}
        <div className="sm:hidden flex justify-center py-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">저장 위치 선택</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('channel')}
            className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${
              activeTab === 'channel'
                ? 'text-primary-600 border-b-2 border-primary-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📺 채널
          </button>
          <button
            onClick={() => setActiveTab('folder')}
            className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${
              activeTab === 'folder'
                ? 'text-primary-600 border-b-2 border-primary-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📁 폴더
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {activeTab === 'channel' ? (
            <>
              {/* 개별 영상 (홈) - 채널 탭 기본값 */}
              <button
                onClick={() => handleChannelSelect(null)}
                className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors ${
                  tempChannelId === null && tempFolderId === null
                    ? 'bg-primary-50 border border-primary-200'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  tempChannelId === null && tempFolderId === null
                    ? 'border-primary-500'
                    : 'border-gray-300'
                }`}>
                  {tempChannelId === null && tempFolderId === null && (
                    <div className="w-2 h-2 rounded-full bg-primary-500"></div>
                  )}
                </div>
                <span className="text-sm text-gray-900">개별 영상 (홈)</span>
              </button>

              {/* 채널 목록 */}
              {channels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => handleChannelSelect(channel.id)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors ${
                    tempChannelId === channel.id
                      ? 'bg-primary-50 border border-primary-200'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    tempChannelId === channel.id ? 'border-primary-500' : 'border-gray-300'
                  }`}>
                    {tempChannelId === channel.id && (
                      <div className="w-2 h-2 rounded-full bg-primary-500"></div>
                    )}
                  </div>
                  <span className="text-sm text-gray-900 flex-1 truncate">{channel.title}</span>
                  <span className="text-xs text-gray-400 flex-shrink-0">영상 {channel.video_count ?? 0}개</span>
                </button>
              ))}

              {/* 새 채널 만들기 */}
              {showNewChannel ? (
                <div className="p-2.5 bg-gray-50 rounded-lg space-y-2">
                  <input
                    type="text"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    placeholder="채널 이름 입력"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateChannel()}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setShowNewChannel(false); setNewChannelName(''); }}
                      className="flex-1 px-3 py-1.5 text-xs text-gray-600 bg-white border border-gray-200 rounded-lg"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleCreateChannel}
                      disabled={!newChannelName.trim() || creatingChannel}
                      className="flex-1 px-3 py-1.5 text-xs text-white bg-primary-500 rounded-lg disabled:opacity-50"
                    >
                      {creatingChannel ? '생성 중...' : '만들기'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewChannel(true)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg text-left text-primary-600 hover:bg-primary-50 transition-colors"
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-sm font-medium">새 채널 만들기</span>
                </button>
              )}
            </>
          ) : (
            <>
              {/* 폴더 목록 */}
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => handleFolderSelect(folder.id)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors ${
                    tempFolderId === folder.id
                      ? 'bg-primary-50 border border-primary-200'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    tempFolderId === folder.id ? 'border-primary-500' : 'border-gray-300'
                  }`}>
                    {tempFolderId === folder.id && (
                      <div className="w-2 h-2 rounded-full bg-primary-500"></div>
                    )}
                  </div>
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: folder.color }}
                  ></span>
                  <span className="text-sm text-gray-900 flex-1 truncate">{folder.name}</span>
                  <span className="text-xs text-gray-400 flex-shrink-0">영상 {folder.video_count ?? 0}개</span>
                </button>
              ))}

              {folders.length === 0 && !showNewFolder && (
                <p className="text-sm text-gray-400 text-center py-4">아직 폴더가 없습니다</p>
              )}

              {/* 새 폴더 만들기 */}
              {showNewFolder ? (
                <div className="p-2.5 bg-gray-50 rounded-lg space-y-2">
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="폴더 이름 입력"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {FOLDER_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewFolderColor(c)}
                        className={`w-6 h-6 rounded-full transition-transform ${
                          newFolderColor === c ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : 'hover:scale-110'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setShowNewFolder(false); setNewFolderName(''); }}
                      className="flex-1 px-3 py-1.5 text-xs text-gray-600 bg-white border border-gray-200 rounded-lg"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleCreateFolder}
                      disabled={!newFolderName.trim() || creatingFolder}
                      className="flex-1 px-3 py-1.5 text-xs text-white bg-primary-500 rounded-lg disabled:opacity-50"
                    >
                      {creatingFolder ? '생성 중...' : '만들기'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewFolder(true)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg text-left text-primary-600 hover:bg-primary-50 transition-colors"
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-sm font-medium">새 폴더 만들기</span>
                </button>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-200">
          <button
            onClick={handleConfirm}
            className="w-full px-4 py-2.5 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors min-h-[44px]"
          >
            선택 완료
          </button>
        </div>
      </div>
    </div>
  );
}
