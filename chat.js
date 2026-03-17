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
let presenceChannel = null;
let typingTimeout;
let isCurrentlyTyping = false;
let selectedMessageId = null;

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

function showToast(message) {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = "toast-card";
  toast.innerText = message;
  container.appendChild(toast);

  // animasi muncul
  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0) scale(1)";
  });

  // hilang otomatis
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-20px) scale(0.96)";
    setTimeout(() => toast.remove(), 280);
  }, 3000);
}
function getStatusIcon(status) {
  if (status === 'read') {
    return '<span style="color:#34b7f1; font-size:14px; margin-left:2px;">✔✔</span>';
  }
  if (status === 'delivered') {
    return '<span style="color:#aaa; font-size:14px; margin-left:2px;">✔✔</span>';
  }
  return '<span style="color:#aaa; font-size:14px; margin-left:2px;">✔</span>';
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
    showToast("ID berhasil disalin: #" + id, "success");

    const idEl = document.getElementById("my-unique-id");
    if (idEl) {
      idEl.style.color = "#00d2ff";
      setTimeout(() => idEl.style.color = "", 500);
    }

    if (navigator.vibrate) navigator.vibrate(50);
  }).catch(() => {
    showToast("Gagal menyalin ID", "error");
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
    .select("username")
    .eq("id", session.user.id)
    .single();

  myUsername = myProfile?.username || session.user.user_metadata?.username || session.user.email || "Guest";
  console.log("Identitas saya di chat:", myUsername);
  return true;
}

// ===== Presence / Typing =====
async function initPresence() {
  if (!currentUser) return;

  presenceChannel = supabase.channel('room-1', {
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
    inputEl.addEventListener("input", async () => {
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
        await presenceChannel.track({
          isTyping: false,
          online_at: new Date().toISOString()
        });
      }, 3000);
    });
  }
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

  msgEl.innerHTML = `
    <img class="avatar" src="${avatarUrl}" onerror="this.src='profile.png'">
    <div class="content" style="position: relative; min-width: 80px; transition: transform 0.2s ease;">
      <div class="username">${currentUsername}${getBadge(currentRole)}</div>

      ${msg.reply_to_msg ? `
        <div class="reply-preview" onclick="scrollToMessage('${msg.reply_to_msg.id}')"
             style="font-size:11px; color:#555; background:rgba(0,0,0,0.05); padding:5px; border-left:3px solid #0088cc; margin-bottom:5px; border-radius:4px; cursor:pointer;">
          <strong>${msg.reply_to_msg.username}</strong>: ${(msg.reply_to_msg.message || "").slice(0, 30)}...
        </div>` : ""}

      <div class="text" style="${msg.message === 'Pesan ini telah dihapus' ? 'font-style:italic;color:#aaa;' : ''} padding-bottom: 12px;">
        ${sticker ? `<img src="${sticker}" style="width:100px;height:100px;border-radius:12px;object-fit:cover;">` : (msg.message || "")}
      </div>

      <div class="message-info" style="position: absolute; bottom: 4px; right: 8px; display:flex; align-items:center; gap:2px;">
        <span class="timestamp" style="font-size:9px; opacity:0.5;">
          ${new Date(msg.created_at).getHours().toString().padStart(2, '0')}:${new Date(msg.created_at).getMinutes().toString().padStart(2, '0')}
        </span>
        <span class="status-icon">${statusIcon}</span>
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
            <div style="font-size: 11px; color: #0088cc; font-weight: bold;">Membalas ${currentUsername}</div>
            <div style="font-size: 12px; color: #666; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">
              ${sticker ? "🖼 Stiker" : (msg.message || "")}
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

// ===== Load Messages =====
async function loadMessages() {
  if (!messagesEl) return;

  messagesEl.innerHTML = "";

  const { data, error } = await supabase
    .from("messages")
    .select(`
      *,
      reply_to_msg:reply_to(id, username, message),
      profiles:user_id(username, avatar_url, role)
    `)
    .eq("room_id", currentRoomId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  data?.forEach(msg => renderMessage(msg));
  scrollToBottom();

  // Tandai pesan masuk sebagai read
  await supabase
    .from("messages")
    .update({ status: 'read' })
    .eq("room_id", currentRoomId)
    .neq("user_id", currentUser.id)
    .eq("status", "sent");
}

// ===== Send Message =====
async function Message() {
  const text = inputEl?.value.trim();
  if (!text) return;

  const replyTo = inputEl.dataset.replyTo || null;
  Btn.disabled = true;

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, avatar_url, role")
      .eq("id", currentUser.id)
      .single();

    const { error } = await supabase.from("messages").insert([{
      message: text,
      user_id: currentUser.id,
      username: profile?.username || "Guest",
      avatar: profile?.avatar_url || "profile.png",
      role: profile?.role || "user",
      room_id: currentRoomId,
      reply_to: replyTo,
      status: 'sent'
    }]);

    if (error) throw error;

    sendSound.play().catch(() => { });

    inputEl.value = "";
    window.cancelReply();

    localStorage.setItem(`last_read_${currentRoomId}`, new Date().toISOString());

    await loadChatHistory();
    scrollToBottom();

  } catch (err) {
    console.error("Gagal kirim pesan:", err);
    showToast("Gagal mengirim pesan", "error");
  } finally {
    Btn.disabled = false;
  }
}

if (Btn) Btn.onclick = Message;
if (inputEl) {
  inputEl.onkeypress = (e) => {
    if (e.key === "Enter") Message();
  };
}

// ===== Realtime Messages =====
function initRealtimeMessages() {
  supabase.channel('messages-channel')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages'
    }, async payload => {
      if (payload.new.room_id === currentRoomId) {
        let newMsg = payload.new;

        const { data: profile } = await supabase
          .from("profiles")
          .select("username, avatar_url, role")
          .eq("id", newMsg.user_id)
          .single();

        newMsg.profiles = profile || {
          avatar_url: "profile.png",
          username: "Guest",
          role: "user"
        };

        if (newMsg.reply_to) {
          const { data: repliedMsg } = await supabase
            .from("messages")
            .select("id, username, message")
            .eq("id", newMsg.reply_to)
            .single();

          newMsg.reply_to_msg = repliedMsg;
        }

        if (newMsg.user_id !== currentUser.id) {
          receiveSound.play().catch(() => { });

          // langsung tandai read kalau sedang buka room ini
          await supabase
            .from("messages")
            .update({ status: 'read' })
            .eq("id", newMsg.id);
        }

        renderMessage(newMsg);
        scrollToBottom();
      }

      // refresh sidebar kalau room privat melibatkan user ini
      if (payload.new.room_id !== 'room-1' && payload.new.room_id.includes(currentUser.id)) {
        loadChatHistory();
      }
    })
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'messages'
    }, payload => {
      const iconEl = document.querySelector(`#msg-${payload.new.id} .status-icon`);

      if (iconEl && payload.new.user_id === currentUser.id) {
        iconEl.innerHTML = getStatusIcon(payload.new.status);
      }
    })
    .subscribe();
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
  overlay.addEventListener('click', () => {
    closeSidebar();
  });
}

