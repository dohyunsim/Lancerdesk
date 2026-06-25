// Lancerdesk Side Panel Script

// ─── DOM refs ───────────────────────────────────────────────────────────────
const loginSection = document.getElementById("login-section");
const userSection = document.getElementById("user-section");
const emailInput = document.getElementById("email-input");
const passwordInput = document.getElementById("password-input");
const loginBtn = document.getElementById("login-btn");
const loginError = document.getElementById("login-error");
const userEmailDisplay = document.getElementById("user-email-display");
const logoutBtn = document.getElementById("logout-btn");

const statusDot = document.getElementById("status-dot");

const chatClientId = document.getElementById("chat-client-id");
const chatClientName = document.getElementById("chat-client-name");
const chatCategory = document.getElementById("chat-category");
const chatMessageCount = document.getElementById("chat-message-count");

const crawlBtn = document.getElementById("crawl-btn");
const crawlStatus = document.getElementById("crawl-status");
const refToggle = document.getElementById("ref-toggle");
const refToggleCount = document.getElementById("ref-toggle-count");
const refPanel = document.getElementById("ref-panel");
const refList = document.getElementById("ref-list");

const styleList = document.getElementById("style-list");
const addStyleBtn = document.getElementById("add-style-btn");
const addStyleForm = document.getElementById("add-style-form");
const styleNameInput = document.getElementById("style-name-input");
const stylePromptInput = document.getElementById("style-prompt-input");
const saveStyleBtn = document.getElementById("save-style-btn");
const cancelStyleBtn = document.getElementById("cancel-style-btn");

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
let selectedStyleId = null;

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

// ─── Auth ────────────────────────────────────────────────────────────────────
function checkAuthState() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "GET_AUTH_STATE" }, (res) => {
      if (res?.isLoggedIn) {
        loginSection.classList.add("hidden");
        userSection.classList.remove("hidden");
        userEmailDisplay.textContent = res.email || "";
        setStatus("active");
      } else {
        loginSection.classList.remove("hidden");
        userSection.classList.add("hidden");
        setStatus("idle");
      }
      resolve(res?.isLoggedIn || false);
    });
  });
}

loginBtn.addEventListener("click", () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  if (!email || !password) {
    loginError.textContent = "이메일과 비밀번호를 입력해주세요.";
    loginError.classList.remove("hidden");
    return;
  }
  loginError.classList.add("hidden");
  loginBtn.disabled = true;
  loginBtn.textContent = "로그인 중...";
  chrome.runtime.sendMessage({ type: "LOGIN", payload: { email, password } }, (res) => {
    loginBtn.disabled = false;
    loginBtn.textContent = "로그인";
    if (res?.success) {
      checkAuthState().then(() => loadConversations());
    } else {
      loginError.textContent = res?.error || "로그인 실패";
      loginError.classList.remove("hidden");
    }
  });
});

logoutBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "LOGOUT" }, () => {
    checkAuthState();
    conversationList.innerHTML = '<li class="empty-msg">로그인이 필요합니다.</li>';
    projectSelect && (projectSelect.innerHTML = '<option value="">-- 프로젝트 선택 --</option>');
  });
});

// ─── Chat data from content script ───────────────────────────────────────────
function renderRefMessages(messages) {
  const last10 = messages.slice(-10);
  refToggleCount.textContent = `${last10.length}개`;
  refList.innerHTML = last10
    .map((m) => {
      const role = m.role === "freelancer" ? "freelancer" : "client";
      const label = role === "freelancer" ? "나" : "고객";
      return `<li class="ref-msg ref-msg-${role}">
        <span class="ref-msg-label">${label}</span>
        <span class="ref-msg-content">${m.content}</span>
      </li>`;
    })
    .join("");
}

function updateChatMeta(data) {
  currentChatData = data;
  chatClientId.textContent = `고객 ID: ${data.clientId || "-"}`;
  chatClientName.textContent = `고객명: ${data.clientName || "-"}`;
  chatCategory.textContent = `카테고리: ${data.domCategory || data.category}`;
  chatMessageCount.textContent = `메시지 수: ${data.messages.length}`;
  renderRefMessages(data.messages);
  setStatus("active");
}

