// Lancerdesk Side Panel Script

// ─── DOM refs ───────────────────────────────────────────────────────────────
const loginSection       = document.getElementById("login-section");
const emailInput         = document.getElementById("email-input");
const passwordInput      = document.getElementById("password-input");
const loginBtn           = document.getElementById("login-btn");
const loginError         = document.getElementById("login-error");

const statusDot          = document.getElementById("status-dot");

const chatClientId       = document.getElementById("chat-client-id");
const chatClientName     = document.getElementById("chat-client-name");
const chatCategory       = document.getElementById("chat-category");
const chatMessageCount   = document.getElementById("chat-message-count");

const crawlBtn           = document.getElementById("crawl-btn");
const crawlStatus        = document.getElementById("crawl-status");

// 하단 고정 바 / FAB
const bottomBar          = document.getElementById("bottom-bar");
const refOpenBtn         = document.getElementById("ref-open-btn");
const refToggleCount     = document.getElementById("ref-toggle-count");
const profileFabWrap     = document.getElementById("profile-fab-wrap");
const profileFab         = document.getElementById("profile-fab");
const profileFabMenu     = document.getElementById("profile-fab-menu");
const userEmailDisplay   = document.getElementById("user-email-display");
const logoutBtn          = document.getElementById("logout-btn");
const dashboardFab       = document.getElementById("dashboard-fab");

// 오버레이
const refOverlay         = document.getElementById("ref-overlay");
const refOverlayClose    = document.getElementById("ref-overlay-close");
const refOverlayList     = document.getElementById("ref-overlay-list");
const refRangeStart      = document.getElementById("ref-range-start");
const refRangeEnd        = document.getElementById("ref-range-end");
const refRangeStartLabel = document.getElementById("ref-range-start-label");
const refRangeEndLabel   = document.getElementById("ref-range-end-label");
const refRangeInfo       = document.getElementById("ref-range-info");
const refSelectAllBtn    = document.getElementById("ref-select-all-btn");
const refSelectLast20Btn = document.getElementById("ref-select-last20-btn");
const refSelectLast10Btn = document.getElementById("ref-select-last10-btn");
const refSelectLast5Btn  = document.getElementById("ref-select-last5-btn");
const refConfirmBtn      = document.getElementById("ref-confirm-btn");

const styleList          = document.getElementById("style-list");
const addStyleBtn        = document.getElementById("add-style-btn");
const addStyleForm       = document.getElementById("add-style-form");
const styleNameInput     = document.getElementById("style-name-input");
const stylePromptInput   = document.getElementById("style-prompt-input");
const saveStyleBtn       = document.getElementById("save-style-btn");
const cancelStyleBtn     = document.getElementById("cancel-style-btn");

const getSuggestionBtn   = document.getElementById("get-suggestion-btn");
const suggestionBox      = document.getElementById("suggestion-box");
const suggestionText     = document.getElementById("suggestion-text");
const copyBtn            = document.getElementById("copy-btn");
const aiLoading          = document.getElementById("ai-loading");
const aiError            = document.getElementById("ai-error");

const conversationList   = document.getElementById("conversation-list");

// ─── State ───────────────────────────────────────────────────────────────────
let currentChatData       = null;
let currentConversationId = null;
let selectedStyleId       = null;
let rangeStart            = 1;  // 1-based
let rangeEnd              = 1;  // 1-based

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
        loginSection.style.display = "none";
        profileFabWrap.classList.remove("hidden");
        profileFabWrap.style.display = "";
        userEmailDisplay.textContent = res.email || "";
        setStatus("active");
      } else {
        loginSection.classList.remove("hidden");
        loginSection.style.display = "";
        profileFabWrap.classList.add("hidden");
        profileFabWrap.style.display = "none";
        setStatus("idle");
      }
      resolve(res?.isLoggedIn || false);
    });
  });
}

