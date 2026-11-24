import { useEffect, useRef, useState } from 'react';
import { Compass, Navigation, X } from 'lucide-react';
import { HudSnapshot, WorldLandmark } from '../game/types';
import { ROAD_X, ROAD_Z, WORLD_LANDMARKS } from '../game/world';

interface FullMapModalProps {
  hud: HudSnapshot;
  onClose: () => void;
  onSetWaypoint: (x: number, z: number, label: string) => void;
  onFastTravel: (x: number, z: number, label: string) => void;
}

export function FullMapModal({
  hud,
  onClose,
  onSetWaypoint,
  onFastTravel,
}: FullMapModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selected, setSelected] = useState<WorldLandmark | null>(WORLD_LANDMARKS[0]);

  const mapW = 540;
  const mapH = 440;
  const worldToMapX = (wx: number) => ((wx + 220) / 450) * mapW;
  const worldToMapY = (wz: number) => ((wz + 220) / 440) * mapH;
  const mapToWorldX = (mx: number) => (mx / mapW) * 450 - 220;
  const mapToWorldZ = (my: number) => (my / mapH) * 440 - 220;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Deep coastal water
    ctx.fillStyle = '#092338';
    ctx.fillRect(0, 0, mapW, mapH);

    // Subtle nautical grid lines
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x < mapW; x += 45) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, mapH);
      ctx.stroke();
    }
    for (let y = 0; y < mapH; y += 45) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(mapW, y);
      ctx.stroke();
    }

    // Island urban land
    ctx.fillStyle = '#1b2432';
    ctx.fillRect(
      worldToMapX(-196),
      worldToMapY(-196),
      worldToMapX(104) - worldToMapX(-196),
      worldToMapY(196) - worldToMapY(-196)
    );

    // Golden Beach
    ctx.fillStyle = '#736044';
    ctx.fillRect(
      worldToMapX(104),
      worldToMapY(-196),
      worldToMapX(160) - worldToMapX(104),
      worldToMapY(196) - worldToMapY(-196)
    );

    // Coral Pier
    ctx.fillStyle = '#8d6a4c';
    ctx.fillRect(
      worldToMapX(108),
      worldToMapY(-8),
      worldToMapX(204) - worldToMapX(108),
      worldToMapY(8) - worldToMapY(-8)
    );

    // Central Park green square
    ctx.fillStyle = '#264d36';
    ctx.fillRect(
      worldToMapX(-60),
      worldToMapY(-60),
      worldToMapX(-14) - worldToMapX(-60),
      worldToMapY(-14) - worldToMapY(-60)
    );

    // Roads
    ctx.fillStyle = '#404c5e';
    for (const rx of ROAD_X) {
      ctx.fillRect(
        worldToMapX(rx - 8),
        worldToMapY(-192),
        worldToMapX(rx + 8) - worldToMapX(rx - 8),
        worldToMapY(192) - worldToMapY(-192)
      );
    }
    for (const rz of ROAD_Z) {
      ctx.fillRect(
        worldToMapX(-195),
        worldToMapY(rz - 8),
        worldToMapX(105) - worldToMapX(-195),
        worldToMapY(rz + 8) - worldToMapY(rz - 8)
      );
    }

    // District watermark labels
    ctx.fillStyle = 'rgba(226, 232, 240, 0.35)';
    ctx.font = '600 11px "Oxanium", sans-serif';
    ctx.fillText('BAYFRONT CORE', worldToMapX(-4), worldToMapY(-102));
    ctx.fillText('PALM HEIGHTS', worldToMapX(-66), worldToMapY(48));
    ctx.fillText('VISTA CIVIC', worldToMapX(-146), worldToMapY(-4));
    ctx.fillText('CORAL STRIP', worldToMapX(108), worldToMapY(-120));
    ctx.fillText('MARINA PIER', worldToMapX(132), worldToMapY(-18));

    // Landmarks
    for (const lm of WORLD_LANDMARKS) {
      const lx = worldToMapX(lm.x);
      const ly = worldToMapY(lm.z);
      const isSel = selected?.id === lm.id;
      ctx.fillStyle =
        lm.type === 'garage'
          ? '#f59e0b'
          : lm.type === 'safehouse'
            ? '#22d3ee'
            : lm.type === 'police'
              ? '#3b82f6'
              : '#cbd5e1';
      ctx.beginPath();
      ctx.arc(lx, ly, isSel ? 7 : 5, 0, Math.PI * 2);
      ctx.fill();
      if (isSel) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Active GPS Waypoint
    if (hud.waypoint) {
      const wx = worldToMapX(hud.waypoint.x);
      const wy = worldToMapY(hud.waypoint.z);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(worldToMapX(hud.playerX), worldToMapY(hud.playerZ));
      ctx.lineTo(wx, wy);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(wx, wy, 6.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Player Marker
    const px = worldToMapX(hud.playerX);
    const py = worldToMapY(hud.playerZ);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [hud.playerX, hud.playerZ, hud.waypoint, selected]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * mapW;
    const my = ((e.clientY - rect.top) / rect.height) * mapH;
    const wx = mapToWorldX(mx);
    const wz = mapToWorldZ(my);

    // Check if user clicked near a landmark
    for (const lm of WORLD_LANDMARKS) {
      if (Math.hypot(lm.x - wx, lm.z - wz) < 22) {
        setSelected(lm);
        return;
      }
    }
    onSetWaypoint(Math.round(wx), Math.round(wz), 'Custom GPS Pin');
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-white/15 bg-[#0c121e] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <h2 className="font-display text-lg font-bold tracking-wide text-slate-100">
              Solana Bay Satellite Map
            </h2>
            <p className="text-xs text-slate-400">
              Click anywhere on the peninsula to set a GPS route, or select a landmark to fast travel.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
            aria-label="Close Map"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 overflow-y-auto p-6 lg:grid-cols-[1fr_270px]">
          <div className="overflow-hidden rounded-lg border border-white/10 bg-[#092338]">
            <canvas
              ref={canvasRef}
              width={mapW}
              height={mapH}
              onClick={handleCanvasClick}
              className="block h-auto w-full cursor-crosshair"
            />
          </div>

          <div className="flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-400">Points of Interest</div>
              <div className="max-h-[260px] space-y-1.5 overflow-y-auto pr-1">
                {WORLD_LANDMARKS.map((lm) => {
                  const active = selected?.id === lm.id;
                  return (
                    <button
                      key={lm.id}
                      type="button"
                      onClick={() => setSelected(lm)}
                      className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                        active
                          ? 'border-amber-400/60 bg-amber-500/10 text-white'
                          : 'border-white/10 bg-[#121a29] text-slate-300 hover:bg-white/5'
                      }`}
                    >
                      <div className="text-xs font-semibold">{lm.name}</div>
                      <div className="text-[11px] text-slate-400">{lm.district}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {selected && (
              <div className="rounded-lg border border-white/10 bg-[#121a29] p-4">
                <div className="text-sm font-semibold text-slate-100">{selected.name}</div>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  {selected.description}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onSetWaypoint(selected.x, selected.z, selected.name);
                      onClose();
                    }}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10 whitespace-nowrap"
                  >
                    <Compass className="h-3.5 w-3.5" />
                    <span>Set GPS</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onFastTravel(selected.x, selected.z, selected.name);
                      onClose();
                    }}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-400 whitespace-nowrap"
                  >
                    <Navigation className="h-3.5 w-3.5" />
                    <span>Travel</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
