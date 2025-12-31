# BenchBox TODO 목록

## 우선순위 높음 (P0)

현재 없음 - 핵심 기능 완료

## 우선순위 중간 (P1)

### 필터링 개선
- [ ] 영상 타입 필터 추가 (숏폼만 / 롱폼만 / 전체)
  - 파일: `client/src/pages/Home.jsx`, `client/src/pages/ChannelDetail.jsx`
  - 서버: `server/routes/videos.js` (video_type 쿼리 파라미터 추가)

### 일괄 작업
- [ ] 선택한 영상들에 태그 일괄 추가
  - 선택 모드에서 "태그 추가" 버튼
  - 서버 API: `PUT /api/videos/batch/tags`

### UX 개선
- [ ] 드래그 앤 드롭으로 폴더 간 채널 이동
  - 라이브러리: react-beautiful-dnd 또는 @dnd-kit/core

## 우선순위 낮음 (P2)

### 데이터 관리
- [ ] 데이터 백업 (SQLite 파일 다운로드)
- [ ] 데이터 복원 (SQLite 파일 업로드)
- [ ] CSV/JSON 내보내기

### 추가 기능
- [ ] 다크 모드
- [ ] 정렬 옵션 확장 (조회수, 좋아요 등 - OG로는 불가, 별도 API 필요)
- [ ] 영상 메모에 마크다운 지원
- [ ] 채널 구독 알림 (새 영상 감지)

### 성능
- [ ] 무한 스크롤 또는 페이지네이션
- [ ] 이미지 lazy loading
- [ ] 썸네일 캐싱

## 버그/이슈

현재 알려진 버그 없음

## 완료됨 (2025-12-29)

- [x] 숏폼/롱폼 URL 패턴 구분
- [x] 영상 타입별 썸네일 비율 (9:16 vs 16:9)
- [x] Masonry 레이아웃
- [x] 삭제 기능 버그 수정 (database.js changes 반환값)
