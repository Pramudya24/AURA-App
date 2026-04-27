/* ============================================================
   AURA — AR Health Intelligence
   app.js — Semua logika aplikasi
   ============================================================ */

// ── Storage Keys & Helpers ──────────────────────────────────
const UK = "aura_u",
  SK = "aura_s";
const gU = () => JSON.parse(localStorage.getItem(UK) || "[]");
const sU = (u) => localStorage.setItem(UK, JSON.stringify(u));
const gS = () => JSON.parse(localStorage.getItem(SK) || "null");
const svS = (s) => localStorage.setItem(SK, JSON.stringify(s));
const clS = () => localStorage.removeItem(SK);

// ── AUTH ────────────────────────────────────────────────────
function swAuth(t) {
  document
    .querySelectorAll(".atab")
    .forEach((a, i) => a.classList.toggle("on", i === (t === "login" ? 0 : 1)));
  document.getElementById("loginF").classList.toggle("on", t === "login");
  document.getElementById("regF").classList.toggle("on", t === "reg");
  ["lErr", "rErr"].forEach((id) =>
    document.getElementById(id).classList.remove("on"),
  );
}

function doLogin() {
  const em = document.getElementById("lEm").value.trim();
  const pw = document.getElementById("lPw").value;
  const u = gU().find((u) => u.email === em && u.password === pw);
  if (!u) {
    document.getElementById("lErr").classList.add("on");
    return;
  }
  svS(u);
  enterApp(u);
}

function doReg() {
  const nm = document.getElementById("rNm").value.trim();
  const em = document.getElementById("rEm").value.trim();
  const pw = document.getElementById("rPw").value;
  const ht = +document.getElementById("rHt").value || 168;
  const wt = +document.getElementById("rWt").value || 62;
  const err = document.getElementById("rErr");

  if (!nm || !em || pw.length < 6) {
    err.textContent = "Lengkapi semua field. Password min. 6 karakter.";
    err.classList.add("on");
    return;
  }
  const users = gU();
  if (users.find((u) => u.email === em)) {
    err.textContent = "Email sudah terdaftar.";
    err.classList.add("on");
    return;
  }
  const u = { name: nm, email: em, password: pw, height: ht, weight: wt };
  users.push(u);
  sU(users);
  svS(u);
  enterApp(u);
}

function doLogout() {
  clS();
  document.getElementById("tbtn").classList.remove("show");
  go("auth");
}

// ── ENTER APP (Step 2.3 — BMI & Body Fat) ───────────────────
function hitungBMI(user) {
  const tinggiM = user.height / 100;
  const bmi = (user.weight / (tinggiM * tinggiM)).toFixed(1);

  // Klasifikasi BMI
  let kategori = "";
  if (bmi < 18.5) kategori = "Kurus";
  else if (bmi < 25) kategori = "Normal · Ideal";
  else if (bmi < 30) kategori = "Overweight";
  else kategori = "Obesitas";

  // Estimasi body fat — pilih rumus pria/wanita jika ada, default wanita
  const usia = user.age || 25;
  const bodyFat =
    user.gender === "male"
      ? (1.2 * bmi + 0.23 * usia - 16.2).toFixed(1) // rumus pria
      : (1.2 * bmi + 0.23 * usia - 5.4).toFixed(1); // rumus wanita

  return { bmi, kategori, bodyFat };
}

