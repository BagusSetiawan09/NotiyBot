const { ipcRenderer, shell } = require('electron');
const fs = require('fs');
const path = require('path');

// GLOBAL VARIABLES & CONFIG
window.isDnd = false;

// WINDOW CONTROLS
document.getElementById('btn-close')?.addEventListener('click', () => ipcRenderer.send('window-close'));
document.getElementById('btn-min')?.addEventListener('click', () => ipcRenderer.send('window-minimize'));
document.getElementById('btn-max')?.addEventListener('click', () => ipcRenderer.send('window-maximize'));

// UTILITIES: TOAST & CONFIRM
window.showToast = function(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if(!container) return;
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
window.showConfirm = function(title, msg, btnText, type, action) {
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
    if(modal && content) {
        modal.classList.remove('opacity-0', 'pointer-events-none');
        content.classList.remove('scale-95');
    }
}

window.closeConfirm = function() {
    const modal = document.getElementById('modal-confirm');
    const content = document.getElementById('confirm-content');
    if(modal && content) {
        modal.classList.add('opacity-0', 'pointer-events-none');
        content.classList.add('scale-95');
    }
    currentConfirmAction = null;
}

document.getElementById('btn-confirm-yes')?.addEventListener('click', () => {
    if (currentConfirmAction) currentConfirmAction();
    window.closeConfirm();
});

// NAVIGATION (LOAD VIEW)
window.loadView = function(viewName) {
    const viewPath = path.join(__dirname, 'views', `${viewName}.html`);
    fs.readFile(viewPath, 'utf8', (err, data) => {
        if (err) { console.error("Gagal meload view:", err); return; }
        
        document.getElementById('main-content').innerHTML = data;
        
        // BUGFIX: RESET SEMUA TOMBOL OTOMATIS TANPA PERLU DIDAFTARKAN MANUAL
        const allNavBtns = document.querySelectorAll('.nav-btn');
        allNavBtns.forEach(btn => {
            btn.classList.remove('bg-[#3f3f46]', 'text-white');
            btn.classList.add('text-gray-400');
        });
        
        // NYALAKAN TOMBOL YANG AKTIF
        const activeNav = document.getElementById(`nav-${viewName}`);
        if(activeNav) {
            activeNav.classList.add('bg-[#3f3f46]', 'text-white');
            activeNav.classList.remove('text-gray-400');
        }

        // TRIGGER FITUR SPESIFIK SAAT HALAMAN DIBUKA
        if (viewName === 'home' && typeof window.initHomeLogic === 'function') window.initHomeLogic();
        if (viewName === 'todo' && typeof window.switchTodoTab === 'function') {
            setTimeout(() => window.switchTodoTab(window.activeTodoTab || 'todo'), 50);
        }
        if (viewName === 'think' && typeof window.renderChats === 'function') {
            setTimeout(() => window.renderChats(), 100);
        }
        
        if (viewName === 'settings' || viewName === 'timer') {
            const savedConfig = ipcRenderer.sendSync('get-config');
            if (savedConfig) {
                if (viewName === 'timer') {
                    if(document.getElementById('input-water')) document.getElementById('input-water').value = savedConfig.water || 45;
                    if(document.getElementById('input-stretch')) document.getElementById('input-stretch').value = savedConfig.stretch || 120;
                } else if (viewName === 'settings' && typeof window.renderCustomModes === 'function') {
                    window.renderCustomModes(savedConfig.customModes || []);
                }
            }
        }

        // PELATUK (TRIGGER) UNTUK MODULE BARU SEPERTI CALENDAR DAN SPACES
        window.dispatchEvent(new CustomEvent('tabSwitched', { detail: viewName }));
    });
}

window.switchTab = function(tabName) { window.loadView(tabName); }

// STARTUP INISIALISASI
window.onload = () => {
    const savedConfig = ipcRenderer.sendSync('get-config');
    if(savedConfig && savedConfig.dnd !== undefined) window.isDnd = savedConfig.dnd;
    window.loadView('home'); 
};

// SINKRONISASI CONFIG
ipcRenderer.on('config-updated', (event, newConfig) => {
    if(document.getElementById('custom-modes-container') && typeof window.renderCustomModes === 'function') {
        window.renderCustomModes(newConfig.customModes);
    }
    if(typeof window.updateClock === 'function') window.updateClock();
});