// ===== Profile Sidebar =====
async function loadProfile() {
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, avatar_url, short_id")
    .eq("id", currentUser.id)
    .single();

  if (!profile) return;

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

    const headerTitle = document.querySelector(".chat-header h3");
    if (headerTitle) headerTitle.textContent = "HopeTalk Globe";

    await loadMessages();
    await updateHeaderStatus();
    closeSidebar();
  };

  container.appendChild(globalBtn);
}

// ===== Load Chat History (ANTI DOUBLE FIX) =====
async function loadChatHistory() {
  const list = document.getElementById("private-chat-list");
  if (!list) return;

  list.innerHTML = "";
  renderGlobalChatItem(list);

  const { data: messages, error } = await supabase
    .from("messages")
    .select("room_id, message, created_at, sticker_url")
    .neq("room_id", "room-1")
    .ilike("room_id", `%${currentUser.id}%`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Gagal muat riwayat:", error);
    return;
  }

  if (!messages || messages.length === 0) return;

  const shownRooms = new Set();

  for (const chat of messages) {
    if (shownRooms.has(chat.room_id)) continue;
    shownRooms.add(chat.room_id);

    const participants = chat.room_id.replace("pv_", "").split("_");
    const partnerId = participants.find(id => id !== currentUser.id);
    if (!partnerId) continue;

    const { data: partner } = await supabase
      .from("profiles")
      .select("username, avatar_url, short_id")
      .eq("id", partnerId)
      .single();

    const name = partner?.username || "User";
    const avatar = partner?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`;

    let lastMsg = chat.sticker_url ? "🖼 Stiker" : (chat.message || "Klik untuk chat");
    if (chat.message === "Pesan ini telah dihapus") lastMsg = "🚫 Pesan dihapus";
    lastMsg = lastMsg.length > 20 ? lastMsg.substring(0, 20) + "..." : lastMsg;

    const jam = new Date(chat.created_at).getHours().toString().padStart(2, '0');
    const menit = new Date(chat.created_at).getMinutes().toString().padStart(2, '0');

    const chatEl = document.createElement("div");
    chatEl.className = "sidebar-chat-item";
    chatEl.style.cssText = "display:flex; align-items:center; padding:12px; border-bottom:1px solid #f5f5f5; cursor:pointer;";

    chatEl.innerHTML = `
      <img src="${avatar}" style="width:45px; height:45px; border-radius:50%; margin-right:12px; object-fit:cover; border:1px solid #eee;">
      <div style="flex:1; overflow:hidden;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong style="font-size:14px; color:#333;">${name}</strong>
          <span style="font-size:10px; color:#bbb;">${jam}:${menit}</span>
        </div>
        <div style="font-size:12px; color:#888; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
          ${lastMsg}
        </div>
      </div>
    `;

    chatEl.onclick = () => bukaChatPribadi(partnerId, name, partner?.short_id || '');
    list.appendChild(chatEl);
  }
}

// ===== Search Friend by ID =====
if (btnSearchId) {
  btnSearchId.addEventListener("click", async () => {
    const searchValue = inputSearchId?.value.trim().toUpperCase();
    const cleanId = (searchValue || "").replace('#', '');

    if (!cleanId) {
      showToast("Masukkan ID (contoh: 0E870)", "info");
      return;
    }

    const { data: friend, error } = await supabase
      .from("profiles")
      .select("id, username, short_id")
      .eq("short_id", cleanId)
      .single();

    if (error || !friend) {
      showToast("ID tidak ditemukan!", "error");
      return;
    }

    if (friend.id === currentUser.id) {
      showToast("Ini ID kamu sendiri.", "info");
      return;
    }

    await bukaChatPribadi(friend.id, friend.username, friend.short_id || '');
    showToast(`Chat dengan ${friend.username} dibuka`, "success");
  });
}

// ===== Open Private Chat =====
async function bukaChatPribadi(partnerId, partnerName, partnerShortId = '') {
  const ids = [currentUser.id, partnerId].sort();
  currentRoomId = `pv_${ids[0]}_${ids[1]}`;

  const headerTitle = document.querySelector(".chat-header h3");
  if (headerTitle) {
    headerTitle.innerHTML = `${partnerName} <span style="font-size:10px; opacity:0.5;">#${partnerShortId}</span>`;
  }

  await updateHeaderStatus();

  if (messagesEl) {
    messagesEl.innerHTML = "<p style='text-align:center; color:#ccc; margin-top:20px;'>Memuat pesan...</p>";
  }

  await loadMessages();
  closeSidebar();
  scrollToBottom();

  localStorage.setItem(`last_read_${currentRoomId}`, new Date().toISOString());
  await loadChatHistory();
}