function enterApp(u) {
  // Hitung semua data kesehatan dulu
  const hasil = hitungBMI(u);

  // Update Header & Profil
  document.getElementById("hGreet").textContent =
    "Halo, " + u.name.split(" ")[0] + " 👋";
  document.getElementById("pNm").textContent = u.name;
  document.getElementById("pEm").textContent = u.email;
  document.getElementById("pHt").textContent = u.height;
  document.getElementById("pWt").textContent = u.weight;
  document.getElementById("pBMI").textContent = hasil.bmi; // pakai dari hitungBMI

  // Update AR Tag di layar scan
  document.querySelectorAll(".ar-tag").forEach((tag) => {
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

// ── NAVIGATION ──────────────────────────────────────────────
let cur = "auth";
function go(id) {
  document.querySelectorAll(".scr").forEach((s) => s.classList.remove("on"));
  document.getElementById(id).classList.add("on");
  cur = id;
  if (id === "scan") startScan();
  if (id === "food") startFood();
}

// ── THEME TOGGLE ────────────────────────────────────────────
let dark = true;
function toggleTheme() {
  dark = !dark;
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  document.getElementById("tbtn").textContent = dark ? "🌙" : "☀️";
  const c = document.getElementById("dmChk");
  if (c) c.checked = dark;
}

// ── MOOD TRACKER ────────────────────────────────────────────
function setMood(el) {
  document.querySelectorAll(".mopt").forEach((m) => m.classList.remove("on"));
  el.classList.add("on");
  showT("Mood tersimpan: " + el.querySelector(".em").textContent);
}

// ── TOAST ───────────────────────────────────────────────────
let tT;
function showT(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(tT);
  tT = setTimeout(() => t.classList.remove("show"), 2500);
}

// ── FOOD SCAN ───────────────────────────────────────────────
function selFood(el, name, cal, pro, fat, carb) {
  document
    .querySelectorAll(".fi-pill")
    .forEach((p) => p.classList.remove("on"));
  el.classList.add("on");
  document.getElementById("fNm").textContent = name;
  document.getElementById("fCal").textContent = cal;
  document.getElementById("fPro").textContent = pro;
  document.getElementById("fFat").textContent = fat;
  document.getElementById("fCarb").textContent = carb;
}

function logFood() {
  const nm = document.getElementById("fNm").textContent;
  const cal = document.getElementById("fCal").textContent;
  showT("✓ " + nm + " (" + cal + " kkal) ditambahkan!");
  setTimeout(() => go("home"), 1200);
}

// ── THREE.JS — BODY SCAN ────────────────────────────────────
let sR, sSc, sCam, sBody, sBeam;

function startScan() {
  const c = document.getElementById("scanC");
  const p = document.getElementById("phone");
  c.width = p.clientWidth;
  c.height = p.clientHeight;
  animScan();

  if (sR) {
    sR.setSize(c.width, c.height);
    sCam.aspect = c.width / c.height;
    sCam.updateProjectionMatrix();
    sR.setAnimationLoop(rScan);
    return;
  }

  sSc = new THREE.Scene();
  sCam = new THREE.PerspectiveCamera(60, c.width / c.height, 0.1, 100);
  sCam.position.set(0, 0, 3.5);
  sR = new THREE.WebGLRenderer({ canvas: c, alpha: true, antialias: true });
  sR.setSize(c.width, c.height);
  sR.setPixelRatio(Math.min(devicePixelRatio, 2));

  const grid = new THREE.GridHelper(8, 20, 0x1a3a2a, 0x0d1f14);
  grid.position.y = -1.6;
  sSc.add(grid);

  sBody = new THREE.Group();
  const bM = new THREE.MeshStandardMaterial({
    color: 0x4fb893,
    transparent: true,
    opacity: 0.15,
  });
  const wM = new THREE.MeshBasicMaterial({
    color: 0x4fb893,
    wireframe: true,
    transparent: true,
    opacity: 0.45,
  });

  [
    [new THREE.SphereGeometry(0.18, 16, 16), 0, 1.3, 0],
    [new THREE.CylinderGeometry(0.22, 0.19, 0.7, 12), 0, 0.65, 0],
    [new THREE.CylinderGeometry(0.07, 0.06, 0.6, 10), -0.34, 0.7, 0],
    [new THREE.CylinderGeometry(0.07, 0.06, 0.6, 10), 0.34, 0.7, 0],
    [new THREE.CylinderGeometry(0.1, 0.09, 0.65, 10), -0.13, 0.0, 0],
    [new THREE.CylinderGeometry(0.1, 0.09, 0.65, 10), 0.13, 0.0, 0],
    [new THREE.CylinderGeometry(0.08, 0.07, 0.6, 10), -0.14, -0.72, 0],
    [new THREE.CylinderGeometry(0.08, 0.07, 0.6, 10), 0.14, -0.72, 0],
  ].forEach(([g, x, y, z]) => {
    const m1 = new THREE.Mesh(g, bM.clone());
    const m2 = new THREE.Mesh(g, wM.clone());
    [m1, m2].forEach((m) => m.position.set(x, y, z));
    sBody.add(m1, m2);
  });
  sSc.add(sBody);

  sBeam = new THREE.Mesh(
    new THREE.PlaneGeometry(0.7, 0.025),
    new THREE.MeshBasicMaterial({
      color: 0x4fb893,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    }),
  );
  sBeam.position.set(0, 1.3, 0.01);
  sSc.add(sBeam);

  const pl = new THREE.PointLight(0x4fb893, 2, 8);
  pl.position.set(0, 2, 2);
  sSc.add(pl);
  const pl2 = new THREE.PointLight(0x8a7dc8, 1, 6);
  pl2.position.set(-2, -1, 2);
  sSc.add(pl2);
  sSc.add(new THREE.AmbientLight(0x0d2a1a, 4));
  sR.setAnimationLoop(rScan);
  // Tambahkan ini: akses kamera depan untuk rPPG
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: 320, height: 240, frameRate: 30 }
    });
    const video = document.getElementById("scanVideo");
    video.srcObject = stream;
    
    // Mulai deteksi rPPG setelah 2 detik (tunggu kamera stabil)
    setTimeout(() => {
      rppg.start(video, (hasil) => {
        // Update AR tag BPM
        document.querySelectorAll(".ar-tag").forEach(tag => {
          const tv = tag.querySelector(".tv");
          if (tv && tv.textContent.includes("bpm")) {
            tv.textContent = hasil.bpm + " bpm";
            tag.querySelector(".tl").textContent = "Heart Rate (Live)";
          }
          if (tv && tv.textContent.includes("Stres")) {
            tv.textContent = "Stres: " + hasil.stres.label;
            tv.style.color = hasil.stres.warna;
          }
        });
      });
    }, 2000);
    
  } catch(e) {
    showT("Izin kamera diperlukan untuk scan");
  }
}

