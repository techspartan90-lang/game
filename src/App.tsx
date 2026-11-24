import { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Car,
  ChevronDown,
  ChevronUp,
  CloudSun,
  Map as MapIcon,
  Pause,
  Radio,
  Settings,
  Smartphone,
  Star,
} from 'lucide-react';
import { DEFAULT_SETTINGS, ViceWorldEngine } from './game/ViceWorldEngine';
import { GameSettings, HudSnapshot, WeatherType } from './game/types';
import { Minimap } from './components/Minimap';
import { SmartphoneModal } from './components/SmartphoneModal';
import { FullMapModal } from './components/FullMapModal';
import { PauseSettingsModal } from './components/PauseSettingsModal';

const INITIAL_HUD: HudSnapshot = {
  screen: 'menu',
  health: 100,
  maxHealth: 100,
  stamina: 100,
  maxStamina: 100,
  cash: 1500,
  wantedLevel: 0,
  wantedCooldown: 0,
  district: 'Bayfront Financial Core',
  timeOfDay: 16.6,
  weather: 'sunny',
  inVehicle: false,
  vehicleName: '',
  vehicleHealth: 100,
  speedKmh: 0,
  gear: 1,
  rpm: 0,
  headlightsOn: false,
  sirenOn: false,
  cameraMode: 'chase',
  playerX: 24,
  playerZ: -14,
  playerYaw: 0,
  isSwimming: false,
  isCrouching: false,
  interactionPrompt: null,
  activeZone: null,
  activeMissionId: null,
  activeMissionTitle: null,
  activeMissionStep: 0,
  activeMissionTotal: 0,
  activeMissionObjective: null,
  activeMissionTimer: null,
  waypoint: null,
  completedMissions: [],
  ownedVehicles: ['supercar'],
  outfit: 'coastal',
  dialogueBanner: null,
  toastMessage: null,
  radioTrack: 'Solana Sunset FM · Palm Horizon',
  minimapEntities: [],
  fps: 60,
  hasSaveData: false,
};

