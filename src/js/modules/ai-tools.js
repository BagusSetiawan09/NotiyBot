window.copyCode = function(elementId, btnElement) {
    const codeEl = document.getElementById(elementId);
    if(codeEl) {
        navigator.clipboard.writeText(codeEl.innerText).then(() => {
            const originalIcon = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>`;
            const checkIcon = `<svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;
            btnElement.innerHTML = checkIcon;
            setTimeout(() => { btnElement.innerHTML = originalIcon; }, 2000);
        });
    }
}

window.copyFullText = function(elementId, btnElement) {
    const textEl = document.getElementById(elementId);
    if(textEl) {
        navigator.clipboard.writeText(textEl.innerText).then(() => {
            const originalHTML = btnElement.innerHTML;
            btnElement.innerHTML = `<svg class="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> <span class="text-green-400">Tersalin!</span>`;
            setTimeout(() => { btnElement.innerHTML = originalHTML; }, 2000);
        });
    }
}

window.downloadAsWord = function(elementId) {
    const textEl = document.getElementById(elementId);
    if(!textEl) return;

    let rawText = "";
    const codeBlocks = textEl.querySelectorAll('code[class*="language-"]');
    if (codeBlocks.length > 0) rawText = codeBlocks[codeBlocks.length - 1].innerText; 
    else rawText = textEl.innerText; 

    let lines = rawText.split('\n');
    let processedHtml = "";
    let inTable = false;
    let rowCount = 0;

    lines.forEach(line => {
        let trimmed = line.trim();
        if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
            if (!inTable) {
                inTable = true;
                rowCount = 0;
                processedHtml += '<table style="border-collapse: collapse; width: 100%; margin-bottom: 15px;">\n';
            }
            if (/^[|\s\-:]+$/.test(trimmed)) return; 
            
            rowCount++;
            let cells = trimmed.split('|').slice(1, -1);
            processedHtml += '<tr>\n';
            
            cells.forEach(cell => {
                let cellText = cell.trim()
                    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
                    .replace(/\*(.*?)\*/g, '<i>$1</i>');
                    
                if (rowCount === 1) {
                    processedHtml += `<th style="border: 1px solid black; padding: 8px; background-color: #f2f2f2; text-align: left;">${cellText}</th>\n`;
                } else {
                    processedHtml += `<td style="border: 1px solid black; padding: 8px; vertical-align: top;">${cellText}</td>\n`;
                }
            });
            processedHtml += '</tr>\n';
            
        } else {
            if (inTable) {
                inTable = false;
                processedHtml += '</table>\n';
            }
            let formatted = trimmed
                .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
                .replace(/\*(.*?)\*/g, '<i>$1</i>')
                .replace(/^### (.*?)$/, '<h3>$1</h3>')
                .replace(/^## (.*?)$/, '<h2>$1</h2>')
                .replace(/^# (.*?)$/, '<h1>$1</h1>');
                
            processedHtml += formatted ? (formatted + '<br>\n') : '<br>\n';
        }
    });

    if (inTable) processedHtml += '</table>\n';

    const htmlContent = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
        <head><meta charset="utf-8"><title>Dokumen NotiyBot</title>
        <style>body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5; }</style>
        </head><body>${processedHtml}</body></html>
    `;

    const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Dokumen_NotiyBot_${Date.now()}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if(window.showToast) window.showToast("Berhasil export Word beserta Tabel!", "success");
}

window.runPreview = function(elementId) {
    const codeEl = document.getElementById(elementId);
    if(codeEl) {
        const code = codeEl.innerText;
        const iframe = document.getElementById('preview-iframe');
        iframe.srcdoc = code;
        
        const desktopBtn = document.querySelector('.device-btn');
        if(desktopBtn) window.setPreviewSize('desktop', desktopBtn);
        
        const modal = document.getElementById('modal-preview');
        const content = document.getElementById('preview-modal-content');
        if(modal) modal.classList.remove('opacity-0', 'pointer-events-none');
        if(content) content.classList.remove('scale-95');
        
        if(window.showToast) window.showToast("Memulai Web Preview...", "success");
    }
}

window.closePreview = function() {
    const modal = document.getElementById('modal-preview');
    const content = document.getElementById('preview-modal-content');
    if(modal) modal.classList.add('opacity-0', 'pointer-events-none');
    if(content) content.classList.add('scale-95');
    
    setTimeout(() => {
        const iframe = document.getElementById('preview-iframe');
        if(iframe) iframe.srcdoc = ''; 
    }, 300);
}

window.setPreviewSize = function(device, btnElement) {
    const wrapper = document.getElementById('preview-wrapper');
    const buttons = document.querySelectorAll('.device-btn');

    buttons.forEach(btn => {
        btn.classList.remove('text-white', 'bg-[#27272a]', 'shadow-sm', 'active');
        btn.classList.add('text-gray-500', 'hover:text-gray-300', 'hover:bg-[#27272a]/50');
    });

    if(btnElement) {
        btnElement.classList.add('text-white', 'bg-[#27272a]', 'shadow-sm', 'active');
        btnElement.classList.remove('text-gray-500', 'hover:text-gray-300', 'hover:bg-[#27272a]/50');
    }

    if(!wrapper) return;
    if(device === 'desktop') {
        wrapper.style.width = '100%';
        wrapper.style.height = '100%';
        wrapper.style.borderRadius = '0.125rem';
        wrapper.style.borderWidth = '0px';
    } else if(device === 'tablet') {
        wrapper.style.width = '768px';
        wrapper.style.height = '1024px';
        wrapper.style.maxHeight = '100%'; 
        wrapper.style.borderRadius = '1.5rem';
        wrapper.style.borderWidth = '16px';
        wrapper.style.borderColor = '#27272a';
    } else if(device === 'mobile') {
        wrapper.style.width = '375px';
        wrapper.style.height = '812px';
        wrapper.style.maxHeight = '100%';
        wrapper.style.borderRadius = '2.5rem';
        wrapper.style.borderWidth = '14px';
        wrapper.style.borderColor = '#27272a';
    }
}

window.downloadAiImage = async function(url, filename) {
    try {
        if(window.showToast) window.showToast("Menyiapkan unduhan gambar...", "info");
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = blobUrl;
        let safeName = filename.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        a.download = (safeName || 'Desain_AI') + '.jpg';
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
        
        if(window.showToast) window.showToast("Gambar berhasil di-download!", "success");
    } catch (err) {
        console.error("Gagal mendownload gambar:", err);
        if(window.showToast) window.showToast("Gagal mendownload. Mengalihkan ke browser...", "warning");
        window.open(url, '_blank');
    }
}

window.openDedicatedPreview = function(url) {
    const overlay = document.createElement('div');
    overlay.id = 'ai-premium-overlay';
    overlay.className = 'fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-5 opacity-0 transition-opacity duration-300 backdrop-blur-md cursor-pointer';
    
    overlay.onclick = function(e) { if(e.target === overlay) window.closeDedicatedPreview(); };

    const imgContainer = document.createElement('div');
    imgContainer.className = 'relative max-w-5xl w-full flex flex-col items-center transform scale-95 transition-transform duration-300';

    const img = document.createElement('img');
    img.src = url;
    img.className = 'max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl border border-[#3f3f46]';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'absolute -top-5 -right-5 bg-red-600 hover:bg-red-500 text-white rounded-full p-2 shadow-xl transition-transform hover:scale-110';
    closeBtn.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';
    closeBtn.onclick = window.closeDedicatedPreview;

    imgContainer.appendChild(img);
    imgContainer.appendChild(closeBtn);
    overlay.appendChild(imgContainer);
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
        overlay.classList.remove('opacity-0');
        imgContainer.classList.remove('scale-95');
    });
};

window.closeDedicatedPreview = function() {
    const overlay = document.getElementById('ai-premium-overlay');
    if (overlay) {
        overlay.classList.add('opacity-0');
        overlay.querySelector('div').classList.add('scale-95');
        setTimeout(() => overlay.remove(), 300);
    }
};