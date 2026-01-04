// BenchBox Chrome Extension - Background Service Worker

// 확장 프로그램 설치 시
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('BenchBox 확장 프로그램이 설치되었습니다.');
  }
});

// 컨텍스트 메뉴 생성 (우클릭 메뉴)
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'saveToBenchbox',
    title: 'BenchBox에 저장',
    contexts: ['page', 'link']
  });
});

// 컨텍스트 메뉴 클릭 처리
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'saveToBenchbox') {
    const url = info.linkUrl || info.pageUrl;

    // 팝업 열기 (현재 탭의 URL로)
    chrome.action.openPopup();
  }
});
