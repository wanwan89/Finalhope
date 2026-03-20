async function handleWithdraw() {
    const amountInput = document.getElementById('wdAmount');
    const methodInput = document.getElementById('wdMethod');
    const accountNameInput = document.getElementById('wdAccountName');
    const accountInput = document.getElementById('wdAccount');
    const btn = document.getElementById('btnSubmit');

    const amount = parseInt(amountInput?.value || "0");
    const method = methodInput?.value;
    const accountName = accountNameInput?.value?.trim();
    const account = accountInput?.value?.trim();

    // Gunakan showToast yang ada di file JS lu
    if (!amount || amount < 200) {
        showToast("Gagal", "Minimal penarikan adalah 200 koin!", "warning");
        return;
    }
    if (!accountName || !account) {
        showToast("Data Kosong", "Mohon lengkapi data rekening tujuan.", "warning");
        return;
    }

    btn.disabled = true;
    btn.textContent = "Processing...";

    try {
        const { data: { user }, error: authError } = await db.auth.getUser();
        if (authError || !user) throw new Error("Silahkan login terlebih dahulu.");

        // 1. CEK SALDO
        const { data: profile, error: pError } = await db
            .from('profiles')
            .select('coins')
            .eq('id', user.id)
            .single();

        if (pError) throw new Error("Gagal mengambil data saldo.");
        if (profile.coins < amount) {
            throw new Error(`Koin tidak cukup! Saldo kamu: ${profile.coins} koin.`);
        }

        // 2. POTONG KOIN
        const { error: updateError } = await db
            .from('profiles')
            .update({ coins: profile.coins - amount })
            .eq('id', user.id);

        if (updateError) throw new Error("Gagal memotong saldo koin.");

        // 3. SIMPAN REQUEST WD
        const { error: insertError } = await db
            .from('withdraw_requests')
            .insert([{
                user_id: user.id,
                amount: amount,
                method: method,
                account_name: accountName,
                account_number: account,
                status: 'pending'
            }]);

        if (insertError) {
            // Rollback koin jika gagal simpan request
            await db.from('profiles').update({ coins: profile.coins }).eq('id', user.id);
            throw new Error("Gagal menyimpan permintaan penarikan: " + insertError.message);
        }

        // 4. INSERT NOTIFIKASI (Hanya Sekali & Tanpa Redeklarasi)
        const estimasiRpValue = (amount * 70).toLocaleString('id-ID');
        
        await db.from('notifications').insert([{
            user_id: user.id,
            type: 'withdraw',
            message: `Penarikan <b>${amount}</b> koin (Rp ${estimasiRpValue}) sedang diproses admin.`,
            is_read: false,
            created_at: new Date().toISOString()
        }]);

        showToast("Berhasil", "Permintaan terkirim!", "success");

        setTimeout(() => {
            window.location.href = 'saldo.html';
        }, 2500);

    } catch (err) {
        console.error("WD Error:", err);
        // Pake alert karena lu di HP, biar keliatan error aslinya apa
        alert("Terjadi Kesalahan: " + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = "Confirm Request";
    }
}
