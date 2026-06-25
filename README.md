# Lancerdesk

숨고(soomgo.com) 프리랜서를 위한 AI 기반 CRM 시스템

## 구성 요소

| 구성 요소 | 기술 스택 | 경로 |
|---|---|---|
| Chrome Extension | Manifest V3 | `extension/` |
| Backend API | FastAPI + Supabase | `backend/` |
| Dashboard | Next.js 14 + Tailwind | `dashboard/` |

---

## 빠른 시작

### 1. 데이터베이스 설정

Supabase 프로젝트를 생성하고 SQL Editor에서 아래 스키마를 실행하세요.

```bash
# backend/database/schema.sql 내용을 Supabase SQL Editor에 붙여넣어 실행
```

### 2. Backend 설정

```bash
cd backend
cp .env.example .env
# .env 파일을 열어 실제 값으로 교체

pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8000
```

`.env` 파일 예시:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-or-service-role-key
CLAUDE_API_KEY=your-anthropic-api-key
API_KEY=your-secret-api-key-for-extension
```

### 3. Dashboard 설정

```bash
cd dashboard
cp .env.local.example .env.local
# .env.local 파일을 열어 실제 값으로 교체

npm install
npm run dev
```

대시보드: http://localhost:3000

### 4. Chrome Extension 설정

1. Chrome에서 `chrome://extensions` 열기
2. 개발자 모드 활성화
3. "압축해제된 확장 프로그램을 로드합니다" 클릭
4. `extension/` 폴더 선택
5. 숨고 채팅 페이지 방문 후 사이드패널 아이콘 클릭
6. API Key와 User ID 입력 후 저장

---

## API 엔드포인트

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/health` | 서버 상태 확인 |
| GET | `/conversations` | 대화 목록 조회 |
| POST | `/conversations` | 대화 생성 |
| POST | `/conversations/{id}/messages` | 메시지 추가 |
| GET | `/projects` | 프로젝트 목록 조회 |
| POST | `/projects` | 프로젝트 생성 |
| PATCH | `/projects/{id}` | 프로젝트 수정 |
| DELETE | `/projects/{id}` | 프로젝트 삭제 |
| POST | `/ai/suggest` | AI 답변 추천 (claude-haiku-4-5) |
| GET | `/analytics/summary` | 통계 요약 |
| GET | `/analytics/monthly` | 월별 통계 |

모든 엔드포인트는 `x-api-key` 헤더 인증 필요.

---

## 카테고리 감지

Chrome Extension의 `content.js`는 대화 내용에서 키워드를 분석하여 자동으로 카테고리를 감지합니다.

| 카테고리 | 주요 키워드 |
|---|---|
| ppt | ppt, 파워포인트, 슬라이드, 프레젠테이션 |
| design | 디자인, 로고, 배너, 포토샵, UI/UX |
| video | 영상, 편집, 유튜브, 모션그래픽 |
| writing | 글쓰기, 번역, 카피라이팅, 블로그 |
| dev | 개발, 코딩, 웹사이트, React, API |

---

## AI 답변 추천

`/ai/suggest` API는 Anthropic `claude-haiku-4-5` 모델을 사용하여 클라이언트 대화 맥락에 맞는 전문적인 답변을 생성합니다.
