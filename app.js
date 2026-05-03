/* ============================================================
   AURA — AR Health Intelligence
   app.js — Semua logika aplikasi
   ============================================================ */

// ── Storage Keys & Helpers ──────────────────────────────────
const UK  = "aura_u", SK = "aura_s", LK = "aura_log", HK = "aura_scan";
const gU  = ()  => JSON.parse(localStorage.getItem(UK)  || "[]");
const sU  = (u) => localStorage.setItem(UK, JSON.stringify(u));
const gS  = ()  => JSON.parse(localStorage.getItem(SK)  || "null");
const svS = (s) => localStorage.setItem(SK, JSON.stringify(s));
const clS = ()  => localStorage.removeItem(SK);
const gLog = () => JSON.parse(localStorage.getItem(LK)  || "[]");
const sLog = (l) => localStorage.setItem(LK, JSON.stringify(l));
const gScan = () => JSON.parse(localStorage.getItem(HK) || "[]");
const sScan = (s) => localStorage.setItem(HK, JSON.stringify(s));

// ── AUTH ────────────────────────────────────────────────────
function swAuth(t) {
  document.querySelectorAll(".atab").forEach((a, i) =>
    a.classList.toggle("on", i === (t === "login" ? 0 : 1))
  );
  document.getElementById("loginF").classList.toggle("on", t === "login");
  document.getElementById("regF").classList.toggle("on", t === "reg");
  ["lErr", "rErr"].forEach(id => document.getElementById(id).classList.remove("on"));
}

function doLogin() {
  const em = document.getElementById("lEm").value.trim();
  const pw = document.getElementById("lPw").value;
  const u  = gU().find(u => u.email === em && u.password === pw);
  if (!u) { document.getElementById("lErr").classList.add("on"); return; }
  svS(u);
  enterApp(u);
}

function doReg() {
  const nm  = document.getElementById("rNm").value.trim();
  const em  = document.getElementById("rEm").value.trim();
  const pw  = document.getElementById("rPw").value;
  const ht  = +document.getElementById("rHt").value || 168;
  const wt  = +document.getElementById("rWt").value || 62;
  const err = document.getElementById("rErr");
  if (!nm || !em || pw.length < 6) {
    err.textContent = "Lengkapi semua field. Password min. 6 karakter.";
    err.classList.add("on"); return;
  }
  const users = gU();
  if (users.find(u => u.email === em)) {
    err.textContent = "Email sudah terdaftar.";
    err.classList.add("on"); return;
  }
  const u = { name: nm, email: em, password: pw, height: ht, weight: wt };
  users.push(u); sU(users); svS(u);
  enterApp(u);
}

function doLogout() {
  clS();
  document.getElementById("tbtn").classList.remove("show");
  const nav = document.getElementById("globalNav");
  if (nav) nav.classList.add("nav-hidden");
  go("auth");
}

// ── BMI & HEALTH SCORE ──────────────────────────────────────
function hitungBMI(user) {
  const tinggiM = user.height / 100;
  const bmi     = (user.weight / (tinggiM * tinggiM)).toFixed(1);
  let kategori  = "";
  if      (bmi < 18.5) kategori = "Kurus";
  else if (bmi < 25)   kategori = "Normal · Ideal";
  else if (bmi < 30)   kategori = "Overweight";
  else                 kategori = "Obesitas";
  const usia    = user.age || 25;
  const bodyFat = user.gender === "male"
    ? (1.2 * bmi + 0.23 * usia - 16.2).toFixed(1)
    : (1.2 * bmi + 0.23 * usia - 5.4).toFixed(1);
  return { bmi, kategori, bodyFat };
}