function formatClock(hourFloat: number): string {
  const h = Math.floor(hourFloat) % 24;
  const m = Math.floor((hourFloat % 1) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<ViceWorldEngine | null>(null);

  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [activeModal, setActiveModal] = useState<
    null | 'map' | 'phone' | 'garage' | 'pause' | 'menu-settings'
  >(null);
  const [dockOpen, setDockOpen] = useState(true);

  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const engine = new ViceWorldEngine(
      mount,
      (snapshot) => setHud(snapshot),
      (modal) => {
        setActiveModal((prev) => {
          const next = prev === modal ? null : modal;
          engine.setPaused(next !== null);
          return next;
        });
      }
    );
    engineRef.current = engine;
    setSettings(engine.getSettings());

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const openModal = (modal: 'map' | 'phone' | 'garage' | 'pause' | 'menu-settings') => {
    setActiveModal(modal);
    if (modal !== 'menu-settings') {
      engineRef.current?.setPaused(true);
    }
  };

  const closeModal = () => {
    setActiveModal(null);
    engineRef.current?.setPaused(false);
  };

  const cycleWeatherQuick = () => {
    const list: WeatherType[] = ['sunny', 'cloudy', 'foggy', 'rain', 'storm'];
    const idx = list.indexOf(hud.weather);
    engineRef.current?.setWeather(list[(idx + 1) % list.length]);
  };

  const handleUpdateSettings = (partial: Partial<GameSettings>) => {
    engineRef.current?.updateSettings(partial);
    if (engineRef.current) {
      setSettings(engineRef.current.getSettings());
    }
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#090d14]">
      {/* Dedicated Isolated WebGL Viewport Container */}
      <div ref={canvasMountRef} className="absolute inset-0 h-full w-full" />

      {/* TITLE SCREEN / MAIN MENU OVER LIVE 3D SOLANA BAY ORBIT */}
      {hud.screen === 'menu' && (
        <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between bg-gradient-to-r from-[#090d14]/92 via-[#090d14]/45 to-transparent p-8 sm:p-14">
          <div className="flex items-center justify-between">
            <span className="font-display text-sm font-semibold tracking-widest text-amber-400">
              SOLANA BAY OPEN WORLD
            </span>
          </div>

          <div className="pointer-events-auto max-w-xl space-y-6">
            <div className="space-y-3">
              <h1 className="font-display text-4xl font-bold tracking-tight text-white sm:text-6xl [text-wrap:balance]">
                Project Vice World
              </h1>
              <p className="max-w-md text-sm leading-relaxed text-slate-300 sm:text-base">
                Explore the coastal metropolis of Solana Bay on foot or behind the wheel. Drive
                custom supercars, outrun Solana PD pursuits, experience dynamic tropical storms,
                and take on harbor contracts.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:max-w-xs">
              {hud.hasSaveData && (
                <button
                  type="button"
                  onClick={() => engineRef.current?.continueGame()}
                  className="w-full rounded-lg bg-amber-500 px-6 py-3.5 text-left font-display text-sm font-bold tracking-wide text-slate-950 transition-colors hover:bg-amber-400"
                >
                  Continue Story
                </button>
              )}
              <button
                type="button"
                onClick={() => engineRef.current?.startNewGame()}
                className={`w-full rounded-lg px-6 py-3.5 text-left font-display text-sm font-bold tracking-wide transition-colors ${
                  hud.hasSaveData
                    ? 'border border-white/20 bg-[#0d1422]/90 text-white hover:bg-[#162033]'
                    : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                }`}
              >
                New Game
              </button>
              <button
                type="button"
                onClick={() => openModal('menu-settings')}
                className="flex w-full items-center justify-between rounded-lg border border-white/15 bg-[#0d1422]/85 px-6 py-3 text-sm font-medium text-slate-200 transition-colors hover:bg-[#162033]"
              >
                <span>Settings & Controls</span>
                <Settings className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-xs text-slate-400">
              <span>WASD Move & Drive</span>
              <span aria-hidden="true">·</span>
              <span>Mouse Drag Camera</span>
              <span aria-hidden="true">·</span>
              <span>E Enter Car</span>
              <span aria-hidden="true">·</span>
              <span>P Smartphone</span>
              <span aria-hidden="true">·</span>
              <span>M Map</span>
            </div>
          </div>

          <div className="text-xs text-slate-400">
            Original Interactive 3D Environment · Keyboard, Mouse & Gamepad Supported
          </div>
        </div>
      )}

      {/* IN-GAME HUD (ZERO CENTER OCCLUSION) */}
      {hud.screen === 'playing' && (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-4 sm:p-5">
          {/* TOP BAR: Compact District / Cash / Clock (Left) + Active Mission (Center) + Wanted Stars (Right) */}
          <div className="flex items-start justify-between gap-4">
            <div className="pointer-events-auto rounded-lg border border-white/12 bg-[#0b101b]/90 px-4 py-2.5 shadow-lg">
              <div className="flex items-center gap-3">
                <span className="font-display text-sm font-bold text-white">{hud.district}</span>
                <span className="text-slate-600" aria-hidden="true">
                  ·
                </span>
                <span className="font-mono-num text-xs text-slate-300">
                  {formatClock(hud.timeOfDay)}
                </span>
                <span className="text-slate-600" aria-hidden="true">
                  ·
                </span>
                <span className="text-xs capitalize text-slate-300">{hud.weather}</span>
              </div>
              <div className="mt-0.5 flex items-center gap-3 text-xs">
                <span className="font-mono-num font-semibold text-amber-400">
                  ${hud.cash.toLocaleString()}
                </span>
                {hud.inVehicle && (
                  <>
                    <span className="text-slate-600" aria-hidden="true">
                      ·
                    </span>
                    <span className="truncate text-slate-300">{hud.vehicleName}</span>
                  </>
                )}
              </div>
            </div>

            {/* Active Mission Objective Banner */}
            {hud.activeMissionTitle && hud.activeMissionObjective && (
              <div className="max-w-md rounded-lg border border-amber-400/40 bg-[#0b101b]/92 px-4 py-2.5 text-center shadow-lg">
                <div className="flex items-center justify-center gap-2 text-[11px] font-semibold text-amber-400">
                  <span>{hud.activeMissionTitle}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-num">
                    {hud.activeMissionStep}/{hud.activeMissionTotal}
                  </span>
                  {hud.activeMissionTimer !== null && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-num text-white">{hud.activeMissionTimer}s</span>
                    </>
                  )}
                </div>
                <div className="mt-0.5 text-xs font-medium text-slate-100">
                  {hud.activeMissionObjective}
                </div>
              </div>
            )}

            {/* Wanted Stars (Only visible when heat > 0) */}
            <div className="flex flex-col items-end gap-2">
              {hud.wantedLevel > 0 && (
                <div className="rounded-lg border border-red-500/45 bg-[#0b101b]/92 px-3.5 py-2 shadow-lg">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          star <= hud.wantedLevel
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="mt-1.5 h-1 w-24 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full bg-sky-400 transition-all duration-150"
                      style={{ width: `${Math.round(hud.wantedCooldown * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {hud.toastMessage && (
                <div className="rounded-lg border border-white/15 bg-[#0b101b]/92 px-3.5 py-2 text-xs font-medium text-slate-100 shadow-lg">
                  {hud.toastMessage}
                </div>
              )}
            </div>
          </div>

          {/* CENTER-LOWER NON-INTRUSIVE PROMPTS & DIALOGUE SUBTITLES */}
          <div className="pointer-events-none flex flex-col items-center gap-2.5 pb-2">
            {hud.interactionPrompt && (
              <div className="rounded-lg border border-amber-400/50 bg-[#0b101b]/95 px-4 py-2 text-xs font-semibold text-amber-200 shadow-lg">
                {hud.interactionPrompt}
              </div>
            )}

            {hud.dialogueBanner && (
              <div className="max-w-xl rounded-lg border border-white/15 bg-[#0b101b]/95 px-5 py-3 text-center shadow-xl">
                <div className="text-[11px] font-semibold text-amber-400">
                  {hud.dialogueBanner.speaker}
                </div>
                <p className="mt-0.5 text-sm leading-snug text-slate-100">
                  {hud.dialogueBanner.text}
                </p>
              </div>
            )}
          </div>

          {/* BOTTOM ROW: Minimap (Left) + Collapsible Action Dock (Center) + Speedometer / Vitals (Right) */}
          <div className="flex items-end justify-between gap-4">
            {/* Bottom-Left: Radar Minimap */}
            <div className="pointer-events-auto shrink-0">
              <Minimap hud={hud} onOpenFullMap={() => openModal('map')} />
            </div>

            {/* Bottom-Center: Collapsible Ergonomic Control Dock */}
            <div className="pointer-events-auto flex flex-col items-center">
              <button
                type="button"
                onClick={() => setDockOpen((v) => !v)}
                className="mb-1.5 flex items-center gap-1.5 rounded-md border border-white/12 bg-[#0b101b]/90 px-3 py-1 text-[11px] font-medium text-slate-300 transition-colors hover:text-white whitespace-nowrap"
              >
                {dockOpen ? (
                  <>
                    <ChevronDown className="h-3.5 w-3.5" />
                    <span>Hide Controls</span>
                  </>
                ) : (
                  <>
                    <ChevronUp className="h-3.5 w-3.5" />
                    <span>Show Controls</span>
                  </>
                )}
              </button>

              {dockOpen && (
                <div className="flex flex-wrap items-center justify-center gap-1.5 rounded-xl border border-white/12 bg-[#0b101b]/92 p-1.5 shadow-xl">
                  <button
                    type="button"
                    onClick={() => engineRef.current?.toggleVehicleEntry()}
                    className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-amber-400 whitespace-nowrap"
                  >
                    <Car className="h-3.5 w-3.5" />
                    <span>{hud.inVehicle ? 'Exit Car (E)' : 'Enter Car (E)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openModal('phone')}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#131b2b] px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-white/10 whitespace-nowrap"
                  >
                    <Smartphone className="h-3.5 w-3.5 text-amber-400" />
                    <span>Phone (P)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openModal('map')}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#131b2b] px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-white/10 whitespace-nowrap"
                  >
                    <MapIcon className="h-3.5 w-3.5 text-sky-400" />
                    <span>Map (M)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => engineRef.current?.cycleCameraMode()}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#131b2b] px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-white/10 whitespace-nowrap"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    <span>Cam (V)</span>
                  </button>

                  <button
                    type="button"
                    onClick={cycleWeatherQuick}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#131b2b] px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-white/10 whitespace-nowrap"
                  >
                    <CloudSun className="h-3.5 w-3.5" />
                    <span>Weather</span>
                  </button>

                  {hud.inVehicle && (
                    <button
                      type="button"
                      onClick={() => engineRef.current?.cycleRadio()}
                      className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#131b2b] px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-white/10 whitespace-nowrap"
                    >
                      <Radio className="h-3.5 w-3.5 text-amber-400" />
                      <span>Radio (R)</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => openModal('pause')}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#131b2b] px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-white/10 whitespace-nowrap"
                  >
                    <Pause className="h-3.5 w-3.5" />
                    <span>Menu</span>
                  </button>
                </div>
              )}
            </div>

            {/* Bottom-Right: Speedometer (Driving) OR Health & Stamina (On Foot) */}
            <div className="pointer-events-auto w-48 shrink-0 rounded-lg border border-white/12 bg-[#0b101b]/92 p-3.5 shadow-xl">
              {hud.inVehicle ? (
                <div>
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-display font-mono-num text-3xl font-bold leading-none text-white">
                        {hud.speedKmh}
                      </span>
                      <span className="text-[11px] font-medium text-slate-400">KM/H</span>
                    </div>
                    <span className="font-mono-num text-sm font-bold text-amber-400">
                      {hud.gear === 0 ? 'R' : `G${hud.gear}`}
                    </span>
                  </div>

                  {/* RPM Bar */}
                  <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full transition-all duration-75 ${
                        hud.rpm > 0.85 ? 'bg-red-500' : 'bg-amber-400'
                      }`}
                      style={{ width: `${Math.round(hud.rpm * 100)}%` }}
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="truncate">{hud.radioTrack}</span>
                    <span className="font-mono-num shrink-0 pl-2">
                      HP {hud.vehicleHealth}%
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div>
                    <div className="mb-1 flex justify-between text-[11px] text-slate-300">
                      <span>Health</span>
                      <span className="font-mono-num">{hud.health}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full bg-emerald-400"
                        style={{ width: `${(hud.health / hud.maxHealth) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-[11px] text-slate-300">
                      <span>Stamina</span>
                      <span className="font-mono-num">{hud.stamina}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full bg-sky-400"
                        style={{ width: `${(hud.stamina / hud.maxStamina) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {hud.isSwimming
                      ? 'Swimming in Solana Bay'
                      : hud.isCrouching
                        ? 'Stealth Crouch'
                        : 'On Foot · Shift Sprint'}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* IN-GAME MODALS */}
      {(activeModal === 'phone' || activeModal === 'garage') && (
        <SmartphoneModal
          hud={hud}
          initialTab={activeModal === 'garage' ? 'garage' : 'missions'}
          onClose={closeModal}
          onStartMission={(id) => engineRef.current?.startMission(id)}
          onAbortMission={() => engineRef.current?.abortMission()}
          onSummonVehicle={(t) => engineRef.current?.purchaseOrSummonVehicle(t)}
          onPaintVehicle={(hex) => engineRef.current?.paintCurrentVehicle(hex)}
          onRepairVehicle={() => engineRef.current?.repairCurrentVehicle()}
          onSetOutfit={(id) => engineRef.current?.setOutfit(id)}
          onSetWeather={(w) => engineRef.current?.setWeather(w)}
          onSetTime={(h) => engineRef.current?.setTimeOfDay(h)}
          onTriggerWanted={() => engineRef.current?.triggerTestWanted()}
          onClearWanted={() => engineRef.current?.clearWantedCheat()}
          onSaveGame={() => engineRef.current?.saveGame()}
        />
      )}

      {activeModal === 'map' && (
        <FullMapModal
          hud={hud}
          onClose={closeModal}
          onSetWaypoint={(x, z, label) => engineRef.current?.setWaypoint(x, z, label)}
          onFastTravel={(x, z, label) => engineRef.current?.fastTravel(x, z, label)}
        />
      )}

      {(activeModal === 'pause' || activeModal === 'menu-settings') && (
        <PauseSettingsModal
          mode={activeModal}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onResume={closeModal}
          onSaveGame={() => engineRef.current?.saveGame()}
          onReturnToMenu={() => {
            closeModal();
            engineRef.current?.returnToMenu();
          }}
        />
      )}
    </div>
  );
}
