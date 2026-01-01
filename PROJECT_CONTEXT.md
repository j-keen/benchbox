# BenchBox - 프로젝트 컨텍스트

## 프로젝트 개요

BenchBox는 콘텐츠 크리에이터가 영상 벤치마킹 자료를 효율적으로 관리할 수 있는 웹 애플리케이션입니다.

- **시작일**: 2024년 12월
- **현재 상태**: MVP 완료, 운영 중
- **배포 URL**: https://client-three-bice.vercel.app

---

## 프로젝트 구조

```
benchbox/
├── client/                          # React 프론트엔드
│   ├── api/
│   │   └── parse-url.js             # ⭐ Vercel Serverless Function (OG 파싱)
│   │
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChannelCard.jsx      # 채널 카드 (롱프레스 선택)
│   │   │   ├── VideoCard.jsx        # 영상 카드 (롱프레스 선택)
│   │   │   ├── FolderCard.jsx       # 폴더 카드
│   │   │   ├── VideoModal.jsx       # 영상 상세 모달
│   │   │   ├── FolderModal.jsx      # 폴더 생성/수정 모달
│   │   │   ├── QuickUrlModal.jsx    # URL 입력 모달
│   │   │   ├── BatchTagModal.jsx    # 일괄 태그 추가
│   │   │   ├── UrlInput.jsx         # URL 입력 컴포넌트
│   │   │   ├── TagInput.jsx         # 태그 입력/자동완성
│   │   │   └── NavigationTabs.jsx   # 네비게이션 탭
│   │   │
│   │   ├── pages/
│   │   │   ├── Home.jsx             # 메인 (폴더 + 전체 채널)
│   │   │   ├── FolderDetail.jsx     # 폴더 상세
│   │   │   ├── ChannelDetail.jsx    # 채널 상세
│   │   │   ├── AllChannelsPage.jsx  # 전체 채널 목록
│   │   │   └── AllVideosPage.jsx    # 전체 영상 목록
│   │   │
│   │   ├── contexts/
│   │   │   └── ToastContext.jsx     # 토스트 알림
│   │   │
│   │   ├── hooks/
│   │   │   ├── useKeyboardShortcuts.js  # 키보드 단축키
│   │   │   └── useLongPress.js      # 롱프레스 훅
│   │   │
│   │   └── utils/
│   │       ├── api.js               # ⭐ Supabase API + parseUrlApi
│   │       └── platformIcons.jsx    # 플랫폼 아이콘
│   │
│   ├── .env                         # 환경변수 (gitignore)
│   ├── .env.example                 # 환경변수 예시
│   ├── vercel.json                  # ⭐ Vercel 설정 (serverless function)
│   └── vite.config.js
│
├── server/                          # Express 백엔드
│   ├── routes/
│   │   ├── videos.js                # 영상 API
│   │   ├── channels.js              # 채널 API
│   │   ├── folders.js               # 폴더 API
│   │   ├── tags.js                  # 태그 API
│   │   └── parseUrl.js              # URL 파싱 API
│   │
│   ├── services/
│   │   ├── supabase.js              # Supabase 클라이언트
│   │   └── urlParser.js             # URL 파싱 로직
│   │
│   ├── .env                         # 환경변수 (gitignore)
│   ├── .env.example                 # 환경변수 예시
│   └── index.js                     # 서버 엔트리
│
├── .gitignore
├── README.md
├── PROJECT_CONTEXT.md               # 이 파일
└── start.bat                        # Windows 실행 스크립트
```

---

## 데이터베이스 스키마 (Supabase)

```sql
-- 폴더 테이블
CREATE TABLE folders (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#6366f1',
  cover_image TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 채널 테이블
CREATE TABLE channels (
  id SERIAL PRIMARY KEY,
  platform VARCHAR(50) NOT NULL,        -- youtube, tiktok, instagram, xiaohongshu
  platform_id VARCHAR(255),
  url TEXT NOT NULL,
  title VARCHAR(255),
  description TEXT,
  thumbnail TEXT,
  memo TEXT,
  folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 영상 테이블
CREATE TABLE videos (
  id SERIAL PRIMARY KEY,
  platform VARCHAR(50) NOT NULL,
  platform_id VARCHAR(255),
  url TEXT NOT NULL,
  title VARCHAR(255),
  description TEXT,
  thumbnail TEXT,
  video_type VARCHAR(20) DEFAULT 'long',  -- long, shorts
  memo TEXT,
  tags TEXT[] DEFAULT '{}',
  channel_id INTEGER REFERENCES channels(id) ON DELETE CASCADE,
  folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL,
  source_type VARCHAR(20) DEFAULT 'channel',  -- channel, folder
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 태그 테이블
CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL
);

-- 채널-태그 관계
CREATE TABLE channel_tags (
  channel_id INTEGER REFERENCES channels(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (channel_id, tag_id)
);

-- video_count 가상 컬럼을 위한 뷰 또는 서브쿼리 사용
```

---

## 완료된 기능 (v1.0)

