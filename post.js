console.log("JS CONNECTED");

// =======================
// SUPABASE INIT
// =======================
const SUPABASE_URL = "https://hqetnqnvmdxdgfnnluew.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZXRucW52bWR4ZGdmbm5sdWV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MzUyODIsImV4cCI6MjA4NzMxMTI4Mn0.Cr9lDBZMqfeONi1dfyFzHpBtawBzZTQLBEWKmPJVAOA"; // ganti kalau perlu
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let currentPostId = null;
let replyTo = null;
let replyToUsername = null;

// GIFT STATE
let giftState = {
  postId: null,
  creatorId: null,
  creatorName: "",
  userCoins: 0,
  selectedAmount: 0,
};

// =======================
// CREATE NOTIFICATION
// =======================
async function createNotification({ user_id, actor_id, post_id, type, message }) {
  try {
    // 1. Ambil ID ASLI lo dari Supabase Auth (Gak mau percaya variabel luar)
    const { data: { user: authUser } } = await supabaseClient.auth.getUser();
    if (!authUser) return;

    const finalActorId = authUser.id; // Ini PASTI UUID (lo yang nge-like/komen)
    let finalTargetUserId = user_id; // Ini pemilik postingan

    // 2. PROTEKSI KRITIKAL: Cek apakah user_id tujuan itu UUID atau bukan
    // Kalau formatnya bukan UUID (seperti "devhope"), kita gak kirim notif biar gak error 500
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(finalTargetUserId)) {
      console.warn("⚠️ Notif dibatalkan: Target user_id bukan UUID valid (Mungkin masih 'devhope')");
      return;
    }

    // 3. Jangan kirim notif ke diri sendiri
    if (finalTargetUserId === finalActorId) return;

    // 4. Gas Insert ke Database
    const { error } = await supabaseClient.from("notifications").insert({
      user_id: finalTargetUserId,
      actor_id: finalActorId,
      post_id: parseInt(post_id), // Pastikan format angka (BigInt)
      type: type,
      message: message,
      is_read: false
    });

    if (error) {
      console.error("❌ Gagal Insert Notif:", error.message);
    } else {
      console.log("✅ Notif Berhasil Masuk ke Database!");
    }
  } catch (err) {
    console.error("❌ Error System Notif:", err.message);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // JANGAN pakai 'async' di callback DOMContentLoaded langsung.
  // Kita buat fungsi jalannya sendiri biar bisa kita kontrol urutannya.

  const startApp = async () => {
    try {
      console.log("🛠 Memulai Aplikasi...");

      // 1. AMBIL USER DULU (Tunggu sampai selesai & Lock dilepas)
      // Ini wajib ditunggu (await) supaya tokennya stabil dulu.
      await getUser();
      console.log("✅ Auth Lock Released.");

      // 2. BARU TARIK POSTINGAN
      // Sekarang fetchPosts gak bakal rebutan lock lagi sama getUser.
      await fetchPosts("all");
      console.log("✅ Posts Loaded.");

    } catch (err) {
      console.error("❌ Startup Error:", err.message);
      // Kalau Auth gagal, tetep paksa tarik post buat tamu (Guest Mode)
      fetchPosts("all");
    }

    // 3. INIT FITUR LAINNYA
    const safeInit = (name, fn) => {
      try { if (typeof fn === "function") fn(); } 
      catch (e) { console.warn(`Gagal init ${name}`); }
    };

    safeInit("Search", initSearch);
    safeInit("ReplyClick", initReplyClick);
    safeInit("Auth", initAuth);
    safeInit("Realtime", initRealtime);
    safeInit("CloseButtons", initCloseButtons);
    if (typeof initGiftSheet === "function") safeInit("GiftSheet", initGiftSheet);
  };

  // Jalankan fungsi utama
  startApp();

  // --- LOGIKA SIDEBAR (Taruh di luar startApp biar menu cepet respon) ---
  const navItems = document.querySelectorAll(".nav-item");
  const sidebar = document.querySelector(".sidebar");
  const menuBtn = document.getElementById("mobileMenuBtn");

  navItems.forEach((nav) => {
    if (nav.getAttribute("data-category") === "all") nav.classList.add("active");
  });

  navItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      if (item.id === "adminPanelBtn") return;
      e.preventDefault();
      navItems.forEach((n) => n.classList.remove("active"));
      item.classList.add("active");
      fetchPosts(item.getAttribute("data-category"));
      if (sidebar) sidebar.classList.remove("active");
    });
  });

  if (menuBtn && sidebar) {
    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      sidebar.classList.toggle("active");
    });
    document.addEventListener("click", (e) => {
      if (!sidebar.contains(e.target) && !menuBtn.contains(e.target)) {
        sidebar.classList.remove("active");
      }
    });
  }
});