function hitungSkorKesehatan(user) {
  const { bmi, bodyFat } = hitungBMI(user);
  const log    = gLog();
  const scans  = gScan();

  // Skor BMI (0-30)
  let skorBMI = 0;
  if      (bmi >= 18.5 && bmi < 25) skorBMI = 30;
  else if (bmi >= 17   && bmi < 30) skorBMI = 20;
  else                               skorBMI = 10;

  // Skor nutrisi dari log makanan hari ini (0-25)
  const today    = new Date().toDateString();
  const logHari  = log.filter(l => new Date(l.tanggal).toDateString() === today);
  const totalKal = logHari.reduce((s, l) => s + (l.kalori || 0), 0);
  const targetKal = 2000;
  const rasioKal  = Math.min(totalKal / targetKal, 1.2);
  const skorNutri = rasioKal > 0.4 && rasioKal < 1.1 ? 25 : rasioKal > 0 ? 15 : 5;

  // Skor HRV/stres dari riwayat scan (0-25)
  let skorHRV = 15; // default sedang
  if (scans.length > 0) {
    const avgHRV = scans.slice(-5).reduce((s, sc) => s + (sc.hrv || 30), 0) / Math.min(scans.length, 5);
    if      (avgHRV > 50) skorHRV = 25;
    else if (avgHRV > 30) skorHRV = 18;
    else                  skorHRV = 8;
  }

  // Skor aktivitas scan (0-20): reward user yang rutin scan
  const skorAktif = Math.min(scans.length * 4, 20);

  const total = Math.round(skorBMI + skorNutri + skorHRV + skorAktif);
  return Math.min(total, 100);
}

function hitungNutrisiHarian() {
  const today   = new Date().toDateString();
  const log     = gLog().filter(l => new Date(l.tanggal).toDateString() === today);
  return {
    kalori:  log.reduce((s, l) => s + (l.kalori  || 0), 0),
    protein: log.reduce((s, l) => s + (l.protein || 0), 0),
    lemak:   log.reduce((s, l) => s + (l.lemak   || 0), 0),
    karbo:   log.reduce((s, l) => s + (l.karbo   || 0), 0),
    items:   log.length,
  };
}

// ── ENTER APP ───────────────────────────────────────────────
function enterApp(u) {
  const hasil  = hitungBMI(u);
  const skor   = hitungSkorKesehatan(u);
  const nutri  = hitungNutrisiHarian();
  const scans  = gScan();
  const log    = gLog();

  // Header
  document.getElementById("hGreet").textContent = "Halo, " + u.name.split(" ")[0] + " 👋";

  // Profil
  document.getElementById("pNm").textContent  = u.name;
  document.getElementById("pEm").textContent  = u.email;
  document.getElementById("pHt").textContent  = u.height;
  document.getElementById("pWt").textContent  = u.weight;
  document.getElementById("pBMI").textContent = hasil.bmi;

  // Stats profil
  const elScan = document.getElementById("pTotalScan");
  if (elScan) elScan.textContent = scans.length;

  // Metrik Home — update dari data real
  const elKal = document.getElementById("mKalori");
  if (elKal) {
    elKal.textContent = nutri.kalori.toLocaleString("id");
    const bar = document.getElementById("mKaloriBar");
    if (bar) bar.style.width = Math.min((nutri.kalori / 2000) * 100, 100) + "%";
  }

  const elMental = document.getElementById("mMental");
  if (elMental) {
    elMental.textContent = skor;
    const bar = document.getElementById("mMentalBar");
    if (bar) bar.style.width = skor + "%";
  }

  // Nutrisi ring
  updateNutrisiHome(nutri);

  // AR tags di scan
  document.querySelectorAll(".ar-tag").forEach(tag => {
    const tv = tag.querySelector(".tv");
    const tl = tag.querySelector(".tl");
    if (!tv || !tl) return;
    if (tv.textContent.includes("BMI")) {
      tv.textContent = "BMI " + hasil.bmi;
      tl.textContent = hasil.kategori;
    }
    if (tv.textContent.includes("Fat")) {
      tv.textContent = hasil.bodyFat + "% Fat";
    }
  });

  document.getElementById("tbtn").classList.add("show");
  go("home");
}

function updateNutrisiHome(nutri) {
  const targetP = 60, targetK = 250, targetL = 65, targetS = 25;
  const pct = (v, t) => Math.min(Math.round((v / t) * 100), 100);

  const elP = document.getElementById("nProtein");
  const elK = document.getElementById("nKarbo");
  const elL = document.getElementById("nLemak");
  const elS = document.getElementById("nSerat");
  if (elP) elP.textContent = nutri.protein + "g";
  if (elK) elK.textContent = nutri.karbo + "g";
  if (elL) elL.textContent = nutri.lemak + "g";
  if (elS) elS.textContent = "-";

  // Update ring pct
  const elRingPct = document.getElementById("nutRingPct");
  if (elRingPct) {
    const avg = Math.round((pct(nutri.kalori, 2000) + pct(nutri.protein, targetP)) / 2);
    elRingPct.textContent = avg + "%";
  }
}

