// Ambil Parameter dari URL
const urlParams = new URLSearchParams(window.location.search);
const CURRENT_ROOM_ID = urlParams.get('id'); // Ini kunci biar gak ketukar!
const CURRENT_ROOM_NAME = urlParams.get('name') || "Voice Room";

let IS_OWNER = false; 
let myRole = "user"; 

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
                identity: MY_USER_ID 
            })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error);

        room = new LivekitClient.Room({
            adaptiveStream: true,
            dynacast: true,
            audioCaptureDefaults: {
                echoCancellation: true,
                noiseSuppression: true,
            }
        });

        // --- FIX EFEK GLOW (SYNC ALL USERS) ---
        room.on(LivekitClient.RoomEvent.ActiveSpeakersChanged, (speakers) => {
            document.querySelectorAll('.avatar').forEach(el => el.classList.remove('speaking'));
            
            speakers.forEach((s) => {
                // Cari elemen berdasarkan identity (UUID) ATAU Username
                let el = document.querySelector(`[data-user-id="${s.identity}"]`) || 
                         document.querySelector(`[data-username="${s.identity}"]`) ||
                         document.querySelector(`[data-username="${s.name}"]`);
                
                if (!el && s.isLocal) {
                    el = document.querySelector(`[data-user-id="${MY_USER_ID}"]`);
                }

                if (el) {
                    el.classList.add('speaking');
                    console.log("🔥 Glow ON untuk:", s.identity || s.name);
                }
            });
        });

        room.on(LivekitClient.RoomEvent.TrackSubscribed, (track) => {
            if (track.kind === "audio") {
                const element = track.attach(); 
                document.body.appendChild(element); 
            }
        });

        await room.connect(LIVEKIT_URL, data.token);
        console.log("✅ BERHASIL KONEK! Identity Anda di LiveKit adalah:", room.localParticipant.identity);
        await room.localParticipant.setMicrophoneEnabled(false);

    } catch (e) {
        console.error("❌ Gagal di LiveKit:", e.message);
    }
}

