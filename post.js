console.log("JS CONNECTED");

// =======================
// SUPABASE INIT
// =======================
const SUPABASE_URL = "https://hqetnqnvmdxdgfnnluew.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZXRucW52bWR4ZGdmbm5sdWV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MzUyODIsImV4cCI6MjA4NzMxMTI4Mn0.Cr9lDBZMqfeONi1dfyFzHpBtawBzZTQLBEWKmPJVAOA";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let currentPostId = null;
let replyTo = null;
let replyToUsername = null;

// =======================
// DOM READY
// =======================
document.addEventListener("DOMContentLoaded", async () => {
  await getUser();
  fetchPosts('all'); 
  initSearch();
  initReplyClick();
  initAuth();
  initRealtime();
  initCloseButtons();

  const navItems = document.querySelectorAll('.nav-item');
  const sidebar = document.querySelector('.sidebar');
  const menuBtn = document.getElementById('mobileMenuBtn');

  // 1. Logika Titik Biru (Sudah ada di kodemu)
  navItems.forEach((nav) => {
    if (nav.getAttribute('data-category') === 'all') {
      nav.classList.add('active');
    } else {
      nav.classList.remove('active');
    }
  });

  // 2. Logika Klik Navigasi (Sudah ada di kodemu)
  navItems.forEach(item => {
    item.addEventListener('click', function(e) {
      if (this.id === 'adminPanelBtn') return; 
      e.preventDefault();
      navItems.forEach(nav => nav.classList.remove('active'));
      this.classList.add('active');
      fetchPosts(this.getAttribute('data-category'));
      if (sidebar) sidebar.classList.remove('active');
    });
  });

  // 3. LOGIKA BUKA SIDEBAR (YANG TADI HILANG - MASUKKAN DI SINI)
  if (menuBtn && sidebar) {
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sidebar.classList.toggle('active');
    });
    document.addEventListener('click', (e) => {
      if (!sidebar.contains(e.target) && !menuBtn.contains(e.target)) {
        sidebar.classList.remove('active');
      }
    });
  }
}); // Penutup DOMContentLoaded

