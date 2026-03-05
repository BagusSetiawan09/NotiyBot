/**
 * @fileoverview Enterprise Schedule & Calendar Engine
 * Manages daily timeline views, task time extraction, and a collapsible monthly calendar.
 */

let currentViewDate = new Date();
let isSidebarOpen = false;

/**
 * Initializes and renders both the Daily Schedule and the Monthly Sidebar.
 */
window.renderCalendarApp = function() {
    renderDailyHeader();
    renderDailyTasks();
    renderMonthlySidebar();
};

/**
 * Renders the header for the daily view (Day name, Date, and Today badge).
 */
function renderDailyHeader() {
    const dayNameEl = document.getElementById('schedule-day-name');
    const dateTextEl = document.getElementById('schedule-date-text');
    const badgeEl = document.getElementById('schedule-today-badge');
    
    if (!dayNameEl || !dateTextEl) return;

    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    dayNameEl.innerText = days[currentViewDate.getDay()];
    dateTextEl.innerHTML = `${months[currentViewDate.getMonth()]} ${currentViewDate.getDate()} <span class="text-blue-400 ml-1 font-bold" id="schedule-today-badge"></span>`;
    
    // Check if the viewed date is strictly today
    const today = new Date();
    const isToday = (currentViewDate.getDate() === today.getDate() && 
                     currentViewDate.getMonth() === today.getMonth() && 
                     currentViewDate.getFullYear() === today.getFullYear());
                     
    document.getElementById('schedule-today-badge').innerText = isToday ? "Today" : "";
}

/**
 * Extracts the time from a task's description (e.g., "Waktu: 14:00").
 * @param {string} description - The task description string.
 * @returns {string} The extracted time (HH:MM) or "All Day" if not found.
 */
function extractTimeFromTask(description) {
    if (!description) return "All Day";
    const timeMatch = description.match(/Waktu:\s*(\d{2}:\d{2})/);
    return timeMatch ? timeMatch[1] : "All Day";
}

/**
 * Renders the list of tasks styled as a timeline for the currently selected date.
 */
function renderDailyTasks() {
    const listEl = document.getElementById('schedule-tasks-list');
    const hoursTextEl = document.getElementById('timeline-hours-text');
    if (!listEl) return;

    // Retrieve tasks from global storage
    let tasks = JSON.parse(localStorage.getItem('notiybot_tasks')) || [];
    
    // For this implementation, we map tasks that are incomplete.
    // In a fully scaled app, we would filter by a 'date' property.
    let activeTasks = tasks.filter(t => !t.completed && t.category === 'task');
    
    if (activeTasks.length === 0) {
        listEl.innerHTML = `
            <div class="flex flex-col items-center justify-center h-40 text-gray-500 mt-10">
                <svg class="w-12 h-12 mb-3 opacity-20" fill="currentColor" viewBox="0 0 24 24"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z"></path></svg>
                <p class="text-sm font-medium">No schedule for this day.</p>
                <p class="text-[10px] mt-1">Take a break or click + to add tasks.</p>
            </div>
        `;
        if(hoursTextEl) hoursTextEl.innerText = "0h scheduled";
        return;
    }

    listEl.innerHTML = "";
    
    activeTasks.forEach((task, index) => {
        let taskTime = extractTimeFromTask(task.description);
        
        // Define UI based on task priority
        let lineColor = task.priority === 'urgent' ? 'bg-red-500' : 'bg-purple-500';
        let priorityTag = task.priority === 'urgent' 
            ? `<span class="text-[9px] text-red-400 font-bold tracking-widest uppercase ml-2">• Urgent</span>` 
            : `<span class="text-[9px] text-gray-500 font-bold tracking-widest uppercase ml-2">• Task</span>`;

        listEl.innerHTML += `
            <div class="flex items-start bg-[#18181b] border border-[#3f3f46] rounded-xl p-4 hover:border-gray-500 transition-colors group">
                
                <div class="w-16 flex-shrink-0 flex flex-col items-start pr-4">
                    <span class="text-[13px] font-bold text-gray-200">${taskTime}</span>
                    <span class="text-[10px] text-gray-500 font-medium mt-0.5">${taskTime === 'All Day' ? '' : 'WIB'}</span>
                </div>
                
                <div class="w-1 ${lineColor} rounded-full h-10 mr-4 opacity-80 group-hover:opacity-100 transition-opacity"></div>
                
                <div class="flex-1 flex flex-col justify-center">
                    <div class="flex items-center">
                        <h4 class="text-sm font-bold text-gray-100 truncate">${task.text}</h4>
                        ${priorityTag}
                    </div>
                    <p class="text-[11px] text-gray-400 mt-1 line-clamp-1">${task.description ? task.description.replace(/<[^>]*>?/gm, '') : 'No details'}</p>
                </div>

                <button onclick="window.toggleTask(${task.originalIndex || index}); setTimeout(renderCalendarApp, 100);" class="w-6 h-6 rounded-full border-2 border-[#52525b] hover:border-green-500 hover:bg-green-500/10 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 ml-2">
                    <svg class="w-3.5 h-3.5 text-transparent hover:text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
                </button>
            </div>
        `;
    });

    if(hoursTextEl) hoursTextEl.innerText = `${activeTasks.length} tasks scheduled`;
}

