// Flag untuk mencegah load Midtrans berkali-kali
let isMidtransLoading = false;

// Load Midtrans Snap
function loadMidtrans() {
  if (window.snap || isMidtransLoading) return;
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

// Event beli koin
document.querySelectorAll(".buy-coin-btn").forEach((btn) => {
  btn.onclick = async (e) => {
    e.preventDefault();
    btn.classList.add("btn-loading");

    const card = btn.closest(".coin-product-card");
    if (!card) return;

    const price = parseInt(card.dataset.price || "0", 10);
    const coins = parseInt(card.dataset.coins || "0", 10);
    const name = card.querySelector(".p-name")?.innerText || "Top Up Koin";

    try {
      // Ambil user & session
      const { data: { user }, error: userErr } = await db.auth.getUser();
      const { data: { session }, error: sessionErr } = await db.auth.getSession();

      if (!user || !session) throw new Error("User belum login / session habis");

      // Pastikan Snap siap
      if (!window.snap) {
        loadMidtrans();
        showToast("Menyiapkan pembayaran", "Klik lagi setelah beberapa detik", "info");
        btn.classList.remove("btn-loading");
        return;
      }

      // Request token dari Supabase Function
      const res = await fetch("https://hqetnqnvmdxdgfnnluew.supabase.co/functions/v1/pay-coins", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          amount: price,
          coins: coins,
          item_name: name,
        }),
      });

      const raw = await res.text();
      let result;
      try { result = JSON.parse(raw); } catch (err) { throw new Error("Response server tidak valid: " + raw); }

      const token = result?.token;
      if (!token) throw new Error("Token pembayaran tidak ditemukan");

      btn.classList.remove("btn-loading");

      // Trigger pembayaran Snap
      window.snap.pay(token, {
        onSuccess: () => {
          showToast("Pembayaran berhasil", "Koin akan masuk setelah pembayaran dikonfirmasi", "success");
        },
        onPending: () => showToast("Menunggu pembayaran", "Selesaikan transaksi terlebih dahulu", "warning"),
        onError: () => showToast("Pembayaran gagal", "Silakan coba lagi", "error"),
        onClose: () => showToast("Popup ditutup", "Pembayaran belum selesai", "info"),
      });
    } catch (err) {
      console.error(err);
      btn.classList.remove("btn-loading");
      showToast("Error", err.message || "Terjadi kesalahan pembayaran", "error");
    }
  };
});
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
// CARDS
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
// DARK MODE
// =======================
// =======================
// DARK MODE
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

  const isDark = savedTheme
    ? savedTheme === "dark"
    : isAutoDark;

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
// NOTE: HTML kamu sekarang belum ada input search di home.html.
// Kalau nanti kamu tambahin, selector ini aman.
const searchInput =
  document.querySelector(".search input") ||
  document.getElementById("searchInput") ||
  document.querySelector('input[type="search"]');

const cards = document.querySelectorAll(".job-card, .recent-card");

if (searchInput) {
  searchInput.addEventListener("keyup", function () {
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
// PROFILE MENU (OPTIONAL)
// =======================
// NOTE: Tambahin id="userProfile" dan id="profileMenu" di HTML kalau mau aktif.
const profile = document.getElementById("userProfile");
const menu = document.getElementById("profileMenu");

if (profile && menu) {
  profile.addEventListener("click", (e) => {
    e.stopPropagation();
    menu.style.display = menu.style.display === "flex" ? "none" : "flex";
  });

  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target) && !profile.contains(e.target)) {
      menu.style.display = "none";
    }
  });
}

// =======================
// AVATAR MENU
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
// SETTINGS MODAL + PROFILE
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

// buka modal
if (settingsBtn && settingsModal) {
  settingsBtn.addEventListener("click", () => {
    settingsModal.classList.add("active");
    avatarMenu && (avatarMenu.style.display = "none");

    const usernameEl = document.getElementById("username");
    if (usernameEl && newUsernameInput) {
      const clone = usernameEl.cloneNode(true);
      clone.querySelectorAll(".admin-badge, .verified-badge, img").forEach((el) => el.remove());
      newUsernameInput.value = clone.textContent.trim();
    }
  });
}

