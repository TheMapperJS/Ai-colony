import React, { useState } from 'react';
import {
  Pickaxe,
  Hammer,
  MousePointer,
  Wheat,
  XCircle,
  Play,
  Pause,
  FastForward,
  Volume2,
  VolumeX,
  RotateCcw,
  UserPlus,
  ChevronDown,
  ChevronUp,
  Layers,
  TreePine,
  Sun,
  Moon,
  Clock,
  Compass,
  Gauge,
  Activity,
  Skull,
  ShieldAlert,
} from 'lucide-react';
import {
  BLOCK_PLANKS,
  BLOCK_COBBLE,
  BLOCK_WOOD,
  BLOCK_WHEAT,
  BLOCK_BED,
  BLOCK_CAMPFIRE,
  BLOCK_STOCKPILE,
  BLOCK_DEFS,
} from '../sim/constants';
import { ColonyResources } from '../sim/tasks';
import { audio } from '../sim/audio';
import { perfMonitor } from '../sim/benchmark';

interface HUDProps {
  activeTool: 'select' | 'mine' | 'build' | 'harvest' | 'cancel';
  setActiveTool: (tool: 'select' | 'mine' | 'build' | 'harvest' | 'cancel') => void;
  selectedBlockType: number;
  setSelectedBlockType: (type: number) => void;
  gameSpeed: number;
  setGameSpeed: (speed: number) => void;
  timeOfDay: number;
  dayCount: number;
  resources: ColonyResources;
  colonistCount: number;
  activeTaskCount: number;
  enemyCount: number;
  hoveredVoxel: [number, number, number] | null;
  hoveredBlockName?: string;
  onSpawnColonist: () => void;
  onSpawnEnemy: () => void;
  onRegenerateWorld: () => void;
  onOpenBenchmark: () => void;
}

const BUILD_OPTIONS = [
  { id: BLOCK_PLANKS, name: 'Wood Planks', icon: '🪵', cost: '1 Wood' },
  { id: BLOCK_COBBLE, name: 'Cobblestone', icon: '🧱', cost: '1 Stone' },
  { id: BLOCK_WOOD, name: 'Wood Log', icon: '🪵', cost: '1 Wood' },
  { id: BLOCK_WHEAT, name: 'Wheat Crop', icon: '🌾', cost: '1 Food' },
  { id: BLOCK_BED, name: 'Bed', icon: '🛏️', cost: '3 Wood' },
  { id: BLOCK_CAMPFIRE, name: 'Campfire', icon: '🔥', cost: '2 Wood, 2 Stone' },
  { id: BLOCK_STOCKPILE, name: 'Stockpile', icon: '📦', cost: '1 Wood' },
];

