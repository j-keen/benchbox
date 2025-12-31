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
│   │       ├── api.js               # Axios API 클라이언트
│   │       └── platformIcons.jsx    # 플랫폼 아이콘
│   │
│   ├── .env                         # 환경변수 (gitignore)
│   ├── .env.example                 # 환경변수 예시
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
| URL 파싱 | `server/services/urlParser.js` |
| 롱프레스 선택 | `client/src/components/VideoCard.jsx` (handleTouchStart/End) |
| 영상 모달 | `client/src/components/VideoModal.jsx` |
| 폴더 상세 | `client/src/pages/FolderDetail.jsx` |
| 채널 상세 | `client/src/pages/ChannelDetail.jsx` |
| Supabase 연결 | `server/services/supabase.js` |

---

## 알려진 이슈

1. **TikTok/Instagram 임베드**: 외부 플랫폼 정책으로 임베드 불가, 썸네일만 표시
2. **브라우저 뒤로가기**: SPA 첫 진입 시 히스토리가 없어 브라우저 밖으로 나갈 수 있음
3. **샤오홍슈 파싱**: 일부 URL에서 정보 추출 실패 가능

---

## 최근 변경 이력

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
