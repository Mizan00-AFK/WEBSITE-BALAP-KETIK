# BALAP KETIK - Balap Motor Mengetik Bahasa Indonesia

**KETIK. BALAP. MENANG.** - game balapan motor untuk menguji kemampuan mengetik **Bahasa Indonesia**. Semakin cepat dan akurat kamu mengetik, semakin cepat motormu melaju. Main **solo melawan AI**, **bareng teman (2-4 pemain online)** lewat kode room, atau **latihan** sendiri - di desktop maupun HP, dalam satu website.

Seluruh tulisan di website dan **seluruh teks yang diketik pemain menggunakan Bahasa Indonesia** (120 teks, 12 kategori).

> **THIS PROJECT DOES NOT USE A DATABASE.**
>
> Tidak ada PostgreSQL, MySQL, MongoDB, Firebase, Supabase, Redis, ORM, migration, maupun login.
> Semua data multiplayer hidup di memory server (`Map`) dan hilang saat server restart - **itu memang desainnya, bukan bug.**

---

## Project

Balap Ketik menggabungkan *tes mengetik + balap motor + multiplayer online*:

```text
Teks -> pemain mengetik -> hitung karakter benar -> progres -> motor melaju -> finis -> peringkat
```

- Semua pemain dalam satu balapan mendapat **teks, panjang, dan waktu mulai yang sama** (teks dipilih server).
- Countdown **SIAP - 3 - 2 - 1 - GAS!** sinkron untuk semua pemain (berbasis timestamp server).
- Server menentukan **urutan finis** dan memvalidasi progres (tidak percaya penuh pada client).
- Yang berbeda antar pemain hanya kecepatan mengetik, akurasi, progres, WPM, kombo, dan pemakaian nitro.

## Features

| Fitur | Keterangan |
| --- | --- |
| Balap solo | Lawan 1-3 AI dengan 4 tingkat (MUDAH 25-35, SEDANG 40-50, SULIT 55-70, AHLI 75-100 WPM) |
| Main bareng | Buat / gabung room dengan kode 6 karakter, 2-4 pemain, sistem SIAP, host menekan MULAI BALAPAN |
| Latihan | Pilih kategori, tingkat kesulitan, dan panjang teks; tanpa lawan dan tanpa multiplayer |
| Teks Bahasa Indonesia | 120 teks, 12 kategori, 4 tingkat kesulitan, 4 tier panjang (pendek / sedang / panjang / maraton) |
| Pilihan teks | Kategori + kesulitan + panjang bisa dipilih di Solo, Latihan, dan oleh host di room |
| AI di room | Host bisa mengisi slot kosong dengan pembalap AI yang disimulasikan server |
| Mesin ketik | Hijau = benar, cyan = huruf aktif, merah = salah, abu-abu = belum diketik; tidak bisa melewati huruf yang salah |
| HUD | Posisi, WPM, akurasi, salah ketik, waktu (+ sisa waktu), kombo, nitro |
| Kombo & nitro | Kombo 10 / 25 / 50 (+ tiap 25 berikutnya) mengisi nitro; ENTER = melesat 1,5 detik (api, garis kecepatan, guncangan kamera, suara) |
| Visual Phaser | 3 lintasan prosedural (Kota Neon, Jalan Raya Senja, Jalur Aurora), parallax, lampu jalan, garis MULAI/FINIS, 4 motor beranimasi |
| Peringkat langsung | Diurutkan berdasarkan progres, seri diputus oleh siapa yang lebih dulu sampai |
| Hasil | Pemenang, peringkat bermedali, statistik (WPM, akurasi, salah ketik, waktu, kombo maks, nitro dipakai), BALAP LAGI / KEMBALI KE ROOM / MENU UTAMA |
| Statistik sesi | WPM terbaik, rata-rata WPM, akurasi terbaik, total balapan, jumlah menang - hanya selama sesi |
| Koneksi terputus | Notifikasi "Pemain Budi terputus.", 20 detik untuk menyambung ulang, host pindah otomatis, room kosong dihapus |
| Responsif | Desktop (area balap besar + HUD lengkap), tablet, HP (HUD ringkas, input di bawah, keyboard virtual) |
| Suara | Mesin, countdown, ketikan, salah, kombo, nitro, finis, kemenangan (Web Audio) + tombol suara aktif/mati |

