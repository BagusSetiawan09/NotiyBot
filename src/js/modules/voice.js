// VOICE NOTE (INPUT)
window.mediaRecorder = null;
window.audioChunks = [];
window.isRecordingVoice = false;

window.toggleVoiceInput = async function() {
    if (window.isRecordingVoice) {
        window.mediaRecorder.stop();
        document.getElementById('btn-mic').classList.remove('text-red-500', 'animate-pulse', 'bg-red-500/10');
        document.getElementById('btn-mic').classList.add('text-gray-500');
        document.getElementById('ai-input').placeholder = "Memproses Voice Note...";
        window.isRecordingVoice = false;
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        window.mediaRecorder = new MediaRecorder(stream);
        window.audioChunks = [];

        window.mediaRecorder.ondataavailable = event => {
            if (event.data.size > 0) window.audioChunks.push(event.data);
        };

        window.mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(window.audioChunks, { type: 'audio/webm' });
            stream.getTracks().forEach(track => track.stop());

            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = function() {
                const base64data = reader.result.split(',')[1];

                window.currentAiFile = {
                    name: "Voice_Note_Bagus.webm",
                    type: "audio/webm",
                    base64: base64data
                };

                const inputEl = document.getElementById('ai-input');
                if(inputEl) {
                    inputEl.value = "Tolong dengarkan pesan suara ini dan berikan jawabannya.";
                    inputEl.placeholder = "Tanya AI, minta kode, atau upload file... (Shift+Enter untuk baris baru)";
                }
                
                if(typeof window.sendChatMessage === 'function') window.sendChatMessage();
            }
        };

        window.mediaRecorder.start();
        window.isRecordingVoice = true;
        
        const btnMic = document.getElementById('btn-mic');
        if(btnMic) {
            btnMic.classList.remove('text-gray-500');
            btnMic.classList.add('text-red-500', 'animate-pulse', 'bg-red-500/10');
        }
        document.getElementById('ai-input').placeholder = "🔴 Sedang merekam suara... (Klik Mic lagi untuk mengirim)";

    } catch (err) {
        if(window.showToast) window.showToast("Gagal akses mikrofon! Pastikan laptop mengizinkan aplikasi memakai Mic.", "error");
        console.error(err);
    }
}

// CLOUD TTS (OUTPUT)
window.currentCloudAudio = null;
window.audioChunksQueue = [];
window.isVoicePlaying = false;

window.playVoice = function(elementId) {
    if (window.isVoicePlaying) {
        if (window.currentCloudAudio) {
            window.currentCloudAudio.pause();
            window.currentCloudAudio.currentTime = 0;
        }
        window.audioChunksQueue = [];
        window.isVoicePlaying = false;
        if(window.showToast) window.showToast("Suara Cloud AI dihentikan.", "warning");
        return;
    }
    
    const textEl = document.getElementById(elementId);
    if(!textEl) return;
    
    let rawText = textEl.innerText.replace(/[*#`]/g, '').replace(/\n/g, ' ');
    
    const idWords = (rawText.match(/\b(yang|dan|di|dengan|untuk|ini|itu|saya|bisa|ada|bos|kode|buat)\b/gi) || []).length;
    const enWords = (rawText.match(/\b(the|and|is|in|it|you|that|to|for|with|code|make)\b/gi) || []).length;
    let targetLang = idWords >= enWords ? 'id' : 'en'; 
    
    window.audioChunksQueue = [];
    let words = rawText.split(' ');
    let currentSentence = '';
    
    words.forEach(word => {
        if ((currentSentence + word).length > 150) {
            window.audioChunksQueue.push(currentSentence.trim());
            currentSentence = word + ' ';
        } else {
            currentSentence += word + ' ';
        }
    });
    if (currentSentence.trim().length > 0) window.audioChunksQueue.push(currentSentence.trim());
    
    if (window.audioChunksQueue.length > 0) {
        window.isVoicePlaying = true;
        let langName = targetLang === 'id' ? 'Indonesia' : 'Inggris';
        if(window.showToast) window.showToast(`Streaming Suara Cloud AI (${langName})...`, "success");
        window.playNextCloudChunk(targetLang);
    }
}

window.playNextCloudChunk = function(lang) {
    if (window.audioChunksQueue.length === 0) {
        window.isVoicePlaying = false;
        return; 
    }
    
    let chunkText = window.audioChunksQueue.shift();
    let url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${lang}&q=${encodeURIComponent(chunkText)}`;
    
    window.currentCloudAudio = new Audio(url);
    window.currentCloudAudio.onended = () => { window.playNextCloudChunk(lang); };
    window.currentCloudAudio.onerror = () => {
        console.error("Gagal streaming suara dari Cloud, lanjut ke kalimat berikutnya.");
        window.playNextCloudChunk(lang);
    };
    window.currentCloudAudio.play();
}