/**
 * Core Task Management & Focus Timer Module
 */

window.activeTodoTab = 'todo'; 
window.tasks = JSON.parse(localStorage.getItem('notiybot_tasks')) || [];
window.tempFileName = "";
window.tempFilePath = "";

// FOCUS TIMER GLOBALS
window.focusInterval = null;
window.focusDefaultMinutes = 25;
window.focusTotalSeconds = window.focusDefaultMinutes * 60;
window.focusSecondsLeft = window.focusTotalSeconds;
window.isFocusRunning = false;
window.currentFocusTaskIndex = null;

window.tasks = window.tasks.map(t => ({ ...t, category: t.category || 'todo' }));

window.switchTodoTab = function(tab) {
    window.activeTodoTab = tab;
    
    ['todo', 'task', 'focus', 'history'].forEach(t => {
        const btn = document.getElementById(`tab-${t}`);
        if(btn) {
            btn.className = t === tab 
                ? "flex-1 py-1.5 text-sm font-medium rounded-lg bg-[#3f3f46] text-white shadow-sm transition-all duration-300"
                : "flex-1 py-1.5 text-sm font-medium rounded-lg text-gray-400 hover:text-white transition-all duration-300";
            if (t === 'focus') btn.classList.add('text-blue-400');
        }
    });

    const inputTodo = document.getElementById('todo-input-container');
    const btnShowTask = document.getElementById('btn-show-task-form');
    const formTask = document.getElementById('task-input-container');
    const focusContainer = document.getElementById('focus-container');
    const listContainer = document.getElementById('todo-list-container');
    
    if(inputTodo && btnShowTask && formTask && focusContainer) {
        inputTodo.style.display = 'none';
        btnShowTask.style.display = 'none';
        formTask.style.display = 'none';
        focusContainer.style.display = 'none';
        listContainer.style.display = 'block';

        if(tab === 'todo') {
            inputTodo.style.display = 'flex';
        } else if(tab === 'task') {
            btnShowTask.style.display = 'block'; 
        } else if(tab === 'focus') {
            focusContainer.style.display = 'flex';
            listContainer.style.display = 'none'; // Sembunyikan list saat fokus
            updateFocusUI();
        }
    }
    
    if (tab !== 'focus') window.renderTasks();
}

window.toggleTaskForm = function(show) {
    const btnShowTask = document.getElementById('btn-show-task-form');
    const formTask = document.getElementById('task-input-container');
    
    if(show) {
        btnShowTask.style.display = 'none';
        formTask.style.display = 'block';
        document.getElementById('task-title').focus();
    } else {
        btnShowTask.style.display = 'block';
        formTask.style.display = 'none';
        
        document.getElementById('task-title').value = "";
        document.getElementById('task-desc').value = "";
        document.getElementById('task-priority').value = "normal";
        document.getElementById('task-file').value = "";
        if(document.getElementById('task-start')) document.getElementById('task-start').value = "";
        if(document.getElementById('task-deadline')) document.getElementById('task-deadline').value = "";
        const nameEl = document.getElementById('task-file-name');
        if(nameEl) { nameEl.innerText = "Lampirkan File"; nameEl.classList.remove('text-blue-400'); }
        window.tempFileName = "";
        window.tempFilePath = "";
    }
}

window.updateFileName = function(input) {
    const nameEl = document.getElementById('task-file-name');
    if (input.files && input.files.length > 0) {
        let fileObj = input.files[0];
        window.tempFileName = fileObj.name;
        window.tempFilePath = fileObj.path || "";
        try {
            const { webUtils } = require('electron');
            if (webUtils && webUtils.getPathForFile) {
                let absolutePath = webUtils.getPathForFile(fileObj);
                if (absolutePath) window.tempFilePath = absolutePath;
            }
        } catch(e) {}
        nameEl.innerText = window.tempFileName;
        nameEl.classList.add('text-blue-400');
    } else {
        window.tempFileName = "";
        window.tempFilePath = "";
        nameEl.innerText = "Lampirkan File";
        nameEl.classList.remove('text-blue-400');
    }
}