loginBtn.addEventListener("click", () => {
  const email    = emailInput.value.trim();
  const password = passwordInput.value.trim();
  if (!email || !password) {
    loginError.textContent = "이메일과 비밀번호를 입력해주세요.";
    loginError.classList.remove("hidden");
    return;
  }
  loginError.classList.add("hidden");
  loginBtn.disabled   = true;
  loginBtn.textContent = "로그인 중...";
  chrome.runtime.sendMessage({ type: "LOGIN", payload: { email, password } }, (res) => {
    loginBtn.disabled   = false;
    loginBtn.textContent = "로그인";
    if (res?.success) {
      checkAuthState().then(() => loadConversations());
    } else {
      loginError.textContent = res?.error || "로그인 실패";
      loginError.classList.remove("hidden");
    }
  });
});

// 프로필 FAB 토글
profileFab.addEventListener("click", (e) => {
  e.stopPropagation();
  profileFabMenu.classList.toggle("hidden");
});
document.addEventListener("click", (e) => {
  if (!profileFabWrap.contains(e.target)) profileFabMenu.classList.add("hidden");
});

logoutBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "LOGOUT" }, () => {
    profileFabMenu.classList.add("hidden");
    checkAuthState();
    conversationList.innerHTML = '<li class="empty-msg">로그인이 필요합니다.</li>';
  });
});

// 대시보드 FAB → 새 탭으로 대시보드 열기
dashboardFab.addEventListener("click", () => {
  chrome.tabs.create({ url: DASHBOARD_URL });
});

// ─── Chat data from content script ───────────────────────────────────────────
function updateChatMeta(data) {
  currentChatData = data;
  chatClientId.textContent    = `고객 ID: ${data.clientId || "-"}`;
  chatClientName.textContent  = `고객명: ${data.clientName || "-"}`;
  chatCategory.textContent    = `카테고리: ${data.domCategory || data.category}`;
  chatMessageCount.textContent = `메시지 수: ${data.messages.length}`;
  refToggleCount.textContent  = `${data.messages.length}개`;
  // 새 데이터 → 범위 초기화 (전체)
  const n = data.messages.length;
  rangeStart = 1;
  rangeEnd   = n;
  setStatus("active");
}

async function fetchChatData() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  chrome.tabs.sendMessage(tab.id, { type: "GET_CHAT_DATA" }, (response) => {
    if (chrome.runtime.lastError) return;
    if (response?.success && response.data) updateChatMeta(response.data);
  });
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "CHAT_UPDATED" && message.payload) {
    updateChatMeta(message.payload);
  }
  // background가 DB 저장 완료 후 보내는 신호 → 목록 즉시 갱신
  if (message.type === "CONV_SAVED") {
    if (message.conversationId) currentConversationId = message.conversationId;
    loadConversations();
  }
});

// ─── 처음부터 크롤링 ──────────────────────────────────────────────────────────
crawlBtn.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  crawlBtn.disabled    = true;
  crawlBtn.textContent = "⏳ 불러오는 중...";
  crawlStatus.textContent = "스크롤 중... 잠시 기다려주세요";
  crawlStatus.classList.remove("hidden");

  chrome.tabs.sendMessage(tab.id, { type: "SCROLL_AND_CRAWL" }, (res) => {
    crawlBtn.disabled    = false;
    crawlBtn.textContent = "📜 처음부터 대화 불러오기";
    if (res?.success && res.data) {
      updateChatMeta(res.data);
      crawlStatus.textContent = `완료: ${res.data.messages.length}개 메시지 로드됨`;
    } else {
      crawlStatus.textContent = "실패 — 숨고 채팅 페이지인지 확인해주세요";
    }
    setTimeout(() => crawlStatus.classList.add("hidden"), 3000);
  });
});

// ─── AI 참고 대화 오버레이 ────────────────────────────────────────────────────
function openRefOverlay() {
  syncRangeSliders();
  renderOverlayPreview();
  refOverlay.classList.remove("hidden");
  requestAnimationFrame(() => requestAnimationFrame(() => refOverlay.classList.add("open")));
}

function closeRefOverlay() {
  refOverlay.classList.remove("open");
  setTimeout(() => refOverlay.classList.add("hidden"), 320);
}