// AI 참고 대화 토글
refToggle.addEventListener("click", () => {
  const isHidden = refPanel.classList.toggle("hidden");
  refToggle.querySelector(".ref-arrow").textContent = isHidden ? "▼" : "▲";
});

// 처음부터 대화 불러오기
crawlBtn.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  crawlBtn.disabled = true;
  crawlBtn.textContent = "⏳ 불러오는 중...";
  crawlStatus.textContent = "스크롤 중... 잠시 기다려주세요";
  crawlStatus.classList.remove("hidden");

  chrome.tabs.sendMessage(tab.id, { type: "SCROLL_AND_CRAWL" }, (res) => {
    crawlBtn.disabled = false;
    crawlBtn.textContent = "📜 처음부터 대화 불러오기";
    if (res?.success && res.data) {
      updateChatMeta(res.data);
      crawlStatus.textContent = `완료: ${res.data.messages.length}개 메시지 로드됨`;
      setTimeout(() => crawlStatus.classList.add("hidden"), 3000);
    } else {
      crawlStatus.textContent = "불러오기 실패 — 숨고 채팅 페이지인지 확인해주세요";
      setTimeout(() => crawlStatus.classList.add("hidden"), 3000);
    }
  });
});

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

  const styles = await loadStyles();
  const selected = styles.find((s) => s.id === selectedStyleId);
  const stylePrompt = selected ? selected.prompt : "";

  chrome.runtime.sendMessage(
    {
      type: "GET_AI_SUGGESTION",
      payload: {
        conversationId: currentConversationId,
        messages: currentChatData.messages,
        category: currentChatData.category,
        stylePrompt,
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
const DASHBOARD_URL = "https://lancerdesk-dashboard.vercel.app";

async function getHiddenConvIds() {
  return new Promise((r) => chrome.storage.local.get(["hiddenConvIds"], (s) => r(s.hiddenConvIds || [])));
}
async function hideConvId(id) {
  const hidden = await getHiddenConvIds();
  await new Promise((r) => chrome.storage.local.set({ hiddenConvIds: [...hidden, id] }, r));
}

async function loadConversations() {
  const isLoggedIn = await new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "GET_AUTH_STATE" }, (res) => {
      resolve(res?.isLoggedIn || false);
    });
  });

  if (!isLoggedIn) {
    conversationList.innerHTML = '<li class="empty-msg">로그인이 필요합니다.</li>';
    return;
  }

  chrome.runtime.sendMessage({ type: "FETCH_CONVERSATIONS" }, async (response) => {
    if (!response?.success || !response.data?.length) {
      conversationList.innerHTML = '<li class="empty-msg">대화가 없습니다.</li>';
      return;
    }

    const hidden = await getHiddenConvIds();

    // 같은 soomgo_url은 하나로 (가장 최신 유지), 숨긴 항목 제거
    const seen = new Set();
    const deduped = response.data.filter((conv) => {
      if (hidden.includes(conv.id)) return false;
      const key = conv.soomgo_url || conv.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (!deduped.length) {
      conversationList.innerHTML = '<li class="empty-msg">대화가 없습니다.</li>';
      return;
    }

    conversationList.innerHTML = deduped
      .slice(0, 10)
      .map((conv) => {
        const name = conv.client_name || "이름 없음";
        const cat = conv.category || "-";
        const date = new Date(conv.created_at).toLocaleDateString("ko-KR");
        const convUrl = conv.soomgo_url || "";
        const dashUrl = `${DASHBOARD_URL}/conversations`;
        return `
          <li class="conv-item conv-item-link" data-id="${conv.id}" data-url="${convUrl}">
            <div class="conv-main">
              <span class="conv-client-name">${name}</span>
              <span class="conv-category-tag">${cat}</span>
            </div>
            <div class="conv-sub">
              <span class="conv-date">${date}</span>
              <div class="conv-actions">
                <a class="conv-dash-btn" href="${dashUrl}" target="_blank" title="대시보드에서 보기">📋</a>
                <button class="conv-delete-btn" data-id="${conv.id}" title="목록에서 삭제">×</button>
              </div>
            </div>
          </li>`;
      })
      .join("");

    // 숨고 URL 클릭 이동 (delete/dash 버튼 제외)
    conversationList.querySelectorAll(".conv-item-link").forEach((item) => {
      item.addEventListener("click", (e) => {
        if (e.target.classList.contains("conv-delete-btn") ||
            e.target.classList.contains("conv-dash-btn")) return;
        const url = item.dataset.url;
        if (!url) return;
        chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
          if (tab?.id) chrome.tabs.update(tab.id, { url });
        });
      });
    });

    // X 버튼 → 로컬에서 숨기기
    conversationList.querySelectorAll(".conv-delete-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        await hideConvId(btn.dataset.id);
        loadConversations();
      });
    });
  });
}

