/**
 * @fileoverview Dashboard & Home Engine
 * Handles clock ticking, pomodoro timer, hydration tracking, and unified daily snapshot.
 */

window.clockInterval = null;
window.waterCount = localStorage.getItem('waterCount') ? parseInt(localStorage.getItem('waterCount')) : 0;

window.pomoTimeLeft = 25 * 60;
window.pomoIsRunning = false;
window.pomoMode = 'focus'; 
window.pomoInterval = null;

/**
 * Initializes home components on load
 */
window.initHomeLogic = function() {
    window.updateClock();
    if(!window.clockInterval) window.clockInterval = setInterval(window.updateClock, 1000);
    window.updatePomoUI();
    window.updateWater(0);
    window.updateDndUI();
    window.updateDailySnapshot(); // Render initial data snapshot

    const quotes = [
        '"Focus on being productive instead of busy." - Tim Ferriss',
        '"Take a pause. Breathe. Resume with focus."',
        '"One hour of deep work is better than three hours of distracted work."',
        '"Consistency is the true key to success."',
        '"Ideas are cheap, execution is expensive. Let\'s get to work!"'
    ];
    const qEl = document.getElementById('quote-text');
    if(qEl) qEl.innerText = quotes[Math.floor(Math.random() * quotes.length)];
}

/**
 * Updates the daily snapshot aggregating data from tasks, hydration, and screen time.
 */
window.updateDailySnapshot = function() {
    // Retrieve Task Data
    let tasks = JSON.parse(localStorage.getItem('notiybot_tasks')) || [];
    let completedTasks = tasks.filter(t => t.completed).length;
    let totalTasks = tasks.length;
    let snapTasksEl = document.getElementById('snap-tasks');
    if(snapTasksEl) snapTasksEl.innerText = `${completedTasks}/${totalTasks} Tasks`;

    // Retrieve Hydration Data
    let water = window.waterCount || 0;
    let snapWaterEl = document.getElementById('snap-water');
    if(snapWaterEl) snapWaterEl.innerText = `${water}/8 Glasses`;

    // Retrieve Screen Time Data
    let stData = JSON.parse(localStorage.getItem('notiybot_screentime_today')) || [];
    let totalMs = stData.reduce((acc, item) => acc + item.durationMs, 0);
    let formattedST = "0m";
    if (totalMs > 0) {
        if (totalMs < 60000) formattedST = "< 1m"; 
        else {
            const totalMins = Math.floor(totalMs / 60000);
            const h = Math.floor(totalMins / 60);
            const m = totalMins % 60;
            formattedST = h > 0 ? `${h}h ${m}m` : `${m}m`;
        }
    }
    let snapSTEl = document.getElementById('snap-screentime');
    if(snapSTEl) snapSTEl.innerText = formattedST;

    // Apply fade-in animation
    let snapContainer = document.getElementById('daily-snapshot');
    if(snapContainer) snapContainer.classList.remove('opacity-0');
}

/**
 * Updates clock and greeting UI
 */
window.updateClock = function() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    
    const hours = now.getHours();
    let greeting = 'Good evening';
    if (hours >= 4 && hours < 11) greeting = 'Good morning';
    else if (hours >= 11 && hours < 17) greeting = 'Good afternoon';
    else if (hours >= 17 && hours < 22) greeting = 'Good evening';
    else greeting = 'Working late?';

    if(document.getElementById('live-time')) document.getElementById('live-time').innerText = timeStr;
    if(document.getElementById('live-date')) document.getElementById('live-date').innerText = dateStr;
    if(document.getElementById('dynamic-greeting')) document.getElementById('dynamic-greeting').innerText = greeting;

    window.calculateUpNext(now);
}

/**
 * Calculates and displays the next scheduled mode/timer
 */
window.calculateUpNext = function(now) {
    const { ipcRenderer } = require('electron');
    const config = ipcRenderer.sendSync('get-config');
    let nextName = "No upcoming schedule";
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
            let timeStr = minDiff >= 60 ? `${Math.floor(minDiff/60)}h ${minDiff%60}m` : `${minDiff} min`;
            upNextEl.innerHTML = `<span class="text-white">${nextName}</span><br><span class="text-gray-500">In ${timeStr}</span>`;
        } else {
            upNextEl.innerText = "Interval mode is currently active";
        }
    }
}

/**
 * Pomodoro Engine: Toggles start/pause state
 */
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
                    if(window.showToast) window.showToast("Focus completed! Take a 5 min break.", "success");
                    ipcRenderer.send('notify-system', "Great job! Time for a 5-minute break.");
                } else {
                    window.pomoMode = 'focus';
                    window.pomoTimeLeft = 25 * 60;
                    if(window.showToast) window.showToast("Break is over! Back to focus.", "success");
                    ipcRenderer.send('notify-system', "Break time is up! Let's get back to work.");
                }
            }
            window.updatePomoUI();
        }, 1000);
    } else {
        clearInterval(window.pomoInterval);
    }
    window.updatePomoUI();
}

