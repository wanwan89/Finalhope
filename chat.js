import { createClient } from "https://esm.sh/@supabase/supabase-js";

// ===== Supabase config =====
const SUPABASE_URL = "https://hqetnqnvmdxdgfnnluew.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZXRucW52bWR4ZGdmbm5sdWV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MzUyODIsImV4cCI6MjA4NzMxMTI4Mn0.Cr9lDBZMqfeONi1dfyFzHpBtawBzZTQLBEWKmPJVAOA";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== Audio Config =====
const sendSound = new Audio('send.mp3');
const receiveSound = new Audio('receive.mp3');

// ===== Global State =====
let currentRoomId = 'room-1';
let currentReplyId = null;
let currentUser = null;
let myUsername = "Guest";
let myRole = "user";
let presenceChannel = null;
let messageChannel = null;
let typingTimeout = null;
let isCurrentlyTyping = false;
let selectedMessageId = null;
let isFirstMessageLoad = true; // ✅ WAJIB TAMBAH INI

// ===== DOM =====
const messagesEl = document.getElementById("chat-messages");
const inputEl = document.getElementById("chat-input");
const Btn = document.getElementById("send-btn");
const membersEl = document.getElementById("chat-members");
const typingEl = document.getElementById("typing-indicator");

const sidebar = document.querySelector('.sidebar');
const overlay = document.querySelector('.sidebar-overlay');
const hamburger = document.querySelector('.hamburger-btn');

const menuBtn = document.getElementById("menu-btn");
const sidebarOverlay = document.getElementById("sidebar-overlay");
const inputSearchId = document.getElementById("input-search-id");
const btnSearchId = document.getElementById("btn-search-id");
const sideUsername = document.getElementById("side-username");
const sideAvatar = document.getElementById("side-avatar");
const myUniqueId = document.getElementById("my-unique-id");
const privateChatList = document.getElementById("private-chat-list");

const stickerMenu = document.getElementById("sticker-menu");
const stickerList = document.getElementById("sticker-list");
const searchInput = document.getElementById("sticker-search-input");
const searchBtn = document.getElementById("sticker-search-btn");

// ===== Helpers =====
function scrollToBottom() {
  if (messagesEl) {
    messagesEl.scrollTo({
      top: messagesEl.scrollHeight,
      behavior: 'smooth'
    });
  }
}

function closeSidebar() {
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.style.display = 'none';
  if (sidebarOverlay) sidebarOverlay.style.display = 'none';
}

function openSidebar() {
  if (sidebar) sidebar.classList.add('open');
  if (overlay) overlay.style.display = 'block';
}

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatTime(dateString) {
  const d = new Date(dateString);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function showToast(message) {
  // Gunakan ID 'toast' agar nyambung dengan CSS kita
  let container = document.getElementById("toast");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast";
    document.body.appendChild(container);
  }

  // Buat kartu toast dengan struktur lengkap (Icon + Text)
  const toast = document.createElement("div");
  toast.className = "toast-card";
  
  toast.innerHTML = `
    <div class="toast-icon-wrap warning">
      <span class="toast-icon">!</span>
    </div>
    <div class="toast-content">
      <span class="toast-title">Pemberitahuan</span>
      <span class="toast-subtitle">${message}</span>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
  `;

  container.appendChild(toast);

  // Animasi muncul
  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  // Otomatis hilang dalam 3 detik
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}


