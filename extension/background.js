// BenchBox Chrome Extension - Background Service Worker

// 확장 프로그램 설치 시
chrome.runtime.onInstalled.addListener(() => {
  console.log('BenchBox 확장 프로그램이 설치되었습니다.');
});