let st = 0;
function rScan() {
  st += 0.016;
  sBody.rotation.y = Math.sin(st * 0.3) * 0.15;
  sBeam.position.y = 1.3 - ((st * 0.38) % 2.8);
  sBeam.material.opacity = 0.5 + Math.sin(st * 4) * 0.3;
  sBody.children.forEach((c, i) => {
    if (c.material.wireframe)
      c.material.opacity = 0.25 + Math.sin(st * 1.5 + i * 0.3) * 0.2;
  });
  sR.render(sSc, sCam);
}

function animScan() {
  const pf = document.getElementById("sPf");
  const stat = document.getElementById("sStat");
  const pct = document.getElementById("sPct");
  const done = document.getElementById("sDone");
  const wait = document.getElementById("sWait");
  done.style.display = "none";
  wait.style.display = "block";

  const steps = [
    [0, "● Menginisialisasi AR..."],
    [20, "● Mendeteksi tubuh..."],
    [45, "● Menganalisis BMI & body fat..."],
    [65, "● Mengukur HRV & stres..."],
    [82, "● Mengecek indikator nutrisi..."],
    [95, "● Finalisasi laporan..."],
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
    pf.style.width = p + "%";
    stat.textContent = s;
    pct.textContent = p + "%";
  }, 700);
}

// ── THREE.JS — FOOD SCAN ────────────────────────────────────
let fR, fSc, fCam, fBowl, fRing;

function startFood() {
  const c = document.getElementById("foodC");
  const p = document.getElementById("phone");
  c.width = p.clientWidth;
  c.height = p.clientHeight;

  if (fR) {
    fR.setSize(c.width, c.height);
    fCam.aspect = c.width / c.height;
    fCam.updateProjectionMatrix();
    fR.setAnimationLoop(rFood);
    return;
  }

  fSc = new THREE.Scene();
  fCam = new THREE.PerspectiveCamera(60, c.width / c.height, 0.1, 100);
  fCam.position.set(0, 1.8, 4);
  fCam.lookAt(0, 0, 0);
  fR = new THREE.WebGLRenderer({ canvas: c, alpha: true, antialias: true });
  fR.setSize(c.width, c.height);
  fR.setPixelRatio(Math.min(devicePixelRatio, 2));

  fSc.add(new THREE.GridHelper(6, 12, 0x2a1a08, 0x1a1008));

  fBowl = new THREE.Group();
  fBowl.add(
    new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.4, 0.2, 32),
      new THREE.MeshStandardMaterial({
        color: 0xe8c890,
        roughness: 0.3,
        metalness: 0.1,
      }),
    ),
  );
  const food = new THREE.Mesh(
    new THREE.SphereGeometry(0.38, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xd4a850, roughness: 0.7 }),
  );
  food.position.y = 0.28;
  fBowl.add(food);

  [
    [0.3, 0.32, 0.12, 0x8cc870],
    [-0.25, 0.3, -0.1, 0xe07030],
    [0.1, 0.36, 0.2, 0xc87040],
  ].forEach(([x, y, z, col]) => {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 12, 12),
      new THREE.MeshStandardMaterial({ color: col, roughness: 0.7 }),
    );
    m.position.set(x, y, z);
    fBowl.add(m);
  });
  fSc.add(fBowl);

  fRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.9, 0.015, 8, 64),
    new THREE.MeshBasicMaterial({
      color: 0xd49060,
      transparent: true,
      opacity: 0.7,
    }),
  );
  fRing.rotation.x = -Math.PI / 2;
  fRing.position.y = 0.12;
  fSc.add(fRing);

  const fpl = new THREE.PointLight(0xd49060, 3, 8);
  fpl.position.set(0, 3, 2);
  fSc.add(fpl);
  const fpl2 = new THREE.PointLight(0x4fb893, 1, 6);
  fpl2.position.set(-2, 1, 1);
  fSc.add(fpl2);
  fSc.add(new THREE.AmbientLight(0xffffff, 0.4));
  fR.setAnimationLoop(rFood);
}

