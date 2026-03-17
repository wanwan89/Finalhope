let isMidtransLoading = false; // Flag baru

function loadMidtrans() {
  if (window.snap) return;
  if (isMidtransLoading) return; // Stop jika sedang loading

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
    badge += `
      <img src="${crowBadges[role]}"
           style="
             width: 18px;
             height: 18px;
             margin-left: 5px;
             vertical-align: middle;
             object-fit: contain;
             display: inline-block;
           "
           alt="${role}">
    `;
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
const toggleBtn = document.querySelector(".toggle-dark");

if (toggleBtn) {
  const isAutoDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  toggleBtn.checked = isAutoDark;

  if (isAutoDark) document.body.classList.add("dark");
  CardImages(isAutoDark);

  toggleBtn.addEventListener("change", () => {
    document.body.classList.add("theme-transition");
    const isDark = document.body.classList.toggle("dark", toggleBtn.checked);
    CardImages(isDark);

    setTimeout(() => {
      document.body.classList.remove("theme-transition");
    }, 400);
  });
} else {
  const isAutoDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (isAutoDark) document.body.classList.add("dark");
  CardImages(isAutoDark);
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
    const { data: { session }, error: sessionError } = await db.auth.getSession();
    if (sessionError || !session) return;

    const user = session.user;
    const usernameEl = document.getElementById("username");
    const avatarEl = document.getElementById("avatar");

    const { data: profile, error: profileError } = await db
      .from("profiles")
      .select("username, role, avatar_url")
      .eq("id", user.id)
      .single();

    if (profile && !profileError) {
      // Username + badge
      if (usernameEl) {
        usernameEl.innerHTML = `${profile.username || user.email.split("@")[0]} ${getUserBadge(profile.role)}`;
      }

      // Avatar FIX
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
          // fallback default avatar kalau kosong
          avatarEl.src = "default-avatar.png";
          if (avatarPreview) avatarPreview.src = "default-avatar.png";
        }
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
    const {
      data: { session },
    } = await db.auth.getSession();

    // Kalau ada session, baru sign out
    if (session) {
      const { error } = await db.auth.signOut();

      // Kalau error selain session missing, baru tampilkan
      if (error && error.message !== "Auth session missing!") {
        throw error;
      }
    }

    // Tetap bersihkan storage & redirect
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "login.html";
  } catch (err) {
    console.error("Logout error:", err);

    // Kalau session missing, anggap logout berhasil
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
// INIT APP
// =======================
const initApp = async () => {
  try {
    await loadUser();
    await updateAuthMenu();
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

      const response = await fetch("https://hqetnqnvmdxdgfnnluew.supabase.co/functions/v1/pay-premium", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
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

      if (window.snap) {
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
      } else {
        loadMidtrans();
        showToast("Menyiapkan koneksi aman", "Silakan klik tombol beli lagi", "info");
      }
    } catch (err) {
      console.error("Error:", err);
      btn.classList.remove("btn-loading");
      showToast("Koneksi gagal", err.message || "Terjadi kesalahan ke server pembayaran", "error");
    }
  };
});

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