## Tech stack

**Frontend**: React 19, TypeScript, Vite 8, Phaser 3.90, Zustand, React Router, Socket.IO client
**Backend**: Node.js (>= 20.12), TypeScript, Express 5, Socket.IO 4
**Database**: tidak ada (hanya memory)

```text
Browser -> React (menu, lobi, HUD, mengetik) -> Phaser (visual balapan)
        -> Socket.IO -> server Node.js -> state game di memory (Map<string, Room>)
```

## Folder structure

```text
WEBSITE BALAP KETIK/
├── client/                         # React + Vite + Phaser
│   ├── public/assets/
│   │   ├── motorcycles/            # speedster.svg, thunder.svg, phantom.svg, blaze.svg
│   │   ├── tracks/  effects/  sounds/  ui/  fonts/   # (README di tiap folder)
│   ├── src/
│   │   ├── data/typingTexts.ts     # BANK TEKS Bahasa Indonesia (dipakai client DAN server)
│   │   ├── components/             # Navbar, GameCard, TypingBox, RaceHUD, Countdown, PlayerList, RoomLobby,
│   │   │                           # Leaderboard, ResultScreen, RaceCanvas, TextOptions, SessionStats, ...
│   │   ├── pages/                  # Home, GameMode, SoloSetup, Practice, Multiplayer, CreateRoom, JoinRoom,
│   │   │                           # Room, Race, Result
│   │   ├── game/                   # GameScene, Motorcycle, Track, RaceManager, NitroEffect, GameConfig
│   │   ├── hooks/                  # useTyping, useRace, useSocket
│   │   ├── services/               # socket.ts (Socket.IO + sinkron jam server), sound.ts
│   │   ├── store/                  # gameStore.ts (Zustand, hanya sesi)
│   │   ├── types/                  # Player, Room, Race
│   │   ├── utils/                  # typing.ts, wpm.ts, randomText.ts, raceSetup.ts
│   │   ├── styles/                 # global.css, variables.css, animations.css
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
├── server/                         # Express + Socket.IO
│   ├── src/
│   │   ├── server.ts
│   │   ├── config.ts
│   │   ├── socket/                 # roomSocket.ts, raceSocket.ts, guard.ts (rate limit)
│   │   ├── game/                   # RoomManager.ts, RaceManager.ts, AIPlayer.ts
│   │   ├── types/                  # Room & Player (memory server)
│   │   └── utils/                  # validation, rateLimiter, logger
│   ├── scripts/smoke-test.ts       # tes multiplayer otomatis (2 client Socket.IO sungguhan)
│   └── package.json
├── shared/                         # dipakai client DAN server
│   ├── gameConfig.ts               # GAME_CONFIG (satu-satunya tempat angka gameplay)
│   ├── texts.ts                    # meneruskan client/src/data/typingTexts.ts ke server
│   ├── types.ts                    # tipe data + kontrak event Socket.IO
│   ├── ai.ts  motorcycles.ts  tracks.ts  stats.ts  validation.ts
│   └── package.json                # hanya menandai folder sebagai ES module
├── package.json                    # npm workspaces + script dev/build/start
├── .env.example
└── README.md
```

## Installation

Butuh **Node.js 20.12+** (diuji dengan Node 22) dan npm.

```bash
npm install          # sekali saja, meng-install client + server (npm workspaces)
cp .env.example .env # opsional - nilai default sudah jalan
```

## Run (development)

```bash
npm run dev
```

- Server Socket.IO: `http://localhost:3001`
- Client (Vite): **`http://localhost:5173`** <- buka ini
- Vite mem-*proxy* `/socket.io` dan `/api` ke server, jadi client cukup satu alamat.

### Run client

```bash
npm run dev:client      # = npm run dev --workspace client  (Vite, port 5173)
```

### Run server

```bash
npm run dev:server      # = npm run dev --workspace server  (tsx watch, port 3001)
```

Mode solo dan latihan berjalan sepenuhnya di browser (tidak butuh server). Main bareng butuh server.

## Production

```bash
npm run build    # build client (client/dist) + bundle server (server/dist/server.js)
npm run start    # server melayani API, Socket.IO, DAN client hasil build di http://localhost:3001
```

### Environment variables