// 👇 TARUH DI SINI PERSIS
function showChatLoading() {
  if (!messagesEl) return;

  messagesEl.innerHTML = `
    <div class="chat-loading-screen">

      <div class="skeleton-msg left">
        <div class="skeleton-avatar shimmer"></div>
        <div class="skeleton-bubble">
          <div class="shimmer skeleton-line w1"></div>
          <div class="shimmer skeleton-line w2"></div>
          <div class="shimmer skeleton-line w3"></div>
        </div>
      </div>

      <div class="skeleton-msg right">
        <div class="skeleton-bubble me">
          <div class="shimmer skeleton-line w4"></div>
          <div class="shimmer skeleton-line w5"></div>
        </div>
      </div>

      <div class="skeleton-msg left">
        <div class="skeleton-avatar shimmer"></div>
        <div class="skeleton-bubble typing-bubble">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>

      <div class="loading-chat-hint">
        Menyambungkan percakapan...
      </div>
    </div>
  `;
}
function getStatusIcon(status) {
  switch (status) {
    case 'sending':
      return `
        <span class="status-icon sending">
          <span class="sending-dot">.</span>
          <span class="sending-dot">.</span>
          <span class="sending-dot">.</span>
        </span>
      `;

    case 'sent':
      return `
        <span class="status-icon sent" title="Terkirim">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 8.5L6.2 11.5L13 4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
      `;

    case 'delivered':
      return `
        <span class="status-icon delivered" title="Terkirim ke perangkat">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1.8 8.5L5 11.5L11.8 4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M5.8 8.5L9 11.5L15 4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
      `;

    case 'read':
      return `
        <span class="status-icon read" title="Dibaca">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1.8 8.5L5 11.5L11.8 4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M5.8 8.5L9 11.5L15 4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
      `;

    default:
      return '';
  }
}
function getBadge(role) {
  if (!role) return "";
  role = role.toLowerCase().trim();

  if (role === "admin") {
    return `<span class="badge" style="background:#ff4757; font-size:7px; padding:0 4px; border-radius:3px; margin-left:2px; font-weight:600;">🛡 Admin</span>`;
  }

  if (role === "verified") {
    return `<span class="verified-icon" style="margin-left:4px; display:inline-flex; align-items:center;"><svg width="14" height="14" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#1DA1F2"/><path d="M7 12.5l3 3 7-7" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;
  }

  const crownBadges = {
    crown1: 'crown1.png',
    crown2: 'crown2.png',
    crown3: 'crown3.png'
  };

  if (crownBadges[role]) {
    return `<img src="${crownBadges[role]}" alt="${role}" style="width:16px;height:16px;margin-left:4px;vertical-align:middle;object-fit:contain;display:inline-block;" onerror="this.style.display='none';">`;
  }

  return "";
}

function getPartnerIdFromRoom(roomId) {
  if (!roomId.startsWith("pv_")) return null;
  const participants = roomId.replace("pv_", "").split("_");
  return participants.find(id => id !== currentUser?.id) || null;
}

// ===== Global window funcs =====
window.cancelReply = function () {
  currentReplyId = null;
  const preview = document.getElementById("reply-preview-box");

  if (inputEl) {
    inputEl.dataset.replyTo = "";
    inputEl.placeholder = "Tulis pesan...";
  }

  if (preview) {
    preview.style.display = "none";
    preview.innerHTML = "";
  }
};

window.closeBioModal = () => {
  const modal = document.getElementById('bio-modal');
  if (modal) modal.style.display = 'none';
};

window.copyMyID = (id) => {
  navigator.clipboard.writeText(id).then(() => {
    showToast("ID berhasil disalin: #" + id);

    const idEl = document.getElementById("my-unique-id");
    if (idEl) {
      idEl.style.color = "#00d2ff";
      setTimeout(() => idEl.style.color = "", 500);
    }

    if (navigator.vibrate) navigator.vibrate(50);
  }).catch(() => {
    showToast("Gagal menyalin ID");
  });
};

window.scrollToMessage = function (id) {
  const el = document.getElementById(`msg-${id}`);
  if (!el) {
    showToast("Pesan asli sudah terlalu lama atau telah dihapus.");
    return;
  }

  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.style.background = "#fff3b0";

  setTimeout(() => {
    el.style.background = el.classList.contains('self')
      ? "rgba(220,248,198,0.9)"
      : "rgba(255,255,255,0.9)";
  }, 1000);
};

window.tutupDoiCard = function () {
  const modal = document.getElementById('doi-card-modal');
  if (modal) modal.style.display = 'none';
};

// ===== Auth =====
async function requireLogin() {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session || !session.user) {
    showToast("Kamu harus login dulu!");
    window.location.href = "login.html";
    return false;
  }

  currentUser = { id: session.user.id };

  const { data: myProfile } = await supabase
  .from("profiles")
  .select("username, role")
  .eq("id", session.user.id)
  .single();

myUsername = myProfile?.username || session.user.user_metadata?.username || session.user.email || "Guest";
myRole = myProfile?.role || "user";
  console.log("Identitas saya di chat:", myUsername);
  return true;
}

// ===== Presence / Typing =====
async function initPresence() {
  if (!currentUser) return;

  if (presenceChannel) {
    await supabase.removeChannel(presenceChannel);
    presenceChannel = null;
  }

  presenceChannel = supabase.channel('presence-room-1', {
    config: { presence: { key: myUsername } }
  });

  presenceChannel.on('presence', { event: 'sync' }, () => {
    const state = presenceChannel.presenceState();
    const statusHeader = document.getElementById("status-header");
    const typingHeader = document.getElementById("typing-header");

    if (!statusHeader || !typingHeader) return;

    const typingUsers = [];

    for (const userKey in state) {
      if (userKey !== myUsername && state[userKey].some(p => p.isTyping)) {
        typingUsers.push(userKey);
      }
    }

    if (typingUsers.length > 0) {
      statusHeader.style.display = "none";
      typingHeader.style.display = "inline";
      typingHeader.textContent = `${typingUsers[0]} sedang mengetik...`;
    } else {
      statusHeader.style.display = "inline";
      typingHeader.style.display = "none";
    }
  });

  presenceChannel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await presenceChannel.track({
        isTyping: false,
        online_at: new Date().toISOString()
      });
      console.log("Presence aktif");
    }
  });

  if (inputEl) {
    inputEl.removeEventListener("input", handleTypingInput);
    inputEl.addEventListener("input", handleTypingInput);
  }
}

async function handleTypingInput() {
  if (!presenceChannel) return;

  if (!isCurrentlyTyping) {
    isCurrentlyTyping = true;
    await presenceChannel.track({
      isTyping: true,
      online_at: new Date().toISOString()
    });
  }

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(async () => {
    isCurrentlyTyping = false;
    if (presenceChannel) {
      await presenceChannel.track({
        isTyping: false,
        online_at: new Date().toISOString()
      });
    }
  }, 3000);
}

// ===== Online users =====
async function setUserOnline() {
  if (!currentUser) return;

  await supabase.from("online_users").upsert({
    user_id: currentUser.id,
    username: myUsername,
    last_seen: new Date().toISOString()
  }, { onConflict: 'user_id' });
}

async function updateMembers() {
  if (!membersEl) return;

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("online_users")
    .select("user_id, username")
    .gt("last_seen", fiveMinutesAgo);

  if (error) {
    console.error(error);
    return;
  }

  const count = data?.length || 0;
  membersEl.innerHTML = `<span class="online-dot"></span> ${count} user${count !== 1 ? "s" : ""} online`;
}

// ===== Render Message =====
function renderMessage(msg) {
  if (!messagesEl) return;
  if (document.getElementById(`msg-${msg.id}`)) return;

  const msgEl = document.createElement("div");
  msgEl.id = `msg-${msg.id}`;
  msgEl.className = `chat-message ${msg.user_id === currentUser.id ? "self" : "other"}`;

  const currentUsername = msg.profiles?.username || msg.username || "User";
  const avatarUrl = msg.profiles?.avatar_url || msg.avatar || "profile.png";
  const currentRole = msg.profiles?.role || msg.role || "user";
  const sticker = msg.sticker_url;
  const statusIcon = msg.user_id === currentUser.id ? getStatusIcon(msg.status || 'sent') : "";

  const replyHtml = msg.reply_to_msg ? `
    <div class="reply-preview" onclick="scrollToMessage('${msg.reply_to_msg.id}')"
         style="font-size:11px; color:#555; background:rgba(0,0,0,0.05); padding:5px; border-left:3px solid #0088cc; margin-bottom:5px; border-radius:4px; cursor:pointer;">
      <strong>${escapeHtml(msg.reply_to_msg.username || "User")}</strong>: ${escapeHtml((msg.reply_to_msg.message || "").slice(0, 30))}...
    </div>` : "";

  const contentHtml = sticker
    ? `<img src="${sticker}" style="width:100px;height:100px;border-radius:12px;object-fit:cover;">`
    : escapeHtml(msg.message || "");

  msgEl.innerHTML = `
  <img class="avatar" src="${avatarUrl}" onerror="this.src='profile.png'">
  <div class="content" style="position: relative; min-width: 80px; transition: transform 0.2s ease;">
    <div class="username">${escapeHtml(currentUsername)}${getBadge(currentRole)}</div>

    ${replyHtml}

    <div class="text" style="${msg.message === 'Pesan ini telah dihapus' ? 'font-style:italic;color:#aaa;' : ''} padding-bottom: 12px;">
      ${contentHtml}
    </div>

    <div class="message-info" style="position: absolute; bottom: 4px; right: 8px; display:flex; align-items:center; gap:2px;">
      <span class="timestamp" style="font-size:9px; opacity:0.5;">
        ${formatTime(msg.created_at)}
      </span>
      ${statusIcon}
    </div>
  </div>
`;

  // ===== Swipe to Reply =====
  let startX = 0;
  let currentX = 0;
  let swiping = false;
  const contentEl = msgEl.querySelector('.content');

  msgEl.addEventListener("touchstart", (e) => {
    startX = e.touches[0].clientX;
    currentX = startX;
    swiping = true;
    if (contentEl) contentEl.style.transition = "none";
  });

  msgEl.addEventListener("touchmove", (e) => {
    if (!swiping || !contentEl) return;

    currentX = e.touches[0].clientX;
    let diff = currentX - startX;

    if (diff > 0) {
      if (diff > 70) diff = 70;
      contentEl.style.transform = `translateX(${diff}px)`;
    }
  });

  msgEl.addEventListener("touchend", () => {
    if (!contentEl) return;

    let diff = currentX - startX;
    contentEl.style.transition = "transform 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)";
    contentEl.style.transform = "translateX(0)";

    if (diff > 50) {
      currentReplyId = msg.id;
      if (inputEl) inputEl.dataset.replyTo = msg.id;

      const replyBox = document.getElementById("reply-preview-box");
      if (replyBox) {
        replyBox.style.display = "flex";
        replyBox.style.justifyContent = "space-between";
        replyBox.style.alignItems = "center";
        replyBox.style.padding = "8px 12px";
        replyBox.style.background = "#f0f0f0";
        replyBox.style.borderLeft = "4px solid #0088cc";
        replyBox.innerHTML = `
          <div style="flex: 1; overflow: hidden;">
            <div style="font-size: 11px; color: #0088cc; font-weight: bold;">Membalas ${escapeHtml(currentUsername)}</div>
            <div style="font-size: 12px; color: #666; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">
              ${sticker ? "🖼 Stiker" : escapeHtml(msg.message || "")}
            </div>
          </div>
          <div onclick="window.cancelReply()" style="padding: 5px 10px; cursor: pointer; color: #ff4757; font-size: 24px; font-weight: bold;">
            &times;
          </div>
        `;
      }

      if (inputEl) inputEl.focus();
      if (navigator.vibrate) navigator.vibrate(30);
    }

    swiping = false;
    currentX = 0;
  });

  messagesEl.appendChild(msgEl);
}

function updateMessageStatusUI(messageId, status) {
  const msgEl = document.getElementById(`msg-${messageId}`);
  if (!msgEl) return;

  const infoEl = msgEl.querySelector('.message-info');
  const timeEl = msgEl.querySelector('.timestamp');
  if (!infoEl || !timeEl) return;

  const oldStatus = infoEl.querySelector('.status-icon');
  if (oldStatus) oldStatus.remove();

  timeEl.insertAdjacentHTML('afterend', getStatusIcon(status));
}
// ===== Load Messages =====
async function loadMessages() {
  if (!messagesEl || !currentUser) return;

  if (isFirstMessageLoad) {
    showChatLoading();
  }

  const start = Date.now();

  const { data, error } = await supabase
    .from("messages")
    .select(`
      *,
      reply_to_msg:reply_to(id, username, message),
      profiles:profiles!messages_user_id_fkey(username, avatar_url, role)
    `)
    .eq("room_id", currentRoomId)
    .order("created_at", { ascending: true });

  // Biar loading keliatan smooth, ga langsung blink
  const elapsed = Date.now() - start;
  const minDelay = 700;

  if (isFirstMessageLoad && elapsed < minDelay) {
    await new Promise(resolve => setTimeout(resolve, minDelay - elapsed));
  }

  if (error) {
    console.error(error);

    messagesEl.innerHTML = `
      <div style="
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        gap:8px;
        padding:40px 20px;
        margin-top:20px;
        color:#ff4d4f;
        font-family:'Poppins', sans-serif;
      ">
        <div style="font-size:26px;">⚠️</div>
        <div style="font-size:14px; font-weight:600;">Gagal memuat pesan</div>
        <div style="font-size:12px; color:#999;">Coba lagi sebentar ya...</div>
      </div>
    `;
    return;
  }

  messagesEl.innerHTML = "";
  isFirstMessageLoad = false;

  if (!data || data.length === 0) {
    messagesEl.innerHTML = `
      <div style="
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        gap:8px;
        padding:40px 20px;
        margin-top:20px;
        color:#8696a0;
        font-family:'Poppins', sans-serif;
      ">
        <div style="font-size:28px;">💬</div>
        <div style="font-size:14px; font-weight:600;">Belum ada pesan</div>
        <div style="font-size:12px;">Mulai percakapan dulu yuk</div>
      </div>
    `;
    await markRoomAsRead();
    return;
  }

  data.forEach(msg => renderMessage(msg));

  setTimeout(scrollToBottom, 100);

  await markRoomAsRead();
}
async function markRoomAsRead() {
  if (!currentUser) return;

  const { data: unread } = await supabase
    .from("messages")
    .select("id")
    .eq("room_id", currentRoomId)
    .neq("user_id", currentUser.id)
    .in("status", ["sent", "delivered"]);

  if (unread && unread.length > 0) {
    const ids = unread.map(m => m.id);

    await supabase
      .from("messages")
      .update({ status: 'read' })
      .in("id", ids);
  }
}

// ===== Send Message =====
async function Message() {
  const text = inputEl?.value.trim();
  if (!text || !currentUser) return;

  const replyTo = inputEl.dataset.replyTo || null;
  const tempId = "temp-" + Date.now();
  const nowIso = new Date().toISOString();

  const optimisticMsg = {
  id: tempId,
  message: text,
  user_id: currentUser.id,
  username: myUsername,
  avatar: sideAvatar?.src || "profile.png",
  role: myRole || "user",
  created_at: new Date().toISOString(),
  room_id: currentRoomId,
  status: 'sending'
};

  renderMessage(optimisticMsg);
  scrollToBottom();

  inputEl.value = "";
  window.cancelReply();
  sendSound.play().catch(() => {});

  try {
    const { data, error } = await supabase
      .from("messages")
      .insert([{
        message: text,
        user_id: currentUser.id,
        username: myUsername,
        room_id: currentRoomId,
        reply_to: replyTo,
        status: 'sent'
      }])
      .select()
      .single();

    if (error) throw error;

    // ✅ langsung ubah temp bubble jadi pesan asli
    const tempEl = document.getElementById(`msg-${tempId}`);
if (tempEl && data) {
  tempEl.id = `msg-${data.id}`;
  updateMessageStatusUI(data.id, 'sent');
}

setTimeout(() => loadChatHistory(), 150);
  } catch (err) {
    console.error("Gagal kirim:", err);
    showToast("Gagal mengirim pesan");

    const failEl = document.getElementById(`msg-${tempId}`);
    if (failEl) {
      const infoEl = failEl.querySelector('.message-info');
      const timeEl = failEl.querySelector('.timestamp');

      if (infoEl && timeEl) {
        const oldStatus = infoEl.querySelector('.status-icon');
        if (oldStatus) oldStatus.remove();

        timeEl.insertAdjacentHTML(
          'afterend',
          `<span class="status-icon" style="font-size:10px; color:#ff4d4f; margin-left:4px;">failed</span>`
        );
      }
    }
  }
}

if (Btn) Btn.onclick = Message;

if (inputEl) {
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      Message();
    }
  });
}
// ===== Realtime Messages (NO REFRESH FIX) =====
function initRealtimeMessages() {
  if (!currentUser) return;

  if (messageChannel) {
    supabase.removeChannel(messageChannel);
    messageChannel = null;
  }

  // 1. HAPUS filter room_id di level channel agar bisa mendengar pesan masuk dari room mana saja
  messageChannel = supabase
    .channel(`messages-global-monitor`) 
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      },
      async (payload) => {
        const newMsg = payload.new;

        // ✅ INI KUNCINYA: Sidebar otomatis update di sini
        loadChatHistory(); 

        if (newMsg.room_id === currentRoomId) {
          
          // Cegah double bubble (jika elemen sudah ada di layar, jangan render lagi)
          if (document.getElementById(`msg-${newMsg.id}`)) return;

          // ===== Pesan dari diri sendiri =====
          if (newMsg.user_id === currentUser.id) {
            const tempEl = document.querySelector(`[id^="msg-temp-"]`);
            if (tempEl) {
              tempEl.id = `msg-${newMsg.id}`;
              updateMessageStatusUI(newMsg.id, 'sent');
            } else {
              // Jika data profil belum ada di newMsg, render manual
              renderMessage(newMsg);
            }
          } 
          // ===== Pesan dari orang lain =====
          else {
            const { data: fullMsg } = await supabase
              .from("messages")
              .select(`
                *,
                reply_to_msg:reply_to(id, username, message),
                profiles:profiles!messages_user_id_fkey(username, avatar_url, role)
              `)
              .eq("id", newMsg.id)
              .single();

            renderMessage(fullMsg || newMsg);
            receiveSound.play().catch(() => {});
            
            // Auto read
            try {
              await supabase
                .from("messages")
                .update({ status: document.hidden ? 'delivered' : 'read' })
                .eq("id", newMsg.id)
                .neq("user_id", currentUser.id);
            } catch (e) {
              console.warn("Gagal update status:", e);
            }
          }
          scrollToBottom();
          updateHeaderStatus();
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages'
        // 💡 Update status centang juga bisa didengar secara global
      },
      async (payload) => {
        const updated = payload.new;
        if (updated.room_id === currentRoomId && updated.user_id === currentUser.id) {
          updateMessageStatusUI(updated.id, updated.status || 'sent');
        }
      }
    )
    .subscribe((status) => {
      console.log("Realtime status:", status);
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        setTimeout(() => { if (currentUser) initRealtimeMessages(); }, 1500);
      }
    });
}

// ===== Sidebar Toggle =====
if (hamburger) {
  hamburger.addEventListener('click', () => {
    if (!sidebar) return;
    sidebar.classList.toggle('open');
    if (overlay) {
      overlay.style.display = sidebar.classList.contains('open') ? 'block' : 'none';
    }
  });
}

if (overlay) {
  overlay.addEventListener('click', closeSidebar);
}

// ===== Profile Sidebar =====
async function loadProfile() {
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, avatar_url, short_id, role")
    .eq("id", currentUser.id)
    .single();

  if (!profile) return;

  myUsername = profile.username || myUsername;
  myRole = profile.role || myRole;

  if (sideUsername) sideUsername.textContent = profile.username;

  const myId = profile.short_id || "N/A";
  if (myUniqueId) {
    myUniqueId.textContent = "#" + myId;
    myUniqueId.style.cursor = "pointer";
    myUniqueId.onclick = () => window.copyMyID(myId);
  }

  if (sideAvatar) {
    sideAvatar.src = profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username)}`;
  }
}
// ===== Render Global Chat Item =====
function renderGlobalChatItem(container) {
  const globalBtn = document.createElement("div");

  globalBtn.innerHTML = `
    <div style="display:flex; align-items:center; padding:12px; border-bottom:2px solid #f0f0f0; cursor:pointer; background:#f9fbff;">
      <div style="width:40px; height:40px; border-radius:50%; background:linear-gradient(45deg, #0088cc, #00d2ff); display:flex; align-items:center; justify-content:center; margin-right:12px;">
        <span style="color:white; font-size:18px;">🌍</span>
      </div>
      <div>
        <strong style="font-size:14px; color:#0088cc;">Chat Global</strong><br>
        <span style="font-size:11px; color:#888;">Obrolan Umum</span>
      </div>
    </div>
  `;

  globalBtn.onclick = async () => {
  currentRoomId = 'room-1';
  isFirstMessageLoad = true; // ✅ TAMBAH INI

  const headerTitle = document.querySelector(".chat-header h3");
  if (headerTitle) headerTitle.textContent = "HopeTalk Globe";

  initRealtimeMessages();
  await loadMessages();
  await updateHeaderStatus();
  closeSidebar();
};

  container.appendChild(globalBtn);
}

