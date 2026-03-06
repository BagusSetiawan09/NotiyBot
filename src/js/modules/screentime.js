/**
 * @fileoverview Screen Time Tracker (Aggregated Mode)
 * Captures active OS window data, aggregates durations, and renders the timeline UI.
 */

window.liveTrackingData = JSON.parse(localStorage.getItem('notiybot_screentime_today')) || [];
window.lastPollTime = Date.now(); 

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
    if (ms < 60000) return "< 1m"; 
    const totalMinutes = Math.floor(ms / 60000);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

// IPC Listener: Handle incoming OS window data and aggregate screen time
require('electron').ipcRenderer.on('os-window-update', (event, data) => {
    const appName = data.owner.name || "Unknown App";
    const windowTitle = data.title || "";
    const now = Date.now();
    
    // Calculate elapsed time since last poll
    const deltaMs = now - window.lastPollTime;
    window.lastPollTime = now;

    // Reset tracking data if a new day has started
    if (window.liveTrackingData.length > 0) {
        const firstEntryTime = new Date(window.liveTrackingData[0].startTime);
        const today = new Date();
        if (firstEntryTime.getDate() !== today.getDate() || firstEntryTime.getMonth() !== today.getMonth()) {
            window.liveTrackingData = []; 
        }
    }

    // Aggregation Logic: Check if the application exists in today's tracking data
    let existingApp = window.liveTrackingData.find(item => item.title === appName);

    if (existingApp) {
        // Existing application: Add elapsed time to duration and update subtitle
        // Cap maximum added time to 10 seconds to prevent tracking spikes after sleep/hibernation
        const addedTime = deltaMs > 10000 ? 3000 : deltaMs; 
        
        existingApp.durationMs += addedTime;
        existingApp.subtitle = windowTitle; 
    } else {
        // New application: Create a new timeline entry
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

    // Ensure data is sorted by start time
    window.liveTrackingData.sort((a, b) => a.startTime - b.startTime);

    // Persist tracking data to local storage
    localStorage.setItem('notiybot_screentime_today', JSON.stringify(window.liveTrackingData));

    // Re-render UI if the screen time tab is currently active
    const stContainer = document.getElementById('screentime-timeline-container');
    if (stContainer && stContainer.offsetParent !== null) { 
        window.renderScreenTime();
    }
});

// 🟢 NEW FUNCTION: Wipes all tracking data
window.clearScreenTime = function() {
    window.liveTrackingData = [];
    localStorage.setItem('notiybot_screentime_today', JSON.stringify([]));
    window.renderScreenTime();
    if(window.showToast) window.showToast("Activity history cleared!", "success");
}

// UI Renderer functions
window.switchScreenTimeTab = function(tab) {
    const btnDay = document.getElementById('st-tab-day');
    const btnWeek = document.getElementById('st-tab-week');
    
    if (tab === 'day') {
        btnDay.className = "px-4 py-1.5 text-sm font-bold rounded-lg bg-blue-600 text-white shadow-sm transition-all duration-300";
        btnWeek.className = "px-4 py-1.5 text-sm font-bold rounded-lg text-gray-400 hover:text-white transition-all duration-300";
    } else {
        btnWeek.className = "px-4 py-1.5 text-sm font-bold rounded-lg bg-blue-600 text-white shadow-sm transition-all duration-300";
        btnDay.className = "px-4 py-1.5 text-sm font-bold rounded-lg text-gray-400 hover:text-white transition-all duration-300";
    }
}

window.renderScreenTime = function() {
    const container = document.getElementById('screentime-timeline-container');
    const totalTimeText = document.querySelector('h2.text-5xl'); 
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

        // Dynamic vertical line styling
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
                            <h4 class="text-sm font-bold text-gray-200 tracking-wide truncate">${item.title}</h4>
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

// Ensure rendering executes cleanly on tab activation
window.addEventListener('tabSwitched', function(e) {
    if (e.detail === 'screentime') {
        setTimeout(window.renderScreenTime, 100); 
    }
});