| Variabel | Default | Fungsi |
| --- | --- | --- |
| `PORT` | `3001` | Port server |
| `CLIENT_URL` | `http://localhost:5173` | Origin client yang diizinkan CORS di production (boleh dipisah koma) |
| `CLIENT_DIST` | `./client/dist` | Lokasi build client yang disajikan server |
| `VITE_SERVER_URL` | *(kosong)* | Hanya jika client di-hosting terpisah dari server |

## Teks Bahasa Indonesia

Bank teks ada di **`client/src/data/typingTexts.ts`** (lokal, tanpa database). Server meng-import file yang sama melalui `shared/texts.ts`, sehingga id teks yang dipilih server selalu cocok dengan bank teks di browser.

**12 kategori x 10 teks = 120 teks**: Umum, Teknologi, Pendidikan, Indonesia, Sains, Lingkungan, Ekonomi, Sehari-hari, Olahraga, Budaya, Pemrograman, Game.

| Tingkat kesulitan | Ciri | Jumlah teks |
| --- | --- | --- |
| Mudah (`easy`) | kalimat pendek, kata umum, sedikit tanda baca, tanpa angka | 36 |
| Sedang (`medium`) | kalimat lebih panjang, tanda baca sederhana | 36 |
| Sulit (`hard`) | angka, istilah, lebih banyak tanda baca | 28 |
| Ahli (`expert`) | istilah teknis, angka, struktur kalimat kompleks | 20 |

Tier panjang dihitung otomatis dari jumlah karakter:

| Tier | Panjang | Jumlah teks |
| --- | --- | --- |
| Pendek | 20-50 karakter | 24 |
| Sedang | 50-120 karakter | 37 |
| Panjang | 120-250 karakter | 47 |
| Maraton | 250-500 karakter | 12 |

Utilitas yang tersedia: `getRandomTypingText()`, `getTypingTextByCategory(category)`, `getTypingTextByDifficulty(difficulty)`, `getTypingTextByLength(length)`, `getTypingTextById(id)`, `filterTypingTexts(filter)`, dan `pickTypingText(filter, excludeId)`.

- Setiap balapan memilih teks **acak** sesuai filter, dan teks yang sama tidak muncul dua kali berturut-turut.
- Jika kombinasi filter tidak punya teks (mis. Mudah + Maraton), filter dilonggarkan bertahap: panjang -> kesulitan -> kategori.
- Batas waktu balapan 2 menit; teks maraton otomatis mendapat waktu lebih (panjang teks / 2 karakter per detik, maksimal 5 menit).

## Multiplayer testing

1. `npm run dev`
2. Buka `http://localhost:5173` di beberapa jendela/browser, misalnya:
   - Chrome jendela 1 -> Pemain 1 (BUAT ROOM, salin kode)
   - Chrome Incognito / tab baru -> Pemain 2 (GABUNG ROOM)
   - Firefox -> Pemain 3
   - Edge -> Pemain 4

   Setiap tab punya identitas sendiri (sessionStorage per tab), jadi dua tab di browser yang sama pun dihitung sebagai dua pemain.
3. Pemain non-host menekan **SIAP**, host menekan **MULAI BALAPAN**.

**Tes dari HP (Wi-Fi yang sama):** Vite menampilkan alamat `Network`, mis. `http://192.168.1.10:5173`. Buka alamat itu di HP - laptop, Android, dan iPhone bisa masuk room yang sama.

**Tes otomatis:** dengan server berjalan, jalankan

```bash
npm run test:smoke --workspace server
```

Skrip ini memakai 2 client Socket.IO sungguhan dan memeriksa 35 hal, antara lain:

- buat/gabung room dan pesan error ("Room tidak ditemukan.", "Room sudah penuh.")
- bot AI dan aturan SIAP
- pengaturan teks oleh host (kategori + panjang)
- teks berasal dari bank teks Indonesia, teks sama untuk semua pemain, `race_started` membawa `textId` + `text`
- countdown sinkron, nitro, urutan finis, hasil, balap lagi
- anti-cheat, terputus + gabung ulang, perpindahan host

## How room works