// =======================
// FETCH POSTS
// =======================
async function fetchPosts(category = "all") {
  const gallery = document.getElementById("mainGallery");
  if (!gallery) return;

  gallery.innerHTML =
    '<div style="color:white; text-align:center; grid-column:1/-1; padding:50px;">Memuat karya...</div>';

  try {
    let query = supabaseClient.from("posts").select("*");

    if (category !== "all") {
      query = query.eq("category", category);
    }

    const { data: posts, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;

    gallery.innerHTML = "";

    if (!posts || posts.length === 0) {
      gallery.innerHTML =
        '<p style="color:gray; text-align:center; grid-column:1/-1; padding:50px;">Tidak ada postingan di kategori ini.</p>';
      return;
    }

    posts.forEach((post) => {
      const card = document.createElement("div");
      card.className = "card";
      card.dataset.creator = post.creator_id;

      const dateObj = new Date(post.created_at);
      const formattedDate = dateObj.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      card.innerHTML = `
        <div class="slider">
          <img src="${post.image_url || "karya.png"}" class="active">

          <div class="watermark-overlay">
            <img src="watermark.svg" alt="watermark">
          </div>
        </div>

        <div class="overlay">
          <h2 class="name" onclick="window.location.href='data.html?id=${post.creator_id}'">
            ${post.name || post.creator_id}
            <span class="verified">
              <svg width="16" height="16" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" fill="#1DA1F2"/>
                <path d="M7 12.5l3 3 7-7" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
          </h2>

          <p class="bio">${post.bio || ""}</p>

          <div class="post-date-wrapper" style="margin-bottom: 8px;">
            <span style="font-size: 11px; color: rgba(255,255,255,0.6); font-weight: 400;">
              Diunggah pada ${formattedDate}
            </span>
          </div>

          <div class="actions">
  <a href="linda.html?id=${post.creator_id}" class="primary">Detail</a>

  <div class="engagement-group">
   <button class="icon-btn gift-btn" 
  data-post="${post.id}" 
  data-creator="${post.creator_id}"
  data-name="${post.name || post.creator_id}">
      <svg viewBox="0 0 24 24" class="icon gift-icon">
        <path d="M20 7h-2.18A3 3 0 0 0 12 3a3 3 0 0 0-5.82 4H4a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h1v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8h1a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1Zm-8-2a1 1 0 0 1 1 1v1h-2V6a1 1 0 0 1 1-1Zm-4 1a1 1 0 0 1 2 0v1H8a1 1 0 0 1 0-2Zm9 13h-4v-7h4Zm-6 0H7v-7h4Zm8-9H5V9h14Z"/>
      </svg>
      <span class="gift-label"></span>
    </button>

    <button class="icon-btn like-btn" data-post="${post.id}">
      <svg viewBox="0 0 24 24" class="icon heart">
        <path d="M12.1 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3 9.24 3 10.91 3.81 12 5.09 13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5 22 12.28 18.6 15.36 13.55 20.04z"/>
      </svg>
      <span class="like-count">0</span>
    </button>

    <button class="icon-btn comment-toggle" data-post="${post.id}">
      <svg viewBox="0 0 24 24" class="icon comment-icon">
        <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/>
      </svg>
      <span class="comment-count">0</span>
    </button>
  </div>
</div>
      `;

      gallery.appendChild(card);
    });

    initGiftButtons();
initLikeButtons();
initComments();
loadLikes();
loadCommentCounts();
  } catch (err) {
    console.error("Gagal memuat data:", err.message);
    gallery.innerHTML =
      '<p style="color:red; text-align:center; grid-column:1/-1; padding:50px;">Gagal memuat postingan.</p>';
  }
}
// =======================
// GIFT SYSTEM
// =======================
function initGiftButtons() {
  document.querySelectorAll(".gift-btn").forEach((btn) => {
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);

    newBtn.addEventListener("click", async () => {
      const { data: { user: authUser } } = await supabaseClient.auth.getUser();

      if (!authUser) {
        openLogin();
        return;
      }

      const postId = newBtn.dataset.post;
      const creatorId = newBtn.dataset.creator;
      const creatorName = newBtn.dataset.name || "Creator";

      if (authUser.id === creatorId) {
        alert("Kamu tidak bisa gift ke postingan sendiri 😅");
        return;
      }

      const { data: senderProfile, error: senderError } = await supabaseClient
        .from("profiles")
        .select("id, coins, username")
        .eq("id", authUser.id)
        .maybeSingle();

      if (senderError || !senderProfile) {
        console.error("Sender profile error:", senderError);
        alert("Gagal membaca data coin kamu.");
        return;
      }

      const currentCoin = senderProfile.coins || 0;

      openGiftSheet({
        postId,
        creatorId,
        creatorName,
        userCoins: currentCoin,
      });
    });
  });
}
async function processGiftTransaction() {
  const sendBtn = document.getElementById("sendGiftBtn");
  const amount = parseInt(giftState.selectedAmount) || 0;
  const giftImage = giftState.selectedImage; // ambil gambar yang dipilih

  if (!sendBtn) return;
  if (amount <= 0) { alert("Pilih jumlah coin dulu."); return; }
  if (amount > giftState.userCoins) { alert("Coin kamu tidak cukup 😢"); return; }

  sendBtn.disabled = true;
  sendBtn.textContent = "Mengirim...";

  try {
    const { data: { user: authUser } } = await supabaseClient.auth.getUser();
    if (!authUser) { openLogin(); return; }

    // --- BAGIAN SAKTI (RPC) ---
    const { error: transferError } = await supabaseClient.rpc('transfer_coins', {
      sender_id: authUser.id,
      receiver_id: giftState.creatorId,
      amount: amount
    });

    if (transferError) throw new Error(transferError.message);

    // --- CATAT RIWAYAT ---
    await supabaseClient.from("gift_transactions").insert({
      sender_id: authUser.id,
      receiver_id: giftState.creatorId,
      post_id: parseInt(giftState.postId),
      amount: amount
    });

    // --- SELESAI & EFEK ---
    triggerGiftAnimation(giftImage); // <-- kirim nama file gift

    // Kirim notifikasi
    const { data: senderProfile } = await supabaseClient
      .from("profiles")
      .select("username")
      .eq("id", authUser.id)
      .single();

    await createNotification({
      user_id: giftState.creatorId,
      actor_id: authUser.id,
      post_id: giftState.postId,
      type: "gift",
      message: `${senderProfile?.username || "Seseorang"} mengirim ${amount} coin ke postingan Anda`,
    });

    giftState.userCoins -= amount;
    closeGiftSheet();
    if (typeof loadUserProfile === "function") await loadUserProfile();

  } catch (err) {
    console.error("Gift error:", err.message);
    alert(err.message || "Terjadi kesalahan saat memproses transfer.");
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = "Kirim Gift";
  }
}
// =======================
// GIFT SYSTEM
// =======================