// tutup modal
if (closeSettings && settingsModal) {
  closeSettings.addEventListener("click", () => {
    settingsModal.classList.remove("active");
  });
}

// klik di luar modal-content tutup modal
if (settingsModal) {
  settingsModal.addEventListener("click", (e) => {
    if (e.target === settingsModal) settingsModal.classList.remove("active");
  });
}

// pilih avatar dari pilihan
avatarOptions.forEach((img) => {
  img.addEventListener("click", () => {
    selectedAvatar = img.getAttribute("src");
    uploadedAvatarData = null;

    if (avatarPreview) avatarPreview.src = selectedAvatar;

    avatarOptions.forEach((i) => i.classList.remove("selected"));
    img.classList.add("selected");
  });
});

// preview upload avatar file
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

// save profile (username + avatar)
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

      // UPDATE & LANGSUNG AMBIL DATA TERBARU
      const { data: updatedProfile, error } = await db
        .from("profiles")
        .update(updatePayload)
        .eq("id", user.id)
        .select("username, role, avatar_url") // Ambil data kembalian
        .single();

      if (error) {
        if (error.code === '23505' || error.message.includes('unique')) {
          showToast("Gagal Update", "Username sudah terpakai!", "error");
          return;
        }
        throw error;
      }

      // UPDATE UI
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

/* =======================
   TOAST MODERN
======================= */
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

  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  const closeBtn = toast.querySelector(".toast-close");
  if (closeBtn) {
    closeBtn.onclick = () => hideToast();
  }

  toastTimer = setTimeout(() => {
    hideToast();
  }, 3200);
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
    case "success":
      return "✓";
    case "warning":
      return "⚠";
    case "error":
      return "!";
    default:
      return "i";
  }
}

// =======================
// POPUP CHECK
// =======================
async function checkPopup() {
  try {
    console.log("Checking pop-up status...");

    const { data, error } = await db
      .from("site_settings")
      .select("*")
      .eq("id", 1)
      .single();

    if (error || !data || data.popup_active !== true) {
      console.log("Pop-up is inactive or error occurred.");
      return;
    }

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

    if (popup) {
      popup.style.display = "flex";
      console.log("Pop-up displayed successfully!");
    }
  } catch (err) {
    console.error("checkPopup error:", err);
  }
}

// =======================
// LOGIN / LOGOUT & PROFILE
// =======================
async function loadUser() {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await db.auth.getSession();

    if (sessionError || !session) return;

    const user = session.user;
    const usernameEl = document.getElementById("username");
    const avatarEl = document.getElementById("avatar");
    const coinEl = document.getElementById("coinAmount");

    const { data: profile, error: profileError } = await db
      .from("profiles")
      .select("username, role, avatar_url, coins")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("loadUser profile error:", profileError);
      return;
    }

    if (profile) {
      // Username + badge
      if (usernameEl) {
        usernameEl.innerHTML = `${profile.username || user.email.split("@")[0]} ${getUserBadge(profile.role)}`;
      }

      // Avatar
      if (avatarEl) {
        if (profile.avatar_url) {
          const avatarSrc = profile.avatar_url.startsWith("data:image")
            ? profile.avatar_url
            : profile.avatar_url + "?t=" + Date.now();

          avatarEl.src = avatarSrc;

          if (avatarPreview) {
            avatarPreview.src = avatarSrc;
          }
        } else {
          avatarEl.src = "default-avatar.png";
          if (avatarPreview) avatarPreview.src = "default-avatar.png";
        }
      }

      // Coins
      if (coinEl) {
        coinEl.textContent = profile.coins ?? 0;
      }
    }
  } catch (err) {
    console.error("loadUser error:", err);
  }
}
// =======================
// TOMBOL PRO + LIVECHAT
// =======================
const buyBtnElement = document.getElementById("buyVerified");
const bSheet = document.getElementById("vip-bottom-sheet");
const bOverlay = document.querySelector(".sheet-overlay");

