// Variable Declarations
window.currentSelectedAiModel = 'gemini-2.5-flash';
window.currentAiMode = 'cepat'; 
window.currentAiAttachment = null; 
window.currentAiAbortController = null;

// API Key Management
window.openApiModal = function() {
    document.getElementById('input-api-key').value = localStorage.getItem('gemini_api_key') || "";
    document.getElementById('modal-api-key').classList.remove('opacity-0', 'pointer-events-none');
    document.getElementById('api-modal-content').classList.remove('scale-95');
}

window.closeApiModal = function() {
    document.getElementById('modal-api-key').classList.add('opacity-0', 'pointer-events-none');
    document.getElementById('api-modal-content').classList.add('scale-95');
}

window.saveApiKey = function() {
    const key = document.getElementById('input-api-key').value.trim();
    if(key) {
        localStorage.setItem('gemini_api_key', key);
        if(window.showToast) window.showToast("API Key successfully secured in local storage.", "success");
        window.closeApiModal();
    } else {
        if(window.showToast) window.showToast("API Key cannot be empty.", "error");
    }
}

// Session & History Management
window.chatSessions = JSON.parse(localStorage.getItem('notiybot_chat_sessions')) || [];
window.activeSessionId = localStorage.getItem('notiybot_active_session') || null;

// Legacy code migration handler
let oldChatHistory = JSON.parse(localStorage.getItem('notiybot_chats'));
if (oldChatHistory && oldChatHistory.length > 0 && window.chatSessions.length === 0) {
    let newSession = { id: 'session_' + Date.now(), title: 'Obrolan Lama', messages: oldChatHistory };
    window.chatSessions.push(newSession);
    window.activeSessionId = newSession.id;
    localStorage.removeItem('notiybot_chats'); 
}

// Auto-Rename Engine for un-titled sessions
let needsSave = false;
window.chatSessions.forEach(session => {
    if ((session.title === 'Obrolan Lama' || session.title === 'Obrolan Baru') && session.messages.length > 0) {
        let firstUserMsg = session.messages.find(m => m.role === 'user');
        if (firstUserMsg) {
            if (firstUserMsg.text && firstUserMsg.text !== "[Mengirim Lampiran File]") {
                session.title = firstUserMsg.text.substring(0, 25) + (firstUserMsg.text.length > 25 ? '...' : '');
            } else if (firstUserMsg.attachment) {
                session.title = "File: " + firstUserMsg.attachment;
            }
            needsSave = true;
        }
    }
});

// Initialize default session state
if(window.chatSessions.length === 0) {
    let newSession = { id: 'session_' + Date.now(), title: 'Obrolan Baru', messages: [] };
    window.chatSessions.unshift(newSession);
    window.activeSessionId = newSession.id;
    needsSave = true;
} else if (!window.activeSessionId || !window.chatSessions.find(s => s.id === window.activeSessionId)) {
    window.activeSessionId = window.chatSessions[0].id;
    needsSave = true;
}

window.saveSessions = function() {
    localStorage.setItem('notiybot_chat_sessions', JSON.stringify(window.chatSessions));
    localStorage.setItem('notiybot_active_session', window.activeSessionId);
}

if (needsSave) window.saveSessions();

window.getActiveSession = function() {
    return window.chatSessions.find(s => s.id === window.activeSessionId) || window.chatSessions[0];
}

// UI Controllers for History Drawer
window.toggleChatHistory = function() {
    const drawer = document.getElementById('drawer-chat-history');
    const backdrop = document.getElementById('drawer-backdrop');
    if(!drawer || !backdrop) return;

    if(drawer.classList.contains('-translate-x-full')) {
        drawer.classList.remove('-translate-x-full');
        backdrop.classList.remove('opacity-0', 'pointer-events-none');
        window.renderChatHistoryList();
    } else {
        drawer.classList.add('-translate-x-full');
        backdrop.classList.add('opacity-0', 'pointer-events-none');
    }
}

window.renderChatHistoryList = function() {
    const listEl = document.getElementById('chat-history-list');
    if(!listEl) return;
    listEl.innerHTML = "";
    
    window.chatSessions.forEach(session => {
        const isActive = session.id === window.activeSessionId;
        const bgClass = isActive ? 'bg-[#3f3f46]' : 'bg-transparent hover:bg-[#27272a]';
        const textClass = isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-200';
        
        listEl.innerHTML += `
            <div class="flex items-center justify-between p-3 rounded-xl cursor-pointer transition group ${bgClass}" onclick="switchChat('${session.id}')">
                <div class="flex items-center gap-3 overflow-hidden">
                    <svg class="w-4 h-4 flex-shrink-0 ${textClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                    <span class="text-sm font-medium truncate ${textClass}">${session.title}</span>
                </div>
                <button onclick="deleteChat('${session.id}', event)" class="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition p-1" title="Hapus Chat">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
            </div>
        `;
    });
}

window.createNewChat = function(silent = false) {
    let newSession = { id: 'session_' + Date.now(), title: 'Obrolan Baru', messages: [] };
    window.chatSessions.unshift(newSession); 
    window.activeSessionId = newSession.id;
    window.saveSessions();
    if(!silent) {
        window.renderChats();
        window.renderChatHistoryList();
        const drawer = document.getElementById('drawer-chat-history');
        if(drawer && !drawer.classList.contains('-translate-x-full')) window.toggleChatHistory();
        if(window.showToast) window.showToast("Ruang Obrolan Baru Dibuat", "success");
    }
}

