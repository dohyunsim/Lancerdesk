// Lancerdesk Content Script — soomgo.com chat scraper
// Runs in the context of soomgo.com pages

// 숨고 채팅 대화창 URL인지 확인 (/chats/{id} 패턴)
function isChatPage() {
  return /\/chats\/\d+/.test(window.location.href);
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

  // ── CSS 셀렉터로 오른쪽 패널 프로필 카드에서 직접 추출 ──
  // 숨고 DOM 구조 (2026-06 기준 콘솔 확인):
  //   H4 (class 없음, .usermenu-dropdown 외부)         → 고객명 ("심도현 고객님")
  //   DIV.service-name-text-wrapper                    → 서비스명/카테고리 ("주식 레슨")
  //
  // 구버전 셀렉터(h4[class*="headline2"], h6[class*="body3"])는
  // 현재 숨고 마크업에서 동작하지 않으므로 아래 셀렉터로 교체.

  // 고객명: prisma-typography headline2 클래스를 가진 h4 우선 (오른쪽 패널 고객 이름)
  // 숨고 DOM (2026-06 확인): h4 목록 중 첫 번째 비드롭다운은 내 이름(고수명)이 잡히므로
  // headline2 클래스를 가진 h4를 우선 선택하고, 없으면 마지막 비드롭다운 h4 fallback
  const h4List = Array.from(document.querySelectorAll('h4')).filter(
    (el) => !el.closest('.usermenu-dropdown')
  );
  const clientName =
    (h4List.find((el) => el.className.includes('headline2')) || h4List[h4List.length - 1])
      ?.textContent?.trim() || null;

  // 카테고리(서비스명): .quote-info 내부 .service 스팬 우선 (2026-06 확인)
  // .category, .service-name-text-wrapper 는 현재 숨고 마크업에 존재하지 않음
  const domCategory =
    document.querySelector('.quote-info .service')
      ?.textContent?.trim() ||
    document.querySelector('.service')
      ?.textContent?.trim() ||
    document.querySelector('.category')
      ?.textContent?.trim() ||
    document.querySelector('.service-name-text-wrapper')
      ?.textContent?.trim() || null;

  // textNodes는 scrapeChatMessages에서 필요하므로 유지
  const textNodes = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const text = walker.currentNode.textContent?.trim();
    if (text) textNodes.push({ text, el: walker.currentNode.parentElement });
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
    return { messages: [], url: window.location.href, category: '', clientId, clientName, domCategory };
  }

  const fullText = cleaned.map((m) => m.content).join(" ");
  const category = domCategory || '';

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
