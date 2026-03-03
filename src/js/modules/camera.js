window.webcamStream = null;

window.openCameraModal = function() {
    const modal = document.getElementById('modal-camera');
    const content = document.getElementById('camera-modal-content');
    if(!modal || !content) return;

    modal.classList.remove('opacity-0', 'pointer-events-none');
    content.classList.remove('scale-95');
    
    // inisialisasi kamera
    document.getElementById('camera-select').innerHTML = '<option value="">Mendeteksi Kamera...</option>';
    window.initializeCamera();
}

window.initializeCamera = async function(deviceId = null) {
    if (window.webcamStream) {
        window.webcamStream.getTracks().forEach(track => track.stop());
    }

    try {
        const constraints = deviceId ? { video: { deviceId: { exact: deviceId } } } : { video: true };
        window.webcamStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        const video = document.getElementById('webcam-video');
        if(video) video.srcObject = window.webcamStream;

        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        const selectEl = document.getElementById('camera-select');
        
        if(!selectEl) return;
        selectEl.innerHTML = '';
        if(videoDevices.length === 0) {
            selectEl.innerHTML = '<option value="">Tidak ada kamera terdeteksi</option>';
            return;
        }

        videoDevices.forEach((device, index) => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.text = device.label || `Kamera ${index + 1}`; 
            
            if (deviceId === device.deviceId || (!deviceId && index === 0)) {
                option.selected = true;
            }
            selectEl.appendChild(option);
        });

    } catch (err) {
        if(window.showToast) window.showToast("Gagal akses Kamera! Pastikan tidak diblokir oleh Windows.", "error");
        console.error(err);
    }
}

window.switchCamera = function() {
    const selectEl = document.getElementById('camera-select');
    const selectedDeviceId = selectEl.value;
    if(selectedDeviceId) {
        window.initializeCamera(selectedDeviceId);
    }
}

window.closeCameraModal = function() {
    if(window.webcamStream) {
        window.webcamStream.getTracks().forEach(track => track.stop());
        window.webcamStream = null;
    }
    const modal = document.getElementById('modal-camera');
    const content = document.getElementById('camera-modal-content');
    if(modal) modal.classList.add('opacity-0', 'pointer-events-none');
    if(content) content.classList.add('scale-95');
}

window.captureCamera = function() {
    const video = document.getElementById('webcam-video');
    const canvas = document.getElementById('webcam-canvas');
    if(!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    const base64data = dataUrl.split(',')[1];
    
    window.currentAiFile = {
        name: "Webcam_Jepretan.jpg",
        type: "image/jpeg",
        base64: base64data
    };
    
    const preview = document.getElementById('ai-attachment-preview');
    const nameEl = document.getElementById('ai-attachment-name');
    if(preview) preview.classList.remove('hidden');
    if(nameEl) nameEl.innerText = "Webcam_Jepretan.jpg";
    
    window.closeCameraModal();
    if(window.showToast) window.showToast("Foto berhasil diambil dan dilampirkan!", "success");
}