// Fungsi buat buka sheet (dipanggil dari tombol Gift di postingan)
function openGiftSheet({ postId, creatorId, creatorName, userCoins }) {
  const sheet = document.getElementById("giftSheet");
  if (!sheet) return;

  // Simpan data ke variabel global giftState
  giftState.postId = postId;
  giftState.creatorId = creatorId;
  giftState.creatorName = creatorName;
  giftState.userCoins = userCoins;
  giftState.selectedAmount = 0; // Reset pilihan

  // Update tampilan koin di sheet
  const userCoinsEl = document.getElementById("giftUserCoins");
  if (userCoinsEl) userCoinsEl.textContent = userCoins;

  // Reset tampilan tombol & pilihan item
  const sendBtn = document.getElementById("sendGiftBtn");
  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.textContent = "Kirim";
  }
  document.querySelectorAll(".gift-item").forEach(i => i.classList.remove("active"));

  // Tampilkan sheet
  sheet.classList.add("active");
  document.body.style.overflow = "hidden"; 
}

// 1. Pastikan variabel ini ada di paling atas (Global Scope)
let selectedGiftImage = null; 

// 2. Fungsi Pilih Gift (Sesuai dengan onclick di HTML)
function selectGift(element, amount, imageName) {
  // 1. Hapus tanda 'selected-gift' dari semua item lain dulu
  document.querySelectorAll('.gift-item').forEach(item => {
    item.classList.remove('selected-gift');
  });

  // 2. Tambahkan tanda ke item yang barusan diklik
  element.classList.add('selected-gift');

  // 3. Simpan datanya ke variabel global
  selectedGiftImage = imageName;
  giftState.selectedAmount = amount;

  // 4. Nyalain tombol kirim
  const sendBtn = document.getElementById('sendGiftBtn');
  if (sendBtn) {
    sendBtn.disabled = false;
    sendBtn.style.opacity = "1";
    sendBtn.textContent = `Kirim (${amount} Koin)`;
  }
}

