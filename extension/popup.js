// BenchBox Chrome Extension - Popup Script

const STORAGE_KEY = 'benchbox_server_url';
const DEFAULT_SERVER = 'http://localhost:3001'; // 개발용

// 상태
let state = {
  serverUrl: '',
  currentUrl: '',
  urlInfo: null,
  saveType: 'video', // 'video' | 'channel'
  folders: [],
  channels: [],
  selectedFolder: '',
  selectedChannel: ''
};

// DOM 요소
const views = {
  setup: document.getElementById('setupView'),
  unsupported: document.getElementById('unsupportedView'),
  main: document.getElementById('mainView'),
  success: document.getElementById('successView'),
  error: document.getElementById('errorView')
};

// 초기화
document.addEventListener('DOMContentLoaded', init);

async function init() {
  // 서버 URL 로드
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  state.serverUrl = stored[STORAGE_KEY] || '';

  // 현재 탭 URL 가져오기
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  state.currentUrl = tab?.url || '';

  // URL 분석
  state.urlInfo = parseUrl(state.currentUrl);

  // 이벤트 리스너 등록
  setupEventListeners();

  // 뷰 결정
  if (!state.serverUrl) {
    showView('setup');
  } else if (!state.urlInfo.supported) {
    showView('unsupported');
  } else {
    await loadDataAndShowMain();
  }
}

function setupEventListeners() {
  // 서버 URL 저장
  document.getElementById('saveServerBtn').addEventListener('click', saveServerUrl);

  // 저장 타입 토글
  document.getElementById('typeVideo').addEventListener('click', () => setType('video'));
  document.getElementById('typeChannel').addEventListener('click', () => setType('channel'));

  // 폴더/채널 선택
  document.getElementById('folderSelect').addEventListener('change', (e) => {
    state.selectedFolder = e.target.value;
  });
  document.getElementById('channelSelect').addEventListener('change', (e) => {
    state.selectedChannel = e.target.value;
  });

  // 저장 버튼
  document.getElementById('saveBtn').addEventListener('click', handleSave);

  // 성공 화면 버튼
  document.getElementById('openBenchboxBtn').addEventListener('click', openBenchbox);

  // 에러 화면 재시도
  document.getElementById('retryBtn').addEventListener('click', () => showView('main'));

  // 설정 버튼
  document.getElementById('settingsBtn').addEventListener('click', () => showView('setup'));
}

// URL 파싱
function parseUrl(url) {
  const result = {
    supported: false,
    platform: '',
    type: 'video', // 'video' | 'channel'
    isShorts: false
  };

  if (!url) return result;

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    // YouTube
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      result.supported = true;
      result.platform = 'YouTube';

      if (url.includes('/shorts/')) {
        result.isShorts = true;
        result.type = 'video';
      } else if (url.includes('/watch') || hostname === 'youtu.be') {
        result.type = 'video';
      } else if (url.includes('/@') || url.includes('/channel/') || url.includes('/c/')) {
        result.type = 'channel';
      } else {
        result.supported = false;
      }
    }
    // TikTok
    else if (hostname.includes('tiktok.com')) {
      result.supported = true;
      result.platform = 'TikTok';

      if (url.includes('/video/')) {
        result.type = 'video';
      } else if (url.includes('/@') && !url.includes('/video/')) {
        result.type = 'channel';
      } else {
        result.supported = false;
      }
    }
    // Instagram
    else if (hostname.includes('instagram.com')) {
      result.supported = true;
      result.platform = 'Instagram';

      if (url.includes('/reel/') || url.includes('/p/')) {
        result.type = 'video';
      } else if (url.match(/instagram\.com\/[^\/]+\/?$/)) {
        result.type = 'channel';
      } else {
        result.supported = false;
      }
    }
  } catch (e) {
    console.error('URL 파싱 오류:', e);
  }

  return result;
}

// 뷰 전환
function showView(viewName) {
  Object.keys(views).forEach(key => {
    views[key].classList.toggle('hidden', key !== viewName);
  });
}

