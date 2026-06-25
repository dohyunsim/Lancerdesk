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
 * Scrape chat messages from the current soomgo.com chat page.
 * @returns {{ messages: Array, url: string, category: string } | null}
 */
function scrapeChatMessages() {
  // soomgo.com uses various selectors — try common patterns
  const messageSelectors = [
    ".chat-message",
    "[class*='message']",
    "[class*='chat']",
    "[data-testid*='message']",
    ".conversation-message",
  ];

  let messageElements = [];
  for (const selector of messageSelectors) {
    const found = document.querySelectorAll(selector);
    if (found.length > 0) {
      messageElements = Array.from(found);
      break;
    }
  }

  if (messageElements.length === 0) {
    return null;
  }

  const messages = messageElements.map((el) => {
    // Determine role from class names or data attributes
    const classList = el.className || "";
    const isMine =
      classList.includes("mine") ||
      classList.includes("sent") ||
      classList.includes("my-") ||
      el.dataset.sender === "me";

    const textEl =
      el.querySelector("[class*='text']") ||
      el.querySelector("[class*='content']") ||
      el.querySelector("p") ||
      el;

    return {
      role: isMine ? "freelancer" : "client",
      content: (textEl.textContent || "").trim(),
      timestamp: el.dataset.time || el.getAttribute("data-time") || "",
    };
  }).filter((m) => m.content.length > 0);

  const fullText = messages.map((m) => m.content).join(" ");
  const category = detectCategory(fullText);

  return {
    messages,
    url: window.location.href,
    category,
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

// Listen for requests from the sidepanel / background
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_CHAT_DATA") {
    const data = scrapeChatMessages();
    sendResponse({ success: true, data });
  }
  return true; // keep channel open for async
});
