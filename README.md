# RimWorld Colony Generator

Aplikasi web sederhana untuk membuat profil kolonis RimWorld secara acak. Setiap profil menampilkan latar belakang, traits, skill, kondisi kesehatan, dan tugas yang tidak bisa dilakukan.

## Fitur

- Membuat kolonis dengan nama, usia, gender, childhood, dan adulthood acak.
- Menampilkan avatar SVG, kesehatan, kondisi kesehatan, traits, skill, dan batasan pekerjaan.
- Menyimpan kolonis ke roster selama halaman masih terbuka.
- Menghapus kolonis yang tersimpan dari roster.
- Antarmuka bergaya RimWorld dan menyesuaikan ukuran layar.

> Roster hanya disimpan sementara di memori halaman. Kolonis yang tersimpan akan hilang setelah halaman dimuat ulang atau ditutup.

## Menjalankan aplikasi

Tidak perlu instalasi atau proses build.

1. Unduh atau clone repository ini.
2. Buka `index.html` di browser, atau jalankan dengan ekstensi seperti Live Server di Visual Studio Code.
3. Pilih **Generate Colonist** untuk membuat profil baru dan **Save** untuk menambahkannya ke roster.

Tailwind CSS dimuat melalui CDN, jadi koneksi internet diperlukan agar styling Tailwind dapat dimuat.

## Struktur berkas

- `index.html` — struktur halaman dan konfigurasi tema Tailwind.
- `style.css` — styling khusus, animasi, dan komponen.
- `script.js` — data dan logika pembuatan serta penyimpanan sementara kolonis.

## Teknologi

- HTML
- CSS
- JavaScript
- Tailwind CSS CDN

Proyek fan-made ini tidak berafiliasi dengan Ludeon Studios.