// 3. Fungsi Proses Transaksi (Gabungan Supabase + Animasi)
async function processGiftTransaction() {
  const amount = giftState.selectedAmount;
  const giftImage = selectedGiftImage; // Ambil gambar yang tadi dipilih
  const sendBtn = document.getElementById("sendGiftBtn");

  if (!giftImage || amount <= 0) return;
  if (amount > giftState.userCoins) {
    alert("Coin kamu tidak cukup 😢");
    return;
  }

  sendBtn.disabled = true;
  sendBtn.textContent = "Mengirim...";

  try {
    const { data: { user: authUser } } = await supabaseClient.auth.getUser();
    if (!authUser) return;

    // --- PROSES POTONG KOIN DI DATABASE ---
    const { error: transferError } = await supabaseClient.rpc('transfer_coins', {
      sender_id: authUser.id,
      receiver_id: giftState.creatorId,
      amount: amount
    });

    if (transferError) throw new Error(transferError.message);

    // --- CATAT RIWAYAT ---
    await supabaseClient.from("gift_transactions").insert({
      sender_id: authUser.id,
      receiver_id: giftState.creatorId,
      post_id: parseInt(giftState.postId),
      amount: amount
    });

    // --- JALANKAN ANIMASI (Gunakan fungsi showBigImage kamu) ---
    showBigImage(giftImage); 
    
    // Efek Tambahan: Confetti
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });

    // --- NOTIFIKASI KE PEMILIK POST ---
    const { data: senderProfile } = await supabaseClient
      .from("profiles")
      .select("username")
      .eq("id", authUser.id)
      .single();

    await createNotification({
      user_id: giftState.creatorId,
      actor_id: authUser.id,
      post_id: giftState.postId,
      type: "gift",
      message: `${senderProfile?.username || "Seseorang"} mengirim ${amount} coin ke postingan Anda`,
    });

    // --- RESET STATE ---
    giftState.userCoins -= amount;
    const coinDisplay = document.getElementById("giftUserCoins");
    if (coinDisplay) coinDisplay.textContent = giftState.userCoins;
    
    closeGiftSheet();

  } catch (err) {
    console.error("Gift error:", err.message);
    alert("Gagal mengirim gift: " + err.message);
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = "Kirim";
    selectedGiftImage = null; // Reset gambar
  }
}

 
// SHOW SMOOTH TIKTOK GIFT ANIMATION
// =======================
function showBigImage(imageName) {
  const container = document.getElementById('giftAnimationContainer');
  if (!container) return;

  // 1. Bersihkan kontainer agar tidak menumpuk
  container.innerHTML = '';

  // 2. Buat elemen gambar utama saja
  const mainImg = document.createElement('img');
  mainImg.src = imageName;
  
  // Gunakan class CSS yang sudah kita buat sebelumnya untuk animasi smooth
  mainImg.className = 'gift-main-img'; 
  
  container.appendChild(mainImg);

  // 3. Tambahkan efek Confetti (opsional, hapus jika tidak mau ada partikel warna-warni)
  confetti({
    particleCount: 150,
    spread: 70,
    origin: { y: 0.6 },
    zIndex: 999999
  });

  // 4. Hilangkan otomatis setelah 2.5 detik
  setTimeout(() => { 
    container.innerHTML = ''; 
  }, 2500);
}

