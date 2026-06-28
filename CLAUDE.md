# Lancerdesk 개발 규칙

## 버전 관리 (필수)
배포할 때마다 반드시 두 파일의 버전을 동시에 올릴 것:
- `extension/manifest.json` → `"version"` 필드
- `dashboard/components/dashboard/Sidebar.tsx` → `v{버전}` 텍스트

버전 올리는 시점: 코드 변경 후 커밋/배포 직전. 절대 빠뜨리지 말 것.
대시보드 사이드바 버전 숫자로 배포 완료 여부를 눈으로 확인한다.

## 배포 방법
- 대시보드: `cd dashboard && npx vercel --prod` (GitHub 자동 배포 끊겨있음)
- 백엔드: `cd backend && railway up --detach` (GitHub 자동 배포 끊겨있음)
- 익스텐션: `chrome://extensions`에서 수동 리로드

## 프로젝트 구조
- `extension/` — Chrome Extension (Manifest V3), 숨고 채팅 스크래핑
- `dashboard/` — Next.js 14, Vercel 배포
- `backend/` — FastAPI, Railway 배포