### 핵심 기능
- [x] URL 붙여넣기로 영상/채널 자동 저장
- [x] YouTube, TikTok, Instagram, 샤오홍슈 지원
- [x] 폴더 생성/수정/삭제
- [x] 채널 관리 (폴더 분류, 태그, 메모)
- [x] 영상 관리 (채널별 분류, 태그, 메모)
- [x] 전체 채널/영상 목록 페이지
- [x] 검색 및 필터링 (플랫폼, 태그, 영상 타입)
- [x] 태그 자동완성

### UI/UX
- [x] 반응형 디자인 (모바일/태블릿/데스크톱)
- [x] 롱프레스로 다중 선택 모드 (모바일)
- [x] 드래그 앤 드롭 (채널 → 폴더)
- [x] 토스트 알림
- [x] 영상 임베드 재생 (YouTube)
- [x] 모바일 최적화 레이아웃 (컴팩트 UI)
- [x] 하단 시트 스타일 모달 (모바일)

### 배포
- [x] Supabase 데이터베이스 연동
- [x] Vercel 프론트엔드 배포
- [x] 환경변수 분리

---

## ⭐ 핵심 기능: OG 태그 파싱 (URL 정보 추출)

**중요**: 이 기능은 URL 붙여넣기 시 제목/썸네일/설명을 자동으로 가져오는 핵심 기능입니다.
카카오톡에서 링크 공유 시 미리보기가 뜨는 것과 같은 원리입니다.

### 동작 흐름

```
사용자 URL 입력
       ↓
parseUrlApi.parse(url) 호출
       ↓
┌─────────────────────────────────────┐
│ 1. Vercel Serverless Function 호출  │
│    POST /api/parse-url              │
│    (서버 사이드에서 OG 태그 파싱)    │
└─────────────────────────────────────┘
       ↓ 실패 시
┌─────────────────────────────────────┐
│ 2. 클라이언트 폴백                   │
│    (YouTube만 가능 - 썸네일 URL 직접 생성) │
└─────────────────────────────────────┘
       ↓
{ platform, type, title, thumbnail, description } 반환
       ↓
videosApi.create() 또는 channelsApi.create()로 DB 저장
```

### 파일별 역할

| 파일 | 역할 |
|------|------|
| `client/api/parse-url.js` | **Vercel Serverless Function** - 배포 시 서버 역할 |
| `client/src/utils/api.js` | `parseUrlApi` 객체 - 서버 호출 + 폴백 로직 |
| `client/vercel.json` | Vercel 설정 - `/api/*` 라우팅 |
| `server/routes/parseUrl.js` | 로컬 개발용 서버 API |
| `server/services/ogParser.js` | 로컬 개발용 OG 파싱 로직 |

### Serverless Function 상세 (`client/api/parse-url.js`)

```javascript
// 플랫폼별 처리
- YouTube: 비디오 ID 추출 → 썸네일 직접 생성 + OG 태그로 제목
- TikTok: oEmbed API 사용 (https://www.tiktok.com/oembed?url=...)
- Instagram: OG 태그 파싱
- 기타: 일반 OG 태그 파싱

// YouTube 썸네일 URL 패턴
https://img.youtube.com/vi/${videoId}/maxresdefault.jpg
```

### 의존성

**client/package.json에 필수**:
```json
{
  "dependencies": {
    "axios": "^1.6.2",
    "cheerio": "^1.0.0-rc.12"  // HTML 파싱용
  }
}
```

### 주의사항

1. **모든 페이지에서 parseUrlApi 사용 필수**
   - Home.jsx
   - FolderDetail.jsx
   - ChannelDetail.jsx
   - AllChannelsPage.jsx
   - AllVideosPage.jsx

   각 페이지의 URL 저장 함수에서 반드시 `parseUrlApi.parse(url)` 호출 후 결과를 DB에 저장해야 함

2. **환경변수 (Vercel)**
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

   Vercel 대시보드 → Settings → Environment Variables에 설정 필요
   (.env 파일은 gitignore되어 배포 시 포함 안됨)

3. **vercel.json 필수**
   ```json
   {
     "rewrites": [
       { "source": "/api/:path*", "destination": "/api/:path*" },
       { "source": "/(.*)", "destination": "/" }
     ],
     "functions": {
       "api/parse-url.js": { "maxDuration": 30 }
     }
   }
   ```

4. **CORS 문제**
   - 클라이언트에서 직접 외부 사이트 OG 태그 파싱 불가 (CORS 차단)
   - 반드시 서버 사이드(Serverless Function)에서 처리해야 함
   - 이것이 `client/api/parse-url.js`가 필요한 이유

---

## 진행 중 / 개선 예정

### 우선순위 높음
- [ ] 사용자 인증 (Supabase Auth)
- [ ] 다중 사용자 지원
- [ ] PWA 지원 (오프라인 + 앱 설치)

### 우선순위 중간
- [ ] TikTok/Instagram 임베드 재생
- [ ] 영상 썸네일 갱신 기능
- [ ] 채널 정보 자동 갱신
- [ ] 데이터 내보내기 (JSON/CSV)

