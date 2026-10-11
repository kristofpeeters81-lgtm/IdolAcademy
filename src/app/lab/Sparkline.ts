/** Kleine grafiek van het meetsignaal van de laatste seconden, met de drempels als stippellijnen. */
export interface SignalPoint {
  t: number;
  v: number | null;
}

export function drawSparkline(canvas: HTMLCanvasElement, points: readonly SignalPoint[], thresholds: readonly number[], windowMs: number): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  if (points.length === 0) return;

  const now = points[points.length - 1].t;
  const values = points.map((p) => p.v).filter((v): v is number => v !== null);
  const finite = thresholds.filter(Number.isFinite);
  const top = Math.max(1, ...values, ...finite) * 1.05;
  const bottom = Math.min(0, ...values, ...finite);
  const y = (v: number) => h - ((v - bottom) / (top - bottom || 1)) * h;
  const x = (t: number) => w - ((now - t) / windowMs) * w;

  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = 'rgba(255, 201, 61, 0.7)';
  ctx.lineWidth = 1;
  for (const th of finite) {
    ctx.beginPath();
    ctx.moveTo(0, y(th));
    ctx.lineTo(w, y(th));
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  let drawing = false;
  for (const p of points) {
    if (p.v === null || now - p.t > windowMs) {
      drawing = false;
      continue;
    }
    if (!drawing) ctx.moveTo(x(p.t), y(p.v));
    else ctx.lineTo(x(p.t), y(p.v));
    drawing = true;
  }
  ctx.stroke();
}
