/**
 * Bank teks ketikan Bahasa Indonesia - disimpan lokal di file ini (TANPA database).
 *
 * File ini dipakai oleh client (mode solo & latihan) DAN server (multiplayer).
 * Pada multiplayer, SERVER yang memilih teks sehingga semua pemain mendapat
 * teks, panjang, dan waktu mulai yang sama.
 *
 * Aturan menambah teks:
 *  - Bahasa Indonesia yang natural, ejaan baku, kapitalisasi normal
 *  - hanya karakter ASCII (tanpa tanda kutip miring / em dash) agar mudah diketik
 *  - tanda baca wajar: . , ! ? : ; - %
 *  - angka hanya untuk tingkat sulit / ahli dan dipakai secara natural
 *  - id dibuat otomatis berurutan per kategori (lihat buildTexts di bawah)
 *
 * File ini sengaja tidak meng-import apa pun agar bisa dipakai di browser dan Node.js.
 */

export type TextCategory =
  | 'umum'
  | 'teknologi'
  | 'pendidikan'
  | 'indonesia'
  | 'sains'
  | 'lingkungan'
  | 'ekonomi'
  | 'sehari-hari'
  | 'olahraga'
  | 'budaya'
  | 'pemrograman'
  | 'game';

export type TextDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

/** short 20-50, medium 50-120, long 120-250, race 250-500 karakter. */
export type TextLength = 'short' | 'medium' | 'long' | 'race';

export type TextCategoryChoice = TextCategory | 'semua';
export type TextDifficultyChoice = TextDifficulty | 'semua';
export type TextLengthChoice = TextLength | 'semua';

export interface TypingText {
  id: number;
  category: TextCategory;
  difficulty: TextDifficulty;
  text: string;
}

export interface TextFilter {
  category?: TextCategoryChoice;
  difficulty?: TextDifficultyChoice;
  length?: TextLengthChoice;
}

export const TEXT_CATEGORIES: readonly TextCategory[] = [
  'umum',
  'teknologi',
  'pendidikan',
  'indonesia',
  'sains',
  'lingkungan',
  'ekonomi',
  'sehari-hari',
  'olahraga',
  'budaya',
  'pemrograman',
  'game',
];

export const TEXT_DIFFICULTIES: readonly TextDifficulty[] = ['easy', 'medium', 'hard', 'expert'];
export const TEXT_LENGTHS: readonly TextLength[] = ['short', 'medium', 'long', 'race'];

export const CATEGORY_LABELS: Record<TextCategoryChoice, { label: string; icon: string }> = {
  semua: { label: 'Semua', icon: '\u{1F30E}' },
  umum: { label: 'Umum', icon: '\u{1F4DD}' },
  teknologi: { label: 'Teknologi', icon: '\u{1F4BB}' },
  pendidikan: { label: 'Pendidikan', icon: '\u{1F393}' },
  indonesia: { label: 'Indonesia', icon: '\u{1F1EE}\u{1F1E9}' },
  sains: { label: 'Sains', icon: '\u{1F52C}' },
  lingkungan: { label: 'Lingkungan', icon: '\u{1F331}' },
  ekonomi: { label: 'Ekonomi', icon: '\u{1F4B0}' },
  'sehari-hari': { label: 'Sehari-hari', icon: '\u{1F3E0}' },
  olahraga: { label: 'Olahraga', icon: '\u{26BD}' },
  budaya: { label: 'Budaya', icon: '\u{1F3A8}' },
  pemrograman: { label: 'Pemrograman', icon: '\u{2328}\u{FE0F}' },
  game: { label: 'Game', icon: '\u{1F3AE}' },
};

export const TEXT_DIFFICULTY_LABELS: Record<TextDifficultyChoice, { label: string; description: string }> = {
  semua: { label: 'Acak', description: 'Semua tingkat kesulitan' },
  easy: { label: 'Mudah', description: 'Kalimat pendek, kata umum, sedikit tanda baca' },
  medium: { label: 'Sedang', description: 'Kalimat lebih panjang, tanda baca sederhana' },
  hard: { label: 'Sulit', description: 'Kalimat panjang, angka, istilah, tanda baca lebih banyak' },
  expert: { label: 'Ahli', description: 'Istilah teknis, angka, struktur kalimat kompleks' },
};

