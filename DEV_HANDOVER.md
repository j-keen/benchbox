# BenchBox 개발 인수인계 문서
> 마지막 업데이트: 2025-12-30 17:55
> 이 문서는 다른 AI나 개발자가 이어서 작업할 수 있도록 상세히 작성되었습니다.

---

## 1. 프로젝트 개요

**BenchBox**는 유튜브, 틱톡, 인스타그램 등의 벤치마킹 콘텐츠(영상/채널)를 관리하는 웹앱입니다.

### 기술 스택
| 구분 | 기술 |
|------|------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express |
| Database | sql.js (SQLite in-memory, 파일 저장) |
| HTTP Client | Axios |
| HTML Parser | Cheerio (URL 메타데이터 파싱) |

### 실행 방법
```bash
# 서버 (포트 3001)
cd benchbox/server
npm install
npm start

# 클라이언트 (포트 5173)
cd benchbox/client
npm install
npm run dev
```

---

## 2. 프로젝트 구조

```
benchbox/
├── client/                     # React 프론트엔드
│   ├── src/
│   │   ├── main.jsx           # 앱 진입점
│   │   ├── App.jsx            # 라우터 설정
│   │   ├── index.css          # Tailwind + 커스텀 CSS
│   │   ├── pages/
│   │   │   ├── Home.jsx           # 메인 홈 (폴더/채널/영상)
│   │   │   ├── AllChannelsPage.jsx # 전체 채널 목록
│   │   │   ├── AllVideosPage.jsx   # 전체 영상 목록
│   │   │   └── ChannelDetail.jsx   # 채널 상세 (채널별 영상)
│   │   ├── components/
│   │   │   ├── NavigationTabs.jsx  # 상단 탭 네비게이션 (홈/채널/영상)
│   │   │   ├── ChannelCard.jsx     # 채널 카드 (드래그 가능)
│   │   │   ├── FolderCard.jsx      # 폴더 카드 (드롭 영역)
│   │   │   ├── VideoCard.jsx       # 영상 카드
│   │   │   ├── VideoModal.jsx      # 영상 상세 모달
│   │   │   ├── FolderModal.jsx     # 폴더 생성/수정 모달
│   │   │   ├── QuickUrlModal.jsx   # URL 빠른 입력 모달
│   │   │   ├── BatchTagModal.jsx   # 일괄 태그 추가 모달
│   │   │   ├── UrlInput.jsx        # URL 입력 컴포넌트
│   │   │   └── TagInput.jsx        # 태그 입력 컴포넌트
│   │   └── utils/
│   │       ├── api.js              # Axios API 클라이언트
│   │       └── platformIcons.jsx   # 플랫폼별 아이콘/이름
│   └── tailwind.config.js
│
├── server/                     # Express 백엔드
│   ├── index.js               # 서버 진입점 (포트 3001)
│   ├── routes/
│   │   ├── channels.js        # /api/channels
│   │   ├── videos.js          # /api/videos
│   │   ├── folders.js         # /api/folders
│   │   ├── tags.js            # /api/tags
│   │   └── parseUrl.js        # URL 파싱 유틸
│   └── db/
│       ├── schema.sql         # 테이블 스키마
│       ├── database.js        # DB 초기화 + 마이그레이션
│       └── database.sqlite    # SQLite 데이터 파일
│
└── backups/                    # 백업 zip 파일들
```

---

## 3. 데이터베이스 스키마

```sql
-- 폴더 (채널을 분류)
CREATE TABLE folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#6366f1',      -- 폴더 색상 (hex)
    cover_image TEXT,                   -- 커버 이미지 URL
    description TEXT,                   -- 폴더 설명
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 채널
CREATE TABLE channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL,             -- youtube, tiktok, instagram, xiaohongshu, other
    channel_id TEXT NOT NULL,           -- 플랫폼별 고유 ID
    title TEXT,
    thumbnail TEXT,                     -- 프로필 이미지 URL
    url TEXT,
    folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(platform, channel_id)
);

-- 영상
CREATE TABLE videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL,
    video_id TEXT NOT NULL,
    title TEXT,
    thumbnail TEXT,
    url TEXT,
    video_type TEXT,                    -- shorts, long
    channel_id INTEGER REFERENCES channels(id) ON DELETE SET NULL,
    memo TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(platform, video_id)
);

-- 태그
CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

-- 영상-태그 다대다 관계
CREATE TABLE video_tags (
    video_id INTEGER REFERENCES videos(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (video_id, tag_id)
);
```

