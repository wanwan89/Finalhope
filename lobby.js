// Ganti dengan API Key lo Bree
const supabaseUrl = 'https://hqetnqnvmdxdgfnnluew.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZXRucW52bWR4ZGdmbm5sdWV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MzUyODIsImV4cCI6MjA4NzMxMTI4Mn0.Cr9lDBZMqfeONi1dfyFzHpBtawBzZTQLBEWKmPJVAOA';
const sb = supabase.createClient(supabaseUrl, supabaseKey);

async function initLobby() {
    await loadUserProfile();
    await loadRooms();
}

// 1. Taruh di baris paling atas lobby.js (di luar fungsi)
let MY_USER_ID = null; 

// 2. Update fungsi loadUserProfile lo
async function loadUserProfile() {
    const { data: { session } } = await sb.auth.getSession();
    
    if (session && session.user) {
        // --- KUNCI KEMENANGAN ---
        MY_USER_ID = session.user.id; 
        // -----------------------

        const { data: profile } = await sb.from('profiles')
            .select('username, avatar_url, coins')
            .eq('id', MY_USER_ID)
            .single();

        if (profile) {
            document.getElementById('lobby-username').innerText = profile.username;
            document.getElementById('lobby-coins').innerText = (profile.coins || 0).toLocaleString();
            
            // Update Avatar kalau ada
            if (profile.avatar_url) {
                document.getElementById('lobby-avatar').src = profile.avatar_url;
            }
        }
        
        console.log("✅ Session Aktif untuk ID:", MY_USER_ID);
    } else {
        console.warn("⚠️ Kamu belum login, Bree. Fitur buat room bakal macet.");
    }
}

async function loadRooms() {
    const list = document.getElementById('room-list');
    
    // Ambil data room
    const { data: rooms, error } = await sb.from('rooms').select('*');

    if (error) return list.innerHTML = "Gagal memuat room.";

    list.innerHTML = "";

    // Kita pake for...of supaya bisa pake await di dalemnya
    for (const room of rooms) {
        // --- LOGIKA HITUNG USER ONLINE ---
        // Kita hitung jumlah slot yang profile_id-nya tidak NULL untuk room ini
        const { count, error: countError } = await sb
            .from('room_slots')
            .select('*', { count: 'exact', head: true })
            .eq('room_id', room.id)
            .not('profile_id', 'is', null);

        const onlineCount = count || 0; // Kalau null jadi 0

        const card = document.createElement('div');
        card.className = 'room-card';
        card.onclick = () => window.location.href = `voice.html?id=${room.id}&name=${encodeURIComponent(room.name)}`;
        
        card.innerHTML = `
            <div class="room-thumb">
                <span class="material-icons">graphic_eq</span>
            </div>
            <div class="room-info">
                <h4>${room.name.toUpperCase()}</h4>
                <p>${room.description || 'Ayo nyanyi bareng di panggung ini!'}</p>
            </div>
            <div class="room-status">
                <div class="online-pill">🔥 ${onlineCount} Online</div>
            </div>
        `;
        list.appendChild(card);
    }
}

// Buka Modal
function createRoom() {
    document.getElementById('modal-create').style.display = 'flex';
}

// Tutup Modal
function closeModal() {
    document.getElementById('modal-create').style.display = 'none';
}

async function confirmCreateRoom() {
    const name = document.getElementById('new-room-name').value;
    const desc = document.getElementById('new-room-desc').value;

    if (!name) return toast("Nama panggung wajib diisi!");

    // Ambil session user yang lagi login SEKARANG
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return toast("Login dulu bree!");

    const currentUserID = session.user.id;

    try {
        // 1. Buat Room
        const { data: newRoom, error: roomError } = await sb.from('rooms').insert([
            { name: name, description: desc, owner_id: currentUserID }
        ]).select();

        if (roomError) throw roomError;

        const roomId = newRoom[0].id;

        // 2. Buat 6 kursi panggung otomatis untuk Room ini
        const slots = [];
        for (let i = 0; i < 6; i++) {
            slots.push({ 
                room_id: roomId, 
                slot_index: i, 
                profile_id: null 
            });
        }
        
        const { error: slotError } = await sb.from('room_slots').insert(slots);
        if (slotError) throw slotError;

        closeModal();
        window.location.href = `voice.html?id=${roomId}&name=${encodeURIComponent(name)}`;

    } catch (e) {
        console.error(e);
        toast("Gagal: " + e.message);
    }
}
// Fungsi baru untuk tombol "MULAI NYANYI"
async function handleStartSinging() {
    if (!MY_USER_ID) return toast("Login dulu Bree!");

    console.log("🔍 Mengecek apakah lo udah punya panggung...");

    // 1. Cek di tabel 'rooms' apakah owner_id adalah MY_USER_ID
    const { data: existingRoom, error } = await sb.from('rooms')
        .select('id, name')
        .eq('owner_id', MY_USER_ID)
        .single(); // Ambil satu aja

    if (existingRoom) {
        // 2. Kalau ada, langsung gas ke room sendiri
        console.log("🚀 Lo udah punya room, meluncur...");
        window.location.href = `voice.html?id=${existingRoom.id}&name=${encodeURIComponent(existingRoom.name)}`;
    } else {
        // 3. Kalau belum ada, baru buka modal buat bikin
        createRoom();
    }
}

async function confirmCreateRoom() {
    const name = document.getElementById('new-room-name').value;
    const desc = document.getElementById('new-room-desc').value;
    const category = document.getElementById('new-room-category').value;

    if (!name) {
        // Pake Toast lo yang baru
        return toast("Waduh", "Kasih nama panggung dulu dong, Bree!", "warning");
    }

    try {
        const { data, error } = await sb.from('rooms').insert([{
            name: name,
            description: desc,
            category: category,
            owner_id: MY_USER_ID,
            is_active: true
        }]).select().single();

        if (error) throw error;

        toast("Berhasil", `Panggung ${category} lo udah siap!`, "success");

        // Delay dikit biar Toast-nya kelihatan
        setTimeout(() => {
            window.location.href = `voice.html?id=${data.id}&name=${encodeURIComponent(data.name)}`;
        }, 1200);

    } catch (e) {
        console.error(e);
        toast("Error", "Gagal bikin panggung nih.", "error");
    }
}

initLobby();