if (buyBtnElement && bSheet) {
  buyBtnElement.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    bSheet.style.display = "flex";

    // PERBAIKAN: Cek dulu apakah fungsi call ada
    if (window.LiveChatWidget && typeof window.LiveChatWidget.call === 'function') {
      try {
        window.LiveChatWidget.call("hide_widget");
      } catch (err) {
        console.warn("LiveChat hide failed:", err);
      }
    }

    setTimeout(() => {
      bSheet.classList.add("active");
    }, 10);
  };
}

// Ganti bagian bOverlay.onclick kamu menjadi ini:
if (bOverlay && bSheet) {
  bOverlay.onclick = () => {
    bSheet.classList.remove("active");

    // Gunakan pengecekan yang lebih aman
    if (window.LiveChatWidget && typeof window.LiveChatWidget.call === 'function') {
      try {
        window.LiveChatWidget.call("maximize_widget");
      } catch (e) {
        console.warn("LiveChat maximize failed", e);
      }
    }

    setTimeout(() => {
      bSheet.style.display = "none";
    }, 400);
  };
}

// =======================
// AUTH MENU
// =======================
async function updateAuthMenu() {
  try {
    const logoutBtn = document.getElementById("logoutBtn");
    if (!logoutBtn) return;

    const {
      data: { session },
      error,
    } = await db.auth.getSession();

    if (error) throw error;

    const user = session?.user;

    logoutBtn.textContent = user ? "Logout" : "Login";
  } catch (err) {
    console.error("updateAuthMenu error:", err);

    // fallback aman kalau session hilang
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) logoutBtn.textContent = "Login";
  }
}
document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  try {
    if (notifChannel) {
      db.removeChannel(notifChannel);
      notifChannel = null;
    }

    const {
      data: { session },
    } = await db.auth.getSession();

    if (session) {
      const { error } = await db.auth.signOut();

      if (error && error.message !== "Auth session missing!") {
        throw error;
      }
    }

    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "login.html";
  } catch (err) {
    console.error("Logout error:", err);

    if (err.message === "Auth session missing!") {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "index.html";
      return;
    }

    showToast("Gagal logout", err.message, "error");
  }
});
// =======================
//  APP
// =======================
const initApp = async () => {
  try {
    await updateAuthMenu();
    await loadUser();
    await loadUnreadNotifications();
    await subscribeNotifications(); // ✅ pastikan ini namanya benar
    await checkPopup();
  } catch (err) {
    console.error("initApp error:", err);
  }
};

