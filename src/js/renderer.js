const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// GLOBAL VARIABLES UNTUK HOME
let isHomeInitialized = false;
let clockInterval;
let waterCount = localStorage.getItem('waterCount') ? parseInt(localStorage.getItem('waterCount')) : 0;
let isDnd = false;

// POMODORO VARIABLES
let pomoTimeLeft = 25 * 60;
let pomoIsRunning = false;
let pomoMode = 'focus'; 
let pomoInterval = null;

function loadView(viewName) {
    const viewPath = path.join(__dirname, 'views', `${viewName}.html`);
    fs.readFile(viewPath, 'utf8', (err, data) => {
        if (err) return;
        document.getElementById('main-content').innerHTML = data;
        
        ['home', 'settings', 'timer'].forEach(t => {
            const navBtn = document.getElementById(`nav-${t}`);
            if(navBtn) {
                navBtn.classList.remove('bg-[#3f3f46]', 'text-white');
                navBtn.classList.add('text-gray-400');
            }
        });
        
        const activeNav = document.getElementById(`nav-${viewName}`);
        if(activeNav) {
            activeNav.classList.add('bg-[#3f3f46]', 'text-white');
            activeNav.classList.remove('text-gray-400');
        }

        if (viewName === 'home') initHomeLogic();
        
        if (viewName === 'settings' || viewName === 'timer') {
            const savedConfig = ipcRenderer.sendSync('get-config');
            if (savedConfig) {
                if (viewName === 'timer') {
                    if(document.getElementById('input-water')) document.getElementById('input-water').value = savedConfig.water || 45;
                    if(document.getElementById('input-stretch')) document.getElementById('input-stretch').value = savedConfig.stretch || 120;
                } else if (viewName === 'settings') {
                    renderCustomModes(savedConfig.customModes || []);
                }
            }
        }
    });
}

window.onload = () => {
    const savedConfig = ipcRenderer.sendSync('get-config');
    if(savedConfig && savedConfig.dnd !== undefined) isDnd = savedConfig.dnd;
    loadView('home'); 
};

// Window Controls
document.getElementById('btn-close').addEventListener('click', () => ipcRenderer.send('window-close'));
document.getElementById('btn-min').addEventListener('click', () => ipcRenderer.send('window-minimize'));
document.getElementById('btn-max').addEventListener('click', () => ipcRenderer.send('window-maximize'));

function initHomeLogic() {
    // 1. Setup Jam & Greeting
    updateClock();
    if(!clockInterval) clockInterval = setInterval(updateClock, 1000);

    // 2. Setup Pomodoro UI
    updatePomoUI();

    // 3. Setup Water Tracker
    window.updateWater(0);

    // 4. Setup DND Toggle UI
    updateDndUI();

    // 5. Setup Quotes
    const quotes = [
        '"Fokuslah menjadi produktif, bukan sekadar sibuk." - Tim Ferriss',
        '"Ambil jeda. Bernapas. Lanjutkan dengan fokus."',
        '"Satu jam deep work lebih baik dari tiga jam kerja terdistraksi."',
        '"Konsistensi adalah kunci dari kesuksesan yang sesungguhnya."',
        '"Ide itu murah, eksekusi itu mahal. Ayo kerjakan!"'
    ];
    const qEl = document.getElementById('quote-text');
    if(qEl) qEl.innerText = quotes[Math.floor(Math.random() * quotes.length)];
}

function updateClock() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    
    const hours = now.getHours();
    let greeting = 'Good Evening';
    if (hours >= 4 && hours < 11) greeting = 'Good Morning ☀️';
    else if (hours >= 11 && hours < 15) greeting = 'Good Afternoon 🌤️';
    else if (hours >= 15 && hours < 18) greeting = 'Good Afternoon ⛅';
    else if (hours >= 18 && hours < 23) greeting = 'Good Evening 🌙';
    else greeting = 'Working Late? 🦉';

    if(document.getElementById('live-time')) document.getElementById('live-time').innerText = timeStr.replace('.', ':');
    if(document.getElementById('live-date')) document.getElementById('live-date').innerText = dateStr;
    if(document.getElementById('dynamic-greeting')) document.getElementById('dynamic-greeting').innerText = greeting;

    calculateUpNext(now);
}