- **Buat room**: server membuat kode 6 karakter (tanpa karakter mirip seperti `0/O` dan `1/I`), pembuat room menjadi **host**. Ukuran room 2-4 pemain.
- **Gabung room**: validasi kode, nama, dan motor. Pesan error: `Room tidak ditemukan.`, `Room sudah penuh.`, `Balapan sudah dimulai.`
- **Lobi**: host memilih lintasan, kategori teks, tingkat kesulitan teks, panjang teks, serta menambah/menghapus AI. Balapan hanya bisa dimulai jika **minimal 2 pembalap**, **semua pemain SIAP**, dan tidak ada yang sedang terputus.
- **Balapan**: server memilih **satu** teks sesuai pilihan host, lalu mengirim `race_countdown` (teks + `startAt`) dan `race_started` (`textId` + `text`). Client tidak pernah memilih teks sendiri. Setiap client menyinkronkan jamnya (ping ala NTP) sehingga GAS! muncul bersamaan.
- **Balap lagi**: room yang sama dipakai lagi - progres, WPM, akurasi, salah ketik, kombo, nitro, status finis, dan waktu finis direset.
- **Terputus**: pemain ditandai offline + notifikasi "Pemain X terputus."; jika tidak kembali dalam 20 detik (`disconnectTimeout`) ia dikeluarkan. Host yang terputus langsung digantikan pemain berikutnya. Refresh halaman bisa gabung ulang otomatis lewat token sementara di sessionStorage.
- **Pembersihan**: room dihapus dari memory jika kosong atau tidak aktif selama 10 menit (`roomTimeout`). Server restart = semua room hilang.

## How AI works

AI **tanpa machine learning** - hanya mensimulasikan manusia mengetik (`shared/ai.ts`):

1. Base WPM diambil acak dari rentang level, akurasi dari rentang akurasi level.
2. Kecepatan berayun naik-turun tiap 1-2,6 detik (mis. base 65 -> 61, 68, 64, 70, 63) agar tidak terlihat seperti robot.
3. Setiap ketukan punya peluang salah; salah ketik mereset kombo dan memberi jeda "sadar & perbaiki" 160-380 ms.
4. Ada waktu reaksi 250-700 ms setelah GAS!.
5. Kecepatan ketik sesaat dikompensasi supaya WPM akhir (setelah salah ketik & jeda) tetap di rentang level. Hasil simulasi 400 balapan per level: rata-rata 30 / 45 / 63 / 87 WPM, akurasi 92 / 94,5 / 96,5 / 98%.
6. Progres AI = karakter benar / panjang teks; AI mengisi dan memakai nitro dengan aturan yang sama seperti pemain.

Mode solo menjalankan AI di browser; AI di room main bareng dijalankan server (`server/src/game/AIPlayer.ts`) dengan kode simulasi yang sama.

## How typing works

- Input memakai `<input>` sungguhan agar keyboard virtual Android/iOS bekerja. Hook `useTyping` membaca perubahan isi input, meneruskan setiap karakter ke `TypingEngine` (`client/src/utils/typing.ts`), lalu mengembalikan isi input ke bagian kata yang sudah benar.
- Setiap ketukan: cek karakter -> karakter benar -> salah ketik -> akurasi -> WPM -> progres -> kombo -> nitro -> posisi motor. Motor sendiri bergerak saat itu juga (tanpa menunggu server).
- Rumus:
  - `progres = karakterBenar / totalKarakter` (maks 1,0)
  - `WPM = (karakterBenar / 5) / menitBerlalu` (WPM = kata per menit)
  - `akurasi = ketukanBenar / totalKetukan x 100`
- Salah ketik = huruf menjadi merah; kursor tidak maju sampai tombol yang benar ditekan. Salah ketik juga mereset kombo dan motor sedikit kehilangan momentum.
- **Nitro**: kombo 10 -> +10, 25 -> +10, 50 -> +20, lalu +20 tiap 25 kombo. Dengan nitro >= 50%, tekan **ENTER** (atau ketuk tombol NITRO di HP). Selama 1,5 detik setiap karakter benar bernilai 1,5x jarak - keuntungan kecil yang bisa membawa motor melewati garis finis sedikit lebih awal (sisa teks ditandai sebagai "bonus nitro").
  > Catatan: spesifikasi awal menyebut SPACE untuk nitro, tetapi spasi adalah bagian dari teks yang diketik, sehingga tombolnya ENTER (bisa diubah di `GAME_CONFIG.nitroKey`).