export const TEXT_LENGTH_INFO: Record<TextLengthChoice, { label: string; range: string; min: number; max: number }> = {
  semua: { label: 'Acak', range: 'semua panjang', min: 0, max: Number.POSITIVE_INFINITY },
  short: { label: 'Pendek', range: '20-50 karakter', min: 20, max: 50 },
  medium: { label: 'Sedang', range: '50-120 karakter', min: 51, max: 120 },
  long: { label: 'Panjang', range: '120-250 karakter', min: 121, max: 250 },
  race: { label: 'Maraton', range: '250-500 karakter', min: 251, max: 500 },
};

type RawTexts = Record<TextCategory, readonly (readonly [TextDifficulty, string])[]>;

const RAW_TEXTS: RawTexts = {
  umum: [
    ['easy', 'Hari ini cuaca sangat cerah.'],
    ['easy', 'Belajar membutuhkan kesabaran.'],
    ['easy', 'Hari yang baik dimulai dengan semangat dan kemauan untuk terus belajar.'],
    ['medium', 'Kejujuran adalah dasar dari kepercayaan, baik dalam keluarga, pertemanan, maupun pekerjaan.'],
    ['medium', 'Membaca buku setiap hari dapat menambah wawasan dan melatih kemampuan berpikir kritis.'],
    [
      'medium',
      'Setiap orang memiliki cara sendiri untuk meraih impian. Ada yang bergerak cepat, ada pula yang perlahan, tetapi semuanya membutuhkan kerja keras dan konsistensi.',
    ],
    [
      'hard',
      'Waktu adalah sumber daya yang tidak dapat diulang; oleh karena itu, kita perlu menyusun prioritas, membagi tugas dengan bijak, dan menghindari kebiasaan menunda pekerjaan.',
    ],
    [
      'hard',
      'Menurut banyak penelitian, tidur selama 7 hingga 9 jam setiap malam membantu menjaga konsentrasi, suasana hati, serta daya tahan tubuh orang dewasa.',
    ],
    [
      'expert',
      'Kemampuan berkomunikasi secara efektif, baik lisan maupun tulisan, menjadi keterampilan penting di era kolaborasi; satu gagasan yang disampaikan dengan jelas dapat menjangkau ribuan orang dalam hitungan detik.',
    ],
    [
      'expert',
      'Kebiasaan kecil yang dilakukan secara konsisten sering kali menghasilkan perubahan besar. Seseorang yang membaca 10 halaman buku setiap hari, misalnya, dapat menyelesaikan lebih dari 12 buku dalam setahun. Prinsip yang sama berlaku untuk menabung, berolahraga, dan mempelajari keterampilan baru: mulailah dari langkah sederhana, catat kemajuan, lalu tingkatkan target secara bertahap.',
    ],
  ],

  teknologi: [
    ['easy', 'Teknologi membantu pekerjaan manusia.'],
    ['easy', 'Ponsel pintar kini dimiliki banyak orang.'],
    ['easy', 'Perkembangan teknologi membuat komunikasi menjadi lebih cepat dan mudah.'],
    [
      'medium',
      'Perkembangan teknologi membuat masyarakat dapat memperoleh informasi dengan lebih cepat dan mudah.',
    ],
    ['medium', 'Teknologi membantu manusia menyelesaikan berbagai pekerjaan dengan lebih cepat dan efisien.'],
    [
      'medium',
      'Perkembangan teknologi digital telah mengubah cara masyarakat bekerja, belajar, berkomunikasi, dan memperoleh informasi dalam kehidupan sehari-hari.',
    ],
    [
      'hard',
      'Transformasi digital mendorong berbagai organisasi untuk meningkatkan efisiensi, keamanan, dan kualitas layanan kepada masyarakat.',
    ],
    [
      'hard',
      'Pada tahun 2025, penggunaan internet di Indonesia terus mengalami perkembangan, terutama untuk belanja daring, layanan keuangan, dan pembelajaran jarak jauh.',
    ],
    [
      'expert',
      'Pemanfaatan kecerdasan buatan dalam berbagai sektor membutuhkan pengembangan teknologi yang bertanggung jawab, transparan, aman, dan tetap memperhatikan kepentingan manusia.',
    ],
    [
      'expert',
      'Keamanan siber menjadi tantangan utama di era digital. Serangan phishing, kebocoran data, dan ransomware dapat merugikan individu maupun perusahaan dalam jumlah besar. Untuk mengurangi risiko tersebut, pengguna disarankan memakai kata sandi minimal 12 karakter, mengaktifkan autentikasi dua faktor, memperbarui perangkat lunak secara berkala, dan tidak sembarangan membuka tautan yang mencurigakan.',
    ],
  ],

  pendidikan: [
    ['easy', 'Guru membimbing murid dengan sabar.'],
    ['easy', 'Perpustakaan sekolah selalu ramai.'],
    ['easy', 'Pendidikan memiliki peran penting dalam meningkatkan kualitas sumber daya manusia.'],
    ['medium', 'Belajar secara rutin, konsisten, dan teratur dapat memberikan hasil yang lebih baik.'],
    ['medium', 'Diskusi kelompok melatih siswa untuk menghargai pendapat orang lain dan bekerja sama.'],
    [
      'medium',
      'Sekolah bukan hanya tempat untuk mengejar nilai, tetapi juga tempat membangun karakter, memperluas pertemanan, dan menemukan minat yang dapat dikembangkan di masa depan.',
    ],
    [
      'hard',
      'Literasi digital mencakup kemampuan mencari, menilai, dan menggunakan informasi secara bijak; tanpa kemampuan itu, siswa mudah terjebak berita palsu dan konten yang menyesatkan.',
    ],
    [
      'hard',
      'Dalam satu semester, mahasiswa biasanya mengambil 18 hingga 24 SKS, sehingga mereka perlu mengatur jadwal kuliah, tugas, organisasi, dan waktu istirahat dengan cermat.',
    ],
    [
      'expert',
      'Pembelajaran berbasis proyek mendorong peserta didik untuk mengidentifikasi masalah, merumuskan hipotesis, mengumpulkan data, serta mempresentasikan solusi secara sistematis dan argumentatif.',
    ],
    [
      'hard',
      'Apakah nilai ujian sudah cukup untuk mengukur kemampuan seseorang? Banyak pendidik berpendapat bahwa penilaian juga perlu melihat proses belajar, kreativitas, kerja sama, dan kemampuan memecahkan masalah. Karena itu, berbagai sekolah mulai menggabungkan ujian tertulis dengan portofolio, presentasi, dan proyek kelompok agar gambaran kemampuan siswa menjadi lebih utuh.',
    ],
  ],

  indonesia: [
    ['easy', 'Indonesia memiliki banyak pulau.'],
    ['easy', 'Jakarta adalah kota yang sangat sibuk.'],
    ['easy', 'Indonesia memiliki banyak daerah dengan budaya dan tradisi yang berbeda.'],
    ['medium', 'Indonesia merupakan negara kepulauan yang memiliki kekayaan budaya dan keanekaragaman alam.'],
    ['medium', 'Indonesia memiliki beragam budaya, bahasa, dan tradisi yang tersebar di berbagai daerah.'],
    [
      'medium',
      'Bhinneka Tunggal Ika berarti berbeda-beda tetapi tetap satu. Semboyan ini mengingatkan bahwa keberagaman adalah kekuatan yang menyatukan seluruh rakyat Indonesia.',
    ],
    [
      'hard',
      'Indonesia terdiri atas lebih dari 17.000 pulau yang membentang dari Sabang sampai Merauke, dengan ratusan suku bangsa dan lebih dari 700 bahasa daerah.',
    ],
    [
      'hard',
      'Proklamasi kemerdekaan Indonesia dibacakan pada 17 Agustus 1945 di Jalan Pegangsaan Timur 56, Jakarta, oleh Soekarno yang didampingi Mohammad Hatta.',
    ],
    [
      'expert',
      'Sebagai negara yang dilalui garis khatulistiwa, Indonesia memiliki iklim tropis dengan dua musim utama, yaitu musim kemarau dan musim hujan; kondisi ini memengaruhi pola tanam, cuaca, serta aktivitas ekonomi masyarakat.',
    ],
    [
      'expert',
      'Danau Toba di Sumatera Utara merupakan danau vulkanik terbesar di dunia. Danau ini terbentuk dari letusan supervulkan sekitar 74.000 tahun yang lalu, dengan panjang kurang lebih 100 kilometer dan lebar sekitar 30 kilometer. Di tengahnya terdapat Pulau Samosir, pusat budaya Batak yang dikenal dengan rumah adat, kain ulos, dan musik tradisional gondang.',
    ],
  ],

  sains: [
    ['easy', 'Matahari terbit dari arah timur.'],
    ['easy', 'Tumbuhan membutuhkan cahaya matahari.'],
    ['easy', 'Air merupakan salah satu sumber daya penting yang dibutuhkan oleh semua makhluk hidup.'],
    ['medium', 'Bumi berputar pada porosnya sehingga terjadi pergantian siang dan malam setiap hari.'],
    ['medium', 'Tumbuhan hijau membuat makanannya sendiri melalui proses fotosintesis dengan bantuan cahaya.'],
    [
      'medium',
      'Air dapat berubah wujud menjadi es ketika didinginkan dan menjadi uap ketika dipanaskan. Perubahan wujud ini terjadi karena adanya perpindahan energi panas.',
    ],
    [
      'hard',
      'Cahaya matahari membutuhkan waktu sekitar 8 menit 20 detik untuk mencapai Bumi, padahal jarak keduanya kurang lebih 150 juta kilometer.',
    ],
    [
      'hard',
      'Pada tekanan udara normal, air mendidih pada suhu 100 derajat Celsius; namun, di dataran tinggi titik didihnya lebih rendah karena tekanan udaranya juga lebih rendah.',
    ],
    [
      'expert',
      'Sel merupakan unit struktural dan fungsional terkecil makhluk hidup; di dalamnya terdapat organel seperti mitokondria, ribosom, dan nukleus yang masing-masing memiliki fungsi spesifik.',
    ],
    [
      'expert',
      'Hukum Newton tentang gerak menjelaskan hubungan antara gaya dan perubahan gerak suatu benda. Hukum pertama menyatakan bahwa benda akan tetap diam atau bergerak lurus beraturan jika resultan gayanya nol. Hukum kedua dirumuskan sebagai F = m x a, sedangkan hukum ketiga menyatakan bahwa setiap aksi menimbulkan reaksi yang besarnya sama tetapi arahnya berlawanan.',
    ],
  ],

  lingkungan: [
    ['easy', 'Buanglah sampah pada tempatnya.'],
    ['easy', 'Pohon membuat udara terasa sejuk.'],
    [
      'easy',
      'Menjaga kebersihan lingkungan merupakan tanggung jawab bersama yang harus dilakukan setiap hari.',
    ],
    ['medium', 'Mengurangi penggunaan kantong plastik dapat membantu menjaga kebersihan sungai dan laut.'],
    ['medium', 'Menanam pohon di sekitar rumah dapat membuat udara lebih segar dan mengurangi panas.'],
    [
      'medium',
      'Hutan berfungsi sebagai paru-paru dunia karena menyerap karbon dioksida dan menghasilkan oksigen. Selain itu, hutan juga menjadi rumah bagi berbagai jenis satwa.',
    ],
    [
      'hard',
      'Perubahan iklim dapat memengaruhi kondisi lingkungan, produktivitas pertanian, serta kehidupan masyarakat di berbagai wilayah.',
    ],
    [
      'hard',
      'Setiap tahun, jutaan ton sampah plastik berakhir di laut; sebagian terurai menjadi mikroplastik yang dapat termakan ikan dan akhirnya masuk ke rantai makanan manusia.',
    ],
    [
      'expert',
      'Konsep ekonomi sirkular menekankan prinsip 3R, yaitu mengurangi, menggunakan kembali, dan mendaur ulang, agar sumber daya dapat dimanfaatkan selama mungkin sementara limbah ditekan seminimal mungkin.',
    ],
    [
      'hard',
      'Banjir yang sering terjadi di kota besar tidak hanya disebabkan oleh curah hujan yang tinggi. Berkurangnya daerah resapan air, saluran drainase yang tersumbat sampah, serta pembangunan yang tidak memperhatikan tata ruang juga ikut memperparah keadaan. Oleh karena itu, penanganan banjir memerlukan kerja sama pemerintah, pelaku usaha, dan masyarakat, misalnya melalui pembuatan sumur resapan dan penghijauan.',
    ],
  ],

  ekonomi: [
    ['easy', 'Ibu menabung uang setiap bulan.'],
    ['easy', 'Pasar pagi selalu ramai pembeli.'],
    ['easy', 'Menabung sejak dini membantu kita memenuhi kebutuhan di masa depan.'],
    [
      'medium',
      'Pertumbuhan ekonomi dapat dipengaruhi oleh produktivitas, investasi, konsumsi, dan perkembangan teknologi.',
    ],
    ['medium', 'Usaha kecil dan menengah berperan penting dalam membuka lapangan kerja bagi masyarakat.'],
    [
      'medium',
      'Pedagang di pasar tradisional kini mulai menerima pembayaran digital. Cara ini memudahkan pembeli, mengurangi risiko uang palsu, dan membantu pedagang mencatat transaksi.',
    ],
    [
      'hard',
      'Inflasi sebesar 3% per tahun berarti harga barang rata-rata naik 3% dibandingkan tahun sebelumnya, sehingga daya beli uang yang disimpan tanpa bunga perlahan menurun.',
    ],
    [
      'hard',
      'Sebelum membeli sebuah produk, konsumen yang cerdas akan membandingkan harga, kualitas, ulasan, serta biaya tambahan seperti ongkos kirim dan pajak.',
    ],
    [
      'expert',
      'Pertumbuhan ekonomi digital memberikan peluang besar bagi masyarakat, tetapi pemerataan akses internet dan peningkatan literasi digital tetap menjadi tantangan yang perlu diselesaikan.',
    ],
    [
      'expert',
      'Produk domestik bruto atau PDB adalah nilai seluruh barang dan jasa yang dihasilkan suatu negara dalam periode tertentu. Indikator ini sering dipakai untuk menilai kinerja perekonomian, tetapi tidak menggambarkan semuanya. Pemerataan pendapatan, tingkat pengangguran, kualitas lingkungan, dan kesejahteraan masyarakat juga perlu diperhatikan agar pertumbuhan ekonomi benar-benar dirasakan oleh semua lapisan.',
    ],
  ],

  'sehari-hari': [
    ['easy', 'Adik sedang membantu ibu di dapur.'],
    ['easy', 'Ayah berangkat kerja naik motor.'],
    [
      'easy',
      'Setiap pagi banyak orang memulai aktivitas dengan menyiapkan kebutuhan sebelum berangkat bekerja atau belajar.',
    ],
    ['medium', 'Sarapan yang bergizi memberi energi agar kita dapat beraktivitas dengan baik sepanjang hari.'],
    ['medium', 'Pada akhir pekan, keluarga kami biasanya membersihkan rumah lalu makan bersama di teras.'],
    [
      'medium',
      'Kemacetan di jam sibuk membuat banyak pekerja memilih berangkat lebih pagi. Sebagian lainnya beralih menggunakan kereta, bus, atau sepeda agar tidak terlambat.',
    ],
    [
      'hard',
      'Daftar belanja hari ini: 2 kilogram beras, 1 liter minyak goreng, 10 butir telur, seikat bayam, dan beberapa bungkus mi untuk persediaan di rumah.',
    ],
    [
      'hard',
      'Jangan lupa mematikan lampu, mencabut pengisi daya, dan mengunci pintu sebelum pergi; kebiasaan sederhana ini dapat menghemat listrik sekaligus menjaga keamanan rumah.',
    ],
    [
      'expert',
      'Mengatur keuangan rumah tangga dapat dimulai dengan metode 50/30/20: 50% untuk kebutuhan pokok, 30% untuk keinginan, dan 20% untuk tabungan atau dana darurat.',
    ],
    [
      'hard',
      'Pukul enam pagi, alarm berbunyi dan hari yang sibuk pun dimulai. Setelah mandi dan sarapan, Rani menyiapkan bekal, memeriksa jadwal kuliah, lalu berangkat menggunakan ojek daring. Di perjalanan, ia sempat membalas pesan dari teman kelompok tentang tugas presentasi yang harus dikumpulkan sore nanti. Meskipun padat, ia selalu menyempatkan diri untuk beristirahat sejenak.',
    ],
  ],

  olahraga: [
    ['easy', 'Sepak bola sangat populer di Indonesia.'],
    ['easy', 'Kami lari pagi di taman kota.'],
    ['easy', 'Olahraga secara rutin dapat membantu menjaga kebugaran tubuh.'],
    [
      'medium',
      'Latihan yang dilakukan secara rutin dapat membantu meningkatkan kebugaran dan menjaga kesehatan tubuh.',
    ],
    ['medium', 'Sebelum berolahraga, lakukan pemanasan agar otot lebih lentur dan risiko cedera berkurang.'],
    [
      'medium',
      'Bulu tangkis menjadi salah satu cabang olahraga yang paling sering mengharumkan nama Indonesia di tingkat dunia, baik di Olimpiade maupun kejuaraan internasional.',
    ],
    [
      'hard',
      'Dalam pertandingan sepak bola, setiap tim terdiri atas 11 pemain, dan satu babak normal berlangsung selama 45 menit dengan waktu istirahat 15 menit di antaranya.',
    ],
    [
      'hard',
      'Pelari maraton harus menempuh jarak 42,195 kilometer; karena itu, mereka perlu menjaga ritme, mengatur napas, dan memastikan asupan cairan tetap cukup selama lomba.',
    ],
    [
      'expert',
      'Sportivitas berarti menghormati lawan, menerima keputusan wasit, dan tetap rendah hati ketika menang; nilai-nilai ini sama pentingnya dengan teknik, strategi, maupun kebugaran fisik.',
    ],
    [
      'expert',
      'Kecepatan motor balap di sirkuit dapat mencapai lebih dari 300 kilometer per jam. Pada kecepatan setinggi itu, pembalap harus menjaga konsentrasi penuh, mengatur titik pengereman, dan memilih jalur terbaik di setiap tikungan. Kemenangan tidak hanya ditentukan oleh mesin yang kuat, tetapi juga oleh latihan fisik, analisis data, strategi ban, dan kerja sama tim di garasi.',
    ],
  ],

  budaya: [
    ['easy', 'Batik adalah warisan budaya Indonesia.'],
    ['easy', 'Anak-anak berlatih tari tradisional.'],
    ['easy', 'Gotong royong adalah kebiasaan baik yang sudah dilakukan sejak lama.'],
    [
      'medium',
      'Keragaman budaya Indonesia terlihat dari berbagai bahasa daerah, pakaian tradisional, makanan, dan kesenian.',
    ],
    ['medium', 'Wayang kulit biasanya dimainkan oleh seorang dalang dengan iringan musik gamelan.'],
    [
      'medium',
      'Rendang, sate, gudeg, dan pempek adalah contoh kuliner Nusantara yang tidak hanya lezat, tetapi juga menyimpan cerita tentang sejarah dan kebiasaan masyarakat setempat.',
    ],
    [
      'hard',
      'Pada 2 Oktober 2009, UNESCO menetapkan batik Indonesia sebagai Warisan Kemanusiaan untuk Budaya Lisan dan Nonbendawi; sejak itu, tanggal tersebut diperingati sebagai Hari Batik Nasional.',
    ],
    [
      'hard',
      'Angklung, alat musik bambu dari Jawa Barat, dimainkan dengan cara digoyangkan; setiap angklung menghasilkan satu nada, sehingga para pemain harus bekerja sama untuk membentuk lagu.',
    ],
    [
      'expert',
      'Pelestarian budaya tidak berarti menolak perubahan; sebaliknya, generasi muda dapat mengadaptasi kesenian tradisional melalui media digital, kolaborasi musik, dan pertunjukan kontemporer.',
    ],
    [
      'hard',
      'Setiap daerah di Indonesia memiliki rumah adat dengan bentuk dan makna yang berbeda. Rumah gadang dari Minangkabau terkenal dengan atapnya yang runcing menyerupai tanduk kerbau, sedangkan honai di Papua berbentuk bulat dengan atap jerami untuk menahan udara dingin pegunungan. Keunikan tersebut menunjukkan bahwa nenek moyang kita mampu menyesuaikan bangunan dengan alam sekitarnya.',
    ],
  ],

  pemrograman: [
    ['easy', 'Program yang rapi mudah dibaca.'],
    ['easy', 'Simpan kode sebelum menutup aplikasi.'],
    [
      'easy',
      'Program yang baik memiliki struktur yang jelas sehingga lebih mudah dipahami dan dikembangkan.',
    ],
    ['medium', 'Variabel digunakan untuk menyimpan data yang nilainya dapat berubah ketika program berjalan.'],
    [
      'medium',
      'Perulangan membantu programmer menjalankan perintah yang sama berkali-kali tanpa menulis ulang kode.',
    ],
    [
      'medium',
      'Sebelum menulis kode, seorang pengembang sebaiknya memahami masalah, merancang alur program, dan menentukan data apa saja yang dibutuhkan agar solusinya tepat sasaran.',
    ],
    [
      'hard',
      'Bug adalah kesalahan dalam program. Untuk menemukannya, baca pesan galat dengan teliti, ulangi langkah yang memicu masalah, lalu ubah satu bagian kode pada satu waktu.',
    ],
    [
      'hard',
      'Fungsi hitungRataRata(nilai) menerima sebuah larik angka, menjumlahkan seluruh isinya, lalu membaginya dengan panjang larik untuk menghasilkan nilai rata-rata.',
    ],
    [
      'expert',
      'const kecepatan = jumlahKata / menit; if (kecepatan > rekor) { rekor = kecepatan; tampilkanPesan("Rekor baru!"); }',
    ],
    [
      'expert',
      'Sistem kontrol versi seperti Git memungkinkan tim mengerjakan proyek yang sama tanpa saling menimpa pekerjaan. Setiap perubahan disimpan dalam sebuah commit yang berisi catatan singkat tentang apa yang diubah dan alasannya. Jika terjadi kesalahan, pengembang dapat kembali ke versi sebelumnya, membandingkan perbedaan kode, atau menggabungkan cabang fitur ke cabang utama setelah ditinjau rekan satu tim.',
    ],
  ],

  game: [
    ['easy', 'Motor itu melaju dengan cepat.'],
    ['easy', 'Tekan tombol nitro sekarang!'],
    ['easy', 'Permainan yang seru membuat kita lupa waktu, jadi tetap atur jadwal bermain.'],
    [
      'medium',
      'Permainan yang kompetitif membutuhkan strategi, konsentrasi, kecepatan, dan kemampuan mengambil keputusan.',
    ],
    ['medium', 'Dalam permainan tim, komunikasi yang baik sering menjadi kunci untuk meraih kemenangan.'],
    [
      'medium',
      'Pemain hebat tidak langsung menyerah setelah kalah. Ia mempelajari kesalahannya, menonton ulang pertandingan, lalu berlatih lagi dengan strategi yang lebih matang.',
    ],
    [
      'hard',
      'Nitro sudah penuh! Tunggu lintasan lurus, jaga jarak dari lawan, lalu tekan Enter tepat sebelum garis finis untuk menyalip semua pembalap.',
    ],
    [
      'hard',
      'Turnamen e-sport tingkat nasional dapat diikuti oleh 64 tim; setiap tim harus memenangkan 6 pertandingan berturut-turut untuk menjadi juara.',
    ],
    [
      'expert',
      'Pengembang game harus menyeimbangkan tingkat kesulitan: jika terlalu mudah, pemain cepat bosan; jika terlalu sulit, pemain merasa frustrasi dan berhenti sebelum mencapai level berikutnya.',
    ],
    [
      'expert',
      'Balapan motor virtual menuntut refleks dan ketelitian. Setiap huruf yang diketik dengan benar menambah kecepatan, sedangkan setiap kesalahan membuat motor kehilangan momentum. Kombo yang panjang mengisi bar nitro hingga 100%, dan pemain yang cerdas akan memakainya pada saat yang tepat. Pada akhirnya, pemenang bukan hanya yang paling cepat, melainkan juga yang paling tenang dan konsisten.',
    ],
  ],
};