async function loadChatHistory() {
  const privateList = document.getElementById("private-chat-list");
  if (!privateList || !currentUser) return;

  // 1. Ambil data pesan private (pv_)
  const { data: messages, error } = await supabase
    .from("messages")
    .select("room_id, message, created_at, sticker_url, user_id, status")
    .ilike("room_id", "pv_%") 
    .ilike("room_id", `%${currentUser.id}%`) 
    .order("created_at", { ascending: false });

  if (error) return console.error("Gagal muat riwayat:", error);

  // 2. Gunakan Partner ID sebagai Kunci Utama di Map
  const lastMessagesMap = new Map();
  const unreadCountMap = new Map();

  messages.forEach(msg => {
    // Cari tahu siapa partner bicaranya
    const parts = msg.room_id.replace("pv_", "").split("_");
    const partnerId = parts.find(id => id !== currentUser.id);
    
    if (!partnerId) return; // Lewati jika format rusak

    // Kunci Map berdasarkan Partner ID (Paling Akurat)
    if (!lastMessagesMap.has(partnerId)) {
      lastMessagesMap.set(partnerId, msg);
    }

    // Hitung unread khusus pesan masuk
    if (msg.user_id !== currentUser.id && msg.status !== 'read') {
      unreadCountMap.set(partnerId, (unreadCountMap.get(partnerId) || 0) + 1);
    }
  });

  // 3. Bersihkan UI dan Render Ulang
  privateList.innerHTML = "";
  
  // Render Global Chat tetap paling atas
  renderGlobalChatItem(privateList);

  const label = document.createElement("div");
  label.innerHTML = `<div style="padding:10px 15px; font-size:11px; color:#999; font-weight:bold; background:#f8f9fa;">RIWAYAT CHAT PRIBADI</div>`;
  privateList.appendChild(label);

  if (lastMessagesMap.size === 0) {
    privateList.innerHTML += `<div style="text-align:center; opacity:0.5; padding:20px; font-size:12px;">Belum ada riwayat chat</div>`;
    return;
  }

  // 4. Ambil Profil Partner sekaligus
  const partnerIds = Array.from(lastMessagesMap.keys());
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, short_id, role")
    .in("id", partnerIds);

  const profileMap = new Map(profiles?.map(p => [p.id, p]));

  // 5. Loop Map yang sudah pasti unik per Partner ID
  lastMessagesMap.forEach((chat, partnerId) => {
    const partner = profileMap.get(partnerId);
    if (!partner) return;

    const name = partner.username || "User";
    const avatar = partner.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`;
    const unreadCount = unreadCountMap.get(partnerId) || 0;
    const myLastMsgIcon = chat.user_id === currentUser.id ? getStatusIcon(chat.status || 'sent') : "";
    
    let lastMsg = chat.sticker_url ? "🖼 Stiker" : (chat.message || "Klik untuk chat");
    if (chat.message === "Pesan ini telah dihapus") lastMsg = "🚫 Pesan dihapus";

    const chatEl = document.createElement("div");
    chatEl.className = `sidebar-chat-item ${unreadCount > 0 ? 'unread' : ''}`;
    chatEl.innerHTML = `
      <div style="display: flex; align-items: center; padding: 12px 15px; border-bottom: 1px solid rgba(0,0,0,0.03); cursor: pointer;">
        <div style="position: relative;">
          <img src="${avatar}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">
          ${unreadCount > 0 ? `<div style="position: absolute; top: -2px; right: -2px; background: #ff4757; color: white; font-size: 10px; width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white;">${unreadCount}</div>` : ''}
        </div>
        <div style="flex: 1; margin-left: 12px; overflow: hidden;">
          <div style="display: flex; justify-content: space-between;">
            <strong style="font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${name}</strong>
            <span style="font-size: 10px; color: #999;">${formatTime(chat.created_at)}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 4px; font-size: 12px; color: #666;">
             ${myLastMsgIcon} <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${lastMsg}</span>
          </div>
        </div>
      </div>
    `;

    chatEl.onclick = () => bukaChatPribadi(partnerId, name, partner.short_id || '');
    privateList.appendChild(chatEl);
  });
}

// ===== Search Friend by ID =====
if (btnSearchId) {
  btnSearchId.addEventListener("click", async () => {
    const searchValue = inputSearchId?.value.trim().toUpperCase();
    const cleanId = (searchValue || "").replace('#', '');

    if (!cleanId) {
      showToast("Masukkan ID (contoh: 0E870)");
      return;
    }

    const { data: friend, error } = await supabase
      .from("profiles")
      .select("id, username, short_id")
      .eq("short_id", cleanId)
      .single();

    if (error || !friend) {
      showToast("ID tidak ditemukan!");
      return;
    }

    if (friend.id === currentUser.id) {
      showToast("Ini ID kamu sendiri.");
      return;
    }

    await bukaChatPribadi(friend.id, friend.username, friend.short_id || '');
    showToast(`Chat dengan ${friend.username} dibuka`);
  });
}

// ===== Open Private Chat =====
async function bukaChatPribadi(partnerId, partnerName, partnerShortId = '') {
  const ids = [currentUser.id, partnerId].sort();
  currentRoomId = `pv_${ids[0]}_${ids[1]}`;
  isFirstMessageLoad = true; // ✅ TAMBAH INI

  initRealtimeMessages();

  const headerTitle = document.querySelector(".chat-header h3");
  if (headerTitle) {
    headerTitle.innerHTML = `${escapeHtml(partnerName)} <span style="font-size:10px; opacity:0.5;">#${escapeHtml(partnerShortId)}</span>`;
  }

  await updateHeaderStatus();

  
  await loadMessages();
  closeSidebar();
  scrollToBottom();

  localStorage.setItem(`last_read_${currentRoomId}`, new Date().toISOString());
  await loadChatHistory();
}

// ===== Header Status =====
async function updateHeaderStatus() {
  const headerStatusEl = document.getElementById("status-header");
  if (!headerStatusEl || !currentUser) return;

  // Global chat
  if (currentRoomId === 'room-1') {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data } = await supabase
      .from("online_users")
      .select("username")
      .gt("last_seen", fiveMinutesAgo)
      .neq("user_id", currentUser.id)
      .limit(1);

    const { count } = await supabase
      .from("online_users")
      .select("user_id", { count: 'exact', head: true })
      .gt("last_seen", fiveMinutesAgo);

    const totalOnline = count || 0;

    if (totalOnline <= 1 && (!data || data.length === 0)) {
      headerStatusEl.innerHTML = `<span style="opacity:0.8;">Hanya kamu yang online</span>`;
    } else if (totalOnline === 2 && data && data.length > 0) {
      headerStatusEl.innerHTML = `<span class="online-dot" style="background:#2ecc71; width:7px; height:7px; display:inline-block; border-radius:50%; margin-right:4px;"></span> ${escapeHtml(data[0].username)} sedang online`;
    } else {
      headerStatusEl.innerHTML = `<span class="online-dot" style="background:#fff; width:7px; height:7px; display:inline-block; border-radius:50%; margin-right:4px;"></span> ${totalOnline} users online`;
    }
    return;
  }

  // Private chat
  const partnerId = getPartnerIdFromRoom(currentRoomId);
  if (!partnerId) return;

  const { data: partnerStatus } = await supabase
    .from("online_users")
    .select("last_seen")
    .eq("user_id", partnerId)
    .maybeSingle();

  if (!partnerStatus) {
    headerStatusEl.innerHTML = `<span style="opacity:0.6;">Offline</span>`;
    return;
  }

  const lastSeenDate = new Date(partnerStatus.last_seen);
  const isOnline = (new Date() - lastSeenDate) < 5 * 60 * 1000;

  if (isOnline) {
    headerStatusEl.innerHTML = `<span class="online-dot" style="background:#2ecc71; width:8px; height:8px; display:inline-block; border-radius:50%; margin-right:4px;"></span> Sedang online`;
  } else {
    headerStatusEl.innerHTML = `<span style="opacity:0.8;">Terakhir terlihat ${formatTime(partnerStatus.last_seen)}</span>`;
  }
}

