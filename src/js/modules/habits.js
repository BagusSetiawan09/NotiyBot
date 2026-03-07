/**
 * @fileoverview Enterprise Habit Tracker Module
 * Handles local daily routines and 100% REAL-TIME dynamic GitHub API integration.
 */

let rawHabits = localStorage.getItem('notiybot_habits');
let ghConfig = JSON.parse(localStorage.getItem('notiybot_github_config')) || { username: '', token: '' };
window.habits = [];

try {
    window.habits = rawHabits ? JSON.parse(rawHabits) : [];
    window.habits.forEach(h => {
        if (!h.history) h.history = {}; 
        if (!h.color) h.color = 'blue';
    });
} catch(e) { window.habits = []; }

window.saveHabits = function() {
    localStorage.setItem('notiybot_habits', JSON.stringify(window.habits));
}

const colorMap = {
    blue: { text: 'text-blue-500', bg: 'bg-blue-500', bgLight: 'bg-blue-500/10', border: 'border-blue-500/30' },
    red: { text: 'text-red-500', bg: 'bg-red-500', bgLight: 'bg-red-500/10', border: 'border-red-500/30' },
    orange: { text: 'text-orange-500', bg: 'bg-orange-500', bgLight: 'bg-orange-500/10', border: 'border-orange-500/30' },
    purple: { text: 'text-purple-500', bg: 'bg-purple-500', bgLight: 'bg-purple-500/10', border: 'border-purple-500/30' },
    teal: { text: 'text-teal-500', bg: 'bg-teal-500', bgLight: 'bg-teal-500/10', border: 'border-teal-500/30' }
};

function getHabitSvg(type) {
    switch(type) {
        case 'book': return `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>`;
        case 'dumbbell': return `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"></path></svg>`;
        case 'pill': return `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>`;
        case 'brain': return `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>`;
        default: return `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3c.538 0 1.053.25 1.385.674l5.36 6.84c1.472 1.88 1.472 4.606 0 6.486a5 5 0 01-7.745 0c-1.472-1.88-1.472-4.606 0-6.486l5.36-6.84A1.751 1.751 0 0112 3z"></path></svg>`;
    }
}

function getCurrentWeek() {
    const today = new Date();
    const currentDay = today.getDay() === 0 ? 7 : today.getDay(); 
    const monday = new Date(today);
    monday.setDate(today.getDate() - currentDay + 1);

    const week = [];
    const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    
    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const isToday = dateStr === today.toISOString().split('T')[0];
        const isPast = d < new Date(today.setHours(0,0,0,0));
        week.push({ label: dayLabels[i], dateStr, isToday, isPast });
    }
    return week;
}

window.switchHabitTab = function(tab) {
    const btnHabits = document.getElementById('tab-habits');
    const btnGithub = document.getElementById('tab-github');
    const containerHabits = document.getElementById('habits-view-container');
    const containerGithub = document.getElementById('github-view-container');
    const headerSubtitle = document.getElementById('header-subtitle');
    
    if (tab === 'habits') {
        btnHabits.className = "px-4 py-1.5 text-sm font-bold rounded-md bg-blue-600 text-white shadow-sm transition-all duration-300";
        btnGithub.className = "px-4 py-1.5 text-sm font-bold rounded-md text-gray-400 hover:text-white transition-all duration-300 flex items-center gap-2";
        containerHabits.classList.remove('hidden');
        containerHabits.classList.add('flex');
        containerGithub.classList.add('hidden');
        containerGithub.classList.remove('flex');
        headerSubtitle.style.opacity = '1';
        window.renderHabitsApp();
    } else {
        btnGithub.className = "px-4 py-1.5 text-sm font-bold rounded-md bg-[#242427] border border-[#3f3f46] text-white shadow-sm transition-all duration-300 flex items-center gap-2";
        btnHabits.className = "px-4 py-1.5 text-sm font-bold rounded-md text-gray-400 hover:text-white transition-all duration-300";
        containerHabits.classList.add('hidden');
        containerHabits.classList.remove('flex');
        containerGithub.classList.remove('hidden');
        containerGithub.classList.add('flex');
        headerSubtitle.style.opacity = '0'; 
        window.renderGitHubDashboard();
    }
}

