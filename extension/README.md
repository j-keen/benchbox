# BenchBox Chrome Extension

YouTube, TikTok, Instagram 영상을 BenchBox에 빠르게 저장하는 Chrome 확장 프로그램입니다.

## 설치 방법

### 1. 아이콘 생성
1. `generate-icons.html` 파일을 브라우저에서 열기
2. 각 크기별 "다운로드" 버튼 클릭하여 `icons/` 폴더에 저장:
   - `icon16.png`
   - `icon48.png`
   - `icon128.png`

### 2. Chrome에 로드
1. Chrome 브라우저에서 `chrome://extensions/` 접속
2. 우측 상단의 **개발자 모드** 활성화
3. **압축해제된 확장 프로그램을 로드합니다** 클릭
4. `extension` 폴더 선택

### 3. 서버 URL 설정
1. 확장 프로그램 아이콘 클릭
2. BenchBox 서버 URL 입력 (예: `https://your-app.vercel.app`)
3. 저장 클릭

## 사용 방법

1. YouTube/TikTok/Instagram에서 저장하고 싶은 영상 또는 채널 페이지로 이동
2. 확장 프로그램 아이콘 클릭
3. 저장 유형 선택 (영상/채널)
4. 폴더 또는 채널 선택 (선택사항)
5. **저장하기** 클릭

## 지원 플랫폼

- **YouTube**: 일반 영상, Shorts, 채널
- **TikTok**: 영상, 프로필
- **Instagram**: Reels, 포스트, 프로필

## 개발

```
extension/
├── manifest.json      # 확장 프로그램 설정
├── popup.html         # 팝업 UI
├── popup.css          # 팝업 스타일
├── popup.js           # 팝업 로직
├── background.js      # 서비스 워커
└── icons/             # 아이콘 파일
```