// ===== Header Status =====
async function updateHeaderStatus() {
  const headerStatusEl = document.getElementById("status-header");
  if (!headerStatusEl) return;

  // Global chat
  if (currentRoomId === 'room-1') {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("online_users")
      .select("username")
      .gt("last_seen", fiveMinutesAgo)
      .neq("user_id", currentUser.id)
      .limit(1);

    if (!error) {
      const { count } = await supabase
        .from("online_users")
        .select("user_id", { count: 'exact', head: true })
        .gt("last_seen", fiveMinutesAgo);

      const totalOnline = count || 0;

      if (totalOnline <= 1 && (!data || data.length === 0)) {
        headerStatusEl.innerHTML = `<span style="opacity:0.8;">Hanya kamu yang online</span>`;
      } else if (totalOnline === 2 && data && data.length > 0) {
        headerStatusEl.innerHTML = `<span class="online-dot" style="background:#2ecc71; width:7px; height:7px; display:inline-block; border-radius:50%; margin-right:4px;"></span> ${data[0].username} sedang online`;
      } else {
        headerStatusEl.innerHTML = `<span class="online-dot" style="background:#fff; width:7px; height:7px; display:inline-block; border-radius:50%; margin-right:4px;"></span> ${totalOnline} users online`;
      }
    }
    return;
  }

  // Private chat
  const participants = currentRoomId.replace("pv_", "").split("_");
  const partnerId = participants.find(id => id !== currentUser.id);

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
    const jam = lastSeenDate.getHours().toString().padStart(2, '0');
    const menit = lastSeenDate.getMinutes().toString().padStart(2, '0');
    headerStatusEl.innerHTML = `<span style="opacity:0.8;">Terakhir terlihat ${jam}:${menit}</span>`;
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
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, avatar_url, role")
      .eq("id", currentUser.id)
      .single();

    const { error } = await supabase.from("messages").insert([{
      message: "",
      user_id: currentUser.id,
      username: profile?.username || "User",
      avatar: profile?.avatar_url || "profile.png",
      role: profile?.role || "user",
      sticker_url: url,
      room_id: currentRoomId,
      status: 'sent'
    }]);

    if (error) throw error;

    if (stickerMenu) stickerMenu.style.display = "none";
  } catch (err) {
    console.error("Gagal kirim stiker:", err.message);
    showToast("Gagal kirim stiker", "error");
  }
}

