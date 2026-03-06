/**
 * @fileoverview Enterprise Habit Tracker Module (Tabbie Clone)
 * Handles daily actionable cards and a weekly 7-day visual grid tracker.
 */

let rawHabits = localStorage.getItem('notiybot_habits');
window.habits = [];

try {
    window.habits = rawHabits ? JSON.parse(rawHabits) : [];
    // Data Migration: Ensure old data format doesn't crash the new UI
    window.habits.forEach(h => {
        if (!h.history) h.history = {}; // history maps 'YYYY-MM-DD' -> true/false
        if (!h.color) h.color = 'blue';
    });
} catch(e) {
    window.habits = [];
}

window.saveHabits = function() {
    localStorage.setItem('notiybot_habits', JSON.stringify(window.habits));
}

// Color Utility Mapper (Tailwind Classes)
const colorMap = {
    blue: { text: 'text-blue-500', bg: 'bg-blue-500', bgLight: 'bg-blue-500/10', border: 'border-blue-500/30' },
    red: { text: 'text-red-500', bg: 'bg-red-500', bgLight: 'bg-red-500/10', border: 'border-red-500/30' },
    orange: { text: 'text-orange-500', bg: 'bg-orange-500', bgLight: 'bg-orange-500/10', border: 'border-orange-500/30' },
    purple: { text: 'text-purple-500', bg: 'bg-purple-500', bgLight: 'bg-purple-500/10', border: 'border-purple-500/30' },
    teal: { text: 'text-teal-500', bg: 'bg-teal-500', bgLight: 'bg-teal-500/10', border: 'border-teal-500/30' }
};

// SVG Icon Helper
function getHabitSvg(type) {
    switch(type) {
        case 'book': return `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>`;
        case 'dumbbell': return `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"></path></svg>`;
        case 'pill': return `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>`;
        case 'brain': return `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>`;
        default: return `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3c.538 0 1.053.25 1.385.674l5.36 6.84c1.472 1.88 1.472 4.606 0 6.486a5 5 0 01-7.745 0c-1.472-1.88-1.472-4.606 0-6.486l5.36-6.84A1.751 1.751 0 0112 3z"></path></svg>`;
    }
}

// Get array of 7 days (Monday to Sunday) for the current week
function getCurrentWeek() {
    const today = new Date();
    const currentDay = today.getDay() === 0 ? 7 : today.getDay(); // Make Sunday = 7
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

window.renderHabitsApp = function() {
    const actionContainer = document.getElementById('habits-action-container');
    const gridContainer = document.getElementById('habits-grid-container');
    const daysHeader = document.getElementById('weekly-days-header');
    if (!actionContainer || !gridContainer) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const weekDays = getCurrentWeek();

    // 1. Render Header Stats
    const activeCount = window.habits.length;
    let doneTodayCount = 0;
    window.habits.forEach(h => { if (h.history && h.history[todayStr]) doneTodayCount++; });
    
    document.getElementById('habit-header-stats').innerText = `${doneTodayCount}/${activeCount} done today`;
    document.getElementById('habit-header-active').innerText = `${activeCount} active`;

    // 2. Render Actionable Cards (Top Section)
    actionContainer.innerHTML = "";
    const pendingHabits = window.habits.filter(h => !h.history[todayStr]);
    
    if (pendingHabits.length === 0) {
        actionContainer.innerHTML = `<div class="p-6 rounded-2xl bg-[#18181b] border border-[#3f3f46] text-center text-gray-500 font-medium">All caught up for today! 🎉</div>`;
    } else {
        pendingHabits.forEach(habit => {
            const theme = colorMap[habit.color] || colorMap.blue;
            actionContainer.innerHTML += `
                <div class="bg-[#18181b] border border-[#3f3f46] rounded-2xl p-4 flex flex-col gap-4 group">
                    <div class="flex justify-between items-center">
                        <div class="flex items-center gap-3">
                            <div class="${theme.text} opacity-80">${getHabitSvg(habit.icon)}</div>
                            <span class="font-bold text-white text-base">${habit.name}</span>
                        </div>
                        <span class="text-xs font-bold text-gray-500 tracking-wider uppercase">Daily</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="markHabitDone('${habit.id}', '${todayStr}')" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${theme.bgLight} ${theme.text} ${theme.border} border hover:bg-opacity-30">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
                            Did it
                        </button>
                        <button onclick="showToast('Snoozed for 1 hour', 'success')" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#27272a] hover:bg-[#3f3f46] text-gray-300 transition-all border border-transparent">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> Snooze
                        </button>
                        <button onclick="showToast('Skipped for today', 'warning')" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#27272a] hover:bg-[#3f3f46] text-gray-300 transition-all border border-transparent">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z"></path></svg> Skip
                        </button>
                    </div>
                </div>
            `;
        });
    }

    // 3. Render Weekly Grid Header (M T W T F S S)
    daysHeader.innerHTML = "";
    weekDays.forEach(day => {
        const bgClass = day.isToday ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500';
        daysHeader.innerHTML += `<div class="w-8 flex justify-center items-center text-[10px] font-bold py-1 rounded-md ${bgClass}">${day.label}</div>`;
    });

    // 4. Render Weekly Grid Rows
    gridContainer.innerHTML = "";
    window.habits.forEach(habit => {
        const theme = colorMap[habit.color] || colorMap.blue;
        const totalDone = Object.keys(habit.history).length; // Fake simple streak counter

        let boxesHtml = "";
        weekDays.forEach(day => {
            const isDone = habit.history[day.dateStr];
            
            if (isDone) {
                // Done box (Filled Color with checkmark)
                boxesHtml += `<button onclick="markHabitUndone('${habit.id}', '${day.dateStr}')" class="w-8 h-8 rounded-[10px] ${theme.bg} flex items-center justify-center shadow-sm transform hover:scale-105 transition-all" title="${day.dateStr}"><svg class="w-4 h-4 text-white drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg></button>`;
            } else if (day.isPast || day.isToday) {
                // Missed or Today Not Done (Dark grey box with faint X on hover)
                boxesHtml += `<button onclick="markHabitDone('${habit.id}', '${day.dateStr}')" class="w-8 h-8 rounded-[10px] bg-[#27272a] hover:bg-[#3f3f46] flex items-center justify-center transition-all group border border-transparent" title="${day.dateStr}"><svg class="w-3 h-3 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>`;
            } else {
                // Future days (Empty outlined box)
                boxesHtml += `<div class="w-8 h-8 rounded-[10px] border border-[#3f3f46] flex items-center justify-center opacity-30"></div>`;
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
                <div class="flex gap-2">
                    ${boxesHtml}
                </div>
            </div>
        `;
    });
}

// Logic to check/uncheck habits
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
        setTimeout(window.renderHabitsApp, 150); 
    }
});