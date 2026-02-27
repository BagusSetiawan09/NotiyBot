# 🚀 NotiyBot - Super Productivity & Focus Dashboard

![NotiyBot Banner](https://img.shields.io/badge/Status-Active-success?style=for-the-badge)
![Electron.js](https://img.shields.io/badge/Electron.js-47848F?style=for-the-badge&logo=electron&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

**NotiyBot** adalah solusi **Aplikasi Desktop Asisten Produktivitas** yang dirancang untuk membantu Anda tetap fokus, terhidrasi, dan sehat selama bekerja di depan komputer. Mulai dari manajemen waktu (Pomodoro), pelacakan air minum, hingga pengingat kustom interaktif.

Dibangun menggunakan teknologi **Electron.js** dan **Tailwind CSS**, sistem ini menawarkan performa ringan, notifikasi *real-time*, dan antarmuka (UI/UX) bergaya *Glassmorphism* yang modern, premium, serta memanjakan mata.

---

## Fitur Utama & Modul

Aplikasi ini mencakup berbagai modul produktivitas yang terintegrasi:

### 1. Pomodoro Timer & Deep Work
- **Sesi Fokus:** Manajemen waktu kerja (25 menit fokus, 5 menit istirahat).
- **Interactive UI:** Progress bar melingkar, tombol Play/Pause/Reset yang mulus.
- **Smart Notification:** Pop-up otomatis saat sesi fokus atau istirahat berakhir.

### 2. Pelacak Kesehatan (Health Tracker)
- **Water Tracker:** Catat target 8 gelas air harian secara manual dengan tombol interaktif.
- **Stretch Reminder:** Pengingat otomatis untuk berdiri dan meregangkan badan setelah duduk terlalu lama.

### 3. Pengingat Kustom (Custom Alarms)
- **Mode Interval:** Notifikasi yang muncul berulang setiap beberapa menit (misal: tiap 60 menit).
- **Mode Waktu Spesifik:** Alarm yang berbunyi tepat pada jam tertentu (misal: 22:00 WIB untuk waktu tidur).
- **Personalisasi:** Pilih ikon (Heroicons) dan warna *badge* untuk setiap pengingat.

### 4. Mode Senyap (Do Not Disturb)
- **Quick Toggle:** Tombol *switch* ala iOS untuk menahan semua pop-up notifikasi saat Anda sedang *meeting* atau butuh fokus penuh, tanpa menghapus pengaturan timer.

### 5. Personalisasi Animasi (Face Customization)
- **Ubah Wajah Notifikasi:** Ganti animasi pop-up *default* dengan gambar, GIF, atau SVG milik Anda sendiri.
- **Reset Instan:** Kembalikan animasi ke versi Tabbie CSS *original* hanya dengan satu klik.

---

## Teknologi (Tech Stack)

* **Core Framework:** Electron.js
* **Frontend:** HTML5, CSS3, Vanilla JavaScript
* **Styling:** Tailwind CSS (via CDN)
* **Typography:** Plus Jakarta Sans (Google Fonts)
* **Icons:** Heroicons

---

## Persyaratan Sistem (Requirements)

Pastikan komputer Anda memenuhi spesifikasi berikut:
* OS: Windows 10/11, macOS, atau Linux
* Node.js (Disarankan versi LTS terbaru)
* NPM (Node Package Manager)

---

## Panduan Instalasi (Quick Start)

Salin dan jalankan perintah berikut di terminal Anda secara berurutan untuk menjalankan proyek ini di komputer lokal:

```bash
# 1. Clone Repositori
git clone [https://github.com/BagusSetiawan09/NotiyBot.git](https://github.com/BagusSetiawan09/NotiyBot.git)
cd NotiyBot

# 2. Install Dependencies (Wajib)
# Perintah ini akan mengunduh folder node_modules yang dibutuhkan mesin
npm install

# 3. Jalankan Aplikasi
npm start