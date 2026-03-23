let activeSongId = null;
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

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

// ================= SUPABASE CONFIG =================
const _supabaseUrl = "https://hqetnqnvmdxdgfnnluew.supabase.co";
const _supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZXRucW52bWR4ZGdmbm5sdWV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MzUyODIsImV4cCI6MjA4NzMxMTI4Mn0.Cr9lDBZMqfeONi1dfyFzHpBtawBzZTQLBEWKmPJVAOA";
const _supabase = createClient(_supabaseUrl, _supabaseKey);

// ================= SELECT ELEMENTS =================
const playlistGrid = document.getElementById("playlistGrid");
const searchInput = document.getElementById("search-input");
const audio = document.getElementById("audio-player");
const miniPlayer = document.getElementById("miniPlayer");
const miniCover = document.getElementById("mini-cover");
const miniTitle = document.getElementById("mini-title");
const miniArtist = document.getElementById("mini-artist");
const playBtn = document.getElementById("play-btn");
const progress = document.getElementById("progress");
const progressContainer = document.getElementById("progress-container");
const currentTimeEl = document.getElementById("current-time");
const durationEl = document.getElementById("duration");

const popup = document.getElementById("singerPopup");
const popupCover = document.getElementById("popup-cover");
const popupName = document.getElementById("popup-name");
const popupBio = document.getElementById("popup-bio");
const closeBtn = document.getElementById("closePopup");

const openSidebar = document.getElementById("openSidebar");
const closeSidebar = document.getElementById("closeSidebar");
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");

const commentSheet = document.getElementById("commentSheet");
const commentOverlay = document.getElementById("commentOverlay");
const sendCommentBtn = document.getElementById("sendCommentBtn");
const commentInput = document.getElementById("commentInput");
const commentList = document.getElementById("commentList");

// STATE
let allSongs = [];
let currentSongsList = [];
let currentSongIndex = -1;

// ================= 1. CORE FUNCTIONS (DATA & RENDER) =================
async function loadMusicLibrary() {
  const {
    data: { user },
  } = await _supabase.auth.getUser();

  const { data, error } = await _supabase
    .from("songs")
    .select(
      `
            *,
            comments(count),
            likes!song_id(count),
            user_liked:likes!song_id(id)
        `
    )
    .eq("status", "approved")
    .eq("likes.user_id", user?.id || "00000000-0000-0000-0000-000000000000")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Gagal muat musik:", error.message);
    return;
  }

  allSongs = data.map((song) => ({
    ...song,
    comment_count: song.comments?.[0]?.count || 0,
    like_count: song.likes?.[0]?.count || 0,
    is_liked: song.user_liked && song.user_liked.length > 0,
  }));

  renderPlaylist(allSongs);
}

function renderPlaylist(songs) {
  if (!playlistGrid) return;
  playlistGrid.innerHTML = "";
  currentSongsList = songs;

  songs.forEach((song, index) => {
    const card = document.createElement("div");
    const isActive = index === currentSongIndex ? "active-card" : "";
    card.className = `playlist-card ${isActive}`;

    const isLiked = song.is_liked;
    const heartIcon = isLiked ? "favorite" : "favorite_border";
    const activeClass = isLiked ? "is-liked" : "";

    const plays = (song.play_count || 0).toLocaleString("id-ID");
    const likes = (song.like_count || 0).toLocaleString("id-ID");
    const comments = (song.comment_count || 0).toLocaleString("id-ID");

    card.innerHTML = `
            <div class="card-cover-wrapper">
                <img src="${song.cover_url}" alt="${song.title}" loading="lazy">
            </div>
            <div class="card-text-info">
                <h3 class="song-title">${song.title}</h3>
                <p class="artist-name">${song.artist}</p>
            </div>
            <div class="card-stats-footer">
                <div class="stat-item">
                    <span class="material-icons">headphones</span>
                    <span>${plays}</span>
                </div>
                <div class="stat-group">
                    <div class="stat-item interactive ${activeClass}" onclick="event.stopPropagation(); window.handleLike(${song.id})">
                        <span class="material-icons">${heartIcon}</span>
                        <span>${likes}</span>
                    </div>
                    <div class="stat-item interactive" onclick="event.stopPropagation(); window.openComments(${song.id})">
                        <span class="material-icons">chat_bubble_outline</span>
                        <span id="comment-count-${song.id}">${comments}</span>
                    </div>
                </div>
            </div>
        `;

    card.addEventListener("click", () => {
      currentSongIndex = index;
      playSong(song);
    });
    playlistGrid.appendChild(card);
  });
}