window.switchChat = function(id) {
    window.activeSessionId = id;
    window.saveSessions();
    window.renderChats();
    window.renderChatHistoryList();
    window.toggleChatHistory(); 
}

window.deleteChat = function(id, event) {
    event.stopPropagation(); 
    window.chatSessions = window.chatSessions.filter(s => s.id !== id);
    
    if(window.chatSessions.length === 0) window.createNewChat(true); 
    else if (window.activeSessionId === id) window.activeSessionId = window.chatSessions[0].id;
    
    window.saveSessions();
    window.renderChats();
    window.renderChatHistoryList();
    if(window.showToast) window.showToast("Riwayat Chat Dihapus", "success");
}

// File and Attachment Management
window.handleAiFileSelect = function(input) {
    const file = input.files[0];
    if (!file) return;

    let ext = file.name.split('.').pop().toLowerCase();
    let allowed = ['png', 'jpg', 'jpeg', 'webp', 'pdf'];
    
    if(!allowed.includes(ext)) { 
        if(window.showToast) window.showToast("Format tidak didukung. Harap gunakan Gambar atau PDF.", "error"); 
        input.value = ""; 
        return; 
    }

    // File size validation (Max 5MB limit to optimize API latency)
    if (file.size > 5 * 1024 * 1024) {
        if(window.showToast) window.showToast("Ukuran file melebihi batas maksimal 5MB.", "warning");
        input.value = "";
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        // Extract raw Base64 data by stripping the Data URL prefix
        const base64Data = e.target.result.split(',')[1]; 
        
        window.currentAiAttachment = {
            name: file.name,
            mimeType: file.type,
            data: base64Data
        };

        // Update UI to display attachment preview
        const previewEl = document.getElementById('ai-attachment-preview');
        const nameEl = document.getElementById('ai-attachment-name');
        
        if (previewEl && nameEl) {
            previewEl.classList.remove('hidden');
            nameEl.innerText = file.name;
        }
    };
    reader.readAsDataURL(file);
};

window.removeAiAttachment = function() {
    window.currentAiAttachment = null;
    const previewEl = document.getElementById('ai-attachment-preview');
    const fileInput = document.getElementById('ai-file-input');
    
    if (previewEl) previewEl.classList.add('hidden');
    if (fileInput) fileInput.value = ""; 
};

// UI and Model Selector Controls
window.toggleModelSelector = function() {
    const menu = document.getElementById('ai-model-menu');
    if(!menu) return;
    if(menu.classList.contains('opacity-0')) {
        menu.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-2');
    } else {
        menu.classList.add('opacity-0', 'pointer-events-none', 'translate-y-2');
    }
}

window.selectAiModel = function(modelValue, modelName, modeId) {
    window.currentAiMode = modeId || 'cepat'; 
    document.getElementById('current-model-text').innerText = modelName;
    document.querySelectorAll('.model-check').forEach(el => el.classList.add('hidden'));
    let checkEl = document.getElementById('check-' + modeId) || document.getElementById('check-' + modelValue);
    if(checkEl) checkEl.classList.remove('hidden');
    window.toggleModelSelector(); 
}

window.useQuickPrompt = function(promptText) {
    const inputEl = document.getElementById('ai-input');
    if(inputEl) {
        inputEl.value = promptText;
        inputEl.focus();
        inputEl.style.height = 'auto';
        inputEl.style.height = inputEl.scrollHeight + 'px';
    }
}

window.editChatMsg = function(index) {
    let session = window.getActiveSession();
    let msg = session.messages[index];
    if(msg && msg.role === 'user') {
        document.getElementById('ai-input').value = msg.text;
        session.messages = session.messages.slice(0, index); 
        window.saveSessions();
        window.renderChats();
        const inputEl = document.getElementById('ai-input');
        inputEl.focus();
        inputEl.style.height = 'auto'; inputEl.style.height = inputEl.scrollHeight + 'px';
    }
}

window.regenerateChatMsg = function() {
    let session = window.getActiveSession();
    if(session.messages.length >= 2 && session.messages[session.messages.length-1].role === 'ai') {
        session.messages.pop(); 
        let lastUserMsg = session.messages.pop(); 
        window.saveSessions();
        
        document.getElementById('ai-input').value = lastUserMsg.text;
        if(lastUserMsg.attachment) if(window.showToast) window.showToast("Silakan lampirkan ulang file untuk proses Regenerate", "warning");
        window.sendChatMessage();
    }
}