initApp();
 
 
// ==========================================
// LOGIKA BELI DENGAN EFEK PARTIKEL & LOADING
// ==========================================
document.querySelectorAll(".buy-now-btn").forEach((button) => {
  button.onclick = async (e) => {
    const btn = e.currentTarget;

    createParticles(e.clientX, e.clientY);
    btn.classList.add("btn-loading");

    const card = btn.closest(".product-card");
    if (!card) {
      btn.classList.remove("btn-loading");
      return;
    }

    const price = card.getAttribute("data-price");
    const role = card.getAttribute("data-role");
    const name = card.querySelector(".p-name")?.innerText || "Premium";

    try {
      const {
        data: { user },
        error: userError,
      } = await db.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        btn.classList.remove("btn-loading");
        showToast("Belum login", "Silakan login dulu!", "warning");
        return;
      }

      // Ambil session user login (WAJIB)
      const {
        data: { session },
        error: sessionError,
      } = await db.auth.getSession();

      if (sessionError) throw sessionError;

      if (!session) {
        btn.classList.remove("btn-loading");
        showToast("Session habis", "Silakan login ulang", "warning");
        return;
      }

      // Kalau Snap belum siap, load dulu
      if (!window.snap) {
        loadMidtrans();
        btn.classList.remove("btn-loading");
        showToast("Menyiapkan koneksi aman", "Silakan klik tombol beli lagi", "info");
        return;
      }

      const response = await fetch("https://hqetnqnvmdxdgfnnluew.supabase.co/functions/v1/pay-premium", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          amount: parseInt(price, 10),
          item_name: name,
          role_target: role,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error("Server response:", text);
        throw new Error("Gagal menghubungi server pembayaran");
      }

      const result = await response.json();
      const token = result?.token;

      btn.classList.remove("btn-loading");

      if (!token) {
        throw new Error("Token pembayaran tidak ditemukan");
      }

      window.snap.pay(token, {
        onSuccess: () => {
          showToast("Pembayaran berhasil", "Status akun akan diperbarui", "success");
          setTimeout(() => location.reload(), 1200);
        },
        onPending: () => {
          showToast("Menunggu pembayaran", "Selesaikan transaksi terlebih dahulu", "warning");
        },
        onError: () => {
          showToast("Pembayaran gagal", "Silakan coba lagi", "error");
        },
        onClose: () => {
          showToast("Popup ditutup", "Pembayaran belum selesai", "info");
        },
      });
    } catch (err) {
      console.error("Error:", err);
      btn.classList.remove("btn-loading");
      showToast("Koneksi gagal", err.message || "Terjadi kesalahan ke server pembayaran", "error");
    }
  };
});
// =======================
// NOTIFICATION SYSTEM (FIXED STRUCTURE)
// =======================
const notifBell = document.getElementById("notifBell");
const notifCountEl = document.getElementById("notifCount");
let notifList = document.getElementById("notificationList");
let notifChannel = null;
let currentUserId = null;
let notificationsPaused = false;

// ===== UPDATE BADGE =====
function updateNotifBadge(count) {
  if (!notifCountEl) return;
  if (!count || count <= 0) {
    notifCountEl.style.display = "none";
    notifCountEl.textContent = "0";
    return;
  }
  notifCountEl.style.display = "flex";
  notifCountEl.textContent = count > 99 ? "99+" : String(count);
  notifCountEl.animate([
    { transform: 'scale(1)' },
    { transform: 'scale(1.3)' },
    { transform: 'scale(1)' }
  ], { duration: 300, easing: 'ease-out' });
}

// ===== LOAD UNREAD NOTIF =====
async function loadUnreadNotifications() {
  try {
    const { data: { user }, error: userError } = await db.auth.getUser();
    if (userError || !user) {
      updateNotifBadge(0);
      return;
    }
    currentUserId = user.id;
    const { count, error } = await db
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) throw error;
    updateNotifBadge(count || 0);
  } catch (err) {
    console.error("loadUnreadNotifications error:", err);
  }
}