// ================= NEW: LIKE SYSTEM =================
window.handleLike = async function (songId) {
  const clickedElement = event.currentTarget.querySelector(".material-icons");

  if (clickedElement) {
    clickedElement.classList.add("heart-pop");
    setTimeout(() => clickedElement.classList.remove("heart-pop"), 400);
  }

  const {
    data: { user },
  } = await _supabase.auth.getUser();
  if (!user) return alert("Login dulu bro!");

  const { data: existingLike } = await _supabase
    .from("likes")
    .select("id")
    .eq("song_id", songId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingLike) {
    await _supabase.from("likes").delete().eq("id", existingLike.id);
  } else {
    await _supabase.from("likes").insert({
      song_id: songId,
      user_id: user.id,
    });
  }

  loadMusicLibrary();
};

// ================= 2. PLAYER LOGIC =================
let playTimer = null;

function playSong(song) {
  if (!miniPlayer || !audio) return;

  if (playTimer) {
    clearTimeout(playTimer);
    playTimer = null;
  }

  miniPlayer.style.display = "flex";

  audio.src = song.audio_src.startsWith("http")
    ? song.audio_src
    : `songs/${song.audio_src}`;
  audio.play();

  playTimer = setTimeout(async () => {
    if (!audio.paused && currentSongsList[currentSongIndex]?.id === song.id) {
      console.log("Valid 1 menit! Menambah play count untuk:", song.title);
      await updatePlayCount(song.id);
    }
  }, 60000);

  if (miniCover) miniCover.src = song.cover_url;
  if (miniTitle) miniTitle.textContent = song.title;
  if (miniArtist) miniArtist.textContent = song.artist;

  document.body.style.background = `linear-gradient(to bottom, rgba(13, 17, 23, 0.9), #0d1117), url('${song.cover_url}') center/cover no-repeat`;

  document.querySelectorAll(".playlist-card").forEach((card, idx) => {
    card.style.borderColor = idx === currentSongIndex ? "#1f3cff" : "#30363d";
  });
}

if (audio) {
  audio.addEventListener("ended", () => {
    currentSongIndex++;
    if (currentSongIndex < currentSongsList.length) {
      playSong(currentSongsList[currentSongIndex]);
    } else {
      currentSongIndex = 0;
      playSong(currentSongsList[0]);
    }
  });

  audio.addEventListener("play", () => {
    if (playBtn) playBtn.textContent = "pause";
  });
  audio.addEventListener("pause", () => {
    if (playBtn) playBtn.textContent = "play_arrow";
  });

  audio.addEventListener("timeupdate", () => {
    if (audio.duration && progress) {
      const percent = (audio.currentTime / audio.duration) * 100;
      progress.style.width = `${percent}%`;
      if (currentTimeEl) currentTimeEl.textContent = formatTime(audio.currentTime);
      if (durationEl) durationEl.textContent = formatTime(audio.duration);
    }
  });
}

if (playBtn) {
  playBtn.addEventListener("click", () =>
    audio.paused ? audio.play() : audio.pause()
  );
}