// Core DOM Renderer Engine
window.renderChats = function() {
    const container = document.getElementById('chat-container');
    const headerTitle = document.getElementById('chat-header-title');
    if(!container) return;
    
    let session = window.getActiveSession();
    if(headerTitle) headerTitle.innerText = session.title;

    if(session.messages.length === 0) {
        const promptPool = [
            { icon: '💻', title: 'Koding HTML/CSS', text: 'Tolong buatkan saya kodingan HTML dan Tailwind CSS yang rapi untuk...' },
            { icon: '🎨', title: 'Desain UI Web', text: 'Bantu saya membuat kerangka HTML dan Tailwind untuk landing page...' },
            { icon: '☕', title: 'Promo Biji Kopi', text: 'Buatkan ide caption Instagram dan strategi promosi untuk produk biji kopi Gunung Aroma...' },
            { icon: '🤖', title: 'Logika Arduino', text: 'Tolong buatkan logika program Arduino C++ untuk...' },
            { icon: '🚀', title: 'Pitching Klien', text: 'Buatkan kerangka penawaran jasa pembuatan website untuk klien agensi Digital Expert...' },
            { icon: '📝', title: 'Review Dokumen', text: 'Tolong review dokumen ini dan berikan saran perbaikan agar lebih profesional: ' },
            { icon: '🎓', title: 'Sistem Komputer', text: 'Bantu saya menjelaskan materi Sistem Komputer berikut ini dengan bahasa yang mudah dipahami: ' },
            { icon: '🌐', title: 'Terjemahkan', text: 'Terjemahkan teks berikut ke bahasa Inggris dengan gaya bahasa profesional: ' }
        ];

        const shuffledPrompts = promptPool.sort(() => 0.5 - Math.random()).slice(0, 4);
        let buttonsHtml = '';
        shuffledPrompts.forEach(p => {
            buttonsHtml += `
                <button onclick="useQuickPrompt('${p.text}')" class="flex items-center gap-2 bg-[#18181b] border border-[#3f3f46] hover:bg-[#27272a] text-gray-300 text-xs font-medium px-4 py-2.5 rounded-full transition shadow-sm hover:scale-105 transform duration-200">
                    <span class="text-sm">${p.icon}</span> ${p.title}
                </button>`;
        });

        container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full w-full px-4 fade-in mt-12 mb-10">
                <div class="text-center mb-7">
                    <h2 class="text-xl font-medium text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-2 flex items-center justify-center gap-2">
                        <svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>
                        Halo Bagus
                    </h2>
                    <h1 class="text-3xl font-semibold text-white tracking-tight">Sebaiknya kita mulai dari mana?</h1>
                </div>
                <div class="flex flex-wrap justify-center gap-2.5 max-w-2xl">
                    ${buttonsHtml}
                </div>
            </div>
        `;
        return; 
    }

    let html = '';
    session.messages.forEach((chat, index) => {
        if(chat.role === 'user') {
            let attachHtml = chat.attachment ? `<div class="mb-2 inline-flex items-center gap-1.5 bg-white/20 px-2 py-1 rounded border border-white/30 text-[11px] font-medium"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg> ${chat.attachment}</div><br>` : '';
            let safeUserText = chat.text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            
            html += `
            <div class="flex flex-col items-end mt-5 fade-in group/userchat w-full">
                <div class="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-5 py-3.5 max-w-[85%] text-sm leading-relaxed shadow-md whitespace-pre-wrap">${attachHtml}${safeUserText}</div>
                <div class="flex items-center gap-3 mt-1.5 mr-1 opacity-0 group-hover/userchat:opacity-100 transition-opacity duration-300">
                    <button onclick="editChatMsg(${index})" class="text-[11px] font-medium text-gray-500 hover:text-blue-400 flex items-center gap-1"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg> Edit Pesan</button>
                </div>
            </div>`;
        } else {
            let formattedText = chat.text 
                .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, url) => {
                    let cleanUrl = url.trim().replace(/ /g, '%20');
                    return `<div class="mt-3 mb-2 bg-[#1a1b26] border border-[#3f3f46] rounded-xl overflow-hidden shadow-sm block w-full"><div class="relative bg-[#0f0f11] flex justify-center items-center min-h-[200px]"><img src="${cleanUrl}" alt="${alt}" onerror="this.outerHTML='<div class=\\'p-6 text-center text-red-400 font-mono text-[11px]\\'>❌ SERVER GAMBAR SEDANG SIBUK.<br><br>Coba klik link ini:<br><a href=\\'javascript:void(0)\\' onclick=\\'require(&quot;electron&quot;).shell.openExternal(&quot;${cleanUrl}&quot;)\\' class=\\'text-[#CCA35C] underline font-bold\\'>🔗 BUKA DI CHROME</a></div>'" class="w-full h-auto max-h-[400px] object-cover transition-opacity duration-300"></div><div class="px-3.5 py-3 bg-[#1f2023] border-t border-[#3f3f46] flex justify-between items-center"><span class="text-[10px] text-gray-400 font-mono tracking-widest flex items-center gap-1.5"><svg class="w-3.5 h-3.5 text-[#CCA35C]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg> AI IMAGE</span><div class="flex items-center gap-2"><button onclick="openDedicatedPreview('${cleanUrl}')" class="bg-[#2a2b32] hover:bg-[#3f3f46] text-gray-300 border border-[#4a4b50] text-[10px] font-bold py-1.5 px-3 rounded-lg flex items-center gap-1.5">PREVIEW</button><button onclick="downloadAiImage('${cleanUrl}', '${alt}')" class="bg-[#2a2b32] hover:bg-[#3f3f46] text-gray-300 border border-[#4a4b50] text-[10px] font-bold py-1.5 px-3 rounded-lg flex items-center gap-1.5">DOWNLOAD</button></div></div></div>`;
                })
                .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1</strong>')
                .replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
                    const uniqueId = 'code-' + Math.random().toString(36).substr(2, 9);
                    const langLabel = lang ? lang.toUpperCase() : 'CODE';
                    let isHtml = (lang && lang.toLowerCase() === 'html');
                    let previewBtn = isHtml ? `
                        <button onclick="runPreview('${uniqueId}')" class="h-7 px-3 flex items-center justify-center gap-1.5 text-[10px] font-bold text-gray-400 hover:text-green-400 transition-colors bg-transparent hover:bg-[#3f3f46] rounded-md flex-shrink-0 uppercase tracking-widest leading-none" title="Live Preview">
                            <svg class="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"></path></svg>
                            <span class="mt-[1px]">PREVIEW</span>
                        </button>` : '';

                    return `
                        <div class="bg-[#1a1b26] border border-[#3f3f46] rounded-xl my-4 overflow-hidden shadow-2xl">
                            <div class="bg-[#1f2335] px-4 py-2 text-[11px] text-gray-400 font-mono border-b border-[#3f3f46] tracking-widest flex justify-between items-center">
                                <span>${langLabel}</span>
                                <div class="flex items-center gap-2">
                                    ${previewBtn}
                                    <button onclick="copyCode('${uniqueId}', this)" class="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-white transition bg-transparent hover:bg-[#3f3f46] rounded-md flex-shrink-0" title="Salin kode">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                                    </button>
                                </div>
                            </div>
                            <div class="p-4 overflow-x-auto text-[13px] font-mono whitespace-pre leading-relaxed select-text">
                                <code id="${uniqueId}" class="language-${lang || 'plaintext'}">${code}</code>
                            </div>
                        </div>`;
                })
                .replace(/`([^`]+)`/g, '<code class="bg-[#1a1b26] border border-[#3f3f46] text-blue-300 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>')
                // Premium ChatGPT-Style Inline Source Link
                .replace(/(?<!\!)\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (match, text, url) => {
                    return `<span class="relative inline-block ml-1.5 align-middle z-20 group/tooltip">
                        <a href="javascript:void(0)" onclick="require('electron').shell.openExternal('${url}')" class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#2a2b32] hover:bg-[#3f3f46] border border-[#4a4b50] text-[10px] font-bold text-gray-400 hover:text-gray-200 transition-all shadow-sm cursor-pointer">
                            <svg class="w-3 h-3 text-gray-500 group-hover/tooltip:text-blue-400 transition-colors" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-2h2v2zm0-4h-2V7h2v6z"></path></svg>
                            ${text}
                        </a>
                        <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-3.5 bg-[#1f2023] border border-[#3f3f46] rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.7)] opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-300 z-[100] pointer-events-none origin-bottom">
                            <div class="flex items-center gap-2 mb-2">
                                <div class="w-5 h-5 rounded-full bg-[#27272a] flex items-center justify-center border border-[#4a4b50] flex-shrink-0"><svg class="w-3 h-3 text-blue-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-2h2v2zm0-4h-2V7h2v6z"></path></svg></div>
                                <span class="text-[11px] font-bold text-gray-200 uppercase tracking-widest truncate flex-1">${text}</span>
                            </div>
                            <p class="text-[11px] text-gray-400 leading-relaxed line-clamp-2">${url}</p>
                            <div class="text-blue-400 text-[10px] font-bold mt-2.5 uppercase tracking-widest flex items-center gap-1.5"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg> Buka Artikel</div>
                        </div>
                    </span>`;
                })

                // Bullet List Point
                .replace(/^[\*\-]\s+(.*)$/gm, '<div class="flex items-start gap-3 mt-2.5 mb-1.5"><svg class="w-2 h-2 text-blue-500 flex-shrink-0 mt-1.5 shadow-[0_0_8px_rgba(59,130,246,0.8)]" fill="currentColor" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3"></circle></svg><div class="flex-1 leading-relaxed">$1</div></div>')

            const msgId = 'msg-' + Math.random().toString(36).substr(2, 9);
            let regenBtn = (index === session.messages.length - 1) ? `
                <button onclick="regenerateChatMsg()" class="text-[11px] font-semibold text-purple-500 hover:text-purple-400 flex items-center gap-1.5 transition uppercase tracking-wider ml-auto">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> Tulis Ulang
                </button>
            ` : '';

            let jarvisBtn = `
                <button onclick="playVoice('${msgId}')" class="text-[11px] font-semibold text-yellow-500 hover:text-yellow-400 flex items-center gap-1.5 transition uppercase tracking-wider">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path></svg> Putar Suara
                </button>
            `;

            html += `
            <div class="flex gap-4 mt-5 fade-in group/chat">
                <div class="w-8 h-8 rounded-full bg-[#27272a] flex items-center justify-center flex-shrink-0 border border-[#3f3f46] mt-1">
                    <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                </div>
                <div class="flex flex-col w-full max-w-[85%]">
                    <div id="${msgId}" class="bg-[#242427] border border-[#3f3f46] rounded-2xl rounded-tl-sm px-5 py-4 text-sm text-gray-300 leading-relaxed shadow-sm whitespace-pre-wrap select-text w-full">${formattedText}</div>
                    <div class="flex items-center gap-4 mt-2 ml-2 opacity-0 group-hover/chat:opacity-100 transition-opacity duration-300 w-full">
                        <button onclick="copyFullText('${msgId}', this)" class="text-[11px] font-semibold text-gray-500 hover:text-white flex items-center gap-1.5 transition uppercase tracking-wider">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg> Salin
                        </button>
                        <button onclick="downloadAsWord('${msgId}')" class="text-[11px] font-semibold text-blue-500 hover:text-blue-400 flex items-center gap-1.5 transition uppercase tracking-wider">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg> Word
                        </button>
                        ${jarvisBtn}
                        ${regenBtn}
                    </div>
                </div>
            </div>`;
        }
    });

    container.innerHTML = html;
    setTimeout(() => {
        if(window.hljs) document.querySelectorAll('pre code, div code[class^="language-"]').forEach((block) => { hljs.highlightElement(block); });
        container.scrollTop = container.scrollHeight;
    }, 100);
}

// Core Sender Engine (API Call & Payload Construction)
window.stopAiGeneration = function() {
    if(window.currentAiAbortController) {
        window.currentAiAbortController.abort(); 
        window.currentAiAbortController = null;
    }
}

window.sendChatMessage = async function() {
    const inputEl = document.getElementById('ai-input');
    const text = inputEl.value.trim();
    const apiKey = localStorage.getItem('gemini_api_key');
    let session = window.getActiveSession();

    // Prevent submission if both text and attachment are empty
    if(!text && !window.currentAiAttachment) return;
    
    // Validate API Key
    if(!apiKey) { 
        if(window.showToast) window.showToast("Harap masukkan API Key Gemini", "error"); 
        window.openApiModal(); 
        return; 
    }

    // Auto-rename chat session
    if(session.messages.length === 0 && (session.title === 'Obrolan Lama' || session.title === 'Obrolan Baru')) {
        session.title = text.length > 25 ? text.substring(0, 25) + '...' : (text || "Analisis Dokumen/Gambar");
        if(document.getElementById('chat-header-title')) document.getElementById('chat-header-title').innerText = session.title;
        window.renderChatHistoryList(); 
    }

    // Retrieve file name if an attachment exists
    let fileName = window.currentAiAttachment ? window.currentAiAttachment.name : null;
    session.messages.push({ role: 'user', text: text || "[Mengirim Lampiran File]", attachment: fileName });
    window.saveSessions();
    
    inputEl.value = "";
    inputEl.style.height = "auto";
    
    // Construct Payload Parts for Gemini
    let payloadParts = [];
    
    // Knowledge Base Engine (Enterprise Instruction Set)
    const knowledgeBase = `
    INFORMASI PENTING UNTUK AI (KNOWLEDGE BASE):
    1. Identitas Pengguna: Nama pengguna adalah Bagus Setiawan. Panggil dia "Bos" atau "Bos Bagus". Dia adalah seorang Freelance Web Developer, UI/UX Designer, dan mahasiswa Sistem Komputer di Universitas Pembangunan Panca Budi (UNPAB) Medan.
    2. Bisnis 1 ("Gunung Aroma"): Ini adalah Perusahaan Biji Kopi (Coffee Bean Company), BUKAN sekadar warung kopi atau minuman siap saji. Jika diminta membuat desain/caption tentang ini, selalu arahkan ke kemasan biji kopi mentah/roasting yang elegan, premium, dan profesional.
    3. Bisnis 2 ("Digital Expert"): Ini adalah agensi layanan digital milik Bos Bagus yang menawarkan jasa Web Development, UI/UX Design, dan Digital Marketing.
    `;

    let systemPrompt = "IMPORTANT: You are a bilingual AI. Respond in the user's language. Call the user 'Bos'.\n" +
    "FOR IMAGES: If the user asks for an image, you MUST reply with exactly this Markdown link format:\n" +
    "![Gambar](https://image.pollinations.ai/prompt/YOUR_PROMPT_EN?width=1080&height=720&nologo=true)\n" +
    "Replace YOUR_PROMPT_EN with a highly detailed English description. Use '%20' instead of spaces. Do NOT use code blocks for the image link.\n\n" +
    "FOR TASKS/REMINDERS: Act as an Elite Project Manager. Analyze the urgency of the user's request. If it involves clients, bugs, tomorrow morning ('besok pagi'), revisions, or urgent tone, set priority to 'urgent'. Otherwise 'normal'. You MUST append this JSON at the VERY END of your response:\n" +
    "|||TASK:{\"title\":\"Task Name\",\"time\":\"HH:MM\",\"priority\":\"urgent\" or \"normal\",\"ai_notes\":\"Short reason for urgency/strategy\"}|||\n" +
    "FOR WEB SEARCH/NEWS/LISTS: You MUST format your search results as bullet points (*). At the VERY END of each bullet point sentence, you MUST provide the source using strictly this Markdown link format: [Name of Publisher](URL). Example: * Apple merilis Macbook baru. [MacRumors](https://macrumors.com/...)\n\n" +
    knowledgeBase + "\n\n";
    
    if (window.currentAiMode === 'penalaran') systemPrompt += "Current Mode: DEEP THINKING.\n\n";
    else if (window.currentAiMode === 'pro') systemPrompt += "Current Mode: PRO.\n\n";
    else systemPrompt += "Current Mode: FAST.\n\n";

    // Push text context to payload
    payloadParts.push({ text: systemPrompt + (text || "Tolong analisa isi dari lampiran ini dengan detail dan profesional.") });
    
    // Append inline data if attachment exists in current context
    if (window.currentAiAttachment) {
        payloadParts.push({ 
            inlineData: { 
                mimeType: window.currentAiAttachment.mimeType, 
                data: window.currentAiAttachment.data 
            } 
        });
        window.removeAiAttachment(); 
    }

    // Prepare Core API Payload Structure
    let apiPayload = {
        contents: [{ parts: payloadParts }]
    };

    // Smart Web Search Radar (Google Grounding)
    const searchKeywords = ['terbaru', 'hari ini', 'sekarang', 'berita', 'tren', 'harga', 'cuaca', 'update', 'siapa', 'kapan', 'cari', 'hari apa', 'jam berapa'];
    const isNeedInternet = searchKeywords.some(keyword => text.toLowerCase().includes(keyword));

    if (isNeedInternet) {
        apiPayload.tools = [{ googleSearch: {} }];
        if(window.showToast) window.showToast("Mengaktifkan Radar Web Search...", "success");
    }

    window.renderChats();

    // Render loading indicator
    const container = document.getElementById('chat-container');
    const typingId = 'typing-' + Date.now();
    const loadingText = window.currentAiMode === 'penalaran' ? "Menganalisis data mendalam..." : "Memproses file dan data...";
    
    container.innerHTML += `
        <div id="${typingId}" class="flex gap-4 mt-5 fade-in">
            <div class="w-8 h-8 rounded-full bg-[#27272a] flex items-center justify-center flex-shrink-0 border border-[#3f3f46]">
                <svg class="w-4 h-4 text-gray-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
            </div>
            <div class="bg-[#242427] border border-[#3f3f46] rounded-2xl rounded-tl-sm px-5 py-3 text-sm text-gray-400 italic flex items-center gap-2">
                ${loadingText}
            </div>
        </div>`;
    container.scrollTop = container.scrollHeight;

    document.getElementById('btn-send-chat').classList.add('hidden');
    document.getElementById('btn-stop-chat').classList.remove('hidden');

    window.currentAiAbortController = new AbortController();

    // Execute API Request
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(apiPayload), // Using the advanced payload
            signal: window.currentAiAbortController.signal
        });
        const data = await response.json();
        
        if(document.getElementById(typingId)) document.getElementById(typingId).remove();
        document.getElementById('btn-send-chat').classList.remove('hidden');
        document.getElementById('btn-stop-chat').classList.add('hidden');

        if (data.error) { 
            if(window.showToast) window.showToast("API Error: " + data.error.message, "error"); 
            return; 
        }

        let aiReply = data.candidates[0].content.parts.map(part => part.text || "").join("\n\n");

        // Evolved AI Auto-Task Creator Interceptor
        const taskRegex = /\|\|\|TASK:(.*?)\|\|\|/;
        const match = aiReply.match(taskRegex);
        
        if (match && match[1]) {
            try {
                const taskData = JSON.parse(match[1]);
                aiReply = aiReply.replace(taskRegex, '').trim(); 
                
                if (typeof window.autoCreateTask === 'function') {
                    window.autoCreateTask(taskData.title, taskData.time, taskData.priority, taskData.ai_notes);
                }
            } catch (e) {
                console.error("Enterprise Error: Failed to parse Evolved AI Task JSON", e);
            }
        }

        session.messages.push({ role: 'ai', text: aiReply });
        window.saveSessions();
        window.renderChats();

    } catch (error) {
        if(document.getElementById(typingId)) document.getElementById(typingId).remove();
        document.getElementById('btn-send-chat').classList.remove('hidden');
        document.getElementById('btn-stop-chat').classList.add('hidden');
        
        if (error.name === 'AbortError') {
            if(window.showToast) window.showToast("Proses AI Dibatalkan Oleh Pengguna.", "warning");
        } else {
            if(window.showToast) window.showToast("Gagal terhubung ke AI. Cek koneksi internet Bos.", "error");
            console.error("AI Error Request: ", error);
        }
    }
}

// Evolved AI Auto-Task Creator Bridge
window.autoCreateTask = function(title, time, priority, aiNotes) {
    let storageKey = 'notiybot_tasks'; 
    let tasks = JSON.parse(localStorage.getItem(storageKey)) || [];
    
    let iconAI = `<svg class="w-3.5 h-3.5 inline-block text-purple-400 translate-y-[-1px] mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>`;
    let iconTime = `<svg class="w-3.5 h-3.5 inline-block text-blue-400 translate-y-[-1px] mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;

    let finalDescription = aiNotes 
        ? `${iconAI}<span class="text-purple-300 font-semibold tracking-wide">Analisis AI:</span> <span class="text-gray-300">${aiNotes}</span><br>${iconTime}<span class="text-gray-400 font-medium tracking-wide">Waktu: ${time || '-'}</span>` 
        : (time ? `${iconTime}<span class="text-gray-400 font-medium tracking-wide">Waktu: ${time}</span>` : `${iconAI}<span class="text-gray-400 font-medium tracking-wide">Ditambahkan otomatis oleh AI</span>`);

    let newTask = {
        text: title, 
        description: finalDescription,
        priority: priority || 'normal',
        fileName: "", 
        filePath: "", 
        completed: false, 
        category: 'task'
    };
    
    tasks.push(newTask);
    localStorage.setItem(storageKey, JSON.stringify(tasks));
    
    if(window.tasks) window.tasks = tasks;
    
    if(window.showToast) {
        if (priority === 'urgent') {
            window.showToast(`URGENSI TERDETEKSI: ${title} ditambahkan!`, "error");
        } else {
            window.showToast(`AI menambahkan tugas: ${title}`, "success");
        }
    }
    
    if(typeof window.renderTasks === 'function') window.renderTasks();
}

/**
 * Zen Scratchpad Module
 * Handles rich text editing, local storage synchronization, dynamic table insertion,
 * and markdown-style shortcuts within a contenteditable context.
 */

window.toggleZenDrawer = function() {
    const drawer = document.getElementById('drawer-zen-notes');
    const aiView = document.getElementById('ai-view-container');
    if (!drawer) return;

    const isDesktop = window.innerWidth > 768;

    if (drawer.classList.contains('translate-x-full')) {
        drawer.classList.remove('translate-x-full');
        drawer.classList.add('translate-x-0');
        if(aiView && isDesktop) aiView.style.width = 'calc(100% - 465px)';
        window.loadZenNotes(); 
    } else {
        drawer.classList.add('translate-x-full');
        drawer.classList.remove('translate-x-0');
        if(aiView) aiView.style.width = '100%';
    }
}

/**
 * Executes standard Document.execCommand for rich text formatting.
 */
window.formatZen = function(command, value = null) {
    document.execCommand(command, false, value);
    document.getElementById('zen-notes-input').focus();
    triggerZenSave();
}

/**
 * Custom dialog implementation for inserting hyperlinks.
 * Bypasses native prompt() restrictions in Electron environments.
 */
window.insertZenLink = function() {
    const selection = window.getSelection();
    
    if (selection.rangeCount === 0 || selection.toString().trim() === "") {
        if(window.showToast) window.showToast("Please select text to create a link.", "warning");
        return; 
    }
    
    const range = selection.getRangeAt(0);
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 opacity-0 transition-opacity duration-200';
    overlay.innerHTML = `
        <div class="bg-[#18181b] border border-[#3f3f46] rounded-xl shadow-2xl p-6 w-full max-w-sm transform scale-95 transition-transform duration-200" id="zen-link-box">
            <h3 class="text-white font-bold mb-1 text-sm flex items-center gap-2">
                <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                Insert Link
            </h3>
            <p class="text-[11px] text-gray-500 mb-4">Enter URL for the selected text.</p>
            <input type="url" id="zen-custom-url" placeholder="https://..." class="w-full bg-[#242427] border border-[#3f3f46] rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 mb-5" value="https://">
            <div class="flex justify-end gap-2">
                <button id="zen-link-cancel" class="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white transition">Cancel</button>
                <button id="zen-link-save" class="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition shadow-md">Apply Link</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
        overlay.classList.remove('opacity-0');
        document.getElementById('zen-link-box').classList.remove('scale-95');
        const inputUrl = document.getElementById('zen-custom-url');
        inputUrl.focus();
        inputUrl.setSelectionRange(8, 8); 
    });

    const closePrompt = () => {
        overlay.classList.add('opacity-0');
        document.getElementById('zen-link-box').classList.add('scale-95');
        setTimeout(() => overlay.remove(), 200);
    };

    document.getElementById('zen-link-cancel').onclick = closePrompt;
    
    document.getElementById('zen-link-save').onclick = () => {
        const url = document.getElementById('zen-custom-url').value.trim();
        if (url && url !== "https://") {
            const editor = document.getElementById('zen-notes-input');
            
            editor.focus();
            selection.removeAllRanges();
            selection.addRange(range);

            document.execCommand('createLink', false, url);
            
            const links = editor.getElementsByTagName('a');
            for (let i = 0; i < links.length; i++) {
                if (links[i].getAttribute('href') === url) {
                    links[i].target = "_blank";
                    links[i].className = "text-blue-400 underline hover:text-blue-300";
                    links[i].title = "Ctrl + Click to open link";
                }
            }
            triggerZenSave();
            if(window.showToast) window.showToast("Link applied successfully.", "success");
        }
        closePrompt();
    };
}