function calculateUpNext(now) {
    const config = ipcRenderer.sendSync('get-config');
    let nextName = "Belum ada jadwal hari ini";
    let minDiff = Infinity;

    if (config && config.customModes) {
        config.customModes.forEach(mode => {
            if(mode.scheduleType === 'time' && mode.timeValue) {
                const [h, m] = mode.timeValue.split(':').map(Number);
                let modeMins = h * 60 + m;
                let nowMins = now.getHours() * 60 + now.getMinutes();
                let diff = modeMins - nowMins;
                if(diff < 0) diff += 24 * 60;
                if(diff > 0 && diff < minDiff) {
                    minDiff = diff;
                    nextName = mode.name;
                }
            }
        });
    }

    const upNextEl = document.getElementById('up-next-text');
    if(upNextEl) {
        if(minDiff !== Infinity) {
            let timeStr = minDiff >= 60 ? `${Math.floor(minDiff/60)}j ${minDiff%60}m` : `${minDiff} Menit`;
            upNextEl.innerHTML = `<span class="text-purple-400">${nextName}</span><br>Dalam ${timeStr} lagi`;
        } else {
            upNextEl.innerText = "Mode Interval Sedang Aktif";
        }
    }
}

// POMODORO ENGINE
window.togglePomodoro = function() {
    pomoIsRunning = !pomoIsRunning;
    if(pomoIsRunning) {
        pomoInterval = setInterval(() => {
            pomoTimeLeft--;
            if(pomoTimeLeft <= 0) {
                clearInterval(pomoInterval);
                pomoIsRunning = false;
                if(pomoMode === 'focus') {
                    pomoMode = 'break';
                    pomoTimeLeft = 5 * 60;
                    showToast("Fokus Selesai! Istirahat 5 menit.", "success");
                    ipcRenderer.send('notify-system', "Bagus Bos! Waktunya Istirahat 5 Menit ☕");
                } else {
                    pomoMode = 'focus';
                    pomoTimeLeft = 25 * 60;
                    showToast("Istirahat Selesai! Kembali fokus.", "success");
                    ipcRenderer.send('notify-system', "Waktu Istirahat Habis! Ayo Mulai Fokus Lagi 💻");
                }
            }
            updatePomoUI();
        }, 1000);
    } else {
        clearInterval(pomoInterval);
    }
    updatePomoUI();
}

window.resetPomodoro = function() {
    clearInterval(pomoInterval);
    pomoIsRunning = false;
    pomoMode = 'focus';
    pomoTimeLeft = 25 * 60;
    updatePomoUI();
}

function updatePomoUI() {
    const timeEl = document.getElementById('pomo-time');
    const textEl = document.getElementById('pomo-status-text');
    const btnPlay = document.getElementById('btn-pomo-play');
    const progEl = document.getElementById('pomo-progress');
    const pingEl = document.getElementById('pomo-ping');
    const dotEl = document.getElementById('pomo-dot');

    if(!timeEl) return;

    const m = Math.floor(pomoTimeLeft / 60).toString().padStart(2, '0');
    const s = (pomoTimeLeft % 60).toString().padStart(2, '0');
    timeEl.innerText = `${m}:${s}`;
    
    textEl.innerText = pomoMode === 'focus' ? 'SESI FOKUS (25 MNT)' : 'WAKTU ISTIRAHAT (5 MNT)';
    textEl.className = pomoMode === 'focus' ? "text-[11px] text-blue-400 font-bold tracking-widest uppercase" : "text-[11px] text-green-400 font-bold tracking-widest uppercase";
    
    let total = pomoMode === 'focus' ? 25 * 60 : 5 * 60;
    let percent = ((total - pomoTimeLeft) / total) * 100;
    progEl.style.width = `${percent}%`;

    if(pomoMode === 'focus') {
        progEl.className = "bg-gradient-to-r from-blue-600 to-cyan-400 h-1.5 rounded-full transition-all duration-1000 ease-linear";
        dotEl.className = "relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500";
    } else {
        progEl.className = "bg-gradient-to-r from-green-500 to-emerald-400 h-1.5 rounded-full transition-all duration-1000 ease-linear";
        dotEl.className = "relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500";
    }

    if(pomoIsRunning) {
        btnPlay.innerHTML = `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>`;
        pingEl.classList.remove('hidden');
    } else {
        btnPlay.innerHTML = `<svg class="w-5 h-5 pl-0.5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"></path></svg>`;
        pingEl.classList.add('hidden');
        if(pomoTimeLeft === total) dotEl.className = "relative inline-flex rounded-full h-2.5 w-2.5 bg-gray-500";
    }
}

