// Lancerdesk Background Service Worker (Manifest V3)

// 운영 배포 URL (개발 시에는 "http://localhost:8000" 으로 변경)
const API_BASE_URL = "https://your-railway-app.railway.app";

/**
 * Retrieve stored API key from chrome.storage.sync.
 * @returns {Promise<string>}
 */
async function getApiKey() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["apiKey"], (result) => {
      resolve(result.apiKey || "");
    });
  });
}

/**
 * Send a request to the Lancerdesk backend.
 * @param {string} path - API path (e.g., '/conversations')
 * @param {object} options - fetch options
 * @returns {Promise<any>}
 */
async function apiRequest(path, options = {}) {
  const apiKey = await getApiKey();
  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
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
 * @param {object} chatData - { messages, url, category }
 * @returns {Promise<object>}
 */
async function saveConversation(chatData) {
  const stored = await new Promise((resolve) => {
    chrome.storage.local.get(["userId", "currentConversationId"], resolve);
  });

  const userId = stored.userId;
  if (!userId) {
    console.warn("[Lancerdesk] No userId stored. Set it via the sidepanel.");
    return null;
  }

  // If we already have a conversation for this URL, append messages
  const existingId = stored.currentConversationId;
  if (existingId) {
    // Append the last message only to avoid duplicates
    const lastMsg = chatData.messages[chatData.messages.length - 1];
    if (lastMsg) {
      await apiRequest(`/conversations/${existingId}/messages`, {
        method: "POST",
        body: JSON.stringify(lastMsg),
      });
    }
    return { id: existingId };
  }

  // Create a new conversation
  const conversation = await apiRequest("/conversations", {
    method: "POST",
    body: JSON.stringify({
      user_id: userId,
      soomgo_url: chatData.url,
      category: chatData.category,
      messages: chatData.messages,
    }),
  });

  // Cache the conversation ID for subsequent appends
  chrome.storage.local.set({ currentConversationId: conversation.id });
  return conversation;
}

/**
 * Request an AI reply suggestion from the backend.
 * @param {string} conversationId
 * @param {Array} messages
 * @param {string} category
 * @returns {Promise<string>}
 */
async function getAISuggestion(conversationId, messages, category) {
  const result = await apiRequest("/ai/suggest", {
    method: "POST",
    body: JSON.stringify({ conversation_id: conversationId, messages, category }),
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
    const { conversationId, messages, category } = payload;
    getAISuggestion(conversationId, messages, category)
      .then((suggestion) => sendResponse({ success: true, suggestion }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (type === "SET_USER_ID") {
    chrome.storage.local.set({ userId: payload.userId }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (type === "SET_API_KEY") {
    chrome.storage.sync.set({ apiKey: payload.apiKey }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (type === "GET_CURRENT_CONVERSATION") {
    chrome.storage.local.get(["currentConversationId"], (result) => {
      sendResponse({ conversationId: result.currentConversationId || null });
    });
    return true;
  }

  if (type === "FETCH_CONVERSATIONS") {
    const { userId } = payload;
    apiRequest(`/conversations?user_id=${userId}`)
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
});
