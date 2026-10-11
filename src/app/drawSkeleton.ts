import { BODY_CONNECTIONS, VISIBLE_THRESHOLD } from '../motor/landmarks';
import type { Landmark } from '../motor/types';

/** Tekent het skelet op een canvas dat exact over het videobeeld ligt (zelfde verhouding). */
export function drawSkeleton(ctx: CanvasRenderingContext2D, landmarks: readonly Landmark[] | null): void {
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
  if (!landmarks) return;

  const scale = Math.max(1, Math.min(width, height) / 400);
  ctx.lineCap = 'round';
  ctx.lineWidth = 4 * scale;
  for (const [a, b] of BODY_CONNECTIONS) {
    const p = landmarks[a];
    const q = landmarks[b];
    if (p.visibility < VISIBLE_THRESHOLD || q.visibility < VISIBLE_THRESHOLD) continue;
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.85)';
    ctx.beginPath();
    ctx.moveTo(p.x * width, p.y * height);
    ctx.lineTo(q.x * width, q.y * height);
    ctx.stroke();
  }
  for (const p of landmarks) {
    const visible = p.visibility >= VISIBLE_THRESHOLD;
    ctx.fillStyle = visible ? '#ff4fd8' : 'rgba(255, 255, 255, 0.25)';
    ctx.beginPath();
    ctx.arc(p.x * width, p.y * height, (visible ? 5 : 3) * scale, 0, Math.PI * 2);
    ctx.fill();
  }
}
