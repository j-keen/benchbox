# BenchBox

콘텐츠 크리에이터를 위한 벤치마킹 자료 관리 웹앱

YouTube, TikTok, Instagram 등 다양한 플랫폼의 영상을 저장하고, 채널/폴더별로 정리하며, 태그와 메모로 관리할 수 있는 웹 애플리케이션입니다.

## 라이브 데모

**https://client-three-bice.vercel.app**

## 주요 기능

- **URL 붙여넣기 저장**: URL만 붙여넣으면 자동으로 정보 추출 (제목, 썸네일, 채널 정보)
- **채널 관리**: 좋아하는 채널을 저장하고 해당 채널의 영상 모아보기
- **폴더 정리**: 폴더를 만들어 채널과 영상을 카테고리별로 분류
- **태그 시스템**: 영상과 채널에 해시태그 추가, 태그별 필터링
- **메모 기능**: 영상/채널에 개인 메모 작성
- **롱프레스 선택**: 모바일에서 길게 눌러 다중 선택 모드 진입
- **드래그 앤 드롭**: 채널을 폴더로, 영상을 채널로 이동

## 지원 플랫폼

- YouTube (일반 영상 + Shorts)
- TikTok
- Instagram Reels
- 샤오홍슈
- 기타 OG 태그 지원 사이트

## 기술 스택

### Frontend
- React 18 + Vite
- TailwindCSS
- React Router DOM
- Axios

### Backend
- Node.js + Express
- Supabase (PostgreSQL)
- Cheerio (OG 태그 파싱)

### 배포
- Frontend: Vercel
- Database: Supabase

## 시작하기

### 필수 요구사항
- Node.js 18+
- npm
- Supabase 계정

### 설치

```bash
# 저장소 클론
git clone https://github.com/your-username/benchbox.git
cd benchbox

# 서버 의존성 설치
cd server
npm install
cp .env.example .env
# .env 파일에 Supabase 정보 입력

# 클라이언트 의존성 설치
cd ../client
npm install
cp .env.example .env
# .env 파일에 Supabase 정보 입력
```

### Supabase 설정

1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. SQL Editor에서 테이블 생성 (상세 SQL은 PROJECT_CONTEXT.md 참조)
3. Project Settings > API에서 URL과 anon key 복사
4. `.env` 파일에 입력

### 실행

**Windows:**
```bash
start.bat
```

**수동 실행:**
```bash
# 서버 (터미널 1)
cd server && npm run dev

# 클라이언트 (터미널 2)
cd client && npm run dev
```

### 접속
- 프론트엔드: http://localhost:5173
- 백엔드 API: http://localhost:3000

## 폴더 구조

```
benchbox/
├── client/               # 프론트엔드 (React + Vite)
│   ├── src/
│   │   ├── components/   # 재사용 컴포넌트
│   │   ├── pages/        # 페이지 컴포넌트
│   │   ├── hooks/        # 커스텀 훅
│   │   ├── contexts/     # Context API
│   │   └── utils/        # 유틸 함수
│   └── ...
│
├── server/               # 백엔드 (Express)
│   ├── routes/           # API 라우트
│   ├── services/         # 비즈니스 로직
│   └── ...
│
├── start.bat             # Windows 실행 스크립트
├── PROJECT_CONTEXT.md    # 프로젝트 상세 문서
└── README.md
```

## API 엔드포인트

### 영상 (`/api/videos`)
- `GET /` - 영상 목록 조회 (필터: channel_id, platform, video_type, tag, search)
- `GET /:id` - 영상 상세 조회
- `POST /` - 영상 저장 (URL 자동 파싱)
- `PUT /:id` - 영상 수정 (메모, 태그 등)
- `DELETE /:id` - 영상 삭제

### 채널 (`/api/channels`)
- `GET /` - 채널 목록 조회
- `GET /:id` - 채널 상세 조회 (영상 포함)
- `POST /` - 채널 등록
- `PUT /:id` - 채널 수정
- `DELETE /:id` - 채널 삭제

### 폴더 (`/api/folders`)
- `GET /` - 폴더 목록 조회
- `GET /:id` - 폴더 상세 (채널, 영상 포함)
- `POST /` - 폴더 생성
- `PUT /:id` - 폴더 수정
- `DELETE /:id` - 폴더 삭제
- `POST /:id/channels` - 채널을 폴더로 이동

### 태그 (`/api/tags`)
- `GET /` - 태그 목록 조회
- `GET /autocomplete` - 태그 자동완성

### URL 파싱 (`/api/parse-url`)
- `POST /` - URL 정보 추출

## 배포

### Vercel (Frontend)

```bash
cd client
npm install -g vercel
vercel --prod
```

환경 변수 설정 필요:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 라이선스

MIT
