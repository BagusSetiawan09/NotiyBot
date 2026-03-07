/**
 * @fileoverview Screen Time Tracker & Analytics Engine
 * Captures active OS window data, handles focus blocking, and renders optimized UI.
 */

window.liveTrackingData = JSON.parse(localStorage.getItem('notiybot_screentime_today')) || [];
window.lastPollTime = Date.now(); 

// Optimization variables to prevent UI flickering (kedut-kedut)
window.lastUiRenderTime = Date.now();
window.lastAppCount = window.liveTrackingData.length;

// Helper: Determine UI properties based on application name
function getAppUI(appName) {
    const name = appName.toLowerCase();
    if (name.includes('chrome') || name.includes('edge') || name.includes('brave') || name.includes('firefox')) {
        return { color: 'blue', iconBg: 'bg-blue-500/10', iconColor: 'text-blue-400', svg: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>` };
    } else if (name.includes('code') || name.includes('studio') || name.includes('cursor') || name.includes('idea')) {
        return { color: 'green', iconBg: 'bg-green-500/10', iconColor: 'text-green-400', svg: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>` };
    } else if (name.includes('explorer') || name.includes('finder') || name.includes('file')) {
        return { color: 'orange', iconBg: 'bg-orange-500/10', iconColor: 'text-orange-400', svg: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>` };
    } else if (name.includes('notiybot') || name.includes('electron')) {
        return { color: 'blue', iconBg: 'bg-blue-500/10', iconColor: 'text-blue-400', svg: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>` };
    } else {
        return { color: 'purple', iconBg: 'bg-purple-500/10', iconColor: 'text-purple-400', svg: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>` };
    }
}

// Helper: Format timestamp to AM/PM string
function formatTimeAMPM(timestamp) {
    const d = new Date(timestamp);
    let hours = d.getHours();
    let minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    return hours + ':' + minutes + ' ' + ampm;
}

// Helper: Format milliseconds to human-readable duration
function formatDuration(ms) {
    if (ms === 0) return "0m";
    if (ms < 60000) return "< 1m"; 
    const totalMinutes = Math.floor(ms / 60000);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

// Helper: Retrieves accurate historical data merged with today's live data
function getWeeklyData() {
    let history = JSON.parse(localStorage.getItem('notiybot_screentime_history')) || {};
    let liveTotalMs = window.liveTrackingData.reduce((acc, curr) => acc + curr.durationMs, 0);

    let weekMs = [0, 0, 0, 0, 0, 0, 0];
    let now = new Date();
    
    let dayOfWeek = now.getDay() || 7; 
    let monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek + 1);
    monday.setHours(0,0,0,0);

    let totalWeeklyMs = 0;

    for (let i = 0; i < 7; i++) {
        let currentDay = new Date(monday);
        currentDay.setDate(monday.getDate() + i);
        let dateString = currentDay.toISOString().split('T')[0];

        if (currentDay.toDateString() === now.toDateString()) {
            weekMs[i] = liveTotalMs;
        } else {
            weekMs[i] = history[dateString] || 0; 
        }
        totalWeeklyMs += weekMs[i];
    }
    return { weekMs, totalWeeklyMs, dayOfWeek: dayOfWeek - 1 };
}

// IPC Listener: Handle incoming OS window data
require('electron').ipcRenderer.on('os-window-update', (event, data) => {
    const appName = data.owner.name || "Unknown App";
    const windowTitle = data.title || "";
    const now = Date.now();
    
    // Focus Blocker Engine
    if (window.pomoIsRunning === true && window.pomoMode === 'focus') {
        const blacklistKeywords = ['youtube', 'instagram', 'tiktok', 'netflix', 'twitter', 'facebook', 'pinterest'];
        const titleLower = windowTitle.toLowerCase();
        const isDistracted = blacklistKeywords.some(keyword => titleLower.includes(keyword));

        if (isDistracted) {
            require('electron').ipcRenderer.send('notify-system', "Warning! Focus session is active. Please close " + appName + ".");
        }
    }

    const deltaMs = now - window.lastPollTime;
    window.lastPollTime = now;

    // Day Rollover and Historical Data Storage Logic
    if (window.liveTrackingData.length > 0) {
        const firstEntryTime = new Date(window.liveTrackingData[0].startTime);
        const today = new Date();
        
        if (firstEntryTime.getDate() !== today.getDate() || firstEntryTime.getMonth() !== today.getMonth()) {
            let history = JSON.parse(localStorage.getItem('notiybot_screentime_history')) || {};
            let oldDateStr = firstEntryTime.toISOString().split('T')[0];
            let oldTotal = window.liveTrackingData.reduce((acc, item) => acc + item.durationMs, 0);
            
            history[oldDateStr] = oldTotal;
            localStorage.setItem('notiybot_screentime_history', JSON.stringify(history));
            
            window.liveTrackingData = []; 
        }
    }

    // Aggregation Logic
    let existingApp = window.liveTrackingData.find(item => item.title === appName);

    if (existingApp) {
        const addedTime = deltaMs > 10000 ? 3000 : deltaMs; 
        existingApp.durationMs += addedTime;
        existingApp.subtitle = windowTitle; 
    } else {
        const ui = getAppUI(appName);
        window.liveTrackingData.push({
            startTime: now,
            durationMs: 3000, 
            title: appName,
            subtitle: windowTitle,
            color: ui.color,
            iconColor: ui.iconColor,
            iconBg: ui.iconBg,
            iconSvg: ui.svg
        });
    }

    window.liveTrackingData.sort((a, b) => a.startTime - b.startTime);
    localStorage.setItem('notiybot_screentime_today', JSON.stringify(window.liveTrackingData));

    // Update Global Snapshot and Top Total Text (Real-time without flickering DOM)
    if (typeof window.updateDailySnapshot === 'function') {
        window.updateDailySnapshot();
    }
    
    const totalTimeText = document.getElementById('st-total-text');
    const isWeekView = document.getElementById('st-tab-week')?.classList.contains('bg-blue-600');
    
    if (totalTimeText) {
        if (isWeekView) {
            const weekData = getWeeklyData();
            totalTimeText.innerText = formatDuration(weekData.totalWeeklyMs);
        } else {
            const totalMsToday = window.liveTrackingData.reduce((acc, item) => acc + item.durationMs, 0);
            totalTimeText.innerText = formatDuration(totalMsToday);
        }
    }

    // Throttled UI Re-render (Only recreate complex DOM if new app is opened OR 60 seconds have passed)
    const currentAppCount = window.liveTrackingData.length;
    const timeSinceLastRender = now - window.lastUiRenderTime;

    if (currentAppCount !== window.lastAppCount || timeSinceLastRender >= 60000) {
        const stContainer = document.getElementById('screentime-timeline-container');
        const weekContainer = document.getElementById('screentime-week-container');
        
        if (stContainer && !stContainer.classList.contains('hidden')) window.renderScreenTime();
        if (weekContainer && !weekContainer.classList.contains('hidden')) window.renderWeeklyChart();
        
        window.lastUiRenderTime = now;
        window.lastAppCount = currentAppCount;
    }
});

// Wipes all daily tracking data
window.clearScreenTime = function() {
    window.liveTrackingData = [];
    localStorage.setItem('notiybot_screentime_today', JSON.stringify([]));
    window.renderScreenTime();
    if(window.showToast) window.showToast("Activity history cleared!", "success");
    if (typeof window.updateDailySnapshot === 'function') window.updateDailySnapshot();
}

// UI Renderer functions for Tab Switching
window.switchScreenTimeTab = function(tab) {
    const btnDay = document.getElementById('st-tab-day');
    const btnWeek = document.getElementById('st-tab-week');
    const containerDay = document.getElementById('screentime-timeline-container');
    const containerWeek = document.getElementById('screentime-week-container');
    const sectionTitle = document.getElementById('st-section-title');
    const btnClear = document.getElementById('btn-clear-st');
    const subtitleText = document.getElementById('st-subtitle-text');
    
    if (tab === 'day') {
        btnDay.className = "px-4 py-1.5 text-sm font-bold rounded-lg bg-blue-600 text-white shadow-sm transition-all duration-300";
        btnWeek.className = "px-4 py-1.5 text-sm font-bold rounded-lg text-gray-400 hover:text-white transition-all duration-300";
        containerDay.classList.remove('hidden');
        containerDay.classList.add('flex');
        containerWeek.classList.add('hidden');
        containerWeek.classList.remove('flex');
        sectionTitle.innerText = "Today Activity";
        subtitleText.innerText = "screen time today";
        btnClear.style.display = 'flex';
        window.renderScreenTime();
    } else {
        btnWeek.className = "px-4 py-1.5 text-sm font-bold rounded-lg bg-blue-600 text-white shadow-sm transition-all duration-300";
        btnDay.className = "px-4 py-1.5 text-sm font-bold rounded-lg text-gray-400 hover:text-white transition-all duration-300";
        containerDay.classList.add('hidden');
        containerDay.classList.remove('flex');
        containerWeek.classList.remove('hidden');
        containerWeek.classList.add('flex');
        sectionTitle.innerText = "Weekly Real-time Insights";
        subtitleText.innerText = "total screen time this week";
        btnClear.style.display = 'none'; 
        window.renderWeeklyChart();
    }
}

// Renders the Day View (Timeline)
window.renderScreenTime = function() {
    const container = document.getElementById('screentime-timeline-container');
    const totalTimeText = document.getElementById('st-total-text'); 
    if (!container) return;

    container.innerHTML = "";
    let totalMsToday = 0;

    if (window.liveTrackingData.length === 0) {
        container.innerHTML = `<div class="text-center py-10 text-gray-500 font-medium text-sm">Waiting for activity...</div>`;
        if (totalTimeText) totalTimeText.innerText = "0m";
        return;
    }

    window.liveTrackingData.forEach((item, index) => {
        totalMsToday += item.durationMs;

        let dotColor = "bg-blue-500";
        if (item.color === 'green') dotColor = "bg-green-500";
        if (item.color === 'purple') dotColor = "bg-purple-500";
        if (item.color === 'orange') dotColor = "bg-orange-500";

        const timeString = formatTimeAMPM(item.startTime);
        const durationString = formatDuration(item.durationMs);

        let safeSubtitle = item.subtitle ? item.subtitle : "";
        if (safeSubtitle.length > 40) safeSubtitle = safeSubtitle.substring(0, 40) + "...";
        let subtitleHtml = safeSubtitle ? `<p class="text-[11px] text-gray-500 font-medium mt-0.5 truncate max-w-[200px]" title="${item.subtitle}">${safeSubtitle}</p>` : '';

        let lineStyle = "top-0 bottom-0"; 
        if (index === 0 && window.liveTrackingData.length === 1) lineStyle = "hidden"; 
        else if (index === 0) lineStyle = "top-6 bottom-0"; 
        else if (index === window.liveTrackingData.length - 1) lineStyle = "top-0 h-6"; 

        container.innerHTML += `
            <div class="flex items-stretch group w-full">
                <div class="w-[80px] flex-shrink-0 text-[11px] text-gray-500 font-bold uppercase tracking-wide pt-4 text-right whitespace-nowrap pr-3">
                    ${timeString}
                </div>

                <div class="w-8 flex-shrink-0 relative flex justify-center">
                    <div class="absolute ${lineStyle} left-1/2 w-[2px] bg-[#3f3f46] -translate-x-1/2"></div>
                    <div class="w-2.5 h-2.5 rounded-full ${dotColor} border-[2px] border-[#18181b] mt-[20px] z-10 box-content"></div>
                </div>

                <div class="flex-1 pl-4 pb-7 flex items-start justify-between overflow-hidden">
                    <div class="flex items-center gap-4 mt-1.5 flex-1 min-w-0">
                        <div class="w-10 h-10 rounded-xl ${item.iconBg} ${item.iconColor} flex items-center justify-center border border-[#3f3f46]/50 shadow-sm flex-shrink-0">
                            ${item.iconSvg}
                        </div>
                        <div class="flex flex-col justify-center min-w-0">
                            <h4 class="text-sm font-medium text-gray-200 tracking-wide truncate">${item.title}</h4>
                            ${subtitleHtml}
                        </div>
                    </div>
                    
                    <div class="flex items-center mt-3 pl-3 flex-shrink-0">
                        <span class="text-[13px] font-medium text-gray-400">${durationString}</span>
                    </div>
                </div>
            </div>
        `;
    });

    if (totalTimeText) {
        totalTimeText.innerText = formatDuration(totalMsToday);
    }
}

// Renders the Week View (Ultra-Minimalist Real-time SVG Line Chart)
window.renderWeeklyChart = function() {
    const container = document.getElementById('screentime-week-container');
    const totalTimeText = document.getElementById('st-total-text');
    if (!container) return;

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    const data = getWeeklyData();
    const currentDayIndex = data.dayOfWeek;

    const MAX_VAL = Math.max(...data.weekMs, 60 * 60 * 1000); 
    const yPercentages = data.weekMs.map(ms => (ms / MAX_VAL) * 100);

    const points = [];
    yPercentages.forEach((percent, i) => {
        const x = (i * 100) / 6; 
        const y = 100 - percent; 
        points.push({ x, y, percent, originalMs: data.weekMs[i] });
    });

    const pathData = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;
    const areaData = `${pathData} L 100,100 L 0,100 Z`;

    let htmlDots = '';
    points.forEach((p, i) => {
        const isToday = i === currentDayIndex;
        const dotClasses = isToday 
            ? "w-2.5 h-2.5 bg-[#18181b] border-2 border-blue-400 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)] z-20 cursor-pointer" 
            : "w-2 h-2 bg-[#18181b] border-[1.5px] border-gray-600 rounded-full z-10 hover:border-blue-400 hover:scale-125 transition-transform cursor-pointer";
        
        const tooltipText = formatDuration(p.originalMs);
        
        htmlDots += `
            <div class="absolute group flex justify-center items-center" style="left: ${p.x}%; top: ${p.y}%; transform: translate(-50%, -50%);">
                <div class="${dotClasses}"></div>
                <div class="absolute -top-7 bg-[#27272a] text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-30">
                    ${tooltipText}
                </div>
            </div>
        `;
    });

    let labelsHtml = '<div class="flex justify-between w-full mt-4 px-1">';
    days.forEach((day, index) => {
        const isToday = index === currentDayIndex;
        const textColor = isToday ? 'text-blue-400 font-bold' : 'text-gray-500 font-medium';
        labelsHtml += `<span class="text-[10px] uppercase tracking-wider ${textColor} w-8 text-center">${day}</span>`;
    });
    labelsHtml += '</div>';

    const chartHtml = `
        <div class="w-full flex-1 flex flex-col justify-end relative mt-2 px-3">
            
            <div class="relative w-full h-[180px]">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="w-full h-full absolute inset-0 overflow-visible z-0">
                    <defs>
                        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.2" />
                            <stop offset="100%" stop-color="#3b82f6" stop-opacity="0" />
                        </linearGradient>
                    </defs>
                    
                    <line x1="0" y1="0" x2="100" y2="0" stroke="#3f3f46" stroke-width="1" vector-effect="non-scaling-stroke" stroke-dasharray="4 4" opacity="0.3" />
                    <line x1="0" y1="50" x2="100" y2="50" stroke="#3f3f46" stroke-width="1" vector-effect="non-scaling-stroke" stroke-dasharray="4 4" opacity="0.3" />
                    <line x1="0" y1="100" x2="100" y2="100" stroke="#3f3f46" stroke-width="1" vector-effect="non-scaling-stroke" opacity="0.8" />
                    
                    <path d="${areaData}" fill="url(#lineGradient)" />
                    <path d="${pathData}" fill="none" stroke="#3b82f6" stroke-width="1.5" vector-effect="non-scaling-stroke" stroke-linejoin="round" />
                </svg>

                ${htmlDots}
            </div>
            
            ${labelsHtml}
        </div>
    `;

    container.innerHTML = chartHtml;

    if (totalTimeText) {
        totalTimeText.innerText = formatDuration(data.totalWeeklyMs);
    }
}

// Ensure rendering executes cleanly on tab activation
window.addEventListener('tabSwitched', function(e) {
    if (e.detail === 'screentime') {
        const btnDay = document.getElementById('st-tab-day');
        if(btnDay && btnDay.classList.contains('bg-blue-600')) {
            setTimeout(window.renderScreenTime, 50); 
        } else {
            setTimeout(window.renderWeeklyChart, 50);
        }
    }
});