window.renderTasks = function() {
    const container = document.getElementById('todo-list-container');
    if (!container || window.activeTodoTab === 'focus') return;
    container.innerHTML = "";

    let filteredTasks = window.activeTodoTab === 'history' 
        ? window.tasks.map((t, i) => ({...t, originalIndex: i})).filter(t => t.completed)
        : window.tasks.map((t, i) => ({...t, originalIndex: i})).filter(t => !t.completed && t.category === window.activeTodoTab);

    if (filteredTasks.length === 0) {
        let emptyMsg = window.activeTodoTab === 'history' ? "No history yet." : `There isn't any yet ${window.activeTodoTab}.`;
        container.innerHTML = `<div class="text-center py-10 bg-[#242427] border border-dashed border-[#3f3f46] rounded-xl flex flex-col items-center justify-center text-gray-500"><p class="text-sm font-medium">${emptyMsg}</p></div>`;
        return;
    }

    filteredTasks.forEach(task => {
        const index = task.originalIndex;
        const isDone = task.completed;
        const bgStyle = isDone ? "bg-[#18181b] border-[#3f3f46]/50 opacity-80" : "bg-[#242427] border-[#3f3f46] hover:border-blue-500/50 hover:shadow-lg";
        const titleStyle = isDone ? "text-gray-500 line-through" : "text-gray-100";
        
        let checkIcon = isDone 
            ? `<button onclick="toggleTask(${index}); event.stopPropagation();" title="Kembalikan" class="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 hover:bg-blue-500 hover:text-white transition mt-0.5"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg></button>`
            : `<button onclick="toggleTask(${index}); event.stopPropagation();" title="Selesaikan" class="flex-shrink-0 w-6 h-6 rounded-full border-2 border-[#52525b] hover:border-blue-400 transition hover:bg-blue-500/20 flex items-center justify-center mt-0.5"></button>`;

        // UPDATE: Tombol Start Focus ditambahkan di Task
        let focusBtn = (!isDone && task.category === 'task') 
            ? `<button onclick="startFocusMode(${index}); event.stopPropagation();" class="text-blue-400 hover:text-white hover:bg-blue-500 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-widest transition border border-blue-500/30 group-hover:border-blue-500/70 shadow-sm"><svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4l12 6-12 6z"></path></svg> FOCUS</button>`
            : '';

        let deleteBtn = `<button onclick="deleteTask(${index}); event.stopPropagation();" class="text-gray-500 hover:text-red-500 p-1.5 rounded-md hover:bg-red-500/10 transition opacity-0 group-hover:opacity-100 ml-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>`;

        if (task.category === 'todo') {
            container.innerHTML += `<div class="flex items-center justify-between p-3.5 rounded-xl border transition-all duration-300 ${bgStyle} group"><div class="flex items-start gap-3 flex-1">${checkIcon}<p class="font-medium text-sm transition-all duration-300 ${titleStyle} pt-0.5">${task.text}</p></div>${deleteBtn}</div>`;
        } else {
            let priorityBadge = task.priority === 'urgent' && !isDone ? `<span class="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Urgent</span>` : '';
            let deadlineBadge = task.deadline && !isDone ? `<span class="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider flex items-center gap-1.5"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> ${task.deadline.replace('T', ' ')}</span>` : '';
            let descHtml = task.description && !isDone ? `<p class="text-xs text-gray-400 mt-1.5 leading-relaxed line-clamp-2">${task.description}</p>` : '';

            container.innerHTML += `
                <div class="flex items-start justify-between p-4 rounded-xl border transition-all duration-300 ${bgStyle} group relative overflow-hidden">
                    ${task.priority === 'urgent' && !isDone ? '<div class="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>' : ''}
                    <div class="flex items-start gap-3 flex-1 cursor-pointer group/btn" onclick="openTaskDetail(${index})">
                        ${checkIcon}
                        <div class="flex-1">
                            <div class="flex flex-wrap items-center gap-2 mb-0.5">
                                <h4 class="font-bold text-sm transition-all duration-300 ${titleStyle}">${task.text}</h4>
                                ${priorityBadge} ${deadlineBadge}
                            </div>
                            ${descHtml}
                            <div class="flex items-center mt-3 gap-2">
                                ${focusBtn}
                            </div>
                        </div>
                    </div>
                    ${deleteBtn}
                </div>`;
        }
    });
}

// FOCUS TIMER LOGIC START
window.startFocusMode = function(index) {
    window.currentFocusTaskIndex = index;
    const task = window.tasks[index];
    
    // Stop running timer if any
    if (window.isFocusRunning) window.stopFocusTimer();
    
    // Set text UI
    document.getElementById('focus-task-title').innerText = task.text;
    
    // Switch to focus tab automatically
    window.switchTodoTab('focus');
}

window.setCustomFocusTime = function() {
    const inputTime = document.getElementById('focus-custom-time').value;
    const mins = parseInt(inputTime);
    if (!isNaN(mins) && mins > 0) {
        window.focusDefaultMinutes = mins;
        if (window.isFocusRunning) window.stopFocusTimer();
        window.focusTotalSeconds = mins * 60;
        window.focusSecondsLeft = mins * 60;
        window.updateFocusUI();
        if(window.showToast) window.showToast(`Timer is set to ${mins} Minute`, "success");
    }
}

