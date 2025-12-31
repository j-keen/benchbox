# BenchBox 변경 이력

## 2025-12-29

### 09:30 - 숏폼/롱폼 구분 기능 추가

**변경 파일:**
- `server/services/urlAnalyzer.js`
  - YouTube shorts URL 패턴 추가: `/shorts/[id]`
  - TikTok 모든 영상을 shorts로 분류
  - Instagram reel을 shorts, /p/를 long으로 분류
  - 반환값에 `videoType` 필드 추가 ('shorts' | 'long')

- `server/db/schema.sql`
  - videos 테이블에 `video_type` 컬럼 추가 (DEFAULT 'long')

- `server/routes/videos.js`
  - INSERT 쿼리에 video_type 필드 추가
  - `urlInfo.videoType || 'long'` 저장

### 09:35 - VideoCard 썸네일 비율 변경

**변경 파일:**
- `client/src/components/VideoCard.jsx`
  - `isShorts` 변수 추가: `video.video_type === 'shorts'`
  - 썸네일 영역: `aspect-video` (16:9) → 조건부 `aspect-[9/16]` (9:16)
  - Shorts 뱃지 추가 (빨간색 배경)

### 09:38 - Masonry 레이아웃 적용

**변경 파일:**
- `client/src/pages/Home.jsx`
  - 기존: `grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4`
  - 변경: `columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4 space-y-4`
  - 각 VideoCard를 `break-inside-avoid` div로 감싸기

- `client/src/pages/ChannelDetail.jsx`
  - 동일한 Masonry 레이아웃 적용

### 09:40 - 삭제 기능 버그 수정

**증상:**
- 채널/영상 삭제 시 404 오류 발생
- 실제로 데이터는 있지만 "찾을 수 없습니다" 응답

**원인:**
- `database.js`의 `run()` 메서드에서 `changes()` SQL 함수 결과가 제대로 반환되지 않음
- `db.run()` 실행 후 `db.exec("SELECT changes()")` 호출 시 항상 0 반환

**해결:**
- `server/db/database.js` 수정
  ```javascript
  // 변경 전
  db.run(sql, params);
  saveDatabase();
  const result = db.exec("SELECT last_insert_rowid() as id, changes() as changes");
  return {
      lastInsertRowid: result[0]?.values[0]?.[0] || 0,
      changes: result[0]?.values[0]?.[1] || db.getRowsModified()
  };

  // 변경 후
  db.run(sql, params);
  const changes = db.getRowsModified();  // saveDatabase 전에 호출
  saveDatabase();
  const result = db.exec("SELECT last_insert_rowid() as id");
  return {
      lastInsertRowid: result[0]?.values[0]?.[0] || 0,
      changes: changes
  };
  ```

**테스트 결과:**
- `curl -X DELETE http://localhost:3001/api/channels/3` → `{"message":"채널이 삭제되었습니다."}`

---

## 이전 세션 (요약)

### 초기 구현
- 프로젝트 구조 설정 (React + Express + sql.js)
- URL 붙여넣기 → OG 태그 파싱 → 저장
- 채널/영상/폴더/태그 CRUD
- 플랫폼별 아이콘 및 색상

### UI 개선
- 체크박스 선택 모드 (호버 시 표시)
- 다중 선택 삭제
- 캐러셀 내비게이션
- 폴더 색상 지정
