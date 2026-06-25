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
    const lastMsg = chatData.messages[chatData.messages.length - 1];
    if (lastMsg) {
      await apiRequest(`/conversations/${cachedId}/messages`, {
        method: "POST",
        body: JSON.stringify(lastMsg),
      });
    }
    chrome.storage.local.set({ currentConversationId: cachedId });
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
      const lastMsg = chatData.messages[chatData.messages.length - 1];
      if (lastMsg) {
        await apiRequest(`/conversations/${existingId}/messages`, {
          method: "POST",
          body: JSON.stringify(lastMsg),
        });
      }
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

// Reset current conversation ID when navigating to a new soomgo chat page
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status === "complete" &&
    tab.url &&
    tab.url.includes("soomgo.com")
  ) {
    // Clear cached conversation ID on page load so a new one is created
    chrome.storage.local.remove("currentConversationId");
  }
});

// Open side panel when the extension action is clicked
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

// Message handler — receives messages from content.js and sidepanel.js
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const { type, payload } = message;

  if (type === "CHAT_UPDATED") {
    saveConversation(payload)
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
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
});
