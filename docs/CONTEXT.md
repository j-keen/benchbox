# BenchBox 프로젝트 컨텍스트

## 프로젝트 개요
**BenchBox** - 콘텐츠 크리에이터를 위한 벤치마킹 콘텐츠 관리 웹앱

URL을 붙여넣으면 자동으로 메타데이터를 추출하여 저장하고, 태그와 폴더로 정리할 수 있는 앱.

## 기술 스택
- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: SQLite (sql.js - 순수 JavaScript 구현)
- **주요 라이브러리**: axios, react-router-dom

## 프로젝트 구조
```
benchbox/
├── client/                 # React 프론트엔드
│   ├── src/
│   │   ├── components/    # 재사용 컴포넌트
│   │   │   ├── VideoCard.jsx      # 영상 카드 (숏폼/롱폼 구분)
│   │   │   ├── ChannelCard.jsx    # 채널 카드
│   │   │   ├── FolderCard.jsx     # 폴더 카드
│   │   │   └── ...
│   │   ├── pages/         # 페이지 컴포넌트
│   │   │   ├── Home.jsx           # 메인 페이지 (Masonry 레이아웃)
│   │   │   └── ChannelDetail.jsx  # 채널 상세 페이지
│   │   └── utils/
│   │       ├── api.js             # API 클라이언트
│   │       └── platformIcons.jsx  # 플랫폼 아이콘
│   └── package.json
├── server/                 # Express 백엔드
│   ├── routes/
│   │   ├── videos.js      # 영상 CRUD API
│   │   ├── channels.js    # 채널 CRUD API
│   │   ├── folders.js     # 폴더 CRUD API
│   │   └── tags.js        # 태그 API
│   ├── services/
│   │   ├── urlAnalyzer.js # URL 분석 (플랫폼, 숏폼/롱폼 판별)
│   │   └── ogParser.js    # OG 태그 파싱
│   ├── db/
│   │   ├── database.js    # sql.js 래퍼
│   │   ├── schema.sql     # DB 스키마
│   │   └── database.sqlite # SQLite DB 파일
│   └── package.json
└── docs/                   # 문서
```

## 현재 완료된 기능

### 핵심 기능
- [x] URL 붙여넣기 → OG 태그 자동 추출 → 저장
- [x] 채널/영상 CRUD
- [x] 폴더로 채널 정리
- [x] 태그 시스템 (자동완성, 채널별 추천)
- [x] 검색 기능 (제목, 메모, 태그)

### UI/UX
- [x] 체크박스 선택 모드 (호버 시 표시)
- [x] 다중 선택 삭제
- [x] 캐러셀 내비게이션
- [x] Masonry 레이아웃 (숏폼/롱폼 혼합 표시)

### 플랫폼 지원
- [x] YouTube (shorts/long 구분)
- [x] TikTok (모두 shorts)
- [x] Instagram (reel=shorts, p=long)
- [x] 샤오홍슈 (모두 shorts)

### 최근 수정 (2025-12-29)
- [x] 숏폼/롱폼 URL 패턴 분석 추가
- [x] VideoCard에 영상 타입별 썸네일 비율 적용 (16:9 vs 9:16)
- [x] Masonry 레이아웃 적용
- [x] **삭제 기능 버그 수정** - `db.getRowsModified()` 호출 시점 수정

## 알려진 이슈

### 해결됨
- ~~삭제 시 404 오류~~ → database.js의 `changes` 반환값 수정으로 해결

### 미해결
- 없음

## 다음 세션에서 할 일

### 즉시 확인 필요
1. **브라우저에서 삭제 기능 테스트**
   - 서버 재시작 완료됨
   - 브라우저 새로고침 후 채널/영상 추가하고 삭제 테스트

### 추가 개선 가능 항목
1. **영상 타입 필터** - 숏폼/롱폼만 필터링하는 기능
2. **일괄 태그 추가** - 선택한 여러 영상에 태그 일괄 적용
3. **드래그 앤 드롭** - 폴더 간 채널 이동
4. **데이터 백업/복원** - SQLite 파일 내보내기/가져오기

## 서버 실행 방법
```bash
# 백엔드 (포트 3001)
cd benchbox/server
npm start

# 프론트엔드 (포트 5173)
cd benchbox/client
npm run dev
```

## 중요 파일 참조

| 기능 | 파일 경로 |
|------|----------|
| URL 분석 | `server/services/urlAnalyzer.js` |
| DB 래퍼 | `server/db/database.js` |
| 영상 카드 | `client/src/components/VideoCard.jsx` |
| 메인 페이지 | `client/src/pages/Home.jsx` |
| API 클라이언트 | `client/src/utils/api.js` |
