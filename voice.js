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

// --- 4. LOGIKA SUARA (AUTO-TOKEN + DETECTION) ---
async function initLiveKit() {
    if (typeof LivekitClient === 'undefined') return console.error("❌ SDK LiveKit Hilang!");

    try {
        console.log("⏳ Mengambil token untuk:", myUsername);
        const response = await fetch(`${supabaseUrl}/functions/v1/get-livekit-token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            },
            body: JSON.stringify({ username: myUsername })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error);

        room = new LivekitClient.Room({ adaptiveStream: true, dynacast: true });

        // Event: Glow pas ngomong
        room.on(LivekitClient.RoomEvent.ActiveSpeakersChanged, (speakers) => {
            document.querySelectorAll('.avatar').forEach(el => el.classList.remove('speaking'));
            speakers.forEach((s) => {
                const el = document.querySelector(`[data-user-id="${s.identity}"]`);
                if (el) el.classList.add('speaking');
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
        console.log("✅ LIVEKIT CONNECTED!");
        await room.localParticipant.setMicrophoneEnabled(false);

    } catch (e) {
        console.error("❌ Gagal di LiveKit:", e.message);
    }
}

// --- 5. LOGIKA PANGGUNG (RENDER) ---
async function fetchStage() {
    const { data, error } = await sb.from('room_slots')
        .select(`slot_index, profile_id, profiles (username, avatar_url)`)
        .order('slot_index', { ascending: true });
    
    if (error) return console.error("Gagal fetch stage:", error.message);
    renderStage(data || []);
}

function renderStage(slots) {
    const grid = document.getElementById('stage-grid');
    if (!grid) return;
    grid.innerHTML = "";

    for (let i = 0; i < 6; i++) {
        const slotData = slots.find(s => s.slot_index === i);
        const user = slotData?.profiles;
        const isMe = slotData?.profile_id === MY_USER_ID;

        const item = document.createElement('div');
        item.className = 'speaker-item';
        
        if (slotData && slotData.profile_id) {
            item.innerHTML = `
                <div class="avatar ${isMe ? 'active' : ''}" 
                     data-user-id="${user?.username || 'User'}" 
                     onclick="${isMe ? 'turunMic('+i+')' : ''}">
                    <img src="${user?.avatar_url || 'https://via.placeholder.com/80'}" onerror="this.src='https://via.placeholder.com/80'">
                </div>
                <span class="name-label">${user?.username || 'User'} ${isMe ? '<b>(ME)</b>' : ''}</span>
            `;
        } else {
            item.innerHTML = `
                <div class="avatar" onclick="naikKeStage(${i})">
                    <span class="plus-sign">+</span>
                </div>
                <span class="name-label">KOSONG</span>
            `;
        }
        grid.appendChild(item);
    }
}

// --- 6. AKSI NAIK/TURUN (ANTI-MACET) ---
async function naikKeStage(index) {
    console.log("🎯 Mencoba naik ke slot:", index);
    if (!MY_USER_ID) return alert("Login dulu!");

    // Bersihkan dulu ID gue kalau nggak sengaja nyangkut di tempat lain
    await sb.from('room_slots').update({ profile_id: null }).eq('profile_id', MY_USER_ID);

    // Duduki kursi baru
    const { error } = await sb.from('room_slots').update({ profile_id: MY_USER_ID }).eq('slot_index', index);
    
    if (!error) {
        console.log("✅ Berhasil update database stage");
        if (room && room.state === "connected") {
            await room.localParticipant.setMicrophoneEnabled(true);
            console.log("🎤 Mic diaktifkan!");
        }
    } else {
        console.error("❌ Gagal update stage:", error.message);
        alert("Gagal naik stage!");
    }
}

async function turunMic(index) {
    if (!confirm("Turun dari panggung?")) return;
    const { error } = await sb.from('room_slots').update({ profile_id: null }).eq('profile_id', MY_USER_ID);
    if (!error && room) {
        await room.localParticipant.setMicrophoneEnabled(false);
        console.log("🔇 Mic dimatikan.");
    }
}

async function mintaNaik() {
    console.log("🖱️ Tombol NAIK MIC diklik");
    const { data: allSlots } = await sb.from('room_slots').select('slot_index, profile_id').order('slot_index', { ascending: true });
    
    // Cari slot yang beneran kosong
    const slotKosong = allSlots.find(s => !s.profile_id);
    if (slotKosong) {
        naikKeStage(slotKosong.slot_index);
    } else {
        alert("Panggung penuh!");
    }
}

// --- 7. REALTIME & CHAT ---
function listenRealtime() {
    sb.channel('panggung').on('postgres_changes', { event: '*', schema: 'public', table: 'room_slots' }, () => {
        console.log("🔄 Stage berubah, me-render ulang...");
        fetchStage();
    }).subscribe();

    sb.channel('chat').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'room_messages' }, (p) => {
        const chatBox = document.getElementById('chat-box');
        if (!chatBox) return;
        const div = document.createElement('div');
        div.className = 'msg';
        div.innerHTML = `<span class="user">${p.new.username}:</span> ${p.new.text}`;
        chatBox.appendChild(div);
        chatBox.scrollTop = chatBox.scrollHeight;
    }).subscribe();
}

async function kirimKomentar() {
    const input = document.getElementById('chat-input');
    if (!input || !input.value.trim()) return;
    await sb.from('room_messages').insert([{ username: myUsername, text: input.value }]);
    input.value = "";
}

// --- 8. AUTH ---
async function checkUser() {
    // 1. Ambil sesi login aktif dari Supabase Auth
    const { data: { session }, error: sessionError } = await sb.auth.getSession();

    if (sessionError || !session) {
        console.log("⚠️ User belum login di Supabase Auth.");
        // Opsional: Kalau mau dipaksa login atau biarin aja buat visitor
        return;
    }

    // 2. Kalau ada session, ambil User ID (UUID)-nya otomatis
    MY_USER_ID = session.user.id;
    localStorage.setItem('hype_user_id', MY_USER_ID);

    // 3. Ambil username dari tabel profiles berdasarkan ID tadi
    const { data: profile } = await sb
        .from('profiles')
        .select('username')
        .eq('id', MY_USER_ID)
        .single();

    if (profile) {
        myUsername = profile.username;
    } else {
        myUsername = session.user.email.split('@')[0]; // Cadangan: pake email depannya
    }

    console.log("✅ Login Otomatis Berhasil:", myUsername, "| ID:", MY_USER_ID);
}

// --- JALANKAN ---
initApp();