// ===== Sticker System =====
const apiKey = "vPUlBU5Qfz2ZygoEtKXVUqmIEAEcIB08";

async function fetchStickers(query = "") {
  if (!stickerList) return;

  stickerList.innerHTML = "<p style='font-size:12px; color:#999; text-align:center; width:100%;'>Mencari...</p>";

  const endpoint = query
    ? `https://api.giphy.com/v1/stickers/search?api_key=${apiKey}&q=${encodeURIComponent(query)}&limit=30&rating=g`
    : `https://api.giphy.com/v1/stickers/trending?api_key=${apiKey}&limit=20&rating=g`;

  try {
    const res = await fetch(endpoint);
    const data = await res.json();

    stickerList.innerHTML = "";

    data.data.forEach(sticker => {
      const img = document.createElement("img");
      img.src = sticker.images.fixed_width_small.webp;
      img.style.cssText = "width:75px; height:75px; margin:4px; cursor:pointer; border-radius:8px; background:#eee;";
      img.loading = "lazy";
      img.onclick = () => sendSticker(sticker.images.fixed_width.url);
      stickerList.appendChild(img);
    });
  } catch (err) {
    stickerList.innerHTML = "<p style='font-size:12px; color:red;'>Gagal memuat stiker.</p>";
  }
}

