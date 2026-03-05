/**
 * Core Task Management Module
 * Handles local storage synchronization, DOM rendering, form submissions, and status toggles.
 */

window.activeTodoTab = 'todo'; 
window.tasks = JSON.parse(localStorage.getItem('notiybot_tasks')) || [];
window.tempFileName = "";
window.tempFilePath = "";

/**
 * Data Migration
 * Ensures legacy tasks conform to the new structure requiring a 'category' property.
 */
window.tasks = window.tasks.map(t => ({ ...t, category: t.category || 'todo' }));

/**
 * Handles tab navigation within the Todo view (To-Do, Task, History).
 * @param {string} tab - The target tab identifier.
 */
window.switchTodoTab = function(tab) {
    window.activeTodoTab = tab;
    
    ['todo', 'task', 'history'].forEach(t => {
        const btn = document.getElementById(`tab-${t}`);
        if(btn) {
            btn.className = t === tab 
                ? "flex-1 py-1.5 text-sm font-medium rounded-lg bg-[#3f3f46] text-white shadow-sm transition-all duration-300"
                : "flex-1 py-1.5 text-sm font-medium rounded-lg text-gray-400 hover:text-white transition-all duration-300";
        }
    });

    const inputTodo = document.getElementById('todo-input-container');
    const btnShowTask = document.getElementById('btn-show-task-form');
    const formTask = document.getElementById('task-input-container');
    
    if(inputTodo && btnShowTask && formTask) {
        inputTodo.style.display = 'none';
        btnShowTask.style.display = 'none';
        formTask.style.display = 'none';

        if(tab === 'todo') {
            inputTodo.style.display = 'flex';
        } else if(tab === 'task') {
            btnShowTask.style.display = 'block'; 
        }
    }
    window.renderTasks();
}

/**
 * Toggles the visibility of the advanced task creation form and resets internal states.
 * @param {boolean} show - Dictates form visibility state.
 */
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
        
        const startEl = document.getElementById('task-start');
        const deadlineEl = document.getElementById('task-deadline');
        if (startEl) startEl.value = "";
        if (deadlineEl) deadlineEl.value = "";
        
        const nameEl = document.getElementById('task-file-name');
        if(nameEl) {
            nameEl.innerText = "Lampirkan File";
            nameEl.classList.remove('text-blue-400');
        }
        window.tempFileName = "";
        window.tempFilePath = "";
    }
}

/**
 * Extracts and prepares file attachment data for the task payload.
 * Relies on Electron's webUtils for absolute path resolution.
 * @param {HTMLInputElement} input - The file input DOM node.
 */
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
        } catch(e) { 
            console.warn("Electron webUtils not accessible, using default path behavior.", e);
        }

        nameEl.innerText = window.tempFileName;
        nameEl.classList.add('text-blue-400');
    } else {
        window.tempFileName = "";
        window.tempFilePath = "";
        nameEl.innerText = "Lampirkan File";
        nameEl.classList.remove('text-blue-400');
    }
}

/**
 * Constructs and injects the HTML markup for tasks based on the active tab state.
 */