function formatTime(time) {
  const min = Math.floor(time / 60);
  const sec = Math.floor(time % 60);
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

if (progressContainer) {
  progressContainer.addEventListener("click", (e) => {
    audio.currentTime =
      (e.offsetX / progressContainer.clientWidth) * audio.duration;
  });
}

// ================= UPDATE PLAY COUNT =================
async function updatePlayCount(songId) {
  try {
    const { data: songData } = await _supabase
      .from("songs")
      .select("play_count")
      .eq("id", songId)
      .single();

    const currentCount = songData?.play_count || 0;

    const { error } = await _supabase
      .from("songs")
      .update({ play_count: currentCount + 1 })
      .eq("id", songId);

    if (error) throw error;

    loadMusicLibrary();
    console.log("Play count updated! +1");
  } catch (err) {
    console.error("Gagal update play count:", err.message);
  }
}

// ================= 3. COMMENT SYSTEM (SLIDE UP) =================
window.openComments = function (songId) {
  activeSongId = songId;
  if (commentSheet && commentOverlay) {
    commentOverlay.style.display = "block";
    setTimeout(() => {
      commentSheet.classList.add("active");
    }, 10);
    loadComments(songId);
  }
};

window.hideComments = function () {
  if (!commentSheet || !commentOverlay) return;
  commentSheet.classList.remove("active");
  setTimeout(() => {
    commentOverlay.style.display = "none";
  }, 400);
};

async function loadComments(songId) {
  if (!commentList) return;

  // SKELETON LOADING
  commentList.innerHTML = Array(3)
    .fill(0)
    .map(
      () => `
        <div class="skeleton-comment" style="display:flex; gap:12px; margin-bottom:20px; padding:10px; animation: pulse-bg 1.5s infinite;">
            <div style="width:32px; height:32px; background:#222; border-radius:50%;"></div>
            <div style="flex:1;">
                <div style="width:30%; height:10px; background:#222; margin-bottom:8px; border-radius:4px;"></div>
                <div style="width:80%; height:10px; background:#222; border-radius:4px;"></div>
            </div>
        </div>
    `
    )
    .join("");

  const { data: allComments, error } = await _supabase
    .from("comments")
    .select(
      "id, content, created_at, parent_id, profiles!inner(username, avatar_url, role)"
    )
    .eq("song_id", songId)
    .order("created_at", { ascending: true });

  if (error) {
    commentList.innerHTML =
      '<p style="text-align:center; color:#ff4757; padding:20px;">Gagal memuat obrolan 😭</p>';
    return;
  }

  if (!allComments || allComments.length === 0) {
    commentList.innerHTML =
      '<p style="text-align:center; color:#666; padding:20px;">Belum ada komentar.</p>';
    return;
  }

  const parents = allComments.filter((c) => !c.parent_id);
  const replies = allComments.filter((c) => c.parent_id);
  let finalHtml = "";

  parents.forEach((parent) => {
    const user = parent.profiles;
    const timeAgo = timeSince(new Date(parent.created_at));
    const childReplies = replies.filter((r) => r.parent_id === parent.id);
    const hasReplies = childReplies.length > 0;

    finalHtml += `
            <div class="comment-item" id="comment-${parent.id}" style="margin-bottom: 20px; display: flex; gap: 12px;">
                <img src="${
                  user?.avatar_url ||
                  `https://ui-avatars.com/api/?name=${user?.username}`
                }" class="comment-avatar" style="width:32px; height:32px; border-radius:50%; object-fit:cover;">
                <div class="comment-content-wrapper" style="flex:1;">
                    <div class="comment-header-row" style="display:flex; align-items:center; gap:8px;">
                        <span style="font-weight:bold; color:#fff; font-size:14px;">${
                          user?.username
                        }</span>
                        ${getUserBadge(user?.role)}
                        <span style="color:#666; font-size:11px;">${timeAgo}</span>
                    </div>
                    <p style="color:#ccc; margin:4px 0; font-size:14px; line-height:1.4;">${
                      parent.content
                    }</p>
                    <button class="reply-btn" onclick="replyTo('${
                      user?.username
                    }', ${
      parent.id
    })" style="background:none; border:none; color:#888; font-size:11px; cursor:pointer; padding:0;">Balas</button>
                    
                    ${
                      hasReplies
                        ? `
                        <div class="reply-section" style="margin-top: 10px;">
                            <button id="toggle-btn-${parent.id}" class="toggle-replies-btn" onclick="toggleReplies(${parent.id})" style="color: #1DA1F2; font-size: 11px; background: none; border: none; cursor: pointer; padding: 0; font-weight:500;">
                                ——— Lihat ${childReplies.length} balasan
                            </button>
                            
                            <div id="reply-container-${parent.id}" data-count="${childReplies.length}" style="display: none; margin-left: 10px; border-left: 1px solid #333; padding-left: 15px; margin-top: 10px;">
                                ${childReplies
                                  .map(
                                    (reply) => `
                                    <div class="comment-item" id="comment-${
                                      reply.id
                                    }" style="margin-bottom: 12px; display: flex; gap: 10px;">
                                        <img src="${
                                          reply.profiles?.avatar_url ||
                                          `https://ui-avatars.com/api/?name=${reply.profiles?.username}`
                                        }" style="width:24px; height:24px; border-radius:50%; object-fit:cover;">
                                        <div style="flex:1;">
                                            <div style="display:flex; align-items:center; gap:5px;">
                                                <span style="font-size:13px; font-weight:bold; color:#fff;">${
                                                  reply.profiles?.username
                                                }</span>
                                                ${getUserBadge(
                                                  reply.profiles?.role
                                                )}
                                                <span style="font-size:10px; color:#666;">${timeSince(
                                                  new Date(reply.created_at)
                                                )}</span>
                                            </div>
                                            <p style="font-size:13px; color:#ccc; margin:2px 0;">${
                                              reply.content
                                            }</p>
                                            <button class="reply-btn" onclick="replyTo('${
                                              reply.profiles?.username
                                            }', ${
                                      parent.id
                                    })" style="background:none; border:none; color:#888; font-size:10px; cursor:pointer; padding:0;">Balas</button>
                                        </div>
                                    </div>
                                `
                                  )
                                  .join("")}
                            </div>
                        </div>
                    `
                        : ""
                    }
                </div>
            </div>`;
  });
  commentList.innerHTML = finalHtml;
}

window.toggleReplies = function (parentId) {
  const container = document.getElementById(`reply-container-${parentId}`);
  const btn = document.getElementById(`toggle-btn-${parentId}`);
  const count = container.getAttribute("data-count");

  if (container.style.display === "none") {
    container.style.display = "block";
    btn.innerText = "——— Sembunyikan balasan";
  } else {
    container.style.display = "none";
    btn.innerText = `——— Lihat ${count} balasan`;
  }
};

window.replyTo = function (username, parentId = null) {
  if (commentInput) {
    commentInput.value = `@${username} `;
    commentInput.focus();
    commentInput.dataset.replyTo = parentId;
  }
};

// ================= SEND COMMENT =================
let cachedUserProfile = null;

async function handleSendComment() {
  const text = commentInput.value.trim();
  if (!text || !activeSongId) return;

  const {
    data: { user },
  } = await _supabase.auth.getUser();
  if (!user) {
    alert("Login dulu bro!");
    return;
  }

  if (!cachedUserProfile) {
    const { data: profile } = await _supabase
      .from("profiles")
      .select("username, avatar_url, role")
      .eq("id", user.id)
      .single();
    cachedUserProfile = profile;
  }

  const profile = cachedUserProfile;
  const replyData = commentInput.dataset.replyTo;
  const parentId =
    replyData && replyData.trim() !== "" ? Number(replyData) : null;

  const tempId = Date.now();
  const avatar =
    profile?.avatar_url ||
    `https://ui-avatars.com/api/?name=${profile?.username}`;
  const roleBadge = getUserBadge(profile?.role);
  const isReply = parentId !== null;

  const tempHtml = `
        <div class="comment-item" id="temp-${tempId}" style="display: flex; gap: 10px; opacity: 0.6; margin-bottom: 15px;">
            <img src="${avatar}" style="width:${
    isReply ? "24px" : "32px"
  }; height:${isReply ? "24px" : "32px"}; border-radius:50%;">
            <div style="flex:1;">
                <div style="display:flex; align-items:center; gap:5px;">
                    <span style="font-weight:bold; color:#fff; font-size:14px;">${
                      profile.username
                    }</span>
                    <span style="font-size:11px; color:#888;">Mengirim...</span>
                </div>
                <p style="color:#ccc; font-size:14px; margin:0;">${text}</p>
            </div>
        </div>
    `;

  if (isReply) {
    const container = document.getElementById(`reply-container-${parentId}`);
    if (container) {
      container.insertAdjacentHTML("beforeend", tempHtml);
      container.style.display = "block";
    }
  } else {
    // FIX: Muncul di bawah
    commentList.insertAdjacentHTML("beforeend", tempHtml);
  }

  // FIX: Auto scroll ke komentar baru
  setTimeout(() => {
    const tempEl = document.getElementById(`temp-${tempId}`);
    if (tempEl) tempEl.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, 50);

  commentInput.value = "";
  commentInput.dataset.replyTo = "";
  commentInput.placeholder = "Tulis komentar...";

  const { error } = await _supabase.from("comments").insert({
    song_id: activeSongId,
    user_id: user.id,
    content: text,
    parent_id: parentId,
  });

  if (error) {
    console.error(error);
    document.getElementById(`temp-${tempId}`)?.remove();
    alert("Komentar gagal terkirim!");
  } else {
    // FIX: Realtime UI Update pada card utama
    setTimeout(() => {
      loadComments(activeSongId);
      
      const countEl = document.getElementById(`comment-count-${activeSongId}`);
      if (countEl) {
        const currentCount = parseInt(countEl.innerText) || 0;
        countEl.innerText = currentCount + 1; 
      }
      
      const songIndex = allSongs.findIndex(s => s.id === activeSongId);
      if (songIndex !== -1) {
        allSongs[songIndex].comment_count = (allSongs[songIndex].comment_count || 0) + 1;
      }
    }, 300);
  }
}

