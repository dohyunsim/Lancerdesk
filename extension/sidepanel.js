// Lancerdesk Side Panel Script

// ─── DOM refs ───────────────────────────────────────────────────────────────
const apiKeyInput = document.getElementById("api-key-input");
const userIdInput = document.getElementById("user-id-input");
const saveSettingsBtn = document.getElementById("save-settings-btn");
const statusDot = document.getElementById("status-dot");

const chatCategory = document.getElementById("chat-category");
const chatUrl = document.getElementById("chat-url");
const chatMessageCount = document.getElementById("chat-message-count");

const getSuggestionBtn = document.getElementById("get-suggestion-btn");
const suggestionBox = document.getElementById("suggestion-box");
const suggestionText = document.getElementById("suggestion-text");
const copyBtn = document.getElementById("copy-btn");
const aiLoading = document.getElementById("ai-loading");
const aiError = document.getElementById("ai-error");

const refreshBtn = document.getElementById("refresh-btn");
const conversationList = document.getElementById("conversation-list");

// ─── State ───────────────────────────────────────────────────────────────────
let currentChatData = null;
let currentConversationId = null;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function setStatus(state) {
  statusDot.className = "status-dot";
  if (state === "active") statusDot.classList.add("status-active");
  else if (state === "error") statusDot.classList.add("status-error");
  else statusDot.classList.add("status-idle");
}

function showError(msg) {
  aiError.textContent = msg;
  aiError.classList.remove("hidden");
}

function clearError() {
  aiError.textContent = "";
  aiError.classList.add("hidden");
}

// ─── Settings ────────────────────────────────────────────────────────────────
async function loadSettings() {
  chrome.storage.sync.get(["apiKey"], (result) => {
    if (result.apiKey) apiKeyInput.value = result.apiKey;
  });
  chrome.storage.local.get(["userId"], (result) => {
    if (result.userId) userIdInput.value = result.userId;
  });
}

saveSettingsBtn.addEventListener("click", () => {
  const apiKey = apiKeyInput.value.trim();
  const userId = userIdInput.value.trim();

  if (!apiKey || !userId) {
    showError("API 키와 User ID를 모두 입력해주세요.");
    return;
  }

  clearError();
  chrome.runtime.sendMessage({ type: "SET_API_KEY", payload: { apiKey } });
  chrome.runtime.sendMessage({ type: "SET_USER_ID", payload: { userId } });

  setStatus("active");
  saveSettingsBtn.textContent = "저장됨 ✓";
  setTimeout(() => {
    saveSettingsBtn.textContent = "설정 저장";
  }, 2000);
});

// ─── Chat data from content script ───────────────────────────────────────────
function updateChatMeta(data) {
  currentChatData = data;
  chatCategory.textContent = `카테고리: ${data.category}`;
  chatUrl.textContent = `URL: ${data.url}`;
  chatMessageCount.textContent = `메시지 수: ${data.messages.length}`;
  setStatus("active");
}

// Ask content script for current chat data
async function fetchChatData() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  chrome.tabs.sendMessage(tab.id, { type: "GET_CHAT_DATA" }, (response) => {
    if (chrome.runtime.lastError) return;
    if (response?.success && response.data) {
      updateChatMeta(response.data);
    }
  });
}

// Listen for live updates pushed by the content script
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "CHAT_UPDATED" && message.payload) {
    updateChatMeta(message.payload);

    // Get the cached conversation ID
    chrome.runtime.sendMessage(
      { type: "GET_CURRENT_CONVERSATION" },
      (res) => {
        if (res?.conversationId) {
          currentConversationId = res.conversationId;
        }
      }
    );
  }
});

// ─── AI Suggestion ───────────────────────────────────────────────────────────
getSuggestionBtn.addEventListener("click", async () => {
  if (!currentChatData) {
    showError("현재 페이지에서 대화를 찾을 수 없습니다.");
    return;
  }

  if (!currentConversationId) {
    // Try to get the ID one more time
    chrome.runtime.sendMessage({ type: "GET_CURRENT_CONVERSATION" }, (res) => {
      currentConversationId = res?.conversationId || null;
    });
  }

  if (!currentConversationId) {
    showError("대화 ID를 찾을 수 없습니다. 페이지를 새로고침 해주세요.");
    return;
  }

  clearError();
  suggestionBox.classList.add("hidden");
  aiLoading.classList.remove("hidden");
  getSuggestionBtn.disabled = true;

  chrome.runtime.sendMessage(
    {
      type: "GET_AI_SUGGESTION",
      payload: {
        conversationId: currentConversationId,
        messages: currentChatData.messages,
        category: currentChatData.category,
      },
    },
    (response) => {
      aiLoading.classList.add("hidden");
      getSuggestionBtn.disabled = false;

      if (response?.success) {
        suggestionText.textContent = response.suggestion;
        suggestionBox.classList.remove("hidden");
      } else {
        showError(`AI 오류: ${response?.error || "알 수 없는 오류"}`);
      }
    }
  );
});

copyBtn.addEventListener("click", () => {
  const text = suggestionText.textContent;
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    copyBtn.textContent = "복사됨 ✓";
    setTimeout(() => (copyBtn.textContent = "클립보드에 복사"), 2000);
  });
});

// ─── Conversation List ────────────────────────────────────────────────────────
async function loadConversations() {
  const { userId } = await new Promise((resolve) =>
    chrome.storage.local.get(["userId"], resolve)
  );

  if (!userId) {
    conversationList.innerHTML =
      '<li class="empty-msg">User ID를 설정해주세요.</li>';
    return;
  }

  chrome.runtime.sendMessage(
    { type: "FETCH_CONVERSATIONS", payload: { userId } },
    (response) => {
      if (!response?.success || !response.data?.length) {
        conversationList.innerHTML =
          '<li class="empty-msg">대화가 없습니다.</li>';
        return;
      }

      conversationList.innerHTML = response.data
        .slice(0, 10)
        .map(
          (conv) => `
          <li class="conv-item">
            <span class="conv-category badge">${conv.category}</span>
            <span class="conv-date">${new Date(conv.created_at).toLocaleDateString("ko-KR")}</span>
            <span class="conv-count">${(conv.messages || []).length}개 메시지</span>
          </li>`
        )
        .join("");
    }
  );
}

refreshBtn.addEventListener("click", loadConversations);

// ─── Init ─────────────────────────────────────────────────────────────────────
(async function init() {
  await loadSettings();
  await fetchChatData();
  await loadConversations();

  chrome.runtime.sendMessage({ type: "GET_CURRENT_CONVERSATION" }, (res) => {
    currentConversationId = res?.conversationId || null;
  });
})();
