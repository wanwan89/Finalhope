// =======================
// GLOBAL VARIABLES
// =======================
let isMidtransLoading = false;

// =======================
// MIDTRANS LOADER
// =======================
function loadMidtrans() {
  if (window.snap) return;
  if (isMidtransLoading) return;

  isMidtransLoading = true;
  const script = document.createElement("script");
  script.src = "https://app.sandbox.midtrans.com/snap/snap.js";
  script.setAttribute("data-client-key", "SB-Mid-client-G2wOVrrTwcffYhkC");
  script.async = true;

  script.onload = () => {
    console.log("✅ Midtrans Snap loaded!");
    isMidtransLoading = false;
  };

  script.onerror = () => {
    console.error("❌ Gagal memuat Midtrans");
    isMidtransLoading = false;
  };

  document.head.appendChild(script);
}

// =======================
// DYNAMIC BADGE SYSTEM
// =======================
function getUserBadge(role) {
  let badge = "";

  if (role === "admin") {
    badge += `<span class="admin-badge" style="background: #ff4757; color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px; margin-left: 5px; display: inline-flex; align-items: center; vertical-align: middle; line-height: 1; font-weight: bold; height: 16px;">🛡 Dev</span>`;
  }

  if (role === "verified") {
    badge += `
      <span class="verified-badge" style="margin-left:5px;">
        <svg width="14" height="14" viewBox="0 0 24 24" style="vertical-align:middle;">
          <circle cx="12" cy="12" r="10" fill="#1DA1F2"/>
          <path d="M7 12.5l3 3 7-7" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </span>`;
  }

  const crowBadges = {
    crown1: "crown1.png",
    crown2: "crown2.png",
    crown3: "crown3.png",
  };

  if (crowBadges[role]) {
    badge += `<img src="${crowBadges[role]}" style="width:18px;height:18px;margin-left:5px;vertical-align:middle;object-fit:contain;display:inline-block;" alt="${role}">`;
  }

  return badge;
}

// =======================
// SUPABASE INIT
// =======================
const SUPABASE_URL = "https://hqetnqnvmdxdgfnnluew.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZXRucW52bWR4ZGdmbm5sdWV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MzUyODIsImV4cCI6MjA4NzMxMTI4Mn0.Cr9lDBZMqfeONi1dfyFzHpBtawBzZTQLBEWKmPJVAOA";

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =======================
// AUDIO PLAYER
// =======================
const audioPlayer = document.getElementById("audio-player");
const savedSong = localStorage.getItem("currentSong");
const savedTime = localStorage.getItem("currentTime");

if (savedSong && audioPlayer) {
  audioPlayer.src = savedSong;

  audioPlayer.addEventListener("loadedmetadata", () => {
    audioPlayer.currentTime = savedTime ? parseFloat(savedTime) : 0;
    audioPlayer.play().catch(() => {
      console.log("Autoplay dicegah browser.");
    });
  });
}

// =======================
// CARDS & THEME IMAGES
// =======================
const karyaCard = document.querySelector(".job-card.karya-card");
const musicCard = document.querySelector(".job-card.music-card");

function CardImages(isDark) {
  if (!karyaCard || !musicCard) return;

  if (isDark) {
    karyaCard.style.setProperty("background-image", "url('job1.png')", "important");
    musicCard.style.setProperty("background-image", "url('job.png')", "important");
  } else {
    karyaCard.style.setProperty("background-image", "url('art.png')", "important");
    musicCard.style.setProperty("background-image", "url('song.png')", "important");
  }
}

// =======================
// DARK MODE LOGIC
// =======================
const toggleBtn = document.querySelector(".toggle-dark");

function applyTheme(isDark) {
  document.body.classList.toggle("dark", isDark);
  CardImages(isDark);

  if (toggleBtn) toggleBtn.checked = isDark;
}

if (toggleBtn) {
  const savedTheme = localStorage.getItem("theme");
  const isAutoDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = savedTheme ? savedTheme === "dark" : isAutoDark;

  applyTheme(isDark);

  toggleBtn.addEventListener("change", () => {
    document.body.classList.add("theme-transition");
    const newDark = toggleBtn.checked;
    applyTheme(newDark);
    localStorage.setItem("theme", newDark ? "dark" : "light");

    setTimeout(() => {
      document.body.classList.remove("theme-transition");
    }, 400);
  });
} else {
  const savedTheme = localStorage.getItem("theme");
  const isAutoDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = savedTheme ? savedTheme === "dark" : isAutoDark;
  applyTheme(isDark);
}

