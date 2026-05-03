// Guard: cegah deklarasi ulang kalau file ke-load 2x
if (typeof RPPG === "undefined") {

class RPPG {
  constructor() {
    this.buffer    = [];
    this.maxSamples = 150; // 5 detik x 30fps
    this.fps       = 30;
    this.isRunning = false;
    this.video     = null;
    this.canvas    = document.createElement("canvas");
    this.ctx       = this.canvas.getContext("2d");
    this.intervalId = null;
    this.onResult  = null;
  }

  start(videoElement, onResultCallback) {
    this.video    = videoElement;
    this.onResult = onResultCallback;
    this.buffer   = [];
    this.isRunning = true;
    this.canvas.width  = 64;
    this.canvas.height = 64;
    this.intervalId = setInterval(() => this.sample(), 1000 / this.fps);
  }

  stop() {
    this.isRunning = false;
    clearInterval(this.intervalId);
  }

  sample() {
    if (!this.video || this.video.readyState < 2) return;
    this.ctx.drawImage(this.video, 0, 0, 64, 64);
    const pixels = this.ctx.getImageData(16, 16, 32, 32).data;
    let redSum = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      redSum += pixels[i];
    }
    const avgRed = redSum / (pixels.length / 4);
    this.buffer.push(avgRed);

    if (this.buffer.length >= this.maxSamples) {
      const result = this.process();
      if (this.onResult) this.onResult(result);
      this.buffer = this.buffer.slice(30);
    }
  }

  process() {
    const signal = this.detrend(this.buffer);
    const peaks  = this.findPeaks(signal);

    // FIX: pakai this.buffer.length bukan this.maxSamples
    // supaya akurat setelah buffer di-slice
    const durasiDetik = this.buffer.length / this.fps;
    const bpm = Math.round((peaks.length / durasiDetik) * 60);

    const hrv = this.calcHRV(peaks);
    return {
      bpm:  Math.max(40, Math.min(200, bpm)),
      hrv,
      stres: this.klasifikasiStres(hrv, bpm),
    };
  }

  detrend(signal) {
    const mean = signal.reduce((a, b) => a + b, 0) / signal.length;
    return signal.map((v) => v - mean);
  }

  findPeaks(signal) {
    const peaks     = [];
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

  calcHRV(peaks) {
    if (peaks.length < 3) return 30;
    const intervals = [];
    for (let i = 1; i < peaks.length; i++) {
      intervals.push((peaks[i] - peaks[i - 1]) * (1000 / this.fps));
    }
    const mean     = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / intervals.length;
    return Math.round(Math.sqrt(variance));
  }

  klasifikasiStres(hrv, bpm) {
    if (hrv > 50 && bpm < 80)  return { label: "Rendah", warna: "#4fb893" };
    if (hrv > 30 && bpm < 100) return { label: "Sedang", warna: "#d49060" };
    return                             { label: "Tinggi", warna: "#d46868" };
  }
}

window.rppg = new RPPG();

} // end guard