// 서버 URL 저장
async function saveServerUrl() {
  const input = document.getElementById('serverUrlInput');
  let url = input.value.trim();

  if (!url) {
    alert('URL을 입력해주세요');
    return;
  }

  // URL 정규화
  if (!url.startsWith('http')) {
    url = 'https://' + url;
  }
  url = url.replace(/\/$/, ''); // 끝 슬래시 제거

  state.serverUrl = url;
  await chrome.storage.local.set({ [STORAGE_KEY]: url });

  if (state.urlInfo.supported) {
    await loadDataAndShowMain();
  } else {
    showView('unsupported');
  }
}

// 데이터 로드 및 메인 화면 표시
async function loadDataAndShowMain() {
  try {
    // 폴더와 채널 목록 로드
    const [foldersRes, channelsRes] = await Promise.all([
      fetchApi('/api/folders'),
      fetchApi('/api/channels')
    ]);

    state.folders = foldersRes.folders || [];
    state.channels = channelsRes.channels || [];

    // UI 업데이트
    updateMainView();
    showView('main');

  } catch (error) {
    console.error('데이터 로드 오류:', error);
    showError('서버에 연결할 수 없습니다. URL을 확인해주세요.');
  }
}

// 메인 뷰 업데이트
function updateMainView() {
  // URL 타입 배지
  const badge = document.getElementById('urlType');
  badge.textContent = state.urlInfo.type === 'channel' ? '채널' : '영상';
  badge.classList.toggle('channel', state.urlInfo.type === 'channel');

  // 썸네일 & 제목 (실제로는 메타데이터 파싱 필요)
  document.getElementById('thumbnail').src = '';
  document.getElementById('title').textContent = state.currentUrl;
  document.getElementById('platform').textContent = state.urlInfo.platform;

  // 저장 타입 설정
  setType(state.urlInfo.type);

  // 폴더 셀렉트 채우기
  const folderSelect = document.getElementById('folderSelect');
  folderSelect.innerHTML = '<option value="">폴더 없음</option>';
  state.folders.forEach(folder => {
    const option = document.createElement('option');
    option.value = folder.id;
    option.textContent = folder.name;
    folderSelect.appendChild(option);
  });

  // 채널 셀렉트 채우기
  const channelSelect = document.getElementById('channelSelect');
  channelSelect.innerHTML = '<option value="">채널 없음 (개별 저장)</option>';
  state.channels.forEach(channel => {
    const option = document.createElement('option');
    option.value = channel.id;
    option.textContent = channel.title;
    channelSelect.appendChild(option);
  });
}

// 저장 타입 설정
function setType(type) {
  state.saveType = type;

  document.getElementById('typeVideo').classList.toggle('active', type === 'video');
  document.getElementById('typeChannel').classList.toggle('active', type === 'channel');

  // 채널 선택은 영상일 때만 표시
  document.getElementById('channelGroup').classList.toggle('hidden', type === 'channel');
}

// 저장 처리
async function handleSave() {
  const btn = document.getElementById('saveBtn');
  const btnText = btn.querySelector('.btn-text');
  const btnLoading = btn.querySelector('.btn-loading');

  try {
    btn.disabled = true;
    btnText.classList.add('hidden');
    btnLoading.classList.remove('hidden');

    if (state.saveType === 'channel') {
      await saveChannel();
    } else {
      await saveVideo();
    }

    showView('success');

  } catch (error) {
    console.error('저장 오류:', error);
    showError(error.message || '저장에 실패했습니다');
  } finally {
    btn.disabled = false;
    btnText.classList.remove('hidden');
    btnLoading.classList.add('hidden');
  }
}

// 채널 저장
async function saveChannel() {
  const data = {
    url: state.currentUrl
  };

  if (state.selectedFolder) {
    data.folder_id = state.selectedFolder;
  }

  await fetchApi('/api/channels', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

// 영상 저장
async function saveVideo() {
  const data = {
    url: state.currentUrl
  };

  if (state.selectedChannel) {
    data.channel_id = state.selectedChannel;
  }

  if (state.selectedFolder) {
    data.folder_id = state.selectedFolder;
  }

  await fetchApi('/api/videos', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

// API 호출 헬퍼
async function fetchApi(endpoint, options = {}) {
  const url = state.serverUrl + endpoint;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// 에러 표시
function showError(message) {
  document.getElementById('errorMessage').textContent = message;
  showView('error');
}

// BenchBox 열기
function openBenchbox() {
  chrome.tabs.create({ url: state.serverUrl });
}