async function sendSticker(url) {
  const tempId = "temp-" + Date.now();

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, avatar_url, role")
      .eq("id", currentUser.id)
      .single();

    renderMessage({
      id: tempId,
      message: "",
      user_id: currentUser.id,
      username: profile?.username || "User",
      avatar: profile?.avatar_url || "profile.png",
      role: profile?.role || "user",
      sticker_url: url,
      created_at: new Date().toISOString(),
      room_id: currentRoomId,
      status: "sending"
    });

    scrollToBottom();
    sendSound.play().catch(() => {});

    const { data, error } = await supabase
      .from("messages")
      .insert([{
        message: "",
        user_id: currentUser.id,
        username: profile?.username || "User",
        avatar: profile?.avatar_url || "profile.png",
        role: profile?.role || "user",
        sticker_url: url,
        room_id: currentRoomId,
        status: "sent"
      }])
      .select()
      .single();

    if (error) throw error;

    const tempEl = document.getElementById(`msg-${tempId}`);
if (tempEl && data) {
  tempEl.id = `msg-${data.id}`; // Ganti ID agar tidak dianggap pesan baru oleh Realtime
  updateMessageStatusUI(data.id, 'sent');
}

    if (stickerMenu) stickerMenu.style.display = "none";

    setTimeout(() => loadChatHistory(), 150);

  } catch (err) {
    console.error("Gagal kirim stiker:", err.message);
    showToast("Gagal kirim stiker");

    const failEl = document.getElementById(`msg-${tempId}`);
    if (failEl) {
      const infoEl = failEl.querySelector(".message-info");
      const timeEl = failEl.querySelector(".timestamp");

      if (infoEl && timeEl) {
        const oldStatus = infoEl.querySelector(".status-icon");
        if (oldStatus) oldStatus.remove();

        timeEl.insertAdjacentHTML(
          "afterend",
          `<span class="status-icon" style="font-size:10px; color:#ff4d4f; margin-left:4px;">failed</span>`
        );
      }
    }
  }
}

