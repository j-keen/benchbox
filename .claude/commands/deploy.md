---
description: Vercel에 배포
---

# 배포

dev 브랜치의 코드를 main에 병합하여 Vercel에 배포합니다.

## 수행할 작업

1. **커밋되지 않은 변경사항 확인**
   - `git status`로 확인
   - 변경사항이 있으면 먼저 dev 브랜치에 커밋

2. **main 브랜치로 병합**
   - `git checkout main`
   - `git merge dev`
   - `git push` (Vercel 자동 배포 트리거)

3. **dev 브랜치로 복귀**
   - `git checkout dev`

4. **결과 안내**
   - 배포 완료 메시지 출력