let ft = 0;
function rFood() {
  ft += 0.016;
  fBowl.rotation.y = ft * 0.25;
  fRing.rotation.z = ft * 0.5;
  fRing.material.opacity = 0.5 + Math.sin(ft * 2) * 0.2;
  fCam.position.x = Math.sin(ft * 0.18) * 0.4;
  fCam.lookAt(0, 0, 0);
  fR.render(fSc, fCam);
}

// ── RESIZE HANDLER ──────────────────────────────────────────
window.addEventListener("resize", () => {
  const p = document.getElementById("phone");
  if (sR && cur === "scan") {
    const c = document.getElementById("scanC");
    c.width = p.clientWidth;
    c.height = p.clientHeight;
    sCam.aspect = c.width / c.height;
    sCam.updateProjectionMatrix();
    sR.setSize(c.width, c.height);
  }
  if (fR && cur === "food") {
    const c = document.getElementById("foodC");
    c.width = p.clientWidth;
    c.height = p.clientHeight;
    fCam.aspect = c.width / c.height;
    fCam.updateProjectionMatrix();
    fR.setSize(c.width, c.height);
  }
});

// ── INIT ────────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
  const s = gS();
  if (s) enterApp(s);
  document.getElementById("dmChk").checked = dark;
});

// Load database makanan lokal
let foodDB = {};
fetch("foods-local.json")
  .then((r) => r.json())
  .then((data) => {
    foodDB = data;
  });

// Fungsi utama: identifikasi makanan dari gambar
async function identifikasiMakanan(base64Image) {
  try {
    const response = await fetch(
      "https://api.clarifai.com/v2/models/food-item-recognition/outputs",
      {
        method: "POST",
        headers: {
          Authorization: "Key " + CONFIG.CLARIFAI_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: [{ data: { image: { base64: base64Image } } }],
        }),
      },
    );
    const data = await response.json();
    const concepts = data.outputs[0].data.concepts;

    // Ambil nama makanan dengan confidence tertinggi
    const topFood = concepts[0].name.toLowerCase();
    return await ambilNutrisi(topFood);
  } catch (e) {
    console.error("Clarifai error:", e);
    return null;
  }
}
// Ambil data nutrisi: cek lokal dulu, baru USDA
async function ambilNutrisi(namaM) {
  // 1. Cek database lokal Indonesia
  if (foodDB[namaM]) {
    return { nama: namaM, ...foodDB[namaM] };
  }
  // 2. Fallback ke USDA API
  const url =
    `https://api.nal.usda.gov/fdc/v1/foods/search` +
    `?query=${namaM}&api_key=${CONFIG.USDA_KEY}&pageSize=1`;
  const res = await fetch(url);
  const json = await res.json();
  if (!json.foods || json.foods.length === 0) return null;

  const f = json.foods[0];
  const nutrients = {};
  f.foodNutrients.forEach((n) => {
    if (n.nutrientName.includes("Energy"))
      nutrients.kalori = Math.round(n.value);
    if (n.nutrientName.includes("Protein"))
      nutrients.protein = Math.round(n.value);
    if (n.nutrientName.includes("Carbohy"))
      nutrients.karbo = Math.round(n.value);
    if (n.nutrientName.includes("Total lipid"))
      nutrients.lemak = Math.round(n.value);
  });
  return { nama: f.description, ...nutrients };
}

// Ambil frame dari video kamera sebagai base64
function ambilFrameKamera(videoElement) {
  const canvas = document.createElement("canvas");
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;
  canvas.getContext("2d").drawImage(videoElement, 0, 0);
  // Hapus prefix "data:image/jpeg;base64,"
  return canvas.toDataURL("image/jpeg", 0.8).split(",")[1];
}

// Tambahkan tombol "Scan Sekarang" di layar food scan
async function scanMakanan() {
  const video = document.getElementById("foodVideo");
  const base64 = ambilFrameKamera(video);
  showT("Mengidentifikasi makanan...");

  const hasil = await identifikasiMakanan(base64);
  if (hasil) {
    document.getElementById("fNm").textContent = hasil.nama;
    document.getElementById("fCal").textContent = hasil.kalori || "-";
    document.getElementById("fPro").textContent = (hasil.protein || "-") + "g";
    document.getElementById("fFat").textContent = (hasil.lemak || "-") + "g";
    document.getElementById("fCarb").textContent = (hasil.karbo || "-") + "g";
    showT("✓ Makanan teridentifikasi: " + hasil.nama);
  } else {
    showT("Makanan tidak dikenali, pilih manual");
  }
}

async function startFoodCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" } // kamera belakang
    });
    document.getElementById("foodVideo").srcObject = stream;
  } catch(e) {
    showT("Izin kamera ditolak, gunakan pilihan manual");
  }
}

// Di fungsi go(id), tambahkan:
if (id === "food") { startFood(); startFoodCamera(); }

