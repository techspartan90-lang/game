import { useState } from 'react';
import {
  Briefcase,
  Car,
  Check,
  CloudRain,
  Paintbrush,
  Save,
  ShieldAlert,
  Shirt,
  Sun,
  Wrench,
  X,
} from 'lucide-react';
import {
  HudSnapshot,
  OUTFITS,
  OutfitId,
  PAINT_SWATCHES,
  VEHICLE_PRESETS,
  VehicleType,
  WeatherType,
} from '../game/types';
import { MISSIONS } from '../game/missions';

interface SmartphoneModalProps {
  hud: HudSnapshot;
  initialTab?: 'missions' | 'garage' | 'wardrobe' | 'world';
  onClose: () => void;
  onStartMission: (id: string) => void;
  onAbortMission: () => void;
  onSummonVehicle: (type: VehicleType) => void;
  onPaintVehicle: (hex: number) => void;
  onRepairVehicle: () => void;
  onSetOutfit: (id: OutfitId) => void;
  onSetWeather: (w: WeatherType) => void;
  onSetTime: (h: number) => void;
  onTriggerWanted: () => void;
  onClearWanted: () => void;
  onSaveGame: () => void;
}

const WEATHER_OPTIONS: { id: WeatherType; label: string }[] = [
  { id: 'sunny', label: 'Sunny' },
  { id: 'cloudy', label: 'Cloudy' },
  { id: 'foggy', label: 'Coastal Fog' },
  { id: 'rain', label: 'Rain' },
  { id: 'storm', label: 'Tropical Storm' },
];

const TIME_PRESETS = [
  { label: 'Sunrise', hour: 6.4 },
  { label: 'Midday', hour: 12.5 },
  { label: 'Sunset', hour: 17.6 },
  { label: 'Midnight', hour: 23.0 },
];