function timeSince(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) return interval + "y";
  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) return interval + "mo";
  interval = Math.floor(seconds / 86400);
  if (interval >= 1) return interval + "d";
  interval = Math.floor(seconds / 3600);
  if (interval >= 1) return interval + "h";
  interval = Math.floor(seconds / 60);
  if (interval >= 1) return interval + "m";
  return Math.floor(seconds) + "s";
}

if (sendCommentBtn)
  sendCommentBtn.addEventListener("click", handleSendComment);
if (commentInput)
  commentInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleSendComment();
  });
if (commentOverlay)
  commentOverlay.addEventListener("click", () => {
    hideComments();
  });

// ================= 4. UI EXTRA (SIDEBAR, POPUP, FILTER) =================
window.toggleSidebar = function () {
  const sidebar = document.getElementById("sidebar");
  const sidebarOverlay = document.getElementById("sidebarOverlay");

  if (sidebar && sidebarOverlay) {
    sidebar.classList.toggle("active");
    sidebarOverlay.classList.toggle("active");
  }
};

if (openSidebar)
  openSidebar.addEventListener("click", window.toggleSidebar);
if (closeSidebar)
  closeSidebar.addEventListener("click", window.toggleSidebar);
if (sidebarOverlay)
  sidebarOverlay.addEventListener("click", window.toggleSidebar);

