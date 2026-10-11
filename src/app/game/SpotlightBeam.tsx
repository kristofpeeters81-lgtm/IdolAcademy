/**
 * De spotlight van Spotlight Sprint: een lichtbundel van boven die feller en breder wordt naarmate
 * je dichter bij je doel komt. Bij het doel gaat hij volledig aan (pulserend).
 * Ligt over het camerabeeld, maar laat de speler zichtbaar (pointer-events: none).
 */
export function SpotlightBeam({ progress, zone }: { progress: number; zone: number }) {
  const p = Math.max(0, Math.min(1, progress));
  const on = progress >= 1;
  return (
    <div
      className={`spotlight${on ? ' on' : ''}`}
      style={{ ['--p' as string]: String(p), ['--beam' as string]: `var(--z${zone + 1})` }}
      aria-hidden="true"
    >
      <div className="spotlight-lamp" />
      <div className="spotlight-beam" />
      <div className="spotlight-fill">
        <i style={{ height: `${Math.round(p * 100)}%` }} />
      </div>
    </div>
  );
}