### 우선순위 낮음
- [ ] 다크 모드
- [ ] 커스텀 테마
- [ ] 통계 대시보드

---

## 로컬 개발 환경 설정

### 1. 의존성 설치

```bash
# 서버
cd server
npm install

# 클라이언트
cd ../client
npm install
```

### 2. 환경변수 설정

**server/.env**
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

**client/.env**
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Supabase 테이블 생성

위의 SQL 스키마를 Supabase SQL Editor에서 실행

### 4. 개발 서버 실행

```bash
# 터미널 1 - 서버
cd server && npm run dev

# 터미널 2 - 클라이언트
cd client && npm run dev
```

또는 Windows에서:
```bash
start.bat
```

---

## 배포 가이드

### Vercel (프론트엔드)

```bash
cd client
vercel --prod
```

**환경변수 설정** (Vercel 대시보드):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### 백엔드

현재 백엔드는 로컬 개발용입니다.
프로덕션에서는 클라이언트에서 직접 Supabase API를 호출합니다.

---

## 주요 코드 위치

| 기능 | 파일 |
|------|------|
| API 클라이언트 | `client/src/utils/api.js` |
| **OG 파싱 (배포)** | `client/api/parse-url.js` ⭐ |
| **OG 파싱 (로컬)** | `server/services/ogParser.js` |
| **Vercel 설정** | `client/vercel.json` ⭐ |
| URL 분석 | `server/services/urlAnalyzer.js` |
| 롱프레스 선택 | `client/src/components/VideoCard.jsx` (handleTouchStart/End) |
| 영상 모달 | `client/src/components/VideoModal.jsx` |
| 폴더 상세 | `client/src/pages/FolderDetail.jsx` |
| 채널 상세 | `client/src/pages/ChannelDetail.jsx` |
| Supabase 연결 | `client/src/utils/api.js` (supabase 객체) |

---

## 알려진 이슈

1. **TikTok/Instagram 임베드**: 외부 플랫폼 정책으로 임베드 불가, 썸네일만 표시
2. **브라우저 뒤로가기**: SPA 첫 진입 시 히스토리가 없어 브라우저 밖으로 나갈 수 있음
3. **샤오홍슈 파싱**: 일부 URL에서 정보 추출 실패 가능

---

## 최근 변경 이력

### 2026-01-01 (오후)

- **Git 브랜치 워크플로우 설정**: `dev` 브랜치 생성
  - `dev`: 작업용 (GitHub 동기화, 배포 안됨)
  - `main`: 배포용 (Vercel 자동 배포)
- **커스텀 Claude 명령어 추가**: `.claude/commands/`
  - `/save`: 작업 저장 및 GitHub 동기화 (배포 안함)
  - `/deploy`: main에 병합하여 Vercel 배포

### 2026-01-01

- **⭐ Vercel Serverless Function 추가**: `client/api/parse-url.js` 생성
  - 배포 환경에서 OG 태그 파싱 가능하게 함
  - YouTube, TikTok(oEmbed), Instagram 지원
  - cheerio로 HTML 파싱
- **⭐ vercel.json 설정 추가**: API 라우팅 및 함수 설정
- **⭐ parseUrlApi 개선**: 서버 API 우선 호출 → 실패 시 클라이언트 폴백
- **모든 페이지에 parseUrlApi 적용**: FolderDetail, ChannelDetail, AllChannelsPage, AllVideosPage
- **406 에러 수정**: URL 특수문자로 인한 Supabase 쿼리 에러 → `.maybeSingle()` 사용
- **cheerio 의존성 추가**: client/package.json에 추가

### 2025-01-01

- **YouTube 썸네일 직접 생성**: ogParser.js에 fetchYouTubeInfo(), extractYouTubeVideoId() 추가 (비디오 ID에서 썸네일 URL 직접 생성, YouTube Shorts 지원)
- **OG 태그 파싱 연동**: 클라이언트 parseUrlApi가 서버 /api/parse-url 호출
- **메타데이터 저장 기능**: title, thumbnail, description을 DB에 저장 (videosApi/channelsApi.create() 수정)
- **VideoCard 설명 표시**: description 필드 표시 추가
- **YouTube 임베드 실패 처리**: VideoModal에 embedFailed 상태 및 "재생 안됨?" 버튼 추가
- **버튼 중첩 경고 수정**: Home.jsx에서 폴더 탭 버튼을 div role="button"으로 변경
- **클라이언트 환경변수 설정**: client/.env 파일 생성
- **서버 DB 클라이언트 생성**: server/db/database.js 파일 추가

### 2024-12-31
- 모바일 레이아웃 개선 (ChannelDetail, VideoModal)
- 롱프레스 선택 버그 수정
- Vercel 재배포

### 2024-12-30
- Supabase 전환 완료
- 기존 SQLite 데이터 마이그레이션
- 모바일 반응형 UI 개선
- 폴더 직접 영상 저장 기능

---

## 연락처

프로젝트 관련 문의는 GitHub Issues를 이용해주세요.
