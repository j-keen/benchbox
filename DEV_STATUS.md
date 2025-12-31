# BenchBox 개발 현황 정리
> 마지막 업데이트: 2025-12-30 17:55

---

## 프로젝트 개요
벤치마킹 콘텐츠(영상/채널) 관리 웹앱
- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Node.js + Express + sql.js (SQLite)
- **포트**: 서버 3001, 클라이언트 5173

---

## 오늘 완료된 작업 (2025-12-30)

### 1. UX/UI 대폭 개선
평가 점수: 7.2/10 → 개선 후 예상 8.5+

#### 문제점 및 해결책

| 문제 | 해결 |
|------|------|
| 폴더/채널 정보 계층 혼란 | 폴더를 필터 탭으로 분리 (pill 버튼 형태) |
| 페이지 간 네비게이션 단절 | NavigationTabs 컴포넌트 추가 (홈/전체채널/전체영상) |
| 추가 버튼 발견성 낮음 | 섹션 헤더 우측에 항상 노출 |

#### 수정된 파일들

```
client/src/
├── components/
│   ├── NavigationTabs.jsx     ← 신규 생성
│   ├── FolderCard.jsx         ← 삭제버튼, 선택모드 추가
│   └── ChannelCard.jsx        ← 드래그앤드롭 지원
├── pages/
│   ├── Home.jsx               ← 대폭 구조 변경
│   ├── AllChannelsPage.jsx    ← NavigationTabs 추가
│   └── AllVideosPage.jsx      ← NavigationTabs 추가
```

### 2. 홈 화면 구조 변경

**Before:**
- 폴더 카드와 채널 카드가 같은 캐러셀에 혼재
- 추가 버튼은 캐러셀 끝에 위치 (스크롤 필요)

**After:**
```
[홈] [전체채널] [전체영상]  ← NavigationTabs
─────────────────────────────────────
꿀통채널 (3개 폴더 · 12개 채널)    [폴더+] [채널+]  ← 버튼 상단 노출
[전체] [기획] [연출] [미분류]  ← 폴더 필터 탭 (pill 버튼)
─────────────────────────────────────
[채널카드] [채널카드] [채널카드] ...  ← 필터된 채널만 표시
─────────────────────────────────────
최근 영상 (24개)                      [영상+]
[영상카드] [영상카드] ...
```

### 3. 드래그앤드롭 기능
- 채널 카드 → 폴더 카드로 드래그하여 폴더 이동
- 드래그 오버 시 시각적 피드백 (초록색 테두리)

---

## 백업 정보

| 파일명 | 크기 | 생성일시 |
|--------|------|----------|
| benchbox_backup_20251230_175526.zip | 29.6MB | 2025-12-30 17:55 |
| benchbox_backup_20251230_112746.zip | 29.3MB | 2025-12-30 11:27 |

위치: `c:\Users\MSI\Desktop\벤치박스\backups\`

---

## 실행 방법

```bash
# 터미널 1 - 서버 실행
cd benchbox/server
npm install
npm start
# → http://localhost:3001

# 터미널 2 - 클라이언트 실행
cd benchbox/client
npm install
npm run dev
# → http://localhost:5173
```

---

## 향후 개발 TODO

### 우선순위 높음
- [ ] 폴더 탭 클릭 시 해당 폴더의 채널만 필터링 (현재 구현됨, 테스트 필요)
- [ ] 미분류 채널 필터 동작 확인
- [ ] 영상 상세 모달에서 채널 정보 표시

### 우선순위 중간
- [ ] 폴더 커버 이미지 업로드 기능
- [ ] 채널/영상 일괄 태그 추가
- [ ] 검색 기능 고도화 (자동완성, 최근검색어)

### 우선순위 낮음
- [ ] 다크모드 지원
- [ ] 반응형 개선 (모바일)
- [ ] 키보드 단축키

---

## 주요 API 엔드포인트

```
GET    /api/channels          - 채널 목록
POST   /api/channels          - 채널 추가 (URL 파싱)
GET    /api/channels/:id      - 채널 상세
DELETE /api/channels/:id      - 채널 삭제

GET    /api/videos            - 영상 목록
POST   /api/videos            - 영상 추가 (URL 파싱)
PUT    /api/videos/:id        - 영상 수정 (태그, 메모 등)
DELETE /api/videos/:id        - 영상 삭제

GET    /api/folders           - 폴더 목록
POST   /api/folders           - 폴더 생성
PUT    /api/folders/:id       - 폴더 수정
DELETE /api/folders/:id       - 폴더 삭제
POST   /api/folders/:id/channels - 채널들을 폴더로 이동

GET    /api/tags              - 태그 목록
```

---

## 데이터베이스 스키마 (주요 테이블)

```sql
-- 폴더
CREATE TABLE folders (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  cover_image TEXT,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 채널
CREATE TABLE channels (
  id INTEGER PRIMARY KEY,
  platform TEXT NOT NULL,  -- youtube, tiktok, instagram
  channel_id TEXT NOT NULL,
  title TEXT,
  thumbnail TEXT,
  url TEXT,
  folder_id INTEGER REFERENCES folders(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 영상
CREATE TABLE videos (
  id INTEGER PRIMARY KEY,
  platform TEXT NOT NULL,
  video_id TEXT NOT NULL,
  title TEXT,
  thumbnail TEXT,
  url TEXT,
  video_type TEXT,  -- shorts, long
  channel_id INTEGER REFERENCES channels(id),
  memo TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 태그 (다대다)
CREATE TABLE tags (id, name);
CREATE TABLE video_tags (video_id, tag_id);
```

---

## 기타 메모
- Tailwind primary 색상: indigo (#6366f1)
- 카드 크기: w-44 (11rem, 176px)
- 아이콘: Heroicons (SVG inline)