export function SmartphoneModal({
  hud,
  initialTab = 'missions',
  onClose,
  onStartMission,
  onAbortMission,
  onSummonVehicle,
  onPaintVehicle,
  onRepairVehicle,
  onSetOutfit,
  onSetWeather,
  onSetTime,
  onTriggerWanted,
  onClearWanted,
  onSaveGame,
}: SmartphoneModalProps) {
  const [tab, setTab] = useState<'missions' | 'garage' | 'wardrobe' | 'world'>(initialTab);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/65 p-4">
      <div className="flex max-h-[86vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-white/15 bg-[#0c121e] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <h2 className="font-display text-lg font-bold tracking-wide text-slate-100">
              Solana NetOS
            </h2>
            <p className="text-xs text-slate-400">
              Balance: <span className="font-mono-num text-amber-400">${hud.cash.toLocaleString()}</span> ·{' '}
              {hud.completedMissions.length}/{MISSIONS.length} Contracts Complete
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close Smartphone"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Segmented App Navigation */}
        <div className="grid grid-cols-4 gap-1 border-b border-white/10 bg-[#080d16] p-2">
          {(
            [
              { id: 'missions', label: 'Contracts', icon: Briefcase },
              { id: 'garage', label: 'Garage', icon: Car },
              { id: 'wardrobe', label: 'Wardrobe', icon: Shirt },
              { id: 'world', label: 'Environment', icon: Sun },
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'missions' && (
            <div className="space-y-4">
              {MISSIONS.map((m) => {
                const isActive = hud.activeMissionId === m.id;
                const isDone = hud.completedMissions.includes(m.id);
                return (
                  <div
                    key={m.id}
                    className={`rounded-lg border p-4 transition-colors ${
                      isActive
                        ? 'border-amber-400/60 bg-amber-500/10'
                        : 'border-white/10 bg-[#121a29]'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span>{m.category}</span>
                          <span aria-hidden="true">·</span>
                          <span>{m.giver}</span>
                          {m.timeLimitSec && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono-num">{m.timeLimitSec}s limit</span>
                            </>
                          )}
                        </div>
                        <h3 className="font-display text-base font-bold text-slate-100">
                          {m.title}
                        </h3>
                        <p className="max-w-lg text-sm leading-relaxed text-slate-300">
                          {m.description}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="font-mono-num text-sm font-semibold text-amber-400">
                          +${m.reward.toLocaleString()}
                        </span>
                        {isActive ? (
                          <button
                            type="button"
                            onClick={onAbortMission}
                            className="rounded-lg border border-red-400/50 bg-red-500/20 px-3.5 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-500/30 whitespace-nowrap"
                          >
                            Cancel Mission
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              onStartMission(m.id);
                              onClose();
                            }}
                            className="rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-semibold text-slate-950 hover:bg-amber-400 whitespace-nowrap"
                          >
                            {isDone ? 'Replay' : 'Accept Job'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'garage' && (
            <div className="space-y-6">
              <div>
                <h3 className="mb-3 text-sm font-semibold text-slate-200">
                  Fleet & Delivery
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {(Object.keys(VEHICLE_PRESETS) as VehicleType[]).map((type) => {
                    const p = VEHICLE_PRESETS[type];
                    const owned = hud.ownedVehicles.includes(type);
                    const canAfford = hud.cash >= p.price;
                    return (
                      <div
                        key={type}
                        className="flex flex-col justify-between rounded-lg border border-white/10 bg-[#121a29] p-4"
                      >
                        <div>
                          <div className="text-xs text-slate-400">{p.category}</div>
                          <div className="font-display text-base font-bold text-slate-100">
                            {p.name}
                          </div>
                          <div className="mt-2 flex items-center gap-3 font-mono-num text-xs text-slate-400">
                            <span>Top {Math.round(p.maxSpeed * 3.6)} km/h</span>
                            <span aria-hidden="true">·</span>
                            <span>Grip {p.grip.toFixed(1)}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            onSummonVehicle(type);
                            if (owned) onClose();
                          }}
                          disabled={!owned && !canAfford}
                          className={`mt-4 w-full rounded-lg px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                            owned
                              ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                              : canAfford
                                ? 'border border-amber-400/50 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25'
                                : 'cursor-not-allowed border border-white/10 bg-white/5 text-slate-500'
                          }`}
                        >
                          {owned ? 'Deliver Nearby' : `Unlock · $${p.price.toLocaleString()}`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-white/10 pt-5">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                    <Paintbrush className="h-4 w-4 text-amber-400" />
                    <span>Solana Customs Paint & Service</span>
                  </div>
                  <button
                    type="button"
                    onClick={onRepairVehicle}
                    className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10 whitespace-nowrap"
                  >
                    <Wrench className="h-3.5 w-3.5" />
                    <span>Repair Vehicle</span>
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                  {PAINT_SWATCHES.map((sw) => (
                    <button
                      key={sw.name}
                      type="button"
                      title={sw.name}
                      onClick={() => onPaintVehicle(sw.value)}
                      className="group flex flex-col items-center gap-1.5 rounded-lg border border-white/10 bg-[#121a29] p-2 hover:border-amber-400/60"
                    >
                      <span
                        className="h-6 w-6 rounded-full border border-white/25"
                        style={{ backgroundColor: sw.hex }}
                      />
                      <span className="max-w-full truncate text-[10px] text-slate-400 group-hover:text-slate-200">
                        {sw.name.split(' ')[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'wardrobe' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {OUTFITS.map((o) => {
                const active = hud.outfit === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => onSetOutfit(o.id)}
                    className={`flex items-center justify-between rounded-lg border p-4 text-left transition-colors ${
                      active
                        ? 'border-amber-400/60 bg-amber-500/10'
                        : 'border-white/10 bg-[#121a29] hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="h-9 w-9 shrink-0 rounded-lg border border-white/20"
                        style={{ backgroundColor: o.swatchHex }}
                      />
                      <div>
                        <div className="text-sm font-semibold text-slate-100">{o.name}</div>
                        <div className="text-xs text-slate-400">Custom jacket & hair preset</div>
                      </div>
                    </div>
                    {active && <Check className="h-4 w-4 text-amber-400" />}
                  </button>
                );
              })}
            </div>
          )}

          {tab === 'world' && (
            <div className="space-y-6">
              <div>
                <div className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-slate-200">
                  <CloudRain className="h-4 w-4 text-sky-400" />
                  <span>Dynamic Weather Simulation</span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {WEATHER_OPTIONS.map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => onSetWeather(w.id)}
                      className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                        hud.weather === w.id
                          ? 'border-amber-400 bg-amber-500 text-slate-950'
                          : 'border-white/10 bg-[#121a29] text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2.5 flex items-center justify-between text-sm font-semibold text-slate-200">
                  <span>Time of Day</span>
                  <span className="font-mono-num text-xs text-amber-400">
                    {String(Math.floor(hud.timeOfDay)).padStart(2, '0')}:
                    {String(Math.floor((hud.timeOfDay % 1) * 60)).padStart(2, '0')}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={23.95}
                  step={0.1}
                  value={hud.timeOfDay}
                  onChange={(e) => onSetTime(parseFloat(e.target.value))}
                  className="mb-3 w-full accent-amber-500"
                />
                <div className="grid grid-cols-4 gap-2">
                  {TIME_PRESETS.map((tp) => (
                    <button
                      key={tp.label}
                      type="button"
                      onClick={() => onSetTime(tp.hour)}
                      className="rounded-lg border border-white/10 bg-[#121a29] px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/10 whitespace-nowrap"
                    >
                      {tp.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 border-t border-white/10 pt-5 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={onTriggerWanted}
                  className="flex items-center justify-center gap-2 rounded-lg border border-red-400/40 bg-red-500/15 px-3 py-2.5 text-xs font-semibold text-red-200 hover:bg-red-500/25 whitespace-nowrap"
                >
                  <ShieldAlert className="h-4 w-4" />
                  <span>Escalate Police (+1 Star)</span>
                </button>
                <button
                  type="button"
                  onClick={onClearWanted}
                  className="flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-[#121a29] px-3 py-2.5 text-xs font-semibold text-slate-200 hover:bg-white/10 whitespace-nowrap"
                >
                  <span>Clear Wanted Heat</span>
                </button>
                <button
                  type="button"
                  onClick={onSaveGame}
                  className="flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-3 py-2.5 text-xs font-semibold text-slate-950 hover:bg-amber-400 whitespace-nowrap"
                >
                  <Save className="h-4 w-4" />
                  <span>Quick Save</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
