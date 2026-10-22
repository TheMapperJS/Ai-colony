import React, { useState, useMemo, useCallback } from 'react';
import { VoxelWorld } from './sim/world';
import { VoxelMesher } from './sim/mesher';
import { ColonistManager } from './sim/colonists';
import { TaskManager } from './sim/tasks';
import { EnemyManager } from './sim/enemies';
import { VoxelPathfinder } from './sim/pathfinding';
import { BLOCK_PLANKS, WORLD_W, WORLD_D } from './sim/constants';
import { VoxelScene } from './components/VoxelScene';
import { HUD } from './components/HUD';
import { ColonistModal } from './components/ColonistModal';
import { BenchmarkModal } from './components/BenchmarkModal';

export const App: React.FC = () => {
  // Stable Simulation Singletons (Allocated once at startup)
  const [worldSeed, setWorldSeed] = useState(42);

  const { world, mesher, colonists, tasks, enemies, pathfinder } = useMemo(() => {
    const w = new VoxelWorld();
    const m = new VoxelMesher();
    const c = new ColonistManager();
    const t = new TaskManager();
    const e = new EnemyManager();
    const p = new VoxelPathfinder();

    // Generate terrain
    w.generate(worldSeed);

    // Initial colonists spawn at colony clearing
    const spawnX = Math.floor(WORLD_W / 2);
    const spawnZ = Math.floor(WORLD_D / 2);

    c.spawnColonist(w, spawnX - 2, spawnZ - 1);
    c.spawnColonist(w, spawnX + 1, spawnZ - 2);
    c.spawnColonist(w, spawnX - 1, spawnZ + 2);
    c.spawnColonist(w, spawnX + 2, spawnZ + 1);

    // Initial peaceful wildlife (Forest Slime & Aether Slime)
    e.spawnEnemy(w, 'slime', 8, 8);
    e.spawnEnemy(w, 'slime_aether', WORLD_W - 8, WORLD_D - 8);

    return { world: w, mesher: m, colonists: c, tasks: t, enemies: e, pathfinder: p };
  }, [worldSeed]);

  // UI State
  const [activeTool, setActiveTool] = useState<'select' | 'mine' | 'build' | 'harvest' | 'cancel'>('select');
  const [selectedBlockType, setSelectedBlockType] = useState<number>(BLOCK_PLANKS);
  const [selectedColonistId, setSelectedColonistId] = useState<number | null>(null);
  const [isBenchmarkOpen, setIsBenchmarkOpen] = useState(false);

  const [gameSpeed, setGameSpeed] = useState<number>(1);
  const [timeOfDay, setTimeOfDay] = useState<number>(9.5); // 9:30 AM
  const [dayCount, setDayCount] = useState<number>(1);

  const [hoveredVoxel, setHoveredVoxel] = useState<[number, number, number] | null>(null);
  const [hoveredBlockName, setHoveredBlockName] = useState<string | undefined>(undefined);

  // Workforce & Enemies count state trigger
  const [workforceCount, setWorkforceCount] = useState<number>(4);
  const [enemyCounter, setEnemyCounter] = useState<number>(2);

  const handleSpawnColonist = useCallback(() => {
    const newIdx = colonists.spawnColonist(world);
    if (newIdx >= 0) {
      setWorkforceCount(colonists.count);
    }
  }, [colonists, world]);

  const handleSpawnEnemy = useCallback(() => {
    const newIdx = enemies.spawnEnemy(world);
    if (newIdx >= 0) {
      setEnemyCounter(enemies.count);
    }
  }, [enemies, world]);

  const handleRegenerateWorld = useCallback(() => {
    setWorldSeed((s: number) => s + 1);
    setSelectedColonistId(null);
    setWorkforceCount(4);
    setEnemyCounter(2);
    setDayCount(1);
    setTimeOfDay(9.0);
  }, []);

  const handleHoverVoxel = useCallback((coords: [number, number, number] | null, name?: string) => {
    setHoveredVoxel(coords);
    setHoveredBlockName(name);
  }, []);

  return (
    <div className="w-full h-full relative overflow-hidden bg-slate-950 font-sans select-none">
      {/* 3D Voxel Viewport */}
      <VoxelScene
        world={world}
        mesher={mesher}
        colonists={colonists}
        tasks={tasks}
        enemies={enemies}
        pathfinder={pathfinder}
        activeTool={activeTool}
        selectedBlockType={selectedBlockType}
        selectedColonistId={selectedColonistId}
        onSelectColonist={setSelectedColonistId}
        gameSpeed={gameSpeed}
        timeOfDay={timeOfDay}
        setTimeOfDay={setTimeOfDay}
        setDayCount={setDayCount}
        onHoverVoxel={handleHoverVoxel}
      />

      {/* Selected Colonist Inspector Modal */}
      <ColonistModal
        colonistId={selectedColonistId}
        colonists={colonists}
        onClose={() => setSelectedColonistId(null)}
      />

      {/* Performance Benchmark Suite Modal */}
      <BenchmarkModal
        isOpen={isBenchmarkOpen}
        onClose={() => setIsBenchmarkOpen(false)}
      />

      {/* HUD & Collapsible Bottom Dock */}
      <HUD
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        selectedBlockType={selectedBlockType}
        setSelectedBlockType={setSelectedBlockType}
        gameSpeed={gameSpeed}
        setGameSpeed={setGameSpeed}
        timeOfDay={timeOfDay}
        dayCount={dayCount}
        resources={tasks.resources}
        colonistCount={colonists.count}
        activeTaskCount={tasks.count}
        enemyCount={enemies.count}
        hoveredVoxel={hoveredVoxel}
        hoveredBlockName={hoveredBlockName}
        onSpawnColonist={handleSpawnColonist}
        onSpawnEnemy={handleSpawnEnemy}
        onRegenerateWorld={handleRegenerateWorld}
        onOpenBenchmark={() => setIsBenchmarkOpen(true)}
      />
    </div>
  );
};

export default App;