// GITHUB SETTINGS MODAL
window.openGitHubConfig = function() {
    document.getElementById('gh-username-input').value = ghConfig.username || '';
    document.getElementById('gh-token-input').value = ghConfig.token || '';
    const modal = document.getElementById('modal-github-config');
    if(modal) {
        modal.classList.remove('opacity-0', 'pointer-events-none');
        document.getElementById('github-config-content').classList.remove('scale-95');
    }
}

window.closeGitHubConfig = function() {
    const modal = document.getElementById('modal-github-config');
    if(modal) {
        modal.classList.add('opacity-0', 'pointer-events-none');
        document.getElementById('github-config-content').classList.add('scale-95');
    }
}

window.saveGitHubConfig = function() {
    const username = document.getElementById('gh-username-input').value.trim();
    const token = document.getElementById('gh-token-input').value.trim();
    
    if(!username) {
        if(window.showToast) window.showToast("Username is required!", "error");
        return;
    }
    
    ghConfig = { username, token };
    localStorage.setItem('notiybot_github_config', JSON.stringify(ghConfig));
    closeGitHubConfig();
    window.renderGitHubDashboard();
    if(window.showToast) window.showToast("GitHub configured!", "success");
}

// CORE: DYNAMIC REAL-TIME GITHUB ENGINE
window.renderGitHubDashboard = async function() {
    if (!ghConfig || !ghConfig.username) {
        return; 
    }

    const username = ghConfig.username;
    const token = ghConfig.token;
    
    // 1. Render Cache-Busted Heatmap
    renderHeatmapSVG(username);

    // 2. Fetch and Parse Real Events Data
    try {
        const headers = { 'Accept': 'application/vnd.github.v3+json' };
        if (token) headers['Authorization'] = `token ${token}`;

        // Fetch up to 100 recent events
        const response = await fetch(`https://api.github.com/users/${username}/events?per_page=100`, { headers });
        
        if (!response.ok) throw new Error("Failed to fetch events");
        const events = await response.json();
        
        parseAndRenderDynamicActivity(events, username);

    } catch (e) {
        console.error("Failed to load GitHub activity:", e);
        document.getElementById('gh-dynamic-overview').innerHTML = `<p class="text-red-500 text-xs mt-4">Failed to load API data. Check token/username or internet connection.</p>`;
    }
}

