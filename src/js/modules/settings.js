// const { ipcRenderer } = require('electron');

// ICON LIBRARY
const iconLibrary = {
    bell: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>',
    moon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>',
    coffee: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 8h-2.13A4.001 4.001 0 0014 5H6a4 4 0 00-3.87 3H2v2h.13A4.001 4.001 0 006 13h8a4 4 0 003.87-3H20V8zm-6 2H6a2 2 0 010-4h8a2 2 0 010 4z M4 15h12v2H4z"></path>',
    code: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>',
    game: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 11V9a2 2 0 00-2-2H7a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2zM15 11h.01M17 9h.01M15 13h.01"></path>'
};

// CUSTOM MODES (NOTIFIKASI)
window.renderCustomModes = function(modes) {
    const container = document.getElementById('custom-modes-container');
    if(!container) return; 
    container.innerHTML = ""; 
    if(modes.length === 0) {
        container.innerHTML = `<div class="text-center py-8 text-gray-500 border border-dashed border-[#3f3f46] rounded-2xl text-sm">Belum ada pengingat kustom.<br>Klik "Buat Baru" di atas!</div>`;
        return;
    }
    modes.forEach(mode => {
        const svgPath = iconLibrary[mode.icon] || iconLibrary['bell'];
        const descText = mode.scheduleType === 'time' ? `Mengingatkan pukul ${mode.timeValue}` : `Berulang tiap ${mode.interval} Menit`;
        container.innerHTML += `
        <div class="flex items-center justify-between bg-[#27272a] p-4 rounded-2xl border border-[#3f3f46] group hover:border-[${mode.color}]/50 transition duration-300">
            <div class="flex items-center gap-4">
                <div class="bg-[#3f3f46] p-3 rounded-xl" style="color: ${mode.color}">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">${svgPath}</svg>
                </div>
                <div>
                    <h4 class="font-semibold text-gray-100">${mode.name}</h4>
                    <p class="text-xs text-gray-400">${descText}</p>
                </div>
            </div>
            <div class="flex gap-2">
                <button onclick="changeAnimation(${mode.id})" class="text-xs font-medium bg-[#3f3f46] hover:bg-white hover:text-black px-4 py-2.5 rounded-lg transition shadow-sm">Ubah Face</button>
                <button onclick="deleteMode(${mode.id})" class="text-xs font-medium hover:bg-red-500/20 text-red-400 hover:text-red-300 px-3 py-2.5 rounded-lg transition">Hapus</button>
            </div>
        </div>`;
    });
}

window.toggleTimeInput = function() {
    const type = document.getElementById('new-mode-type').value;
    if(type === 'interval') {
        document.getElementById('input-group-interval').classList.remove('hidden');
        document.getElementById('input-group-time').classList.add('hidden');
    } else {
        document.getElementById('input-group-interval').classList.add('hidden');
        document.getElementById('input-group-time').classList.remove('hidden');
    }
}

window.openModal = function() {
    document.getElementById('modal-create').classList.remove('opacity-0', 'pointer-events-none');
    document.getElementById('modal-content').classList.remove('scale-95');
}

window.closeModal = function() {
    document.getElementById('modal-create').classList.add('opacity-0', 'pointer-events-none');
    document.getElementById('modal-content').classList.add('scale-95');
    document.getElementById('new-mode-name').value = "";
    document.getElementById('new-mode-interval').value = "";
    document.getElementById('new-mode-time').value = "";
}

window.submitNewMode = function() {
    const name = document.getElementById('new-mode-name').value;
    const type = document.getElementById('new-mode-type').value;
    const interval = document.getElementById('new-mode-interval').value;
    const timeVal = document.getElementById('new-mode-time').value;
    const color = document.getElementById('new-mode-color').value;
    const icon = document.getElementById('new-mode-icon').value;

    if(!name) { if(window.showToast) window.showToast("Isi nama notifikasinya bos!", "error"); return; }
    if(type === 'interval' && !interval) { if(window.showToast) window.showToast("Isi menitnya bos!", "error"); return; }
    if(type === 'time' && !timeVal) { if(window.showToast) window.showToast("Pilih jamnya bos!", "error"); return; }

    ipcRenderer.send('add-custom-mode', {
        id: Date.now(), name: name, scheduleType: type, interval: parseInt(interval) || 0,
        timeValue: timeVal || "", icon: icon, color: color, path: "" 
    });

    window.closeModal();
    if(window.showToast) window.showToast("Pengingat baru berhasil dibuat!");
}

window.deleteMode = function(id) {
    if(window.showConfirm) {
        window.showConfirm("Hapus Pengingat?", "Tindakan ini tidak dapat dibatalkan.", "Hapus", "danger", () => {
            ipcRenderer.send('delete-custom-mode', id);
            if(window.showToast) window.showToast("Pengingat berhasil dihapus.");
        });
    }
}

// UBAH & RESET ANIMASI FACE
window.changeAnimation = function(type) { ipcRenderer.send('open-file-dialog', type); }
window.resetAnimation = function(type) { 
    if(window.showConfirm) {
        window.showConfirm("Reset Animasi Face?", "Kembalikan animasi wajah ke Tabbie CSS Default?", "Ya, Reset", "warning", () => {
            ipcRenderer.send('reset-file', type);
        });
    }
}

ipcRenderer.on('file-selected', () => { if(window.showToast) window.showToast("Face animasi berhasil diperbarui!"); });
ipcRenderer.on('file-reset', () => { if(window.showToast) window.showToast("Face dikembalikan ke Tabbie Original!"); });

// PENGATURAN KESEHATAN (TIMER)
window.saveAndStartTimer = function() {
    const waterVal = document.getElementById('input-water').value;
    const stretchVal = document.getElementById('input-stretch').value;
    ipcRenderer.send('start-timer', { water: parseInt(waterVal), stretch: parseInt(stretchVal) });
    const btn = document.getElementById('btn-save');
    const originalText = btn.innerText;
    btn.innerText = "Tersimpan & Aktif!";
    btn.classList.replace('bg-blue-600', 'bg-green-600');
    
    if(window.showToast) window.showToast("Waktu Default Berhasil Disimpan!");
    
    setTimeout(() => {
        btn.innerText = originalText;
        btn.classList.replace('bg-green-600', 'bg-blue-600');
    }, 2000);
}