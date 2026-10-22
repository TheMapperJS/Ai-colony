// Performance Monitor and Automated Benchmark Harness

export interface BenchmarkMetrics {
  fps: number;
  minFps: number;
  maxFps: number;
  avgFps: number;
  onePercentLow: number;
  frameTimeMs: number;
  simTimeMs: number;
  renderTimeMs: number;
  triangles: number;
  drawCalls: number;
  activeChunks: number;
  isSoftwareGl: boolean;
  score: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
}

export class PerformanceMonitor {
  // Real-time meters
  public fps: number = 60;
  public frameTimeMs: number = 16.6;
  public simTimeMs: number = 0.5;
  public renderTimeMs: number = 1.2;
  public drawCalls: number = 0;
  public triangles: number = 0;
  public isSoftwareGl: boolean = false;

  // Running frame window
  private frameTimes: number[] = [];
  private readonly MAX_SAMPLES = 60;
  private lastTimestamp = performance.now();

  // Benchmark state
  public isBenchmarking: boolean = false;
  public benchmarkProgress: number = 0; // 0 to 100
  public lastBenchmarkResult: BenchmarkMetrics | null = null;

  private benchmarkSamples: number[] = [];
  private benchmarkStartTime: number = 0;
  private benchmarkDuration: number = 5000; // 5 seconds
  private onBenchmarkComplete?: (result: BenchmarkMetrics) => void;

  constructor() {
    this.isSoftwareGl = (() => {
      if (typeof document === 'undefined') return false;
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();
  }

  public recordFrame(frameDeltaMs: number, simMs: number, renderMs: number, drawCalls: number, triangles: number) {
    this.frameTimeMs = frameDeltaMs;
    this.simTimeMs = simMs;
    this.renderTimeMs = renderMs;
    this.drawCalls = drawCalls;
    this.triangles = triangles;

    this.frameTimes.push(frameDeltaMs);
    if (this.frameTimes.length > this.MAX_SAMPLES) {
      this.frameTimes.shift();
    }

    // Instant FPS
    if (frameDeltaMs > 0) {
      const instantFps = 1000 / frameDeltaMs;
      this.fps = Math.round(this.fps * 0.9 + instantFps * 0.1);
    }

    // Benchmark progress handling
    if (this.isBenchmarking) {
      const now = performance.now();
      const elapsed = now - this.benchmarkStartTime;
      this.benchmarkSamples.push(frameDeltaMs);
      this.benchmarkProgress = Math.min(100, Math.round((elapsed / this.benchmarkDuration) * 100));

      if (elapsed >= this.benchmarkDuration) {
        this.finishBenchmark();
      }
    }
  }

  public startBenchmark(durationMs: number = 5000, onComplete?: (result: BenchmarkMetrics) => void) {
    this.isBenchmarking = true;
    this.benchmarkDuration = durationMs;
    this.benchmarkStartTime = performance.now();
    this.benchmarkSamples = [];
    this.benchmarkProgress = 0;
    this.onBenchmarkComplete = onComplete;
  }

  private finishBenchmark() {
    this.isBenchmarking = false;
    this.benchmarkProgress = 100;

    const samples = this.benchmarkSamples;
    if (samples.length === 0) return;

    // Convert frame times to FPS
    const fpsList = samples.map((ft) => (ft > 0 ? 1000 / ft : 60)).sort((a, b) => a - b);
    const minFps = Math.round(fpsList[0]);
    const maxFps = Math.round(fpsList[fpsList.length - 1]);
    const sumFps = fpsList.reduce((acc, v) => acc + v, 0);
    const avgFps = Math.round(sumFps / fpsList.length);

    // 1% Low (approx 1st percentile)
    const onePercentIdx = Math.max(0, Math.floor(fpsList.length * 0.01));
    const onePercentLow = Math.round(fpsList[onePercentIdx]);

    // Score calculation
    const score = Math.round(avgFps * 25 + onePercentLow * 15 - this.renderTimeMs * 10);
    let grade: 'S' | 'A' | 'B' | 'C' | 'D' = 'C';
    if (avgFps >= 58 && onePercentLow >= 45) grade = 'S';
    else if (avgFps >= 50 && onePercentLow >= 35) grade = 'A';
    else if (avgFps >= 35 && onePercentLow >= 25) grade = 'B';
    else if (avgFps >= 20) grade = 'C';
    else grade = 'D';

    const result: BenchmarkMetrics = {
      fps: this.fps,
      minFps,
      maxFps,
      avgFps,
      onePercentLow,
      frameTimeMs: Number(this.frameTimeMs.toFixed(1)),
      simTimeMs: Number(this.simTimeMs.toFixed(2)),
      renderTimeMs: Number(this.renderTimeMs.toFixed(2)),
      triangles: this.triangles,
      drawCalls: this.drawCalls,
      activeChunks: 9,
      isSoftwareGl: this.isSoftwareGl,
      score: Math.max(100, score),
      grade,
    };

    this.lastBenchmarkResult = result;
    if (this.onBenchmarkComplete) {
      this.onBenchmarkComplete(result);
    }
  }
}

export const perfMonitor = new PerformanceMonitor();