/**
 * Context-aware table insertion.
 * Appends a new row if the cursor is inside an existing table, 
 * otherwise generates a new default table.
 */
window.insertZenTable = function() {
    const editor = document.getElementById('zen-notes-input');
    const selection = window.getSelection();
    
    if (!selection.rangeCount) editor.focus();
    
    let currentNode = selection.anchorNode;
    
    if (currentNode && currentNode.nodeType === 3) {
        currentNode = currentNode.parentNode;
    }

    let tableEl = currentNode ? currentNode.closest('table') : null;

    if (tableEl) {
        const tbody = tableEl.querySelector('tbody') || tableEl;
        const firstRow = tableEl.querySelector('tr');
        
        let colCount = firstRow ? firstRow.children.length : 2;

        const newRow = document.createElement('tr');
        for (let i = 0; i < colCount; i++) {
            const newCell = document.createElement('td');
            newCell.innerHTML = 'Data ' + (i + 1);
            newCell.style.border = "1px solid #3f3f46";
            newCell.style.padding = "8px 12px";
            newCell.style.backgroundColor = "rgba(24, 24, 27, 0.5)";
            newRow.appendChild(newCell);
        }
        tbody.appendChild(newRow);
        
    } else {
        const tableHTML = `
            <br>
            <table style="width: 100%; border-collapse: collapse; margin: 1em 0; border: 1px solid #3f3f46;">
                <tbody>
                    <tr>
                        <th style="border: 1px solid #3f3f46; padding: 8px 12px; background-color: #27272a; color: white; font-weight: bold; text-align: left;">Header 1</th>
                        <th style="border: 1px solid #3f3f46; padding: 8px 12px; background-color: #27272a; color: white; font-weight: bold; text-align: left;">Header 2</th>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #3f3f46; padding: 8px 12px; background-color: rgba(24, 24, 27, 0.5);">Data 1</td>
                        <td style="border: 1px solid #3f3f46; padding: 8px 12px; background-color: rgba(24, 24, 27, 0.5);">Data 2</td>
                    </tr>
                </tbody>
            </table>
            <br>
        `;
        document.execCommand('insertHTML', false, tableHTML);
    }
    
    editor.focus();
    triggerZenSave();
}