// =======================
// CLOSE GIFT SHEET
// =======================
function closeGiftSheet() {
  const sheet = document.getElementById("giftSheet");
  if (!sheet) return;

  sheet.classList.remove("active");
  document.body.style.overflow = ""; // kembalikan scroll

  // Reset pilihan gift
  giftState.selectedAmount = 0;
  selectedGiftImage = null;
  document.querySelectorAll('.gift-item').forEach(g => g.classList.remove('selected-gift'));
  const sendBtn = document.getElementById('sendGiftBtn');
  if (sendBtn) sendBtn.disabled = true;
}
// =======================
// COMMENTS & REPLY SYSTEM
// =======================
function initComments() {
  const modal = document.getElementById("commentModal");
  if (!modal) return;

  const list = modal.querySelector(".comment-list");
  const input = modal.querySelector(".comment-input");
  if (!list || !input) return;
  document.querySelectorAll(".comment-toggle").forEach((btn) => {
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);

    newBtn.addEventListener("click", async () => {
      if (!currentUser) {
        openLogin();
        return;
      }

      currentPostId = newBtn.dataset.post;

      modal.classList.add("active");
      list.innerHTML =
        "<li style='color:#aaa; text-align:center; padding:20px;'>Loading...</li>";

      await loadCommentsStructured();
    });
  });

    input.onkeydown = async (e) => {
    if (e.key === "Enter" && input.value.trim()) {
      const content = input.value.trim();
      const savedReplyTo = replyTo;
      const savedReplyUsername = replyToUsername;

      input.value = "";
      input.placeholder = "Mengirim...";

      // 1. Ambil Auth User yang Pasti (UUID)
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) return;

      const { error } = await supabaseClient.from("comments").insert({
        post_id: currentPostId,
        user_id: user.id, // Pake ID murni dari Auth
        content,
        parent_id: savedReplyTo ? parseInt(savedReplyTo) : null,
        reply_to_username: savedReplyUsername || null,
      });

      replyTo = null;
      replyToUsername = null;
      input.placeholder = "Tulis komentar...";

      if (!error) {
        // 2. Ambil Creator ID post (buat tujuan notif)
        const { data: postData } = await supabaseClient
          .from("posts")
          .select("creator_id")
          .eq("id", currentPostId)
          .single();

        // 3. Ambil Username lo buat isi pesan
        const { data: senderProfile } = await supabaseClient
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .single();

        // 4. Kirim Notif (Pake user.id murni)
        await createNotification({
          user_id: postData?.creator_id,
          actor_id: user.id, // <--- INI PASTI UUID
          post_id: currentPostId,
          type: "comment",
          message: `${senderProfile?.username || "Seseorang"} mengomentari postingan Anda`,
        });

        await updateCommentCount(currentPostId);
        await loadCommentsStructured();
      } else {
        console.error("Gagal kirim komentar:", error.message);
      }
    }
  };
}

