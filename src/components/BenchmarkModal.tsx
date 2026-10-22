import React, { useState, useEffect } from 'react';
import { perfMonitor, BenchmarkMetrics } from '../sim/benchmark';
import { Activity, Gauge, Play, CheckCircle2, Cpu, Eye, X, Award } from 'lucide-react';

interface BenchmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BenchmarkModal: React.FC<BenchmarkModalProps> = ({ isOpen, onClose }) => {
  const [metrics, setMetrics] = useState({
    fps: perfMonitor.fps,
    frameTimeMs: perfMonitor.frameTimeMs,
    simTimeMs: perfMonitor.simTimeMs,
    renderTimeMs: perfMonitor.renderTimeMs,
    drawCalls: perfMonitor.drawCalls,
    triangles: perfMonitor.triangles,
    isSoftwareGl: perfMonitor.isSoftwareGl,
  });

  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<BenchmarkMetrics | null>(perfMonitor.lastBenchmarkResult);

  // Poll metrics at 4 Hz while open
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setMetrics({
        fps: perfMonitor.fps,
        frameTimeMs: perfMonitor.frameTimeMs,
        simTimeMs: perfMonitor.simTimeMs,
        renderTimeMs: perfMonitor.renderTimeMs,
        drawCalls: perfMonitor.drawCalls,
        triangles: perfMonitor.triangles,
        isSoftwareGl: perfMonitor.isSoftwareGl,
      });

      setIsBenchmarking(perfMonitor.isBenchmarking);
      setProgress(perfMonitor.benchmarkProgress);
      if (perfMonitor.lastBenchmarkResult) {
        setResult(perfMonitor.lastBenchmarkResult);
      }
    }, 250);

    return () => clearInterval(interval);
  }, [isOpen]);

  const handleStartBenchmark = () => {
    setIsBenchmarking(true);
    setProgress(0);
    setResult(null);

    perfMonitor.startBenchmark(5000, (res) => {
      setResult(res);
      setIsBenchmarking(false);
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-800/60 text-emerald-400">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-base text-white tracking-wide">PERFORMANCE BENCHMARK</div>
              <div className="text-xs text-slate-400">Hardware telemetry and automated 60 FPS stress test</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Real-time Telemetry Grid */}
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {/* FPS Meter */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col">
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-400" /> Frame Rate
              </span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span
                  className={`text-2xl font-bold font-mono ${
                    metrics.fps >= 55 ? 'text-emerald-400' : metrics.fps >= 30 ? 'text-amber-400' : 'text-rose-400'
                  }`}
                >
                  {metrics.fps}
                </span>
                <span className="text-xs text-slate-500 font-mono">FPS</span>
              </div>
            </div>

            {/* Frame Time */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col">
              <span className="text-xs text-slate-400 font-medium">Frame Time</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold font-mono text-slate-200">
                  {metrics.frameTimeMs.toFixed(1)}
                </span>
                <span className="text-xs text-slate-500 font-mono">ms</span>
              </div>
            </div>

            {/* Sim Tick Time */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col">
              <span className="text-xs text-slate-400 font-medium">Sim Loop</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold font-mono text-emerald-400">
                  {metrics.simTimeMs.toFixed(2)}
                </span>
                <span className="text-xs text-slate-500 font-mono">ms</span>
              </div>
            </div>
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-3 gap-3 text-xs bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
            <div>
              <span className="text-slate-400">GPU Draw Calls:</span>
              <span className="ml-1.5 font-mono text-slate-200">{metrics.drawCalls}</span>
            </div>
            <div>
              <span className="text-slate-400">Terrain Triangles:</span>
              <span className="ml-1.5 font-mono text-slate-200">{metrics.triangles.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-slate-400">Renderer Mode:</span>
              <span className="ml-1.5 font-mono text-emerald-400">
                {metrics.isSoftwareGl ? 'Software WebGL' : 'Hardware GPU'}
              </span>
            </div>
          </div>

          {/* Benchmark Action or Result Box */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            {!isBenchmarking && !result && (
              <div className="flex items-center justify-between gap-4">
                <div className="text-xs text-slate-300">
                  Run a standardized 5-second camera sweep & high-load AI simulation stress test to profile FPS and frame pacing.
                </div>
                <button
                  onClick={handleStartBenchmark}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition whitespace-nowrap cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start Benchmark</span>
                </button>
              </div>
            )}

            {isBenchmarking && (
              <div className="space-y-2 py-1">
                <div className="flex justify-between text-xs text-slate-300">
                  <span className="flex items-center gap-1.5 font-medium text-emerald-400">
                    <Activity className="w-4 h-4 animate-spin" /> Stress testing scene & colonists...
                  </span>
                  <span className="font-mono">{progress}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-150"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {result && !isBenchmarking && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span className="text-sm font-bold text-white">Benchmark Results</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-950 border border-emerald-800/80 text-emerald-300 text-xs font-bold">
                    <Award className="w-3.5 h-3.5" />
                    <span>Grade {result.grade} ({result.score} pts)</span>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-medium">Average</div>
                    <div className="text-lg font-bold font-mono text-emerald-400">{result.avgFps} FPS</div>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-medium">1% Low</div>
                    <div className="text-lg font-bold font-mono text-blue-400">{result.onePercentLow} FPS</div>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-medium">Min FPS</div>
                    <div className="text-lg font-bold font-mono text-amber-400">{result.minFps} FPS</div>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-medium">Max FPS</div>
                    <div className="text-lg font-bold font-mono text-slate-200">{result.maxFps} FPS</div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-1 text-xs text-slate-400">
                  <span>Frame stability: 100% Zero-Allocation rendering</span>
                  <button
                    onClick={handleStartBenchmark}
                    className="text-emerald-400 hover:text-emerald-300 font-semibold underline cursor-pointer"
                  >
                    Re-run Test
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