document.querySelectorAll(".category-tabs button").forEach((tab) => {
  tab.addEventListener("click", () => {
    const activeTab = document.querySelector(".category-tabs .active");
    if (activeTab) activeTab.classList.remove("active");

    tab.classList.add("active");
    const cat = tab.getAttribute("data-cat");
    const filtered =
      cat === "all" ? allSongs : allSongs.filter((s) => s.category === cat);
    renderPlaylist(filtered);
  });
});

if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = allSongs.filter(
      (s) =>
        s.title.toLowerCase().includes(query) ||
        s.artist.toLowerCase().includes(query)
    );
    renderPlaylist(filtered);
  });
}

// ================= 5. RBAC & INITIALIZE =================
async function checkAdminAccess() {
  const adminPanelBtn = document.getElementById("adminPanelBtn");
  if (!adminPanelBtn) return;
  adminPanelBtn.style.setProperty("display", "none", "important");

  const {
    data: { session },
  } = await _supabase.auth.getSession();
  if (!session) return;

  const { data: profile } = await _supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (profile?.role === "admin") {
    adminPanelBtn.style.setProperty("display", "block", "important");
  }
}

// --- Buka/Tutup Modal Upload ---
const uploadSheet = document.getElementById("uploadSheet");
const uploadOverlay = document.getElementById("uploadOverlay");
const openUploadBtn = document.getElementById("openUploadModal");