window.renderTasks = function() {
    const container = document.getElementById('todo-list-container');
    if (!container) return;
    
    container.innerHTML = "";

    let filteredTasks = window.activeTodoTab === 'history' 
        ? window.tasks.map((t, i) => ({...t, originalIndex: i})).filter(t => t.completed)
        : window.tasks.map((t, i) => ({...t, originalIndex: i})).filter(t => !t.completed && t.category === window.activeTodoTab);

    if (filteredTasks.length === 0) {
        let emptyMsg = window.activeTodoTab === 'history' ? "Belum ada riwayat. Ayo selesaikan tugasmu!" : `Belum ada ${window.activeTodoTab} yang ditambahkan.`;
        container.innerHTML = `
            <div class="text-center py-10 bg-[#242427] border border-dashed border-[#3f3f46] rounded-xl flex flex-col items-center justify-center text-gray-500">
                <svg class="w-10 h-10 mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
                <p class="text-sm">${emptyMsg}</p>
            </div>`;
        return;
    }

    filteredTasks.forEach(task => {
        const index = task.originalIndex;
        const isDone = task.completed;
        const bgStyle = isDone ? "bg-[#18181b] border-[#3f3f46]/50 opacity-80" : "bg-[#242427] border-[#3f3f46] hover:border-blue-500/50 hover:shadow-lg";
        const titleStyle = isDone ? "text-gray-500 line-through" : "text-gray-100";
        
        let checkIcon = isDone 
            ? `<button onclick="toggleTask(${index}); event.stopPropagation();" title="Kembalikan ke antrean" class="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 hover:bg-blue-500 hover:text-white transition mt-0.5"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg></button>`
            : `<button onclick="toggleTask(${index}); event.stopPropagation();" title="Selesaikan tugas" class="flex-shrink-0 w-6 h-6 rounded-full border-2 border-[#52525b] hover:border-blue-400 transition hover:bg-blue-500/20 flex items-center justify-center mt-0.5"></button>`;

        if (task.category === 'todo') {
            container.innerHTML += `
                <div class="flex items-center justify-between p-3.5 rounded-xl border transition-all duration-300 ${bgStyle} group">
                    <div class="flex items-start gap-3 flex-1">
                        ${checkIcon}
                        <p class="font-medium text-sm transition-all duration-300 ${titleStyle} pt-0.5">${task.text}</p>
                    </div>
                    <button onclick="deleteTask(${index})" class="text-gray-500 hover:text-red-500 p-1.5 rounded-md hover:bg-red-500/10 transition opacity-0 group-hover:opacity-100"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                </div>`;
        } 
        else {
            let priorityBadge = task.priority === 'urgent' 
                ? `<span class="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Urgent</span>`
                : `<span class="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Normal</span>`;
            
            let deadlineBadge = task.deadline && !isDone
                ? `<span class="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider flex items-center gap-1.5"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> ${task.deadline.replace('T', ' ')}</span>` 
                : '';

            let descHtml = task.description ? `<p class="text-xs text-gray-400 mt-1.5 leading-relaxed line-clamp-2">${task.description}</p>` : '';
            let fileHtml = task.fileName ? `<div class="mt-2.5 inline-flex items-center gap-1.5 bg-[#18181b] border border-[#3f3f46] text-xs text-gray-300 px-2.5 py-1 rounded-md" title="${task.filePath}"><svg class="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg><span class="truncate max-w-[150px]">${task.fileName}</span></div>` : '';

            container.innerHTML += `
                <div class="flex items-start justify-between p-4 rounded-xl border transition-all duration-300 ${bgStyle} group relative overflow-hidden">
                    ${task.priority === 'urgent' && !isDone ? '<div class="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>' : ''}
                    <div class="flex items-start gap-3 flex-1 cursor-pointer group/btn" onclick="openTaskDetail(${index})">
                        ${checkIcon}
                        <div class="flex-1">
                            <div class="flex flex-wrap items-center gap-2 mb-0.5">
                                <h4 class="font-bold text-sm transition-all duration-300 ${titleStyle}">${task.text}</h4>
                                ${!isDone ? priorityBadge : ''}
                                ${deadlineBadge}
                            </div>
                            ${!isDone ? descHtml : ''}
                            ${!isDone ? fileHtml : ''}
                        </div>
                    </div>
                    <button onclick="deleteTask(${index})" class="text-gray-500 hover:text-red-500 p-1.5 rounded-md hover:bg-red-500/10 transition opacity-0 group-hover:opacity-100 ml-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                </div>`;
        }
    });
}

/**
 * Handles submission for quick To-Do items (Simple input field).
 */
window.addTask = function() {
    const input = document.getElementById('todo-input');
    const text = input.value.trim();
    if (text !== "") {
        window.tasks.push({ text: text, completed: false, category: 'todo' });
        localStorage.setItem('notiybot_tasks', JSON.stringify(window.tasks));
        input.value = "";
        window.renderTasks();
    } else {
        if(window.showToast) window.showToast("Tugas tidak boleh kosong!", "error");
    }
}

/**
 * Validates and commits the full Task form payload to the storage engine.
 */
window.submitTask = function() {
    const title = document.getElementById('task-title').value.trim();
    const desc = document.getElementById('task-desc').value.trim();
    const priority = document.getElementById('task-priority').value;
    
    const startEl = document.getElementById('task-start');
    const deadlineEl = document.getElementById('task-deadline');
    const startDate = startEl ? startEl.value : "";
    const deadline = deadlineEl ? deadlineEl.value : "";
    
    if (title === "") {
        if(window.showToast) window.showToast("Judul Task wajib diisi, Bos!", "error");
        return;
    }

    window.tasks.push({ 
        text: title, 
        description: desc,
        priority: priority,
        startDate: startDate,
        deadline: deadline,
        fileName: window.tempFileName, 
        filePath: window.tempFilePath, 
        completed: false, 
        category: 'task' 
    });

    localStorage.setItem('notiybot_tasks', JSON.stringify(window.tasks));
    window.toggleTaskForm(false); 
    window.renderTasks();
    
    // Trigger calendar re-render to reflect new tasks instantly
    if (typeof window.renderCalendarApp === 'function') {
        window.renderCalendarApp();
    }
    
    if(window.showToast) window.showToast("Task berhasil disimpan!", "success");
}

/**
 * Toggles completion status and dispatches UI state updates.
 * @param {number} index - Index of the task in the global storage array.
 */