async function fetchStage() {
    if (!CURRENT_ROOM_ID || CURRENT_ROOM_ID === "null") return;

    console.log("📡 Mengambil data panggung & badge...");
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
            const canKick = IS_OWNER && !isMe;

            // FIX: Tambahin data-username biar LiveKit glow bisa deteksi dengan gampang
            item.innerHTML = `
                <div class="avatar ${isMe ? 'active' : ''}" 
                     data-user-id="${slot.profile_id}" 
                     data-username="${user.username}"
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

async function naikKeStage(index) {
    console.log("🎯 Mencoba pindah ke slot:", index);
    if (!MY_USER_ID) return toast("Login dulu Bree!");

    try {
        const { error: clearErr } = await sb.from('room_slots')
            .update({ profile_id: null })
            .eq('profile_id', MY_USER_ID);

        if (clearErr) console.warn("Sedang membersihkan slot lama...", clearErr.message);

        await new Promise(resolve => setTimeout(resolve, 300));

        const { data, error } = await sb.from('room_slots')
            .update({ profile_id: MY_USER_ID })
            .match({ room_id: CURRENT_ROOM_ID, slot_index: index })
            .select();

        if (error) {
            if (error.message.includes("permission denied")) {
                toast("Database masih kegembok! Pastiin SQL 'panggung_full_bypass' udah lo RUN.");
                return;
            }
            throw error;
        }

        console.log("✅ BERHASIL PINDAH KURSI!");
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
    } else {
        console.error("❌ Gagal turun:", error.message);
    }
}

function toggleKickBtn(el, canKick) {
    if (!canKick) return;

    const wrapper = el.querySelector('.kick-btn-wrapper');
    document.querySelectorAll('.kick-btn-wrapper').forEach(w => {
        if (w !== wrapper) w.style.display = 'none';
    });

    if (wrapper.style.display === 'none') {
        wrapper.style.display = 'flex';
    } else {
        wrapper.style.display = 'none';
    }
}

async function kickUser(targetId, targetName) {
    if (!confirm(`Kick ${targetName} dari panggung?`)) return;

    try {
        const { error } = await sb.from('room_slots')
            .update({ profile_id: null })
            .match({ room_id: CURRENT_ROOM_ID, profile_id: targetId });

        if (error) throw error;

        await sb.from('room_messages').insert([{ 
            room_id: CURRENT_ROOM_ID, 
            username: "SISTEM", 
            text: `🚫 ${targetName} telah ditendang dari panggung oleh Owner.` 
        }]);

    } catch (err) {
        toast("Gagal kick: " + err.message);
    }
}

async function checkUser() {
    const { data: { session } } = await sb.auth.getSession();
    
    if (session) {
        MY_USER_ID = session.user.id;
        console.log("🆔 My ID terdeteksi:", MY_USER_ID);

        const [profileRes, roomRes] = await Promise.all([
            sb.from('profiles').select('*').eq('id', MY_USER_ID).maybeSingle(),
            sb.from('rooms').select('owner_id, is_active').eq('id', CURRENT_ROOM_ID).maybeSingle()
        ]);

        if (profileRes.data) {
            myUsername = profileRes.data.username;
            myRole = profileRes.data.role || "user"; 
            
            const sideName = document.getElementById('sidebar-username');
            if (sideName) sideName.innerText = myUsername;
            
            const sideAvatar = document.getElementById('sidebar-avatar');
            if (sideAvatar) {
                sideAvatar.src = profileRes.data.avatar_url || 'profile.png';
            }

            const coinLabel = document.getElementById('user-coins');
            if (coinLabel) coinLabel.innerText = (profileRes.data.coins || 0).toLocaleString();
        }

        if (roomRes.data && roomRes.data.owner_id === MY_USER_ID) {
            IS_OWNER = true;
            console.log("👑 KONFIRMASI: LO ADALAH OWNER!");

            const setBtn = document.getElementById('menu-setting');
            if (setBtn) setBtn.style.display = 'flex'; 

            await sb.from('rooms').update({ is_active: true }).eq('id', CURRENT_ROOM_ID);
        } else {
            IS_OWNER = false;
            const setBtn = document.getElementById('menu-setting');
            if (setBtn) setBtn.style.display = 'none';
        }
        
        fetchStage(); 
    } else {
        console.warn("⚠️ User tidak login.");
    }
}

async function keluarRoom() {
    if (IS_OWNER) {
        const yakin = confirm("Tutup panggung sementara dan keluar?");
        if (!yakin) return;

        try {
            await sb.from('room_slots').update({ profile_id: null }).eq('room_id', CURRENT_ROOM_ID);
            await sb.from('rooms').update({ is_active: false }).eq('id', CURRENT_ROOM_ID);
            console.log("🚪 Room dinonaktifkan.");
        } catch (e) {
            console.error("Gagal tutup room:", e.message);
        }
    }
    window.location.href = 'lobby.html';
}

async function mintaNaik() {
    console.log("🖱️ Tombol NAIK MIC diklik");
    const { data: allSlots } = await sb.from('room_slots').select('slot_index, profile_id').order('slot_index', { ascending: true });
    
    const slotKosong = allSlots.find(s => !s.profile_id);
    if (slotKosong) {
        naikKeStage(slotKosong.slot_index);
    } else {
        toast("Panggung penuh!");
    }
}

function listenRealtime() {
    if (!CURRENT_ROOM_ID || !MY_USER_ID) return console.error("❌ ID Room atau User ID tidak ditemukan!");

    const roomChannel = sb.channel(`room_active_${CURRENT_ROOM_ID}`, {
        config: { presence: { key: MY_USER_ID } },
    });

    roomChannel.on('presence', { event: 'leave' }, async ({ leftPresences }) => {
        for (const p of leftPresences) {
            console.log("👋 Cleaning up user offline:", p.key);
            const { error } = await sb.from('room_slots')
                .update({ profile_id: null })
                .match({ profile_id: p.key });
            if (error) console.error("❌ Gagal cleanup:", error.message);
        }
    });

    roomChannel.on('postgres_changes', { 
        event: '*', schema: 'public', table: 'room_slots', filter: `room_id=eq.${CURRENT_ROOM_ID}` 
    }, () => fetchStage());

    roomChannel.on('postgres_changes', { 
        event: 'INSERT', schema: 'public', table: 'room_messages', filter: `room_id=eq.${CURRENT_ROOM_ID}` 
    }, (p) => {
        const chatBox = document.getElementById('chat-box');
        if (!chatBox) return;

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
        
        // Cek jika ini adalah pesan gift untuk memunculkan efek lokal
        if (p.new.username === "SISTEM_GIFT" && typeof confetti !== 'undefined') {
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        }
    });

    roomChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
            console.log("✅ Terhubung ke Realtime Room!");
            await roomChannel.track({ online_at: new Date().toISOString(), username: myUsername });
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
        role: myRole 
    }]);
    
    document.getElementById('chat-input').value = "";
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

// --- LOGIKA KIRIM GIFT ---
let selectedTargetId = null; 
let selectedTargetName = ""; 

async function updateGiftTargets() {
    const targetContainer = document.getElementById('gift-targets');
    if (!targetContainer) return;

    const { data: slots, error } = await sb.from('room_slots')
        .select(`profile_id, profiles (username, avatar_url)`)
        .not('profile_id', 'is', null);

    targetContainer.innerHTML = "";

    if (error || slots.length === 0) {
        targetContainer.innerHTML = "<span style='font-size:12px; color:#555;'>Tidak ada orang di panggung</span>";
        return;
    }

    slots.forEach((slot, index) => {
        const div = document.createElement('div');
        div.className = `target-user ${selectedTargetId === slot.profile_id ? 'selected' : ''}`;
        
        div.onclick = () => {
            selectedTargetId = slot.profile_id;
            selectedTargetName = slot.profiles.username;
            updateGiftTargets(); 
        };

        div.innerHTML = `
            <img src="${slot.profiles.avatar_url || 'profile.png'}" class="target-avatar">
            <span class="target-name">${slot.profiles.username}</span>
        `;
        targetContainer.appendChild(div);

        if (!selectedTargetId && index === 0) {
            selectedTargetId = slot.profile_id;
            selectedTargetName = slot.profiles.username;
            div.classList.add('selected');
        }
    });
}

function toggleGiftDrawer() {
    const drawer = document.getElementById('gift-drawer');
    const overlay = document.getElementById('drawer-overlay');
    
    const isOpen = drawer.classList.toggle('open');
    overlay.classList.toggle('show');

    if (isOpen) {
        updateGiftTargets(); 
    }
}

async function sendGift(icon, giftName, harga) {
    if (!selectedTargetId) return toast("Pilih target saweran dulu!");

    const coinDisplay = document.getElementById('user-coins');
    let saldoSkrg = parseInt(coinDisplay.innerText.replace(/,/g, ''));

    if (saldoSkrg < harga) return toast("Koin tidak cukup!");

    try {
        const { error: updateError } = await sb.from('profiles')
            .update({ coins: saldoSkrg - harga })
            .eq('id', MY_USER_ID);

        if (updateError) throw updateError;

        coinDisplay.innerText = (saldoSkrg - harga).toLocaleString();

        await sb.from('room_messages').insert([{ 
            room_id: CURRENT_ROOM_ID,
            username: "SISTEM_GIFT", 
            text: `✨ ${myUsername} mengirim ${icon} ${giftName.toUpperCase()} ke ${selectedTargetName}!` 
        }]);

        toggleGiftDrawer();

    } catch (e) {
        console.error("Gagal kirim kado:", e.message);
        toast("Gagal mengirim hadiah.");
    }
}

window.addEventListener('beforeunload', () => {
    if (MY_USER_ID && CURRENT_ROOM_ID) {
        sb.from('room_slots').update({ profile_id: null }).match({ room_id: CURRENT_ROOM_ID, profile_id: MY_USER_ID });
    }
});

async function openRoomSetting() {
    if (!IS_OWNER) return toast("Hanya Owner yang bisa akses setting!");
    
    const { data, error } = await sb.from('rooms').select('name').eq('id', CURRENT_ROOM_ID).single();
    if (data) {
        document.getElementById('edit-room-name').value = data.name;
    }
    
    toggleSidebar();
    document.getElementById('setting-modal').style.display = 'flex';
}

function closeRoomSetting() {
    document.getElementById('setting-modal').style.display = 'none';
}

async function saveRoomSetting() {
    const newName = document.getElementById('edit-room-name').value;
    const sysMsg = document.getElementById('system-message').value;

    if (!newName) return toast("Nama room tidak boleh kosong!");

    try {
        const { data, error } = await sb.from('rooms').update({ name: newName }).eq('id', CURRENT_ROOM_ID).select();
        if (error) throw error;

        if (sysMsg) {
            await sb.from('room_messages').insert([{ 
                room_id: CURRENT_ROOM_ID, 
                username: "SISTEM", 
                text: `📢 PENGUMUMAN: ${sysMsg}`,
                role: "admin"
            }]);
        }

        toast("Update Berhasil! Nama room sekarang: " + newName);
        
        const url = new URL(window.location);
        url.searchParams.set('name', newName);
        window.history.pushState({}, '', url); 
        
        document.querySelector('.room-title').innerText = newName.toUpperCase();
        closeRoomSetting();

    } catch (e) {
        toast("Gagal simpan: " + e.message);
    }
}

function fixMobileHeight() {
    let vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
}

window.addEventListener('resize', fixMobileHeight);
fixMobileHeight();

// --- JALANKAN ---
initApp();