// =======================
// 3D HOVER TILT
// =======================
document.querySelectorAll(".job-card, .recent-card").forEach((card) => {
  card.addEventListener("mousemove", (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = -(y - centerY) / 12;
    const rotateY = (x - centerX) / 12;
    card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  });

  card.addEventListener("mouseleave", () => {
    card.style.transform = "rotateX(0) rotateY(0)";
  });
});

// =======================
// SEARCH FILTER
// =======================
const searchInput =
  document.querySelector(".search input") ||
  document.getElementById("searchInput") ||
  document.querySelector('input[type="search"]');

const cards = document.querySelectorAll(".job-card, .recent-card");

if (searchInput) {
  searchInput.addEventListener("keyup", function() {
    const value = this.value.toLowerCase();
    cards.forEach((card) => {
      const text = card.innerText.toLowerCase();
      card.style.display = text.includes(value) ? "" : "none";
    });
  });
}

// =======================
// CARD BUTTON REDIRECT
// =======================
const artButton = document.getElementById("artButton");
if (artButton && karyaCard) {
  artButton.addEventListener("click", (e) => {
    e.preventDefault();
    karyaCard.style.setProperty("background-image", "url('art.png')", "important");
    setTimeout(() => (window.location.href = "post.html"), 100);
  });
}

const songButton = document.querySelector(".music-card .button");
if (songButton && musicCard) {
  songButton.addEventListener("click", (e) => {
    e.preventDefault();
    musicCard.style.setProperty("background-image", "url('song.png')", "important");
    setTimeout(() => (window.location.href = "music.html"), 100);
  });
}

// =======================
// PRELOAD IMAGES
// =======================
function preloadImages(urls, callback) {
  let loaded = 0;
  if (!urls.length) {
    if (callback) callback();
    return;
  }

  urls.forEach((url) => {
    const img = new Image();
    img.src = url;
    img.onload = () => {
      loaded++;
      if (loaded === urls.length && callback) callback();
    };
    img.onerror = () => {
      loaded++;
      if (loaded === urls.length && callback) callback();
    };
  });
}

preloadImages(["job1.png", "job.png", "art.png", "song.png"], () => {
  CardImages(document.body.classList.contains("dark"));
});

// =======================
// AVATAR & PROFILE MENU
// =======================
const avatar = document.getElementById("avatar");
const avatarMenu = document.getElementById("avatarMenu");

if (avatar && avatarMenu) {
  avatar.addEventListener("click", (e) => {
    e.stopPropagation();
    avatarMenu.style.display = avatarMenu.style.display === "flex" ? "none" : "flex";
  });

  document.addEventListener("click", (e) => {
    if (!avatarMenu.contains(e.target) && e.target !== avatar) {
      avatarMenu.style.display = "none";
    }
  });
}

// =======================
// SETTINGS MODAL
// =======================
const settingsBtn = document.getElementById("settingsBtn");
const settingsModal = document.getElementById("settingsModal");
const closeSettings = document.getElementById("closeSettings");
const saveSettings = document.getElementById("saveSettings");
const newUsernameInput = document.getElementById("newUsername");
const avatarPreview = document.getElementById("avatarPreview");
const avatarUpload = document.getElementById("avatarUpload");
const avatarOptions = document.querySelectorAll("#avatarOptions .avatar-choice");

let selectedAvatar = null;
let uploadedAvatarData = null;

if (settingsBtn && settingsModal) {
  settingsBtn.addEventListener("click", () => {
    settingsModal.classList.add("active");
    if (avatarMenu) avatarMenu.style.display = "none";

    const usernameEl = document.getElementById("username");
    if (usernameEl && newUsernameInput) {
      const clone = usernameEl.cloneNode(true);
      clone.querySelectorAll(".admin-badge, .verified-badge, img").forEach((el) => el.remove());
      newUsernameInput.value = clone.textContent.trim();
    }
  });
}

if (closeSettings && settingsModal) {
  closeSettings.addEventListener("click", () => {
    settingsModal.classList.remove("active");
  });
}

if (settingsModal) {
  settingsModal.addEventListener("click", (e) => {
    if (e.target === settingsModal) settingsModal.classList.remove("active");
  });
}

avatarOptions.forEach((img) => {
  img.addEventListener("click", () => {
    selectedAvatar = img.getAttribute("src");
    uploadedAvatarData = null;
    if (avatarPreview) avatarPreview.src = selectedAvatar;
    avatarOptions.forEach((i) => i.classList.remove("selected"));
    img.classList.add("selected");
  });
});