window.toggleTask = function(index) {
    window.tasks[index].completed = !window.tasks[index].completed;
    localStorage.setItem('notiybot_tasks', JSON.stringify(window.tasks));
    
    if(window.tasks[index].completed) {
        if(window.showToast) window.showToast("Mantap! Diselesaikan & masuk History", "success");
    } else {
        if(window.showToast) window.showToast("Dikembalikan ke antrean!", "success");
    }
    
    window.renderTasks();
    
    if (typeof window.renderCalendarApp === 'function') {
        window.renderCalendarApp();
    }
}

/**
 * Deletes a specific task and mutates the storage engine.
 * @param {number} index - Targeted task index.
 */
window.deleteTask = function(index) {
    window.tasks.splice(index, 1);
    localStorage.setItem('notiybot_tasks', JSON.stringify(window.tasks));
    window.renderTasks();
    
    if (typeof window.renderCalendarApp === 'function') {
        window.renderCalendarApp();
    }
}

/**
 * Populates and summons the Detailed Task view modal.
 * @param {number} index - Targeted task index.
 */
window.openTaskDetail = function(index) {
    const task = window.tasks[index];
    
    document.getElementById('detail-title').innerText = task.text;
    
    const descEl = document.getElementById('detail-desc');
    descEl.innerHTML = task.description ? task.description : "Tidak ada deskripsi tambahan.";
    descEl.className = task.description ? "text-sm text-gray-300 leading-relaxed whitespace-pre-wrap" : "text-sm text-gray-500 italic";

    const badgeEl = document.getElementById('detail-priority-badge');
    if (task.priority === 'urgent') {
        badgeEl.innerHTML = `<span class="bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg> URGENT</span>`;
    } else {
        badgeEl.innerHTML = `<span class="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> NORMAL</span>`;
    }

    const deadlineBadgeEl = document.getElementById('detail-deadline-badge');
    if (deadlineBadgeEl) {
        if (task.deadline) {
            deadlineBadgeEl.innerHTML = `<span class="bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> DL: ${task.deadline.replace('T', ' ')}</span>`;
        } else {
            deadlineBadgeEl.innerHTML = '';
        }
    }

    const fileContainer = document.getElementById('detail-file-container');
    const fileBtn = document.getElementById('detail-file-btn');
    const previewContainer = document.getElementById('detail-image-preview');
    const previewImg = document.getElementById('detail-preview-img');
    
    if (task.fileName) {
        fileContainer.classList.remove('hidden');
        document.getElementById('detail-file-name').innerText = task.fileName;

        let realPath = task.filePath || "";
        const ext = task.fileName.split('.').pop().toLowerCase();
        const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext);

        if (isImage && realPath && fs.existsSync(realPath)) {
            previewContainer.classList.remove('hidden');
            
            try {
                const fileBuffer = fs.readFileSync(realPath);
                let mimeType = ext === 'jpg' ? 'jpeg' : ext;
                const base64Data = `data:image/${mimeType};base64,${fileBuffer.toString('base64')}`;
                
                previewImg.src = base64Data;
                previewContainer.onclick = () => { window.openImageViewer(base64Data); };
            } catch (err) {
                console.error("Image Buffer Exception", err);
                previewContainer.classList.add('hidden');
            }
        } else {
            previewContainer.classList.add('hidden');
        }

        fileBtn.onclick = () => { 
            if(realPath && fs.existsSync(realPath)) shell.openPath(realPath); 
            else if(window.showToast) window.showToast("File missing from native OS path.", "error");
        };
    } else {
        fileContainer.classList.add('hidden');
        if(previewContainer) previewContainer.classList.add('hidden');
        fileBtn.onclick = null;
    }

    document.getElementById('modal-task-detail').classList.remove('opacity-0', 'pointer-events-none');
    document.getElementById('task-detail-content').classList.remove('scale-95');
}

/**
 * Dismisses the Task Detail Modal.
 */
window.closeTaskDetail = function() {
    document.getElementById('modal-task-detail').classList.add('opacity-0', 'pointer-events-none');
    document.getElementById('task-detail-content').classList.add('scale-95');
}

/**
 * Image Viewer Module
 * Renders full-scale images directly within the Electron window.
 */
window.openImageViewer = function(imgSrc) {
    const modal = document.getElementById('modal-image-viewer');
    const imgEl = document.getElementById('viewer-full-img');
    if(modal && imgEl) {
        imgEl.src = imgSrc;
        modal.classList.remove('opacity-0', 'pointer-events-none');
        setTimeout(() => imgEl.classList.remove('scale-95'), 10);
    }
}

window.closeImageViewer = function() {
    const modal = document.getElementById('modal-image-viewer');
    const imgEl = document.getElementById('viewer-full-img');
    if(modal && imgEl) {
        modal.classList.add('opacity-0', 'pointer-events-none');
        imgEl.classList.add('scale-95');
        setTimeout(() => imgEl.src = "", 300);
    }
}