window.toggleFocusTimer = function() {
    if (window.isFocusRunning) {
        // Pause
        clearInterval(window.focusInterval);
        window.isFocusRunning = false;
    } else {
        // Play
        if (window.focusSecondsLeft <= 0) {
            window.focusSecondsLeft = window.focusTotalSeconds; // Reset jika sudah 0
        }
        window.isFocusRunning = true;
        window.focusInterval = setInterval(() => {
            window.focusSecondsLeft--;
            window.updateFocusUI();
            
            if (window.focusSecondsLeft <= 0) {
                clearInterval(window.focusInterval);
                window.isFocusRunning = false;
                window.updateFocusUI();
                if(window.showToast) window.showToast("Focus time is up! Take a break, boss!", "success");
                // Optional: Play a sound here
            }
        }, 1000);
    }
    window.updateFocusUI();
}

window.stopFocusTimer = function() {
    clearInterval(window.focusInterval);
    window.isFocusRunning = false;
    window.focusSecondsLeft = window.focusTotalSeconds;
    window.updateFocusUI();
}

// Tambahan fungsi Skip
window.skipFocusTimer = function() {
    window.stopFocusTimer();
    if(window.showToast) window.showToast("Focus session skipped!", "warning");
}

window.updateFocusUI = function() {
    const display = document.getElementById('focus-time-display');
    const progressBar = document.getElementById('focus-progress-bar');
    const playIcon = document.getElementById('icon-focus-play');
    const pauseIcon = document.getElementById('icon-focus-pause');
    
    if (!display || !progressBar) return;

    // Hitung MM:SS
    const m = Math.floor(window.focusSecondsLeft / 60);
    const s = window.focusSecondsLeft % 60;
    display.innerText = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    // Matematika Lingkaran Tipis (Jari-jari / r = 48)
    // Keliling = 2 * PI * r = 2 * 3.14159 * 48 = ~301.59
    const percentage = window.focusSecondsLeft / window.focusTotalSeconds;
    const offset = 301.59 - (percentage * 301.59);
    progressBar.style.strokeDashoffset = offset;

    // Ganti Ikon Play/Pause
    if (window.isFocusRunning) {
        playIcon.classList.add('hidden');
        pauseIcon.classList.remove('hidden');
    } else {
        playIcon.classList.remove('hidden');
        pauseIcon.classList.add('hidden');
    }
}
// FOCUS TIMER LOGIC END


window.addTask = function() {
    const input = document.getElementById('todo-input');
    if (input.value.trim() !== "") {
        window.tasks.push({ text: input.value.trim(), completed: false, category: 'todo' });
        localStorage.setItem('notiybot_tasks', JSON.stringify(window.tasks));
        input.value = ""; window.renderTasks();
    } else if(window.showToast) window.showToast("Task cannot be empty!", "error");
}

window.submitTask = function() {
    const title = document.getElementById('task-title').value.trim();
    if (title === "") { if(window.showToast) window.showToast("Task title is required!", "error"); return; }
    window.tasks.push({ 
        text: title, description: document.getElementById('task-desc').value.trim(),
        priority: document.getElementById('task-priority').value,
        startDate: document.getElementById('task-start') ? document.getElementById('task-start').value : "",
        deadline: document.getElementById('task-deadline') ? document.getElementById('task-deadline').value : "",
        fileName: window.tempFileName, filePath: window.tempFilePath, 
        completed: false, category: 'task' 
    });
    localStorage.setItem('notiybot_tasks', JSON.stringify(window.tasks));
    window.toggleTaskForm(false); window.renderTasks();
    if(window.showToast) window.showToast("Task successfully saved!", "success");
}

window.toggleTask = function(index) {
    window.tasks[index].completed = !window.tasks[index].completed;
    localStorage.setItem('notiybot_tasks', JSON.stringify(window.tasks));
    window.renderTasks();
}

window.deleteTask = function(index) {
    window.tasks.splice(index, 1);
    localStorage.setItem('notiybot_tasks', JSON.stringify(window.tasks));
    window.renderTasks();
}

window.openTaskDetail = function(index) {
    // Sisa fungsi sama seperti sebelumnya
    const task = window.tasks[index];
    document.getElementById('detail-title').innerText = task.text;
    document.getElementById('detail-desc').innerHTML = task.description || "No additional description.";
    document.getElementById('modal-task-detail').classList.remove('opacity-0', 'pointer-events-none');
    document.getElementById('task-detail-content').classList.remove('scale-95');
}

window.closeTaskDetail = function() {
    document.getElementById('modal-task-detail').classList.add('opacity-0', 'pointer-events-none');
    document.getElementById('task-detail-content').classList.add('scale-95');
}