function buildTexts(raw: RawTexts): TypingText[] {
  const result: TypingText[] = [];
  let id = 1;
  for (const category of TEXT_CATEGORIES) {
    for (const [difficulty, text] of raw[category]) {
      result.push({ id, category, difficulty, text });
      id += 1;
    }
  }
  return result;
}

/** 120 teks Bahasa Indonesia (12 kategori x 10 teks). */
export const TYPING_TEXTS: readonly TypingText[] = buildTexts(RAW_TEXTS);

// ------------------------------------------------------------------ helpers

/** Tier panjang berdasarkan jumlah karakter. */
export function getTextLengthTier(text: string | TypingText): TextLength {
  const length = typeof text === 'string' ? text.length : text.text.length;
  if (length <= TEXT_LENGTH_INFO.short.max) return 'short';
  if (length <= TEXT_LENGTH_INFO.medium.max) return 'medium';
  if (length <= TEXT_LENGTH_INFO.long.max) return 'long';
  return 'race';
}

export function isValidCategoryChoice(value: unknown): value is TextCategoryChoice {
  return value === 'semua' || (typeof value === 'string' && (TEXT_CATEGORIES as readonly string[]).includes(value));
}

export function isValidTextDifficultyChoice(value: unknown): value is TextDifficultyChoice {
  return value === 'semua' || (typeof value === 'string' && (TEXT_DIFFICULTIES as readonly string[]).includes(value));
}

