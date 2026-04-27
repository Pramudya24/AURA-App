class RPPG {
  constructor() {
    this.buffer = []; // Menyimpan sinyal merah
    this.maxSamples = 150; // 5 detik x 30fps
    this.fps = 30;
    this.isRunning = false;
    this.video = null;
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.intervalId = null;
    this.onResult = null; // Callback saat BPM tersedia
  }

  // Mulai deteksi dari elemen video
  start(videoElement, onResultCallback) {
    this.video = videoElement;
    this.onResult = onResultCallback;
    this.buffer = [];
    this.isRunning = true;
    this.canvas.width = 64;
    this.canvas.height = 64;
    // Sample setiap 33ms (30fps)
    this.intervalId = setInterval(() => this.sample(), 1000 / this.fps);
  }

  stop() {
    this.isRunning = false;
    clearInterval(this.intervalId);
  }

  // Ambil satu sample dari frame video
  sample() {
    if (!this.video || this.video.readyState < 2) return;
    // Gambar frame ke canvas kecil
    this.ctx.drawImage(this.video, 0, 0, 64, 64);
    // Ambil piksel area wajah tengah (estimasi area pipi)
    const pixels = this.ctx.getImageData(16, 16, 32, 32).data;
    let redSum = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      redSum += pixels[i]; // channel R saja
    }
    const avgRed = redSum / (pixels.length / 4);
    this.buffer.push(avgRed);

    // Proses setelah buffer penuh
    if (this.buffer.length >= this.maxSamples) {
      const result = this.process();
      if (this.onResult) this.onResult(result);
      // Geser buffer (sliding window)
      this.buffer = this.buffer.slice(30);
    }
  }

  // Proses sinyal dan hitung BPM + HRV
  process() {
    const signal = this.detrend(this.buffer);
    const peaks = this.findPeaks(signal);
    const bpm = Math.round((peaks.length / (this.maxSamples / this.fps)) * 60);
    const hrv = this.calcHRV(peaks);
    return {
      bpm: Math.max(40, Math.min(200, bpm)), // clamp 40-200
      hrv,
      stres: this.klasifikasiStres(hrv, bpm),
    };
  }

  // Hilangkan tren DC dari sinyal
  detrend(signal) {
    const mean = signal.reduce((a, b) => a + b, 0) / signal.length;
    return signal.map((v) => v - mean);
  }

  // Temukan puncak-puncak sinyal
  findPeaks(signal) {
    const peaks = [];
    const threshold = Math.max(...signal) * 0.3;
    for (let i = 2; i < signal.length - 2; i++) {
      if (
        signal[i] > signal[i - 1] &&
        signal[i] > signal[i - 2] &&
        signal[i] > signal[i + 1] &&
        signal[i] > signal[i + 2] &&
        signal[i] > threshold
      ) {
        peaks.push(i);
      }
    }
    return peaks;
  }

  // Hitung HRV (SDNN: standar deviasi interval R-R)
  calcHRV(peaks) {
    if (peaks.length < 3) return 30;
    const intervals = [];
    for (let i = 1; i < peaks.length; i++) {
      intervals.push((peaks[i] - peaks[i - 1]) * (1000 / this.fps));
    }
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance =
      intervals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) /
      intervals.length;
    return Math.round(Math.sqrt(variance));
  }

  // Klasifikasi stres dari HRV dan BPM
  klasifikasiStres(hrv, bpm) {
    if (hrv > 50 && bpm < 80) return { label: "Rendah", warna: "#4fb893" };
    if (hrv > 30 && bpm < 100) return { label: "Sedang", warna: "#d49060" };
    return { label: "Tinggi", warna: "#d46868" };
  }
}

// Export instance global
const rppg = new RPPG();