async function renderHeatmapSVG(username) {
    const container = document.getElementById('github-grid-container');
    try {
        // Cache Buster agar selalu narik data terbaru hari ini
        const cacheBuster = new Date().getTime();
        const response = await fetch(`https://ghchart.rshah.org/${username}?v=${cacheBuster}`, { cache: 'no-store' });
        if (!response.ok) throw new Error("SVG Network Error");
        let svgData = await response.text();
        
        // BUANG atribut yang bikin gepeng
        svgData = svgData.replace(/width="[^"]+"/i, 'width="100%"');
        svgData = svgData.replace(/height="[^"]+"/i, 'height="100%"');

        // STRING REPLACE MURNI: Paksa warna putih jadi Dark Mode GitHub (Anti gagal)
        svgData = svgData.replace(/#ebedf0/gi, '#161b22'); 
        svgData = svgData.replace(/#9be9a8/gi, '#0e4429'); 
        svgData = svgData.replace(/#40c463/gi, '#006d32'); 
        svgData = svgData.replace(/#30a14e/gi, '#26a641'); 
        svgData = svgData.replace(/#216e39/gi, '#39d353'); 
        svgData = svgData.replace(/#767676/gi, '#8b949e'); 

        container.innerHTML = `
            <style>
                .github-authentic-wrapper { width: 100%; overflow-x: auto; padding-bottom: 5px; }
                .github-authentic-wrapper svg { min-width: 720px; display: block; margin: 0; }
                .github-authentic-wrapper svg text { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 10px; }
                .github-authentic-wrapper svg rect { rx: 2px; ry: 2px; shape-rendering: geometricPrecision; outline: 1px solid rgba(255, 255, 255, 0.04); outline-offset: -1px; }
            </style>
            <div class="github-authentic-wrapper fade-in">${svgData}</div>
        `;
    } catch(e) {
        container.innerHTML = `<div class="w-full flex justify-center text-red-500 text-xs font-bold tracking-widest mt-4">HEATMAP LOAD ERROR</div>`;
    }
}

// MESIN KALKULASI GITHUB
function parseAndRenderDynamicActivity(events, username) {
    let repoSet = new Set();
    let stats = { commits: 0, prs: 0, issues: 0, reviews: 0 };
    let repoActivity = {}; 

    events.forEach(ev => {
        let points = 0; // Poin kontribusi

        if (ev.type === 'PushEvent') {
            points = ev.payload.size || (ev.payload.commits ? ev.payload.commits.length : 1);
            stats.commits += points;
        } else if (ev.type === 'PullRequestEvent') { 
            stats.prs++; points = 1;
        } else if (ev.type === 'IssuesEvent') { 
            stats.issues++; points = 1;
        } else if (ev.type === 'PullRequestReviewEvent') { 
            stats.reviews++; points = 1;
        } else if (ev.type === 'CreateEvent') {
            points = 1; 
        }

        // Catat repo yang aktif
        if (points > 0) {
            let repoName = ev.repo.name;
            repoSet.add(repoName);
            if(!repoActivity[repoName]) repoActivity[repoName] = 0;
            repoActivity[repoName] += points;
        }
    });

    let totalContributions = stats.commits + stats.prs + stats.issues + stats.reviews;
    let totalDenominator = totalContributions === 0 ? 1 : totalContributions; 

    let pctCommits = Math.round((stats.commits / totalDenominator) * 100);
    let pctPRs = Math.round((stats.prs / totalDenominator) * 100);
    let pctIssues = Math.round((stats.issues / totalDenominator) * 100);
    let pctReviews = Math.round((stats.reviews / totalDenominator) * 100);

    // 1. RENDER OVERVIEW (LEFT SIDE)
    let repoArray = Array.from(repoSet);
    let topRepos = repoArray.slice(0, 3);
    let restCount = repoArray.length > 3 ? repoArray.length - 3 : 0;

    let repoLinksHtml = topRepos.map(r => `<a href="https://github.com/${r}" target="_blank" class="text-[#58a6ff] hover:underline font-bold">${r}</a>`).join(', ');
    if (restCount > 0) repoLinksHtml += ` and ${restCount} other repositories`;

    let overviewHtml = `
        <div class="flex-1">
            <h4 class="text-[#c9d1d9] text-sm font-medium mb-4">Activity overview</h4>
            <div class="flex gap-3">
                <svg class="text-[#8b949e] w-4 h-4 mt-0.5 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1h-8a1 1 0 00-1 1v6.708A2.486 2.486 0 014.5 9h8V1.5z"></path></svg>
                <p class="text-[#c9d1d9] text-sm leading-relaxed">
                    Contributed to ${repoLinksHtml || 'no recent repositories.'}
                </p>
            </div>
        </div>
        <div class="flex-1 md:border-l border-[#30363d] md:pl-8 flex items-center justify-center py-4">
            <div class="relative w-48 h-32 flex items-center justify-center">
                <div class="absolute w-full h-[2px] bg-[#2ea043] rounded-full opacity-60"></div>
                <div class="absolute h-full w-[2px] bg-[#2ea043] rounded-full opacity-60"></div>
                <div class="absolute w-2 h-2 bg-[#39d353] rounded-full border-2 border-[#0d1117] shadow-[0_0_8px_#39d353]"></div>
                
                <span class="absolute left-[-24px] text-[10px] text-[#8b949e] text-center leading-tight font-bold text-white">${pctCommits}%<br><span class="font-normal text-[#8b949e]">Commits</span></span>
                <span class="absolute right-[-14px] text-[10px] text-[#8b949e] text-center leading-tight font-bold text-white">${pctIssues}%<br><span class="font-normal text-[#8b949e]">Issues</span></span>
                <span class="absolute top-[-15px] text-[10px] text-[#8b949e] text-center leading-tight font-bold text-white">${pctReviews}%<br><span class="font-normal text-[#8b949e]">Reviews</span></span>
                <span class="absolute bottom-[-14px] text-[10px] text-[#8b949e] text-center leading-tight font-bold text-white">${pctPRs}%<br><span class="font-normal text-[#8b949e]">PRs</span></span>
            </div>
        </div>
    `;
    document.getElementById('gh-dynamic-overview').innerHTML = overviewHtml;

    // . RENDER ACTIVITY LIST (BOTTOM SIDE)
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const currentMonth = monthNames[new Date().getMonth()];
    const currentYear = new Date().getFullYear();

    let listHtml = '';
    const committedRepos = Object.keys(repoActivity);
    
    if (committedRepos.length > 0) {
        let repoBlockHtml = '';
        
        // Urutkan dari kontribusi terbanyak
        committedRepos.sort((a, b) => repoActivity[b] - repoActivity[a]).forEach(repo => {
            let pts = repoActivity[repo];
            // Visual green bar width dihitung secara proporsional
            let barWidth = Math.min(100, Math.max(8, (pts / (totalContributions || 1)) * 100)); 
            
            repoBlockHtml += `
                <div class="mt-3 ml-7 flex items-center justify-between group/item">
                    <a href="https://github.com/${repo}" target="_blank" class="text-[#58a6ff] hover:underline text-[13px] font-medium truncate max-w-[200px]">${repo}</a>
                    <div class="flex items-center gap-3">
                        <span class="text-[11px] text-[#8b949e] whitespace-nowrap">${pts} contributions</span>
                        <div class="w-24 h-2 rounded-full bg-[#30363d] overflow-hidden flex justify-end">
                            <div class="h-full bg-[#2ea043] group-hover/item:bg-[#39d353] transition-colors" style="width: ${barWidth}%"></div>
                        </div>
                    </div>
                </div>
            `;
        });

        listHtml = `
            <div class="relative border-l border-[#30363d] ml-[5px] pl-6 pb-2">
                <div class="absolute w-[11px] h-[11px] bg-[#30363d] border-[3px] border-[#0d1117] rounded-full -left-[6px] top-1"></div>
                <span class="text-xs font-bold text-[#c9d1d9]">${currentMonth} <span class="font-normal text-[#8b949e]">${currentYear}</span></span>
                
                <div class="mt-4 bg-[#0d1117] border border-[#30363d] rounded-lg p-4 transition hover:bg-[#161b22]">
                    <div class="flex items-center justify-between group">
                        <div class="flex items-center gap-3">
                            <svg class="text-[#8b949e] w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M10.5 7.75a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zm1.43.75a4.002 4.002 0 01-7.86 0H.75a.75.75 0 110-1.5h3.32a4.001 4.001 0 017.86 0h3.32a.75.75 0 110 1.5h-3.32z"></path></svg>
                            <span class="text-[#c9d1d9] text-[13px] font-bold">Made ${totalContributions} contributions in ${committedRepos.length} repositories</span>
                        </div>
                        <button class="text-[#8b949e] hover:text-[#58a6ff] transition">
                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8a2 2 0 100-4 2 2 0 000 4zm0 6a2 2 0 100-4 2 2 0 000 4zm0 6a2 2 0 100-4 2 2 0 000 4z"></path></svg>
                        </button>
                    </div>
                    ${repoBlockHtml}
                </div>
            </div>
        `;
    } else {
        listHtml = `
        <div class="relative border-l border-[#30363d] ml-[5px] pl-6 pb-2">
            <div class="absolute w-[11px] h-[11px] bg-[#30363d] border-[3px] border-[#0d1117] rounded-full -left-[6px] top-1"></div>
            <span class="text-xs font-bold text-[#c9d1d9]">${currentMonth} <span class="font-normal text-[#8b949e]">${currentYear}</span></span>
            <p class="text-[#8b949e] text-xs italic mt-4">No recent activity found. Make sure your PAT has 'repo' permissions.</p>
        </div>`;
    }

    document.getElementById('gh-dynamic-activity-list').innerHTML = listHtml;
}

window.refreshGitHubGrid = function() {
    window.renderGitHubDashboard();
    if(window.showToast) window.showToast("Fetching latest data from GitHub...", "success");
}

// LOCAL HABITS ENGINE
window.renderHabitsApp = function() {
    const actionContainer = document.getElementById('habits-action-container');
    const gridContainer = document.getElementById('habits-grid-container');
    const daysHeader = document.getElementById('weekly-days-header');
    if (!actionContainer || !gridContainer) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const weekDays = getCurrentWeek();

    const activeCount = window.habits.length;
    let doneTodayCount = 0;
    window.habits.forEach(h => { if (h.history && h.history[todayStr]) doneTodayCount++; });
    
    const statsEl = document.getElementById('habit-header-stats');
    const activeEl = document.getElementById('habit-header-active');
    if(statsEl) statsEl.innerText = `${doneTodayCount}/${activeCount} done today`;
    if(activeEl) activeEl.innerText = `${activeCount} active`;

    actionContainer.innerHTML = "";
    const pendingHabits = window.habits.filter(h => !h.history[todayStr]);
    
    if (pendingHabits.length === 0) {
        actionContainer.innerHTML = `<div class="p-6 rounded-lg bg-[#18181b] border border-[#3f3f46] text-center text-gray-500 font-medium">All caught up for today! 🎉</div>`;
    } else {
        pendingHabits.forEach(habit => {
            const theme = colorMap[habit.color] || colorMap.blue;
            actionContainer.innerHTML += `
                <div class="bg-[#18181b] border border-[#3f3f46] rounded-lg p-4 flex flex-col gap-4 group">
                    <div class="flex justify-between items-center">
                        <div class="flex items-center gap-3">
                            <div class="${theme.text} opacity-80">${getHabitSvg(habit.icon)}</div>
                            <span class="font-bold text-white text-base">${habit.name}</span>
                        </div>
                        <span class="text-xs font-bold text-gray-500 tracking-wider uppercase">Daily</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="markHabitDone('${habit.id}', '${todayStr}')" class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${theme.bgLight} ${theme.text} ${theme.border} border hover:bg-opacity-30">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg> Did it
                        </button>
                        <button onclick="showToast('Snoozed for 1 hour', 'success')" class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-[#27272a] hover:bg-[#3f3f46] text-gray-300 transition-all border border-transparent">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> Snooze
                        </button>
                        <button onclick="showToast('Skipped for today', 'warning')" class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-[#27272a] hover:bg-[#3f3f46] text-gray-300 transition-all border border-transparent">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z"></path></svg> Skip
                        </button>
                    </div>
                </div>
            `;
        });
    }

    daysHeader.innerHTML = "";
    weekDays.forEach(day => {
        const bgClass = day.isToday ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500';
        daysHeader.innerHTML += `<div class="w-8 flex justify-center items-center text-[10px] font-bold py-1 rounded-md ${bgClass}">${day.label}</div>`;
    });

    gridContainer.innerHTML = "";
    window.habits.forEach(habit => {
        const theme = colorMap[habit.color] || colorMap.blue;
        const totalDone = Object.keys(habit.history).length; 

        let boxesHtml = "";
        weekDays.forEach(day => {
            const isDone = habit.history[day.dateStr];
            if (isDone) {
                boxesHtml += `<button onclick="markHabitUndone('${habit.id}', '${day.dateStr}')" class="w-8 h-8 rounded-md ${theme.bg} flex items-center justify-center shadow-sm transform hover:scale-105 transition-all" title="${day.dateStr}"><svg class="w-4 h-4 text-white drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg></button>`;
            } else if (day.isPast || day.isToday) {
                boxesHtml += `<button onclick="markHabitDone('${habit.id}', '${day.dateStr}')" class="w-8 h-8 rounded-md bg-[#27272a] hover:bg-[#3f3f46] flex items-center justify-center transition-all group border border-transparent" title="${day.dateStr}"><svg class="w-3 h-3 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>`;
            } else {
                boxesHtml += `<div class="w-8 h-8 rounded-md border border-[#3f3f46] flex items-center justify-center opacity-30"></div>`;
            }
        });

        gridContainer.innerHTML += `
            <div class="flex items-center justify-between py-2 border-b border-[#3f3f46]/30 last:border-0 group">
                <div class="flex items-center gap-3 w-1/3">
                    <div class="${theme.text} opacity-80">${getHabitSvg(habit.icon)}</div>
                    <div class="flex flex-col">
                        <span class="font-bold text-white text-sm truncate">${habit.name} <span class="text-xs ${theme.text} opacity-80 ml-1">${totalDone}/66d</span></span>
                        <span class="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Daily</span>
                    </div>
                </div>
                <div class="flex gap-2">${boxesHtml}</div>
            </div>
        `;
    });
}

window.markHabitDone = function(id, dateStr) {
    const habit = window.habits.find(h => h.id === id);
    if (habit) {
        habit.history[dateStr] = true;
        window.saveHabits();
        window.renderHabitsApp();
        if(window.showToast) window.showToast("Awesome! Habit marked as done.", "success");
    }
}

window.markHabitUndone = function(id, dateStr) {
    const habit = window.habits.find(h => h.id === id);
    if (habit) {
        delete habit.history[dateStr];
        window.saveHabits();
        window.renderHabitsApp();
    }
}

window.openHabitModal = function() {
    document.getElementById('habit-name-input').value = "";
    const modal = document.getElementById('modal-create-habit');
    if(modal) {
        modal.classList.remove('opacity-0', 'pointer-events-none');
        document.getElementById('habit-modal-content').classList.remove('scale-95');
        setTimeout(() => document.getElementById('habit-name-input').focus(), 100);
    }
}

window.closeHabitModal = function() {
    const modal = document.getElementById('modal-create-habit');
    if(modal) {
        modal.classList.add('opacity-0', 'pointer-events-none');
        document.getElementById('habit-modal-content').classList.add('scale-95');
    }
}

window.submitNewHabit = function() {
    const nameInput = document.getElementById('habit-name-input');
    const name = nameInput ? nameInput.value.trim() : '';

    const colorInput = document.querySelector('input[name="habit_color"]:checked');
    const color = colorInput ? colorInput.value : 'blue';
    
    const iconInput = document.querySelector('input[name="habit_icon"]:checked');
    const icon = iconInput ? iconInput.value : 'water';

    if (!name) {
        if(window.showToast) window.showToast("Habit Name is required!", "error");
        return;
    }

    const newHabit = {
        id: 'habit_' + Date.now(),
        name: name,
        color: color,
        icon: icon,
        history: {}
    };

    window.habits.push(newHabit);
    window.saveHabits();
    
    window.closeHabitModal();
    window.renderHabitsApp();
    
    if(window.showToast) window.showToast("Habit added! Time to build that streak.", "success");
}

window.addEventListener('tabSwitched', function(e) {
    if (e.detail === 'habits') {
        setTimeout(() => {
            const btnGithub = document.getElementById('tab-github');
            if(btnGithub && btnGithub.classList.contains('bg-[#242427]')) {
                window.renderGitHubDashboard();
            } else {
                window.renderHabitsApp();
            }
        }, 100); 
    }
});