if (avatarUpload && avatarPreview) {
  avatarUpload.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      uploadedAvatarData = event.target.result;
      selectedAvatar = null;
      avatarPreview.src = uploadedAvatarData;
      avatarOptions.forEach((i) => i.classList.remove("selected"));
    };
    reader.readAsDataURL(file);
  });
}

if (saveSettings) {
  saveSettings.addEventListener("click", async () => {
    try {
      const { data: { user }, error: userError } = await db.auth.getUser();
      if (userError || !user) {
        showToast("Belum login", "Silakan login dulu", "warning");
        return;
      }

      const newUsername = newUsernameInput?.value?.trim();
      if (!newUsername) {
        showToast("Username kosong", "Isi username terlebih dahulu", "warning");
        return;
      }

      const avatarToSave = uploadedAvatarData || selectedAvatar || null;
      const updatePayload = { username: newUsername };
      if (avatarToSave) updatePayload.avatar_url = avatarToSave;

      const { data: updatedProfile, error } = await db
        .from("profiles")
        .update(updatePayload)
        .eq("id", user.id)
        .select("username, role, avatar_url")
        .single();

      if (error) {
        if (error.code === '23505' || error.message.includes('unique')) {
          showToast("Gagal Update", "Username sudah terpakai!", "error");
          return;
        }
        throw error;
      }

      const usernameEl = document.getElementById("username");
      const avatarEl = document.getElementById("avatar");

      if (usernameEl) {
        usernameEl.innerHTML = `${updatedProfile.username} ${getUserBadge(updatedProfile.role)}`;
      }

      if (avatarEl && updatedProfile.avatar_url) {
        const cacheBuster = `?t=${Date.now()}`;
        const finalSrc = updatedProfile.avatar_url.startsWith("data:image") 
          ? updatedProfile.avatar_url 
          : updatedProfile.avatar_url + cacheBuster;
        avatarEl.src = finalSrc;
        if (avatarPreview) avatarPreview.src = finalSrc;
      }

      if (settingsModal) settingsModal.classList.remove("active");
      showToast("Profil diperbarui", "Foto dan username berhasil diubah!", "success");

    } catch (err) {
      console.error("Gagal update:", err.message);
      showToast("Gagal update profil", err.message, "error");
    }
  });
}

// =======================
// TOAST SYSTEM
// =======================
let toastTimer;

function showToast(title, message = "", type = "info") {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    document.body.appendChild(toast);
  }

  clearTimeout(toastTimer);
  toast.className = "";
  toast.innerHTML = `
    <div class="toast-icon-wrap ${type}">
      <div class="toast-icon">${getToastIcon(type)}</div>
    </div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      ${message ? `<div class="toast-subtitle">${message}</div>` : ""}
    </div>
    <button class="toast-close" aria-label="Close">✕</button>
  `;

  toast.classList.add("toast-card", type);
  requestAnimationFrame(() => toast.classList.add("show"));

  const closeBtn = toast.querySelector(".toast-close");
  if (closeBtn) closeBtn.onclick = () => hideToast();

  toastTimer = setTimeout(() => hideToast(), 3200);
}

function hideToast() {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.classList.remove("show");
  setTimeout(() => {
    toast.className = "";
    toast.innerHTML = "";
  }, 260);
}

function getToastIcon(type) {
  switch (type) {
    case "success": return "✓";
    case "warning": return "⚠";
    case "error":   return "!";
    default:        return "i";
  }
}

// =======================
// POPUP CHECK
// =======================
async function checkPopup() {
  try {
    const { data, error } = await db
      .from("site_settings")
      .select("*")
      .eq("id", 1)
      .single();

    if (error || !data || data.popup_active !== true) return;

    const popup = document.getElementById("ad-popup");
    const desc = document.getElementById("popup-desc");
    const img = document.getElementById("popup-img");

    if (desc) desc.textContent = data.popup_text || "";
    if (img) {
      if (data.popup_image) {
        img.src = data.popup_image;
        img.style.display = "block";
      } else {
        img.style.display = "none";
      }
    }
    if (popup) popup.style.display = "flex";
  } catch (err) {
    console.error("checkPopup error:", err);
  }
}