export const HUD: React.FC<HUDProps> = ({
  activeTool,
  setActiveTool,
  selectedBlockType,
  setSelectedBlockType,
  gameSpeed,
  setGameSpeed,
  timeOfDay,
  dayCount,
  resources,
  colonistCount,
  activeTaskCount,
  enemyCount,
  hoveredVoxel,
  hoveredBlockName,
  onSpawnColonist,
  onSpawnEnemy,
  onRegenerateWorld,
  onOpenBenchmark,
}) => {
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [liveFps, setLiveFps] = useState(perfMonitor.fps);

  // Poll FPS at 2 Hz
  React.useEffect(() => {
    const timer = setInterval(() => {
      setLiveFps(perfMonitor.fps);
    }, 500);
    return () => clearInterval(timer);
  }, []);

  // Format time of day e.g. "08:30 AM"
  const hours = Math.floor(timeOfDay);
  const minutes = Math.floor((timeOfDay - hours) * 60);
  const isPM = hours >= 12;
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  const timeFormatted = `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;
  const isDay = hours >= 6 && hours < 18;

  const handleToggleMute = () => {
    const muted = audio.toggleMute();
    setIsMuted(muted);
  };

  return (
    <>
      {/* Top Left: Title, Day & Time, Voxel inspector */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 pointer-events-none">
        <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl px-4 py-2.5 shadow-lg flex items-center gap-3 pointer-events-auto">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white shadow">
            AC
          </div>
          <div>
            <div className="text-sm font-bold text-white tracking-wide">AI COLONY</div>
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <span className="font-semibold text-emerald-400">Day {dayCount}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                {isDay ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-400" />}
                {timeFormatted}
              </span>
            </div>
          </div>
        </div>

        {/* Hovered Block Readout */}
        {hoveredVoxel && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 flex items-center gap-2 pointer-events-auto">
            <Compass className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-medium text-emerald-300">{hoveredBlockName || 'Block'}</span>
            <span className="text-slate-500 font-mono">
              [{hoveredVoxel[0]}, {hoveredVoxel[1]}, {hoveredVoxel[2]}]
            </span>
          </div>
        )}
      </div>

      {/* Top Right: Colony Stockpile & Workforce & Live FPS */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2 shadow-lg flex items-center gap-3 text-xs font-medium text-slate-200">
          <div className="flex items-center gap-1.5" title="Wood in stockpile">
            <span className="text-amber-500">🪵</span>
            <span className="font-mono text-slate-100">{resources.wood}</span>
          </div>
          <div className="flex items-center gap-1.5" title="Stone in stockpile">
            <span className="text-slate-400">🪨</span>
            <span className="font-mono text-slate-100">{resources.stone}</span>
          </div>
          <div className="flex items-center gap-1.5" title="Food in stockpile">
            <span className="text-rose-400">🍞</span>
            <span className="font-mono text-slate-100">{resources.food}</span>
          </div>
          <div className="h-3.5 w-px bg-slate-700/60" />
          <div className="flex items-center gap-1.5" title="Active Colonists">
            <span className="text-emerald-400">👥</span>
            <span>{colonistCount}</span>
          </div>
          <div className="flex items-center gap-1.5" title="Pending Tasks">
            <span className="text-amber-400">📋</span>
            <span>{activeTaskCount}</span>
          </div>
          {enemyCount > 0 && (
            <>
              <div className="h-3.5 w-px bg-slate-700/60" />
              <div className="flex items-center gap-1.5 text-rose-400 font-bold" title="Wild enemies near colony">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>{enemyCount} Hostiles</span>
              </div>
            </>
          )}
        </div>

        {/* Live FPS Badge & Benchmark Clickable */}
        <button
          onClick={() => {
            audio.playClick();
            onOpenBenchmark();
          }}
          className="bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 rounded-xl px-3 py-2 shadow-lg flex items-center gap-2 text-xs font-mono font-bold transition cursor-pointer"
          title="Click to open Performance Benchmark"
        >
          <Activity className={`w-3.5 h-3.5 ${liveFps >= 55 ? 'text-emerald-400' : 'text-amber-400'}`} />
          <span className={liveFps >= 55 ? 'text-emerald-400' : 'text-amber-400'}>{liveFps} FPS</span>
        </button>
      </div>

      {/* Collapsible Bottom Control Dock */}
      <div
        className={`absolute bottom-5 left-1/2 -translate-x-1/2 z-20 w-[94vw] max-w-[860px] transition-all duration-300 flex flex-col items-center ${
          isDockCollapsed ? 'translate-y-[calc(100%-28px)]' : 'translate-y-0'
        }`}
      >
        {/* Toggle Collapse Bar */}
        <button
          onClick={() => setIsDockCollapsed(!isDockCollapsed)}
          className="bg-slate-900/90 border-t border-x border-slate-700/80 text-slate-400 hover:text-white px-4 py-1 rounded-t-lg text-xs font-semibold flex items-center gap-1.5 shadow cursor-pointer transition hover:bg-slate-800"
        >
          {isDockCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>Show Controls</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              <span>Hide Controls</span>
            </>
          )}
        </button>

        {/* Main Dock Container */}
        <div className="w-full bg-slate-900/95 border border-slate-700/80 rounded-2xl p-3 shadow-2xl flex flex-col gap-3">
          {/* Top row: Primary Tools & Simulation Controls */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {/* Primary Tool Buttons */}
            <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => {
                  audio.playClick();
                  setActiveTool('select');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                  activeTool === 'select'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title="Select & inspect colonists or blocks"
              >
                <MousePointer className="w-3.5 h-3.5" />
                <span>Select</span>
              </button>

              <button
                onClick={() => {
                  audio.playClick();
                  setActiveTool('mine');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                  activeTool === 'mine'
                    ? 'bg-rose-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title="Designate block to be mined"
              >
                <Pickaxe className="w-3.5 h-3.5" />
                <span>Mine</span>
              </button>

              <button
                onClick={() => {
                  audio.playClick();
                  setActiveTool('build');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                  activeTool === 'build'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title="Construct walls, floors, beds, and plots"
              >
                <Hammer className="w-3.5 h-3.5" />
                <span>Build</span>
              </button>

              <button
                onClick={() => {
                  audio.playClick();
                  setActiveTool('harvest');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                  activeTool === 'harvest'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title="Harvest crops for food"
              >
                <Wheat className="w-3.5 h-3.5" />
                <span>Harvest</span>
              </button>

              <button
                onClick={() => {
                  audio.playClick();
                  setActiveTool('cancel');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                  activeTool === 'cancel'
                    ? 'bg-red-800 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title="Cancel pending orders on clicked block"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
            </div>

            {/* Simulation Speed & Colony Actions */}
            <div className="flex items-center gap-2">
              {/* Speed Buttons */}
              <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => {
                    audio.playClick();
                    setGameSpeed(0);
                  }}
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    gameSpeed === 0 ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Pause simulation"
                >
                  <Pause className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    audio.playClick();
                    setGameSpeed(1);
                  }}
                  className={`px-2 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    gameSpeed === 1 ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Normal speed (1x)"
                >
                  1x
                </button>
                <button
                  onClick={() => {
                    audio.playClick();
                    setGameSpeed(2);
                  }}
                  className={`px-2 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    gameSpeed === 2 ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Fast speed (2x)"
                >
                  2x
                </button>
                <button
                  onClick={() => {
                    audio.playClick();
                    setGameSpeed(5);
                  }}
                  className={`px-2 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    gameSpeed === 5 ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Hyper speed (5x)"
                >
                  5x
                </button>
              </div>

              {/* Spawn Colonist */}
              <button
                onClick={() => {
                  audio.playClick();
                  onSpawnColonist();
                }}
                className="px-3 py-1.5 bg-emerald-700/80 hover:bg-emerald-600 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 transition shadow cursor-pointer"
                title="Recruit new colonist"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Colonist</span>
              </button>

              {/* Sound Toggle */}
              <button
                onClick={handleToggleMute}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition cursor-pointer"
                title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
              </button>

              {/* Regenerate World */}
              <button
                onClick={() => {
                  audio.playClick();
                  onRegenerateWorld();
                }}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition cursor-pointer"
                title="Regenerate World Map"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Spawn Encounter / Threat */}
              <button
                onClick={() => {
                  audio.playClick();
                  onSpawnEnemy();
                }}
                className="px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/70 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow"
                title="Spawn wild creature or enemy threat"
              >
                <Skull className="w-3.5 h-3.5 text-rose-400" />
                <span>Encounter</span>
              </button>

              {/* Benchmark Suite */}
              <button
                onClick={() => {
                  audio.playClick();
                  onOpenBenchmark();
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-900/60 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow"
                title="Open Performance Benchmark"
              >
                <Gauge className="w-3.5 h-3.5" />
                <span>Benchmark</span>
              </button>
            </div>
          </div>

          {/* Sub-row: If Build Mode is active, show selectable voxel items */}
          {activeTool === 'build' && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 border-t border-slate-800">
              <span className="text-xs text-slate-400 whitespace-nowrap pl-1">Structure:</span>
              <div className="flex items-center gap-1.5">
                {BUILD_OPTIONS.map((item) => {
                  const isSelected = selectedBlockType === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        audio.playClick();
                        setSelectedBlockType(item.id);
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-md border border-blue-400'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700/60'
                      }`}
                    >
                      <span>{item.icon}</span>
                      <span>{item.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({item.cost})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Camera Instructions Hint */}
          <div className="text-[11px] text-slate-500 flex justify-between items-center px-1">
            <span>Controls: Drag Left/Right click to rotate/pan camera • Scroll wheel to zoom • WASD to navigate</span>
            <span>Zero-Allocation Three.js Engine</span>
          </div>
        </div>
      </div>
    </>
  );
};