// ===== LOAD NOTIF LIST =====
async function loadNotificationList() {
  if (!currentUserId) return;
  if (!notifList) {
    notifList = document.createElement("div");
    notifList.id = "notificationList";
    document.body.appendChild(notifList);
  }

  try {
    const { data, error } = await db
      .from("notifications")
      .select("*")
      .eq("user_id", currentUserId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;

    const isDark = document.body.classList.contains("dark");
    const headerBorder = isDark ? "#3f445e" : "#f0f0f0";
    const titleColor = isDark ? "#ffffff" : "#1a1a1a";

    notifList.innerHTML = `
      <div style="padding:5px 5px 15px 5px; border-bottom:1px solid ${headerBorder}; margin-bottom:15px; display:flex; justify-content:space-between; align-items:center;">
        <h2 style="margin:0; font-size:18px; font-weight:800; color:${titleColor};">Notifikasi</h2>
        <span style="background:#1DA1F2; color:white; padding:4px 10px; border-radius:20px; font-size:9px; font-weight:700;">HopeHype</span>
      </div>
      <ul id="notifItemsContainer" style="margin:0; padding:0; list-style:none;"></ul>
    `;

    const container = notifList.querySelector("#notifItemsContainer");
    if (!data || data.length === 0) {
      container.innerHTML = `<div style="text-align:center; padding:40px 10px; color:#bbb; font-size:13px;">Belum ada kabar terbaru... 🍃</div>`;
      return;
    }

    data.forEach(n => {
      const li = document.createElement("li");
      const bgUnread = isDark ? "rgba(29,161,242,0.15)" : "rgba(29,161,242,0.05)";
      const bgRead = isDark ? "#363b5e" : "#ffffff";
      const borderColor = n.is_read ? (isDark ? "#444b75" : "#f0f0f0") : "rgba(29,161,242,0.2)";
      const textColor = isDark ? "#eeeeee" : "#333333";

      // Pilih Ikon & Warna berdasarkan tipe
      let iconName = n.type === "like" ? "favorite" : n.type === "comment" ? "chat_bubble" : n.type === "follow" ? "person_add" : "notifications";
      let iconColor = n.type === "like" ? "#FF3040" : n.type === "comment" ? "#00D084" : n.type === "follow" ? "#9b59b6" : "#1DA1F2";

      Object.assign(li.style, {
        padding: "14px", marginBottom: "10px", borderRadius: "18px", cursor: "pointer",
        display: "flex", alignItems: "center", gap: "12px",
        background: n.is_read ? bgRead : bgUnread,
        border: "1px solid " + borderColor, transition: "all 0.2s ease"
      });

      li.innerHTML = `
        <div style="background:${iconColor}20; width:38px; height:38px; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
          <span class="material-icons" style="color:${iconColor}; font-size:18px;">${iconName}</span>
        </div>
        <div style="flex:1;">
          <p style="margin:0; font-size:12px; color:${textColor}; line-height:1.4; font-weight:500;">
            ${n.message}
          </p>
        </div>
        ${!n.is_read ? '<div style="width:6px; height:6px; background:#1DA1F2; border-radius:50%;"></div>' : ''}
      `;

      // Logika Klik (Redirect ke Profil atau Post)
      li.onclick = async () => {
        try {
          await db.from("notifications").update({ is_read: true }).eq("id", n.id);
          
          if (n.type === "follow") {
            // Ambil username dari tabel profiles menggunakan ID yang ada di n.post_id
            const { data: prof } = await db.from("profiles").select("username").eq("id", n.post_id).single();
            if (prof && prof.username) {
              window.location.href = `data.html?id=${prof.username}`;
            } else {
              console.error("Profil tidak ditemukan");
            }
          } else {
            // Jika like/comment, pergi ke halaman post
            window.location.href = "post.html?id=" + n.post_id;
          }
        } catch (e) {
          console.error("Redirect error:", e);
        }
      };

      container.appendChild(li);
    }); // Tutup forEach
  } catch (err) {
    console.error("loadNotificationList error:", err);
  }
}

// ===== SUBSCRIBE REALTIME =====
async function subscribeNotifications() {
  try {
    const { data: { user } } = await db.auth.getUser();
    if (!user) return;
    currentUserId = user.id;

    if (notifChannel) db.removeChannel(notifChannel);

    notifChannel = db.channel("user-notifications")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, async (payload) => {
        if (!notificationsPaused) {
          await loadUnreadNotifications();
          showToast("Notifikasi Baru", payload.new.message.replace(/<[^>]*>/g, ''), "info");
        }
      })
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "followers", 
        filter: `following_id=eq.${user.id}`, 
      }, (payload) => {
          loadUnreadNotifications();
          showToast("Follower Baru! 👤", "Seseorang mulai mengikuti kamu.", "success");
          createParticles(window.innerWidth / 2, 100); 
      })
      .subscribe();
  } catch (err) { console.error("Sub error:", err); }
}