// =======================
// USER LOADING & AUTH
// =======================
async function loadUser() {
  try {
    const { data: { session }, error: sessionError } = await db.auth.getSession();
    if (sessionError || !session) return;

    const user = session.user;
    const { data: profile, error: profileError } = await db
      .from("profiles")
      .select("username, role, avatar_url, coins")
      .eq("id", user.id)
      .single();

    if (profileError) return;

    if (profile) {
      const usernameEl = document.getElementById("username");
      const avatarEl = document.getElementById("avatar");
      const coinEl = document.getElementById("coinAmount");

      if (usernameEl) {
        usernameEl.innerHTML = `${profile.username || user.email.split("@")[0]} ${getUserBadge(profile.role)}`;
      }

      if (avatarEl) {
        const avatarSrc = profile.avatar_url 
          ? (profile.avatar_url.startsWith("data:image") ? profile.avatar_url : profile.avatar_url + "?t=" + Date.now())
          : "default-avatar.png";
        avatarEl.src = avatarSrc;
        if (avatarPreview) avatarPreview.src = avatarSrc;
      }

      if (coinEl) coinEl.textContent = profile.coins ?? 0;
    }
  } catch (err) {
    console.error("loadUser error:", err);
  }
}

// =======================
// VIP & COIN BOTTOM SHEETS
// =======================
const buyBtnElement = document.getElementById("buyVerified");
const bSheet = document.getElementById("vip-bottom-sheet");
const bOverlay = document.querySelector(".sheet-overlay");

if (buyBtnElement && bSheet) {
  buyBtnElement.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    bSheet.style.display = "flex";
    if (window.LiveChatWidget?.call) window.LiveChatWidget.call("hide_widget");
    setTimeout(() => bSheet.classList.add("active"), 10);
  };
}

if (bOverlay && bSheet) {
  bOverlay.onclick = () => {
    bSheet.classList.remove("active");
    if (window.LiveChatWidget?.call) window.LiveChatWidget.call("maximize_widget");
    setTimeout(() => bSheet.style.display = "none", 400);
  };
}

const topupKoinBtn = document.getElementById("topupKoinBtn");
const coinSheet = document.getElementById("coin-bottom-sheet");
const coinOverlay = document.querySelector(".coin-sheet-overlay");

if (topupKoinBtn && coinSheet) {
  topupKoinBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    coinSheet.style.display = "flex";
    if (window.LiveChatWidget?.call) window.LiveChatWidget.call("hide_widget");
    setTimeout(() => coinSheet.classList.add("active"), 10);
  };
}

if (coinOverlay && coinSheet) {
  coinOverlay.onclick = () => {
    coinSheet.classList.remove("active");
    if (window.LiveChatWidget?.call) window.LiveChatWidget.call("maximize_widget");
    setTimeout(() => coinSheet.style.display = "none", 400);
  };
}

// =======================
// AUTH LOGIC
// =======================
async function updateAuthMenu() {
  const logoutBtn = document.getElementById("logoutBtn");
  if (!logoutBtn) return;
  const { data: { session } } = await db.auth.getSession();
  logoutBtn.textContent = session ? "Logout" : "Login";
}

document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  try {
    if (notifChannel) {
      db.removeChannel(notifChannel);
      notifChannel = null;
    }
    const { data: { session } } = await db.auth.getSession();
    if (session) await db.auth.signOut();

    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "login.html";
  } catch (err) {
    console.error("Logout error:", err);
    localStorage.clear();
    window.location.href = "index.html";
  }
});

