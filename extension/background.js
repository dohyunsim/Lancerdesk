// Lancerdesk Background Service Worker (Manifest V3)

// 운영 배포 URL (개발 시에는 "http://localhost:8000" 으로 변경)
const API_BASE_URL = "https://backend-production-53b3f.up.railway.app";

/**
 * Retrieve stored JWT token from chrome.storage.local.
 * @returns {Promise<string>}
 */
async function getJwtToken() {
  return new Promise((resolve) =>
    chrome.storage.local.get(["jwtToken"], (r) => resolve(r.jwtToken || ""))
  );
}

/**
 * Send a request to the Lancerdesk backend.
 * @param {string} path - API path (e.g., '/conversations')
 * @param {object} options - fetch options
 * @returns {Promise<any>}
 */
async function apiRequest(path, options = {}) {
  const token = await getJwtToken();
  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API error ${response.status}: ${err}`);
  }

  return response.json();
}

/**
 * Save or update a conversation in the backend.
 * URL 기반 3단계 재사용 로직:
 *   1. chrome.storage URL→ID 캐시 확인
 *   2. 백엔드에서 soomgo_url로 기존 대화 조회
 *   3. 새 대화 생성
 * @param {object} chatData - { messages, url, category, clientId, clientName }
 * @returns {Promise<object>}
 */
async function saveConversation(chatData) {
  const token = await getJwtToken();
  if (!token) {
    console.warn("[Lancerdesk] No JWT token. Please log in.");
    return null;
  }

  const soomgoUrl = chatData.url.split("?")[0];

  // 1단계: chrome.storage URL→ID 캐시 확인
  const stored = await new Promise((resolve) =>
    chrome.storage.local.get(["urlConvMap"], resolve)
  );
  const urlConvMap = stored.urlConvMap || {};
  const cachedId = urlConvMap[soomgoUrl];

  if (cachedId) {
    chrome.storage.local.set({ currentConversationId: cachedId });
    // client_name이 새로 파싱됐을 때만 PATCH (updated_at 갱신 겸)
    if (chatData.clientName || chatData.category) {
      apiRequest(`/conversations/${cachedId}`, {
        method: "PATCH",
        body: JSON.stringify({
          client_name: chatData.clientName || undefined,
          client_id:   chatData.clientId   || undefined,
          category:    chatData.category   || undefined,
        }),
      }).catch(() => {});
    }
    return { id: cachedId };
  }

  // 2단계: 백엔드에서 soomgo_url로 기존 대화 조회
  try {
    const existing = await apiRequest(
      `/conversations?soomgo_url=${encodeURIComponent(soomgoUrl)}`
    );
    if (existing && existing.length > 0) {
      const existingId = existing[0].id;
      urlConvMap[soomgoUrl] = existingId;
      chrome.storage.local.set({ urlConvMap, currentConversationId: existingId });
      // client_name / updated_at 갱신
      apiRequest(`/conversations/${existingId}`, {
        method: "PATCH",
        body: JSON.stringify({
          client_name: chatData.clientName || undefined,
          client_id:   chatData.clientId   || undefined,
          category:    chatData.category   || undefined,
        }),
      }).catch(() => {});
      return { id: existingId };
    }
  } catch (_) { /* fallthrough */ }

  // 3단계: 새 대화 생성
  const conversation = await apiRequest("/conversations", {
    method: "POST",
    body: JSON.stringify({
      soomgo_url: soomgoUrl,
      category: chatData.category,
      client_name: chatData.clientName || "",
      client_id: chatData.clientId || "",
      messages: chatData.messages,
    }),
  });
  urlConvMap[soomgoUrl] = conversation.id;
  chrome.storage.local.set({ urlConvMap, currentConversationId: conversation.id });
  return conversation;
}

/**
 * Request an AI reply suggestion from the backend.
 * @param {string} conversationId
 * @param {Array} messages
 * @param {string} category
 * @param {string} stylePrompt
 * @returns {Promise<string>}
 */
async function getAISuggestion(conversationId, messages, category, stylePrompt = "") {
  const result = await apiRequest("/ai/suggest", {
    method: "POST",
    body: JSON.stringify({ conversation_id: conversationId, messages, category, style_prompt: stylePrompt }),
  });
  return result.suggestion;
}

// ─── 탭 URL 캐시 ─────────────────────────────────────────────────────────────
// onActivated 내에서 동기에 가깝게 URL 참조하기 위해 인메모리 캐시 유지
const tabUrls = new Map();

// 서비스 워커 시작 시 현재 열린 탭 URL 일괄 캐싱
chrome.tabs.query({}, (tabs) => {
  tabs.forEach((t) => { if (t.id && t.url) tabUrls.set(t.id, t.url); });
});

chrome.tabs.onRemoved.addListener((tabId) => tabUrls.delete(tabId));

// ─── 사이드패널 자동 열기 / 닫기 ────────────────────────────────────────────

function isSoomgoUrl(url) {
  return typeof url === "string" && url.includes("soomgo.com");
}

function enablePanel(tabId) {
  return chrome.sidePanel
    .setOptions({ tabId, enabled: true, path: "sidepanel.html" })
    .catch(() => {});
}

function disablePanel(tabId) {
  return chrome.sidePanel
    .setOptions({ tabId, enabled: false })
    .catch(() => {});
}

function openPanel(windowId) {
  return chrome.sidePanel.open({ windowId }).catch(() => {});
}

// 탭 전환 시 ─ windowId가 이미 주어지므로 추가 조회 없이 처리
chrome.tabs.onActivated.addListener(({ tabId, windowId }) => {
  const cached = tabUrls.get(tabId);

  if (cached) {
    // 캐시 있음 → 바로 처리 (이벤트 컨텍스트 내, 동기적)
    if (isSoomgoUrl(cached)) {
      enablePanel(tabId).then(() => openPanel(windowId));
    } else {
      disablePanel(tabId);
    }
  } else {
    // 캐시 없음(서비스 워커 재시작 직후 등) → 비동기 조회
    chrome.tabs.get(tabId)
      .then((tab) => {
        const url = tab.url || tab.pendingUrl || "";
        if (url) tabUrls.set(tabId, url);
        if (isSoomgoUrl(url)) {
          enablePanel(tabId).then(() => openPanel(windowId));
        } else {
          disablePanel(tabId);
        }
      })
      .catch(() => {});
  }
});

// URL 변경 / 로드 완료 시
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const url = tab.url || changeInfo.url || "";
  if (url) tabUrls.set(tabId, url);                // 항상 캐시 갱신

  // 의미있는 변화가 없으면 패널 제어는 스킵
  if (!changeInfo.url && changeInfo.status !== "complete") return;

  const soomgo = isSoomgoUrl(url);

  if (soomgo && changeInfo.status === "complete") {
    chrome.storage.local.remove("currentConversationId");
  }

  if (!url) return;

  if (soomgo) {
    enablePanel(tabId);
    // 현재 활성 탭인 경우만 열기 (콜백 방식으로 이벤트 컨텍스트 유지)
    chrome.tabs.query({ active: true, currentWindow: true }, ([activeTab]) => {
      if (activeTab?.id === tabId) {
        openPanel(activeTab.windowId);
      }
    });
  } else {
    disablePanel(tabId);
  }
});

// 확장 아이콘 클릭 (수동 열기)
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id }).catch(() => {});
});

// Message handler — receives messages from content.js and sidepanel.js
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const { type, payload } = message;

  if (type === "CHAT_UPDATED") {
    saveConversation(payload)
      .then((conv) => {
        sendResponse({ success: true });
        if (conv) {
          // 저장 완료 → sidepanel에 목록 갱신 알림
          chrome.runtime.sendMessage({ type: "CONV_SAVED", conversationId: conv.id }).catch(() => {});
        }
      })
      .catch((err) => {
        console.error("[Lancerdesk] saveConversation failed:", err.message);
        sendResponse({ success: false, error: err.message });
      });
    return true;
  }

  if (type === "GET_AI_SUGGESTION") {
    const { conversationId, messages, category, stylePrompt } = payload;
    getAISuggestion(conversationId, messages, category, stylePrompt)
      .then((suggestion) => sendResponse({ success: true, suggestion }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (type === "GET_CURRENT_CONVERSATION") {
    chrome.storage.local.get(["currentConversationId"], (result) => {
      sendResponse({ conversationId: result.currentConversationId || null });
    });
    return true;
  }

  if (type === "FETCH_CONVERSATIONS") {
    apiRequest(`/conversations`)
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (type === "LOGIN") {
    const { email, password } = payload;
    fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.access_token) {
          chrome.storage.local.set({
            jwtToken: data.access_token,
            userId: data.user.id,
            userEmail: data.user.email,
          });
          sendResponse({ success: true, user: data.user });
        } else {
          sendResponse({ success: false, error: data.detail || "로그인 실패" });
        }
      })
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (type === "LOGOUT") {
    chrome.storage.local.remove(["jwtToken", "userId", "userEmail", "currentConversationId"]);
    sendResponse({ success: true });
    return true;
  }

  if (type === "GET_AUTH_STATE") {
    chrome.storage.local.get(["jwtToken", "userEmail"], (result) => {
      sendResponse({ isLoggedIn: !!result.jwtToken, email: result.userEmail || null });
    });
    return true;
  }

  if (type === "CREATE_PROJECT_FROM_CONV") {
    const { conversationId } = payload;
    apiRequest(`/conversations/${conversationId}/create-project`, { method: "POST" })
      .then((data) => sendResponse({ success: true, projectId: data.project.id, created: data.created }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
});
