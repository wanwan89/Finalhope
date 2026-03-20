/**
 * HOPEHYPE WALLET LOGIC
 * Mengatur tampilan saldo, konversi IDR, dan tombol Withdraw
 */

// 1. Cek koneksi Supabase agar tidak bentrok
if (typeof window.supabaseClient === 'undefined') {
    const supabaseUrl = 'https://hqetnqnvmdxdgfnnluew.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZXRucW52bWR4ZGdmbm5sdWV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MzUyODIsImV4cCI6MjA4NzMxMTI4Mn0.Cr9lDBZMqfeONi1dfyFzHpBtawBzZTQLBEWKmPJVAOA';
    window.supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
}

const IDR_RATE = 70; // 1 Koin = Rp 150

async function initWallet() {
    try {
        const { data: { user }, error: authError } = await window.supabaseClient.auth.getUser();
        
        if (authError || !user) {
            console.log("User tidak terdeteksi. Silahkan login.");
            return;
        }

        // Ambil data koin
        const { data: profile, error: profileError } = await window.supabaseClient
            .from('profiles')
            .select('id, coins')
            .eq('id', user.id)
            .single();

        if (profileError) throw profileError;

        // Tampilkan ke UI
        updateWalletUI(profile.coins || 0);
        fetchLastTransaction(user.id);
        
        // Aktifkan update otomatis (Realtime)
        subscribeToCoinChanges(user.id);

    } catch (err) {
        console.error("Wallet Error:", err.message);
    }
}

// Fungsi Update Angka di Layar
function updateWalletUI(coins) {
    const coinElement = document.getElementById('coinDisplay');
    const idrElement = document.getElementById('idrDisplay');

    if (coinElement) {
        coinElement.innerText = coins.toLocaleString('id-ID');
    }

    if (idrElement) {
        const totalIDR = coins * IDR_RATE;
        idrElement.innerText = totalIDR.toLocaleString('id-ID', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }
}

// Fungsi Ambil Riwayat Terakhir
async function fetchLastTransaction(userId) {
    const lastTrxElement = document.getElementById('lastTrx');
    if (!lastTrxElement) return;

    const { data: lastTrx } = await window.supabaseClient
        .from('gift_transactions')
        .select('amount')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (lastTrx) {
        lastTrxElement.innerText = `Terakhir: ${lastTrx.amount} Koin`;
    }
}

// Fungsi Realtime
function subscribeToCoinChanges(userId) {
    window.supabaseClient
        .channel('public:profiles_wallet')
        .on('postgres_changes', { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'profiles', 
            filter: `id=eq.${userId}` 
        }, (payload) => {
            updateWalletUI(payload.new.coins);
        })
        .subscribe();
}

/**
 * FUNGSI TOMBOL WITHDRAW
 * Ini yang bikin tombolnya bisa diklik dan pindah halaman
 */
function openWithdrawModal() {
    console.log("Mengarahkan ke halaman withdraw...");
    window.location.href = 'penarikan.html';
}

// Jalankan saat halaman siap
document.addEventListener('DOMContentLoaded', initWallet);