function createComment(comment, isReply) {
  const div = document.createElement("div");
  div.className = isReply ? "comment-item reply" : "comment-item";
  const p = comment.profiles;

  let timeText = "";
  if (comment.created_at) {
    const now = new Date();
    const created = new Date(comment.created_at);
    const diffSec = Math.floor((now - created) / 1000);

    if (diffSec < 60) {
      timeText = `${diffSec}s`;
    } else if (diffSec < 3600) {
      timeText = `${Math.floor(diffSec / 60)}m`;
    } else if (diffSec < 86400) {
      timeText = `${Math.floor(diffSec / 3600)}j`;
    } else {
      timeText = `${created.getDate()}/${created.getMonth() + 1}`;
    }
  }

  const profileLink = `data.html?id=${p?.username || ""}`;

  div.innerHTML = `
    <div class="comment-left">
      <img class="comment-avatar"
           src="${p?.avatar_url || "https://via.placeholder.com/40"}"
           onclick="window.location.href='${profileLink}'"
           style="cursor:pointer;">
    </div>

    <div class="comment-right">
      <div class="comment-topline">
        <span class="comment-username"
              onclick="window.location.href='${profileLink}'"
              style="cursor:pointer;">
          ${p?.username || "User"} ${getUserBadge(p?.role)}
        </span>
        <span class="comment-time">${timeText}</span>
      </div>

      <div class="comment-text">
        ${comment.reply_to_username ? `<span class="reply-tag">@${comment.reply_to_username}</span> ` : ""}
        ${comment.content}
      </div>

      <div class="comment-actions">
        <span class="reply-btn" data-id="${comment.id}">Balas</span>
      </div>
    </div>
  `;

  return div;
}

function initReplyClick() {
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("reply-btn")) {
      replyTo = e.target.dataset.id;

      const item = e.target.closest(".comment-item");
      replyToUsername = item.querySelector(".comment-username").childNodes[0].textContent.trim();

      const input = document.querySelector(".comment-input");
      if (input) {
        input.placeholder = "Membalas @" + replyToUsername + "...";
        input.focus();
      }
    }
  });
}

async function loadCommentsStructured() {
  const modal = document.getElementById("commentModal");
  const list = modal?.querySelector(".comment-list");
  if (!list || !currentPostId) return;

  const { data, error } = await supabaseClient
    .from("comments")
    .select("*, profiles(username, avatar_url, role)")
    .eq("post_id", currentPostId)
    .order("created_at", { ascending: true });

  if (error) {
    list.innerHTML =
      "<li style='text-align:center; padding:20px; color:red;'>Gagal memuat komentar.</li>";
    console.error(error.message);
    return;
  }

  if (!data || data.length === 0) {
    list.innerHTML =
      "<li style='text-align:center; padding:20px; color:#aaa;'>Belum ada komentar.</li>";
    return;
  }

  list.innerHTML = "";

  const parentComments = data.filter((c) => !c.parent_id);
  const replies = data.filter((c) => c.parent_id);

  parentComments.forEach((parent) => {
    const wrap = document.createElement("div");
    wrap.className = "comment-thread";

    wrap.appendChild(createComment(parent, false));

    const childReplies = replies.filter((r) => r.parent_id == parent.id);

    if (childReplies.length > 0) {
      const toggleBtn = document.createElement("div");
      toggleBtn.className = "view-replies-btn";
      toggleBtn.textContent = `Lihat balasan (${childReplies.length})`;

      const replyWrap = document.createElement("div");
      replyWrap.className = "reply-group";
      replyWrap.style.display = "none";

      childReplies.forEach((reply) => {
        replyWrap.appendChild(createComment(reply, true));
      });

      toggleBtn.addEventListener("click", () => {
        const isHidden = replyWrap.style.display === "none";
        replyWrap.style.display = isHidden ? "block" : "none";
        toggleBtn.textContent = isHidden
          ? "Sembunyikan balasan"
          : `Lihat balasan (${childReplies.length})`;
      });

      wrap.appendChild(toggleBtn);
      wrap.appendChild(replyWrap);
    }

    list.appendChild(wrap);
  });
}

