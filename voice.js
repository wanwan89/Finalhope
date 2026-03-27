// Ambil Parameter dari URL
const urlParams = new URLSearchParams(window.location.search);
const CURRENT_ROOM_ID = urlParams.get('id'); // Ini kunci biar gak ketukar!
const CURRENT_ROOM_NAME = urlParams.get('name') || "Voice Room";

// Set Judul Room di Header secara dinamis
document.addEventListener('DOMContentLoaded', () => {
    const titleEl = document.querySelector('.room-title');
    if (titleEl) titleEl.innerText = CURRENT_ROOM_NAME.toUpperCase();
});

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


// --- 1. KONFIGURASI SUPABASE ---
const supabaseUrl = 'https://hqetnqnvmdxdgfnnluew.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZXRucW52bWR4ZGdmbm5sdWV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MzUyODIsImV4cCI6MjA4NzMxMTI4Mn0.Cr9lDBZMqfeONi1dfyFzHpBtawBzZTQLBEWKmPJVAOA';
const sb = supabase.createClient(supabaseUrl, supabaseKey);

// --- 2. KONFIGURASI LIVEKIT ---
const LIVEKIT_URL = "wss://voicegrup-zxmeibkn.livekit.cloud"; 

let room;
let MY_USER_ID = localStorage.getItem('hype_user_id'); 
let myUsername = "User_" + Math.floor(Math.random() * 1000); // Nama cadangan

// --- 3. JALANKAN APLIKASI ---
async function initApp() {
    console.log("🚀 Memulai HypeVoice (Ultimate Repair)...");
    
    // Urutan: 1. Cek User -> 2. Render Stage -> 3. Konek LiveKit
    await checkUser(); 
    await fetchStage(); 
    
    initLiveKit(); 
    listenRealtime(); 
}