/**
 * Renders the compact monthly calendar grid within the collapsible sidebar.
 */
function renderMonthlySidebar() {
    const grid = document.getElementById('calendar-grid');
    const monthYearText = document.getElementById('calendar-month-year');
    if (!grid || !monthYearText) return;

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
    let year = currentViewDate.getFullYear();
    let month = currentViewDate.getMonth();
    
    monthYearText.innerText = `${monthNames[month]} ${year}`;
    grid.innerHTML = "";

    let firstDay = new Date(year, month, 1).getDay();
    let daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    for (let i = 0; i < firstDay; i++) {
        grid.innerHTML += `<div></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
        let isToday = (day === today.getDate() && month === today.getMonth() && year === today.getFullYear());
        let isSelected = (day === currentViewDate.getDate());
        
        let bgClass = isSelected ? 'bg-blue-600 text-white' : (isToday ? 'bg-[#27272a] text-blue-400' : 'bg-transparent text-gray-400 hover:bg-[#27272a] hover:text-gray-200');
        
        grid.innerHTML += `
            <div onclick="selectSpecificDate(${year}, ${month}, ${day})" class="flex items-center justify-center h-8 rounded-md cursor-pointer transition-colors text-[11px] font-bold ${bgClass}">
                ${day}
            </div>
        `;
    }
}

/**
 * Toggles the visibility state of the right-side monthly calendar sidebar.
 */
window.toggleMonthlySidebar = function() {
    isSidebarOpen = !isSidebarOpen;
    const sidebar = document.getElementById('monthly-sidebar');
    const icon = document.getElementById('sidebar-toggle-icon');
    const dailyView = document.getElementById('daily-schedule-view');

    if (isSidebarOpen) {
        sidebar.classList.remove('w-0', 'opacity-0');
        sidebar.classList.add('w-[280px]', 'opacity-100');
        icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"></path>`; // Arrow Right
        dailyView.classList.add('pr-2');
        dailyView.classList.remove('pr-6');
    } else {
        sidebar.classList.add('w-0', 'opacity-0');
        sidebar.classList.remove('w-[280px]', 'opacity-100');
        icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"></path>`; // Arrow Left
        dailyView.classList.remove('pr-2');
        dailyView.classList.add('pr-6');
    }
}

/**
 * Navigates the daily schedule view by a specified number of days.
 * @param {number} step - Days to increment or decrement.
 */
window.navigateDay = function(step) {
    currentViewDate.setDate(currentViewDate.getDate() + step);
    window.renderCalendarApp();
}

/**
 * Navigates the sidebar's month view.
 * @param {number} step - Months to increment or decrement.
 */
window.changeMonth = function(step) {
    currentViewDate.setMonth(currentViewDate.getMonth() + step);
    window.renderCalendarApp();
}

/**
 * Selects a specific date from the monthly sidebar and updates the daily view.
 */
window.selectSpecificDate = function(year, month, day) {
    currentViewDate = new Date(year, month, day);
    window.renderCalendarApp();
}

/**
 * Enterprise Auto-Initializer (Mutation Observer)
 * Continuously monitors the DOM for the injection of the calendar view.
 * Eliminates the "Memuat..." bug by triggering an immediate render once the DOM is ready.
 */
const calendarDomObserver = new MutationObserver((mutations) => {
    for (let mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
            const dayNameEl = document.getElementById('schedule-day-name');
            // If the element exists and contains the default placeholder, trigger render
            if (dayNameEl && dayNameEl.innerText === "Memuat...") {
                window.renderCalendarApp();
            }
        }
    }
});

// Start observing the main application container for dynamic HTML injections
calendarDomObserver.observe(document.body, { childList: true, subtree: true });