---

## 4. API 엔드포인트

### 채널 API (`/api/channels`)
```
GET    /api/channels              - 채널 목록 조회
       ?folder_id=1               - 특정 폴더의 채널만
       ?folder_id=null            - 미분류 채널만
       ?platform=youtube          - 플랫폼 필터
       ?search=검색어             - 검색

POST   /api/channels              - 채널 추가 (URL 파싱)
       body: { url: "https://youtube.com/@channel" }

GET    /api/channels/:id          - 채널 상세
DELETE /api/channels/:id          - 채널 삭제
```

### 영상 API (`/api/videos`)
```
GET    /api/videos                - 영상 목록 조회
       ?channel_id=1              - 특정 채널의 영상만
       ?channel_id=null           - 채널 미지정 영상만
       ?platform=youtube          - 플랫폼 필터
       ?video_type=shorts         - 형식 필터 (shorts/long)
       ?tag=태그명                - 태그 필터
       ?search=검색어             - 검색 (제목, 메모, 태그)
       ?sort=newest               - 정렬 (newest/oldest/title)

POST   /api/videos                - 영상 추가 (URL 파싱)
       body: { url: "https://...", channel_id?: 1 }

PUT    /api/videos/:id            - 영상 수정
       body: { memo?: "메모", tags?: ["태그1", "태그2"], channel_id?: 1 }

DELETE /api/videos/:id            - 영상 삭제
```

### 폴더 API (`/api/folders`)
```
GET    /api/folders               - 폴더 목록 (channel_count 포함)

POST   /api/folders               - 폴더 생성
       body: { name: "폴더명", color?: "#6366f1", description?: "설명" }

PUT    /api/folders/:id           - 폴더 수정
       body: { name?: "...", color?: "...", description?: "..." }

DELETE /api/folders/:id           - 폴더 삭제 (채널은 미분류로)

POST   /api/folders/:id/channels  - 채널들을 폴더로 이동
       body: { channel_ids: [1, 2, 3] }
```

### 태그 API (`/api/tags`)
```
GET    /api/tags                  - 태그 목록 (사용 횟수 포함)
```

---

## 5. 주요 컴포넌트 상세

### Home.jsx (메인 페이지)
- **구조**: 꿀통채널 섹션 + 저장한 영상 섹션
- **폴더 탭**: pill 버튼 형태로 폴더 필터 (전체/폴더명.../미분류)
- **드래그앤드롭**: 채널 카드를 폴더 카드로 드래그하여 이동
- **선택 모드**: 여러 항목 선택 후 일괄 삭제/이동/태그 추가

핵심 state:
```jsx
const [activeFolder, setActiveFolder] = useState(null);  // null=전체, 'unfiled'=미분류, number=폴더ID
const [selectedChannels, setSelectedChannels] = useState(new Set());
const [selectedVideos, setSelectedVideos] = useState(new Set());
const [selectionMode, setSelectionMode] = useState(false);  // 선택된 항목 있으면 true
```

### NavigationTabs.jsx
- 홈(/) / 전체채널(/channels) / 전체영상(/videos) 탭
- 현재 경로에 따라 active 표시

### ChannelCard.jsx
```jsx
props: {
    channel,           // 채널 데이터
    onClick,           // 클릭 핸들러
    isSelected,        // 선택 여부
    onSelect,          // 선택 토글
    selectionMode,     // 선택 모드 여부
    onVideoDrop,       // 영상 드롭 핸들러
    draggable          // 드래그 가능 여부
}
```