// --- 4. LOGIKA SUARA (FIXED & SYNC) ---
async function initLiveKit() {
    if (typeof LivekitClient === 'undefined') return console.error("❌ SDK LiveKit Hilang!");

    try {
        console.log("⏳ Mencoba konek LiveKit untuk ID:", MY_USER_ID);
        
        const response = await fetch(`${supabaseUrl}/functions/v1/get-livekit-token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            },
            body: JSON.stringify({ 
                username: myUsername,
                identity: MY_USER_ID // Kita tetep kirim UUID sebagai prioritas
            })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error);

        // Inisialisasi Room dengan deteksi suara yang sensitif
        room = new LivekitClient.Room({
            adaptiveStream: true,
            dynacast: true,
            audioCaptureDefaults: {
                echoCancellation: true,
                noiseSuppression: true,
            }
        });

        // --- FIX EFEK GLOW (STRATEGI DUAL-MATCH) ---
        room.on(LivekitClient.RoomEvent.ActiveSpeakersChanged, (speakers) => {
            // 1. Reset semua glow
            document.querySelectorAll('.avatar').forEach(el => el.classList.remove('speaking'));
            
            speakers.forEach((s) => {
                // 2. Cari elemen berdasarkan Identity (Bisa UUID atau Username)
                let el = document.querySelector(`[data-user-id="${s.identity}"]`);
                
                // 3. Fallback: Jika ID nggak ketemu, coba cari berdasarkan ID gue sendiri kalau isMe
                if (!el && s.isLocal) {
                    el = document.querySelector('.avatar.active'); 
                }

                if (el) {
                    el.classList.add('speaking');
                    console.log("✅ GLOW NYALA UNTUK:", s.identity);
                } else {
                    console.warn("⚠️ Speaker detected tapi elemen HTML gak ketemu. ID dari LiveKit:", s.identity);
                }
            });
        });

        // Event: Suara orang lain masuk
        room.on(LivekitClient.RoomEvent.TrackSubscribed, (track) => {
            if (track.kind === "audio") {
                const element = track.attach(); 
                document.body.appendChild(element); 
            }
        });

        await room.connect(LIVEKIT_URL, data.token);
        
        // LOG PENTING: Liat di console identity apa yang akhirnya dipake LiveKit
        console.log("✅ BERHASIL KONEK! Identity Anda di LiveKit adalah:", room.localParticipant.identity);
        
        await room.localParticipant.setMicrophoneEnabled(false);

    } catch (e) {
        console.error("❌ Gagal di LiveKit:", e.message);
    }
}

async function fetchStage() {
    if (!CURRENT_ROOM_ID || CURRENT_ROOM_ID === "null") return;

    console.log("📡 Mengambil data panggung & badge...");
    
    // VERSI BERSIH: Tanpa komentar di dalam string select
    let { data: slots, error } = await sb.from('room_slots')
        .select(`
            slot_index, 
            profile_id, 
            profiles (
                username, 
                avatar_url, 
                role
            )
        `)
        .eq('room_id', CURRENT_ROOM_ID)
        .order('slot_index', { ascending: true });

    if (error) return console.error("❌ Gagal load panggung:", error.message);

    // Logic Auto-Create Kursi (Tetap sama)
    if (!slots || slots.length === 0) {
        console.log("🛠️ Kursi kosong, sedang memasang kursi...");
        const newSlots = [];
        for (let i = 0; i < 6; i++) {
            newSlots.push({ room_id: CURRENT_ROOM_ID, slot_index: i, profile_id: null });
        }
        await sb.from('room_slots').insert(newSlots);
        return fetchStage(); 
    }

    renderStage(slots);
}

// Tambahkan variabel global di paling atas voice.js (di bawah CURRENT_ROOM_ID)
let IS_OWNER = false; 

function renderStage(slots) {
    const grid = document.getElementById('stage-grid');
    if (!grid) return;
    grid.innerHTML = "";

    slots.forEach((slot, i) => {
        const user = slot.profiles;
        const isMe = slot.profile_id === MY_USER_ID;
        const item = document.createElement('div');
        item.className = 'speaker-item';
        
        if (user) {
            const userBadge = getUserBadge(user.role); 
            // Cek apakah kita owner dan user ini bukan kita sendiri
            const canKick = IS_OWNER && !isMe;

            item.innerHTML = `
                <div class="avatar ${isMe ? 'active' : ''}" 
                     data-user-id="${slot.profile_id}" 
                     onclick="toggleKickBtn(this, ${canKick})">
                    
                    <img src="${user.avatar_url || 'profile.png'}">
                    
                    ${canKick ? `
                        <div class="kick-btn-wrapper" style="display:none;">
                            <div class="kick-btn" onclick="event.stopPropagation(); kickUser('${slot.profile_id}', '${user.username}')">
                                <span class="material-icons">close</span>
                            </div>
                        </div>
                    ` : ''}
                </div>
                <span class="name-label" style="display: flex; align-items: center; justify-content: center; gap: 4px;">
                    ${user.username} ${userBadge}
                </span>
            `;
        } else {
            // ... (Bagian slot kosong tetap sama)
            item.innerHTML = `
                <div class="avatar" onclick="naikKeStage(${i})">
                    <span class="material-icons" style="color: #444; font-size: 30px;">add</span>
                </div>
                <span class="name-label">KOSONG</span>
            `;
        }
        grid.appendChild(item);
    });
}

// --- LOGIKA KIRIM GIFT (REALTIME) ---
async function mintaGift(targetUsername) {
  // 1. Tentukan jenis gift (nanti bisa lo ganti pake menu popup)
  const jenisGift = "🌹 Mawar Merah";
  
  console.log(`🎁 Mengirim ${jenisGift} ke ${targetUsername}...`);

  try {
    // 2. Kirim pesan spesial ke tabel 'room_messages'
    // Biar Realtime di JS ngebaca pesan ini dan nampilin animasi.
    const { error } = await sb.from('room_messages').insert([{ 
    room_id: CURRENT_ROOM_ID, // TAMBAHKAN INI
    username: "SISTEM_GIFT", 
    text: `✨ ${myUsername} mengirim ${icon} ${giftName.toUpperCase()} ke ${selectedTargetName}!` 
}]);


    if (error) throw error;

    // 3. Tampilkan animasi di HP lo sendiri (Lokal)
    showLocalGiftAnimation(jenisGift);

  } catch (e) {
    console.error("❌ Gagal kirim gift:", e.message);
    toast("Gagal mengirim gift, coba lagi nanti.");
  }
}

// Efek Confetti simpel pas kita berhasil kirim
function showLocalGiftAnimation(gift) {
  if (typeof confetti !== 'undefined') {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  } else {
    // Kalau library confetti gak ada, Alert biasa
    toast("🎁 Gift terkirim! Thx sawerannya."); 
  }
}

async function naikKeStage(index) {
    console.log("🎯 Mencoba pindah ke slot:", index);
    if (!MY_USER_ID) return toast("Login dulu Bree!");

    try {
        // --- STEP 1: CABUT DULU DARI MANA PUN (TANPA SYARAT) ---
        // Kita paksa semua slot yang isinya ID lo jadi NULL.
        // Kita gunain .neq('id', '0') cuma buat trigger update global yang aman.
        const { error: clearErr } = await sb.from('room_slots')
            .update({ profile_id: null })
            .eq('profile_id', MY_USER_ID);

        if (clearErr) {
            console.warn("Sedang membersihkan slot lama...", clearErr.message);
        }

        // --- STEP 2: KASIH JEDA DIKIT (BIAR DATABASE NAFAS) ---
        // Jeda 300ms biar transaksi pertama beneran kelar di server Supabase
        await new Promise(resolve => setTimeout(resolve, 300));

        // --- STEP 3: DUDUK DI KURSI BARU ---
        const { data, error } = await sb.from('room_slots')
            .update({ profile_id: MY_USER_ID })
            .match({ 
                room_id: CURRENT_ROOM_ID, 
                slot_index: index 
            })
            .select();

        if (error) {
            if (error.message.includes("permission denied")) {
                toast("Database masih kegembok! Pastiin SQL 'panggung_full_bypass' udah lo RUN.");
                return;
            }
            throw error;
        }

        console.log("✅ BERHASIL PINDAH KURSI!");
        
        // Suara tetep On
        if (room && room.state === "connected") {
            await room.localParticipant.setMicrophoneEnabled(true);
        }

    } catch (err) {
        console.error("❌ Gagal pindah panggung:", err.message);
    }
}

async function turunMic(index) {
    if (!confirm("Turun dari panggung?")) return;
    
    console.log("⬇️ Mencoba turun dari slot:", index);
    
    const { error } = await sb.from('room_slots')
        .update({ profile_id: null })
        .eq('profile_id', MY_USER_ID);

    if (!error) {
        console.log("✅ Berhasil turun di Database");
        if (room && room.localParticipant) {
            await room.localParticipant.setMicrophoneEnabled(false);
            console.log("🔇 Mic dimatikan otomatis.");
        }
        // Stage bakal ke-render ulang otomatis karena ada listenRealtime()
    } else {
        console.error("❌ Gagal turun:", error.message);
    }
}

function toggleKickBtn(el, canKick) {
    if (!canKick) return;

    // Cari wrapper tombol kick di dalam avatar yang diklik
    const wrapper = el.querySelector('.kick-btn-wrapper');
    
    // Sembunyikan semua tombol kick lain dulu biar gak rame
    document.querySelectorAll('.kick-btn-wrapper').forEach(w => {
        if (w !== wrapper) w.style.display = 'none';
    });

    // Toggle (Muncul/Ilang)
    if (wrapper.style.display === 'none') {
        wrapper.style.display = 'flex';
    } else {
        wrapper.style.display = 'none';
    }
}

 
// Fungsi untuk nge-kick
async function kickUser(targetId, targetName) {
    if (!confirm(`Kick ${targetName} dari panggung?`)) return;

    try {
        const { error } = await sb.from('room_slots')
            .update({ profile_id: null })
            .match({ room_id: CURRENT_ROOM_ID, profile_id: targetId });

        if (error) throw error;

        // Notif ke chat
        await sb.from('room_messages').insert([{ 
            room_id: CURRENT_ROOM_ID, 
            username: "SISTEM", 
            text: `🚫 ${targetName} telah ditendang dari panggung oleh Owner.` 
        }]);

    } catch (err) {
        toast("Gagal kick: " + err.message);
    }
}


// Pastikan variabel ini ada di paling atas file voice.js (Global)
let myRole = "user"; 

async function checkUser() {
    // 1. Ambil session resmi dari Supabase
    const { data: { session } } = await sb.auth.getSession();
    
    if (session) {
        MY_USER_ID = session.user.id;
        console.log("🆔 My ID terdeteksi:", MY_USER_ID);

        // 2. Ambil Profil & Cek Owner secara pararel
        const [profileRes, roomRes] = await Promise.all([
            sb.from('profiles').select('*').eq('id', MY_USER_ID).maybeSingle(),
            sb.from('rooms').select('owner_id, is_active').eq('id', CURRENT_ROOM_ID).maybeSingle()
        ]);

        // 3. UPDATE DATA PROFIL & SIDEBAR
        if (profileRes.data) {
            myUsername = profileRes.data.username;
            myRole = profileRes.data.role || "user"; // Simpan role untuk sistem badge chat
            
            // Update Nama di Sidebar
            const sideName = document.getElementById('sidebar-username');
            if (sideName) sideName.innerText = myUsername;
            
            // Update Foto Profil Sidebar
            const sideAvatar = document.getElementById('sidebar-avatar');
            if (sideAvatar) {
                sideAvatar.src = profileRes.data.avatar_url || 'profile.png';
            }

            // Update Koin
            const coinLabel = document.getElementById('user-coins');
            if (coinLabel) coinLabel.innerText = (profileRes.data.coins || 0).toLocaleString();
        }

        // 4. LOGIC OWNER & MENU SETTINGS
        if (roomRes.data && roomRes.data.owner_id === MY_USER_ID) {
            IS_OWNER = true;
            console.log("👑 KONFIRMASI: LO ADALAH OWNER!");

            // TAMPILKAN MENU SETTING (Hanya untuk Owner)
            const setBtn = document.getElementById('menu-setting');
            if (setBtn) setBtn.style.display = 'flex'; 

            // Aktifkan Room kembali
            await sb.from('rooms').update({ is_active: true }).eq('id', CURRENT_ROOM_ID);
        } else {
            IS_OWNER = false;
            // Sembunyikan menu setting jika bukan owner (jaga-jaga)
            const setBtn = document.getElementById('menu-setting');
            if (setBtn) setBtn.style.display = 'none';
        }
        
        // 5. Render panggung
        fetchStage(); 
    } else {
        console.warn("⚠️ User tidak login.");
    }
}

// --- FUNGSI LOGOUT (Dipanggil dari HTML lo tadi) ---
async function keluarRoom() {
    if (IS_OWNER) {
        const yakin = confirm("Tutup panggung sementara dan keluar?");
        if (!yakin) return;

        try {
            // Kosongkan panggung (Usir semua orang)
            await sb.from('room_slots')
                .update({ profile_id: null })
                .eq('room_id', CURRENT_ROOM_ID);

            // Set Room jadi nonaktif
            await sb.from('rooms')
                .update({ is_active: false })
                .eq('id', CURRENT_ROOM_ID);

            console.log("🚪 Room dinonaktifkan.");
        } catch (e) {
            console.error("Gagal tutup room:", e.message);
        }
    }

    // Balik ke Lobby
    window.location.href = 'lobby.html';
}

async function mintaNaik() {
    console.log("🖱️ Tombol NAIK MIC diklik");
    const { data: allSlots } = await sb.from('room_slots').select('slot_index, profile_id').order('slot_index', { ascending: true });
    
    // Cari slot yang beneran kosong
    const slotKosong = allSlots.find(s => !s.profile_id);
    if (slotKosong) {
        naikKeStage(slotKosong.slot_index);
    } else {
        toast("Panggung penuh!");
    }
}

function listenRealtime() {
    if (!CURRENT_ROOM_ID || !MY_USER_ID) return console.error("❌ ID Room atau User ID tidak ditemukan!");

    // 1. Buat Channel Khusus Room ini dengan Fitur Presence
    const roomChannel = sb.channel(`room_active_${CURRENT_ROOM_ID}`, {
        config: {
            presence: { key: MY_USER_ID }, // Absen pake ID lo
        },
    });

    // --- A. LOGIKA PRESENCE (DETEKSI USER TUTUP WEB) ---
    roomChannel.on('presence', { event: 'leave' }, async ({ leftPresences }) => {
    // Pake for...of biar await-nya beneran ditunggu satu-satu
    for (const p of leftPresences) {
        console.log("👋 Cleaning up user offline:", p.key);
        
        const { error } = await sb.from('room_slots')
            .update({ profile_id: null })
            .match({ profile_id: p.key }); // Hapus slot mana pun yang isinya ID user ini

        if (error) console.error("❌ Gagal cleanup:", error.message);
    }
});

    // --- B. LOGIKA PANGGUNG (REALTIME DATABASE) ---
    roomChannel.on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'room_slots',
        filter: `room_id=eq.${CURRENT_ROOM_ID}` 
    }, (payload) => {
        console.log("🔄 Update Panggung diterima!");
        fetchStage(); // Gambar ulang panggung
    });

    // --- C. LOGIKA CHAT (REALTIME DATABASE) ---
    // Di dalam listenRealtime() bagian tabel 'room_messages'
roomChannel.on('postgres_changes', { 
    event: 'INSERT', 
    schema: 'public', 
    table: 'room_messages',
    filter: `room_id=eq.${CURRENT_ROOM_ID}` 
}, (p) => {
    const chatBox = document.getElementById('chat-box');
    if (!chatBox) return;

    // AMBIL BADGE: Panggil fungsi badge lo di sini
    // Pastikan kolom 'role' ikut dikirim saat insert pesan
    const userRole = p.new.role || 'user'; 
    const badge = getUserBadge(userRole);

    const div = document.createElement('div');
    const isSystem = p.new.username === "SISTEM_GIFT" || p.new.username === "SISTEM";
    div.className = isSystem ? 'msg system' : 'msg';
    
    div.innerHTML = isSystem 
        ? `<span>${p.new.text}</span>` 
        : `<span class="user">${p.new.username}${badge}:</span> ${p.new.text}`;
        
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
});


    // --- D. SUBSCRIBE & TRACK ---
    roomChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
            console.log("✅ Terhubung ke Realtime Room!");
            
            // Lapor ke server: "Gue lagi di room ini!"
            await roomChannel.track({
                online_at: new Date().toISOString(),
                username: myUsername
            });
        }
    });
}


async function kirimKomentar() {
    const text = document.getElementById('chat-input').value;
    if (!text) return;

    await sb.from('room_messages').insert([{ 
        room_id: CURRENT_ROOM_ID, 
        username: myUsername, 
        text: text,
        role: myRole // <--- KIRIM ROLE KE DATABASE
    }]);
    
    document.getElementById('chat-input').value = "";
}

// Fungsi Buka Tutup Drawer
function toggleGiftDrawer() {
    const drawer = document.getElementById('gift-drawer');
    const overlay = document.getElementById('drawer-overlay');
    drawer.classList.toggle('open');
    overlay.classList.toggle('show');
}

// Fungsi Kirim Gift dari Drawer
async function sendGift(icon, name, harga) {
    // 1. Ambil saldo koin terbaru dari database
    const { data: profile } = await sb.from('profiles').select('coins').eq('id', MY_USER_ID).single();
    
    if (profile.coins < harga) {
        toast("Koin lo gak cukup bro! Top up dulu gih.");
        return;
    }

    // 2. Potong Koin di Database
    const koinBaru = profile.coins - harga;
    const { error: updateError } = await sb.from('profiles')
        .update({ coins: koinBaru })
        .eq('id', MY_USER_ID);

    if (updateError) {
        toast("Gagal potong koin!");
        return;
    }

    // 3. Update tampilan koin di UI
    const coinLabel = document.getElementById('user-coins');
    if (coinLabel) coinLabel.innerText = koinBaru;

    // 4. Kirim notifikasi gift ke chat
    await sb.from('room_messages').insert([{ 
        username: "SISTEM_GIFT", 
        text: `✨ ${myUsername} mengirim ${icon} ${name.toUpperCase()}!` 
    }]);

    // 5. Efek Animasi & Tutup Drawer
    toggleGiftDrawer();
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.7 } });
}

function toggleSidebar() {
    // Cari elemennya
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    // Aktifkan atau Nonaktifkan
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

let selectedTargetId = null; // Menyimpan ID user yang dipilih untuk disawer
let selectedTargetName = ""; // Menyimpan Nama user yang dipilih

// 1. Fungsi Update Daftar Target di Drawer
async function updateGiftTargets() {
    const targetContainer = document.getElementById('gift-targets');
    if (!targetContainer) return;

    // Ambil semua user yang sedang duduk di room_slots
    const { data: slots, error } = await sb.from('room_slots')
        .select(`profile_id, profiles (username, avatar_url)`)
        .not('profile_id', 'is', null);

    targetContainer.innerHTML = "";

    if (error || slots.length === 0) {
        targetContainer.innerHTML = "<span style='font-size:12px; color:#555;'>Tidak ada orang di panggung</span>";
        return;
    }

    slots.forEach((slot, index) => {
        // (Opsional) Lewati jika itu diri sendiri agar tidak sawer diri sendiri
        // if (slot.profile_id === MY_USER_ID) return;

        const div = document.createElement('div');
        div.className = `target-user ${selectedTargetId === slot.profile_id ? 'selected' : ''}`;
        
        // Simpan target yang diklik
        div.onclick = () => {
            selectedTargetId = slot.profile_id;
            selectedTargetName = slot.profiles.username;
            updateGiftTargets(); // Refresh tampilan biar yang kepilih pindah highlight
        };

        div.innerHTML = `
            <img src="${slot.profiles.avatar_url || 'profile.png'}" class="target-avatar">
            <span class="target-name">${slot.profiles.username}</span>
        `;
        targetContainer.appendChild(div);

        // Auto-select target pertama jika belum ada yang dipilih
        if (!selectedTargetId && index === 0) {
            selectedTargetId = slot.profile_id;
            selectedTargetName = slot.profiles.username;
            div.classList.add('selected');
        }
    });
}

// 2. Fungsi Buka/Tutup Drawer (Sekaligus Refresh Target)
function toggleGiftDrawer() {
    const drawer = document.getElementById('gift-drawer');
    const overlay = document.getElementById('drawer-overlay');
    
    const isOpen = drawer.classList.toggle('open');
    overlay.classList.toggle('show');

    if (isOpen) {
        updateGiftTargets(); // Refresh list orang di panggung pas dibuka
    }
}

// 3. Fungsi Kirim Hadiah (Logic Koin + Target)
async function sendGift(icon, giftName, harga) {
    if (!selectedTargetId) return toast("Pilih target saweran dulu!");

    // Cek saldo koin di UI
    const coinDisplay = document.getElementById('user-coins');
    let saldoSkrg = parseInt(coinDisplay.innerText.replace(/,/g, ''));

    if (saldoSkrg < harga) return toast("Koin tidak cukup!");

    try {
        // Potong koin di Database (Tabel profiles kolom coins)
        const { error: updateError } = await sb.from('profiles')
            .update({ coins: saldoSkrg - harga })
            .eq('id', MY_USER_ID);

        if (updateError) throw updateError;

        // Update UI Koin
        coinDisplay.innerText = (saldoSkrg - harga).toLocaleString();

        // Kirim pesan Spesial ke Chat
        await sb.from('room_messages').insert([{ 
            username: "SISTEM_GIFT", 
            text: `✨ ${myUsername} mengirim ${icon} ${giftName.toUpperCase()} ke ${selectedTargetName}!` 
        }]);

        // Tutup & Animasi
        toggleGiftDrawer();
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.7 } });

    } catch (e) {
        console.error("Gagal kirim kado:", e.message);
        toast("Gagal mengirim hadiah.");
    }
}
// --- AUTO TURUN MIC SAAT TUTUP TAB/BROWSER ---
window.addEventListener('beforeunload', () => {
    if (MY_USER_ID && CURRENT_ROOM_ID) {
        // Kita pake format 'navigator.sendBeacon' atau update biasa
        // Tapi karena Supabase itu async, kita lakuin update simpel:
        const { error } = sb.from('room_slots')
            .update({ profile_id: null })
            .match({ room_id: CURRENT_ROOM_ID, profile_id: MY_USER_ID });
            
        // Catatan: beforeunload kadang terlalu cepat, 
        // tapi ini cara paling mending buat script client-side.
    }
});

async function ownerLogout() {
    if (!IS_OWNER) {
        // Kalau bukan owner cuma pindah halaman aja
        window.location.href = 'lobby.html';
        return;
    }

    const yakin = confirm("Tutup panggung dan keluar?");
    if (!yakin) return;

    try {
        // 1. Kosongkan SEMUA kursi di room ini (Usir semua orang dari panggung)
        await sb.from('room_slots')
            .update({ profile_id: null })
            .eq('room_id', CURRENT_ROOM_ID);

        // 2. Set room jadi non-aktif di database
        await sb.from('rooms')
            .update({ is_active: false })
            .eq('id', CURRENT_ROOM_ID);

        // 3. Kirim pesan terakhir ke chat
        await sb.from('room_messages').insert([{ 
            room_id: CURRENT_ROOM_ID, 
            username: "SISTEM", 
            text: "🚪 Room telah ditutup oleh Owner." 
        }]);

        // 4. Balik ke Lobby
        window.location.href = 'lobby.html';

    } catch (err) {
        console.error("Gagal tutup room:", err.message);
        window.location.href = 'lobby.html';
    }
}
// --- FUNGSI SETTING ROOM ---
async function openRoomSetting() {
    if (!IS_OWNER) return toast("Hanya Owner yang bisa akses setting!");
    
    // Ambil data room terbaru dari DB
    const { data, error } = await sb.from('rooms').select('name').eq('id', CURRENT_ROOM_ID).single();
    if (data) {
        document.getElementById('edit-room-name').value = data.name;
    }
    
    // Tutup sidebar dulu biar gak ganggu
    toggleSidebar();
    // Munculkan Modal
    document.getElementById('setting-modal').style.display = 'flex';
}

function closeRoomSetting() {
    document.getElementById('setting-modal').style.display = 'none';
}

async function saveRoomSetting() {
    const newName = document.getElementById('edit-room-name').value;
    const sysMsg = document.getElementById('system-message').value;

    if (!newName) return toast("Nama room tidak boleh kosong!");

    console.log("Attempting to update room:", CURRENT_ROOM_ID, "to", newName);

    try {
        // 1. Update Nama Room di Database
        const { data, error } = await sb.from('rooms')
            .update({ name: newName })
            .eq('id', CURRENT_ROOM_ID)
            .select();

        if (error) {
            console.error("Update Error:", error.message);
            throw error;
        }

        console.log("Update Success:", data);

        // 2. Kirim Pesan Sistem (Broadcast) kalau ada isinya
        if (sysMsg) {
            await sb.from('room_messages').insert([{ 
                room_id: CURRENT_ROOM_ID, 
                username: "SISTEM", 
                text: `📢 PENGUMUMAN: ${sysMsg}`,
                role: "admin"
            }]);
        }

        toast("Update Berhasil! Nama room sekarang: " + newName);
        
        // Refresh biar nama di Header & URL Sinkron
        const url = new URL(window.location);
        url.searchParams.set('name', newName);
        window.history.pushState({}, '', url); // Update URL tanpa reload total
        
        document.querySelector('.room-title').innerText = newName.toUpperCase();
        closeRoomSetting();

    } catch (e) {
        toast("Gagal simpan: " + e.message);
    }
}

// Tambahan fungsi logout yang tadi kita bahas
async function keluarRoom() {
    if (IS_OWNER) {
        try {
            await sb.from('room_slots').update({ profile_id: null }).eq('room_id', CURRENT_ROOM_ID);
            await sb.from('rooms').update({ is_active: false }).eq('id', CURRENT_ROOM_ID);
        } catch (e) { console.error(e); }
    }
    window.location.href = 'lobby.html';
}

// 4. Pastikan Tombol Setting Muncul buat Owner
// Update bagian checkUser() lo:
if (IS_OWNER) {
    const settingMenu = document.getElementById('menu-setting');
    if (settingMenu) settingMenu.style.display = 'flex';
}


// Fix buat Chrome Mobile Address Bar
function fixMobileHeight() {
    let vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
}

window.addEventListener('resize', fixMobileHeight);
fixMobileHeight();

// --- JALANKAN ---
initApp();

 