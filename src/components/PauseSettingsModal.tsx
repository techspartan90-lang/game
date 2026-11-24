import { useState } from 'react';
import { Gamepad2, LogOut, Play, Save, Sliders, Volume2, X } from 'lucide-react';
import { GameSettings, GraphicsPreset } from '../game/types';

interface PauseSettingsModalProps {
  mode: 'pause' | 'menu-settings';
  settings: GameSettings;
  onUpdateSettings: (partial: Partial<GameSettings>) => void;
  onResume: () => void;
  onSaveGame?: () => void;
  onReturnToMenu?: () => void;
}

const PRESETS: { id: GraphicsPreset; label: string }[] = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
  { id: 'ultra', label: 'Ultra' },
  { id: 'cinematic', label: 'Cinematic' },
];

const KEYBINDINGS = [
  { action: 'Move / Drive', keys: 'W A S D  or  Arrow Keys' },
  { action: 'Sprint / Handbrake Drift', keys: 'Shift  /  Space' },
  { action: 'Jump / Crouch Stealth', keys: 'Space  /  C' },
  { action: 'Enter or Exit Vehicle / Interact', keys: 'E  or  F' },
  { action: 'Look Around / Orbit Camera', keys: 'Drag Mouse  /  Scroll Zoom' },
  { action: 'Cycle Camera View', keys: 'V' },
  { action: 'Headlights / Horn & Siren', keys: 'L  /  H' },
  { action: 'Cycle Car Radio Station', keys: 'R' },
  { action: 'Smartphone (Missions & Garage)', keys: 'P' },
  { action: 'Satellite GPS Map', keys: 'M' },
  { action: 'Gamepad Support', keys: 'Xbox / PlayStation Plug-and-Play' },
];

export function PauseSettingsModal({
  mode,
  settings,
  onUpdateSettings,
  onResume,
  onSaveGame,
  onReturnToMenu,
}: PauseSettingsModalProps) {
  const [tab, setTab] = useState<'graphics' | 'audio' | 'controls'>('graphics');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-white/15 bg-[#0c121e] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h2 className="font-display text-lg font-bold tracking-wide text-slate-100">
            {mode === 'pause' ? 'Game Paused' : 'Settings & Controls'}
          </h2>
          <button
            type="button"
            onClick={onResume}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
            aria-label="Close Settings"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Sub-tabs */}
        <div className="grid grid-cols-3 gap-1 border-b border-white/10 bg-[#080d16] p-2">
          {(
            [
              { id: 'graphics', label: 'Graphics', icon: Sliders },
              { id: 'audio', label: 'Audio & Camera', icon: Volume2 },
              { id: 'controls', label: 'Controls', icon: Gamepad2 },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'graphics' && (
            <div className="space-y-6">
              <div>
                <div className="mb-2 text-sm font-semibold text-slate-200">
                  Rendering Quality Preset
                </div>
                <p className="mb-3 text-xs text-slate-400">
                  Scales dynamic shadow resolution, hardware pixel ratio, and ocean shader fidelity.
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onUpdateSettings({ graphics: p.id })}
                      className={`rounded-lg border px-2 py-2.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                        settings.graphics === p.id
                          ? 'border-amber-400 bg-amber-500 text-slate-950'
                          : 'border-white/10 bg-[#121a29] text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'audio' && (
            <div className="space-y-5">
              <div>
                <div className="mb-1.5 flex justify-between text-xs font-medium text-slate-200">
                  <span>Master Volume</span>
                  <span className="font-mono-num text-amber-400">
                    {Math.round(settings.masterVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={settings.masterVolume}
                  onChange={(e) =>
                    onUpdateSettings({ masterVolume: parseFloat(e.target.value) })
                  }
                  className="w-full accent-amber-500"
                />
              </div>

              <div>
                <div className="mb-1.5 flex justify-between text-xs font-medium text-slate-200">
                  <span>Engine, Traffic & Weather SFX</span>
                  <span className="font-mono-num text-amber-400">
                    {Math.round(settings.sfxVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={settings.sfxVolume}
                  onChange={(e) => onUpdateSettings({ sfxVolume: parseFloat(e.target.value) })}
                  className="w-full accent-amber-500"
                />
              </div>

              <div>
                <div className="mb-1.5 flex justify-between text-xs font-medium text-slate-200">
                  <span>In-Car Radio Volume</span>
                  <span className="font-mono-num text-amber-400">
                    {Math.round(settings.radioVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={settings.radioVolume}
                  onChange={(e) => onUpdateSettings({ radioVolume: parseFloat(e.target.value) })}
                  className="w-full accent-amber-500"
                />
              </div>

              <div className="border-t border-white/10 pt-4">
                <div className="mb-1.5 flex justify-between text-xs font-medium text-slate-200">
                  <span>Mouse Camera Sensitivity</span>
                  <span className="font-mono-num text-amber-400">
                    {settings.mouseSensitivity.toFixed(1)}x
                  </span>
                </div>
                <input
                  type="range"
                  min={0.4}
                  max={2.2}
                  step={0.1}
                  value={settings.mouseSensitivity}
                  onChange={(e) =>
                    onUpdateSettings({ mouseSensitivity: parseFloat(e.target.value) })
                  }
                  className="w-full accent-amber-500"
                />
              </div>
            </div>
          )}

          {tab === 'controls' && (
            <div className="divide-y divide-white/10 rounded-lg border border-white/10 bg-[#121a29]">
              {KEYBINDINGS.map((kb) => (
                <div
                  key={kb.action}
                  className="flex items-center justify-between px-4 py-2.5 text-xs"
                >
                  <span className="text-slate-300">{kb.action}</span>
                  <span className="font-mono-num font-semibold text-amber-400">{kb.keys}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-[#080d16] px-6 py-4">
          {mode === 'pause' ? (
            <>
              <div className="flex items-center gap-2">
                {onSaveGame && (
                  <button
                    type="button"
                    onClick={onSaveGame}
                    className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10 whitespace-nowrap"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>Save Game</span>
                  </button>
                )}
                {onReturnToMenu && (
                  <button
                    type="button"
                    onClick={onReturnToMenu}
                    className="flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/20 whitespace-nowrap"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Main Menu</span>
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={onResume}
                className="flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-400 whitespace-nowrap"
              >
                <Play className="h-3.5 w-3.5" />
                <span>Resume Solana Bay</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onResume}
              className="ml-auto rounded-lg bg-amber-500 px-5 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-400 whitespace-nowrap"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