refreshBtn.addEventListener("click", loadConversations);

// ─── Reply Styles ─────────────────────────────────────────────────────────────
const DEFAULT_STYLES = [
  { id: "friendly",     name: "친근하게",   prompt: "친근하고 편안한 말투로, 자연스럽게 작성해주세요." },
  { id: "professional", name: "전문적으로", prompt: "전문적이고 신뢰감 있는 톤으로 격식 있게 작성해주세요." },
  { id: "short",        name: "짧게",       prompt: "핵심만 담아 100자 이내로 간결하게 작성해주세요." },
];

async function loadStyles() {
  return new Promise((resolve) =>
    chrome.storage.local.get(["replyStyles"], (r) => resolve(r.replyStyles || DEFAULT_STYLES))
  );
}

async function saveStyles(styles) {
  return new Promise((resolve) => chrome.storage.local.set({ replyStyles: styles }, resolve));
}

async function renderStyles() {
  const styles = await loadStyles();
  styleList.innerHTML = styles.map((s) => `
    <div class="style-item ${s.id === selectedStyleId ? "selected" : ""}"
         data-id="${s.id}" data-prompt="${s.prompt.replace(/"/g, "&quot;")}">
      <span class="style-item-name">${s.name}</span>
      <button class="style-delete-btn" data-id="${s.id}" title="삭제">×</button>
    </div>`).join("");

  styleList.querySelectorAll(".style-item").forEach((el) => {
    el.addEventListener("click", (e) => {
      if (e.target.classList.contains("style-delete-btn")) return;
      selectedStyleId = selectedStyleId === el.dataset.id ? null : el.dataset.id;
      renderStyles();
    });
  });

  styleList.querySelectorAll(".style-delete-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const styles = await loadStyles();
      await saveStyles(styles.filter((s) => s.id !== btn.dataset.id));
      if (selectedStyleId === btn.dataset.id) selectedStyleId = null;
      renderStyles();
    });
  });
}

addStyleBtn.addEventListener("click", () => {
  addStyleForm.classList.toggle("hidden");
  styleNameInput.value = "";
  stylePromptInput.value = "";
});
cancelStyleBtn.addEventListener("click", () => addStyleForm.classList.add("hidden"));
saveStyleBtn.addEventListener("click", async () => {
  const name = styleNameInput.value.trim();
  const prompt = stylePromptInput.value.trim();
  if (!name || !prompt) return;
  const styles = await loadStyles();
  styles.push({ id: `custom_${Date.now()}`, name, prompt });
  await saveStyles(styles);
  addStyleForm.classList.add("hidden");
  renderStyles();
});

// ─── Init ─────────────────────────────────────────────────────────────────────
(async function init() {
  await checkAuthState();
  await fetchChatData();
  await loadConversations();
  await renderStyles();

  chrome.runtime.sendMessage({ type: "GET_CURRENT_CONVERSATION" }, (res) => {
    currentConversationId = res?.conversationId || null;
  });
})();