// ── NAVIGATION ──────────────────────────────────────────────
let cur = "auth";
function go(id) {
  document.querySelectorAll(".scr").forEach(s => s.classList.remove("on"));
  document.getElementById(id).classList.add("on");
  cur = id;

  // Sembunyikan nav saat auth, tampilkan setelah login
  const nav = document.getElementById("globalNav");
  if (nav) nav.classList.toggle("nav-hidden", id === "auth");

  // Update active state nav
  ["home","scan","food","result","profil"].forEach(pg => {
    const btn = document.getElementById("nb-" + pg);
    if (btn) btn.classList.toggle("on", pg === id);
  });

  if (id === "scan")   startScan();
  if (id === "food")   { startFood(); startFoodCamera(); }
  if (id === "result") renderResult();
  if (id === "profil") renderProfil();
}

// ── THEME ────────────────────────────────────────────────────
let dark = true;
function toggleTheme() {
  dark = !dark;
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  document.getElementById("tbtn").textContent = dark ? "🌙" : "☀️";
  const c = document.getElementById("dmChk");
  if (c) c.checked = dark;
}

// ── MOOD ─────────────────────────────────────────────────────
function setMood(el) {
  document.querySelectorAll(".mopt").forEach(m => m.classList.remove("on"));
  el.classList.add("on");
  // Simpan mood ke session user
  const u = gS();
  if (u) { u.mood = el.querySelector(".em").textContent; svS(u); }
  showT("Mood tersimpan: " + el.querySelector(".em").textContent);
}

// ── TOAST ────────────────────────────────────────────────────
let tT;
function showT(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(tT);
  tT = setTimeout(() => t.classList.remove("show"), 2500);
}

// ── LOG MAKANAN ──────────────────────────────────────────────
function selFood(el, name, cal, pro, fat, carb) {
  document.querySelectorAll(".fi-pill").forEach(p => p.classList.remove("on"));
  el.classList.add("on");
  document.getElementById("fNm").textContent   = name;
  document.getElementById("fCal").textContent  = cal;
  document.getElementById("fPro").textContent  = pro;
  document.getElementById("fFat").textContent  = fat;
  document.getElementById("fCarb").textContent = carb;
}

function logFood() {
  const nm   = document.getElementById("fNm").textContent;
  const cal  = parseInt(document.getElementById("fCal").textContent) || 0;
  const pro  = parseFloat(document.getElementById("fPro").textContent) || 0;
  const fat  = parseFloat(document.getElementById("fFat").textContent) || 0;
  const carb = parseFloat(document.getElementById("fCarb").textContent) || 0;

  if (nm === "Arahkan ke makanan" || !cal) {
    showT("Pilih makanan dulu sebelum log!"); return;
  }

  const log = gLog();
  log.push({
    nama:    nm,
    kalori:  cal,
    protein: pro,
    lemak:   fat,
    karbo:   carb,
    tanggal: new Date().toISOString(),
  });
  sLog(log);

  // Update home langsung
  const u = gS();
  if (u) {
    const nutri = hitungNutrisiHarian();
    updateNutrisiHome(nutri);
    const elKal = document.getElementById("mKalori");
    if (elKal) {
      elKal.textContent = nutri.kalori.toLocaleString("id");
      const bar = document.getElementById("mKaloriBar");
      if (bar) bar.style.width = Math.min((nutri.kalori / 2000) * 100, 100) + "%";
    }
  }

  showT("✓ " + nm + " (" + cal + " kkal) ditambahkan!");
  setTimeout(() => go("home"), 1200);
}

// ── FOOD SCAN (kamera + AI) ──────────────────────────────────
let foodDB = {};
fetch("foods-local.json")
  .then(r => r.json())
  .then(data => { foodDB = data; })
  .catch(() => {});

async function startFoodCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    const vid = document.getElementById("foodVideo");
    if (vid) vid.srcObject = stream;
  } catch (e) {
    showT("Izin kamera ditolak, gunakan pilihan manual");
  }
}

function ambilFrameKamera(videoElement) {
  const canvas = document.createElement("canvas");
  canvas.width  = videoElement.videoWidth  || 320;
  canvas.height = videoElement.videoHeight || 240;
  canvas.getContext("2d").drawImage(videoElement, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.8).split(",")[1];
}

