import { useEffect, useRef } from 'react';
import { HudSnapshot } from '../game/types';
import { ROAD_X, ROAD_Z, WORLD_LANDMARKS } from '../game/world';

interface MinimapProps {
  hud: HudSnapshot;
  onOpenFullMap: () => void;
}

export function Minimap({ hud, onOpenFullMap }: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 168;
    const half = size / 2;
    const scale = 0.56; // pixels per world meter

    // Ocean backdrop
    ctx.fillStyle = '#0c273b';
    ctx.fillRect(0, 0, size, size);

    const toScreenX = (wx: number) => half + (wx - hud.playerX) * scale;
    const toScreenY = (wz: number) => half + (wz - hud.playerZ) * scale;

    // Landmass peninsula
    ctx.fillStyle = '#1d2633';
    const landX = toScreenX(-196);
    const landY = toScreenY(-196);
    ctx.fillRect(landX, landY, 300 * scale, 392 * scale);

    // Golden beach strip
    ctx.fillStyle = '#6c5c43';
    ctx.fillRect(toScreenX(104), toScreenY(-196), 54 * scale, 392 * scale);

    // Coral Pier
    ctx.fillStyle = '#856247';
    ctx.fillRect(toScreenX(108), toScreenY(-8), 96 * scale, 16 * scale);

    // Road grid
    ctx.fillStyle = '#394454';
    for (const rx of ROAD_X) {
      ctx.fillRect(toScreenX(rx - 8), toScreenY(-192), 16 * scale, 384 * scale);
    }
    for (const rz of ROAD_Z) {
      ctx.fillRect(toScreenX(-195), toScreenY(rz - 8), 300 * scale, 16 * scale);
    }

    // Interactive landmarks
    for (const lm of WORLD_LANDMARKS) {
      const lx = toScreenX(lm.x);
      const ly = toScreenY(lm.z);
      if (lx < -8 || lx > size + 8 || ly < -8 || ly > size + 8) continue;
      ctx.fillStyle =
        lm.type === 'garage'
          ? '#f59e0b'
          : lm.type === 'safehouse'
            ? '#22d3ee'
            : lm.type === 'police'
              ? '#3b82f6'
              : '#94a3b8';
      ctx.beginPath();
      ctx.arc(lx, ly, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Traffic & Police entities
    for (const ent of hud.minimapEntities) {
      const ex = toScreenX(ent.x);
      const ey = toScreenY(ent.z);
      if (ex < -6 || ex > size + 6 || ey < -6 || ey > size + 6) continue;
      if (ent.type === 'police' || ent.type === 'helicopter') {
        ctx.fillStyle = ent.type === 'helicopter' ? '#ef4444' : '#38bdf8';
        ctx.beginPath();
        ctx.arc(ex, ey, ent.type === 'helicopter' ? 4.2 : 3.2, 0, Math.PI * 2);
        ctx.fill();
      } else if (ent.type === 'vehicle') {
        ctx.fillStyle = 'rgba(226, 232, 240, 0.55)';
        ctx.fillRect(ex - 1.5, ey - 1.5, 3, 3);
      }
    }

    // GPS Waypoint / Mission Checkpoint
    if (hud.waypoint) {
      const wx = toScreenX(hud.waypoint.x);
      const wy = toScreenY(hud.waypoint.z);

      // Route guide line
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.72)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(half, half);
      ctx.lineTo(wx, wy);
      ctx.stroke();
      ctx.setLineDash([]);

      // Clamped edge indicator if off-radar
      const cx = Math.max(8, Math.min(size - 8, wx));
      const cy = Math.max(8, Math.min(size - 8, wy));
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(cx, cy, 4.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#090d14';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Player heading chevron at center
    ctx.save();
    ctx.translate(half, half);
    ctx.rotate(-hud.playerYaw + Math.PI);
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(0, -6.5);
    ctx.lineTo(4.8, 5);
    ctx.lineTo(0, 2.5);
    ctx.lineTo(-4.8, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Subtle North indicator
    ctx.fillStyle = 'rgba(248, 250, 252, 0.75)';
    ctx.font = '600 10px "JetBrains Mono", monospace';
    ctx.fillText('N', half - 3, 12);
  }, [hud.playerX, hud.playerZ, hud.playerYaw, hud.minimapEntities, hud.waypoint]);

  return (
    <button
      type="button"
      onClick={onOpenFullMap}
      title="Open Solana Bay Map (M)"
      className="group relative block overflow-hidden rounded-lg border border-white/15 bg-[#0b101b]/95 shadow-xl transition-transform duration-150 hover:border-amber-400/50 focus-visible:outline-2 focus-visible:outline-amber-400"
    >
      <canvas ref={canvasRef} width={168} height={168} className="block h-[156px] w-[156px]" />
      <div className="flex items-center justify-between border-t border-white/10 bg-[#0b101b] px-2.5 py-1 text-[11px] text-slate-300">
        <span className="truncate font-medium">{hud.district}</span>
        <span className="font-mono-num text-slate-400">M</span>
      </div>
    </button>
  );
}