export function isValidTextLengthChoice(value: unknown): value is TextLengthChoice {
  return value === 'semua' || (typeof value === 'string' && (TEXT_LENGTHS as readonly string[]).includes(value));
}

/** Semua teks yang cocok dengan filter (pilihan "semua" = tanpa filter). */
export function filterTypingTexts(filter: TextFilter = {}): TypingText[] {
  return TYPING_TEXTS.filter(
    (t) =>
      (!filter.category || filter.category === 'semua' || t.category === filter.category) &&
      (!filter.difficulty || filter.difficulty === 'semua' || t.difficulty === filter.difficulty) &&
      (!filter.length || filter.length === 'semua' || getTextLengthTier(t) === filter.length),
  );
}

function randomFrom(list: readonly TypingText[], excludeId: number | null | undefined, random: () => number): TypingText {
  const pool = list.length > 1 && excludeId != null ? list.filter((t) => t.id !== excludeId) : list;
  return pool[Math.floor(random() * pool.length)];
}

/**
 * Memilih teks acak sesuai filter. Jika kombinasi filter tidak punya teks,
 * filter dilonggarkan bertahap (panjang -> kesulitan -> kategori) agar selalu ada teks.
 * `excludeId` mencegah teks yang sama muncul dua kali berturut-turut.
 */