### FolderCard.jsx
```jsx
props: {
    folder,            // 폴더 데이터
    onClick,           // 클릭 핸들러
    onChannelDrop,     // 채널 드롭 핸들러
    onEdit,            // 편집 핸들러
    onDelete,          // 삭제 핸들러
    isSelected,
    onSelect,
    selectionMode
}
```

### VideoCard.jsx
- 핀터레스트 스타일 masonry 레이아웃
- 썸네일 비율 유지 (aspect-video 또는 원본)

---

## 6. 오늘 완료된 UX/UI 개선 (2025-12-30)

### 변경 전 문제점
1. **정보 계층 혼란**: 폴더 카드와 채널 카드가 같은 캐러셀에 혼재
2. **네비게이션 단절**: 홈 ↔ 전체채널/영상 페이지 이동이 불편
3. **추가 버튼 발견성 낮음**: 캐러셀 끝에 위치하여 스크롤 필요

### 변경 후
1. **폴더 → 필터 탭으로 분리**: 상단에 pill 버튼으로 폴더 필터
2. **NavigationTabs 추가**: 모든 페이지 상단에 탭 네비게이션
3. **추가 버튼 상단 노출**: 섹션 헤더 우측에 항상 표시

### 수정된 파일
- `Home.jsx` - 대폭 구조 변경 (폴더 탭, 섹션 헤더)
- `NavigationTabs.jsx` - 신규 생성
- `AllChannelsPage.jsx` - NavigationTabs 추가
- `AllVideosPage.jsx` - NavigationTabs 추가
- `FolderCard.jsx` - 삭제 버튼, 호버 UX 추가
- `ChannelCard.jsx` - 드래그앤드롭 지원

---

## 7. 향후 개발 TODO

### 우선순위 높음
- [ ] 폴더 탭 필터 동작 테스트 및 버그 수정
- [ ] 미분류 채널 필터 동작 확인
- [ ] 영상 상세 모달에서 채널 정보 표시

### 우선순위 중간
- [ ] 폴더 커버 이미지 업로드 기능
- [ ] 검색 자동완성, 최근 검색어
- [ ] 채널/영상 정렬 옵션 추가

### 우선순위 낮음
- [ ] 다크모드 지원
- [ ] 모바일 반응형 개선
- [ ] 키보드 단축키

---

## 8. 스타일 가이드

### Tailwind 커스텀 색상
```js
// tailwind.config.js
colors: {
    primary: {
        50: '#eef2ff',
        500: '#6366f1',  // 메인 인디고
        600: '#4f46e5',
    }
}
```

### 공통 클래스
- 카드: `w-44 bg-white rounded-lg shadow-sm`
- 버튼 (primary): `bg-primary-500 hover:bg-primary-600 text-white rounded-lg`
- 버튼 (secondary): `bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg`
- 입력: `border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500`

### 아이콘
- Heroicons (SVG inline)
- 크기: `w-4 h-4` (버튼 내), `w-5 h-5` (단독)

---

## 9. 알려진 이슈

1. **URL 파싱 실패 케이스**: 일부 틱톡/인스타 URL 파싱 실패
2. **썸네일 CORS**: 일부 플랫폼 썸네일 로드 실패 가능

---

## 10. 백업 정보

| 파일명 | 크기 | 날짜 |
|--------|------|------|
| benchbox_backup_20251230_175526.zip | 29.6MB | 2025-12-30 |
| benchbox_backup_20251230_112746.zip | 29.3MB | 2025-12-30 |

위치: `c:\Users\MSI\Desktop\벤치박스\backups\`

---

## 11. 개발 재개 시 체크리스트

1. 서버/클라이언트 실행 확인
2. 브라우저에서 http://localhost:5173 접속
3. 폴더 탭 필터 동작 확인
4. 드래그앤드롭 동작 확인
5. 선택 모드 (다중 선택/삭제) 확인

---

*이 문서와 함께 코드를 읽으면 프로젝트 전체를 파악할 수 있습니다.*