function syncRangeSliders() {
  const n = currentChatData?.messages?.length || 0;
  refRangeStart.min = refRangeStart.max = refRangeEnd.min = refRangeEnd.max = "1";
  if (n > 0) {
    refRangeStart.min = "1"; refRangeStart.max = String(n); refRangeStart.value = String(rangeStart);
    refRangeEnd.min   = "1"; refRangeEnd.max   = String(n); refRangeEnd.value   = String(rangeEnd);
  }
  updateRangeLabels();
}

function updateRangeLabels() {
  const s = parseInt(refRangeStart.value, 10);
  const e = parseInt(refRangeEnd.value,   10);
  const count = Math.max(0, e - s + 1);
  refRangeStartLabel.textContent = `시작: ${s}번`;
  refRangeEndLabel.textContent   = `끝: ${e}번`;
  refRangeInfo.textContent       = `${count}개 선택`;
  refConfirmBtn.textContent      = `이 범위(${count}개)로 AI 답변 받기`;
  rangeStart = s;
  rangeEnd   = e;
  renderOverlayPreview();
}

function renderOverlayPreview() {
  const msgs = currentChatData?.messages || [];
  const s = Math.max(0, rangeStart - 1); // 0-based
  const e = Math.min(msgs.length - 1, rangeEnd - 1);

  refOverlayList.innerHTML = msgs
    .map((m, i) => {
      const inRange   = i >= s && i <= e;
      const isFreel   = m.role === "freelancer";
      const label     = isFreel ? "나" : "고객";
      const preview   = (m.content || "").slice(0, 55) + (m.content?.length > 55 ? "…" : "");
      return `
        <li class="ref-ol-item${isFreel ? " ref-ol-freelancer" : ""}${inRange ? " ref-ol-in-range" : ""}">
          <span class="ref-ol-num">${i + 1}</span>
          <span class="ref-ol-role">${label}</span>
          <span class="ref-ol-text">${preview}</span>
        </li>`;
    })
    .join("");
}

refRangeStart.addEventListener("input", () => {
  // 시작이 끝보다 크면 끝을 맞춰줌
  if (parseInt(refRangeStart.value) > parseInt(refRangeEnd.value)) {
    refRangeEnd.value = refRangeStart.value;
  }
  updateRangeLabels();
});
refRangeEnd.addEventListener("input", () => {
  if (parseInt(refRangeEnd.value) < parseInt(refRangeStart.value)) {
    refRangeStart.value = refRangeEnd.value;
  }
  updateRangeLabels();
});

// 빠른 선택
refSelectAllBtn.addEventListener("click", () => {
  const n = currentChatData?.messages?.length || 1;
  refRangeStart.value = "1"; refRangeEnd.value = String(n);
  updateRangeLabels();
});
refSelectLast20Btn.addEventListener("click", () => {
  const n = currentChatData?.messages?.length || 1;
  refRangeStart.value = String(Math.max(1, n - 19)); refRangeEnd.value = String(n);
  updateRangeLabels();
});
refSelectLast10Btn.addEventListener("click", () => {
  const n = currentChatData?.messages?.length || 1;
  refRangeStart.value = String(Math.max(1, n - 9)); refRangeEnd.value = String(n);
  updateRangeLabels();
});
refSelectLast5Btn.addEventListener("click", () => {
  const n = currentChatData?.messages?.length || 1;
  refRangeStart.value = String(Math.max(1, n - 4)); refRangeEnd.value = String(n);
  updateRangeLabels();
});

refOpenBtn.addEventListener("click", openRefOverlay);
refOverlayClose.addEventListener("click", closeRefOverlay);
refOverlay.addEventListener("click", (e) => { if (e.target === refOverlay) closeRefOverlay(); });

// 확인 → 오버레이 닫고 AI 생성
refConfirmBtn.addEventListener("click", () => {
  closeRefOverlay();
  getSuggestionBtn.click();
});

