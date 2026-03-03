// VARIABLES HOME & WIDGET
window.clockInterval = null;
window.waterCount = localStorage.getItem('waterCount') ? parseInt(localStorage.getItem('waterCount')) : 0;

// VARIABLES POMODORO
window.pomoTimeLeft = 25 * 60;
window.pomoIsRunning = false;
window.pomoMode = 'focus'; 
window.pomoInterval = null;

// INITIALIZE HOME
window.initHomeLogic = function() {
    window.updateClock();
    if(!window.clockInterval) window.clockInterval = setInterval(window.updateClock, 1000);
    window.updatePomoUI();
    window.updateWater(0);
    window.updateDndUI();

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

// CLOCK & UP NEXT ENGINE
window.updateClock = function() {
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

    window.calculateUpNext(now);
}

window.calculateUpNext = function(now) {
    const { ipcRenderer } = require('electron');
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
    const { ipcRenderer } = require('electron');
    window.pomoIsRunning = !window.pomoIsRunning;
    if(window.pomoIsRunning) {
        window.pomoInterval = setInterval(() => {
            window.pomoTimeLeft--;
            if(window.pomoTimeLeft <= 0) {
                clearInterval(window.pomoInterval);
                window.pomoIsRunning = false;
                if(window.pomoMode === 'focus') {
                    window.pomoMode = 'break';
                    window.pomoTimeLeft = 5 * 60;
                    if(window.showToast) window.showToast("Fokus Selesai! Istirahat 5 menit.", "success");
                    ipcRenderer.send('notify-system', "Bagus Bos! Waktunya Istirahat 5 Menit ☕");
                } else {
                    window.pomoMode = 'focus';
                    window.pomoTimeLeft = 25 * 60;
                    if(window.showToast) window.showToast("Istirahat Selesai! Kembali fokus.", "success");
                    ipcRenderer.send('notify-system', "Waktu Istirahat Habis! Ayo Mulai Fokus Lagi 💻");
                }
            }
            window.updatePomoUI();
        }, 1000);
    } else {
        clearInterval(window.pomoInterval);
    }
    window.updatePomoUI();
}

window.resetPomodoro = function() {
    clearInterval(window.pomoInterval);
    window.pomoIsRunning = false;
    window.pomoMode = 'focus';
    window.pomoTimeLeft = 25 * 60;
    window.updatePomoUI();
}

window.updatePomoUI = function() {
    const timeEl = document.getElementById('pomo-time');
    const textEl = document.getElementById('pomo-status-text');
    const btnPlay = document.getElementById('btn-pomo-play');
    const progEl = document.getElementById('pomo-progress');
    const pingEl = document.getElementById('pomo-ping');
    const dotEl = document.getElementById('pomo-dot');

    if(!timeEl) return;

    const m = Math.floor(window.pomoTimeLeft / 60).toString().padStart(2, '0');
    const s = (window.pomoTimeLeft % 60).toString().padStart(2, '0');
    timeEl.innerText = `${m}:${s}`;
    
    textEl.innerText = window.pomoMode === 'focus' ? 'SESI FOKUS (25 MNT)' : 'WAKTU ISTIRAHAT (5 MNT)';
    textEl.className = window.pomoMode === 'focus' ? "text-[11px] text-blue-400 font-bold tracking-widest uppercase" : "text-[11px] text-green-400 font-bold tracking-widest uppercase";
    
    let total = window.pomoMode === 'focus' ? 25 * 60 : 5 * 60;
    let percent = ((total - window.pomoTimeLeft) / total) * 100;
    progEl.style.width = `${percent}%`;

    if(window.pomoMode === 'focus') {
        progEl.className = "bg-gradient-to-r from-blue-600 to-cyan-400 h-1.5 rounded-full transition-all duration-1000 ease-linear";
        dotEl.className = "relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500";
    } else {
        progEl.className = "bg-gradient-to-r from-green-500 to-emerald-400 h-1.5 rounded-full transition-all duration-1000 ease-linear";
        dotEl.className = "relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500";
    }

    if(window.pomoIsRunning) {
        btnPlay.innerHTML = `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>`;
        pingEl.classList.remove('hidden');
    } else {
        btnPlay.innerHTML = `<svg class="w-5 h-5 pl-0.5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"></path></svg>`;
        pingEl.classList.add('hidden');
        if(window.pomoTimeLeft === total) dotEl.className = "relative inline-flex rounded-full h-2.5 w-2.5 bg-gray-500";
    }
}

// WATER TRACKER ENGINE
window.updateWater = function(val) {
    window.waterCount += val;
    if(window.waterCount < 0) window.waterCount = 0;
    if(window.waterCount > 8) window.waterCount = 8;
    localStorage.setItem('waterCount', window.waterCount);
    
    const countEl = document.getElementById('water-count');
    if(countEl) {
        countEl.innerText = window.waterCount;
        countEl.className = window.waterCount >= 8 ? "text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]" : "";
    }
}

// DND (DO NOT DISTURB) ENGINE
window.toggleDND = function() {
    const { ipcRenderer } = require('electron');
    window.isDnd = !window.isDnd;
    
    const config = ipcRenderer.sendSync('get-config');
    config.dnd = window.isDnd;
    ipcRenderer.send('save-config', config);

    window.updateDndUI();
    if(window.isDnd) {
        if(window.showToast) window.showToast("Mode Senyap Aktif! Pop-up ditahan.", "success");
    } else {
        if(window.showToast) window.showToast("Mode Senyap Nonaktif.", "success");
    }
}

window.updateDndUI = function() {
    const thumb = document.getElementById('dnd-thumb');
    const track = document.getElementById('dnd-track');
    const status = document.getElementById('dnd-status');
    const iconBg = document.getElementById('dnd-icon-bg');

    if(!thumb) return;

    if(window.isDnd) {
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