- **Sinkronisasi**: client mengirim progres ~15x/detik (`socketUpdateRate`), bukan per ketukan. Server mem-broadcast state ~15x/detik, dan Phaser meng-interpolasi posisi motor lawan agar halus.

### Server authoritative state & keamanan

Server adalah sumber kebenaran untuk room, daftar pemain, status, countdown, waktu mulai, teks, dan urutan finis. Validasi yang dilakukan:

- nama (2-16 karakter, huruf/angka/spasi/`._-`), kode room, motor, lintasan, kategori/kesulitan/panjang teks, tingkat AI
- pemain harus anggota room; pemain hanya bisa mengubah datanya sendiri
- progres 0-1, tidak pernah mundur, dan dibatasi kecepatan manusia yang masuk akal (token bucket, maks 250 WPM)
- bonus nitro dibatasi jumlah nitro yang tervalidasi; nitro hanya bisa dipakai jika sudah "diperoleh" lewat karakter benar
- finis hanya sekali dan hanya jika seluruh teks tervalidasi
- rate limit per event, `player_progress` maks 30/detik, payload Socket.IO maks 8 KB

### Socket.IO events

| Client -> Server | Server -> Client |
| --- | --- |
| `create_room`, `join_room`, `rejoin_room`, `leave_room` | `room_created`, `room_joined`, `room_updated` |
| `player_ready`, `start_race`, `restart_race` | `player_joined`, `player_left`, `notice`, `room_closed` |
| `player_progress`, `use_nitro`, `player_finished` | `race_countdown`, `race_started` (`textId`, `text`), `player_updated` |
| `add_bot`, `remove_bot`, `update_room_settings` | `nitro_activated`, `player_finished`, `race_finished` |
| `time_sync` (sinkron jam) | `error` |

Kontrak lengkap (payload bertipe) ada di `shared/types.ts`.

## Mode latihan & statistik sesi

- **Latihan** (`/practice`): pilih kategori, tingkat kesulitan, dan panjang teks, lalu mengetik di lintasan satu jalur tanpa lawan. Tidak memakai server.
- **Statistik sesi**: WPM terbaik, rata-rata WPM, akurasi terbaik, total balapan, dan jumlah menang (latihan tidak dihitung sebagai menang). Ditampilkan di halaman pilih mode, latihan, dan hasil. Disimpan di sessionStorage, jadi **hilang saat website/tab ditutup**.

## How to add motorcycles

1. Buat sprite SVG/PNG menghadap ke kanan, ukuran **200 x 110**, roda belakang di **(44, 82)**, roda depan di **(160, 82)**, jari-jari roda 24, knalpot sekitar (28, 66). Simpan di `client/public/assets/motorcycles/<id>.svg`.
2. Tambahkan entri di `shared/motorcycles.ts` (`id`, `name`, `tagline`, `color`, `sprite`, `stats`).

Motor otomatis muncul di menu, lobi, balapan (Phaser menambahkan animasi jari-jari roda, api nitro, dan wheelie), dan hasil. Jika file sprite tidak ada, game membuat placeholder sederhana.

## How to add tracks

1. Tambahkan `{ id, name, description }` di `shared/tracks.ts` (server memvalidasi id ini).
2. Tambahkan tema warna dengan id yang sama di `TRACK_THEMES` (`client/src/game/Track.ts`): warna langit, gaya pemandangan (`city` / `mountains`), warna jalan, pembatas, lampu, dsb.

Semua lapisan (langit, bintang, gedung/gunung, lampu jalan, aspal, garis lajur, garis MULAI & FINIS) digambar secara prosedural, jadi tidak perlu file gambar.

## How to add typing texts

Edit `client/src/data/typingTexts.ts` dan tambahkan pasangan `[tingkatKesulitan, teks]` pada kategori yang sesuai:

```ts
teknologi: [
  // ...
  ['medium', 'Aplikasi transportasi daring memudahkan masyarakat bepergian ke berbagai tempat.'],
],
```

`id` dibuat otomatis berurutan dan tier panjang dihitung dari jumlah karakter. Aturan teks:

