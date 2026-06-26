// Lancerdesk Content Script — soomgo.com chat scraper
// Runs in the context of soomgo.com pages

// 숨고 채팅 대화창 URL인지 확인 (/chats/{id} 패턴)
function isChatPage() {
  return /\/chats\/\d+/.test(window.location.href);
}

const CATEGORY_CONFIG = {
  ppt: {
    label: "PPT/프레젠테이션",
    keywords: [
      "ppt", "파워포인트", "powerpoint", "프레젠테이션", "발표 자료",
      "슬라이드", "키노트", "keynote", "피티", "발표자료",
    ],
  },
  design: {
    label: "디자인",
    keywords: [
      "디자인", "design", "포스터", "배너", "로고", "logo",
      "브랜딩", "branding", "일러스트", "illustrator", "포토샵",
      "photoshop", "ui", "ux", "카드뉴스", "인포그래픽",
    ],
  },
  video: {
    label: "영상/편집",
    keywords: [
      "영상", "video", "편집", "유튜브", "youtube", "릴스", "숏츠",
      "애니메이션", "animation", "모션그래픽", "motion", "촬영",
    ],
  },
  writing: {
    label: "글쓰기/번역",
    keywords: [
      "글쓰기", "번역", "translation", "카피라이팅", "copywriting",
      "블로그", "blog", "콘텐츠", "content", "원고", "에세이",
    ],
  },
  dev: {
    label: "개발",
    keywords: [
      "개발", "development", "코딩", "coding", "웹사이트", "website",
      "앱", "app", "react", "vue", "javascript", "python", "api",
    ],
  },
};

/**
 * Detect category from conversation text.
 * @param {string} text - Full conversation text
 * @returns {string} - Category key or 'general'
 */
function detectCategory(text) {
  const lower = text.toLowerCase();
  for (const [key, config] of Object.entries(CATEGORY_CONFIG)) {
    if (config.keywords.some((kw) => lower.includes(kw))) {
      return key;
    }
  }
  return "general";
}

/**
 * Detect category from a DOM label string.
 * @param {string} label - Category label text from DOM
 * @returns {string} - Category key or 'general'
 */
function detectCategoryFromLabel(label) {
  const lower = label.toLowerCase();
  for (const [key, config] of Object.entries(CATEGORY_CONFIG)) {
    if (config.keywords.some((kw) => lower.includes(kw))) return key;
  }
  return "general";
}

/**
 * Extract client/room ID, name, and DOM category from the current soomgo.com URL and page.
 * @returns {{ clientId: string|null, clientName: string|null, domCategory: string|null }}
 */