/**
 * Pomodoro Engine: Resets timer
 */
window.resetPomodoro = function() {
    clearInterval(window.pomoInterval);
    window.pomoIsRunning = false;
    window.pomoMode = 'focus';
    window.pomoTimeLeft = 25 * 60;
    window.updatePomoUI();
}

/**
 * Syncs Pomodoro variables to the UI
 */
window.updatePomoUI = function() {
    const timeEl = document.getElementById('pomo-time');
    const textEl = document.getElementById('pomo-status-text');
    const btnPlay = document.getElementById('btn-pomo-play');
    const progEl = document.getElementById('pomo-progress');
    const dotEl = document.getElementById('pomo-dot');

    if(!timeEl) return;

    const m = Math.floor(window.pomoTimeLeft / 60).toString().padStart(2, '0');
    const s = (window.pomoTimeLeft % 60).toString().padStart(2, '0');
    timeEl.innerText = `${m}:${s}`;
    
    textEl.innerText = window.pomoMode === 'focus' ? 'Focus Session (25m)' : 'Short Break (5m)';
    
    let total = window.pomoMode === 'focus' ? 25 * 60 : 5 * 60;
    let percent = ((total - window.pomoTimeLeft) / total) * 100;
    progEl.style.width = `${percent}%`;

    if(window.pomoMode === 'focus') {
        progEl.className = "bg-blue-500 h-full rounded-full transition-all duration-1000 ease-linear";
        dotEl.className = "w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]";
    } else {
        progEl.className = "bg-green-500 h-full rounded-full transition-all duration-1000 ease-linear";
        dotEl.className = "w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]";
    }

    if(window.pomoIsRunning) {
        btnPlay.innerHTML = `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5 4h3v12H5V4zm7 0h3v12h-3V4z" clip-rule="evenodd"></path></svg>`;
    } else {
        btnPlay.innerHTML = `<svg class="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4l12 6-12 6z"></path></svg>`;
        if(window.pomoTimeLeft === total) dotEl.className = "w-2.5 h-2.5 rounded-full bg-gray-600";
    }
}

/**
 * Hydration Tracker logic
 */
window.updateWater = function(val) {
    window.waterCount += val;
    if(window.waterCount < 0) window.waterCount = 0;
    if(window.waterCount > 8) window.waterCount = 8;
    localStorage.setItem('waterCount', window.waterCount);
    
    const countEl = document.getElementById('water-count');
    if(countEl) {
        countEl.innerText = window.waterCount;
        countEl.className = window.waterCount >= 8 ? "text-3xl font-medium text-cyan-400" : "text-3xl font-medium text-white";
    }
    
    // Update snapshot on hydration change
    if(typeof window.updateDailySnapshot === 'function') window.updateDailySnapshot();
}

/**
 * DND (Do Not Disturb) Engine Toggle
 */
window.toggleDND = function() {
    const { ipcRenderer } = require('electron');
    window.isDnd = !window.isDnd;
    
    const config = ipcRenderer.sendSync('get-config');
    config.dnd = window.isDnd;
    ipcRenderer.send('save-config', config);

    window.updateDndUI();
    if(window.isDnd) {
        if(window.showToast) window.showToast("DND Active. Pop-ups suppressed.", "success");
    } else {
        if(window.showToast) window.showToast("DND Disabled.", "success");
    }
}

/**
 * Updates DND Visual State
 */
window.updateDndUI = function() {
    const thumb = document.getElementById('dnd-thumb');
    const track = document.getElementById('dnd-track');
    const status = document.getElementById('dnd-status');
    const iconWrapper = document.getElementById('dnd-icon-wrapper');

    if(!thumb) return;

    if(window.isDnd) {
        thumb.classList.add('translate-x-4', 'bg-white');
        thumb.classList.remove('bg-gray-400');
        track.classList.replace('bg-[#3f3f46]', 'bg-red-500');
        status.innerText = "Notifications are OFF";
        status.classList.replace('text-gray-500', 'text-red-400');
        iconWrapper.classList.replace('text-gray-500', 'text-red-400');
    } else {
        thumb.classList.remove('translate-x-4', 'bg-white');
        thumb.classList.add('bg-gray-400');
        track.classList.replace('bg-red-500', 'bg-[#3f3f46]');
        status.innerText = "Notifications are ON";
        status.classList.replace('text-red-400', 'text-gray-500');
        iconWrapper.classList.replace('text-red-400', 'text-gray-500');
    }
}

/**
 * Event listener to trigger snapshot update on tab switch
 */
window.addEventListener('tabSwitched', function(e) {
    if (e.detail === 'home' && typeof window.updateDailySnapshot === 'function') {
        window.updateDailySnapshot(); 
    }
});