window.closeUpload = function () {
  uploadSheet.classList.remove("active");
  setTimeout(() => {
    uploadOverlay.style.display = "none";
  }, 400);
};

if (openUploadBtn) {
  openUploadBtn.addEventListener("click", () => {
    uploadOverlay.style.display = "block";
    setTimeout(() => {
      uploadSheet.classList.add("active");
    }, 10);
  });
}

// --- Fungsi Upload Cloudinary ---
const CLOUD_NAME = "dhhmkb8kl"; 
const UPLOAD_PRESET = "hopehype_preset"; 

window.handleUploadMusik = async function () {
  const title = document.getElementById("upTitle").value;
  const artist = document.getElementById("upArtist").value;
  const audioFile = document.getElementById("upAudioFile").files[0];
  const coverFile = document.getElementById("upCoverFile").files[0];
  const status = document.getElementById("uploadStatus");

  if (!title || !artist || !audioFile || !coverFile) {
    status.innerText = "Lengkapi data dulu bro!";
    return;
  }

  try {
    status.innerText = "Sedang mengupload... ☁️";
    document.getElementById("btnUpload").disabled = true;

    const uploadFile = async (file, type) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", UPLOAD_PRESET);
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`,
        {
          method: "POST",
          body: formData,
        }
      );
      const data = await res.json();
      return data.secure_url;
    };

    const audioUrl = await uploadFile(audioFile);
    const coverUrl = await uploadFile(coverFile);

    const { error } = await _supabase.from("songs").insert({
      title,
      artist,
      audio_src: audioUrl,
      cover_url: coverUrl,
    });

    if (error) throw error;

    status.innerText = "Berhasil! 🎉";
    setTimeout(() => {
      closeUpload();
      loadMusicLibrary();
    }, 1500);
  } catch (err) {
    status.innerText = "Gagal: " + err.message;
  } finally {
    document.getElementById("btnUpload").disabled = false;
  }
};

window.updateAudioName = function (event) {
  const file = event.target.files[0];
  const display = document.getElementById("audioFileName");
  if (file && display) {
    display.innerText = file.name;
    display.style.color = "#fff"; 
  }
};

window.previewImage = function (event) {
  const file = event.target.files[0];
  const preview = document.getElementById("imagePreview");
  const container = document.getElementById("previewContainer");
  const fileNameDisplay = document.getElementById("coverFileName");

  if (file) {
    if (fileNameDisplay) {
      fileNameDisplay.innerText = file.name;
      fileNameDisplay.style.color = "#fff";
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      if (preview && container) {
        preview.src = e.target.result;
        container.style.display = "block"; 
      }
    };
    reader.readAsDataURL(file);
  }
};

const originalCloseUpload = window.closeUpload;
window.closeUpload = function () {
  if (typeof originalCloseUpload === "function") originalCloseUpload();

  setTimeout(() => {
    const previewCont = document.getElementById("previewContainer");
    if (previewCont) previewCont.style.display = "none";

    const imgPrev = document.getElementById("imagePreview");
    if (imgPrev) imgPrev.src = "";

    const fields = ["upTitle", "upArtist", "upAudioFile", "upCoverFile"];
    fields.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });

    const audioLabel = document.getElementById("audioFileName");
    if (audioLabel) {
      audioLabel.innerText = "Pilih lagu favoritmu...";
      audioLabel.style.color = "#888";
    }

    const coverLabel = document.getElementById("coverFileName");
    if (coverLabel) {
      coverLabel.innerText = "Pilih cover yang keren...";
      coverLabel.style.color = "#888";
    }

    const status = document.getElementById("uploadStatus");
    if (status) status.innerText = "";
  }, 400);
};

async function initApp() {
  await loadMusicLibrary();
  await checkAdminAccess();
  _supabase.auth.onAuthStateChange(() => checkAdminAccess());
}

initApp();