// WATER TRACKER ENGINE
window.updateWater = function(val) {
    waterCount += val;
    if(waterCount < 0) waterCount = 0;
    if(waterCount > 8) waterCount = 8;
    localStorage.setItem('waterCount', waterCount);
    
    const countEl = document.getElementById('water-count');
    if(countEl) {
        countEl.innerText = waterCount;
        countEl.className = waterCount >= 8 ? "text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]" : "";
    }
}

// DND ENGINE
window.toggleDND = function() {
    isDnd = !isDnd;
    
    const config = ipcRenderer.sendSync('get-config');
    config.dnd = isDnd;
    ipcRenderer.send('save-config', config);

    updateDndUI();
    if(isDnd) showToast("Mode Senyap Aktif! Pop-up ditahan.", "success");
    else showToast("Mode Senyap Nonaktif.", "success");
}

function updateDndUI() {
    const thumb = document.getElementById('dnd-thumb');
    const track = document.getElementById('dnd-track');
    const status = document.getElementById('dnd-status');
    const iconBg = document.getElementById('dnd-icon-bg');

    if(!thumb) return;

    if(isDnd) {
        thumb.classList.add('translate-x-5');
        track.classList.replace('bg-[#3f3f46]', 'bg-red-500');
        status.innerText = "Tahan Notifikasi: ON";
        status.classList.add('text-red-400');
        iconBg.classList.replace('text-red-400', 'text-white');
        iconBg.classList.replace('bg-red-500/10', 'bg-red-600');
    } else {
        thumb.classList.remove('translate-x-5');
        track.classList.replace('bg-red-500', 'bg-[#3f3f46]');
        status.innerText = "Tahan Notifikasi: Off";
        status.classList.remove('text-red-400');
        iconBg.classList.replace('text-white', 'text-red-400');
        iconBg.classList.replace('bg-red-600', 'bg-red-500/10');
    }
}