if (searchBtn) {
  searchBtn.onclick = () => fetchStickers(searchInput?.value || "");
}

if (searchInput) {
  searchInput.onkeydown = (e) => {
    if (e.key === "Enter") fetchStickers(searchInput.value);
  };
}

const stickerBtn = document.getElementById("sticker-btn");
if (stickerBtn) {
  stickerBtn.onclick = () => {
    if (!stickerMenu) return;
    stickerMenu.style.display =
      (stickerMenu.style.display === "none" || stickerMenu.style.display === "")
        ? "flex"
        : "none";
  };
}
// ===== Delete Menu =====
function showDeleteMenu(id) {
  selectedMessageId = id;
  const overlayDelete = document.getElementById("delete-overlay");
  if (overlayDelete) {
    overlayDelete.style.display = "flex";
    if (navigator.vibrate) navigator.vibrate(50);
  }
}

// ===== Edit Biodata =====
window.openEditProfile = async () => {
  const modal = document.getElementById('bio-modal');
  if (!modal) return;

  modal.style.display = 'flex';

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("age, gender, zodiac, hobby, occupation")
    .eq("id", currentUser.id)
    .single();

  if (error) {
    console.error("Gagal ambil data profil:", error);
    return;
  }

  if (profile) {
    if (document.getElementById('in-umur')) document.getElementById('in-umur').value = profile.age || "";
    if (document.getElementById('in-gender')) document.getElementById('in-gender').value = profile.gender || "Pria";
    if (document.getElementById('in-zodiak')) document.getElementById('in-zodiak').value = profile.zodiac || "Aries";
    if (document.getElementById('in-hobi')) document.getElementById('in-hobi').value = profile.hobby || "";
    if (document.getElementById('in-kerja')) document.getElementById('in-kerja').value = profile.occupation || "";
  }
};

