// Lancerdesk Content Script — soomgo.com chat scraper
// Runs in the context of soomgo.com pages

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

  // 고객명: "N시간 전 접속" 텍스트에서 가장 가까운 이전 한국어 이름을 역방향으로 탐색
  let clientName = null;
  for (let i = 0; i < textNodes.length; i++) {
    if (textNodes[i].text.match(/\d+(시간|분|일|초)\s*전\s*접속/)) {
      // 역방향 탐색: 바로 앞 노드부터 최대 15개, 공백 없는 순수 한국어 이름 우선
      for (let j = i - 1; j >= Math.max(0, i - 15); j--) {
        const t = textNodes[j].text;
        if (/^[가-힣]{2,8}$/.test(t)) {
          clientName = t;
          break;
        }
      }
      break;
    }
  }

  // 폴백: 상단 heading 요소에서 한국어 이름 탐색
  if (!clientName) {
    for (const h of document.querySelectorAll("h1,h2,h3,h4")) {
      const t = h.textContent?.trim() || "";
      if (/^[가-힣]{2,8}$/.test(t)) { clientName = t; break; }
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
 * @returns {{ messages: Array, url: string, category: string, clientId: string|null, clientName: string|null } | null}
 */
function scrapeChatMessages() {
  // soomgo.com uses various selectors — try common patterns
  const messageSelectors = [
    "[class*='Message']",
    "[class*='message']",
    "[class*='chat-bubble']",
    "[class*='bubble']",
    "[class*='chat']",
    "[data-testid*='message']",
    ".conversation-message",
    ".chat-message",
  ];

  let messageElements = [];
  for (const selector of messageSelectors) {
    const found = document.querySelectorAll(selector);
    if (found.length > 0) {
      messageElements = Array.from(found);
      break;
    }
  }

  const { clientId, clientName, domCategory } = extractClientInfo();

  if (messageElements.length === 0) {
    // 메시지 셀렉터 매칭 실패해도 URL·고객 정보는 반환
    return {
      messages: [],
      url: window.location.href,
      category: "general",
      clientId,
      clientName,
      domCategory,
    };
  }

  const messages = messageElements.map((el) => {
    const classList = el.className || "";
    const isMine =
      classList.includes("mine") ||
      classList.includes("sent") ||
      classList.includes("my-") ||
      classList.includes("Me") ||
      classList.includes("right") ||
      el.dataset.sender === "me";

    const textEl =
      el.querySelector("[class*='text']") ||
      el.querySelector("[class*='content']") ||
      el.querySelector("[class*='body']") ||
      el.querySelector("p") ||
      el;

    return {
      role: isMine ? "freelancer" : "client",
      content: (textEl.textContent || "").trim(),
      timestamp: el.dataset.time || el.getAttribute("data-time") || new Date().toISOString(),
    };
  }).filter((m) => m.content.length > 0);

  const fullText = messages.map((m) => m.content).join(" ");
  const category = domCategory ? detectCategoryFromLabel(domCategory) : detectCategory(fullText);

  return {
    messages,
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
function startObserving() {
  const targetNode = document.body;
  if (!targetNode) return;

  let debounceTimer = null;

  const observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const data = scrapeChatMessages();
      if (data) {
        chrome.runtime.sendMessage({
          type: "CHAT_UPDATED",
          payload: data,
        });
      }
    }, 800);
  });

  observer.observe(targetNode, {
    childList: true,
    subtree: true,
  });
}

// Initial scrape on load
const initialData = scrapeChatMessages();
if (initialData) {
  chrome.runtime.sendMessage({
    type: "CHAT_UPDATED",
    payload: initialData,
  });
}

// Start watching for changes
startObserving();

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
      chrome.runtime.sendMessage({ type: "CHAT_UPDATED", payload: data });
      sendResponse({ success: true, data });
    });
    return true;
  }

  return true; // keep channel open for async
});