function extractClientInfo() {
  const url = window.location.href;

  // URL에서 채팅방 ID 추출 (/chats/숫자 패턴 우선, 없으면 마지막 긴 숫자)
  const chatIdMatch = url.match(/\/chats\/(\d+)/);
  const pathNumbers = url.match(/\/(\d{5,})/g);
  const clientId = chatIdMatch
    ? chatIdMatch[1]
    : pathNumbers
    ? pathNumbers[pathNumbers.length - 1].slice(1)
    : null;

  // TreeWalker로 전체 텍스트 노드 수집
  const textNodes = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const text = walker.currentNode.textContent?.trim();
    if (text) textNodes.push({ text, el: walker.currentNode.parentElement });
  }

  // UI 텍스트 블록리스트
  const UI_BLOCKLIST = new Set([
    "로그아웃", "로그인", "마이페이지", "고객센터", "알림설정",
    "전체보기", "더보기", "닫기", "취소", "확인", "저장", "삭제",
    "설정", "홈", "검색", "채팅", "알림", "프로필", "메뉴",
    "스마트건", "인터넷가입", "커뮤니티", "고수찾기", "받은요청",
    "고객전환", "고용요청", "숨고페이", "일정등록", "견적요청",
    "고객요청", "거래상세", "신고하기", "차단하기", "미접속",
    "숨고페이요청", "고용 요청", "일정 등록", "스마트 견적",
  ]);

  // 이름 후보 판별: 블록리스트 제외, 타임스탬프/숫자 제외, 한글 또는 영문 포함
  function isNameCandidate(t) {
    if (!t || t.length < 2 || t.length > 20) return false;
    if (UI_BLOCKLIST.has(t.replace(/\s/g, ""))) return false;
    if (UI_BLOCKLIST.has(t)) return false;
    if (/^\d/.test(t)) return false;
    if (/\d+(시간|분|일|초)/.test(t)) return false;
    if (/^(오[전후]|AM|PM|\d{1,2}:\d{2})/.test(t)) return false;
    if (/^[0-9\s\-_\.]+$/.test(t)) return false;
    return /[가-힣A-Za-z]/.test(t);
  }

  // 고객명: "N시간 전 접속" 요소의 가까운 컨테이너(조상 순회)에서 이름 탐색
  // 전역 역방향 스캔 대신 좁은 DOM 컨텍스트만 탐색 → UI 단어 오인 방지
  let clientName = null;
  {
    let accessEl = null;
    for (const { text, el } of textNodes) {
      if (/\d+(시간|분|일|초)\s*전\s*접속/.test(text)) { accessEl = el; break; }
    }
    if (accessEl) {
      let container = accessEl.parentElement;
      for (let depth = 0; depth < 7 && container && !clientName; depth++) {
        const innerTexts = [];
        const w = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
        while (w.nextNode()) {
          const t = (w.currentNode.textContent || "").trim();
          if (t) innerTexts.push(t);
        }
        const candidates = innerTexts.filter(isNameCandidate);
        // 후보가 1~4개인 컨테이너: 좁아서 UI 텍스트가 섞이지 않음
        if (candidates.length >= 1 && candidates.length <= 4) {
          clientName = candidates[0];
        }
        container = container.parentElement;
      }
    }
  }

  // 폴백: heading 요소에서 이름 탐색
  if (!clientName) {
    for (const h of document.querySelectorAll("h1,h2,h3,h4")) {
      const t = h.textContent?.trim() || "";
      if (isNameCandidate(t)) { clientName = t; break; }
    }
  }

  // 카테고리: 서비스 키워드가 포함된 짧은 텍스트 노드
  const categoryKeywords = [
    "제작", "개발", "번역", "편집", "디자인", "작성",
    "촬영", "컨설팅", "PPT", "ppt", "영상", "웹", "앱", "로고", "배너",
  ];
  let domCategory = null;
  for (const { text } of textNodes) {
    if (
      text.length >= 2 && text.length <= 20 &&
      categoryKeywords.some((kw) => text.includes(kw))
    ) {
      domCategory = text;
      break;
    }
  }

  return { clientId, clientName, domCategory };
}

/**
 * Scrape chat messages from the current soomgo.com chat page.
 * TreeWalker + 화면 위치 기반 파싱:
 *  - 아바타 이니셜(1-2자), 타임스탬프, 날짜 구분선, 시스템 메시지 자동 제외
 *  - 채팅 컨테이너 내 상대적 위치로 client(좌) / freelancer(우) 판별
 *  - 같은 버블 내 연속 텍스트 노드는 합산
 */
function scrapeChatMessages() {
  const { clientId, clientName, domCategory } = extractClientInfo();

  const TIME_RE     = /오[전후]\s*\d{1,2}:\d{2}/g;
  const DATE_RE     = /^\d{4}년\s*\d{1,2}월\s*\d{1,2}일/;
  const AVATAR_RE   = /^[가-힣A-Za-z]{1,2}$/; // 아바타 이니셜 (1~2자)

  // 채팅 스크롤 컨테이너 탐색: 스크롤 가능하고 좌측에 위치한 큰 요소
  let chatContainer = document.body;
  {
    const candidates = Array.from(document.querySelectorAll("*")).filter((el) => {
      const tag = el.tagName;
      if (tag === "SCRIPT" || tag === "STYLE" || tag === "HEAD") return false;
      const r = el.getBoundingClientRect();
      return r.width > 250 && r.height > 200 &&
             r.left < window.innerWidth * 0.85 &&
             el.scrollHeight > el.clientHeight + 80;
    });
    candidates.sort((a, b) => b.scrollHeight - a.scrollHeight);
    if (candidates.length) chatContainer = candidates[0];
  }

  const cRect   = chatContainer.getBoundingClientRect();
  const cLeft   = cRect.left || 0;
  const cWidth  = cRect.width  || 700;

  const messages = [];
  const seen     = new Set();
  let   prevRect = null;

  const walker = document.createTreeWalker(chatContainer, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    let text = (node.textContent || "").trim();
    if (!text) continue;

    // 타임스탬프를 텍스트에서 제거 후 나머지 평가
    text = text.replace(TIME_RE, "").trim();
    if (!text || text.length < 2) continue;

    if (AVATAR_RE.test(text)) continue;  // 아바타 이니셜
    if (DATE_RE.test(text))   continue;  // 날짜 구분선

    const el = node.parentElement;
    if (!el || !chatContainer.contains(el)) continue;

    const r = el.getBoundingClientRect();
    if (!r.width || r.height < 5) continue;

    // 전체 너비의 65% 이상 = 시스템 메시지 / 배너 → 제외
    if (r.width > cWidth * 0.65) continue;

    // 채팅 컨테이너 내 상대적 중앙 X 좌표로 역할 결정
    const relCx = (r.left + r.width / 2 - cLeft) / cWidth;
    if (relCx > 0.42 && relCx < 0.58) continue; // 가운데 = 시스템 메시지
    const role = relCx < 0.5 ? "client" : "freelancer";

    // 중복 제거
    const key = `${role}|${text}`;
    if (seen.has(key)) continue;
    seen.add(key);

    // 같은 버블 내 연속 텍스트(세로 40px 이내, 같은 역할) → 합산
    const last = messages[messages.length - 1];
    const inSameBubble =
      last &&
      last.role === role &&
      prevRect &&
      Math.abs(r.top - prevRect.top) < 40 &&
      Math.abs(r.bottom - prevRect.bottom) < 40;

    if (inSameBubble) {
      last.content += " " + text;
    } else {
      messages.push({ role, content: text, timestamp: "" });
    }
    prevRect = r;
  }

  const cleaned = messages.filter((m) => m.content.trim().length > 1);

  if (!cleaned.length) {
    return { messages: [], url: window.location.href, category: "general", clientId, clientName, domCategory };
  }

  const fullText = cleaned.map((m) => m.content).join(" ");
  const category = domCategory ? detectCategoryFromLabel(domCategory) : detectCategory(fullText);

  return {
    messages: cleaned,
    url: window.location.href,
    category,
    clientId,
    clientName,
    domCategory,
  };
}