// =======================
// CORE FETCH SYSTEM (Kategori & Post)
// =======================
async function fetchPosts(category = 'all') {
  const gallery = document.getElementById('mainGallery');
  if (!gallery) return;

  gallery.innerHTML = '<div style="color:white; text-align:center; grid-column:1/-1; padding:50px;">Memuat karya...</div>';

  try {
    let query = supabaseClient.from('posts').select('*'); 

    if (category !== 'all') {
      query = query.eq('category', category);
    }

    const { data: posts, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;

    gallery.innerHTML = ''; 

    if (!posts || posts.length === 0) {
      gallery.innerHTML = '<p style="color:gray; text-align:center; grid-column:1/-1; padding:50px;">Tidak ada postingan di kategori ini.</p>';
      return;
    }

    posts.forEach(post => {
      const card = document.createElement("div");
      card.className = "card";
      card.dataset.creator = post.creator_id;

      card.innerHTML = `
        <div class="slider">
          <img src="${post.image_url || 'karya.png'}" class="active">
        </div>
        <div class="overlay">
          <h2 class="name">${post.name || post.creator_id} 
            <span class="verified">
              <svg width="20" height="20" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#1DA1F2"/><path d="M7 12.5l3 3 7-7" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </span>
          </h2>
          <p class="bio">${post.bio || ''}</p>
          <div class="stats">
            <div>⭐ ${post.rating || '5.0'}</div>
            <div>${post.date_day || ''}</div> 
            <div>${post.date_year || ''}</div> 
          </div>
          <div class="actions action-icons">
            <a href="linda.html?creator=${post.creator_id}" class="primary">Detail</a>
            <button class="icon-btn like-btn" data-post="${post.id}">
              <svg viewBox="0 0 24 24" class="icon heart"><path d="M12.1 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3 9.24 3 10.91 3.81 12 5.09 13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5 22 12.28 18.6 15.36 13.55 20.04z"/></svg>
              <span class="like-count">0</span>
            </button>
            <button class="icon-btn comment-toggle" data-post="${post.id}">
              <svg viewBox="0 0 24 24" class="icon comment-icon"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/></svg>
              <span class="comment-count">0</span>
            </button>
          </div>
        </div>`;
      gallery.appendChild(card);
    });

    // RE-INIT Fitur Interaktif
    initLikeButtons();
    initComments();
    loadLikes();
    loadCommentCounts();

  } catch (err) {
    console.error("Gagal memuat data:", err.message);
  }
}

// =======================
// COMMENTS & REPLY SYSTEM
// =======================
function initComments() {
  const modal = document.getElementById("commentModal");
  if (!modal) return;
  const list = modal.querySelector(".comment-list");
  const input = modal.querySelector(".comment-input");

  document.querySelectorAll(".comment-toggle").forEach(btn => {
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener("click", async () => {
      if (!currentUser) { openLogin(); return; }
      currentPostId = parseInt(newBtn.dataset.post);
      modal.classList.add("active");
      list.innerHTML = "<li>Loading...</li>";
      
      const { data } = await supabaseClient
        .from("comments")
        .select("*, profiles(username, avatar_url, role)")
        .eq("post_id", currentPostId)
        .order("created_at", { ascending: true });

      list.innerHTML = data?.length ? "" : "<li style='text-align:center; padding:20px; color:#aaa;'>Belum ada komentar.</li>";
      data?.forEach(c => list.appendChild(createComment(c, !!c.parent_id)));
    });
  });

  input.onkeydown = async (e) => {
    if (e.key === "Enter" && input.value.trim()) {
      const content = input.value;
      const savedReplyTo = replyTo;
      const savedReplyUsername = replyToUsername;

      input.value = "";
      input.placeholder = "Mengirim...";

      const { error } = await supabaseClient.from("comments").insert({ 
        post_id: currentPostId, 
        user_id: currentUser.id, 
        content: content,
        parent_id: savedReplyTo ? parseInt(savedReplyTo) : null,
        reply_to_username: savedReplyUsername || null
      });

      replyTo = null;
      replyToUsername = null;
      input.placeholder = "Tulis komentar...";

      if (!error) updateCommentCount(currentPostId);
    }
  };
}

function createComment(comment, isReply) {
  const div = document.createElement("div");
  div.className = isReply ? "comment-item reply" : "comment-item";
  const p = comment.profiles;
  
  div.innerHTML = `
    <div class="comment-left"><img class="comment-avatar" src="${p?.avatar_url || 'https://via.placeholder.com/40'}" /></div>
    <div class="comment-right">
      <div class="comment-header">
        <span class="comment-username">${p?.username || 'User'} ${getUserBadge(p?.role)}</span>
        ${comment.reply_to_username ? `<span class="reply-tag">@${comment.reply_to_username}</span>` : ""}
      </div>
      <div class="comment-text">${comment.content}</div>
      <div class="comment-actions">
        <span class="reply-btn" data-id="${comment.id}">Reply</span>
      </div>
    </div>`;
  return div;
}

function initReplyClick() {
  document.addEventListener("click", e => {
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

// =======================
// LIKES SYSTEM
// =======================
function initLikeButtons() {
  document.querySelectorAll(".like-btn").forEach(btn => {
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener("click", async () => {
      if (!currentUser) { openLogin(); return; }
      const postId = parseInt(newBtn.dataset.post);
      const span = newBtn.querySelector(".like-count");
      
      const { data } = await supabaseClient.from("likes").select("id").eq("post_id", postId).eq("user_id", currentUser.id).maybeSingle();
      
      if (data) {
        await supabaseClient.from("likes").delete().eq("id", data.id);
        newBtn.classList.remove("liked");
        if (span) span.textContent = Math.max(0, parseInt(span.textContent) - 1);
      } else {
        await supabaseClient.from("likes").insert({ post_id: postId, user_id: currentUser.id });
        newBtn.classList.add("liked");
        if (span) span.textContent = (parseInt(span.textContent) || 0) + 1;
      }
    });
  });
}

async function loadLikes() {
  document.querySelectorAll(".like-btn").forEach(async btn => {
    const postId = btn.dataset.post;
    const { count } = await supabaseClient.from("likes").select("*", { count: "exact", head: true }).eq("post_id", postId);
    if (btn.querySelector(".like-count")) btn.querySelector(".like-count").textContent = count ?? 0;
    if (currentUser) {
      const { data } = await supabaseClient.from("likes").select("id").eq("post_id", postId).eq("user_id", currentUser.id).maybeSingle();
      if (data) btn.classList.add("liked");
    }
  });
}

// =======================
// AUTH & BADGE UTILS
// =======================
async function getUser() {
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user) {
      currentUser = user;
      const { data: profile } = await supabaseClient.from("profiles").select("role").eq("id", user.id).single();
      currentUser.role = profile?.role || 'user';
      protectAdminUI();
    }
  } catch (err) { currentUser = null; }
}

function protectAdminUI() {
  const adminBtn = document.getElementById('adminPanelBtn');
  if (adminBtn) adminBtn.style.display = (currentUser?.role === 'admin') ? 'flex' : 'none';
}

function getUserBadge(role) {
  if (role === 'admin') return `<span class="admin-badge" style="background:#ff4757; color:white; padding:2px 8px; border-radius:4px; font-size:10px; margin-left:5px; font-weight:bold;">🛡 Dev</span>`;
  if (role === 'verified') return `<span class="verified-badge" style="margin-left:5px;"><svg width="14" height="14" viewBox="0 0 24 24" style="vertical-align:middle;"><circle cx="12" cy="12" r="10" fill="#1DA1F2"/><path d="M7 12.5l3 3 7-7" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;
  return "";
}

async function loadCommentCounts() {
  document.querySelectorAll(".comment-toggle").forEach(async btn => {
    const { count } = await supabaseClient.from("comments").select("*", { count: "exact", head: true }).eq("post_id", btn.dataset.post);
    if (btn.querySelector(".comment-count")) btn.querySelector(".comment-count").textContent = count ?? 0;
  });
}

async function updateCommentCount(postId) {
  const { count } = await supabaseClient.from("comments").select("*", { count: "exact", head: true }).eq("post_id", postId);
  const btn = document.querySelector(`.comment-toggle[data-post="${postId}"]`);
  if (btn && btn.querySelector(".comment-count")) btn.querySelector(".comment-count").textContent = count ?? 0;
}

// =======================
// UI HELPERS
// =======================
function initSearch() {
  const input = document.getElementById("searchCreator");
  input?.addEventListener("input", () => {
    const val = input.value.toLowerCase();
    document.querySelectorAll(".card").forEach(card => {
      card.style.display = card.innerText.toLowerCase().includes(val) ? "block" : "none";
    });
  });
}

function initAuth() {
  const form = document.querySelector(".form");
  form?.addEventListener("submit", async e => {
    e.preventDefault();
    const email = form.querySelectorAll("input")[0].value;
    const password = form.querySelectorAll("input")[1].value;
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) alert(error.message); else location.reload();
  });
}

function openLogin() { document.getElementById("loginPopup").style.display = "flex"; }
function initCloseButtons() {
  document.querySelector(".comment-close")?.addEventListener("click", () => document.getElementById("commentModal").classList.remove("active"));
  document.querySelector(".close-login")?.addEventListener("click", () => document.getElementById("loginPopup").style.display = "none");
}
function initRealtime() {
  supabaseClient.channel("comments-live").on("postgres_changes", { event: "INSERT", schema: "public", table: "comments" }, async (payload) => {
    if (payload.new.post_id == currentPostId) {
       // Opsional: Kamu bisa tambahkan logic refresh komentar di sini
    }
  }).subscribe();
}