// =======================
// LIKES SYSTEM
// =======================
function initLikeButtons() {
  document.querySelectorAll(".like-btn").forEach((btn) => {
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);

    newBtn.addEventListener("click", async () => {
      // 1. Ambil Auth User terbaru (mastiin dapet UUID, bukan "devhope")
      const { data: { user: authUser } } = await supabaseClient.auth.getUser();
      
      if (!authUser) {
        openLogin();
        return;
      }

      const postId = newBtn.dataset.post;
      const span = newBtn.querySelector(".like-count");

      // Cek apakah sudah like
      const { data: likeData } = await supabaseClient
        .from("likes")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", authUser.id)
        .maybeSingle();

      if (likeData) {
        // UNLIKE
        await supabaseClient.from("likes").delete().eq("id", likeData.id);
        newBtn.classList.remove("liked");
        if (span) span.textContent = Math.max(0, parseInt(span.textContent) - 1);
      } else {
        // LIKE
        await supabaseClient.from("likes").insert({ 
          post_id: postId, 
          user_id: authUser.id 
        });

        // Ambil data pemilik post & profil penentu (lo)
        const [{ data: postData }, { data: senderProfile }] = await Promise.all([
          supabaseClient.from("posts").select("creator_id").eq("id", postId).single(),
          supabaseClient.from("profiles").select("username").eq("id", authUser.id).single()
        ]);

        // Kirim Notifikasi pake authUser.id (PASTI UUID)
        await createNotification({
          user_id: postData?.creator_id,
          actor_id: authUser.id, 
          post_id: postId,
          type: "like",
          message: `${senderProfile?.username || "Seseorang"} menyukai postingan Anda`,
        });

        newBtn.classList.add("liked");
        if (span) span.textContent = (parseInt(span.textContent) || 0) + 1;
      }
    });
  });
}

async function loadLikes() {
  document.querySelectorAll(".like-btn").forEach(async (btn) => {
    const postId = btn.dataset.post;

    const { count } = await supabaseClient
      .from("likes")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId);

    if (btn.querySelector(".like-count")) {
      btn.querySelector(".like-count").textContent = count ?? 0;
    }

    if (currentUser) {
      const { data } = await supabaseClient
        .from("likes")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", currentUser.id)
        .maybeSingle();

      if (data) btn.classList.add("liked");
    }
  });
}

// =======================
// COMMENT COUNTS
// =======================
async function loadCommentCounts() {
  document.querySelectorAll(".comment-toggle").forEach(async (btn) => {
    const { count } = await supabaseClient
      .from("comments")
      .select("*", { count: "exact", head: true })
      .eq("post_id", btn.dataset.post);

    if (btn.querySelector(".comment-count")) {
      btn.querySelector(".comment-count").textContent = count ?? 0;
    }
  });
}

async function updateCommentCount(postId) {
  const { count } = await supabaseClient
    .from("comments")
    .select("*", { count: "exact", head: true })
    .eq("post_id", postId);

  const btn = document.querySelector(`.comment-toggle[data-post="${postId}"]`);
  if (btn && btn.querySelector(".comment-count")) {
    btn.querySelector(".comment-count").textContent = count ?? 0;
  }
}

// =======================
// AUTH & BADGE
// =======================
async function getUser() {
  try {
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (user) {
      currentUser = user;

      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      currentUser.role = profile?.role || "user";
      protectAdminUI();
    }
  } catch (err) {
    currentUser = null;
  }
}

function protectAdminUI() {
  const adminBtn = document.getElementById("adminPanelBtn");
  if (adminBtn) {
    adminBtn.style.display = currentUser?.role === "admin" ? "flex" : "none";
  }
}

function getUserBadge(role) {
  if (role === "admin") {
    return `<span class="admin-badge" style="background:#ff4757; color:white; padding:2px 8px; border-radius:4px; font-size:10px; margin-left:5px; font-weight:bold;">🛡 Dev</span>`;
  }

  if (role === "verified") {
    return `<span class="verified-badge" style="margin-left:5px;">
      <svg width="14" height="14" viewBox="0 0 24 24" style="vertical-align:middle;">
        <circle cx="12" cy="12" r="10" fill="#1DA1F2"/>
        <path d="M7 12.5l3 3 7-7" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </span>`;
  }

  return "";
}