/**
 * Watch for chat DOM changes and notify the background worker.
 */
function sendSafe(message) {
  try {
    chrome.runtime.sendMessage(message);
  } catch (e) {
    // 익스텐션 리로드 후 컨텍스트 무효화 — 무시
  }
}

function startObserving() {
  const targetNode = document.body;
  if (!targetNode) return;

  let debounceTimer = null;

  const observer = new MutationObserver(() => {
    // 컨텍스트가 무효화됐으면 observer 중단
    if (!chrome.runtime?.id) {
      observer.disconnect();
      return;
    }
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const data = scrapeChatMessages();
      if (data && data.messages.length > 0) {
        sendSafe({ type: "CHAT_UPDATED", payload: data });
      }
    }, 800);
  });

  observer.observe(targetNode, {
    childList: true,
    subtree: true,
  });
}

// 채팅 대화창 페이지에서만 실행
if (isChatPage()) {
  // Initial scrape on load
  const initialData = scrapeChatMessages();
  if (initialData && initialData.messages.length > 0) {
    sendSafe({ type: "CHAT_UPDATED", payload: initialData });
  }

  // Start watching for changes
  startObserving();
}

/**
 * 채팅 컨테이너를 최상단까지 스크롤해서 이전 메시지를 모두 로드한다.
 * Soomgo는 스크롤 상단 도달 시 이전 메시지를 동적으로 불러오므로
 * scrollTop=0 이 유지될 때까지 반복한다.
 */
async function scrollToTopAndCrawl(onProgress) {
  // 스크롤 가능한 채팅 컨테이너 탐색
  const candidates = Array.from(document.querySelectorAll("*")).filter(
    (el) => el.scrollHeight - el.clientHeight > 100 && el.scrollTop > 0
  );
  // scrollTop이 가장 큰 요소(= 현재 채팅 스크롤 영역)
  candidates.sort((a, b) => b.scrollTop - a.scrollTop);
  const container = candidates[0] || document.documentElement;

  let prevHeight = 0;
  let staleCount = 0;
  const MAX_STALE = 4; // 새 메시지 로드 없이 4번 연속이면 종료

  for (let i = 0; i < 60; i++) {
    container.scrollTop = 0;
    await new Promise((r) => setTimeout(r, 700));

    const curHeight = container.scrollHeight;
    if (curHeight === prevHeight) {
      staleCount++;
      if (staleCount >= MAX_STALE) break;
    } else {
      staleCount = 0;
    }
    prevHeight = curHeight;

    if (onProgress) onProgress(i);
  }

  // 스크롤 완료 후 전체 메시지 재스크랩
  return scrapeChatMessages();
}

// Listen for requests from the sidepanel / background
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_CHAT_DATA") {
    const data = scrapeChatMessages();
    sendResponse({ success: true, data });
  }

  if (message.type === "SCROLL_AND_CRAWL") {
    scrollToTopAndCrawl().then((data) => {
      // 완료 후 사이드패널로 전송
      sendSafe({ type: "CHAT_UPDATED", payload: data });
      sendResponse({ success: true, data });
    });
    return true;
  }

  return true; // keep channel open for async
});