// ===== CLICK NOTIF BELL =====
if (notifBell) {
  notifBell.onclick = async (e) => {
    e.stopPropagation();
    notificationsPaused = true; 

    if (notifCountEl) {
      notifCountEl.style.display = "none";
      notifCountEl.textContent = "0";
    }

    try {
      await db.from("notifications")
        .update({ is_read: true })
        .eq("user_id", currentUserId)
        .eq("is_read", false);
    } catch (err) {
      console.error("Gagal update permanen:", err);
    }

    await loadNotificationList();
    
    setTimeout(() => { notificationsPaused = false; }, 2000);

    let overlay = document.getElementById("notifOverlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "notifOverlay";
      document.body.appendChild(overlay);
    }

    Object.assign(overlay.style, {
      display: "block", position: "fixed", top: "0", left: "0", width: "100vw", height: "100vh",
      background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)", zIndex: "10000", opacity: "0", transition: "opacity 0.3s ease"
    });
    overlay.onclick = closeNotif;

    Object.assign(notifList.style, {
      display: "flex", flexDirection: "column", position: "fixed", top: "50%", left: "50%",
      transform: "translate(-50%, -50%)", width: "88vw", maxWidth: "380px", maxHeight: "75vh",
      background: document.body.classList.contains("dark") ? "#2b3050" : "#ffffff",
      zIndex: "10001", borderRadius: "28px", boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
      padding: "20px", overflowY: "auto", opacity: "0", transition: "opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
    });

    requestAnimationFrame(() => {
      overlay.style.opacity = "1";
      notifList.style.opacity = "1";
    });
  };
}

function closeNotif() {
  const overlay = document.getElementById("notifOverlay");
  if (notifList) notifList.style.opacity = "0";
  if (overlay) overlay.style.opacity = "0";
  setTimeout(() => {
    if (notifList) notifList.style.display = "none";
    if (overlay) overlay.remove();
  }, 300);
}

// =======================
// PARTICLES
// =======================
function createParticles(x, y) {
  const colors = ["#f09f33", "#00d2ff", "#4ade80", "#ff758c", "#ffffff"];

  for (let i = 0; i < 15; i++) {
    const p = document.createElement("div");
    p.className = "particle";

    const size = Math.random() * 8 + 4;
    p.style.width = `${size}px`;
    p.style.height = `${size}px`;
    p.style.background = colors[Math.floor(Math.random() * colors.length)];
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    p.style.position = "fixed";
    p.style.pointerEvents = "none";
    p.style.borderRadius = "50%";
    p.style.zIndex = "10001";

    document.body.appendChild(p);

    const angle = Math.random() * Math.PI * 2;
    const velocity = Math.random() * 100 + 50;
    const destinationX = Math.cos(angle) * velocity;
    const destinationY = Math.sin(angle) * velocity;

    p.animate(
      [
        { transform: "translate(0, 0) scale(1)", opacity: 1 },
        { transform: `translate(${destinationX}px, ${destinationY}px) scale(0)`, opacity: 0 },
      ],
      {
        duration: 600 + Math.random() * 400,
        easing: "cubic-bezier(0, .9, .57, 1)",
        fill: "forwards",
      }
    );

    setTimeout(() => p.remove(), 1000);
  }
}
// =======================
// TOMBOL KOIN + SLIDE UP
// =======================
const topupKoinBtn = document.getElementById("topupKoinBtn");
const coinSheet = document.getElementById("coin-bottom-sheet");
const coinOverlay = document.querySelector(".coin-sheet-overlay");

if (topupKoinBtn && coinSheet) {
  topupKoinBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    coinSheet.style.display = "flex";

    if (window.LiveChatWidget && typeof window.LiveChatWidget.call === "function") {
      try {
        window.LiveChatWidget.call("hide_widget");
      } catch (err) {
        console.warn("LiveChat hide failed:", err);
      }
    }

    setTimeout(() => {
      coinSheet.classList.add("active");
    }, 10);
  };
}