export function pickTypingText(
  filter: TextFilter = {},
  excludeId?: number | null,
  random: () => number = Math.random,
): TypingText {
  const attempts: TextFilter[] = [
    filter,
    { category: filter.category, difficulty: filter.difficulty },
    { category: filter.category, length: filter.length },
    { category: filter.category },
    {},
  ];
  for (const attempt of attempts) {
    const candidates = filterTypingTexts(attempt);
    if (candidates.length > 0) return randomFrom(candidates, excludeId, random);
  }
  return TYPING_TEXTS[0];
}

/** Teks acak dari seluruh bank teks. */
export function getRandomTypingText(excludeId?: number | null): TypingText {
  return pickTypingText({}, excludeId);
}

/** Teks acak dari satu kategori. */
export function getTypingTextByCategory(category: TextCategoryChoice): TypingText {
  return pickTypingText({ category });
}

/** Teks acak dengan tingkat kesulitan tertentu. */
export function getTypingTextByDifficulty(difficulty: TextDifficultyChoice): TypingText {
  return pickTypingText({ difficulty });
}

/** Teks acak dengan tier panjang tertentu. */
export function getTypingTextByLength(length: TextLengthChoice): TypingText {
  return pickTypingText({ length });
}

export function getTypingTextById(id: number): TypingText | undefined {
  return TYPING_TEXTS.find((t) => t.id === id);
}