if (searchBtn) {
  searchBtn.onclick = () => fetchStickers(searchInput?.value || "");
}

if (searchInput) {
  searchInput.onkeypress = (e) => {
    if (e.key === "Enter") fetchStickers(searchInput.value);
  };
}

if (document.getElementById("sticker-btn")) {
  document.getElementById("sticker-btn").onclick = () => {
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

      showToast("Biodata berhasil disimpan!", "success");
      window.closeBioModal();

    } catch (err) {
      console.error(err);
      showToast("Gagal simpan biodata", "error");
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
      showToast("Setel GENDER kamu dulu di Edit Biodata!", "error");
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
        showToast(`Waduh, belum ada ${lawanJenis} yang tersedia.`, "info");
        return;
      }

      const doi = users[Math.floor(Math.random() * users.length)];
      tampilkanDoiCard(doi);

      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    }, 2500);
  };
}

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
    await loadMessages();
    await updateHeaderStatus();

    fetchStickers();
    initRealtimeMessages();
    scrollToBottom();

    setInterval(setUserOnline, 30000);
    setInterval(updateMembers, 30000);
    setInterval(updateHeaderStatus, 30000);

  } catch (err) {
    console.error("Gagal inisialisasi:", err);
    showToast("Gagal memuat chat", "error");
  }
}

init();