const saveBtnElement = document.getElementById('btn-save-bio');
if (saveBtnElement) {
  saveBtnElement.onclick = async () => {
    const ageValue = document.getElementById('in-umur')?.value;
    const genderValue = document.getElementById('in-gender')?.value;
    const zodiacValue = document.getElementById('in-zodiak')?.value;
    const hobbyValue = document.getElementById('in-hobi')?.value;
    const occupationValue = document.getElementById('in-kerja')?.value;

    saveBtnElement.innerText = "Menyimpan...";
    saveBtnElement.disabled = true;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          age: ageValue ? Number(ageValue) : null,
          gender: genderValue,
          zodiac: zodiacValue,
          hobby: hobbyValue,
          occupation: occupationValue
        })
        .eq("id", currentUser.id);

      if (error) throw error;

      showToast("Biodata berhasil disimpan!");
      window.closeBioModal();

    } catch (err) {
      console.error(err);
      showToast("Gagal simpan biodata");
    } finally {
      saveBtnElement.innerText = "Simpan & Cari";
      saveBtnElement.disabled = false;
    }
  };
}

// ===== Doi Card =====
function tampilkanDoiCard(doi) {
  const modal = document.getElementById('doi-card-modal');
  if (!doi || !modal) return;

  const photoEl = document.getElementById('doi-photo');
  const nameAgeEl = document.getElementById('doi-name-age');
  const zodiacEl = document.getElementById('doi-zodiac');
  const jobEl = document.getElementById('doi-job');
  const hobbyEl = document.getElementById('doi-hobby');
  const gasBtn = document.getElementById('btn-gas-chat');

  if (photoEl) photoEl.src = doi.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(doi.username)}`;
  if (nameAgeEl) nameAgeEl.innerText = `${doi.username}, ${doi.age || '?'}`;
  if (zodiacEl) zodiacEl.innerText = doi.zodiac || 'Rahasia';
  if (jobEl) jobEl.innerText = doi.occupation || 'Professional';
  if (hobbyEl) hobbyEl.innerText = doi.hobby || '-';

  if (gasBtn) {
    gasBtn.onclick = async () => {
      await bukaChatPribadi(doi.id, doi.username, doi.short_id || '');
      window.tutupDoiCard();
    };
  }

  modal.style.display = 'flex';
}

const btnCariDoiActual = document.getElementById('btn-sidebar-search');

if (btnCariDoiActual) {
  btnCariDoiActual.onclick = async () => {
    const { data: myProfile } = await supabase
      .from("profiles")
      .select("gender")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (!myProfile?.gender) {
      showToast("Setel GENDER kamu dulu di Edit Biodata!");
      window.openEditProfile();
      return;
    }

    closeSidebar();

    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'searching-overlay';
    loadingOverlay.innerHTML = `
      <div class="radar"></div>
      <div class="searching-text">MENCARI PASANGAN...</div>
      <div style="font-size:10px; margin-top:10px; opacity:0.6;">Menghubungkan ke server HopeTalk...</div>
    `;
    document.body.appendChild(loadingOverlay);

    const lawanJenis = myProfile.gender === "Pria" ? "Wanita" : "Pria";

    setTimeout(async () => {
      const { data: users } = await supabase
        .from("profiles")
        .select("*")
        .neq("id", currentUser.id)
        .eq("gender", lawanJenis);

      loadingOverlay.remove();

      if (!users || users.length === 0) {
        showToast(`Waduh, belum ada ${lawanJenis} yang tersedia.`);
        return;
      }

      const doi = users[Math.floor(Math.random() * users.length)];
      tampilkanDoiCard(doi);

      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    }, 2500);
  };
}
// Listener untuk update sidebar secara otomatis tanpa refresh
supabase
  .channel('sidebar-updates')
  .on('postgres_changes', { 
    event: 'INSERT', 
    schema: 'public', 
    table: 'messages' 
  }, (payload) => {
    // Jika pesan melibatkan user yang sedang login, refresh daftar chat di sidebar
    if (payload.new.room_id.includes(currentUser.id) || payload.new.room_id === 'room-1') {
      loadChatHistory(); 
    }
  })
  .subscribe();


// ===== Auto read when app visible =====
document.addEventListener("visibilitychange", async () => {
  if (!document.hidden) {
    await markRoomAsRead();
  }
});

// ===== Init =====
async function init() {
  try {
    const ok = await requireLogin();
    if (!ok) return;

    await loadProfile();
    await setUserOnline();
    await updateMembers();
    await initPresence();

    await loadChatHistory();

    initRealtimeMessages(); // WAJIB sebelum loadMessages juga boleh
    await loadMessages();
    await updateHeaderStatus();

    fetchStickers();
    scrollToBottom();

    setInterval(setUserOnline, 30000);
    setInterval(updateMembers, 30000);
    setInterval(updateHeaderStatus, 30000);

  } catch (err) {
    console.error("Gagal inisialisasi:", err);
    showToast("Gagal memuat chat");
  }
}

init();