/**
 * Debounced local storage synchronization to prevent performance degradation.
 */
let zenSaveTimeout;
function triggerZenSave() {
    const editor = document.getElementById('zen-notes-input');
    const status = document.getElementById('zen-save-status');
    if (!editor) return;

    clearTimeout(zenSaveTimeout);
    if(status) {
        status.innerHTML = `<svg class="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> Saving...`;
        status.classList.remove('opacity-0');
        status.classList.replace('text-green-400', 'text-gray-400');
    }
    
    zenSaveTimeout = setTimeout(() => {
        localStorage.setItem('notiybot_zen_notes', editor.innerHTML);
        if(status) {
            status.innerHTML = `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg> Saved`;
            status.classList.replace('text-gray-400', 'text-green-400');
            setTimeout(() => status.classList.add('opacity-0'), 2000);
        }
    }, 800);
}

/**
 * Main initialization process for Zen Scratchpad.
 * Attaches event listeners for formatting, storage, and interaction handling.
 */
window.initZenNotes = function() {
    const editor = document.getElementById('zen-notes-input');
    if (!editor) return;
    
    editor.addEventListener('input', triggerZenSave);

    // Markdown list auto-formatting handler
    editor.addEventListener('keyup', function(e) {
        if (e.key === ' ' || e.code === 'Space') {
            const sel = window.getSelection();
            if (!sel.anchorNode) return;
            
            if (sel.anchorNode.nodeType === 3) {
                const text = sel.anchorNode.textContent;
                
                if (text === '- ' || text === '* ') {
                    document.execCommand('delete', false); 
                    document.execCommand('delete', false); 
                    document.execCommand('insertUnorderedList', false, null);
                } 
                else if (text === '1. ') {
                    document.execCommand('delete', false); 
                    document.execCommand('delete', false); 
                    document.execCommand('delete', false); 
                    document.execCommand('insertOrderedList', false, null);
                }
            }
        }
    });

    // Electron shell integration for external links
    editor.addEventListener('click', function(e) {
        const link = e.target.closest('a');
        if (link && (e.ctrlKey || e.metaKey)) {
            e.preventDefault(); 
            const url = link.getAttribute('href');
            if (url) {
                try {
                    require('electron').shell.openExternal(url);
                } catch(err) {
                    window.open(url, '_blank');
                }
            }
        }
    });

    // Dynamic cursor state handler for modifier keys
    editor.addEventListener('mousemove', function(e) {
        const link = e.target.closest('a');
        if (link) {
            if (e.ctrlKey || e.metaKey) {
                link.style.cursor = 'pointer';
            } else {
                link.style.cursor = 'text';
            }
        }
    });
}

window.loadZenNotes = function() {
    const editor = document.getElementById('zen-notes-input');
    if(editor) {
        let savedData = localStorage.getItem('notiybot_zen_notes') || "";
        if(savedData && !savedData.includes('<') && !savedData.includes('>')) {
            savedData = savedData.replace(/\n/g, '<br>');
        }
        editor.innerHTML = savedData;
        editor.focus();
    }
}

window.clearZenNotes = function() {
    if(confirm("Clear all data in the scratchpad? This action cannot be undone.")) {
        localStorage.removeItem('notiybot_zen_notes');
        const editor = document.getElementById('zen-notes-input');
        if(editor) editor.innerHTML = "";
    }
}

window.copyZenNotes = function() {
    const editor = document.getElementById('zen-notes-input');
    if(editor && editor.innerText.trim() !== "") {
        navigator.clipboard.writeText(editor.innerText).then(() => {
            if(window.showToast) window.showToast("Notes copied to clipboard.", "success");
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.initZenNotes();
});