- Bahasa Indonesia yang natural dan baku, kapitalisasi normal (bukan HURUF BESAR SEMUA), tanpa slang berlebihan
- hanya karakter ASCII (tanpa tanda kutip miring atau em dash)
- tanda baca wajar: `. , ! ? : ; - %`
- angka hanya untuk tingkat Sulit / Ahli
- istilah asing hanya bila relevan (mis. Teknologi, Pemrograman)
- panjang 20-500 karakter

Untuk kategori baru, tambahkan juga ke tipe `TextCategory`, `TEXT_CATEGORIES`, dan `CATEGORY_LABELS` di file yang sama. Teks otomatis dipakai solo & latihan (dipilih browser) dan main bareng (dipilih server).

## How to deploy

Karena state disimpan di memory, jalankan **satu instance** server yang selalu hidup dan mendukung WebSocket (bukan serverless function).

**Opsi A - satu service (paling mudah)**: Render, Railway, Fly.io, atau VPS.

```bash
npm install
npm run build
PORT=3001 NODE_ENV=production npm run start
```

Server menyajikan client + Socket.IO dari origin yang sama. Di VPS gunakan `pm2 start server/dist/server.js --name balap-ketik` dan reverse proxy Nginx dengan dukungan WebSocket:

```nginx
location / {
  proxy_pass http://127.0.0.1:3001;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header Host $host;
}
```

**Opsi B - client & server terpisah** (mis. client di Vercel/Netlify, server di Render):

- build client dengan `VITE_SERVER_URL=https://server-kamu.example.com npm run build --workspace client`
- set `CLIENT_URL=https://client-kamu.example.com` dan `NODE_ENV=production` di server
- tambahkan rewrite SPA (semua path -> `index.html`) di hosting client

Jangan menjalankan beberapa instance server di belakang load balancer: room di instance A tidak terlihat dari instance B (tidak ada database / Redis - sesuai desain).

## Data lifetime (hanya sesi)

```text
masuk website -> ID pemain sementara -> buat room (memory server) -> teman bergabung -> balapan
-> hasil -> balap lagi (room tetap) -> semua keluar -> room dihapus -> data hilang
```

- **sessionStorage**: nama, motor pilihan, token gabung ulang sementara, dan statistik sesi (hilang saat tab ditutup)
- **localStorage**: hanya preferensi suara aktif/mati dan volume
- Tidak disimpan: nama asli, email, password, alamat, akun, leaderboard permanen, riwayat pertandingan

## Development phases

| Fase | Isi | Lokasi utama |
| --- | --- | --- |
| 1 | Setup project (workspaces, TS, Vite, Express) | `package.json`, `client/`, `server/`, `shared/` |
| 2 | Landing page | `client/src/pages/Home.tsx` |
| 3 | Mesin ketik | `client/src/utils/typing.ts`, `hooks/useTyping.ts` |
| 4-5 | Lintasan + motor Phaser | `client/src/game/*` |
| 6 | Solo vs AI | `shared/ai.ts`, `hooks/useRace.ts` |
| 7-10 | Server Socket.IO, buat/gabung room, balapan realtime 2-4 pemain | `server/src/*` |
| 11 | Nitro / kombo | `shared/stats.ts`, `game/NitroEffect.ts` |
| 12 | Layar hasil | `components/ResultScreen` |
| 13 | Responsif mobile | CSS media queries, `useTyping` |
| 14 | Optimasi | Phaser di-lazy-load, update socket di-throttle, React tidak re-render tiap frame |
| + | Teks Bahasa Indonesia, mode latihan, statistik sesi | `client/src/data/typingTexts.ts`, `pages/Practice.tsx`, `components/SessionStats` |

## Troubleshooting

- **"Server game tidak bisa dihubungi"** di halaman main bareng -> pastikan `npm run dev` (atau `npm run dev:server`) berjalan dan port 3001 tidak dipakai aplikasi lain.
- **Tidak ada suara** -> browser baru mengizinkan audio setelah klik/tekan tombol pertama; cek juga tombol speaker di navbar.
- **Ikon kategori Indonesia tampil sebagai "ID"** -> Windows tidak punya emoji bendera, jadi 🇮🇩 ditampilkan sebagai huruf; di HP/macOS tampil sebagai bendera.
- **Salin kode room gagal di HP lewat alamat `http://192.168...`** -> browser memblokir Clipboard API di http non-localhost; kode tetap tampil besar di layar untuk diketik manual.