// ─── AI Suggestion ───────────────────────────────────────────────────────────
getSuggestionBtn.addEventListener("click", async () => {
  if (!currentChatData) {
    showError("현재 페이지에서 대화를 찾을 수 없습니다.");
    return;
  }

  if (!currentConversationId) {
    await new Promise((resolve) =>
      chrome.runtime.sendMessage({ type: "GET_CURRENT_CONVERSATION" }, (res) => {
        currentConversationId = res?.conversationId || null;
        resolve();
      })
    );
  }

  if (!currentConversationId) {
    showError("대화 ID를 찾을 수 없습니다. 페이지를 새로고침 해주세요.");
    return;
  }

  clearError();
  suggestionBox.classList.add("hidden");
  aiLoading.classList.remove("hidden");
  getSuggestionBtn.disabled = true;

  // 범위 내 메시지만 (0-based slice)
  const allMsgs = currentChatData.messages;
  const s = Math.max(0, rangeStart - 1);
  const e = Math.min(allMsgs.length, rangeEnd);
  const messagesToSend = allMsgs.slice(s, e);

  const styles       = await loadStyles();
  const selectedStyle = styles.find((st) => st.id === selectedStyleId);
  const stylePrompt  = selectedStyle ? selectedStyle.prompt : "";

  chrome.runtime.sendMessage(
    {
      type: "GET_AI_SUGGESTION",
      payload: {
        conversationId: currentConversationId,
        messages: messagesToSend,
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
    chrome.runtime.sendMessage({ type: "GET_AUTH_STATE" }, (res) => resolve(res?.isLoggedIn || false));
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

    const fmtDate = (iso) => {
      if (!iso) return "-";
      const d = new Date(iso);
      return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")}`;
    };

    conversationList.innerHTML = deduped.slice(0, 15).map((conv) => {
      const name      = conv.client_name || "고객명 미확인";
      const cat       = conv.category    || "general";
      const firstDate = fmtDate(conv.created_at);
      const lastDate  = fmtDate(conv.updated_at);
      const sameDate  = firstDate === lastDate;
      const convUrl   = conv.soomgo_url || "";
      return `
        <li class="conv-item conv-item-link" data-id="${conv.id}" data-url="${convUrl}">
          <div class="conv-main">
            <span class="conv-client-name">${name}</span>
            <span class="conv-category-tag">${cat}</span>
          </div>
          <div class="conv-dates">
            <span class="conv-date-label">첫 상담</span>
            <span class="conv-date-val">${firstDate}</span>
            ${sameDate ? "" : `<span class="conv-date-sep">→</span>
            <span class="conv-date-label">최근</span>
            <span class="conv-date-val">${lastDate}</span>`}
          </div>
          <div class="conv-actions">
            <button class="conv-action-btn conv-dash-btn" data-id="${conv.id}" title="대시보드에 추가">📋</button>
            <button class="conv-action-btn conv-delete-btn" data-id="${conv.id}" title="삭제">✕</button>
          </div>
        </li>`;
    }).join("");

    // 항목 클릭 → 해당 숨고 채팅방으로 이동
    conversationList.querySelectorAll(".conv-item-link").forEach((item) => {
      item.addEventListener("click", (e) => {
        if (e.target.closest(".conv-action-btn")) return;
        const url = item.dataset.url;
        if (!url) return;
        chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
          if (tab?.id) chrome.tabs.update(tab.id, { url });
        });
      });
    });

    // 대시보드 버튼 → 대시보드 새 탭
    conversationList.querySelectorAll(".conv-dash-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        chrome.tabs.create({ url: `${DASHBOARD_URL}/conversations` });
      });
    });

    // 삭제 버튼 → 로컬 히든 목록에 추가
    conversationList.querySelectorAll(".conv-delete-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        await hideConvId(btn.dataset.id);
        loadConversations();
      });
    });
  });
}

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
         data-id="${s.id}">
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
  styleNameInput.value   = "";
  stylePromptInput.value = "";
});
cancelStyleBtn.addEventListener("click", () => addStyleForm.classList.add("hidden"));
saveStyleBtn.addEventListener("click", async () => {
  const name   = styleNameInput.value.trim();
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