// =======================
// PAYMENT HANDLERS
// =======================
document.querySelectorAll(".buy-now-btn, .buy-coin-btn").forEach((button) => {
  button.onclick = async (e) => {
    const btn = e.currentTarget;
    const isCoin = btn.classList.contains("buy-coin-btn");
    const card = btn.closest(isCoin ? ".coin-product-card" : ".product-card");

    if (!card) return;
    btn.classList.add("btn-loading");

    const price = parseInt(card.getAttribute("data-price"), 10);
    const role = card.getAttribute("data-role");
    const coins = card.getAttribute("data-coins");
    const name = card.querySelector(".p-name")?.innerText || "Item";

    try {
      const { data: { session } } = await db.auth.getSession();
      if (!session) {
        showToast("Belum login", "Silakan login dulu!", "warning");
        btn.classList.remove("btn-loading");
        return;
      }

      if (!window.snap) {
        loadMidtrans();
        showToast("Menyiapkan pembayaran", "Klik beli lagi sebentar lagi", "info");
        btn.classList.remove("btn-loading");
        return;
      }

      const endpoint = isCoin ? "pay-coins" : "pay-premium";
      const payload = isCoin 
        ? { userId: session.user.id, email: session.user.email, amount: price, coins: parseInt(coins), item_name: name }
        : { userId: session.user.id, email: session.user.email, amount: price, item_name: name, role_target: role };

      const response = await fetch(`https://hqetnqnvmdxdgfnnluew.supabase.co/functions/v1/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      btn.classList.remove("btn-loading");

      if (result.token) {
        window.snap.pay(result.token, {
          onSuccess: () => {
            showToast("Berhasil!", "Data akan diperbarui", "success");
            setTimeout(() => location.reload(), 1200);
          },
          onPending: () => showToast("Menunggu pembayaran", "", "warning"),
          onError: () => showToast("Gagal!", "Coba lagi", "error"),
          onClose: () => showToast("Dibatalkan", "", "info")
        });
      }
    } catch (err) {
      console.error(err);
      btn.classList.remove("btn-loading");
      showToast("Koneksi gagal", err.message, "error");
    }
  };
});

// =======================
// CUSTOM COIN
// =======================
const COIN_PRICE = 100;
const customInput = document.getElementById("custom-coins");
const customBtn = document.getElementById("buy-custom-coin-btn");
const priceDisplay = document.getElementById("custom-price-display");

if (customInput && priceDisplay) {
  customInput.addEventListener("input", () => {
    const coins = parseInt(customInput.value) || 0;
    priceDisplay.textContent = coins > 0 ? `Total: Rp ${(coins * COIN_PRICE).toLocaleString()}` : "";
  });
}

if (customBtn) {
  customBtn.addEventListener("click", async () => {
    const coins = parseInt(customInput.value);
    if (!coins || coins <= 0) return showToast("Masukkan jumlah koin!", "", "warning");

    customBtn.classList.add("btn-loading");
    try {
      const { data: { session } } = await db.auth.getSession();
      const response = await fetch("https://hqetnqnvmdxdgfnnluew.supabase.co/functions/v1/pay-coins", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          userId: session.user.id,
          email: session.user.email,
          amount: coins * COIN_PRICE,
          coins: coins,
          item_name: `${coins} koin custom`,
        }),
      });

      const result = await response.json();
      if (result.token) {
        window.snap.pay(result.token, {
          onSuccess: () => location.reload()
        });
      }
    } catch (err) {
      showToast("Gagal", err.message, "error");
    } finally {
      customBtn.classList.remove("btn-loading");
    }
  });
}

// =======================
// NOTIFICATION SYSTEM
// =======================
const notifBell = document.getElementById("notifBell");
const notifCountEl = document.getElementById("notifCount");
let notifList = document.getElementById("notificationList");
let notifChannel = null;
let currentUserId = null;
let notificationsPaused = false;

function updateNotifBadge(count) {
  if (!notifCountEl) return;
  if (!count || count <= 0) {
    notifCountEl.style.display = "none";
    return;
  }
  notifCountEl.style.display = "flex";
  notifCountEl.textContent = count > 99 ? "99+" : String(count);
}

async function loadUnreadNotifications() {
  const { data: { user } } = await db.auth.getUser();
  if (!user) return;
  currentUserId = user.id;
  const { count } = await db
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false);
  updateNotifBadge(count || 0);
}

// =======================
// PARTICLES EFFECT
// =======================
function createParticles(x, y) {
  const colors = ["#f09f33", "#00d2ff", "#4ade80", "#ff758c", "#ffffff"];
  for (let i = 0; i < 15; i++) {
    const p = document.createElement("div");
    p.style.cssText = `width:6px; height:6px; background:${colors[Math.floor(Math.random()*5)]}; left:${x}px; top:${y}px; position:fixed; pointer-events:none; border-radius:50%; z-index:10001;`;
    document.body.appendChild(p);

    const angle = Math.random() * Math.PI * 2;
    const velocity = Math.random() * 100 + 50;
    p.animate([
      { transform: "translate(0, 0) scale(1)", opacity: 1 },
      { transform: `translate(${Math.cos(angle)*velocity}px, ${Math.sin(angle)*velocity}px) scale(0)`, opacity: 0 }
    ], { duration: 800, easing: "cubic-bezier(0, .9, .57, 1)", fill: "forwards" });

    setTimeout(() => p.remove(), 1000);
  }
}

// =======================
// APP INIT
// =======================
const initApp = async () => {
  await updateAuthMenu();
  await loadUser();
  await loadUnreadNotifications();
  await checkPopup();
};

initApp();
