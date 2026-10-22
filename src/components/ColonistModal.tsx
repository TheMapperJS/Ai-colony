import React from 'react';
import { ColonistManager } from '../sim/colonists';
import { STATE_NAMES } from '../sim/constants';
import { User, Heart, Zap, Coffee, Smile, Compass, X } from 'lucide-react';

interface ColonistModalProps {
  colonistId: number | null;
  colonists: ColonistManager;
  onClose: () => void;
}

export const ColonistModal: React.FC<ColonistModalProps> = ({
  colonistId,
  colonists,
  onClose,
}) => {
  if (colonistId === null || colonistId >= colonists.count) return null;

  const meta = colonists.meta[colonistId];
  const stateId = colonists.state[colonistId];
  const stateName = STATE_NAMES[stateId] || 'Unknown';

  const hunger = Math.round(colonists.hunger[colonistId]);
  const energy = Math.round(colonists.energy[colonistId]);
  const happiness = Math.round(colonists.happiness[colonistId]);
  const health = Math.round(colonists.health[colonistId]);

  return (
    <div className="absolute top-16 left-6 z-30 w-80 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl p-4 text-slate-200">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white text-lg shadow-inner"
            style={{ backgroundColor: meta.shirtColor }}
          >
            {meta.name[0]}
          </div>
          <div>
            <div className="font-semibold text-white leading-tight flex items-center gap-2">
              {meta.name}
              <span className="text-xs font-normal px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                {meta.trait}
              </span>
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              {stateName}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Archetype & Weapon Badge */}
      <div className="flex items-center justify-between bg-slate-950/70 border border-slate-800 rounded-lg px-2.5 py-1.5 mb-2.5 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">Class:</span>
          <span className="font-semibold text-emerald-300">{meta.archetypeName || 'PIONEER'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">Armament:</span>
          <span className="font-mono text-amber-300 capitalize">{meta.equippedWeapon ? meta.equippedWeapon.replace('_', ' ') : 'Tool'}</span>
        </div>
      </div>

      {/* Thought bubble */}
      <div className="bg-slate-800/80 border border-slate-700/60 rounded-lg p-2.5 mb-3 text-xs italic text-slate-300">
        "{meta.thought}"
      </div>

      {/* Needs Bars */}
      <div className="space-y-2 text-xs">
        {/* Health */}
        <div>
          <div className="flex justify-between text-slate-400 mb-1">
            <span className="flex items-center gap-1">
              <Heart className="w-3.5 h-3.5 text-rose-400" /> Health
            </span>
            <span className="font-mono text-slate-200">{health}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div className="bg-rose-500 h-full rounded-full" style={{ width: `${health}%` }} />
          </div>
        </div>

        {/* Hunger */}
        <div>
          <div className="flex justify-between text-slate-400 mb-1">
            <span className="flex items-center gap-1">
              <Coffee className="w-3.5 h-3.5 text-amber-400" /> Hunger
            </span>
            <span className="font-mono text-slate-200">{hunger}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                hunger > 70 ? 'bg-red-500' : hunger > 40 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${hunger}%` }}
            />
          </div>
        </div>

        {/* Energy */}
        <div>
          <div className="flex justify-between text-slate-400 mb-1">
            <span className="flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-blue-400" /> Energy
            </span>
            <span className="font-mono text-slate-200">{energy}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div className="bg-blue-500 h-full rounded-full" style={{ width: `${energy}%` }} />
          </div>
        </div>

        {/* Happiness */}
        <div>
          <div className="flex justify-between text-slate-400 mb-1">
            <span className="flex items-center gap-1">
              <Smile className="w-3.5 h-3.5 text-yellow-400" /> Morale
            </span>
            <span className="font-mono text-slate-200">{happiness}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div className="bg-yellow-500 h-full rounded-full" style={{ width: `${happiness}%` }} />
          </div>
        </div>
      </div>

      {/* Position coordinates */}
      <div className="mt-3 pt-2.5 border-t border-slate-800 flex justify-between items-center text-[11px] text-slate-400">
        <span className="flex items-center gap-1">
          <Compass className="w-3 h-3 text-slate-500" /> Position
        </span>
        <span className="font-mono text-slate-300">
          X: {Math.round(colonists.x[colonistId])} Y: {Math.round(colonists.y[colonistId])} Z: {Math.round(colonists.z[colonistId])}
        </span>
      </div>
    </div>
  );
};