async function ambilNutrisi(namaM) {
  const key = namaM.toLowerCase().trim();
  // Cek lokal DB dulu
  if (foodDB[key]) return { nama: namaM, ...foodDB[key] };
  // Coba USDA API
  try {
    const url  = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(namaM)}&api_key=${CONFIG.USDA_KEY}&pageSize=1`;
    const res  = await fetch(url);
    const json = await res.json();
    if (json.foods && json.foods.length > 0) {
      const f = json.foods[0];
      const nutrients = {};
      f.foodNutrients.forEach(n => {
        if (n.nutrientName.includes("Energy"))      nutrients.kalori  = Math.round(n.value);
        if (n.nutrientName.includes("Protein"))     nutrients.protein = Math.round(n.value);
        if (n.nutrientName.includes("Carbohy"))     nutrients.karbo   = Math.round(n.value);
        if (n.nutrientName.includes("Total lipid")) nutrients.lemak   = Math.round(n.value);
      });
      // Simpan ke lokal DB biar tidak fetch lagi
      foodDB[key] = nutrients;
      return { nama: f.description, ...nutrients };
    }
  } catch (e) { console.warn("USDA gagal:", e.message); }
  return null;
}

async function identifikasiMakanan(base64Image) {
  try {
    const blob = base64ToBlob(base64Image, "image/jpeg");
    const res  = await fetch(
      "https://api-inference.huggingface.co/models/nateraw/food",
      { method: "POST", headers: { Authorization: "Bearer " + CONFIG.HF_KEY }, body: blob }
    );
    if (!res.ok) throw new Error("HF HTTP " + res.status);
    const json = await res.json();
    if (!Array.isArray(json) || json.length === 0) throw new Error("HF empty");
    const topFood = json[0].label.toLowerCase().replace(/_/g, " ");
    console.log("HuggingFace:", topFood, json[0].score.toFixed(2));
    return await ambilNutrisi(topFood);
  } catch (e) {
    console.warn("AI gagal, fallback lokal:", e.message);
    return deteksiLokal(base64Image);
  }
}

function base64ToBlob(base64, mime) {
  const bin = atob(base64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

function deteksiLokal(base64Image) {
  const img = new Image();
  img.src   = "data:image/jpeg;base64," + base64Image;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext("2d");
  return new Promise(resolve => {
    img.onload = () => {
      ctx.drawImage(img, 0, 0, 64, 64);
      const px = ctx.getImageData(20, 20, 24, 24).data;
      let r=0, g=0, b=0, n=0;
      for (let i=0; i<px.length; i+=4) { r+=px[i]; g+=px[i+1]; b+=px[i+2]; n++; }
      r=r/n; g=g/n; b=b/n;
      let tebak = "nasi putih";
      if (r>180 && g>100 && b<80)  tebak = "ayam bakar";
      if (r>200 && g>160 && b<100) tebak = "nasi goreng";
      if (g>r   && g>b   && g>100) tebak = "gado-gado";
      if (r>200 && g<100 && b<100) tebak = "rendang";
      if (r<80  && g<80  && b<80)  tebak = "kopi";
      console.log(`Fallback RGB(${Math.round(r)},${Math.round(g)},${Math.round(b)}) → ${tebak}`);
      const db = foodDB[tebak];
      resolve(db ? { nama: tebak, ...db } : null);
    };
    img.onerror = () => resolve(null);
  });
}

async function scanMakanan() {
  const video  = document.getElementById("foodVideo");
  const base64 = ambilFrameKamera(video);
  showT("Mengidentifikasi makanan...");
  const hasil = await identifikasiMakanan(base64);
  if (hasil) {
    document.getElementById("fNm").textContent   = hasil.nama;
    document.getElementById("fCal").textContent  = hasil.kalori  || "-";
    document.getElementById("fPro").textContent  = (hasil.protein || "-") + "g";
    document.getElementById("fFat").textContent  = (hasil.lemak   || "-") + "g";
    document.getElementById("fCarb").textContent = (hasil.karbo   || "-") + "g";
    showT("✓ Teridentifikasi: " + hasil.nama);
  } else {
    showT("Tidak dikenali, pilih manual");
  }
}

// ── RENDER RESULT (dinamis dari data real) ───────────────────
function renderResult() {
  const u     = gS();
  if (!u) return;
  const hasil = hitungBMI(u);
  const skor  = hitungSkorKesehatan(u);
  const nutri = hitungNutrisiHarian();
  const scans = gScan();
  const log   = gLog();

  // Skor utama
  const elSkor = document.getElementById("rSkor");
  if (elSkor) elSkor.textContent = skor;

  // Deskripsi skor
  const elDesc = document.getElementById("rDesc");
  if (elDesc) {
    if      (skor >= 80) elDesc.innerHTML = `Tubuhmu dalam kondisi <strong style="color:#e8edf5">sangat baik</strong>. Pertahankan gaya hidup sehat ini!`;
    else if (skor >= 60) elDesc.innerHTML = `Tubuhmu dalam kondisi <strong style="color:#e8edf5">cukup baik</strong>. Ada beberapa area yang perlu perhatian.`;
    else                 elDesc.innerHTML = `Tubuhmu butuh lebih banyak <strong style="color:#e8edf5">perhatian</strong>. Yuk mulai perbaiki satu per satu!`;
  }

  // Badge status
  const badges = document.getElementById("rBadges");
  if (badges) {
    const bmi = parseFloat(hasil.bmi);
    const avgHRV = scans.length > 0
      ? scans.slice(-5).reduce((s, sc) => s + (sc.hrv || 30), 0) / Math.min(scans.length, 5)
      : null;
    let html = "";
    if (bmi >= 18.5 && bmi < 25) html += `<span class="sbg g">✓ BMI Normal</span>`;
    else if (bmi < 18.5)         html += `<span class="sbg w">⚠ BMI Kurus</span>`;
    else                         html += `<span class="sbg w">⚠ BMI Lebih</span>`;
    if (nutri.kalori > 800)      html += `<span class="sbg g">✓ Nutrisi OK</span>`;
    else                         html += `<span class="sbg w">⚠ Kurang Makan</span>`;
    if (avgHRV !== null) {
      if (avgHRV > 40)           html += `<span class="sbg g">✓ Stres Rendah</span>`;
      else                       html += `<span class="sbg w">⚠ Stres Tinggi</span>`;
    }
    badges.innerHTML = html;
  }

  // Bar nutrisi
  const target = { protein: 60, karbo: 250, lemak: 65, serat: 25 };
  const pct    = (v, t) => Math.min(Math.round((v / t) * 100), 110);
  renderBar("rProtein", nutri.protein, target.protein);
  renderBar("rKarbo",   nutri.karbo,   target.karbo);
  renderBar("rLemak",   nutri.lemak,   target.lemak);

  // HRV insight
  const elHRV = document.getElementById("rHRVInsight");
  if (elHRV && window.stressAnalyzer) {
    elHRV.textContent = window.stressAnalyzer.generateInsight();
  }

  // Rekomendasi dinamis
  renderRekomendasi(u, hasil, nutri, scans);

  // Riwayat log makanan
  renderLogMakanan();

  // Update tanggal
  const elTgl = document.getElementById("rTanggal");
  if (elTgl) {
    elTgl.textContent = "// " + new Date().toLocaleDateString("id-ID", {
      day: "numeric", month: "long", year: "numeric"
    }).toUpperCase();
  }
}

function renderBar(id, nilai, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const pct  = Math.min(Math.round((nilai / target) * 100), 110);
  const bar  = el.querySelector(".nf");
  const pctEl = el.querySelector(".np");
  if (bar) {
    bar.style.width = Math.min(pct, 100) + "%";
    bar.style.background = pct > 105 ? "var(--amb)" : "var(--sage)";
  }
  if (pctEl) {
    pctEl.textContent = pct + "%";
    pctEl.style.color = pct > 105 ? "var(--amb)" : "";
  }
  const valEl = el.querySelector(".nl-val");
  if (valEl) valEl.textContent = nilai + "g";
}

function renderRekomendasi(u, hasil, nutri, scans) {
  const el = document.getElementById("rRekom");
  if (!el) return;
  const bmi    = parseFloat(hasil.bmi);
  const avgHRV = scans.length > 0
    ? scans.slice(-3).reduce((s, sc) => s + (sc.hrv || 30), 0) / Math.min(scans.length, 3)
    : 35;

  const rekoms = [];

  if (bmi < 18.5)
    rekoms.push({ i: "🍖", t: "<strong>Tambah kalori sehat</strong> — makan lebih sering dengan protein & karbohidrat kompleks." });
  else if (bmi >= 25)
    rekoms.push({ i: "🥗", t: "<strong>Kurangi kalori berlebih</strong> — perbanyak sayur, kurangi gorengan & gula." });
  else
    rekoms.push({ i: "✅", t: "<strong>BMI ideal!</strong> Pertahankan pola makan seimbang dan aktif bergerak." });

  if (nutri.kalori < 800)
    rekoms.push({ i: "🍽️", t: "<strong>Kamu kurang makan hari ini</strong> — coba log makanan lewat Food Scan!" });
  else if (nutri.protein < 30)
    rekoms.push({ i: "🥚", t: "<strong>Protein masih kurang</strong> — tambahkan telur, tahu, tempe, atau ayam." });

  if (avgHRV < 30)
    rekoms.push({ i: "🧘", t: "<strong>Stres tinggi terdeteksi</strong> — coba meditasi 10 menit atau jalan santai sore ini." });
  else
    rekoms.push({ i: "😴", t: "<strong>Tidur cukup 7-8 jam</strong> untuk jaga HRV dan pemulihan tubuh optimal." });

  rekoms.push({ i: "💧", t: "<strong>Minum air putih</strong> minimal 8 gelas (2L) per hari untuk metabolisme optimal." });

  el.innerHTML = rekoms.map((r, i) =>
    `<div class="rp" style="${i%2===1?'background:var(--lavl)':''}">
      <div class="rp-i">${r.i}</div>
      <div class="rp-t">${r.t}</div>
    </div>`
  ).join("");
}

function renderLogMakanan() {
  const el = document.getElementById("rLogMakanan");
  if (!el) return;
  const log   = gLog();
  const today = new Date().toDateString();
  const hari  = log.filter(l => new Date(l.tanggal).toDateString() === today);

  if (hari.length === 0) {
    el.innerHTML = `<div style="text-align:center;padding:16px;color:var(--txt3);font-size:12px">
      Belum ada makanan dilog hari ini.<br>Gunakan Food Scan untuk mulai!
    </div>`;
    return;
  }

  el.innerHTML = hari.map(l =>
    `<div style="display:flex;justify-content:space-between;align-items:center;
      padding:10px 12px;background:var(--card2);border-radius:10px;margin-bottom:6px">
      <div>
        <div style="font-size:12px;font-weight:700;color:var(--txt)">${l.nama}</div>
        <div style="font-size:9px;color:var(--txt3);font-family:'JetBrains Mono',monospace">
          P:${l.protein||0}g · L:${l.lemak||0}g · K:${l.karbo||0}g
        </div>
      </div>
      <div style="font-size:16px;font-weight:800;color:var(--amb)">${l.kalori}<span style="font-size:9px;color:var(--txt3)"> kkal</span></div>
    </div>`
  ).join("");
}

// ── RENDER PROFIL ────────────────────────────────────────────
function renderProfil() {
  const u = gS();
  if (!u) return;
  const scans = gScan();
  const log   = gLog();
  const el    = document.getElementById("pTotalScan");
  if (el) el.textContent = scans.length;
  const elLog = document.getElementById("pTotalLog");
  if (elLog) elLog.textContent = log.length;
}

// ── THREE.JS — BODY SCAN ─────────────────────────────────────
let sR, sSc, sCam, sBody, sBeam;

async function startScan() {
  const c = document.getElementById("scanC");
  const p = document.getElementById("phone");
  c.width  = p.clientWidth;
  c.height = p.clientHeight;
  animScan();

  if (sR) {
    sR.setSize(c.width, c.height);
    sCam.aspect = c.width / c.height;
    sCam.updateProjectionMatrix();
    sR.setAnimationLoop(rScan);
    startRPPGCamera();
    return;
  }

  sSc  = new THREE.Scene();
  sCam = new THREE.PerspectiveCamera(60, c.width / c.height, 0.1, 100);
  sCam.position.set(0, 0, 3.5);
  sR   = new THREE.WebGLRenderer({ canvas: c, alpha: true, antialias: true });
  sR.setSize(c.width, c.height);
  sR.setPixelRatio(Math.min(devicePixelRatio, 2));

  const grid = new THREE.GridHelper(8, 20, 0x1a3a2a, 0x0d1f14);
  grid.position.y = -1.6;
  sSc.add(grid);

  sBody = new THREE.Group();
  const bM = new THREE.MeshStandardMaterial({ color: 0x4fb893, transparent: true, opacity: 0.15 });
  const wM = new THREE.MeshBasicMaterial({ color: 0x4fb893, wireframe: true, transparent: true, opacity: 0.45 });

  [
    [new THREE.SphereGeometry(0.18, 16, 16),           0,     1.3,   0],
    [new THREE.CylinderGeometry(0.22, 0.19, 0.7, 12),  0,     0.65,  0],
    [new THREE.CylinderGeometry(0.07, 0.06, 0.6, 10), -0.34,  0.7,   0],
    [new THREE.CylinderGeometry(0.07, 0.06, 0.6, 10),  0.34,  0.7,   0],
    [new THREE.CylinderGeometry(0.1,  0.09, 0.65, 10), -0.13, 0.0,   0],
    [new THREE.CylinderGeometry(0.1,  0.09, 0.65, 10),  0.13, 0.0,   0],
    [new THREE.CylinderGeometry(0.08, 0.07, 0.6, 10), -0.14, -0.72,  0],
    [new THREE.CylinderGeometry(0.08, 0.07, 0.6, 10),  0.14, -0.72,  0],
  ].forEach(([g, x, y, z]) => {
    const m1 = new THREE.Mesh(g, bM.clone());
    const m2 = new THREE.Mesh(g, wM.clone());
    [m1, m2].forEach(m => m.position.set(x, y, z));
    sBody.add(m1, m2);
  });
  sSc.add(sBody);

  sBeam = new THREE.Mesh(
    new THREE.PlaneGeometry(0.7, 0.025),
    new THREE.MeshBasicMaterial({ color: 0x4fb893, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
  );
  sBeam.position.set(0, 1.3, 0.01);
  sSc.add(sBeam);

  const pl  = new THREE.PointLight(0x4fb893, 2, 8); pl.position.set(0, 2, 2);    sSc.add(pl);
  const pl2 = new THREE.PointLight(0x8a7dc8, 1, 6); pl2.position.set(-2, -1, 2); sSc.add(pl2);
  sSc.add(new THREE.AmbientLight(0x0d2a1a, 4));
  sR.setAnimationLoop(rScan);
  startRPPGCamera();
}

async function startRPPGCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: 320, height: 240, frameRate: 30 }
    });
    const video = document.getElementById("scanVideo");
    if (!video) return;
    video.srcObject = stream;

    setTimeout(() => {
      window.rppg.start(video, (hasil) => {
        // Update AR tags live
        document.querySelectorAll(".ar-tag").forEach(tag => {
          const tv = tag.querySelector(".tv");
          if (!tv) return;
          if (tv.textContent.includes("bpm")) {
            tv.textContent = hasil.bpm + " bpm";
            tag.querySelector(".tl").textContent = "Heart Rate (Live)";
          }
          if (tv.textContent.includes("Stres")) {
            tv.textContent = "Stres: " + hasil.stres.label;
            tv.style.color = hasil.stres.warna;
          }
        });
        // Simpan ke riwayat scan
        const scans = gScan();
        scans.push({
          tanggal: new Date().toISOString(),
          bpm:     hasil.bpm,
          hrv:     hasil.hrv,
          stres:   hasil.stres.label,
        });
        if (scans.length > 50) scans.shift();
        sScan(scans);
        window.stressAnalyzer.simpan(hasil);
      });
    }, 2000);
  } catch (e) {
    showT("Izin kamera diperlukan untuk scan rPPG");
  }
}

let st = 0;
function rScan() {
  st += 0.016;
  sBody.rotation.y       = Math.sin(st * 0.3) * 0.15;
  sBeam.position.y       = 1.3 - ((st * 0.38) % 2.8);
  sBeam.material.opacity = 0.5 + Math.sin(st * 4) * 0.3;
  sBody.children.forEach((c, i) => {
    if (c.material.wireframe)
      c.material.opacity = 0.25 + Math.sin(st * 1.5 + i * 0.3) * 0.2;
  });
  sR.render(sSc, sCam);
}

function animScan() {
  const pf   = document.getElementById("sPf");
  const stat = document.getElementById("sStat");
  const pct  = document.getElementById("sPct");
  const done = document.getElementById("sDone");
  const wait = document.getElementById("sWait");
  done.style.display = "none";
  wait.style.display = "block";

  const steps = [
    [0,   "● Menginisialisasi AR..."],
    [20,  "● Mendeteksi tubuh..."],
    [45,  "● Menganalisis BMI & body fat..."],
    [65,  "● Mengukur HRV & stres..."],
    [82,  "● Mengecek indikator nutrisi..."],
    [95,  "● Finalisasi laporan..."],
    [100, "✓ Analisis selesai!"],
  ];
  let si = 0;
  const iv = setInterval(() => {
    if (si >= steps.length) {
      clearInterval(iv);
      done.style.display = "block";
      wait.style.display = "none";
      return;
    }
    const [p, s] = steps[si++];
    pf.style.width   = p + "%";
    stat.textContent = s;
    pct.textContent  = p + "%";
  }, 700);
}

// ── THREE.JS — FOOD SCAN ─────────────────────────────────────
let fR, fSc, fCam, fBowl, fRing;

function startFood() {
  const c = document.getElementById("foodC");
  const p = document.getElementById("phone");
  c.width  = p.clientWidth;
  c.height = p.clientHeight;

  if (fR) {
    fR.setSize(c.width, c.height);
    fCam.aspect = c.width / c.height;
    fCam.updateProjectionMatrix();
    fR.setAnimationLoop(rFood);
    return;
  }

  fSc  = new THREE.Scene();
  fCam = new THREE.PerspectiveCamera(60, c.width / c.height, 0.1, 100);
  fCam.position.set(0, 1.8, 4);
  fCam.lookAt(0, 0, 0);
  fR   = new THREE.WebGLRenderer({ canvas: c, alpha: true, antialias: true });
  fR.setSize(c.width, c.height);
  fR.setPixelRatio(Math.min(devicePixelRatio, 2));

  fSc.add(new THREE.GridHelper(6, 12, 0x2a1a08, 0x1a1008));
  fBowl = new THREE.Group();
  fBowl.add(new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.4, 0.2, 32),
    new THREE.MeshStandardMaterial({ color: 0xe8c890, roughness: 0.3, metalness: 0.1 })
  ));
  const food = new THREE.Mesh(
    new THREE.SphereGeometry(0.38, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xd4a850, roughness: 0.7 })
  );
  food.position.y = 0.28;
  fBowl.add(food);
  [[0.3,0.32,0.12,0x8cc870],[-0.25,0.3,-0.1,0xe07030],[0.1,0.36,0.2,0xc87040]]
    .forEach(([x,y,z,col]) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.13,12,12),
        new THREE.MeshStandardMaterial({color:col,roughness:0.7}));
      m.position.set(x,y,z); fBowl.add(m);
    });
  fSc.add(fBowl);

  fRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.9, 0.015, 8, 64),
    new THREE.MeshBasicMaterial({ color: 0xd49060, transparent: true, opacity: 0.7 })
  );
  fRing.rotation.x = -Math.PI / 2;
  fRing.position.y = 0.12;
  fSc.add(fRing);

  const fpl  = new THREE.PointLight(0xd49060, 3, 8); fpl.position.set(0, 3, 2);   fSc.add(fpl);
  const fpl2 = new THREE.PointLight(0x4fb893, 1, 6); fpl2.position.set(-2, 1, 1); fSc.add(fpl2);
  fSc.add(new THREE.AmbientLight(0xffffff, 0.4));
  fR.setAnimationLoop(rFood);
}

let ft = 0;
function rFood() {
  ft += 0.016;
  fBowl.rotation.y       = ft * 0.25;
  fRing.rotation.z       = ft * 0.5;
  fRing.material.opacity = 0.5 + Math.sin(ft * 2) * 0.2;
  fCam.position.x        = Math.sin(ft * 0.18) * 0.4;
  fCam.lookAt(0, 0, 0);
  fR.render(fSc, fCam);
}

// ── RESIZE ───────────────────────────────────────────────────
window.addEventListener("resize", () => {
  const p = document.getElementById("phone");
  if (sR && cur === "scan") {
    const c = document.getElementById("scanC");
    c.width = p.clientWidth; c.height = p.clientHeight;
    sCam.aspect = c.width / c.height;
    sCam.updateProjectionMatrix();
    sR.setSize(c.width, c.height);
  }
  if (fR && cur === "food") {
    const c = document.getElementById("foodC");
    c.width = p.clientWidth; c.height = p.clientHeight;
    fCam.aspect = c.width / c.height;
    fCam.updateProjectionMatrix();
    fR.setSize(c.width, c.height);
  }
});

// ── INIT ─────────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
  const s = gS();
  if (s) enterApp(s);
  document.getElementById("dmChk").checked = dark;
});