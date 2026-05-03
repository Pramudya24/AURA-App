// Guard: cegah deklarasi ulang kalau file ke-load 2x
if (typeof StressAnalyzer === "undefined") {

class StressAnalyzer {
  constructor() {
    this.riwayat = JSON.parse(localStorage.getItem("aura_stres") || "[]");
  }

  simpan(data) {
    this.riwayat.push({
      tanggal: new Date().toISOString(),
      bpm:     data.bpm,
      hrv:     data.hrv,
      level:   data.stres.label,
    });
    if (this.riwayat.length > 30) this.riwayat.shift();
    localStorage.setItem("aura_stres", JSON.stringify(this.riwayat));
  }

  rataRata7Hari() {
    const seminggu = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const data7hr  = this.riwayat.filter((d) => new Date(d.tanggal) > seminggu);
    if (data7hr.length === 0) return null;
    const avgHRV = data7hr.reduce((s, d) => s + d.hrv, 0) / data7hr.length;
    const avgBPM = data7hr.reduce((s, d) => s + d.bpm, 0) / data7hr.length;
    return { avgHRV: Math.round(avgHRV), avgBPM: Math.round(avgBPM) };
  }

  generateInsight() {
    const avg = this.rataRata7Hari();
    if (!avg) return "Belum ada data scan. Lakukan scan pertama kamu!";
    if (avg.avgHRV > 50) return "HRV kamu bagus! Tubuh dalam kondisi rileks dan pulih dengan baik.";
    if (avg.avgHRV > 30) return "Stres sedang terdeteksi. Coba luangkan waktu 10 menit meditasi hari ini.";
    return "HRV rendah minggu ini. Prioritaskan tidur cukup dan kurangi beban pikiran.";
  }
}

window.stressAnalyzer = new StressAnalyzer();

} // end guard