if (coinOverlay && coinSheet) {
  coinOverlay.onclick = () => {
    coinSheet.classList.remove("active");

    if (window.LiveChatWidget && typeof window.LiveChatWidget.call === "function") {
      try {
        window.LiveChatWidget.call("maximize_widget");
      } catch (err) {
        console.warn("LiveChat maximize failed:", err);
      }
    }

    setTimeout(() => {
      coinSheet.style.display = "none";
    }, 400);
  };
}
// =======================
// BELI KOIN -> MIDTRANS
// =======================
document.querySelectorAll(".buy-coin-btn").forEach((button) => {
  button.onclick = async (e) => {
    const btn = e.currentTarget;
    btn.classList.add("btn-loading");

    const card = btn.closest(".coin-product-card");
    if (!card) {
      btn.classList.remove("btn-loading");
      console.error("Coin card tidak ditemukan");
      return;
    }

    const price = parseInt(card.getAttribute("data-price") || "0", 10);
    const coins = parseInt(card.getAttribute("data-coins") || "0", 10);
    const name = card.querySelector(".p-name")?.innerText || "Top Up Koin";

    console.log("=== COIN PAYMENT START ===");
    console.log("price:", price);
    console.log("coins:", coins);
    console.log("name:", name);

    try {
      // cek user login
      const {
        data: { user },
        error: userError,
      } = await db.auth.getUser();

      console.log("user:", user);
      console.log("userError:", userError);

      if (userError) throw userError;

      if (!user) {
        btn.classList.remove("btn-loading");
        showToast("Belum login", "Silakan login dulu!", "warning");
        return;
      }

      // cek session
      const {
        data: { session },
        error: sessionError,
      } = await db.auth.getSession();

      console.log("session:", session);
      console.log("sessionError:", sessionError);

      if (sessionError) throw sessionError;

      if (!session) {
        btn.classList.remove("btn-loading");
        showToast("Session habis", "Silakan login ulang", "warning");
        return;
      }

      // cek snap
      if (!window.snap) {
        console.warn("Snap belum siap, load dulu...");
        loadMidtrans();
        btn.classList.remove("btn-loading");
        showToast("Menyiapkan pembayaran", "Silakan klik beli lagi", "info");
        return;
      }

      console.log("Kirim request ke pay-coins...");

      const response = await fetch("https://hqetnqnvmdxdgfnnluew.supabase.co/functions/v1/pay-coins", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        // Baris +/- 540
body: JSON.stringify({
  userId: user.id, // Pastikan ini tetap user.id (JANGAN di-slice)
  email: user.email,
  amount: price,
  coins: coins,
  item_name: name,
}),

      });

      console.log("response status:", response.status);

      const rawText = await response.text();
      console.log("raw response:", rawText);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} - ${rawText}`);
      }

      let result;
      try {
        result = JSON.parse(rawText);
      } catch (jsonErr) {
        throw new Error("Response bukan JSON valid: " + rawText);
      }

      console.log("parsed result:", result);

      const token = result?.token;
      btn.classList.remove("btn-loading");

      if (!token) {
        throw new Error("Token pembayaran tidak ditemukan dari pay-coins");
      }

      console.log("Snap token:", token);

      window.snap.pay(token, {
        onSuccess: function (result) {
          console.log("MIDTRANS SUCCESS:", result);
          showToast("Pembayaran berhasil", "Koin akan masuk setelah pembayaran dikonfirmasi", "success");
          setTimeout(() => location.reload(), 1200);
        },
        onPending: function (result) {
          console.log("MIDTRANS PENDING:", result);
          showToast("Menunggu pembayaran", "Selesaikan transaksi terlebih dahulu", "warning");
        },
        onError: function (result) {
          console.error("MIDTRANS ERROR:", result);
          showToast("Pembayaran gagal", "Terjadi kesalahan dari Midtrans", "error");
        },
        onClose: function () {
          console.log("MIDTRANS CLOSED");
          showToast("Popup ditutup", "Pembayaran belum selesai", "info");
        },
      });
    } catch (err) {
      console.error("Coin payment error FULL:", err);
      btn.classList.remove("btn-loading");
      showToast("Koneksi gagal", err.message || "Terjadi error saat top up koin", "error");
    }
  };
});

(() => {
  const COIN_PRICE = 100;
  const MIN_TRANSACTION = 10000; // Batas minimal Rp 10.000 dari Midtrans
  const MAX_COINS = 5000;
  
  const customInput = document.getElementById("custom-coins");
  const customBtn = document.getElementById("buy-custom-coin-btn");
  const priceDisplay = document.getElementById("custom-price-display");

  const initMidtrans = () => {
    if (!window.snap && typeof loadMidtrans === 'function') {
      loadMidtrans(); 
    }
  };
  initMidtrans();

  customInput.addEventListener("input", () => {
    const coins = parseInt(customInput.value) || 0;
    const price = coins * COIN_PRICE;
    
    if (coins > 0) {
      priceDisplay.textContent = `Total: Rp ${price.toLocaleString('id-ID')}`;
      // Beri warna merah jika masih di bawah minimum Rp 10.000
      priceDisplay.style.color = price < MIN_TRANSACTION ? "#ff4757" : "#4ade80";
    } else {
      priceDisplay.textContent = "";
    }
  });

  customBtn.addEventListener("click", async () => {
    const coins = parseInt(customInput.value);
    const price = coins * COIN_PRICE;
    
    // 1. Validasi Jumlah Koin
    if (!coins || coins <= 0) return showToast("Masukkan jumlah koin!", "", "warning");
    
    // 2. Validasi Minimal Rp 10.000 (PENTING)
    if (price < MIN_TRANSACTION) {
      return showToast(
        "Minimal Rp 10.000", 
        `Butuh minimal ${MIN_TRANSACTION / COIN_PRICE} koin untuk lanjut.`, 
        "warning"
      );
    }

    if (coins > MAX_COINS) return showToast(`Maksimal ${MAX_COINS} koin`, "", "warning");

    if (typeof createParticles === 'function') {
        createParticles(window.innerWidth / 2, window.innerHeight / 2);
    }
    customBtn.classList.add("btn-loading");

    try {
      const { data: { user }, error: userError } = await db.auth.getUser();
      if (userError || !user) throw new Error("Silakan login terlebih dahulu!");

      const { data: { session }, error: sessionError } = await db.auth.getSession();
      if (sessionError || !session) throw new Error("Sesi habis, silakan login ulang.");

      if (!window.snap) {
        showToast("Menyiapkan sistem...", "Tunggu sebentar", "info");
        initMidtrans();
        return;
      }

      const response = await fetch(
        "https://hqetnqnvmdxdgfnnluew.supabase.co/functions/v1/pay-coins",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            userId: user.id,
            email: user.email,
            amount: price,
            coins: coins,
            item_name: `${coins} Koin (Custom)`,
          }),
        }
      );

      // Ambil detail error jika response tidak OK
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Gagal membuat transaksi");
      }

      const result = await response.json();
      const token = result?.token;
      if (!token) throw new Error("Token pembayaran tidak ditemukan.");

      window.snap.pay(token, {
        onSuccess: () => {
          showToast("Berhasil!", "Koin segera ditambahkan", "success");
          setTimeout(() => location.reload(), 1500);
        },
        onPending: () => showToast("Menunggu pembayaran", "", "warning"),
        onError: () => showToast("Pembayaran gagal", "", "error"),
        onClose: () => showToast("Pembayaran dibatalkan", "", "info"),
      });

    } catch (err) {
      console.error("Error Detail:", err);
      showToast("Gagal", err.message, "error");
    } finally {
      customBtn.classList.remove("btn-loading");
    }
  });
})();