// FUNGSI SETTINGS & GENERAL
window.switchTab = function(tabName) { loadView(tabName); }

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    const iconSvg = type === 'success' 
        ? `<svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`
        : `<svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;

    toast.className = `bg-[#27272a] border border-[#3f3f46] text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 transition-all duration-300 toast-enter backdrop-blur-md`;
    toast.innerHTML = `${iconSvg} <span class="text-sm font-medium">${message}</span>`;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.remove('toast-enter'));
    setTimeout(() => {
        toast.classList.add('toast-leave');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

let currentConfirmAction = null;
function showConfirm(title, msg, btnText, type, action) {
    document.getElementById('confirm-title').innerText = title;
    document.getElementById('confirm-text').innerText = msg;
    const btnYes = document.getElementById('btn-confirm-yes');
    const iconContainer = document.getElementById('confirm-icon-container');
    btnYes.innerText = btnText;

    if (type === 'danger') {
        btnYes.className = "flex-1 bg-red-600 hover:bg-red-500 text-white py-3 rounded-[14px] transition font-medium shadow-lg shadow-red-500/30";
        iconContainer.className = "w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4";
        iconContainer.innerHTML = `<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>`;
    } else if (type === 'warning') {
        btnYes.className = "flex-1 bg-orange-500 hover:bg-orange-400 text-white py-3 rounded-[14px] transition font-medium shadow-lg shadow-orange-500/30";
        iconContainer.className = "w-16 h-16 bg-orange-500/10 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-4";
        iconContainer.innerHTML = `<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`;
    }

    currentConfirmAction = action;
    const modal = document.getElementById('modal-confirm');
    const content = document.getElementById('confirm-content');
    modal.classList.remove('opacity-0', 'pointer-events-none');
    content.classList.remove('scale-95');
}

window.closeConfirm = function() {
    document.getElementById('modal-confirm').classList.add('opacity-0', 'pointer-events-none');
    document.getElementById('confirm-content').classList.add('scale-95');
    currentConfirmAction = null;
}

document.getElementById('btn-confirm-yes').addEventListener('click', () => {
    if (currentConfirmAction) currentConfirmAction();
    window.closeConfirm();
});

const iconLibrary = {
    bell: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>',
    moon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>',
    coffee: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 8h-2.13A4.001 4.001 0 0014 5H6a4 4 0 00-3.87 3H2v2h.13A4.001 4.001 0 006 13h8a4 4 0 003.87-3H20V8zm-6 2H6a2 2 0 010-4h8a2 2 0 010 4z M4 15h12v2H4z"></path>',
    code: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>',
    game: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 11V9a2 2 0 00-2-2H7a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2zM15 11h.01M17 9h.01M15 13h.01"></path>'
};

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

    if(!name) { showToast("Isi nama notifikasinya bos!", "error"); return; }
    if(type === 'interval' && !interval) { showToast("Isi menitnya bos!", "error"); return; }
    if(type === 'time' && !timeVal) { showToast("Pilih jamnya bos!", "error"); return; }

    ipcRenderer.send('add-custom-mode', {
        id: Date.now(), name: name, scheduleType: type, interval: parseInt(interval) || 0,
        timeValue: timeVal || "", icon: icon, color: color, path: "" 
    });

    closeModal();
    showToast("Pengingat baru berhasil dibuat!");
}

window.deleteMode = function(id) {
    showConfirm("Hapus Pengingat?", "Tindakan ini tidak dapat dibatalkan.", "Hapus", "danger", () => {
        ipcRenderer.send('delete-custom-mode', id);
        showToast("Pengingat berhasil dihapus.");
    });
}

ipcRenderer.on('config-updated', (event, newConfig) => {
    if(document.getElementById('custom-modes-container')) renderCustomModes(newConfig.customModes);
    updateClock(); // Update Up Next card di home
});

window.changeAnimation = function(type) { ipcRenderer.send('open-file-dialog', type); }
window.resetAnimation = function(type) { 
    showConfirm("Reset Animasi Face?", "Kembalikan animasi wajah ke Tabbie CSS Default?", "Ya, Reset", "warning", () => {
        ipcRenderer.send('reset-file', type);
    });
}

ipcRenderer.on('file-selected', () => showToast("Face animasi berhasil diperbarui!"));
ipcRenderer.on('file-reset', () => showToast("Face dikembalikan ke Tabbie Original!"));

window.saveAndStartTimer = function() {
    const waterVal = document.getElementById('input-water').value;
    const stretchVal = document.getElementById('input-stretch').value;
    ipcRenderer.send('start-timer', { water: parseInt(waterVal), stretch: parseInt(stretchVal) });
    const btn = document.getElementById('btn-save');
    const originalText = btn.innerText;
    btn.innerText = "Tersimpan & Aktif!";
    btn.classList.replace('bg-blue-600', 'bg-green-600');
    showToast("Waktu Default Berhasil Disimpan!");
    setTimeout(() => {
        btn.innerText = originalText;
        btn.classList.replace('bg-green-600', 'bg-blue-600');
    }, 2000);
}