// =======================
// SEARCH
// =======================
function initSearch() {
  const input = document.getElementById("searchCreator");

  input?.addEventListener("input", () => {
    const val = input.value.toLowerCase();

    document.querySelectorAll(".card").forEach((card) => {
      card.style.display = card.innerText.toLowerCase().includes(val) ? "block" : "none";
    });
  });
}

// =======================
// AUTH FORM
// =======================
function initAuth() {
  const form = document.querySelector(".form");

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = form.querySelectorAll("input")[0].value;
    const password = form.querySelectorAll("input")[1].value;

    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
    } else {
      location.reload();
    }
  });
}

function openLogin() {
  const loginPopup = document.getElementById("loginPopup");
  if (loginPopup) loginPopup.style.display = "flex";
}

// =======================
// CLOSE BUTTONS
// =======================
function initCloseButtons() {
  const commentModal = document.getElementById("commentModal");
  const commentBox = commentModal?.querySelector(".comment-box");

  document.querySelector(".comment-close")?.addEventListener("click", () => {
    commentModal.classList.remove("active");
    resetReplyState();
  });

  commentModal?.addEventListener("click", (e) => {
  if (commentBox && !commentBox.contains(e.target)) {
    commentModal.classList.remove("active");
    resetReplyState();
  }
});

  document.querySelector(".close-login")?.addEventListener("click", () => {
    const loginPopup = document.getElementById("loginPopup");
    if (loginPopup) loginPopup.style.display = "none";
  });
}

function resetReplyState() {
  replyTo = null;
  replyToUsername = null;

  const input = document.querySelector(".comment-input");
  if (input) input.placeholder = "Tulis komentar...";
}

// =======================
// REALTIME BASIC
// =======================
function initRealtime() {
  supabaseClient
    .channel("comments-live")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "comments",
      },
      async (payload) => {
        if (payload.new.post_id == currentPostId) {
          await updateCommentCount(currentPostId);
          await loadCommentsStructured();
        } else {
          await loadCommentCounts();
        }
      }
    )
    .subscribe();

  supabaseClient
    .channel("likes-live")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "likes",
      },
      async () => {
        await loadLikes();
      }
    )
    .subscribe();
}
function triggerGiftAnimation(giftImage) {
  const container = document.getElementById("giftAnimationContainer");
  if (!container) return;
  container.innerHTML = "";

  for (let i = 0; i < 3; i++) { // tampilkan 3 gambar sekaligus
    const img = document.createElement("img");
    img.src = giftImage; // <-- tampilkan gift sesuai pilihan
    img.style.position = "absolute";
    img.style.width = "80px";
    img.style.height = "80px";
    img.style.left = `${Math.random() * 100 - 50}px`;
    img.style.bottom = "-100px";
    img.style.opacity = 0;
    img.style.transition = "all 1.5s ease-out";
    container.appendChild(img);

    setTimeout(() => {
      img.style.bottom = `${150 + Math.random() * 100}px`;
      img.style.opacity = 1;
      img.style.transform = `rotate(${Math.random() * 360}deg)`;
    }, 50);

    setTimeout(() => {
      img.style.opacity = 0;
      img.remove();
    }, 1600);
  }

  // Confetti tetap jalan
  const end = Date.now() + 1000;
  const colors = ['#ffffff', '#FFD700', '#fff9c4', '#F0F0F0'];
  (function frame() {
    confetti({ particleCount: 15, angle: 60, spread: 70, origin: { x: 0.5, y: 0.5 }, colors, startVelocity: 60, gravity: 0.5 });
    confetti({ particleCount: 15, angle: 120, spread: 70, origin: { x: 0.5, y: 0.5 }, colors, startVelocity: 60, gravity: 0.5 });
    if (Date.now() < end) requestAnimationFrame(frame);
  }());
}